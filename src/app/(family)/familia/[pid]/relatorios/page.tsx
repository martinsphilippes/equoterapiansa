import Link from "next/link";
import { requireGuardianPractitioner } from "@/lib/db/queries/family";
import { reportsOfPractitioner } from "@/lib/db/queries/reports";
import { Card, EmptyState } from "@/components/ui";
import { isoToBR } from "@/lib/domain/dates";

export default async function FamilyReportsPage({ params }: { params: Promise<{ pid: string }> }) {
  const { pid } = await params;
  await requireGuardianPractitioner(pid);
  const reports = await reportsOfPractitioner(pid, true);
  return (
    <Card title="Relatórios de desenvolvimento" className="p-0">
      {reports.length === 0 ? <EmptyState title="Nenhum relatório disponível" description="Os relatórios liberados pela equipe aparecem aqui." /> : (
        <ul className="divide-y divide-border -mt-5">{reports.map((r) => (
          <li key={r.id}><Link href={`/familia/${pid}/relatorios/${r.id}`} className="block px-4 py-3 hover:bg-surface-50"><p className="font-medium">{r.title}</p><p className="text-sm text-ink-500">{isoToBR(r.periodStart)} a {isoToBR(r.periodEnd)} · {r.professionalName}</p></Link></li>
        ))}</ul>
      )}
    </Card>
  );
}
