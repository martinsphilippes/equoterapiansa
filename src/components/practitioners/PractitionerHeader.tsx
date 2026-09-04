"use client";
import { usePathname } from "next/navigation";
import { LinkButton, PageHeader, Tabs } from "@/components/ui";
import { PractitionerStatusBadge } from "@/components/collaborators/StatusBadge";
import type { Practitioner } from "@/lib/db/types";
import { isoToBR } from "@/lib/domain/dates";

export interface HeaderStats {
  age: number | null;
  frequencyPercent: number;
  lastAssessment: string | null;
  nextAssessment: string | null;
  evolutionPercent: number | null;
  evolutionDelta: number | null;
}

export function PractitionerHeader({ practitioner: p, tabs, stats, canManage, canRecord }: { practitioner: Practitioner; tabs: { href: string; label: string }[]; stats: HeaderStats; canManage: boolean; canRecord: boolean }) {
  const pathname = usePathname();
  return (
    <>
      <PageHeader
        back="/praticantes"
        title={<span className="flex items-center gap-3">
          {p.photoPath ? /* foto servida pelo servidor com verificação de permissão */ // eslint-disable-next-line @next/next/no-img-element
          <img src={`/api/files/photo_${p.id}`} alt="" className="h-12 w-12 rounded-full object-cover" /> : <span className="h-12 w-12 rounded-full bg-primary-soft text-primary-700 flex items-center justify-center font-bold">{p.name.split(/\s+/).slice(0, 2).map((x) => x[0]).join("")}</span>}
          <span>{p.name}<span className="block text-sm font-normal text-ink-500">{stats.age !== null ? `${stats.age} anos · ` : ""}desde {isoToBR(p.entryDate)}</span></span>
        </span>}
        subtitle={<PractitionerStatusBadge status={p.status} />}
        actions={<>
          {canRecord && p.status !== "closed" && <LinkButton href={`/atendimentos/novo?praticante=${p.id}`} size="sm">Registrar atendimento</LinkButton>}
          {canManage && <LinkButton href={`/praticantes/${p.id}/editar`} variant="outline" size="sm">Editar</LinkButton>}
        </>}
      />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <Mini label="Frequência" value={`${stats.frequencyPercent}%`} />
        <Mini label="Última avaliação" value={stats.lastAssessment ? isoToBR(stats.lastAssessment) : "—"} />
        <Mini label="Próxima avaliação" value={stats.nextAssessment ? isoToBR(stats.nextAssessment) : "—"} warn={!!stats.nextAssessment && stats.nextAssessment < new Date().toISOString().slice(0, 10)} />
        <Mini label="Evolução geral" value={stats.evolutionPercent === null ? "—" : `${stats.evolutionPercent > 0 ? "+" : ""}${stats.evolutionPercent}%`} hint={stats.evolutionDelta !== null ? `${stats.evolutionDelta > 0 ? "+" : ""}${stats.evolutionDelta} pontos` : undefined} good={(stats.evolutionPercent ?? 0) > 0} />
      </div>
      <Tabs tabs={tabs} current={pathname} />
    </>
  );
}

function Mini({ label, value, hint, warn, good }: { label: string; value: string; hint?: string; warn?: boolean; good?: boolean }) {
  return (
    <div className={`rounded-xl border px-3 py-2.5 ${good ? "bg-primary-soft border-primary-100" : "bg-surface border-border"}`}>
      <p className={`text-[11px] font-semibold uppercase tracking-wider ${good ? "text-primary-700" : "text-ink-500"}`}>{label}</p>
      <p className={`text-lg font-extrabold tnum ${warn ? "text-warning" : good ? "text-primary-800" : "text-ink-900"}`}>{value}</p>
      {hint && <p className="text-xs text-ink-500">{hint}</p>}
    </div>
  );
}
