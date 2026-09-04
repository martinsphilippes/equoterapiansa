import Link from "next/link";
import { requireFinance } from "@/lib/auth/finance-access";
import { Collections, mapDocs } from "@/lib/db/collections";
import { listEntries, listTransactions, summariesFor, monthsBack, bucketTotal, overdueEntries, todayFin } from "@/lib/db/queries/finance";
import { allCategories, allCostCenters } from "@/lib/db/queries/finance-ref";
import { Card, EmptyState, Field, Input, PageHeader, Select, Table, thCls, tdCls } from "@/components/ui";
import { PrintButton } from "@/components/ui/PrintButton";
import { Money } from "@/components/finance/Money";
import { BarRows } from "@/components/finance/MiniCharts";
import { competenceLabel, isoToBR, listDays } from "@/lib/domain/dates";
import { daysLate, displayStatus, STATUS_LABEL } from "@/lib/domain/finance";
import type { SearchParams } from "@/lib/types";
import { sp1 } from "@/lib/types";

export const metadata = { title: "Relatórios financeiros" };

const TYPES: [string, string][] = [
  ["receber", "Contas a receber"], ["pagar", "Contas a pagar"], ["recebimentos", "Recebimentos"], ["pagamentos", "Pagamentos"], ["inadimplencia", "Inadimplência"],
  ["fluxo", "Fluxo de caixa (12 meses)"], ["categorias", "Receitas e despesas por categoria"], ["centros", "Por centro de custo"], ["competencia", "Competência × caixa"],
  ["praticante", "Por praticante"], ["responsavel", "Por responsável"], ["colaboradores", "Custos com colaboradores"],
];

