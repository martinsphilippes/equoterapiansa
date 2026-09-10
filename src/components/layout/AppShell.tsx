import { canSeeFinance } from "@/lib/auth/finance-access";
import Link from "next/link";
import type { ReactNode } from "react";
import type { UserProfile } from "@/lib/db/types";
import { hasAny, hasPermission } from "@/lib/auth/session";
import { ROLE_LABELS } from "@/lib/auth/permissions";
import { NavLinks, type NavItem } from "./NavLinks";
import { MoreMenu } from "./MoreMenu";
import { OrgSwitcher, type OrgOption } from "./OrgSwitcher";
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
  if (hasPermission(user, "intake.manage")) items.push({ href: "/cadastros", label: "Fichas", icon: "file" });
  items.push({ href: "/jornada", label: "Jornada", icon: "clock" });
  if (hasAny(user, ["collaborators.view", "collaborators.manage"])) items.push({ href: "/colaboradores", label: "Equipe", icon: "team" });
  if (hasAny(user, ["payments.manage", "finance.view"])) items.push({ href: "/pagamentos", label: "Pagamentos", icon: "money" });
  if (canSeeFinance(user)) items.push({ href: "/financeiro", label: "Financeiro", icon: "finance" });
  items.push({ href: "/comunicados", label: "Comunicados", icon: "megaphone" });
  if (hasPermission(user, "audit.view")) items.push({ href: "/auditoria", label: "Auditoria", icon: "shield" });
  if (hasAny(user, ["settings.manage", "users.manage"])) items.push({ href: "/configuracoes", label: "Configurações", icon: "settings" });
  for (const it of items) it.primary = primaryFor(user.role).includes(it.href);
  return items;
}

/**
 * Telas fixas na barra do celular, por perfil. Quem administra vive no
 * financeiro e na agenda; quem atende vive na agenda e na própria jornada.
 */
function primaryFor(role: UserProfile["role"]): string[] {
  switch (role) {
    case "owner":
    case "manager":
      return ["/painel", "/agenda", "/praticantes", "/financeiro"];
    case "professional":
      return ["/painel", "/agenda", "/praticantes", "/jornada"];
    default:
      return ["/painel", "/agenda", "/jornada", "/comunicados"];
  }
}

/** Divide o menu entre a barra inferior do celular e a folha "Mais". */
export function splitNav(nav: NavItem[]): { bar: NavItem[]; more: NavItem[] } {
  if (nav.length <= 5) return { bar: nav, more: [] };
  const bar = nav.filter((i) => i.primary).slice(0, 4);
  for (const it of nav) {
    if (bar.length >= 4) break;
    if (!bar.includes(it)) bar.push(it);
  }
  return { bar, more: nav.filter((i) => !bar.includes(i)) };
}

export function AppShell({ user, children, nav, homeHref = "/painel", orgs = [] }: { user: UserProfile; children: ReactNode; nav: NavItem[]; homeHref?: string; orgName?: string; orgs?: OrgOption[] }) {
  const { bar, more } = splitNav(nav);
  const activeOrgId = user.activeOrgId ?? orgs[0]?.id ?? "";
  return (
    <div className="flex-1 flex min-h-dvh">
      {/* Sidebar (desktop): logo completa, navegação e usuário */}
      <aside className="hidden md:flex w-[268px] shrink-0 flex-col border-r border-border bg-surface no-print">
        <Link prefetch={false} href={homeHref as never} className="flex items-center justify-center px-6 pt-6 pb-4">
          <BrandLogo className="w-44" sizes="176px" />
        </Link>
        <OrgSwitcher orgs={orgs} activeId={activeOrgId} />
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
          <div className="flex items-center gap-2 min-w-0">
            {orgs.length > 1 && <span className="text-xs font-semibold text-primary-700 truncate max-w-32">{orgs.find((o) => o.id === activeOrgId)?.name}</span>}
            <Link prefetch={false} href="/conta" aria-label="Minha conta"><Avatar name={user.name} size="sm" /></Link>
          </div>
        </header>
        <main className="flex-1 px-4 py-5 md:px-8 md:py-7 pb-24 md:pb-8 max-w-6xl w-full mx-auto">{children}</main>
        <nav className="md:hidden fixed bottom-0 inset-x-0 z-20 bg-surface border-t border-border no-print pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_24px_-16px_rgba(10,14,110,0.25)]">
          <NavLinks items={bar} orientation="horizontal" trailing={more.length > 0 ? <MoreMenu items={more} orgs={orgs} activeOrgId={activeOrgId} /> : undefined} />
        </nav>
      </div>
    </div>
  );
}
