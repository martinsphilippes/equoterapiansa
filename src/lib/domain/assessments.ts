import type { Assessment, AssessmentCategory, AssessmentScore } from "@/lib/db/types";

export function avg(values: number[]): number | null {
  const v = values.filter((x) => typeof x === "number" && !Number.isNaN(x));
  if (v.length === 0) return null;
  return Math.round((v.reduce((a, b) => a + b, 0) / v.length) * 100) / 100;
}

export function computeAverages(categories: AssessmentCategory[], scores: Record<string, AssessmentScore>) {
  const categoryAverages: Record<string, number | null> = {};
  const all: number[] = [];
  for (const c of categories) {
    const vals: number[] = [];
    for (const it of c.items) {
      const s = scores[it.id]?.score;
      if (typeof s === "number") {
        vals.push(s);
        all.push(s);
      }
    }
    categoryAverages[c.id] = avg(vals);
  }
  return { categoryAverages, overallAverage: avg(all) };
}

export interface ComparisonRow {
  categoryId: string;
  category: string;
  initial: number | null;
  current: number | null;
  delta: number | null;
}

export function compareAssessments(initial: Assessment | null, current: Assessment | null): {
  rows: ComparisonRow[];
  overall: { initial: number | null; current: number | null; delta: number | null; percentChange: number | null };
} {
  const names = new Map<string, string>();
  for (const a of [initial, current]) for (const c of a?.categoriesSnapshot ?? []) names.set(c.id, c.name);
  const rows: ComparisonRow[] = [];
  for (const [id, name] of names) {
    const i = initial?.categoryAverages[id] ?? null;
    const c = current?.categoryAverages[id] ?? null;
    rows.push({ categoryId: id, category: name, initial: i, current: c, delta: i !== null && c !== null ? round2(c - i) : null });
  }
  const oi = initial?.overallAverage ?? null;
  const oc = current?.overallAverage ?? null;
  const delta = oi !== null && oc !== null ? round2(oc - oi) : null;
  const percentChange = oi && oc !== null ? Math.round(((oc - oi) / oi) * 100) : null;
  return { rows, overall: { initial: oi, current: oc, delta, percentChange } };
}

export function round2(n: number) {
  return Math.round(n * 100) / 100;
}

/** Série temporal por categoria para gráficos. */
export function evolutionSeries(assessments: Assessment[]) {
  const sorted = [...assessments].sort((a, b) => a.date.localeCompare(b.date));
  const categories = new Map<string, string>();
  for (const a of sorted) for (const c of a.categoriesSnapshot) categories.set(c.id, c.name);
  const points = sorted.map((a) => {
    const row: Record<string, string | number | null> = { date: a.date, label: a.date.slice(0, 7), overall: a.overallAverage };
    for (const id of categories.keys()) row[id] = a.categoryAverages[id] ?? null;
    return row;
  });
  return { categories: Array.from(categories, ([id, name]) => ({ id, name })), points };
}