export default async function ReportsPage({ searchParams }: { searchParams: SearchParams }) {
  await requireFinance("finance.dashboard");
  const sp = await searchParams;
  const today = await todayFin();
  const tipo = sp1(sp, "tipo") ?? "receber";
  const month = sp1(sp, "mes") ?? today.slice(0, 7);
  const [cats, ccs] = await Promise.all([allCategories(), allCostCenters()]);
  const fmt = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
  const nameC = (id: string) => cats.find((c) => c.id === id)?.name ?? "Sem categoria";
  const nameCC = (id: string) => ccs.find((c) => c.id === id)?.name ?? "Sem centro";

  let body: React.ReactNode = null;
  if (tipo === "receber" || tipo === "pagar") {
    const kind = tipo === "receber" ? "receivable" : "payable";
    const list = await listEntries({ kind, month, status: "all" });
    body = <EntriesTable list={list} today={today} kind={kind} />;
  } else if (tipo === "recebimentos" || tipo === "pagamentos") {
    const txs = (await listTransactions(month)).filter((t) => !t.reversed && t.type === (tipo === "recebimentos" ? "in" : "out"));
    body = txs.length === 0 ? <EmptyState title="Sem movimentações" /> : (
      <Table><thead><tr><th className={thCls}>Data</th><th className={thCls}>Descrição</th><th className={thCls}>Conta</th><th className={thCls}>Categoria</th><th className={`${thCls} text-right`}>Valor</th></tr></thead>
        <tbody>{txs.map((t) => <tr key={t.id}><td className={tdCls}>{isoToBR(t.date)}</td><td className={tdCls}>{t.description}</td><td className={tdCls}>{t.accountName}</td><td className={tdCls}>{t.categoryName ?? "—"}</td><td className={`${tdCls} text-right`}><Money value={t.amount} /></td></tr>)}
          <tr className="bg-surface-50 font-bold"><td className={tdCls} colSpan={4}>Total</td><td className={`${tdCls} text-right`}><Money value={txs.reduce((a, t) => a + t.amount, 0)} /></td></tr></tbody></Table>
    );
  } else if (tipo === "inadimplencia") {
    const list = await overdueEntries("receivable");
    body = list.length === 0 ? <EmptyState title="Sem cobranças vencidas" /> : (
      <Table><thead><tr><th className={thCls}>Responsável</th><th className={thCls}>Praticante</th><th className={thCls}>Vencimento</th><th className={thCls}>Dias</th><th className={`${thCls} text-right`}>Original</th><th className={`${thCls} text-right`}>Em aberto</th></tr></thead>
        <tbody>{list.map((e) => <tr key={e.id}><td className={tdCls}>{e.guardianName ?? "—"}</td><td className={tdCls}>{e.practitionerName ?? "—"}</td><td className={tdCls}>{isoToBR(e.dueDate)}</td><td className={tdCls}>{daysLate(e.dueDate, today)}</td><td className={`${tdCls} text-right`}>{fmt(e.netAmount)}</td><td className={`${tdCls} text-right font-semibold`}>{fmt(e.openAmount)}</td></tr>)}</tbody></Table>
    );
  } else if (tipo === "fluxo" || tipo === "competencia") {
    const months = monthsBack(month, 12);
    const sums = await summariesFor(months);
    const rowsFlow = months.map((m) => { const s = sums[m]; const ci = bucketTotal(s, "cash.in"), co = bucketTotal(s, "cash.out"); return { m, s, ci, co }; });
    const accOf = rowsFlow.reduce<number[]>((arr, r) => [...arr, (arr[arr.length - 1] ?? 0) + r.ci - r.co], []);
    body = (
      <Table><thead><tr><th className={thCls}>Mês</th>{tipo === "fluxo" ? <><th className={`${thCls} text-right`}>Entradas</th><th className={`${thCls} text-right`}>Saídas</th><th className={`${thCls} text-right`}>Resultado</th><th className={`${thCls} text-right`}>Acumulado</th></> : <><th className={`${thCls} text-right`}>Receita (competência)</th><th className={`${thCls} text-right`}>Recebido dela</th><th className={`${thCls} text-right`}>Despesa (competência)</th><th className={`${thCls} text-right`}>Pago dela</th><th className={`${thCls} text-right`}>Caixa do mês</th></>}</tr></thead>
        <tbody>{rowsFlow.map(({ m, s, ci, co }, i) => { const acc = accOf[i]; return (
          <tr key={m}><td className={tdCls}>{competenceLabel(m)}</td>
            {tipo === "fluxo" ? <><td className={`${tdCls} text-right`}>{fmt(ci)}</td><td className={`${tdCls} text-right`}>{fmt(co)}</td><td className={`${tdCls} text-right`}><Money value={ci - co} tone="auto" /></td><td className={`${tdCls} text-right`}><Money value={acc} tone="auto" /></td></>
            : <><td className={`${tdCls} text-right`}>{fmt(bucketTotal(s, "expected.income"))}</td><td className={`${tdCls} text-right`}>{fmt(bucketTotal(s, "received.income"))}</td><td className={`${tdCls} text-right`}>{fmt(bucketTotal(s, "expected.expense"))}</td><td className={`${tdCls} text-right`}>{fmt(bucketTotal(s, "received.expense"))}</td><td className={`${tdCls} text-right`}><Money value={ci - co} tone="auto" /></td></>}
          </tr>); })}</tbody></Table>
    );
  } else if (tipo === "categorias" || tipo === "centros") {
    const s = (await summariesFor([month]))[month];
    const rows = (m?: Record<string, number>, n?: (id: string) => string) => Object.entries(m ?? {}).map(([id, v]) => ({ label: n!(id), value: v })).filter((r) => r.value > 0).sort((a, b) => b.value - a.value);
    const n = tipo === "categorias" ? nameC : nameCC;
    const key = tipo === "categorias" ? "byCategory" : "byCostCenter";
    body = (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div><h3 className="font-bold mb-2">Receitas (competência)</h3><BarRows rows={rows(s?.expected?.income?.[key], n)} color="#1420b4" /></div>
        <div><h3 className="font-bold mb-2">Despesas (competência)</h3><BarRows rows={rows(s?.expected?.expense?.[key], n)} color="#d6383a" /></div>
        <div><h3 className="font-bold mb-2">Entradas (caixa)</h3><BarRows rows={rows(s?.cash?.in?.[key], n)} color="#159a6b" /></div>
        <div><h3 className="font-bold mb-2">Saídas (caixa)</h3><BarRows rows={rows(s?.cash?.out?.[key], n)} color="#c9840a" /></div>
      </div>
    );
  } else if (tipo === "praticante" || tipo === "responsavel" || tipo === "colaboradores") {
    const kind = tipo === "colaboradores" ? "payable" : "receivable";
    const list = (await listEntries({ kind, month, status: "all" })).filter((e) => tipo === "colaboradores" ? !!e.collaboratorId : true);
    const keyOf = (e: typeof list[number]) => tipo === "praticante" ? e.practitionerName ?? "Sem praticante" : tipo === "responsavel" ? e.guardianName ?? "Sem responsável" : e.collaboratorName ?? "";
    const groups = new Map<string, { total: number; paid: number; open: number; n: number }>();
    for (const e of list) { if (e.status === "cancelled") continue; const g = groups.get(keyOf(e)) ?? { total: 0, paid: 0, open: 0, n: 0 }; g.total += e.netAmount; g.paid += e.paidAmount; g.open += e.openAmount; g.n++; groups.set(keyOf(e), g); }
    const rows = Array.from(groups.entries()).sort((a, b) => b[1].total - a[1].total);
    body = rows.length === 0 ? <EmptyState title="Sem lançamentos no mês" /> : (
      <Table><thead><tr><th className={thCls}>{tipo === "praticante" ? "Praticante" : tipo === "responsavel" ? "Responsável" : "Colaborador"}</th><th className={thCls}>Lançamentos</th><th className={`${thCls} text-right`}>Total</th><th className={`${thCls} text-right`}>Liquidado</th><th className={`${thCls} text-right`}>Em aberto</th></tr></thead>
        <tbody>{rows.map(([k, g]) => <tr key={k}><td className={tdCls}>{k}</td><td className={tdCls}>{g.n}</td><td className={`${tdCls} text-right`}>{fmt(g.total)}</td><td className={`${tdCls} text-right`}>{fmt(g.paid)}</td><td className={`${tdCls} text-right`}>{fmt(g.open)}</td></tr>)}</tbody></Table>
    );
  }
  void listDays; void mapDocs; void Collections;
  return (
    <div className="space-y-4">
      <PageHeader title="Relatórios" subtitle={TYPES.find((t) => t[0] === tipo)?.[1]} actions={<PrintButton />} />
      <form className="flex flex-wrap items-end gap-2 no-print">
        <Field label="Relatório"><Select name="tipo" defaultValue={tipo} className="h-10">{TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Select></Field>
        <Field label="Mês"><Input type="month" name="mes" defaultValue={month} className="h-10" /></Field>
        <button className="h-10 px-4 rounded-xl bg-primary text-white text-sm font-semibold">Gerar</button>
      </form>
      <Card title={`${TYPES.find((t) => t[0] === tipo)?.[1]} · ${competenceLabel(month)}`}>{body}</Card>
      <p className="text-xs text-ink-500 no-print">Use “Imprimir / salvar PDF” para exportar. Outros relatórios: <Link prefetch={false} href="/financeiro/dre" className="text-primary-600 hover:underline">DRE</Link> · <Link prefetch={false} href="/financeiro/inadimplencia" className="text-primary-600 hover:underline">Inadimplência</Link>.</p>
    </div>
  );
}

function EntriesTable({ list, today, kind }: { list: import("@/lib/db/finance-types").FinancialEntry[]; today: string; kind: "receivable" | "payable" }) {
  if (list.length === 0) return <EmptyState title="Sem lançamentos no mês" />;
  const fmt = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
  const live = list.filter((e) => e.status !== "cancelled");
  return (
    <Table><thead><tr><th className={thCls}>Venc.</th><th className={thCls}>Descrição</th><th className={thCls}>{kind === "receivable" ? "Responsável" : "Favorecido"}</th><th className={thCls}>Categoria</th><th className={thCls}>Status</th><th className={`${thCls} text-right`}>Valor</th><th className={`${thCls} text-right`}>Em aberto</th></tr></thead>
      <tbody>{list.map((e) => <tr key={e.id} className={e.status === "cancelled" ? "opacity-50" : ""}><td className={tdCls}>{isoToBR(e.dueDate)}</td><td className={tdCls}>{e.description}</td><td className={tdCls}>{e.guardianName ?? e.supplierName ?? e.collaboratorName ?? "—"}</td><td className={tdCls}>{e.categoryName}</td><td className={tdCls}>{STATUS_LABEL[displayStatus(e, today)]}</td><td className={`${tdCls} text-right`}>{fmt(e.netAmount)}</td><td className={`${tdCls} text-right`}>{fmt(e.status === "cancelled" ? 0 : e.openAmount)}</td></tr>)}
        <tr className="bg-surface-50 font-bold"><td className={tdCls} colSpan={5}>Total (sem cancelados)</td><td className={`${tdCls} text-right`}>{fmt(live.reduce((a, e) => a + e.netAmount, 0))}</td><td className={`${tdCls} text-right`}>{fmt(live.reduce((a, e) => a + e.openAmount, 0))}</td></tr></tbody></Table>
  );
}
