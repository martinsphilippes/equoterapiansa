import type { EntryDisplayStatus, FinancialEntry, Frequency } from "@/lib/db/finance-types";
import { addDays, addMonths, daysInMonth } from "./dates";

export const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export function netAmountOf(e: { amount: number; discount?: number; interest?: number; fine?: number }) {
  return round2((e.amount || 0) - (e.discount || 0) + (e.interest || 0) + (e.fine || 0));
}

/** Status exibido: "overdue" quando em aberto e vencido. */
export function displayStatus(e: Pick<FinancialEntry, "status" | "dueDate" | "openAmount">, today: string): EntryDisplayStatus {
  if (e.status === "cancelled" || e.status === "paid") return e.status;
  if (e.openAmount > 0 && e.dueDate < today) return "overdue";
  return e.status;
}

export const OPEN_STATUSES = ["planned", "pending", "partial"] as const;

export function statusAfterPayment(paid: number, net: number, issueDate: string, today: string): FinancialEntry["status"] {
  if (paid >= net - 0.004) return "paid";
  if (paid > 0) return "partial";
  return issueDate > today ? "planned" : "pending";
}

export function daysLate(dueDate: string, today: string): number {
  const [y1, m1, d1] = dueDate.split("-").map(Number);
  const [y2, m2, d2] = today.split("-").map(Number);
  return Math.max(0, Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86400000));
}

export function competenceOf(iso: string) {
  return iso.slice(0, 7);
}

/** Data de vencimento no mês, respeitando meses curtos (dia 31 → último dia). */
export function dueDateInMonth(competence: string, dueDay: number): string {
  const d = Math.min(Math.max(1, dueDay), daysInMonth(competence));
  return `${competence}-${String(d).padStart(2, "0")}`;
}

export function monthsStep(frequency: Frequency, intervalMonths?: number | null): number {
  switch (frequency) {
    case "monthly": return 1;
    case "bimonthly": return 2;
    case "quarterly": return 3;
    case "semiannual": return 6;
    case "annual": return 12;
    case "custom": return Math.max(1, intervalMonths ?? 1);
    default: return 0; // weekly tratado à parte
  }
}

/** Próxima data após `from` para a regra. */
export function nextOccurrence(from: string, frequency: Frequency, dueDay: number, intervalMonths?: number | null): string {
  if (frequency === "weekly") return addDays(from, 7);
  return dueDateInMonth(addMonths(from.slice(0, 7), monthsStep(frequency, intervalMonths)), dueDay);
}

/** Divide um valor em N parcelas de 2 casas; a última absorve o arredondamento. */
export function splitInstallments(total: number, n: number): number[] {
  const base = Math.floor((total / n) * 100) / 100;
  const parts = Array.from({ length: n }, () => base);
  parts[n - 1] = round2(total - base * (n - 1));
  return parts;
}

export function applyDiscount(amount: number, type: "none" | "fixed" | "percent", value: number): { discount: number; net: number } {
  const discount = type === "fixed" ? Math.min(amount, value || 0) : type === "percent" ? round2(amount * ((value || 0) / 100)) : 0;
  return { discount: round2(discount), net: round2(amount - discount) };
}

export const FREQUENCY_LABEL: Record<Frequency, string> = {
  weekly: "Semanal", monthly: "Mensal", bimonthly: "Bimestral", quarterly: "Trimestral", semiannual: "Semestral", annual: "Anual", custom: "Personalizada",
};

export const STATUS_LABEL: Record<EntryDisplayStatus, string> = {
  planned: "Previsto", pending: "Pendente", partial: "Parcial", paid: "Liquidado", overdue: "Vencido", cancelled: "Cancelado",
};
