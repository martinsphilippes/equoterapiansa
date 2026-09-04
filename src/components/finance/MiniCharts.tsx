import { competenceLabel } from "@/lib/domain/dates";
import { formatBRL } from "@/lib/domain/format";

/** Barras horizontais leves (sem biblioteca). */
export function BarRows({ rows, color }: { rows: { label: string; value: number }[]; color: string }) {
  if (rows.length === 0) return <p className="text-sm text-ink-500">Sem valores no período.</p>;
  const max = Math.max(...rows.map((r) => r.value));
  return (
    <ul className="space-y-2">
      {rows.map((r) => (
        <li key={r.label}>
          <div className="flex justify-between text-sm"><span className="truncate">{r.label}</span><span className="tnum font-semibold ml-2">{formatBRL(r.value)}</span></div>
          <div className="h-2 rounded-full bg-surface-100 mt-1"><div className="h-2 rounded-full" style={{ width: `${Math.max(2, (r.value / max) * 100)}%`, background: color }} /></div>
        </li>
      ))}
    </ul>
  );
}

/** Barras agrupadas por mês em SVG. */
export function MonthBars({ months, series }: { months: string[]; series: { name: string; color: string; values: number[] }[] }) {
  const W = 640, H = 220, padL = 8, padB = 26, padT = 10;
  const max = Math.max(1, ...series.flatMap((s) => s.values));
  const groupW = (W - padL * 2) / months.length;
  const barW = (groupW * 0.7) / series.length;
  return (
    <figure className="m-0">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label="Evolução mensal">
        {[0.25, 0.5, 0.75, 1].map((f) => <line key={f} x1={padL} x2={W - padL} y1={padT + (H - padT - padB) * (1 - f)} y2={padT + (H - padT - padB) * (1 - f)} stroke="#e2e6f3" strokeDasharray="3 3" />)}
        {months.map((m, i) => (
          <g key={m}>
            {series.map((s, k) => {
              const v = s.values[i] ?? 0; const h = ((H - padT - padB) * v) / max;
              const x = padL + i * groupW + groupW * 0.15 + k * barW;
              return <rect key={s.name} x={x} y={H - padB - h} width={barW - 2} height={h} rx="3" fill={s.color}><title>{`${s.name} ${competenceLabel(m)}: ${formatBRL(v)}`}</title></rect>;
            })}
            <text x={padL + i * groupW + groupW / 2} y={H - 8} fontSize="11" fill="#5b6280" textAnchor="middle">{m.slice(5, 7)}/{m.slice(2, 4)}</text>
          </g>
        ))}
      </svg>
      <figcaption className="mt-1 flex flex-wrap gap-3 text-[11px] text-ink-700">{series.map((s) => <span key={s.name} className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{ background: s.color }} />{s.name}</span>)}</figcaption>
    </figure>
  );
}
