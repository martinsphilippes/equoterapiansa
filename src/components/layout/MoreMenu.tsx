"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MoreHorizontal, UserRound, X, Home, Calendar, Users, Clock, Briefcase, Wallet, CircleDollarSign, Megaphone, ShieldCheck, Settings, Heart, FileText, type LucideIcon } from "lucide-react";
import { LogoutButton } from "./LogoutButton";
import type { NavItem } from "./NavLinks";
import { OrgSwitcher, type OrgOption } from "./OrgSwitcher";

const icons: Record<string, LucideIcon> = {
  home: Home, calendar: Calendar, users: Users, clock: Clock, team: Briefcase, money: Wallet, finance: CircleDollarSign,
  megaphone: Megaphone, shield: ShieldCheck, settings: Settings, heart: Heart, file: FileText,
};

/**
 * Quinta célula da barra inferior no celular. A barra comporta cinco alvos de
 * toque confortáveis; o restante do menu vive aqui, em uma folha deslizante.
 */
export function MoreMenu({ items, orgs = [], activeOrgId = "" }: { items: NavItem[]; orgs?: OrgOption[]; activeOrgId?: string }) {
  // Guarda a rota em que a folha foi aberta: se a navegação acontece, ela fecha
  // sozinha na renderização seguinte, sem efeito colateral.
  const [openedAt, setOpenedAt] = useState<string | null>(null);
  const pathname = usePathname();
  const open = openedAt === pathname;
  const setOpen = (v: boolean) => setOpenedAt(v ? pathname : null);
  const active = items.some((i) => pathname === i.href || pathname.startsWith(i.href + "/")) || pathname.startsWith("/conta");

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpenedAt(null); };
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = previous; };
  }, [open]);

  return (
    <li>
      <button type="button" onClick={() => setOpen(true)} aria-expanded={open} aria-haspopup="dialog"
        className={`w-full relative flex flex-col items-center gap-0.5 pt-2 pb-1.5 text-[11px] font-semibold ${active ? "text-primary-700" : "text-ink-500"}`}>
        <span className={`flex items-center justify-center h-7 w-12 rounded-full transition ${active ? "bg-primary-soft" : ""}`}>
          <MoreHorizontal className="h-5 w-5" strokeWidth={active ? 2.4 : 1.9} />
        </span>
        <span className="truncate max-w-full px-1">Mais</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true" aria-label="Mais opções">
          {/* Fundo escuro: fecha ao toque, mas não é alvo de teclado; para isso existem o Esc e o botão fechar. */}
          <div aria-hidden onClick={() => setOpen(false)} className="absolute inset-0 bg-ink-900/40 backdrop-blur-[2px]" />
          <div className="absolute inset-x-0 bottom-0 rounded-t-3xl bg-surface border-t border-border shadow-2xl pb-[max(env(safe-area-inset-bottom),0.75rem)] animate-sheet-up">
            <div className="flex items-center justify-between px-5 pt-4 pb-2">
              <h2 className="text-base font-bold">Mais</h2>
              <button type="button" onClick={() => setOpen(false)} aria-label="Fechar" className="h-9 w-9 -mr-2 flex items-center justify-center rounded-full text-ink-500 hover:bg-surface-100">
                <X className="h-5 w-5" />
              </button>
            </div>
            {orgs.length > 1 && <div className="px-3 pb-3"><OrgSwitcher orgs={orgs} activeId={activeOrgId} compact /></div>}
            <ul className="px-3 pb-2 max-h-[60dvh] overflow-y-auto">
              {items.map((it) => {
                const Icon = icons[it.icon] ?? Home;
                const isActive = pathname === it.href || pathname.startsWith(it.href + "/");
                return (
                  <li key={it.href}>
                    <Link prefetch={false} href={it.href as never} onClick={() => setOpen(false)}
                      className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold ${isActive ? "bg-primary-soft text-primary-700" : "text-ink-700 active:bg-surface-100"}`}>
                      <Icon className="h-5 w-5" strokeWidth={1.9} /> {it.label}
                    </Link>
                  </li>
                );
              })}
              <li>
                <Link prefetch={false} href="/conta" onClick={() => setOpen(false)}
                  className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold ${pathname.startsWith("/conta") ? "bg-primary-soft text-primary-700" : "text-ink-700 active:bg-surface-100"}`}>
                  <UserRound className="h-5 w-5" strokeWidth={1.9} /> Minha conta
                </Link>
              </li>
            </ul>
            <div className="border-t border-border px-6 py-4"><LogoutButton /></div>
          </div>
        </div>
      )}
    </li>
  );
}
