import Link from "next/link";
import { requirePermission } from "@/lib/auth/session";
import { payrollHistory } from "@/lib/db/queries/payroll";
import { getSettings } from "@/lib/db/settings";
import { Badge, Card, LinkButton } from "@/components/ui";
import { competenceLabel, currentCompetence } from "@/lib/domain/dates";
import { formatBRL } from "@/lib/domain/format";
import type { Params } from "@/lib/types";

export default async function CollaboratorPaymentsPage({ params }: { params: Params<{ id: string }> }) {
  await requirePermission(["payments.manage", "finance.view"]);
  const { id } = await params;
  const [history, settings] = await Promise.all([payrollHistory(id), getSettings()]);
  const current = currentCompetence(settings.timezone);
  return (
    <Card title="Histórico por competência" action={<LinkButton href={`/pagamentos/${id}/${current}`} size="sm" variant="secondary">Abrir mês atual</LinkButton>}>
      {history.length === 0 ? <p className="text-sm text-ink-500">Nenhum mês fechado ainda. Abra o mês atual para ver a apuração.</p> : (
        <ul className="divide-y divide-border">
          {history.map((h) => (
            <li key={h.id} className="flex items-center justify-between py-2.5 text-sm">
              <Link prefetch={false} href={`/pagamentos/${id}/${h.competence}`} className="font-medium hover:underline">{competenceLabel(h.competence)}</Link>
              <span className="flex items-center gap-3">
                <span>{formatBRL(h.status === "paid" ? h.paidAmount : h.calculatedAmount)}</span>
                {h.status === "paid" ? <Badge tone="green">Pago</Badge> : <Badge tone="amber">Não pago</Badge>}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
