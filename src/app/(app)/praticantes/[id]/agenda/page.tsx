import { notFound } from "next/navigation";
import { requireStaff, hasPermission } from "@/lib/auth/session";
import { getPractitionerFor, appointmentsOfPractitioner } from "@/lib/db/queries/practitioners";
import { getSettings } from "@/lib/db/settings";
import { Card, EmptyState, LinkButton, Stat } from "@/components/ui";
import { AppointmentRow } from "@/components/agenda/AppointmentRow";
import { computeFrequency } from "@/lib/domain/frequency";
import { todayISO } from "@/lib/domain/dates";
import type { Params } from "@/lib/types";

export default async function PractitionerAgendaPage({ params }: { params: Params<{ id: string }> }) {
  const user = await requireStaff();
  const { id } = await params;
  const [p, settings] = await Promise.all([getPractitionerFor(user, id), getSettings()]);
  if (!p) notFound();
  const appts = await appointmentsOfPractitioner(id);
  const today = todayISO(settings.timezone);
  const upcoming = appts.filter((a) => a.date >= today && (a.status === "scheduled" || a.status === "confirmed"));
  const past = appts.filter((a) => !upcoming.includes(a)).reverse();
  const freq = computeFrequency(appts);
  const canManage = hasPermission(user, "schedule.manage");
  const canRecord = hasPermission(user, "sessions.record");
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Stat label="Previstas" value={freq.expected} />
        <Stat label="Realizadas" value={freq.done} tone="green" />
        <Stat label="Faltas" value={freq.missed} tone={freq.missed ? "red" : "default"} />
        <Stat label="Canceladas" value={freq.cancelled} />
        <Stat label="Frequência" value={`${freq.percent}%`} hint="realizadas ÷ (realizadas + faltas)" />
      </div>
      <Card title="Próximos atendimentos" action={canManage && p.status !== "closed" && <LinkButton href={`/agenda/novo?praticante=${id}`} size="sm" variant="secondary">+ Agendar</LinkButton>} className="p-0">
        {upcoming.length === 0 ? <EmptyState title="Nenhum atendimento futuro agendado" /> : <ul className="divide-y divide-border -mt-5">{upcoming.map((a) => <AppointmentRow key={a.id} a={a} canRecord={canRecord} canManage={canManage} showDate linkPractitioner={false} />)}</ul>}
      </Card>
      <Card title="Histórico de agendamentos" className="p-0">
        {past.length === 0 ? <EmptyState title="Sem histórico" /> : <ul className="divide-y divide-border -mt-5">{past.slice(0, 60).map((a) => <AppointmentRow key={a.id} a={a} canRecord={canRecord} canManage={canManage} showDate linkPractitioner={false} compact />)}</ul>}
      </Card>
    </div>
  );
}
