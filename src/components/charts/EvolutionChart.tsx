"use client";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";

/** Paleta secundária derivada do azul institucional (tons frios harmonizados + poucos acentos). */
export const CHART_COLORS = [
  "#1420b4", "#2f8cff", "#0ea5a4", "#6366f1", "#0e1394", "#38bdf8", "#7c3aed", "#159a6b",
  "#4a5ae8", "#0891b2", "#8390f0", "#c9840a", "#5b6280", "#2433d6", "#14b8a6", "#a3a9c2", "#d6383a",
];

export function EvolutionChart({ points, series, max, height = 280 }: { points: Record<string, string | number | null>[]; series: { id: string; name: string }[]; max: number; height?: number }) {
  if (points.length === 0) return <p className="text-sm text-ink-500">Sem avaliações para exibir.</p>;
  const data = points.map((p) => ({ ...p, label: String(p.date).split("-").reverse().slice(1).join("/") }));
  const single = series.length === 1;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 12, left: -18, bottom: 0 }}>
        <CartesianGrid stroke="#e2e6f3" strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 12, fill: "#5b6280" }} axisLine={{ stroke: "#e2e6f3" }} tickLine={false} />
        <YAxis domain={[0, max]} ticks={Array.from({ length: max + 1 }, (_, i) => i)} tick={{ fontSize: 12, fill: "#5b6280" }} axisLine={false} tickLine={false} />
        <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e2e6f3", fontSize: 12, boxShadow: "0 10px 30px -18px rgba(20,32,180,.3)" }} />
        {!single && <Legend wrapperStyle={{ fontSize: 12 }} />}
        {series.map((s, i) => (
          <Line key={s.id} type="monotone" dataKey={s.id} name={s.name} stroke={CHART_COLORS[i % CHART_COLORS.length]} strokeWidth={single ? 2.6 : 2} dot={{ r: single ? 5 : 3.5, strokeWidth: 2, fill: "#fff" }} activeDot={{ r: 6 }} connectNulls isAnimationActive={false} />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
