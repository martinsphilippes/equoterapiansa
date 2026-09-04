import "server-only";
import { Collections, getDoc } from "@/lib/db/collections";
import { allCategories, allCostCenters, allAccounts } from "@/lib/db/queries/finance-ref";
import type { FinanceKind, FinancialEntry } from "@/lib/db/finance-types";
import type { UserProfile } from "@/lib/db/types";
import { hasPermission } from "@/lib/auth/session";
import { competenceOf, netAmountOf, nextOccurrence, round2, statusAfterPayment } from "@/lib/domain/finance";
import type { RecurrenceRule } from "@/lib/db/finance-types";

export function managePermission(kind: FinanceKind) {
  return kind === "receivable" ? "finance.receivables.manage" : "finance.payables.manage";
}
export function settlePermission(kind: FinanceKind) {
  return kind === "receivable" ? "finance.receivables.settle" : "finance.payables.settle";
}
export function viewPermission(kind: FinanceKind) {
  return kind === "receivable" ? "finance.receivables.view" : "finance.payables.view";
}
export function canViewEntry(user: UserProfile, e: FinancialEntry) {
  return hasPermission(user, viewPermission(e.kind)) || hasPermission(user, managePermission(e.kind)) || hasPermission(user, settlePermission(e.kind));
}

/** Resolve nomes desnormalizados a partir dos ids escolhidos no formulário. */
export async function resolveRefs(v: { categoryId: string; costCenterId?: string | null; accountId?: string | null; practitionerId?: string | null; guardianId?: string | null; collaboratorId?: string | null; supplierId?: string | null }) {
  const [cats, ccs, accs] = await Promise.all([allCategories(), allCostCenters(), allAccounts()]);
  const category = cats.find((c) => c.id === v.categoryId);
  if (!category || !category.active) throw new Error("Selecione uma categoria válida.");
  const costCenter = v.costCenterId ? ccs.find((c) => c.id === v.costCenterId) : undefined;
  if (v.costCenterId && !costCenter) throw new Error("Centro de custo inválido.");
  if (v.accountId && !accs.find((a) => a.id === v.accountId)) throw new Error("Conta financeira inválida.");
  const [practitioner, guardian, collaborator, supplier] = await Promise.all([
    v.practitionerId ? getDoc(Collections.practitioners(), v.practitionerId) : null,
    v.guardianId ? getDoc(Collections.guardians(), v.guardianId) : null,
    v.collaboratorId ? getDoc(Collections.collaborators(), v.collaboratorId) : null,
    v.supplierId ? getDoc(Collections.suppliers(), v.supplierId) : null,
  ]);
  if (v.practitionerId && !practitioner) throw new Error("Praticante não encontrado.");
  if (v.guardianId && !guardian) throw new Error("Responsável não encontrado.");
  if (v.collaboratorId && !collaborator) throw new Error("Colaborador não encontrado.");
  if (v.supplierId && !supplier) throw new Error("Fornecedor não encontrado.");
  if (practitioner && guardian && !practitioner.guardianIds.includes(guardian.id)) throw new Error("O responsável escolhido não está vinculado ao praticante.");
  return {
    category, categoryName: category.name, costCenterName: costCenter?.name ?? null,
    practitionerName: practitioner?.name ?? null, guardianName: guardian?.name ?? null, collaboratorName: collaborator?.name ?? null, supplierName: supplier?.name ?? null,
  };
}

/** Recalcula valores derivados do lançamento. */
export function recompute(e: FinancialEntry, today: string): FinancialEntry {
  const netAmount = netAmountOf(e);
  const paidAmount = round2(e.paidAmount || 0);
  const openAmount = round2(Math.max(0, netAmount - paidAmount));
  const status = e.status === "cancelled" ? "cancelled" : statusAfterPayment(paidAmount, netAmount, e.issueDate, today);
  return { ...e, netAmount, paidAmount, openAmount, status };
}

/** Gera lançamentos de uma regra até o fim do mês informado (ids determinísticos evitam duplicidade). */
export function generateFromRule(r: RecurrenceRule, upToMonth: string, today: string, userId: string): { entries: FinancialEntry[]; nextDueDate: string } {
  const entries: FinancialEntry[] = [];
  const end = `${upToMonth}-31`;
  let next = r.nextDueDate;
  let guardN = 0;
  while (next <= end && (!r.endDate || next <= r.endDate) && guardN++ < 60) {
    const id = `rec_${r.id}_${next}`;
    const t = r.template;
    entries.push(recompute({
      id, kind: r.kind, description: t.description, amount: t.amount, discount: 0, interest: 0, fine: 0, netAmount: 0, paidAmount: 0, openAmount: 0, status: "pending",
      competence: competenceOf(next), issueDate: today < next ? today : next, dueDate: next, categoryId: t.categoryId, categoryName: t.categoryName, costCenterId: t.costCenterId ?? null, costCenterName: t.costCenterName ?? null,
      accountId: t.accountId ?? null, paymentMethodId: t.paymentMethodId ?? null, practitionerId: t.practitionerId ?? null, practitionerName: t.practitionerName ?? null, guardianId: t.guardianId ?? null, guardianName: t.guardianName ?? null,
      collaboratorId: t.collaboratorId ?? null, collaboratorName: t.collaboratorName ?? null, supplierId: t.supplierId ?? null, supplierName: t.supplierName ?? null, recurrenceId: r.id, installment: null, payrollMonthId: null, billingPlanId: null,
      notes: t.notes, visibleToGuardian: r.kind === "receivable", createdAt: Date.now(), createdBy: userId, updatedAt: Date.now(), updatedBy: userId,
    } as FinancialEntry, today));
    next = nextOccurrence(next, r.frequency, r.dueDay, r.intervalMonths);
  }
  return { entries, nextDueDate: next };
}

