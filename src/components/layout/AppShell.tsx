import Link from "next/link";
import type { ReactNode } from "react";
import type { UserProfile } from "@/lib/db/types";
import { hasAny, hasPermission } from "@/lib/auth/session";
import { ROLE_LABELS } from "@/lib/auth/permissions";
import { NavLinks, type NavItem } from "./NavLinks";
import { LogoutButton } from "./LogoutButton";
import { Avatar } from "@/components/ui";

export function buildNav(user: UserProfile): NavItem[] {
  const items: NavItem[] = [];
  const isProfessional = user.role === "professional";
  if (hasPermission(user, "dashboard.view")) items.push({ href: "/painel", label: "Painel", icon: "home" });
  else items.push({ href: "/painel", label: "Início", icon: "home" });
  items.push({ href: "/agenda", label: "Agenda", icon: "calendar" });
  if (hasPermission(user, "practitioners.view") || isProfessional) items.push({ href: "/praticantes", label: "Praticantes", icon: "users" });
  items.push({ href: "/jornada", label: "Jornada", icon: "clock" });
  if (hasAny(user, ["collaborators.view", "collaborators.manage"])) items.push({ href: "/colaboradores", label: "Equipe", icon: "team" });
  if (hasAny(user, ["payments.manage", "finance.view"])) items.push({ href: "/pagamentos", label: "Pagamentos", icon: "money" });
  items.push({ href: "/comunicados", label: "Comunicados", icon: "megaphone" });
  if (hasPermission(user, "audit.view")) items.push({ href: "/auditoria", label: "Auditoria", icon: "shield" });
  if (hasAny(user, ["settings.manage", "users.manage"])) items.push({ href: "/configuracoes", label: "Configurações", icon: "settings" });
  return items;
}

export function AppShell({ user, children, nav, homeHref = "/painel", orgName }: { user: UserProfile; children: ReactNode; nav: NavItem[]; homeHref?: string; orgName: string }) {
  return (
    <div className="flex-1 flex min-h-dvh">
      <aside className="hidden md:flex w-64 shrink-0 flex-col border-r border-ink-100 bg-white no-print">
        <Link href={homeHref as never} className="flex items-center gap-3 px-5 h-16 border-b border-ink-100">
          <span className="h-9 w-9 rounded-xl bg-brand-600 text-white flex items-center justify-center text-lg">🐴</span>
          <span className="font-semibold truncate">{orgName}</span>
        </Link>
        <div className="flex-1 overflow-y-auto py-3">
          <NavLinks items={nav} orientation="vertical" />
        </div>
        <div className="border-t border-ink-100 p-4">
          <Link href="/conta" className="flex items-center gap-3 hover:bg-sand-100 rounded-xl p-2 -m-2">
            <Avatar name={user.name} size="sm" />
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{user.name}</p>
              <p className="text-xs text-ink-500 truncate">{ROLE_LABELS[user.role]}</p>
            </div>
          </Link>
          <div className="mt-3"><LogoutButton /></div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="md:hidden sticky top-0 z-20 h-14 flex items-center justify-between px-4 bg-white/90 backdrop-blur border-b border-ink-100 no-print">
          <Link href={homeHref as never} className="flex items-center gap-2 font-semibold">
            <span className="h-8 w-8 rounded-lg bg-brand-600 text-white flex items-center justify-center">🐴</span>
            <span className="truncate max-w-[50vw]">{orgName}</span>
          </Link>
          <Link href="/conta" aria-label="Minha conta"><Avatar name={user.name} size="sm" /></Link>
        </header>
        <main className="flex-1 px-4 py-5 md:px-8 md:py-7 pb-24 md:pb-8 max-w-6xl w-full mx-auto">{children}</main>
        <nav className="md:hidden fixed bottom-0 inset-x-0 z-20 bg-white border-t border-ink-100 no-print pb-[env(safe-area-inset-bottom)]">
          <NavLinks items={nav.slice(0, 5)} orientation="horizontal" />
        </nav>
      </div>
    </div>
  );
}
