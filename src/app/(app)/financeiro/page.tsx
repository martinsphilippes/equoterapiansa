import Link from "next/link";
import { ArrowDownLeft, ArrowUpRight, ArrowLeftRight, AlertTriangle } from "lucide-react";
import { requireFinance } from "@/lib/auth/finance-access";
import { hasAny, hasPermission } from "@/lib/auth/session";
import { accountBalances, openTotals, summariesFor, monthsBack, bucketTotal, upcomingEntries, todayFin } from "@/lib/db/queries/finance";
import { allCategories, allCostCenters } from "@/lib/db/queries/finance-ref";
import { Card, LinkButton, PageHeader, SectionTitle, Stat, EmptyState } from "@/components/ui";
import { MonthNav } from "@/components/time/MonthNav";
import { Money } from "@/components/finance/Money";
import { EntryList } from "@/components/finance/EntryList";
import { BarRows, MonthBars } from "@/components/finance/MiniCharts";
import { competenceLabel } from "@/lib/domain/dates";
import type { SearchParams } from "@/lib/types";
import { sp1 } from "@/lib/types";

export const metadata = { title: "Financeiro" };

export default async function FinanceDashboard({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireFinance("finance.dashboard");
  const sp = await searchParams;
  const today = await todayFin();
  const month = sp1(sp, "mes") ?? today.slice(0, 7);
  const months = monthsBack(month, 6);
  const [sums, totals, balances, upRec, upPay, cats, ccs] = await Promise.all([summariesFor(months), openTotals(), accountBalances(), upcomingEntries("receivable"), upcomingEntries("payable"), allCategories(), allCostCenters()]);
  const s = sums[month];
  const expIn = bucketTotal(s, "expected.income"), expOut = bucketTotal(s, "expected.expense");
  const recIn = bucketTotal(s, "received.income"), recOut = bucketTotal(s, "received.expense");
  const cashIn = bucketTotal(s, "cash.in"), cashOut = bucketTotal(s, "cash.out");
  const balance = balances.reduce((a, b) => a + b.balance, 0);
  const catName = (id: string) => cats.find((c) => c.id === id)?.name ?? "Sem categoria";
  const ccName = (id: string) => ccs.find((c) => c.id === id)?.name ?? "Sem centro";
  const rows = (m: Record<string, number> | undefined, nameOf: (id: string) => string) => Object.entries(m ?? {}).map(([id, v]) => ({ label: nameOf(id), value: v })).filter((r) => r.value > 0).sort((a, b) => b.value - a.value).slice(0, 8);
  const inadimplencia = totals.receivable.open > 0 ? Math.round((totals.receivable.overdue / totals.receivable.open) * 100) : 0;
  const canRec = hasAny(user, ["finance.receivables.manage"]), canPay = hasAny(user, ["finance.payables.manage"]);

  return (
    <div className="space-y-6">
      <PageHeader title="Financeiro" subtitle={`Competência ${competenceLabel(month)} · caixa do mês e posição em aberto`} actions={<>
        {canRec && <LinkButton href="/financeiro/receber/novo" size="sm"><ArrowDownLeft className="h-4 w-4" /> Receita</LinkButton>}
        {canPay && <LinkButton href="/financeiro/pagar/novo" size="sm" variant="outline"><ArrowUpRight className="h-4 w-4" /> Despesa</LinkButton>}
        {hasPermission(user, "finance.reconcile") && <LinkButton href="/financeiro/movimentacoes#transferir" size="sm" variant="ghost"><ArrowLeftRight className="h-4 w-4" /> Transferir</LinkButton>}
      </>} />
      <MonthNav competence={month} basePath="/financeiro" />

      <section>
        <SectionTitle>Posição em aberto</SectionTitle>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Link prefetch={false} href="/financeiro/receber?status=open"><Stat label="A receber" value={<Money value={totals.receivable.open} />} hint={`${totals.receivable.openCount} lançamento(s)`} tone="primary" /></Link>
          <Link prefetch={false} href="/financeiro/inadimplencia"><Stat label="Vencidos a receber" value={<Money value={totals.receivable.overdue} />} hint={`${totals.receivable.overdueCount} · inadimplência ${inadimplencia}%`} tone={totals.receivable.overdue > 0 ? "red" : "green"} icon={<AlertTriangle className="h-4 w-4" />} /></Link>
          <Link prefetch={false} href="/financeiro/pagar?status=open"><Stat label="A pagar" value={<Money value={totals.payable.open} />} hint={`${totals.payable.openCount} lançamento(s)`} /></Link>
          <Link prefetch={false} href="/financeiro/pagar?status=overdue"><Stat label="Vencidos a pagar" value={<Money value={totals.payable.overdue} />} hint={`${totals.payable.overdueCount} lançamento(s)`} tone={totals.payable.overdue > 0 ? "amber" : "green"} /></Link>
        </div>
      </section>

      <section>
        <SectionTitle>{competenceLabel(month)}</SectionTitle>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Stat label="Entrou (caixa)" value={<Money value={cashIn} />} tone="green" hint={`previsto na competência: ${fmt(expIn)}`} />
          <Stat label="Saiu (caixa)" value={<Money value={cashOut} />} tone="red" hint={`previsto na competência: ${fmt(expOut)}`} />
          <Stat label="Resultado de caixa" value={<Money value={cashIn - cashOut} tone="auto" />} hint="entradas − saídas no mês" />
          <Stat label="Resultado por competência" value={<Money value={expIn - expOut} tone="auto" />} hint={`liquidado: ${fmt(recIn)} − ${fmt(recOut)}`} />
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Card title="Saldo das contas" className="lg:col-span-1">
          <ul className="divide-y divide-border text-sm">
            {balances.map((b) => <li key={b.account.id} className="flex justify-between py-2"><span>{b.account.name}</span><Money value={b.balance} tone="auto" className="font-semibold" /></li>)}
            <li className="flex justify-between py-2 font-bold"><span>Saldo total</span><Money value={balance} tone="auto" /></li>
          </ul>
          {balances.length === 0 && <p className="text-sm text-ink-500">Cadastre uma conta financeira.</p>}
        </Card>
        <Card title="Evolução (6 meses)" className="lg:col-span-2">
          <MonthBars months={months} series={[
            { name: "Entradas", color: "#159a6b", values: months.map((m) => bucketTotal(sums[m], "cash.in")) },
            { name: "Saídas", color: "#d6383a", values: months.map((m) => bucketTotal(sums[m], "cash.out")) },
            { name: "Previsto receita", color: "#8390f0", values: months.map((m) => bucketTotal(sums[m], "expected.income")) },
          ]} />
        </Card>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <Card title="Receita por categoria (competência)"><BarRows rows={rows(s?.expected?.income?.byCategory, catName)} color="#1420b4" /></Card>
        <Card title="Despesa por categoria (competência)"><BarRows rows={rows(s?.expected?.expense?.byCategory, catName)} color="#d6383a" /></Card>
        <Card title="Receita por centro de custo"><BarRows rows={rows(s?.expected?.income?.byCostCenter, ccName)} color="#2f8cff" /></Card>
        <Card title="Despesa por centro de custo"><BarRows rows={rows(s?.expected?.expense?.byCostCenter, ccName)} color="#c9840a" /></Card>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <Card title="Vencem nos próximos 7 dias · a receber" className="p-0">{upRec.length ? <div className="-mt-5"><EntryList entries={upRec} today={today} basePath="/financeiro/receber" /></div> : <EmptyState title="Nada a receber nos próximos dias" />}</Card>
        <Card title="Vencem nos próximos 7 dias · a pagar" className="p-0">{upPay.length ? <div className="-mt-5"><EntryList entries={upPay} today={today} basePath="/financeiro/pagar" /></div> : <EmptyState title="Nada a pagar nos próximos dias" />}</Card>
      </section>
    </div>
  );
}

function fmt(v: number) { return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v); }
