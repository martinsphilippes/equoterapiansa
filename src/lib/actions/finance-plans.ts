"use server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/firebase/admin";
import { actionUser, actorOf } from "@/lib/auth/session";
import { Collections, getDoc, mapDocs } from "@/lib/db/collections";
import { audit } from "@/lib/db/audit";
import { applyDeltas, entryDeltas } from "@/lib/db/finance-summary";
import { allCategories, allCostCenters } from "@/lib/db/queries/finance-ref";
import { todayFin } from "@/lib/db/queries/finance";
import { addMonths, competenceLabel } from "@/lib/domain/dates";
import { applyDiscount, dueDateInMonth, monthsStep } from "@/lib/domain/finance";
import type { BillingModel, BillingPlan, FinancialEntry } from "@/lib/db/finance-types";
import { recompute } from "./finance-shared";
import { guard, str, opt, num, success, fail, ISO_DATE, type ActionResult } from "./result";

const COMP = /^\d{4}-\d{2}$/;

export async function saveBillingPlan(_p: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return guard(async () => {
    const user = await actionUser("finance.receivables.manage");
    const id = opt(fd, "id");
    const practitionerId = str(fd, "practitionerId");
    const guardianId = str(fd, "guardianId");
    const p = await getDoc(Collections.practitioners(), practitionerId);
    if (!p) return fail("Praticante não encontrado.");
    const g = await getDoc(Collections.guardians(), guardianId);
    if (!g || !p.guardianIds.includes(g.id)) return fail("Escolha um responsável vinculado ao praticante.");
    const name = str(fd, "name") || "Mensalidade";
    const amount = num(fd, "amount");
    if (amount === undefined || amount < 0) return fail("Informe o valor.");
    const billingModel = (opt(fd, "billingModel") ?? "fixed") as BillingModel;
    const frequency = (opt(fd, "frequency") ?? "monthly") as BillingPlan["frequency"];
    const dueDay = Math.min(28, Math.max(1, Math.round(num(fd, "dueDay") ?? 10)));
    const startDate = str(fd, "startDate");
    const endDate = opt(fd, "endDate") ?? null;
    if (!ISO_DATE.test(startDate) || (endDate && !ISO_DATE.test(endDate))) return fail("Datas inválidas.");
    const discountType = (opt(fd, "discountType") ?? "none") as BillingPlan["discountType"];
    const discountValue = num(fd, "discountValue") ?? 0;
    const cats = await allCategories();
    const category = cats.find((c) => c.id === str(fd, "categoryId") && c.type === "income" && c.active);
    if (!category) return fail("Selecione uma categoria de receita.");
    const costCenterId = opt(fd, "costCenterId") ?? null;
    const costCenter = costCenterId ? (await allCostCenters()).find((c) => c.id === costCenterId) : null;
    const now = Date.now();
    const data = {
      practitionerId, practitionerName: p.name, guardianId, guardianName: g.name, name, billingModel, amount, discountType, discountValue, frequency, dueDay, startDate, endDate,
      categoryId: category.id, categoryName: category.name, costCenterId, costCenterName: costCenter?.name ?? null, sessionsIncluded: num(fd, "sessionsIncluded") ?? null, notes: opt(fd, "notes"), updatedAt: now,
    };
    let pid = id;
    if (id) {
      const before = await getDoc(Collections.billingPlans(), id);
      if (!before) return fail("Plano não encontrado.");
      await Collections.billingPlans().doc(id).set(data, { merge: true });
      await audit(actorOf(user), { action: "finance.plan.update", entity: "billingPlan", entityId: id, entityLabel: `${p.name} · ${name}`, details: { before: { amount: before.amount, dueDay: before.dueDay, endDate: before.endDate }, after: { amount, dueDay, endDate } } });
    } else {
      const ref = Collections.billingPlans().doc();
      pid = ref.id;
      await ref.set({ ...data, id: ref.id, lastGenerated: null, active: true, createdAt: now });
      await audit(actorOf(user), { action: "finance.plan.create", entity: "billingPlan", entityId: ref.id, entityLabel: `${p.name} · ${name}`, details: { amount, frequency, dueDay } });
    }
    revalidatePath("/financeiro/mensalidades");
    revalidatePath(`/praticantes/${practitionerId}/financeiro`);
    return success("Plano salvo.", pid, opt(fd, "returnTo") ?? `/praticantes/${practitionerId}/financeiro`);
  });
}

