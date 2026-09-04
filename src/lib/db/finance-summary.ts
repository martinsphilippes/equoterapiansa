import "server-only";
import { FieldValue } from "@/lib/firebase/admin";
import { Collections } from "./collections";
import type { FinancialEntry, FinancialTransaction } from "./finance-types";
import type { WriteBatch } from "firebase-admin/firestore";

/**
 * Resumos mensais incrementais (financialSummaries/{YYYY-MM}), atualizados no
 * mesmo batch da escrita para permanecerem consistentes. O painel lê 1 doc por mês.
 */
type Deltas = Record<string, Record<string, number>>; // month -> path -> delta

function add(d: Deltas, month: string, path: string, value: number) {
  if (!value) return;
  d[month] = d[month] ?? {};
  d[month][path] = (d[month][path] ?? 0) + value;
}

/** Contribuição do lançamento (regime de competência). sign = +1 ao criar, -1 ao cancelar/alterar. */
export function entryDeltas(e: Pick<FinancialEntry, "kind" | "netAmount" | "discount" | "competence" | "categoryId" | "costCenterId" | "status">, sign: 1 | -1, d: Deltas = {}): Deltas {
  if (e.status === "cancelled") return d;
  const t = e.kind === "receivable" ? "income" : "expense";
  add(d, e.competence, `expected.${t}.total`, sign * e.netAmount);
  add(d, e.competence, `expected.${t}.discounts`, sign * (e.discount || 0));
  add(d, e.competence, `expected.${t}.byCategory.${e.categoryId}`, sign * e.netAmount);
  if (e.costCenterId) add(d, e.competence, `expected.${t}.byCostCenter.${e.costCenterId}`, sign * e.netAmount);
  return d;
}

/** Contribuição da movimentação (caixa por mês da data; liquidado por competência do lançamento). */
export function transactionDeltas(tx: Pick<FinancialTransaction, "type" | "amount" | "date" | "categoryId" | "costCenterId" | "entryKind" | "entryCompetence">, sign: 1 | -1, d: Deltas = {}): Deltas {
  if (tx.type === "transfer_in" || tx.type === "transfer_out") return d;
  const month = tx.date.slice(0, 7);
  const dir = tx.type === "in" ? "in" : "out";
  add(d, month, `cash.${dir}.total`, sign * tx.amount);
  if (tx.categoryId) add(d, month, `cash.${dir}.byCategory.${tx.categoryId}`, sign * tx.amount);
  if (tx.costCenterId) add(d, month, `cash.${dir}.byCostCenter.${tx.costCenterId}`, sign * tx.amount);
  if (tx.entryKind && tx.entryCompetence) {
    const t = tx.entryKind === "receivable" ? "income" : "expense";
    add(d, tx.entryCompetence, `received.${t}.total`, sign * tx.amount);
    if (tx.categoryId) add(d, tx.entryCompetence, `received.${t}.byCategory.${tx.categoryId}`, sign * tx.amount);
    if (tx.costCenterId) add(d, tx.entryCompetence, `received.${t}.byCostCenter.${tx.costCenterId}`, sign * tx.amount);
  }
  return d;
}

/**
 * Aplica os incrementos com set(merge). Caminhos com ponto são convertidos em objetos
 * aninhados: em set() o SDK trata "a.b" como nome literal, só update() entende caminhos.
 */
export function applyDeltas(batch: WriteBatch, d: Deltas) {
  for (const [month, paths] of Object.entries(d)) {
    const update: Record<string, unknown> = { month };
    let count = 0;
    for (const [path, v] of Object.entries(paths)) {
      if (Math.abs(v) < 0.005) continue;
      const segs = path.split(".");
      let node = update;
      for (const seg of segs.slice(0, -1)) node = (node[seg] as Record<string, unknown>) ?? (node[seg] = {});
      node[segs[segs.length - 1]] = FieldValue.increment(Math.round(v * 100) / 100);
      count++;
    }
    if (count > 0) batch.set(Collections.financialSummaries().doc(month), update, { merge: true });
  }
}
