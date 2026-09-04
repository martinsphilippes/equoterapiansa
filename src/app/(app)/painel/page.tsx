import Link from "next/link";
import { Users, CalendarCheck, Clock, Wallet, UserRound, CalendarDays, CheckCircle2, XCircle, ClipboardList } from "lucide-react";
import { requireStaff, hasPermission } from "@/lib/auth/session";
import { getSettings } from "@/lib/db/settings";
import { dashboardData } from "@/lib/db/queries/dashboard";
import { appointmentsInRange, listPractitioners } from "@/lib/db/queries/practitioners";
import { announcementsFor } from "@/lib/db/queries/announcements";
import { Card, EmptyState, LinkButton, PageHeader, SectionTitle, Stat } from "@/components/ui";
import { AppointmentRow } from "@/components/agenda/AppointmentRow";
import { competenceLabel, isoToBR, minutesToHM, todayISO, weekdayLabel } from "@/lib/domain/dates";

export const metadata = { title: "Painel" };

export default async function PainelPage() {
  const user = await requireStaff();
  const settings = await getSettings();
  const first = user.name.split(" ")[0];
  if (!hasPermission(user, "dashboard.view")) return <StaffHome userId={user.id} name={first} role={user.role} collaboratorId={user.collaboratorId} tz={settings.timezone} canRecord={hasPermission(user, "sessions.record")} />;

  const d = await dashboardData();
  const unread = (await announcementsFor(user, [], 40)).filter((a) => !a.readBy.includes(user.id)).slice(0, 3);
  const pend = d.practitioners.assessmentsPending.length + d.operation.reportsPending.length + d.operation.documentsPending;
  return (
    <div className="space-y-6">
      <PageHeader title={`Olá, ${first}`} subtitle={`${weekdayLabel(d.today)}, ${isoToBR(d.today)} · ${settings.orgName}`} />

      <section>
        <SectionTitle>Colaboradores</SectionTitle>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Link prefetch={false} href="/colaboradores"><Stat label="Ativos" value={d.collaborators.active} icon={<Users className="h-4 w-4" />} /></Link>
          <Link prefetch={false} href="/jornada/equipe"><Stat label="Presentes hoje" value={d.collaborators.presentToday} hint={`de ${d.collaborators.expectedToday} previstos`} tone="green" icon={<CheckCircle2 className="h-4 w-4" />} /></Link>
          <Link prefetch={false} href="/jornada/equipe"><Stat label="Ausentes" value={d.collaborators.absentToday} tone={d.collaborators.absentToday ? "red" : "default"} icon={<XCircle className="h-4 w-4" />} /></Link>
          <Link prefetch={false} href="/pagamentos"><Stat label="Horas do mês" value={minutesToHM(d.collaborators.monthMinutes)} icon={<Clock className="h-4 w-4" />} /></Link>
          <Link prefetch={false} href={`/pagamentos?mes=${d.prevCompetence}`} className="col-span-2 md:col-span-1"><Stat label="Pagamentos pendentes" value={d.collaborators.pendingPayments} hint={competenceLabel(d.prevCompetence)} tone={d.collaborators.pendingPayments ? "amber" : "green"} icon={<Wallet className="h-4 w-4" />} /></Link>
        </div>
      </section>

      <section>
        <SectionTitle>Praticantes</SectionTitle>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Link prefetch={false} href="/praticantes"><Stat label="Ativos" value={d.practitioners.active} tone="primary" icon={<UserRound className="h-4 w-4" />} /></Link>
          <Link prefetch={false} href="/agenda"><Stat label="Atendimentos hoje" value={d.practitioners.appointmentsToday} hint={`${d.practitioners.pendingToday} a realizar`} icon={<CalendarDays className="h-4 w-4" />} /></Link>
          <Link prefetch={false} href="/agenda"><Stat label="Presentes" value={d.practitioners.presentToday} tone="green" icon={<CalendarCheck className="h-4 w-4" />} /></Link>
          <Link prefetch={false} href="/agenda"><Stat label="Faltas" value={d.practitioners.missedToday} tone={d.practitioners.missedToday ? "red" : "default"} icon={<XCircle className="h-4 w-4" />} /></Link>
          <div className="col-span-2 md:col-span-1"><Stat label="Avaliações pendentes" value={d.practitioners.assessmentsPending.length} hint={`sem avaliação há ${settings.assessmentIntervalMonths} meses`} tone={d.practitioners.assessmentsPending.length ? "amber" : "green"} icon={<ClipboardList className="h-4 w-4" />} /></div>
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Card title="Próximos atendimentos" action={<Link prefetch={false} href="/agenda" className="text-sm font-semibold text-primary-600 hover:underline">Agenda</Link>} className="lg:col-span-2 p-0">
          {d.operation.upcoming.length === 0 ? <EmptyState title="Nada agendado nos próximos dias" /> : <ul className="divide-y divide-border -mt-5">{d.operation.upcoming.map((a) => <AppointmentRow key={a.id} a={a} canRecord={hasPermission(user, "sessions.record")} canManage={hasPermission(user, "schedule.manage")} showDate linkPractitioner compact />)}</ul>}
        </Card>
        <div className="space-y-5">
          <Card title={<span className="flex items-center gap-2">Pendências {pend > 0 && <span className="inline-flex h-5 min-w-5 px-1.5 items-center justify-center rounded-full bg-warning text-white text-[11px] font-bold">{pend}</span>}</span>}>
            <ul className="text-sm space-y-2">
              <li className="flex justify-between"><span>Avaliações a fazer</span><b className="tnum">{d.practitioners.assessmentsPending.length}</b></li>
              <li className="flex justify-between"><span>Relatórios a gerar</span><b className="tnum">{d.operation.reportsPending.length}</b></li>
              <li className="flex justify-between"><span>Documentos pendentes</span><b className="tnum">{d.operation.documentsPending}</b></li>
            </ul>
            {(d.practitioners.assessmentsPending.length > 0 || d.operation.reportsPending.length > 0) && (
              <ul className="mt-3 pt-3 border-t border-border text-sm space-y-1">
                {d.practitioners.assessmentsPending.slice(0, 5).map((p) => <li key={p.id}><Link prefetch={false} href={`/praticantes/${p.id}/avaliacoes`} className="font-medium text-primary-600 hover:underline">{p.name}</Link> <span className="text-ink-500">· avaliação</span></li>)}
                {d.operation.reportsPending.slice(0, 5).map((p) => <li key={p.id}><Link prefetch={false} href={`/praticantes/${p.id}/relatorios`} className="font-medium text-primary-600 hover:underline">{p.name}</Link> <span className="text-ink-500">· relatório</span></li>)}
              </ul>
            )}
          </Card>
          <Card title="Comunicados" action={<Link prefetch={false} href="/comunicados" className="text-sm font-semibold text-primary-600 hover:underline">Ver todos</Link>}>
            {unread.length === 0 ? <p className="text-sm text-ink-500">Nenhum comunicado novo.</p> : <ul className="text-sm space-y-2">{unread.map((a) => <li key={a.id}><Link prefetch={false} href="/comunicados" className="font-semibold hover:underline">{a.title}</Link></li>)}</ul>}
          </Card>
        </div>
      </section>
    </div>
  );
}

