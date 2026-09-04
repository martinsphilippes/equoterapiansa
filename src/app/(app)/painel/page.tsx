import Link from "next/link";
import { requireStaff, hasPermission } from "@/lib/auth/session";
import { getSettings } from "@/lib/db/settings";
import { dashboardData } from "@/lib/db/queries/dashboard";
import { appointmentsInRange, listPractitioners } from "@/lib/db/queries/practitioners";
import { announcementsFor } from "@/lib/db/queries/announcements";
import { Card, EmptyState, LinkButton, PageHeader, Stat } from "@/components/ui";
import { AppointmentRow } from "@/components/agenda/AppointmentRow";
import { competenceLabel, isoToBR, minutesToHM, todayISO, weekdayLabel } from "@/lib/domain/dates";

export const metadata = { title: "Painel" };

export default async function PainelPage() {
  const user = await requireStaff();
  const settings = await getSettings();
  const first = user.name.split(" ")[0];
  if (!hasPermission(user, "dashboard.view")) return <StaffHome userId={user.id} name={first} role={user.role} collaboratorId={user.collaboratorId} tz={settings.timezone} canRecord={hasPermission(user, "sessions.record")} />;

  const d = await dashboardData();
  const unread = (await announcementsFor(user)).filter((a) => !a.readBy.includes(user.id)).slice(0, 3);
  return (
    <div className="space-y-6">
      <PageHeader title={`Olá, ${first}`} subtitle={`${weekdayLabel(d.today)}, ${isoToBR(d.today)}`} />

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-500 mb-2">Colaboradores</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Link href="/colaboradores"><Stat label="Ativos" value={d.collaborators.active} /></Link>
          <Link href="/jornada/equipe"><Stat label="Presentes hoje" value={d.collaborators.presentToday} hint={`de ${d.collaborators.expectedToday} previstos`} tone="green" /></Link>
          <Link href="/jornada/equipe"><Stat label="Ausentes" value={d.collaborators.absentToday} tone={d.collaborators.absentToday ? "red" : "default"} /></Link>
          <Link href="/pagamentos"><Stat label="Horas do mês" value={minutesToHM(d.collaborators.monthMinutes)} /></Link>
          <Link href={`/pagamentos?mes=${d.prevCompetence}`}><Stat label="Pagamentos pendentes" value={d.collaborators.pendingPayments} hint={competenceLabel(d.prevCompetence)} tone={d.collaborators.pendingPayments ? "amber" : "green"} /></Link>
        </div>
      </section>

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-500 mb-2">Praticantes</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Link href="/praticantes"><Stat label="Ativos" value={d.practitioners.active} /></Link>
          <Link href="/agenda"><Stat label="Atendimentos hoje" value={d.practitioners.appointmentsToday} hint={`${d.practitioners.pendingToday} a realizar`} /></Link>
          <Link href="/agenda"><Stat label="Presentes" value={d.practitioners.presentToday} tone="green" /></Link>
          <Link href="/agenda"><Stat label="Faltas" value={d.practitioners.missedToday} tone={d.practitioners.missedToday ? "red" : "default"} /></Link>
          <Stat label="Avaliações pendentes" value={d.practitioners.assessmentsPending.length} hint={`sem avaliação há ${settings.assessmentIntervalMonths} meses`} tone={d.practitioners.assessmentsPending.length ? "amber" : "green"} />
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Card title="Próximos atendimentos" action={<Link href="/agenda" className="text-sm text-brand-700 hover:underline">Agenda</Link>} className="lg:col-span-2 p-0">
          {d.operation.upcoming.length === 0 ? <EmptyState title="Nada agendado nos próximos dias" /> : <ul className="divide-y divide-ink-100 -mt-5">{d.operation.upcoming.map((a) => <AppointmentRow key={a.id} a={a} canRecord={hasPermission(user, "sessions.record")} canManage={hasPermission(user, "schedule.manage")} showDate linkPractitioner compact />)}</ul>}
        </Card>
        <div className="space-y-5">
          <Card title="Pendências">
            <ul className="text-sm space-y-2">
              <li className="flex justify-between"><span>Avaliações a fazer</span><b>{d.practitioners.assessmentsPending.length}</b></li>
              <li className="flex justify-between"><span>Relatórios a gerar</span><b>{d.operation.reportsPending.length}</b></li>
              <li className="flex justify-between"><span>Documentos pendentes</span><b>{d.operation.documentsPending}</b></li>
            </ul>
            {(d.practitioners.assessmentsPending.length > 0 || d.operation.reportsPending.length > 0) && (
              <ul className="mt-3 pt-3 border-t border-ink-100 text-sm space-y-1">
                {d.practitioners.assessmentsPending.slice(0, 5).map((p) => <li key={p.id}><Link href={`/praticantes/${p.id}/avaliacoes`} className="text-brand-700 hover:underline">{p.name}</Link> <span className="text-ink-500">· avaliação</span></li>)}
                {d.operation.reportsPending.slice(0, 5).map((p) => <li key={p.id}><Link href={`/praticantes/${p.id}/relatorios`} className="text-brand-700 hover:underline">{p.name}</Link> <span className="text-ink-500">· relatório</span></li>)}
              </ul>
            )}
          </Card>
          <Card title="Comunicados" action={<Link href="/comunicados" className="text-sm text-brand-700 hover:underline">Ver todos</Link>}>
            {unread.length === 0 ? <p className="text-sm text-ink-500">Nenhum comunicado novo.</p> : <ul className="text-sm space-y-2">{unread.map((a) => <li key={a.id}><Link href="/comunicados" className="font-medium hover:underline">{a.title}</Link></li>)}</ul>}
          </Card>
        </div>
      </section>
    </div>
  );
}

async function StaffHome({ userId, name, role, collaboratorId, tz, canRecord }: { userId: string; name: string; role: string; collaboratorId?: string; tz: string; canRecord: boolean }) {
  const today = todayISO(tz);
  const appts = await appointmentsInRange(today, today, role === "professional" ? { professionalId: collaboratorId } : undefined);
  const user = { id: userId } as never;
  void user;
  const mine = role === "professional" ? await listPractitioners({ id: userId, role: "professional", collaboratorId, permissions: [], email: "", name, active: true, createdAt: 0, updatedAt: 0 }) : [];
  return (
    <div className="space-y-5">
      <PageHeader title={`Olá, ${name}`} subtitle={`${weekdayLabel(today)}, ${isoToBR(today)}`} />
      <div className="grid grid-cols-2 gap-3">
        <LinkButton href="/jornada" size="lg" className="h-16">Registrar ponto</LinkButton>
        <LinkButton href="/agenda" size="lg" variant="secondary" className="h-16">Ver agenda</LinkButton>
      </div>
      <Card title="Atendimentos de hoje" className="p-0">
        {appts.length === 0 ? <EmptyState title="Nenhum atendimento hoje" /> : <ul className="divide-y divide-ink-100 -mt-5">{appts.map((a) => <AppointmentRow key={a.id} a={a} canRecord={canRecord} canManage={false} linkPractitioner={role === "professional"} compact />)}</ul>}
      </Card>
      {role === "professional" && (
        <Card title="Meus praticantes">
          {mine.length === 0 ? <p className="text-sm text-ink-500">Nenhum praticante atribuído a você ainda.</p> : <ul className="text-sm grid grid-cols-1 sm:grid-cols-2 gap-1">{mine.map((p) => <li key={p.id}><Link href={`/praticantes/${p.id}`} className="text-brand-700 hover:underline">{p.name}</Link></li>)}</ul>}
        </Card>
      )}
    </div>
  );
}
