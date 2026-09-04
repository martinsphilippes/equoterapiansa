import { requireStaff, hasPermission } from "@/lib/auth/session";
import { Collections, getDoc } from "@/lib/db/collections";
import { getSettings } from "@/lib/db/settings";
import { timeEntriesOfMonth, computeMonthFor } from "@/lib/db/queries/payroll";
import { monthDaysFor } from "@/lib/db/queries/time";
import { Alert, Card, LinkButton, PageHeader } from "@/components/ui";
import { ClockCard } from "@/components/time/ClockCard";
import { MonthSummaryCards } from "@/components/time/MonthSummaryCards";
import { MonthTable } from "@/components/time/MonthTable";
import { MonthNav } from "@/components/time/MonthNav";
import { currentCompetence, isoToBR, todayISO, weekdayLabel } from "@/lib/domain/dates";
import type { SearchParams } from "@/lib/types";
import { sp1 } from "@/lib/types";

export const metadata = { title: "Minha jornada" };

export default async function MyTimePage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireStaff();
  const settings = await getSettings();
  const sp = await searchParams;
  const competence = sp1(sp, "mes") ?? currentCompetence(settings.timezone);
  const today = todayISO(settings.timezone);
  const isManager = hasPermission(user, "time.manage");

  if (!user.collaboratorId) {
    return (
      <div>
        <PageHeader title="Jornada" actions={isManager && <LinkButton href="/jornada/equipe" variant="outline">Jornada da equipe</LinkButton>} />
        <Alert tone="info">Seu usuário não está vinculado a um cadastro de colaborador, por isso não há registro de jornada pessoal. {isManager ? "Use a jornada da equipe para conferir os registros." : "Fale com a administração."}</Alert>
      </div>
    );
  }
  const c = await getDoc(Collections.collaborators(), user.collaboratorId);
  if (!c) return <Alert tone="error">Cadastro de colaborador não encontrado.</Alert>;
  const [entries, days] = await Promise.all([timeEntriesOfMonth(c.id, competence), monthDaysFor(c, competence)]);
  const summary = computeMonthFor(c, competence, entries, settings);
  const todayEntry = entries.find((e) => e.date === today) ?? (competence !== today.slice(0, 7) ? await getDoc(Collections.timeEntries(), `${c.id}_${today}`) : null);

  return (
    <div className="space-y-5">
      <PageHeader title="Minha jornada" subtitle={c.name} actions={isManager && <LinkButton href="/jornada/equipe" variant="outline">Jornada da equipe</LinkButton>} />
      <ClockCard today={today} entry={todayEntry} todayLabel={`Hoje, ${weekdayLabel(today)} ${isoToBR(today)}`} />
      <MonthNav competence={competence} basePath="/jornada" />
      <MonthSummaryCards s={summary} />
      <Card title="Dias do mês">
        <MonthTable collaboratorId={c.id} days={days} entries={entries} isManager={isManager} today={today} editableToday />
      </Card>
    </div>
  );
}
