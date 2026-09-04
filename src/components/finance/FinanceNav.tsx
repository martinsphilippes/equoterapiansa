"use client";
import { usePathname } from "next/navigation";
import { Tabs } from "@/components/ui";
export function FinanceNav({ tabs }: { tabs: { href: string; label: string }[] }) {
  const pathname = usePathname();
  const current = tabs.map((t) => t.href).filter((h) => pathname === h || pathname.startsWith(h + "/")).sort((a, b) => b.length - a.length)[0] ?? pathname;
  return <Tabs tabs={tabs} current={current} />;
}
