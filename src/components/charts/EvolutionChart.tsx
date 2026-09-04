"use client";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";

const COLORS = ["#2f6549", "#c2a97f", "#3b82c4", "#d97706", "#7c3aed", "#db2777", "#0d9488", "#64748b", "#b45309", "#1d4ed8", "#9333ea", "#15803d", "#b91c1c", "#0369a1", "#a16207", "#4338ca", "#be185d"];

export function EvolutionChart({ points, series, max, height = 280 }: { points: Record<string, string | number | null>[]; series: { id: string; name: string }[]; max: number; height?: number }) {
  if (points.length === 0) return <p className="text-sm text-ink-500">Sem avaliações para exibir.</p>;
  const data = points.map((p) => ({ ...p, label: String(p.date).split("-").reverse().slice(1).join("/") }));
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 12, left: -18, bottom: 0 }}>
        <CartesianGrid stroke="#e6eae7" strokeDasharray="3 3" />
        <XAxis dataKey="label" tick={{ fontSize: 12, fill: "#6b7770" }} />
        <YAxis domain={[0, max]} ticks={Array.from({ length: max + 1 }, (_, i) => i)} tick={{ fontSize: 12, fill: "#6b7770" }} />
        <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e6eae7", fontSize: 12 }} />
        {series.length > 1 && <Legend wrapperStyle={{ fontSize: 12 }} />}
        {series.map((s, i) => <Line key={s.id} type="monotone" dataKey={s.id} name={s.name} stroke={COLORS[i % COLORS.length]} strokeWidth={2.2} dot={{ r: 4 }} connectNulls isAnimationActive={false} />)}
      </LineChart>
    </ResponsiveContainer>
  );
}
