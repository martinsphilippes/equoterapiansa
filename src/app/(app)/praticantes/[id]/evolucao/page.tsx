import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/auth/session";
import { getPractitionerFor, assessmentsOfPractitioner } from "@/lib/db/queries/practitioners";
import { Card, EmptyState, LinkButton, Select } from "@/components/ui";
import { EvolutionChart } from "@/components/charts/EvolutionChart";
import { ComparisonTable } from "@/components/assessments/ComparisonTable";
import { compareAssessments, evolutionSeries } from "@/lib/domain/assessments";
import { isoToBR } from "@/lib/domain/dates";
import type { Params, SearchParams } from "@/lib/types";
import { sp1 } from "@/lib/types";

export default async function EvolutionPage({ params, searchParams }: { params: Params<{ id: string }>; searchParams: SearchParams }) {
  const user = await requireStaff();
  const { id } = await params;
  const sp = await searchParams;
  const [p, assessments] = await Promise.all([getPractitionerFor(user, id), assessmentsOfPractitioner(id)]);
  if (!p) notFound();
  if (assessments.length === 0) return <Card><EmptyState title="Ainda não há avaliações" description="A evolução aparece a partir da avaliação inicial e das avaliações periódicas." action={<LinkButton href={`/praticantes/${id}/avaliacoes/nova`} variant="secondary">Registrar avaliação inicial</LinkButton>} /></Card>;
  const initialId = sp1(sp, "de") ?? (assessments.find((a) => a.type === "initial") ?? assessments[0]).id;
  const currentId = sp1(sp, "ate") ?? assessments[assessments.length - 1].id;
  const initial = assessments.find((a) => a.id === initialId) ?? assessments[0];
  const current = assessments.find((a) => a.id === currentId) ?? assessments[assessments.length - 1];
  const cmp = compareAssessments(initial, current.id === initial.id ? null : current);
  const series = evolutionSeries(assessments);
  const max = Math.max(...assessments.map((a) => a.scaleMax));
  const TYPE = { initial: "Inicial", periodic: "Periódica", final: "Final" };
  return (
    <div className="space-y-5">
      <Card title="Comparativo: como chegou → como está">
        <form className="flex flex-wrap items-end gap-2 mb-4 no-print">
          <label className="text-sm">De<Select name="de" defaultValue={initial.id} className="h-9 mt-1">{assessments.map((a) => <option key={a.id} value={a.id}>{isoToBR(a.date)} · {TYPE[a.type]}</option>)}</Select></label>
          <label className="text-sm">Até<Select name="ate" defaultValue={current.id} className="h-9 mt-1">{assessments.map((a) => <option key={a.id} value={a.id}>{isoToBR(a.date)} · {TYPE[a.type]}</option>)}</Select></label>
          <button className="h-9 px-3 rounded-xl bg-primary-100 text-primary-800 text-sm font-medium">Comparar</button>
        </form>
        {current.id === initial.id ? <p className="text-sm text-ink-500">Registre uma segunda avaliação para ver o comparativo.</p> : <ComparisonTable rows={cmp.rows} overall={cmp.overall} max={max} labels={{ initial: isoToBR(initial.date), current: isoToBR(current.date) }} />}
      </Card>
      <Card title="Média geral ao longo do tempo">
        <EvolutionChart points={series.points} series={[{ id: "overall", name: "Média geral" }]} max={max} height={220} />
      </Card>
      <Card title="Evolução por área">
        <EvolutionChart points={series.points} series={series.categories} max={max} height={360} />
      </Card>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {series.categories.map((c) => (
          <Card key={c.id} title={c.name}>
            <EvolutionChart points={series.points} series={[c]} max={max} height={160} />
          </Card>
        ))}
      </div>
    </div>
  );
}
