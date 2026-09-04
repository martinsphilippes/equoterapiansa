import Link from "next/link";
import { requireStaff, hasPermission } from "@/lib/auth/session";
import { getSettings } from "@/lib/db/settings";
import { appointmentsInRange } from "@/lib/db/queries/practitioners";
import { Card, EmptyState, LinkButton, PageHeader } from "@/components/ui";
import { AppointmentRow } from "@/components/agenda/AppointmentRow";
import { addDays, isoToBR, monthRange, startOfWeek, todayISO, weekdayLabel, competenceLabel, listDays, weekdayOf } from "@/lib/domain/dates";
import type { SearchParams } from "@/lib/types";
import { sp1 } from "@/lib/types";

export const metadata = { title: "Agenda" };

export default async function AgendaPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireStaff();
  const settings = await getSettings();
  const sp = await searchParams;
  const today = todayISO(settings.timezone);
  const date = sp1(sp, "data") ?? today;
  const view = (sp1(sp, "visao") ?? "dia") as "dia" | "semana" | "mes";
  const canManage = hasPermission(user, "schedule.manage");
  const canRecord = hasPermission(user, "sessions.record");
  const canOpen = hasPermission(user, "practitioners.view") || user.role === "professional";
  const filter = user.role === "professional" ? { professionalId: user.collaboratorId } : undefined;

  let start = date, end = date, title = `${weekdayLabel(date)}, ${isoToBR(date)}`, prev = addDays(date, -1), next = addDays(date, 1);
  if (view === "semana") { start = startOfWeek(date); end = addDays(start, 6); title = `Semana de ${isoToBR(start)} a ${isoToBR(end)}`; prev = addDays(start, -7); next = addDays(start, 7); }
  if (view === "mes") { ({ start, end } = monthRange(date.slice(0, 7))); title = competenceLabel(date.slice(0, 7)); prev = addDays(start, -1); next = addDays(end, 1); }
  const appts = await appointmentsInRange(start, end, filter);
  const byDay = new Map<string, typeof appts>();
  for (const a of appts) byDay.set(a.date, [...(byDay.get(a.date) ?? []), a]);
  const q = (d: string, v = view) => `/agenda?visao=${v}&data=${d}`;

  return (
    <div className="space-y-4">
      <PageHeader title="Agenda" subtitle={title} actions={canManage && <LinkButton href={`/agenda/novo?data=${date}`}>+ Agendar</LinkButton>} />
      <div className="flex flex-wrap items-center gap-2 no-print">
        <div className="flex rounded-xl bg-surface border border-border p-0.5">
          {(["dia", "semana", "mes"] as const).map((v) => <Link key={v} href={q(date, v)} className={`px-3 py-1.5 rounded-lg text-sm capitalize ${view === v ? "bg-primary-600 text-white" : "text-ink-700"}`}>{v === "mes" ? "Mês" : v}</Link>)}
        </div>
        <div className="flex items-center gap-1 ml-auto">
          <Link href={q(prev)} className="px-3 py-1.5 rounded-xl bg-surface border border-border">‹</Link>
          <Link href={q(today)} className="px-3 py-1.5 rounded-xl bg-surface border border-border text-sm">Hoje</Link>
          <Link href={q(next)} className="px-3 py-1.5 rounded-xl bg-surface border border-border">›</Link>
        </div>
      </div>

      {view === "mes" ? (
        <MonthGrid start={start} end={end} byDay={byDay} today={today} />
      ) : view === "semana" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {listDays(start, end).map((d) => (
            <Card key={d} className={`p-0 ${d === today ? "ring-2 ring-primary-300" : ""}`} title={<Link href={q(d, "dia")} className="hover:underline">{weekdayLabel(d)} <span className="text-ink-500 font-normal">{isoToBR(d).slice(0, 5)}</span></Link>}>
              {(byDay.get(d) ?? []).length === 0 ? <p className="text-sm text-ink-300 px-1">Sem atendimentos</p> : (
                <ul className="divide-y divide-border -m-5">{(byDay.get(d) ?? []).map((a) => <AppointmentRow key={a.id} a={a} canRecord={canRecord} canManage={canManage} linkPractitioner={canOpen} compact />)}</ul>
              )}
            </Card>
          ))}
        </div>
      ) : (
        <Card className="p-0">
          {appts.length === 0 ? <EmptyState title="Nenhum atendimento neste dia" action={canManage && <LinkButton href={`/agenda/novo?data=${date}`} variant="secondary">Agendar</LinkButton>} /> : (
            <ul className="divide-y divide-border">{appts.map((a) => <AppointmentRow key={a.id} a={a} canRecord={canRecord} canManage={canManage} linkPractitioner={canOpen} />)}</ul>
          )}
        </Card>
      )}
    </div>
  );
}

function MonthGrid({ start, end, byDay, today }: { start: string; end: string; byDay: Map<string, { status: string }[]>; today: string }) {
  const days = listDays(start, end);
  const lead = (weekdayOf(start) + 6) % 7; // segunda = 0
  const cells = [...Array(lead).fill(null), ...days];
  return (
    <div className="rounded-2xl bg-surface border border-border overflow-hidden">
      <div className="grid grid-cols-7 text-center text-xs uppercase tracking-wide text-ink-500 border-b border-border">
        {["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"].map((d) => <div key={d} className="py-2">{d}</div>)}
      </div>
      <div className="grid grid-cols-7">
        {cells.map((d, i) => {
          if (!d) return <div key={`e${i}`} className="min-h-16 border-b border-r border-border bg-surface-50" />;
          const list = byDay.get(d) ?? [];
          const done = list.filter((a) => a.status === "done").length;
          const missed = list.filter((a) => a.status === "missed").length;
          const pending = list.filter((a) => a.status === "scheduled" || a.status === "confirmed").length;
          return (
            <Link key={d} href={`/agenda?visao=dia&data=${d}`} className={`min-h-16 border-b border-r border-border p-1.5 hover:bg-surface-50 ${d === today ? "bg-primary-50" : ""}`}>
              <span className={`text-xs ${d === today ? "font-bold text-primary-800" : "text-ink-500"}`}>{Number(d.slice(8, 10))}</span>
              <div className="mt-1 flex flex-wrap gap-0.5">
                {pending > 0 && <span className="text-[10px] rounded bg-sky-100 text-sky-800 px-1">{pending}</span>}
                {done > 0 && <span className="text-[10px] rounded bg-primary-100 text-primary-800 px-1">{done}</span>}
                {missed > 0 && <span className="text-[10px] rounded bg-red-100 text-red-800 px-1">{missed}</span>}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
