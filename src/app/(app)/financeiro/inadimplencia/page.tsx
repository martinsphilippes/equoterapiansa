import Link from "next/link";
import { requireFinance } from "@/lib/auth/finance-access";
import { overdueEntries, openTotals, todayFin } from "@/lib/db/queries/finance";
import { Card, EmptyState, PageHeader, Stat, Table, thCls, tdCls } from "@/components/ui";
import { Money } from "@/components/finance/Money";
import { PrintButton } from "@/components/ui/PrintButton";
import { daysLate } from "@/lib/domain/finance";
import { isoToBR } from "@/lib/domain/dates";

export const metadata = { title: "Inadimplência" };

export default async function DelinquencyPage() {
  await requireFinance(["finance.dashboard", "finance.receivables.view"]);
  const [today, list, totals] = await Promise.all([todayFin(), overdueEntries("receivable"), openTotals()]);
  const byGuardian = new Map<string, { name: string; practitioners: Set<string>; total: number; count: number; oldest: string }>();
  for (const e of list) {
    const k = e.guardianId ?? e.practitionerId ?? e.id;
    const g = byGuardian.get(k) ?? { name: e.guardianName ?? e.practitionerName ?? e.description, practitioners: new Set<string>(), total: 0, count: 0, oldest: e.dueDate };
    if (e.practitionerName) g.practitioners.add(e.practitionerName);
    g.total += e.openAmount; g.count++; if (e.dueDate < g.oldest) g.oldest = e.dueDate;
    byGuardian.set(k, g);
  }
  const groups = Array.from(byGuardian.entries()).sort((a, b) => b[1].total - a[1].total);
  const pct = totals.receivable.open > 0 ? Math.round((totals.receivable.overdue / totals.receivable.open) * 100) : 0;
  return (
    <div className="space-y-4">
      <PageHeader title="Inadimplência" subtitle="Cobranças vencidas em aberto, por responsável" actions={<PrintButton />} />
      <div className="grid grid-cols-3 gap-3">
        <Stat label="Total vencido" value={<Money value={totals.receivable.overdue} />} tone={totals.receivable.overdue ? "red" : "green"} hint={`${totals.receivable.overdueCount} cobrança(s)`} />
        <Stat label="Responsáveis inadimplentes" value={groups.length} />
        <Stat label="% do total a receber" value={`${pct}%`} hint={`em aberto: ${new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(totals.receivable.open)}`} />
      </div>
      <Card>
        {groups.length === 0 ? <EmptyState title="Nenhuma cobrança vencida" description="Tudo em dia." /> : (
          <Table>
            <thead><tr><th className={thCls}>Responsável</th><th className={thCls}>Praticante(s)</th><th className={thCls}>Parcelas</th><th className={thCls}>Mais antiga</th><th className={thCls}>Dias</th><th className={thCls}>Em aberto</th></tr></thead>
            <tbody>
              {groups.map(([k, g]) => (
                <tr key={k}>
                  <td className={tdCls}><Link prefetch={false} href={`/responsaveis/${k}`} className="font-semibold text-primary-700 hover:underline">{g.name}</Link></td>
                  <td className={tdCls}>{Array.from(g.practitioners).join(", ") || "—"}</td>
                  <td className={tdCls}>{g.count}</td>
                  <td className={tdCls}>{isoToBR(g.oldest)}</td>
                  <td className={`${tdCls} text-danger font-semibold`}>{daysLate(g.oldest, today)}</td>
                  <td className={tdCls}><Money value={g.total} className="font-bold" /></td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
      <Card title="Detalhe por cobrança" className="p-0">
        {list.length === 0 ? <EmptyState title="Sem cobranças vencidas" /> : (
          <ul className="divide-y divide-border -mt-5">{list.map((e) => (
            <li key={e.id} className="px-4 py-2.5 flex items-center justify-between gap-2 text-sm">
              <div className="min-w-0"><Link prefetch={false} href={`/financeiro/receber/${e.id}`} className="font-semibold hover:underline">{e.description}</Link><p className="text-xs text-ink-500">{e.guardianName ?? "—"} · venc. {isoToBR(e.dueDate)} · {daysLate(e.dueDate, today)} dias · original {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(e.netAmount)}</p></div>
              <Money value={e.openAmount} className="font-bold text-danger" />
            </li>
          ))}</ul>
        )}
      </Card>
    </div>
  );
}
