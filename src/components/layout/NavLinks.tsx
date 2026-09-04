"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Calendar, Users, Clock, Briefcase, Wallet, Megaphone, ShieldCheck, Settings, Heart, FileText, type LucideIcon } from "lucide-react";

const icons: Record<string, LucideIcon> = {
  home: Home, calendar: Calendar, users: Users, clock: Clock, team: Briefcase, money: Wallet,
  megaphone: Megaphone, shield: ShieldCheck, settings: Settings, heart: Heart, file: FileText,
};

export interface NavItem { href: string; label: string; icon: keyof typeof icons | string }

export function NavLinks({ items, orientation }: { items: NavItem[]; orientation: "vertical" | "horizontal" }) {
  const pathname = usePathname();
  const isActive = (href: string) => pathname === href || (href !== "/familia" && pathname.startsWith(href + "/")) || (href === "/familia" && pathname === "/familia");
  if (orientation === "horizontal") {
    return (
      <ul className="grid" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
        {items.map((it) => {
          const Icon = icons[it.icon] ?? Home;
          const active = isActive(it.href);
          return (
            <li key={it.href}>
              <Link href={it.href as never} className={`relative flex flex-col items-center gap-0.5 pt-2 pb-1.5 text-[11px] font-semibold ${active ? "text-primary-700" : "text-ink-500"}`}>
                <span className={`flex items-center justify-center h-7 w-12 rounded-full transition ${active ? "bg-primary-soft" : ""}`}>
                  <Icon className="h-5 w-5" strokeWidth={active ? 2.4 : 1.9} />
                </span>
                <span className="truncate max-w-full px-1">{it.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    );
  }
  return (
    <ul className="px-3 space-y-0.5">
      {items.map((it) => {
        const Icon = icons[it.icon] ?? Home;
        const active = isActive(it.href);
        return (
          <li key={it.href}>
            <Link href={it.href as never} className={`relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${active ? "bg-primary-soft text-primary-700" : "text-ink-700 hover:bg-surface-100"}`}>
              {active && <span className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-primary" />}
              <Icon className="h-5 w-5" strokeWidth={active ? 2.3 : 1.9} />
              {it.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
