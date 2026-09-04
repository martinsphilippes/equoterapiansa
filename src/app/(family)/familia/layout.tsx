import { requireGuardian } from "@/lib/db/queries/family";
import { getSettings } from "@/lib/db/settings";
import { AppShell } from "@/components/layout/AppShell";
import type { ReactNode } from "react";

export default async function FamilyLayout({ children }: { children: ReactNode }) {
  const [{ user, practitioners }, settings] = await Promise.all([requireGuardian(), getSettings()]);
  const nav = [
    { href: "/familia", label: "Início", icon: "home" },
    ...(practitioners.length === 1 ? [{ href: `/familia/${practitioners[0].id}/agenda`, label: "Agenda", icon: "calendar" }, { href: `/familia/${practitioners[0].id}/evolucao`, label: "Evolução", icon: "heart" }] : []),
    { href: "/familia/comunicados", label: "Avisos", icon: "megaphone" },
    { href: "/conta", label: "Conta", icon: "settings" },
  ];
  return <AppShell user={user} nav={nav} orgName={settings.orgName} homeHref="/familia">{children}</AppShell>;
}
