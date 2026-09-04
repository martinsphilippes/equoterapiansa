import { requireGuardianPractitioner } from "@/lib/db/queries/family";
import { assessmentsOfPractitioner } from "@/lib/db/queries/practitioners";
import { Card, EmptyState } from "@/components/ui";
import { EvolutionChart } from "@/components/charts/EvolutionChart";
import { ComparisonTable } from "@/components/assessments/ComparisonTable";
import { compareAssessments, evolutionSeries } from "@/lib/domain/assessments";
import { isoToBR } from "@/lib/domain/dates";

export default async function FamilyEvolutionPage({ params }: { params: Promise<{ pid: string }> }) {
  const { pid } = await params;
  await requireGuardianPractitioner(pid);
  const assessments = await assessmentsOfPractitioner(pid);
  if (assessments.length === 0) return <Card><EmptyState title="Ainda não há avaliações registradas" description="A evolução aparece aqui a partir da avaliação inicial." /></Card>;
  const initial = assessments.find((a) => a.type === "initial") ?? assessments[0];
  const last = assessments[assessments.length - 1];
  const cmp = compareAssessments(initial, last.id === initial.id ? null : last);
  const series = evolutionSeries(assessments);
  const max = Math.max(...assessments.map((a) => a.scaleMax));
  return (
    <div className="space-y-5">
      <Card title="Como chegou → como está">
        <p className="text-sm text-ink-500 mb-3">Notas médias por área, de {isoToBR(initial.date)} até {isoToBR(last.date)} (escala de 1 a {max}).</p>
        {last.id === initial.id ? <p className="text-sm text-ink-500">Até agora há apenas a avaliação inicial. O comparativo aparece após a próxima avaliação.</p> : <ComparisonTable rows={cmp.rows} overall={cmp.overall} max={max} labels={{ initial: isoToBR(initial.date), current: isoToBR(last.date) }} />}
      </Card>
      <Card title="Evolução ao longo do tempo">
        <EvolutionChart points={series.points} series={[{ id: "overall", name: "Média geral" }]} max={max} height={220} />
      </Card>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {series.categories.map((c) => <Card key={c.id} title={c.name}><EvolutionChart points={series.points} series={[c]} max={max} height={150} /></Card>)}
      </div>
    </div>
  );
}
