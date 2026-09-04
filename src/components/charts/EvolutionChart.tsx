/**
 * Gráfico de linhas em SVG puro, renderizado no servidor (zero JavaScript no cliente).
 * Substitui a biblioteca anterior (~350 KB) mantendo a mesma interface de uso.
 */
export const CHART_COLORS = [
  "#1420b4", "#2f8cff", "#0ea5a4", "#6366f1", "#0e1394", "#38bdf8", "#7c3aed", "#159a6b",
  "#4a5ae8", "#0891b2", "#8390f0", "#c9840a", "#5b6280", "#2433d6", "#14b8a6", "#a3a9c2", "#d6383a",
];

type Point = Record<string, string | number | null>;

export function EvolutionChart({ points, series, max, height = 280 }: { points: Point[]; series: { id: string; name: string }[]; max: number; height?: number }) {
  if (points.length === 0) return <p className="text-sm text-ink-500">Sem avaliações para exibir.</p>;
  const W = 640, H = height;
  const pad = { l: 30, r: 16, t: 14, b: 28 };
  const iw = W - pad.l - pad.r, ih = H - pad.t - pad.b;
  const n = points.length;
  const x = (i: number) => pad.l + (n === 1 ? iw / 2 : (i / (n - 1)) * iw);
  const y = (v: number) => pad.t + ih - (v / max) * ih;
  const single = series.length === 1;
  const labels = points.map((p) => String(p.date).split("-").reverse().slice(1).join("/"));
  const ticks = Array.from({ length: max + 1 }, (_, i) => i);
  return (
    <figure className="m-0">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label="Gráfico de evolução">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} stroke="#e2e6f3" strokeDasharray="3 3" />
            <text x={pad.l - 8} y={y(t) + 4} fontSize="11" fill="#5b6280" textAnchor="end">{t}</text>
          </g>
        ))}
        {labels.map((l, i) => (
          <text key={i} x={x(i)} y={H - 8} fontSize="11" fill="#5b6280" textAnchor={n === 1 ? "middle" : i === 0 ? "start" : i === n - 1 ? "end" : "middle"}>{l}</text>
        ))}
        {series.map((s, si) => {
          const color = CHART_COLORS[si % CHART_COLORS.length];
          const pts = points.map((p, i) => (typeof p[s.id] === "number" ? { i, v: p[s.id] as number } : null)).filter((q): q is { i: number; v: number } => !!q);
          const d = pts.map((q, k) => `${k === 0 ? "M" : "L"}${x(q.i).toFixed(1)},${y(q.v).toFixed(1)}`).join(" ");
          return (
            <g key={s.id}>
              {pts.length > 1 && <path d={d} fill="none" stroke={color} strokeWidth={single ? 2.6 : 2} strokeLinejoin="round" strokeLinecap="round" />}
              {pts.map((q) => (
                <g key={q.i}>
                  <circle cx={x(q.i)} cy={y(q.v)} r={single ? 5 : 3.5} fill="#fff" stroke={color} strokeWidth="2" />
                  {single && <text x={x(q.i)} y={y(q.v) - 10} fontSize="11" fontWeight="700" fill={color} textAnchor="middle">{q.v}</text>}
                </g>
              ))}
            </g>
          );
        })}
      </svg>
      {!single && (
        <figcaption className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-ink-700">
          {series.map((s, si) => <span key={s.id} className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{ background: CHART_COLORS[si % CHART_COLORS.length] }} />{s.name}</span>)}
        </figcaption>
      )}
    </figure>
  );
}
