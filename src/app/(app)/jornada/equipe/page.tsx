import Link from "next/link";
import { requirePermission } from "@/lib/auth/session";
import { getSettings } from "@/lib/db/settings";
import { listCollaborators } from "@/lib/db/queries/collaborators";
import { entriesOfDay } from "@/lib/db/queries/time";
import { Card, Input, PageHeader, Table, thCls } from "@/components/ui";
import { DayStatus } from "@/components/time/MonthTable";
import { TeamDayEditor } from "@/components/time/TeamDayEditor";
import { isWorkingDay, scheduleFor } from "@/lib/domain/time";
import { addDays, isoToBR, minutesToHM, todayISO, weekdayLabel } from "@/lib/domain/dates";
import type { SearchParams } from "@/lib/types";
import { sp1 } from "@/lib/types";

export const metadata = { title: "Jornada da equipe" };

export default async function TeamTimePage({ searchParams }: { searchParams: SearchParams }) {
  await requirePermission("time.manage");
  const settings = await getSettings();
  const sp = await searchParams;
  const today = todayISO(settings.timezone);
  const date = sp1(sp, "data") ?? today;
  const [collaborators, entries] = await Promise.all([listCollaborators({ status: "active" }), entriesOfDay(date)]);
  const map = new Map(entries.map((e) => [e.collaboratorId, e]));
  const rows = collaborators.map((c) => ({ c, e: map.get(c.id), isWorking: isWorkingDay(date, scheduleFor(settings, c.schedule), settings.holidays) }));
  const present = rows.filter((r) => r.e?.status === "present").length;

  return (
    <div className="space-y-5">
      <PageHeader title="Jornada da equipe" subtitle={`${weekdayLabel(date)}, ${isoToBR(date)} · ${present} presente${present === 1 ? "" : "s"} de ${rows.filter((r) => r.isWorking).length} previstos`} />
      <div className="flex items-center gap-2 no-print">
        <Link href={`/jornada/equipe?data=${addDays(date, -1)}`} className="px-3 py-2 rounded-xl bg-surface border border-border">‹</Link>
        <form className="flex-1"><Input type="date" name="data" defaultValue={date} onChange={undefined} className="max-w-xs" /></form>
        <Link href={`/jornada/equipe?data=${addDays(date, 1)}`} className="px-3 py-2 rounded-xl bg-surface border border-border">›</Link>
        <Link href="/jornada/equipe" className="text-sm text-primary-700">Hoje</Link>
      </div>
      <Card>
        <Table>
          <thead><tr><th className={thCls}>Colaborador</th><th className={thCls}>Situação</th><th className={thCls}>Horários</th><th className={thCls}>Total</th><th className={thCls}></th></tr></thead>
          <tbody>
            {rows.map(({ c, e, isWorking }) => (
              <TeamDayEditor key={c.id} collaboratorId={c.id} date={date} entry={e ?? null}
                name={<Link href={`/colaboradores/${c.id}/jornada?mes=${date.slice(0, 7)}`} className="font-medium hover:underline">{c.name}<span className="block text-xs text-ink-500 font-normal">{c.jobRoleName}</span></Link>}
                status={<DayStatus entry={e} isWorking={isWorking} isPast={date < today} />}
                periods={e?.periods.map((p) => `${p.in}→${p.out ?? "…"}`).join("  ") ?? ""}
                total={e?.status === "present" ? minutesToHM(e.workedMinutes) : ""}
              />
            ))}
          </tbody>
        </Table>
      </Card>
    </div>
  );
}
