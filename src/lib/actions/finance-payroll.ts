"use server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/firebase/admin";
import { actionUser, actorOf } from "@/lib/auth/session";
import { Collections, getDoc } from "@/lib/db/collections";
import { audit } from "@/lib/db/audit";
import { applyDeltas, entryDeltas, transactionDeltas } from "@/lib/db/finance-summary";
import { buildPayrollMonth } from "@/lib/db/queries/payroll";
import { allAccounts, allCategories, allCostCenters, getFinanceSettings } from "@/lib/db/queries/finance-ref";
import { todayFin } from "@/lib/db/queries/finance";
import { competenceLabel, monthRange } from "@/lib/domain/dates";
import type { FinancialEntry, FinancialTransaction } from "@/lib/db/finance-types";
import { recompute } from "./finance-shared";
import { guard, str, opt, success, fail, type ActionResult } from "./result";

/**
 * Gera a conta a pagar da ficha mensal do colaborador (id determinístico: pay_{fichaId}).
 * Se a ficha já estiver marcada como PAGA (fluxo antigo), a conta nasce liquidada com a
 * movimentação correspondente, para o caixa refletir o histórico.
 */
export async function generatePayableFromPayroll(_p: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return guard(async () => {
    const user = await actionUser("finance.payables.manage");
    const collaboratorId = str(fd, "collaboratorId");
    const competence = str(fd, "competence");
    if (!/^\d{4}-\d{2}$/.test(competence)) return fail("Competência inválida.");
    const m = await buildPayrollMonth(collaboratorId, competence);
    if (!m) return fail("Colaborador não encontrado.");
    const existingId = `pay_${m.id}`;
    const existing = await getDoc(Collections.financialEntries(), existingId);
    if (existing && existing.status !== "cancelled") return fail("Esta ficha já possui conta a pagar gerada.");
    const settings = await getFinanceSettings();
    const categoryId = opt(fd, "categoryId") ?? settings.payrollCategoryId ?? "";
    const category = (await allCategories()).find((c) => c.id === categoryId && c.type === "expense");
    if (!category) return fail("Defina a categoria de salários nas configurações do financeiro.");
    const costCenterId = opt(fd, "costCenterId") ?? settings.payrollCostCenterId ?? null;
    const costCenter = costCenterId ? (await allCostCenters()).find((c) => c.id === costCenterId) : null;
    const today = await todayFin();
    const amount = m.status === "paid" && m.paidAmount != null ? m.paidAmount : m.calculatedAmount;
    if (amount <= 0) return fail("O valor calculado da ficha é zero.");
    const { end } = monthRange(competence);
    const dueDate = opt(fd, "dueDate") ?? (m.paidAt ?? (competence >= today.slice(0, 7) ? addDaysIso(end, 5) : today));
    const now = Date.now();
    let entry = recompute({
      id: existingId, kind: "payable", description: `Salário ${m.collaboratorName} · ${competenceLabel(competence)}`, amount, discount: 0, interest: 0, fine: 0, netAmount: 0, paidAmount: 0, openAmount: 0, status: "pending",
      competence, issueDate: today, dueDate, categoryId: category.id, categoryName: category.name, costCenterId: costCenter?.id ?? null, costCenterName: costCenter?.name ?? null,
      accountId: settings.defaultAccountId ?? null, paymentMethodId: null, practitionerId: null, practitionerName: null, guardianId: null, guardianName: null,
      collaboratorId, collaboratorName: m.collaboratorName, supplierId: null, supplierName: null, payrollMonthId: m.id, billingPlanId: null, recurrenceId: null, installment: null,
      reference: m.id, notes: opt(fd, "notes"), visibleToGuardian: false, createdAt: now, createdBy: user.id, updatedAt: now, updatedBy: user.id,
    } as FinancialEntry, today);
    const batch = db.batch();
    const deltas: Record<string, Record<string, number>> = {};
    if (m.status === "paid" && m.paidAt) {
      const account = (await allAccounts()).find((a) => a.id === (settings.defaultAccountId ?? "")) ?? (await allAccounts()).find((a) => a.active);
      if (!account) return fail("Cadastre uma conta financeira antes.");
      const txRef = Collections.financialTransactions().doc();
      const tx: FinancialTransaction = { id: txRef.id, type: "out", amount, date: m.paidAt, accountId: account.id, accountName: account.name, entryId: entry.id, entryKind: "payable", entryCompetence: competence, categoryId: category.id, categoryName: category.name, costCenterId: costCenter?.id ?? null, paymentMethodId: null, description: entry.description, reconciled: false, reversed: false, createdAt: now, createdBy: user.id, updatedAt: now, updatedBy: user.id };
      batch.set(txRef, tx);
      transactionDeltas(tx, 1, deltas);
      entry = recompute({ ...entry, paidAmount: amount, settledDate: m.paidAt }, today);
    }
    batch.set(Collections.financialEntries().doc(entry.id), entry);
    entryDeltas(entry, 1, deltas);
    applyDeltas(batch, deltas);
    // garante a ficha persistida com o vínculo
    batch.set(Collections.payrollMonths().doc(m.id), { ...m, payableId: entry.id, updatedAt: now, updatedBy: user.id }, { merge: true });
    await audit(actorOf(user), { action: "finance.payroll.generate", entity: "financialEntry", entityId: entry.id, entityLabel: entry.description, details: { collaboratorId, competence, amount, alreadyPaid: m.status === "paid" } }, batch);
    await batch.commit();
    revalidatePath(`/pagamentos/${collaboratorId}/${competence}`);
    revalidatePath("/pagamentos");
    revalidatePath("/financeiro/pagar");
    revalidatePath("/financeiro");
    return success("Conta a pagar gerada.", entry.id, `/financeiro/pagar/${entry.id}`);
  });
}

function addDaysIso(iso: string, d: number) { const [y, m, dd] = iso.split("-").map(Number); return new Date(Date.UTC(y, m - 1, dd + d)).toISOString().slice(0, 10); }

/** Gera as contas a pagar de todas as fichas de uma competência que ainda não possuem. */
export async function generatePayablesForCompetence(_p: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return guard(async () => {
    await actionUser("finance.payables.manage");
    const competence = str(fd, "competence");
    const ids = str(fd, "collaboratorIds").split(",").map((s) => s.trim()).filter(Boolean);
    let ok = 0; const errors: string[] = [];
    for (const collaboratorId of ids) {
      const f = new FormData(); f.set("collaboratorId", collaboratorId); f.set("competence", competence);
      const r = await generatePayableFromPayroll(null, f);
      if (r.ok) ok++; else if (!r.error.includes("já possui")) errors.push(r.error);
    }
    return success(`${ok} conta(s) a pagar gerada(s).${errors.length ? " Avisos: " + Array.from(new Set(errors)).join("; ") : ""}`);
  });
}

