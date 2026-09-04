import Link from "next/link";
import { requirePermission } from "@/lib/auth/session";
import { getSettings } from "@/lib/db/settings";
import { listCollaborators } from "@/lib/db/queries/collaborators";
import { buildPayrollMonth } from "@/lib/db/queries/payroll";
import { Badge, Card, PageHeader, Stat, Table, thCls, tdCls, EmptyState } from "@/components/ui";
import { MonthNav } from "@/components/time/MonthNav";
import { currentCompetence, minutesToHM } from "@/lib/domain/dates";
import { formatBRL } from "@/lib/domain/format";
import type { SearchParams } from "@/lib/types";
import { sp1 } from "@/lib/types";

export const metadata = { title: "Pagamentos" };

export default async function PaymentsPage({ searchParams }: { searchParams: SearchParams }) {
  await requirePermission(["payments.manage", "finance.view"]);
  const settings = await getSettings();
  const sp = await searchParams;
  const competence = sp1(sp, "mes") ?? currentCompetence(settings.timezone);
  const collaborators = (await listCollaborators({ status: "all" })).filter((c) => c.status !== "terminated" || (c.terminationDate ?? "9999") >= `${competence}-01`);
  const months = (await Promise.all(collaborators.map((c) => buildPayrollMonth(c.id, competence)))).filter((m): m is NonNullable<typeof m> => !!m);
  const unpaid = months.filter((m) => m.status === "unpaid");
  const totalCalc = months.reduce((a, m) => a + m.calculatedAmount, 0);
  const totalPaid = months.filter((m) => m.status === "paid").reduce((a, m) => a + (m.paidAmount ?? 0), 0);

  return (
    <div className="space-y-5">
      <PageHeader title="Pagamentos" subtitle="Apuração mensal por colaborador. O sistema calcula referências; a decisão de pagamento é da administração." />
      <MonthNav competence={competence} basePath="/pagamentos" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Colaboradores" value={months.length} />
        <Stat label="Pendentes" value={unpaid.length} tone={unpaid.length ? "amber" : "green"} />
        <Stat label="Total calculado" value={formatBRL(totalCalc)} />
        <Stat label="Total pago" value={formatBRL(totalPaid)} tone="green" />
      </div>
      <Card>
        {months.length === 0 ? <EmptyState title="Nenhum colaborador para esta competência" /> : (
          <Table>
            <thead><tr><th className={thCls}>Colaborador</th><th className={thCls}>Horas</th><th className={thCls}>Faltas</th><th className={thCls}>Calculado</th><th className={thCls}>Pago</th><th className={thCls}>Situação</th></tr></thead>
            <tbody>
              {months.map((m) => (
                <tr key={m.id}>
                  <td className={tdCls}><Link href={`/pagamentos/${m.collaboratorId}/${competence}`} className="font-medium text-primary-800 hover:underline">{m.collaboratorName}</Link><span className="block text-xs text-ink-500">{m.payType === "hourly" ? "por hora" : "mensal"}</span></td>
                  <td className={tdCls}>{minutesToHM(m.workedMinutes)} <span className="text-xs text-ink-500">/ {minutesToHM(m.expectedMinutes)}</span></td>
                  <td className={tdCls}>{m.absences}</td>
                  <td className={tdCls}>{formatBRL(m.calculatedAmount)}</td>
                  <td className={tdCls}>{m.status === "paid" ? formatBRL(m.paidAmount) : "—"}</td>
                  <td className={tdCls}>{m.status === "paid" ? <Badge tone="green">Pago</Badge> : <Badge tone="amber">Não pago</Badge>}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  );
}