async function StaffHome({ userId, name, role, collaboratorId, tz, canRecord }: { userId: string; name: string; role: string; collaboratorId?: string; tz: string; canRecord: boolean }) {
  const today = todayISO(tz);
  const appts = await appointmentsInRange(today, today, role === "professional" ? { professionalId: collaboratorId } : undefined);
  const mine = role === "professional" ? await listPractitioners({ id: userId, role: "professional", collaboratorId, permissions: [], email: "", name, active: true, createdAt: 0, updatedAt: 0 }) : [];
  return (
    <div className="space-y-5">
      <PageHeader title={`Olá, ${name}`} subtitle={`${weekdayLabel(today)}, ${isoToBR(today)}`} />
      <div className="grid grid-cols-2 gap-3">
        <LinkButton href="/jornada" size="lg" className="h-16">Registrar ponto</LinkButton>
        <LinkButton href="/agenda" size="lg" variant="secondary" className="h-16">Ver agenda</LinkButton>
      </div>
      <Card title="Atendimentos de hoje" className="p-0">
        {appts.length === 0 ? <EmptyState title="Nenhum atendimento hoje" /> : <ul className="divide-y divide-border -mt-5">{appts.map((a) => <AppointmentRow key={a.id} a={a} canRecord={canRecord} canManage={false} linkPractitioner={role === "professional"} compact />)}</ul>}
      </Card>
      {role === "professional" && (
        <Card title="Meus praticantes">
          {mine.length === 0 ? <p className="text-sm text-ink-500">Nenhum praticante atribuído a você ainda.</p> : <ul className="text-sm grid grid-cols-1 sm:grid-cols-2 gap-1">{mine.map((p) => <li key={p.id}><Link prefetch={false} href={`/praticantes/${p.id}`} className="font-medium text-primary-600 hover:underline">{p.name}</Link></li>)}</ul>}
        </Card>
      )}
    </div>
  );
}
