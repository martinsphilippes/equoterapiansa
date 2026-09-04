import Link from "next/link";
import { requireFinance } from "@/lib/auth/finance-access";
import { hasPermission, hasAny } from "@/lib/auth/session";
import { accountBalances, listTransactions, todayFin } from "@/lib/db/queries/finance";
import { financeRefData } from "@/lib/db/queries/finance-ref";
import { Card, EmptyState, PageHeader, Stat } from "@/components/ui";
import { MonthNav } from "@/components/time/MonthNav";
import { TransactionRow } from "@/components/finance/TransactionRow";
import { TransferForm } from "@/components/finance/TransferForm";
import { Money } from "@/components/finance/Money";
import { competenceLabel } from "@/lib/domain/dates";
import type { SearchParams } from "@/lib/types";
import { sp1 } from "@/lib/types";

export const metadata = { title: "Movimentações" };

export default async function TransactionsPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireFinance(["finance.reconcile", "finance.dashboard"]);
  const sp = await searchParams;
  const today = await todayFin();
  const month = sp1(sp, "mes") ?? today.slice(0, 7);
  const accountId = sp1(sp, "conta");
  const onlyPending = sp1(sp, "pendentes") === "1";
  const [txs, ref, balances] = await Promise.all([listTransactions(month, accountId), financeRefData(), accountBalances()]);
  const list = onlyPending ? txs.filter((t) => !t.reconciled && !t.reversed) : txs;
  const live = txs.filter((t) => !t.reversed);
  const inSum = live.filter((t) => t.type === "in").reduce((a, t) => a + t.amount, 0);
  const outSum = live.filter((t) => t.type === "out").reduce((a, t) => a + t.amount, 0);
  const canReconcile = hasPermission(user, "finance.reconcile");
  const canReverse = hasAny(user, ["finance.receivables.settle", "finance.payables.settle", "finance.reconcile"]);
  const qs = (extra: Record<string, string>) => "/financeiro/movimentacoes?" + new URLSearchParams({ mes: month, ...(accountId ? { conta: accountId } : {}), ...(onlyPending ? { pendentes: "1" } : {}), ...extra }).toString();
  return (
    <div className="space-y-4">
      <PageHeader title="Movimentações" subtitle={`Fluxo de caixa de ${competenceLabel(month)}`} />
      <MonthNav competence={month} basePath={qs({})} />
      <div className="grid grid-cols-3 gap-3">
        <Stat label="Entradas" value={<Money value={inSum} />} tone="green" />
        <Stat label="Saídas" value={<Money value={outSum} />} tone="red" />
        <Stat label="Resultado" value={<Money value={inSum - outSum} tone="auto" />} />
      </div>
      <div className="flex flex-wrap gap-2 no-print">
        <Link prefetch={false} href={qs({ conta: "" }).replace("conta=&", "").replace(/&conta=$/, "") as never} className={`px-3 py-1.5 rounded-full text-sm font-semibold ${!accountId ? "bg-primary text-white" : "bg-surface border border-border"}`}>Todas as contas</Link>
        {balances.map((b) => <Link prefetch={false} key={b.account.id} href={qs({ conta: b.account.id }) as never} className={`px-3 py-1.5 rounded-full text-sm font-semibold ${accountId === b.account.id ? "bg-primary text-white" : "bg-surface border border-border"}`}>{b.account.name} · <Money value={b.balance} /></Link>)}
        <Link prefetch={false} href={(onlyPending ? qs({}).replace("&pendentes=1", "").replace("pendentes=1", "") : qs({ pendentes: "1" })) as never} className={`ml-auto px-3 py-1.5 rounded-full text-sm font-semibold ${onlyPending ? "bg-warning text-white" : "bg-surface border border-border"}`}>Só não conferidas</Link>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Card className="lg:col-span-2 p-0" title={`${list.length} movimentação(ões)`}>
          {list.length === 0 ? <EmptyState title="Nenhuma movimentação" /> : <ul className="divide-y divide-border -mt-5">{list.map((t) => <TransactionRow key={t.id} t={t} accounts={ref.accounts.map((a) => ({ id: a.id, name: a.name }))} canReconcile={canReconcile} canReverse={canReverse} />)}</ul>}
        </Card>
        <div className="space-y-5">
          {canReconcile && ref.accounts.length >= 2 && <Card title="Transferir entre contas"><div id="transferir" /><TransferForm accounts={ref.accounts.map((a) => ({ id: a.id, name: a.name }))} today={today} /></Card>}
          <Card title="Conciliação"><p className="text-sm text-ink-700">Confira cada movimentação com o extrato bancário e marque como conferida. Correções de data e conta ficam registradas na auditoria. Importação de OFX/CSV fica preparada para uma próxima etapa.</p></Card>
        </div>
      </div>
    </div>
  );
}
