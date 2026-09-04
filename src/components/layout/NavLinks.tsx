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
  if (orientation === "horizontal") {
    return (
      <ul className="grid" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
        {items.map((it) => {
          const Icon = icons[it.icon] ?? Home;
          const active = pathname === it.href || pathname.startsWith(it.href + "/");
          return (
            <li key={it.href}>
              <Link href={it.href as never} className={`flex flex-col items-center gap-0.5 py-2 text-[11px] ${active ? "text-brand-700" : "text-ink-500"}`}>
                <Icon className="h-5 w-5" strokeWidth={active ? 2.4 : 1.8} />
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
        const active = pathname === it.href || pathname.startsWith(it.href + "/");
        return (
          <li key={it.href}>
            <Link href={it.href as never} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium ${active ? "bg-brand-50 text-brand-800" : "text-ink-700 hover:bg-sand-100"}`}>
              <Icon className="h-5 w-5" strokeWidth={1.9} />
              {it.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
