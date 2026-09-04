import { requireGuardianPractitioner } from "@/lib/db/queries/family";
import { getSettings } from "@/lib/db/settings";
import { appointmentsOfPractitioner } from "@/lib/db/queries/practitioners";
import { Card, EmptyState, Stat } from "@/components/ui";
import { AppointmentStatusBadge } from "@/components/collaborators/StatusBadge";
import { computeFrequency } from "@/lib/domain/frequency";
import { isoToBR, todayISO, weekdayLabel } from "@/lib/domain/dates";

export default async function FamilyAgendaPage({ params }: { params: Promise<{ pid: string }> }) {
  const { pid } = await params;
  const [, settings] = await Promise.all([requireGuardianPractitioner(pid), getSettings()]);
  const appts = await appointmentsOfPractitioner(pid);
  const today = todayISO(settings.timezone);
  const upcoming = appts.filter((a) => a.date >= today && (a.status === "scheduled" || a.status === "confirmed"));
  const past = appts.filter((a) => !upcoming.includes(a) && a.status !== "cancelled" && a.status !== "rescheduled").reverse();
  const freq = computeFrequency(appts);
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-3">
        <Stat label="Realizados" value={freq.done} tone="green" />
        <Stat label="Faltas" value={freq.missed} tone={freq.missed ? "red" : "default"} />
        <Stat label="Frequência" value={`${freq.percent}%`} />
      </div>
      <Card title="Próximos atendimentos" className="p-0">
        {upcoming.length === 0 ? <EmptyState title="Nenhum atendimento agendado" /> : (
          <ul className="divide-y divide-border -mt-5">{upcoming.map((a) => (
            <li key={a.id} className="px-4 py-3 flex items-center justify-between gap-2">
              <div><p className="font-medium">{weekdayLabel(a.date)}, {isoToBR(a.date)} às {a.startTime}</p><p className="text-sm text-ink-500">{a.type} · {a.professionalName}</p></div>
              <AppointmentStatusBadge status={a.status} />
            </li>
          ))}</ul>
        )}
      </Card>
      <Card title="Histórico de presença" className="p-0">
        {past.length === 0 ? <EmptyState title="Sem histórico" /> : (
          <ul className="divide-y divide-border -mt-5">{past.slice(0, 40).map((a) => (
            <li key={a.id} className="px-4 py-2.5 flex items-center justify-between gap-2 text-sm">
              <span>{isoToBR(a.date)} {a.startTime} · {a.professionalName}</span>
              <AppointmentStatusBadge status={a.status} />
            </li>
          ))}</ul>
        )}
      </Card>
    </div>
  );
}
