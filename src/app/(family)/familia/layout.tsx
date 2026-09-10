import { requireGuardian } from "@/lib/db/queries/family";
import { getSettings } from "@/lib/db/settings";
import { getFinanceSettings } from "@/lib/db/queries/finance-ref";
import { AppShell } from "@/components/layout/AppShell";
import { organizationsFor } from "@/lib/db/queries/orgs";
import type { ReactNode } from "react";

export default async function FamilyLayout({ children }: { children: ReactNode }) {
  const { user, practitioners } = await requireGuardian();
  const [settings, fin, orgs] = await Promise.all([getSettings(), getFinanceSettings(), organizationsFor(user)]);
  const nav = [
    { href: "/familia", label: "Início", icon: "home", primary: true },
    ...(practitioners.length === 1 ? [{ href: `/familia/${practitioners[0].id}/agenda`, label: "Agenda", icon: "calendar", primary: true }, { href: `/familia/${practitioners[0].id}/evolucao`, label: "Evolução", icon: "heart", primary: true }] : []),
    ...(fin.showToGuardians ? [{ href: "/familia/financeiro", label: "Financeiro", icon: "finance" }] : []),
    { href: "/familia/comunicados", label: "Avisos", icon: "megaphone", primary: true },
    { href: "/conta", label: "Conta", icon: "settings" },
  ];
  return <AppShell user={user} nav={nav} orgName={settings.orgName} homeHref="/familia" orgs={orgs.map((o) => ({ id: o.id, name: o.name }))}>{children}</AppShell>;
}
