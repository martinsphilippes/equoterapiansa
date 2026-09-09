import "server-only";
import { cache } from "react";
import { AggregateField } from "firebase-admin/firestore";
import { Collections, getDoc, mapDocs } from "../collections";
import { getSettings } from "../settings";
import { allAccounts } from "./finance-ref";
import { safeQuery } from "../firestore-safe";
import { OPEN_STATUSES, displayStatus } from "@/lib/domain/finance";
import { addMonths, monthRange, todayISO } from "@/lib/domain/dates";
import type { FinanceKind, FinancialEntry, FinancialSummary, FinancialTransaction } from "../finance-types";

export const todayFin = cache(async () => todayISO((await getSettings()).timezone));

export interface EntryFilters {
  kind: FinanceKind;
  /** Mês do vencimento (YYYY-MM). Ignorado quando `overdueOnly`. */
  month?: string;
  status?: "open" | "paid" | "cancelled" | "all";
  overdueOnly?: boolean;
  practitionerId?: string;
  guardianId?: string;
  collaboratorId?: string;
  supplierId?: string;
  categoryId?: string;
  costCenterId?: string;
  limit?: number;
}

/**
 * Lista de lançamentos com filtros aplicados no banco (mês de vencimento e status),
 * limitada; refinamentos por categoria/centro em memória sobre o conjunto do mês.
 */
export async function listEntries(f: EntryFilters): Promise<FinancialEntry[]> {
  const today = await todayFin();
  let q: FirebaseFirestore.Query<FinancialEntry> = Collections.financialEntries().where("kind", "==", f.kind);
  if (f.practitionerId) q = q.where("practitionerId", "==", f.practitionerId);
  else if (f.guardianId) q = q.where("guardianId", "==", f.guardianId);
  else if (f.collaboratorId) q = q.where("collaboratorId", "==", f.collaboratorId);
  else if (f.supplierId) q = q.where("supplierId", "==", f.supplierId);
  if (f.overdueOnly) {
    q = q.where("status", "in", [...OPEN_STATUSES]).where("dueDate", "<", today);
  } else {
    if (f.status === "open") q = q.where("status", "in", [...OPEN_STATUSES]);
    else if (f.status === "paid") q = q.where("status", "==", "paid");
    else if (f.status === "cancelled") q = q.where("status", "==", "cancelled");
    if (f.month) { const { start, end } = monthRange(f.month); q = q.where("dueDate", ">=", start).where("dueDate", "<=", end); }
  }
  q = q.orderBy("dueDate", "asc").limit(f.limit ?? 500);
  const query = q;
  let items = await safeQuery(`lançamentos (${f.kind})`, async () => mapDocs(await query.get()), [] as FinancialEntry[]);
  if (f.categoryId) items = items.filter((e) => e.categoryId === f.categoryId);
  if (f.costCenterId) items = items.filter((e) => e.costCenterId === f.costCenterId);
  return items;
}

export const getEntry = cache(async (id: string) => getDoc(Collections.financialEntries(), id));

export async function transactionsOfEntry(entryId: string): Promise<FinancialTransaction[]> {
  return (await safeQuery("movimentações do lançamento", async () => mapDocs(await Collections.financialTransactions().where("entryId", "==", entryId).get()), [] as FinancialTransaction[])).sort((a, b) => a.date.localeCompare(b.date) || a.createdAt - b.createdAt);
}

export async function listTransactions(month: string, accountId?: string): Promise<FinancialTransaction[]> {
  const { start, end } = monthRange(month);
  let q: FirebaseFirestore.Query<FinancialTransaction> = Collections.financialTransactions().where("date", ">=", start).where("date", "<=", end);
  if (accountId) q = q.where("accountId", "==", accountId);
  const query = q.orderBy("date", "desc").limit(1000);
  const items = await safeQuery("movimentações", async () => mapDocs(await query.get()), [] as FinancialTransaction[]);
  return items.sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt);
}

/** Saldo por conta = saldo inicial + entradas − saídas (agregações: 2 leituras por conta). */
export const accountBalances = cache(async () => {
  const accounts = (await allAccounts()).filter((a) => a.active);
  const rows = await Promise.all(accounts.map(async (a) => {
    const base = Collections.financialTransactions().where("accountId", "==", a.id).where("reversed", "==", false);
    const sum = (types: string[]) => safeQuery("saldo das contas", async () => Number((await base.where("type", "in", types).aggregate({ total: AggregateField.sum("amount") }).get()).data().total ?? 0), 0);
    const [inTotal, outTotal] = await Promise.all([sum(["in", "transfer_in"]), sum(["out", "transfer_out"])]);
    return { account: a, inTotal, outTotal, balance: Math.round((a.initialBalance + inTotal - outTotal) * 100) / 100 };
  }));
  return rows;
});

