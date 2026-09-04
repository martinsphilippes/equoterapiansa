import "server-only";
import { cache } from "react";
import { db } from "@/lib/firebase/admin";
import { Collections, mapDocs } from "../collections";
import type { CostCenter, FinancialAccount, FinancialCategory, FinancialSettings, PaymentMethod, Supplier } from "../finance-types";

/** Cadastros de apoio, uma leitura por requisição. Coleções pequenas (dezenas de docs). */
export const allCategories = cache(async (): Promise<FinancialCategory[]> => mapDocs(await Collections.financialCategories().get()).sort((a, b) => a.order - b.order || a.name.localeCompare(b.name, "pt-BR")));
export const allCostCenters = cache(async (): Promise<CostCenter[]> => mapDocs(await Collections.costCenters().get()).sort((a, b) => a.name.localeCompare(b.name, "pt-BR")));
export const allAccounts = cache(async (): Promise<FinancialAccount[]> => mapDocs(await Collections.financialAccounts().get()).sort((a, b) => a.name.localeCompare(b.name, "pt-BR")));
export const allPaymentMethods = cache(async (): Promise<PaymentMethod[]> => mapDocs(await Collections.paymentMethods().get()).sort((a, b) => a.order - b.order));
export const allSuppliers = cache(async (): Promise<Supplier[]> => mapDocs(await Collections.suppliers().get()).sort((a, b) => a.name.localeCompare(b.name, "pt-BR")));

export const financeSettingsRef = () => db.collection("financialSettings").doc("general");
export const getFinanceSettings = cache(async (): Promise<FinancialSettings> => {
  const snap = await financeSettingsRef().get();
  return { showToGuardians: true, updatedAt: 0, ...(snap.exists ? (snap.data() as Partial<FinancialSettings>) : {}) };
});

/** Todos os cadastros de apoio ativos, para formulários. */
export const financeRefData = cache(async () => {
  const [categories, costCenters, accounts, methods, suppliers, settings] = await Promise.all([allCategories(), allCostCenters(), allAccounts(), allPaymentMethods(), allSuppliers(), getFinanceSettings()]);
  return {
    categories: categories.filter((c) => c.active),
    costCenters: costCenters.filter((c) => c.active),
    accounts: accounts.filter((a) => a.active),
    methods: methods.filter((m) => m.active),
    suppliers: suppliers.filter((s) => s.active),
    settings,
  };
});

/** Nome com hierarquia: "Pessoal › Salários". */
export function categoryPath(cats: FinancialCategory[], id: string | null | undefined): string {
  if (!id) return "";
  const map = new Map(cats.map((c) => [c.id, c]));
  const parts: string[] = [];
  let cur = map.get(id);
  let guard = 0;
  while (cur && guard++ < 5) { parts.unshift(cur.name); cur = cur.parentId ? map.get(cur.parentId) : undefined; }
  return parts.join(" › ");
}
export function costCenterPath(list: CostCenter[], id: string | null | undefined): string {
  if (!id) return "";
  const map = new Map(list.map((c) => [c.id, c]));
  const parts: string[] = [];
  let cur = map.get(id);
  let guard = 0;
  while (cur && guard++ < 5) { parts.unshift(cur.name); cur = cur.parentId ? map.get(cur.parentId) : undefined; }
  return parts.join(" › ");
}

/** Ordena categorias em árvore (pais seguidos dos filhos) para selects. */
export function treeOrder<T extends { id: string; parentId?: string | null; name: string }>(items: T[]): (T & { depth: number })[] {
  const byParent = new Map<string | null, T[]>();
  for (const it of items) { const k = it.parentId ?? null; byParent.set(k, [...(byParent.get(k) ?? []), it]); }
  const out: (T & { depth: number })[] = [];
  const walk = (parent: string | null, depth: number) => {
    for (const it of (byParent.get(parent) ?? []).sort((a, b) => a.name.localeCompare(b.name, "pt-BR"))) { out.push({ ...it, depth }); walk(it.id, depth + 1); }
  };
  walk(null, 0);
  // órfãos (pai inativo/inexistente)
  const seen = new Set(out.map((o) => o.id));
  for (const it of items) if (!seen.has(it.id)) out.push({ ...it, depth: 0 });
  return out;
}
