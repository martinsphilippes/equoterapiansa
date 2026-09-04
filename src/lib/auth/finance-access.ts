import "server-only";
import { redirect } from "next/navigation";
import { hasAny, hasPermission, requireStaff } from "./session";
import type { Permission } from "./permissions";
import type { UserProfile } from "@/lib/db/types";

export const FINANCE_PERMS: Permission[] = ["finance.dashboard", "finance.receivables.view", "finance.receivables.manage", "finance.receivables.settle", "finance.payables.view", "finance.payables.manage", "finance.payables.settle", "finance.setup", "finance.reconcile"];

export function canSeeFinance(user: UserProfile) {
  return hasAny(user, FINANCE_PERMS);
}
export async function requireFinance(p?: Permission | Permission[]) {
  const user = await requireStaff();
  if (!canSeeFinance(user)) redirect("/sem-permissao");
  if (p) { const list = Array.isArray(p) ? p : [p]; if (!hasAny(user, list)) redirect("/sem-permissao"); }
  return user;
}
export function financeTabs(user: UserProfile) {
  const t: { href: string; label: string }[] = [];
  if (hasPermission(user, "finance.dashboard")) t.push({ href: "/financeiro", label: "Painel" });
  if (hasAny(user, ["finance.receivables.view", "finance.receivables.manage", "finance.receivables.settle"])) t.push({ href: "/financeiro/receber", label: "A receber" });
  if (hasAny(user, ["finance.payables.view", "finance.payables.manage", "finance.payables.settle"])) t.push({ href: "/financeiro/pagar", label: "A pagar" });
  if (hasAny(user, ["finance.reconcile", "finance.dashboard"])) t.push({ href: "/financeiro/movimentacoes", label: "Movimentações" });
  if (hasAny(user, ["finance.receivables.manage", "finance.receivables.view"])) t.push({ href: "/financeiro/mensalidades", label: "Mensalidades" });
  if (hasAny(user, ["finance.receivables.manage", "finance.payables.manage"])) t.push({ href: "/financeiro/recorrencias", label: "Recorrências" });
  if (hasAny(user, ["finance.dashboard", "finance.receivables.view"])) t.push({ href: "/financeiro/inadimplencia", label: "Inadimplência" });
  if (hasPermission(user, "finance.dashboard")) t.push({ href: "/financeiro/relatorios", label: "Relatórios" }, { href: "/financeiro/dre", label: "DRE" });
  if (hasPermission(user, "finance.setup")) t.push({ href: "/financeiro/fornecedores", label: "Fornecedores" }, { href: "/financeiro/configuracoes", label: "Configurações" });
  return t;
}
