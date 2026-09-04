import { notFound } from "next/navigation";
import { requirePermission, hasPermission } from "@/lib/auth/session";
import { Collections, getDoc } from "@/lib/db/collections";
import { getSettings } from "@/lib/db/settings";
import { timeEntriesOfMonth, computeMonthFor } from "@/lib/db/queries/payroll";
import { monthDaysFor } from "@/lib/db/queries/time";
import { Card } from "@/components/ui";
import { MonthSummaryCards } from "@/components/time/MonthSummaryCards";
import { MonthTable } from "@/components/time/MonthTable";
import { MonthNav } from "@/components/time/MonthNav";
import { currentCompetence, todayISO } from "@/lib/domain/dates";
import type { Params, SearchParams } from "@/lib/types";
import { sp1 } from "@/lib/types";

export default async function CollaboratorTimePage({ params, searchParams }: { params: Params<{ id: string }>; searchParams: SearchParams }) {
  const user = await requirePermission(["collaborators.view", "collaborators.manage"]);
  const { id } = await params;
  const sp = await searchParams;
  const settings = await getSettings();
  const competence = sp1(sp, "mes") ?? currentCompetence(settings.timezone);
  const c = await getDoc(Collections.collaborators(), id);
  if (!c) notFound();
  const [entries, days] = await Promise.all([timeEntriesOfMonth(id, competence), monthDaysFor(c, competence)]);
  const summary = computeMonthFor(c, competence, entries, settings);
  return (
    <div className="space-y-5">
      <MonthNav competence={competence} basePath={`/colaboradores/${id}/jornada`} />
      <MonthSummaryCards s={summary} />
      <Card title="Registros do mês">
        <MonthTable collaboratorId={id} days={days} entries={entries} isManager={hasPermission(user, "time.manage")} today={todayISO(settings.timezone)} editableToday={false} />
      </Card>
    </div>
  );
}
