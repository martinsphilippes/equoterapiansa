import { ComparisonTable } from "./ComparisonTable";
import { EvolutionChart } from "@/components/charts/EvolutionChart";
import { isoToBR } from "@/lib/domain/dates";
import type { Assessment, EvolutionReport, Practitioner } from "@/lib/db/types";
import { evolutionSeries } from "@/lib/domain/assessments";
import { BrandLogo } from "@/components/brand/Brand";

/** Layout imprimível do relatório (usado pela equipe e pela área da família). */
export function ReportView({ report: r, practitioner: p, orgName, assessments }: { report: EvolutionReport; practitioner: Practitioner; orgName: string; assessments: Assessment[] }) {
  const s = r.snapshot;
  const max = Math.max(...assessments.map((a) => a.scaleMax), 5);
  const inPeriod = assessments.filter((a) => a.date >= r.periodStart && a.date <= r.periodEnd);
  const series = evolutionSeries(inPeriod.length >= 2 ? inPeriod : assessments);
  return (
    <article className="bg-surface rounded-2xl border border-border p-6 md:p-10 print:border-0 print:p-0 space-y-8 text-[15px] leading-relaxed">
      <header className="border-b-2 border-primary pb-4 flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary-700">{orgName}</p>
          <h1 className="text-2xl font-extrabold tracking-tight mt-1">{r.title}</h1>
          <p className="text-ink-700">{p.name}{s.age !== null ? `, ${s.age} anos` : ""} · Período: {isoToBR(r.periodStart)} a {isoToBR(r.periodEnd)}</p>
        </div>
        <BrandLogo className="w-24 md:w-28 shrink-0" sizes="112px" />
      </header>

      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Box k="Frequência" v={`${s.frequency.percent}%`} hint={`${s.frequency.done} realizadas · ${s.frequency.missed} faltas · ${s.frequency.cancelled} canceladas`} />
        <Box k="Atendimentos" v={String(s.sessionsCount)} hint="registrados no período" />
        <Box k="Em acompanhamento desde" v={isoToBR(s.entryDate)} />
        <Box k="Evolução geral" v={s.overall.percentChange === null ? "—" : `${s.overall.percentChange > 0 ? "+" : ""}${s.overall.percentChange}%`} hint={s.overall.delta !== null ? `${s.overall.delta > 0 ? "+" : ""}${s.overall.delta} pontos na média` : "sem duas avaliações"} />
      </section>

      <Section title="Profissionais envolvidos"><p>{s.professionals.length ? s.professionals.join(", ") : "—"}</p></Section>
      <Section title="Objetivos trabalhados">{s.objectives.length ? <ul className="list-disc ml-5">{s.objectives.map((o) => <li key={o}>{o}</li>)}</ul> : <p>—</p>}</Section>

      <Section title="Avaliação inicial × avaliação atual">
        {s.comparison.length ? <ComparisonTable rows={s.comparison} overall={s.overall} max={max} /> : <p>Não há avaliações suficientes para o comparativo.</p>}
      </Section>

      {series.points.length >= 2 && (
        <Section title="Evolução por área">
          <EvolutionChart points={series.points} series={series.categories} max={max} height={320} />
        </Section>
      )}

      {r.observations && <Section title="Observações profissionais"><p className="whitespace-pre-wrap">{r.observations}</p></Section>}
      {r.conclusion && <Section title="Conclusão"><p className="whitespace-pre-wrap">{r.conclusion}</p></Section>}

      <footer className="pt-8 border-t border-border text-sm text-ink-700">
        <p className="font-semibold">{r.professionalName}</p>
        <p className="text-ink-500">Profissional responsável · Emitido em {new Date(r.createdAt).toLocaleDateString("pt-BR")}</p>
        <p className="text-xs text-ink-500 mt-3">Este relatório organiza registros feitos pela equipe. Decisões terapêuticas são sempre dos profissionais responsáveis.</p>
        <p className="text-[10px] uppercase tracking-[0.18em] text-primary-700 mt-4">{orgName}</p>
      </footer>
    </article>
  );
}

function Box({ k, v, hint }: { k: string; v: string; hint?: string }) {
  return <div className="rounded-xl bg-primary-soft/60 border border-primary-100 p-3"><p className="text-[11px] font-semibold uppercase tracking-wider text-primary-700">{k}</p><p className="text-xl font-extrabold tnum">{v}</p>{hint && <p className="text-xs text-ink-500">{hint}</p>}</div>;
}
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <section><h2 className="flex items-center gap-2 text-base font-bold mb-2"><span className="h-4 w-1 rounded-full bg-primary" />{title}</h2>{children}</section>;
}
