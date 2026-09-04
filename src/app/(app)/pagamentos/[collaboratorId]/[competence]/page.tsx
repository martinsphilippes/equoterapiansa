import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission, hasPermission } from "@/lib/auth/session";
import { getSettings } from "@/lib/db/settings";
import { buildPayrollMonth, payrollHistory } from "@/lib/db/queries/payroll";
import { Card, PageHeader, Badge } from "@/components/ui";
import { PayrollSheet } from "@/components/payroll/PayrollSheet";
import { competenceLabel, todayISO } from "@/lib/domain/dates";
import { formatBRL } from "@/lib/domain/format";
import type { Params } from "@/lib/types";

export default async function PayrollMonthPage({ params }: { params: Params<{ collaboratorId: string; competence: string }> }) {
  const user = await requirePermission(["payments.manage", "finance.view"]);
  const { collaboratorId, competence } = await params;
  if (!/^\d{4}-\d{2}$/.test(competence)) notFound();
  const [m, history, settings] = await Promise.all([buildPayrollMonth(collaboratorId, competence), payrollHistory(collaboratorId), getSettings()]);
  if (!m) notFound();
  return (
    <div className="space-y-5">
      <PageHeader back="/pagamentos" title={`${m.collaboratorName} — ${competenceLabel(competence).toUpperCase()}`} subtitle={<Link prefetch={false} href={`/colaboradores/${collaboratorId}/jornada?mes=${competence}`} className="text-primary-700 hover:underline">Ver registros de jornada do mês</Link>} />
      <MonthNavCompetence collaboratorId={collaboratorId} competence={competence} />
      <PayrollSheet m={m} canManage={hasPermission(user, "payments.manage")} today={todayISO(settings.timezone)} />
      <Card title="Histórico de pagamentos">
        {history.length === 0 ? <p className="text-sm text-ink-500">Nenhum mês fechado ainda.</p> : (
          <ul className="divide-y divide-border">
            {history.map((h) => (
              <li key={h.id} className="flex items-center justify-between py-2 text-sm">
                <Link prefetch={false} href={`/pagamentos/${collaboratorId}/${h.competence}`} className="font-medium hover:underline">{competenceLabel(h.competence)}</Link>
                <span className="flex items-center gap-3">
                  <span>{h.status === "paid" ? formatBRL(h.paidAmount) : formatBRL(h.calculatedAmount)}</span>
                  {h.status === "paid" ? <Badge tone="green">Pago</Badge> : <Badge tone="amber">Não pago</Badge>}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function MonthNavCompetence({ collaboratorId, competence }: { collaboratorId: string; competence: string }) {
  return <MonthNavLinks collaboratorId={collaboratorId} competence={competence} />;
}

import { addMonths } from "@/lib/domain/dates";
function MonthNavLinks({ collaboratorId, competence }: { collaboratorId: string; competence: string }) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-xl bg-surface border border-border px-2 py-1.5 no-print">
      <Link prefetch={false} href={`/pagamentos/${collaboratorId}/${addMonths(competence, -1)}`} className="px-3 py-1 rounded-lg hover:bg-surface-100">‹</Link>
      <span className="font-medium">{competenceLabel(competence)}</span>
      <Link prefetch={false} href={`/pagamentos/${collaboratorId}/${addMonths(competence, 1)}`} className="px-3 py-1 rounded-lg hover:bg-surface-100">›</Link>
    </div>
  );
}
