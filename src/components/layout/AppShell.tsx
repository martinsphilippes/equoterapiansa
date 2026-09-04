import Link from "next/link";
import type { ReactNode } from "react";
import type { UserProfile } from "@/lib/db/types";
import { hasAny, hasPermission } from "@/lib/auth/session";
import { ROLE_LABELS } from "@/lib/auth/permissions";
import { NavLinks, type NavItem } from "./NavLinks";
import { LogoutButton } from "./LogoutButton";
import { Avatar } from "@/components/ui";
import { BrandLogo, BrandLockup } from "@/components/brand/Brand";

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

export function AppShell({ user, children, nav, homeHref = "/painel" }: { user: UserProfile; children: ReactNode; nav: NavItem[]; homeHref?: string; orgName?: string }) {
  return (
    <div className="flex-1 flex min-h-dvh">
      {/* Sidebar (desktop): logo completa, navegação e usuário */}
      <aside className="hidden md:flex w-[268px] shrink-0 flex-col border-r border-border bg-surface no-print">
        <Link prefetch={false} href={homeHref as never} className="flex items-center justify-center px-6 pt-6 pb-4">
          <BrandLogo className="w-44" sizes="176px" />
        </Link>
        <div className="flex-1 overflow-y-auto py-2">
          <NavLinks items={nav} orientation="vertical" />
        </div>
        <div className="border-t border-border p-4">
          <Link prefetch={false} href="/conta" className="flex items-center gap-3 hover:bg-surface-100 rounded-xl p-2 -m-2">
            <Avatar name={user.name} size="sm" />
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate">{user.name}</p>
              <p className="text-xs text-ink-500 truncate">{ROLE_LABELS[user.role]}</p>
            </div>
          </Link>
          <div className="mt-3"><LogoutButton /></div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        {/* Header (mobile): símbolo + nome, avatar */}
        <header className="md:hidden sticky top-0 z-20 h-14 flex items-center justify-between px-4 bg-surface/90 backdrop-blur border-b border-border no-print pt-[env(safe-area-inset-top)]">
          <Link prefetch={false} href={homeHref as never} className="min-w-0"><BrandLockup compact /></Link>
          <Link prefetch={false} href="/conta" aria-label="Minha conta"><Avatar name={user.name} size="sm" /></Link>
        </header>
        <main className="flex-1 px-4 py-5 md:px-8 md:py-7 pb-24 md:pb-8 max-w-6xl w-full mx-auto">{children}</main>
        <nav className="md:hidden fixed bottom-0 inset-x-0 z-20 bg-surface border-t border-border no-print pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_24px_-16px_rgba(10,14,110,0.25)]">
          <NavLinks items={nav.slice(0, 5)} orientation="horizontal" />
        </nav>
      </div>
    </div>
  );
}