/** Totais em aberto e vencidos por tipo (4 agregações, independentes do volume). */
export const openTotals = cache(async () => {
  const today = await todayFin();
  const one = async (kind: FinanceKind) => {
    const base = Collections.financialEntries().where("kind", "==", kind).where("status", "in", [...OPEN_STATUSES]);
    const label = kind === "receivable" ? "totais a receber" : "totais a pagar";
    const zero = { total: 0, count: 0 };
    const agg = (q: FirebaseFirestore.Query<FinancialEntry>) => safeQuery(label, async () => {
      const d = (await q.aggregate({ total: AggregateField.sum("openAmount"), count: AggregateField.count() }).get()).data();
      return { total: Number(d.total ?? 0), count: Number(d.count ?? 0) };
    }, zero);
    const [open, overdue] = await Promise.all([agg(base), agg(base.where("dueDate", "<", today))]);
    return { open: open.total, openCount: open.count, overdue: overdue.total, overdueCount: overdue.count };
  };
  const [receivable, payable] = await Promise.all([one("receivable"), one("payable")]);
  return { receivable, payable };
});

/** Resumos mensais (1 leitura por mês). */
export async function summariesFor(months: string[]): Promise<Record<string, FinancialSummary>> {
  const snaps = await Promise.all(months.map((m) => Collections.financialSummaries().doc(m).get()));
  const out: Record<string, FinancialSummary> = {};
  snaps.forEach((s, i) => { out[months[i]] = s.exists ? (s.data() as FinancialSummary) : { month: months[i] }; });
  return out;
}

export function monthsBack(month: string, n: number): string[] {
  return Array.from({ length: n }, (_, i) => addMonths(month, -(n - 1 - i)));
}

export function bucketTotal(s: FinancialSummary | undefined, path: "expected.income" | "expected.expense" | "received.income" | "received.expense" | "cash.in" | "cash.out"): number {
  const [a, b] = path.split(".") as ["expected" | "received" | "cash", string];
  const group = s?.[a] as Record<string, { total?: number }> | undefined;
  return Number(group?.[b]?.total ?? 0);
}

/** Próximos vencimentos (7 dias) para o painel. */
export async function upcomingEntries(kind: FinanceKind, days = 7, limit = 8): Promise<FinancialEntry[]> {
  const today = await todayFin();
  const end = addDaysIso(today, days);
  const q = Collections.financialEntries().where("kind", "==", kind).where("status", "in", [...OPEN_STATUSES]).where("dueDate", ">=", today).where("dueDate", "<=", end).orderBy("dueDate").limit(limit);
  return safeQuery("próximos vencimentos", async () => mapDocs(await q.get()), [] as FinancialEntry[]);
}
function addDaysIso(iso: string, d: number) { const [y, m, dd] = iso.split("-").map(Number); return new Date(Date.UTC(y, m - 1, dd + d)).toISOString().slice(0, 10); }

/** Vencidos (inadimplência e contas a pagar atrasadas). */
export async function overdueEntries(kind: FinanceKind, limit = 500): Promise<FinancialEntry[]> {
  return listEntries({ kind, overdueOnly: true, limit });
}

export function withDisplay(e: FinancialEntry, today: string) {
  return { ...e, display: displayStatus(e, today) };
}

/** Resumo financeiro de um responsável (aba do responsável e área da família). */
export async function guardianFinance(guardianId: string) {
  const today = await todayFin();
  const entries = await listEntries({ kind: "receivable", guardianId, status: "all", limit: 300 });
  const open = entries.filter((e) => OPEN_STATUSES.includes(e.status as (typeof OPEN_STATUSES)[number]));
  return {
    today, entries,
    openTotal: open.reduce((a, e) => a + e.openAmount, 0),
    overdueTotal: open.filter((e) => e.dueDate < today).reduce((a, e) => a + e.openAmount, 0),
    paidTotal: entries.filter((e) => e.status !== "cancelled").reduce((a, e) => a + e.paidAmount, 0),
  };
}

export async function practitionerFinance(practitionerId: string) {
  const today = await todayFin();
  const [entries, plans] = await Promise.all([listEntries({ kind: "receivable", practitionerId, status: "all", limit: 300 }), safeQuery("planos do praticante", async () => mapDocs(await Collections.billingPlans().where("practitionerId", "==", practitionerId).get()), [])]);
  const open = entries.filter((e) => OPEN_STATUSES.includes(e.status as (typeof OPEN_STATUSES)[number]));
  return {
    today, entries, plans,
    openTotal: open.reduce((a, e) => a + e.openAmount, 0),
    overdueTotal: open.filter((e) => e.dueDate < today).reduce((a, e) => a + e.openAmount, 0),
    paidTotal: entries.filter((e) => e.status !== "cancelled").reduce((a, e) => a + e.paidAmount, 0),
  };
}
