import { Table, thCls, tdCls } from "@/components/ui";
import type { ComparisonRow } from "@/lib/domain/assessments";

export function Delta({ v }: { v: number | null }) {
  if (v === null) return <span className="text-ink-300">—</span>;
  const cls = v > 0 ? "text-brand-700" : v < 0 ? "text-red-700" : "text-ink-500";
  return <span className={`font-semibold ${cls}`}>{v > 0 ? "+" : ""}{v}</span>;
}

export function ComparisonTable({ rows, overall, max, labels }: { rows: ComparisonRow[]; overall: { initial: number | null; current: number | null; delta: number | null; percentChange: number | null }; max: number; labels?: { initial: string; current: string } }) {
  return (
    <Table>
      <thead><tr><th className={thCls}>Área</th><th className={thCls}>{labels?.initial ?? "Inicial"}</th><th className={thCls}>{labels?.current ?? "Atual"}</th><th className={thCls}>Evolução</th></tr></thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.categoryId}>
            <td className={tdCls}>{r.category}</td>
            <td className={tdCls}>{r.initial ?? "—"}</td>
            <td className={tdCls}>{r.current ?? "—"}</td>
            <td className={tdCls}><Delta v={r.delta} /></td>
          </tr>
        ))}
        <tr className="bg-sand-50">
          <td className={`${tdCls} font-semibold`}>Média geral (de {max})</td>
          <td className={`${tdCls} font-semibold`}>{overall.initial ?? "—"}</td>
          <td className={`${tdCls} font-semibold`}>{overall.current ?? "—"}</td>
          <td className={`${tdCls}`}><Delta v={overall.delta} />{overall.percentChange !== null && <span className="text-xs text-ink-500 ml-1">({overall.percentChange > 0 ? "+" : ""}{overall.percentChange}%)</span>}</td>
        </tr>
      </tbody>
    </Table>
  );
}