export async function toggleBillingPlan(_p: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return guard(async () => {
    const user = await actionUser("finance.receivables.manage");
    const id = str(fd, "id");
    const plan = await getDoc(Collections.billingPlans(), id);
    if (!plan) return fail("Plano não encontrado.");
    await Collections.billingPlans().doc(id).update({ active: !plan.active, updatedAt: Date.now() });
    await audit(actorOf(user), { action: "finance.plan.toggle", entity: "billingPlan", entityId: id, entityLabel: `${plan.practitionerName} · ${plan.name}`, details: { active: !plan.active } });
    revalidatePath("/financeiro/mensalidades");
    revalidatePath(`/praticantes/${plan.practitionerId}/financeiro`);
    return success(plan.active ? "Plano pausado." : "Plano reativado.");
  });
}

/**
 * Gera as cobranças dos planos ativos até a competência informada.
 * Ids determinísticos (plan_{planId}_{YYYY-MM}) impedem duplicidade.
 * Modelo "por atendimento" só gera meses já encerrados (conta as presenças do mês).
 */
export async function generateBillingCharges(_p: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return guard(async () => {
    const user = await actionUser("finance.receivables.manage");
    const today = await todayFin();
    const upTo = opt(fd, "upTo") ?? today.slice(0, 7);
    if (!COMP.test(upTo)) return fail("Competência inválida.");
    const onlyPlanId = opt(fd, "planId");
    let plans = mapDocs(await Collections.billingPlans().where("active", "==", true).get());
    if (onlyPlanId) plans = plans.filter((p) => p.id === onlyPlanId);
    let created = 0;
    const now = Date.now();
    for (const plan of plans) {
      const step = monthsStep(plan.frequency);
      let month = plan.lastGenerated ? addMonths(plan.lastGenerated, step) : plan.startDate.slice(0, 7);
      const candidates: FinancialEntry[] = [];
      let last = plan.lastGenerated ?? null;
      let guardN = 0;
      while (month <= upTo && guardN++ < 60) {
        const due = dueDateInMonth(month, plan.dueDay);
        if (plan.endDate && `${month}-01` > plan.endDate) break;
        if (plan.billingModel === "per_session" && month >= today.slice(0, 7)) break; // aguarda o fim do mês
        let base = plan.amount;
        if (plan.billingModel === "per_session") {
          const sessions = await Collections.sessions().where("practitionerId", "==", plan.practitionerId).where("date", ">=", `${month}-01`).where("date", "<=", `${month}-31`).get();
          const attended = sessions.docs.filter((d) => d.data().attended).length;
          base = Math.round(plan.amount * attended * 100) / 100;
        }
        const { discount } = applyDiscount(base, plan.discountType, plan.discountValue);
        if (base > 0) {
          candidates.push(recompute({
            id: `plan_${plan.id}_${month}`, kind: "receivable", description: `${plan.name} · ${competenceLabel(month)}`, amount: base, discount, interest: 0, fine: 0, netAmount: 0, paidAmount: 0, openAmount: 0, status: "pending",
            competence: month, issueDate: today < due ? today : `${month}-01`, dueDate: due, categoryId: plan.categoryId, categoryName: plan.categoryName, costCenterId: plan.costCenterId ?? null, costCenterName: plan.costCenterName ?? null,
            accountId: null, paymentMethodId: null, practitionerId: plan.practitionerId, practitionerName: plan.practitionerName, guardianId: plan.guardianId, guardianName: plan.guardianName,
            collaboratorId: null, collaboratorName: null, supplierId: null, supplierName: null, payrollMonthId: null, billingPlanId: plan.id, recurrenceId: null, installment: null,
            visibleToGuardian: true, createdAt: now, createdBy: user.id, updatedAt: now, updatedBy: user.id,
          } as FinancialEntry, today));
        }
        last = month;
        month = addMonths(month, step);
      }
      if (!last || last === plan.lastGenerated) continue;
      const existing = candidates.length ? await db.getAll(...candidates.map((e) => Collections.financialEntries().doc(e.id))) : [];
      const fresh = candidates.filter((_, i) => !existing[i].exists);
      const batch = db.batch();
      for (const e of fresh) batch.set(Collections.financialEntries().doc(e.id), e);
      applyDeltas(batch, fresh.reduce((d, e) => entryDeltas(e, 1, d), {} as Record<string, Record<string, number>>));
      batch.set(Collections.billingPlans().doc(plan.id), { lastGenerated: last, updatedAt: now }, { merge: true });
      await batch.commit();
      created += fresh.length;
    }
    if (created) await audit(actorOf(user), { action: "finance.plan.generate", entity: "billingPlan", entityId: upTo, details: { upTo, created, planId: onlyPlanId ?? null } });
    revalidatePath("/financeiro");
    revalidatePath("/financeiro/receber");
    revalidatePath("/financeiro/mensalidades");
    return success(created ? `${created} cobrança(s) gerada(s).` : "Nenhuma cobrança nova: já geradas até a competência informada.");
  });
}
