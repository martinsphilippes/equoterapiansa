import { notFound } from "next/navigation";
import { requireStaff, hasPermission } from "@/lib/auth/session";
import { getPractitionerFor } from "@/lib/db/queries/practitioners";
import { practitionerStats } from "@/lib/db/queries/practitionerStats";
import { getSettings } from "@/lib/db/settings";
import { PractitionerHeader } from "@/components/practitioners/PractitionerHeader";
import { canSeeFinance } from "@/lib/auth/finance-access";
import type { ReactNode } from "react";

export default async function PractitionerLayout({ children, params }: { children: ReactNode; params: Promise<{ id: string }> }) {
  const user = await requireStaff();
  const { id } = await params;
  const [p, settings] = await Promise.all([getPractitionerFor(user, id), getSettings()]);
  if (!p) notFound();
  const { stats } = await practitionerStats(p, settings);
  const base = `/praticantes/${id}`;
  const tabs = [
    { href: base, label: "Dados" },
    { href: `${base}/responsaveis`, label: "Responsáveis" },
    { href: `${base}/agenda`, label: "Agenda" },
    { href: `${base}/atendimentos`, label: "Atendimentos" },
    { href: `${base}/evolucao`, label: "Evolução" },
    { href: `${base}/avaliacoes`, label: "Avaliações" },
    { href: `${base}/documentos`, label: "Documentos" },
    { href: `${base}/relatorios`, label: "Relatórios" },
    { href: `${base}/historico`, label: "Histórico" },
    ...(canSeeFinance(user) ? [{ href: `${base}/financeiro`, label: "Financeiro" }] : []),
  ];
  return (
    <div>
      <PractitionerHeader practitioner={p} tabs={tabs} stats={stats} canManage={hasPermission(user, "practitioners.manage")} canRecord={hasPermission(user, "sessions.record")} />
      {children}
    </div>
  );
}
