"use client";
import { usePathname } from "next/navigation";
import { Tabs } from "@/components/ui";
export function FamilyTabs({ base }: { base: string }) {
  const tabs = [{ href: `${base}/agenda`, label: "Agenda" }, { href: `${base}/evolucao`, label: "Evolução" }, { href: `${base}/relatorios`, label: "Relatórios" }, { href: `${base}/documentos`, label: "Documentos" }];
  return <Tabs tabs={tabs} current={usePathname()} />;
}
