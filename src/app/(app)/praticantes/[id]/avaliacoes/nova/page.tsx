import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth/session";
import { getSettings } from "@/lib/db/settings";
import { Collections, mapDocs } from "@/lib/db/collections";
import { getPractitionerFor, assessmentsOfPractitioner, listProfessionals } from "@/lib/db/queries/practitioners";
import { Alert, PageHeader } from "@/components/ui";
import { AssessmentForm } from "@/components/assessments/AssessmentForm";
import { todayISO } from "@/lib/domain/dates";
import type { Params } from "@/lib/types";

export default async function NewAssessmentPage({ params }: { params: Params<{ id: string }> }) {
  const user = await requirePermission("assessments.record");
  const { id } = await params;
  const [p, settings, existing, professionals] = await Promise.all([getPractitionerFor(user, id), getSettings(), assessmentsOfPractitioner(id), listProfessionals()]);
  if (!p) notFound();
  const categories = mapDocs(await Collections.assessmentCategories().get()).filter((c) => c.active).sort((a, b) => a.order - b.order).map((c) => ({ id: c.id, name: c.name, items: c.items.filter((i) => i.active) }));
  const hasInitial = existing.some((a) => a.type === "initial");
  return (
    <div className="max-w-3xl">
      <PageHeader title={hasInitial ? "Nova avaliação periódica" : "Avaliação inicial"} back={`/praticantes/${id}/avaliacoes`} />
      {categories.length === 0 && <Alert tone="warning">Nenhuma área de avaliação ativa. Configure em Configurações → Avaliação.</Alert>}
      <AssessmentForm practitionerId={id} categories={categories} scale={settings.scale} professionals={professionals} currentProfessionalId={user.collaboratorId} lockProfessional={user.role === "professional"} defaultType={hasInitial ? "periodic" : "initial"} today={todayISO(settings.timezone)} />
    </div>
  );
}
