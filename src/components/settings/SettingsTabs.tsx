"use client";
import { usePathname } from "next/navigation";
import { Tabs } from "@/components/ui";
export function SettingsTabs({ tabs }: { tabs: { href: string; label: string }[] }) {
  return <Tabs tabs={tabs} current={usePathname()} />;
}
