import { requireUser } from "@/lib/auth/session";
import { getSettings } from "@/lib/db/settings";
import { AppShell, buildNav } from "@/components/layout/AppShell";
import type { ReactNode } from "react";

/** /conta é compartilhada entre equipe e responsáveis: escolhe o shell conforme o perfil. */
export default async function AccountLayout({ children }: { children: ReactNode }) {
  const [user, settings] = await Promise.all([requireUser(), getSettings()]);
  const isGuardian = user.role === "guardian";
  const nav = isGuardian
    ? [{ href: "/familia", label: "Início", icon: "home" }, { href: "/familia/comunicados", label: "Avisos", icon: "megaphone" }, { href: "/conta", label: "Conta", icon: "settings" }]
    : buildNav(user);
  return <AppShell user={user} nav={nav} orgName={settings.orgName} homeHref={isGuardian ? "/familia" : "/painel"}>{children}</AppShell>;
}
