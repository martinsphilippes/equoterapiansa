"use server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/firebase/admin";
import { actionUser, actorOf } from "@/lib/auth/session";
import { Collections, getDoc } from "@/lib/db/collections";
import { audit } from "@/lib/db/audit";
import { buildPayrollMonth } from "@/lib/db/queries/payroll";
import type { PayrollAdjustment } from "@/lib/db/types";
import { guard, str, opt, num, success, fail, ISO_DATE, type ActionResult } from "./result";

const COMPETENCE = /^\d{4}-\d{2}$/;

/** Salva ajustes e observações do mês (enquanto não pago). */
export async function savePayrollDraft(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return guard(async () => {
    const user = await actionUser("payments.manage");
    const collaboratorId = str(fd, "collaboratorId");
    const competence = str(fd, "competence");
    if (!COMPETENCE.test(competence)) return fail("Competência inválida.");
    const current = await buildPayrollMonth(collaboratorId, competence);
    if (!current) return fail("Colaborador não encontrado.");
    if (current.frozen) return fail("Este mês já está marcado como pago. Desmarque para alterar.");
    const adjustments: PayrollAdjustment[] = [];
    for (let i = 0; i < 10; i++) {
      const description = str(fd, `adj${i}_description`);
      const amount = num(fd, `adj${i}_amount`);
      if (description && amount !== undefined) adjustments.push({ id: `${i}_${Date.now()}`, description, amount });
    }
    const rebuilt = await buildPayrollMonth(collaboratorId, competence, { adjustments, notes: opt(fd, "notes") });
    const batch = db.batch();
    batch.set(Collections.payrollMonths().doc(rebuilt!.id), { ...rebuilt, updatedAt: Date.now(), updatedBy: user.id });
    await audit(actorOf(user), { action: "payroll.draft", entity: "payrollMonth", entityId: rebuilt!.id, entityLabel: `${rebuilt!.collaboratorName} ${competence}`, details: { adjustments, calculatedAmount: rebuilt!.calculatedAmount } }, batch);
    await batch.commit();
    revalidatePath(`/pagamentos/${collaboratorId}/${competence}`);
    return success("Alterações salvas.");
  });
}

export async function markPaid(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return guard(async () => {
    const user = await actionUser("payments.manage");
    const collaboratorId = str(fd, "collaboratorId");
    const competence = str(fd, "competence");
    if (!COMPETENCE.test(competence)) return fail("Competência inválida.");
    const paidAt = str(fd, "paidAt");
    if (!ISO_DATE.test(paidAt)) return fail("Informe a data do pagamento.");
    const paidAmount = num(fd, "paidAmount");
    if (paidAmount === undefined || paidAmount < 0) return fail("Informe o valor efetivamente pago.");
    const built = await buildPayrollMonth(collaboratorId, competence);
    if (!built) return fail("Colaborador não encontrado.");
    if (built.frozen) return fail("Este mês já está marcado como pago.");
    if (built.payableId) return fail("Esta ficha possui conta a pagar no Financeiro. Registre o pagamento por lá.");
    const data = { ...built, status: "paid" as const, frozen: true, paidAt, paidAmount, notes: opt(fd, "notes") ?? built.notes, updatedAt: Date.now(), updatedBy: user.id };
    const batch = db.batch();
    batch.set(Collections.payrollMonths().doc(built.id), data);
    await audit(actorOf(user), { action: "payroll.paid", entity: "payrollMonth", entityId: built.id, entityLabel: `${built.collaboratorName} ${competence}`, details: { paidAmount, paidAt, calculatedAmount: built.calculatedAmount } }, batch);
    await batch.commit();
    revalidatePath(`/pagamentos`);
    revalidatePath(`/pagamentos/${collaboratorId}/${competence}`);
    return success("Pagamento registrado.");
  });
}

export async function markUnpaid(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return guard(async () => {
    const user = await actionUser("payments.manage");
    const id = str(fd, "id");
    const p = await getDoc(Collections.payrollMonths(), id);
    if (!p) return fail("Registro não encontrado.");
    if (p.payableId) return fail("Esta ficha foi paga pelo Financeiro. Estorne a movimentação por lá.");
    const batch = db.batch();
    batch.set(Collections.payrollMonths().doc(id), { status: "unpaid", frozen: false, paidAt: null, paidAmount: null, updatedAt: Date.now(), updatedBy: user.id }, { merge: true });
    await audit(actorOf(user), { action: "payroll.unpaid", entity: "payrollMonth", entityId: id, entityLabel: `${p.collaboratorName} ${p.competence}`, details: { previousPaidAmount: p.paidAmount, previousPaidAt: p.paidAt } }, batch);
    await batch.commit();
    revalidatePath(`/pagamentos`);
    revalidatePath(`/pagamentos/${p.collaboratorId}/${p.competence}`);
    return success("Pagamento desmarcado. Os valores voltam a ser recalculados.");
  });
}
