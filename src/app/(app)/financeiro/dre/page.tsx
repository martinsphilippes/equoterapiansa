import { requireFinance } from "@/lib/auth/finance-access";
import { summariesFor, todayFin } from "@/lib/db/queries/finance";
import { allCategories } from "@/lib/db/queries/finance-ref";
import { Card, PageHeader, Table, thCls, tdCls } from "@/components/ui";
import { MonthNav } from "@/components/time/MonthNav";
import { PrintButton } from "@/components/ui/PrintButton";
import { Money } from "@/components/finance/Money";
import { competenceLabel } from "@/lib/domain/dates";
import type { DreGroup, FinancialSummary } from "@/lib/db/finance-types";
import type { SearchParams } from "@/lib/types";
import { sp1 } from "@/lib/types";
import Link from "next/link";

export const metadata = { title: "DRE gerencial" };

export default async function DrePage({ searchParams }: { searchParams: SearchParams }) {
  await requireFinance("finance.dashboard");
  const sp = await searchParams;
  const today = await todayFin();
  const month = sp1(sp, "mes") ?? today.slice(0, 7);
  const regime = sp1(sp, "regime") === "caixa" ? "caixa" : "competencia";
  const [sums, cats] = await Promise.all([summariesFor([month]), allCategories()]);
  const s = sums[month];
  const groupOf = new Map(cats.map((c) => [c.id, (c.dreGroup ?? (c.type === "income" ? "revenue" : "operating")) as DreGroup]));
  const nameOf = new Map(cats.map((c) => [c.id, c.name]));
  const pickIncome = (x: FinancialSummary | undefined) => regime === "caixa" ? x?.cash?.in?.byCategory : x?.expected?.income?.byCategory;
  const pickExpense = (x: FinancialSummary | undefined) => regime === "caixa" ? x?.cash?.out?.byCategory : x?.expected?.expense?.byCategory;
  const income = Object.entries(pickIncome(s) ?? {}), expense = Object.entries(pickExpense(s) ?? {});
  const sum = (list: [string, number][], g: DreGroup) => list.filter(([id]) => groupOf.get(id) === g).reduce((a, [, v]) => a + v, 0);
  const lines = (list: [string, number][], g: DreGroup) => list.filter(([id, v]) => groupOf.get(id) === g && v).sort((a, b) => b[1] - a[1]);
  const gross = income.reduce((a, [, v]) => a + v, 0);
  const deductions = regime === "caixa" ? 0 : Number(s?.expected?.income?.discounts ?? 0) + sum(income, "deductions");
  const net = gross - deductions;
  const costs = sum(expense, "costs"), operating = sum(expense, "operating"), other = sum(expense, "other") + sum(expense, "revenue") + sum(expense, "deductions");
  const result = net - costs - operating - other;
  return (
    <div className="space-y-4">
      <PageHeader title="DRE gerencial" subtitle={`${competenceLabel(month)} · regime de ${regime === "caixa" ? "caixa (movimentações)" : "competência (lançamentos)"}`} actions={<><Link prefetch={false} href={`/financeiro/dre?mes=${month}&regime=${regime === "caixa" ? "competencia" : "caixa"}`} className="inline-flex items-center h-9 px-3 rounded-xl border border-border bg-surface text-sm font-semibold">Ver por {regime === "caixa" ? "competência" : "caixa"}</Link><PrintButton /></>} />
      <MonthNav competence={month} basePath={`/financeiro/dre?regime=${regime}`} />
      <Card>
        <Table>
          <thead><tr><th className={thCls}>Linha</th><th className={`${thCls} text-right`}>Valor</th></tr></thead>
          <tbody>
            <Row label="Receita bruta" value={gross} bold tone="in" />
            {lines(income, "revenue").map(([id, v]) => <Row key={id} label={nameOf.get(id) ?? id} value={v} indent />)}
            <Row label="(−) Descontos, bolsas e cancelamentos" value={-deductions} />
            <Row label="= Receita líquida" value={net} bold />
            <Row label="(−) Custos" value={-costs} />
            {lines(expense, "costs").map(([id, v]) => <Row key={id} label={nameOf.get(id) ?? id} value={-v} indent />)}
            <Row label="(−) Despesas operacionais" value={-operating} />
            {lines(expense, "operating").map(([id, v]) => <Row key={id} label={nameOf.get(id) ?? id} value={-v} indent />)}
            {other > 0 && <Row label="(−) Outras despesas" value={-other} />}
            <Row label="= Resultado operacional" value={result} bold tone="auto" />
          </tbody>
        </Table>
        <p className="text-xs text-ink-500 mt-3">Cada categoria é mapeada a um grupo da DRE em Configurações → Categorias. Visão gerencial, não contábil.</p>
      </Card>
    </div>
  );
}

function Row({ label, value, bold, indent, tone }: { label: string; value: number; bold?: boolean; indent?: boolean; tone?: "in" | "out" | "auto" }) {
  return <tr className={bold ? "bg-surface-50" : ""}><td className={`${tdCls} ${bold ? "font-bold" : ""} ${indent ? "pl-6 text-ink-700" : ""}`}>{label}</td><td className={`${tdCls} text-right ${bold ? "font-bold" : ""}`}><Money value={value} tone={tone} /></td></tr>;
}
