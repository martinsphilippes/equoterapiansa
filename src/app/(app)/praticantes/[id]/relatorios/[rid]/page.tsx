import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/auth/session";
import { getSettings } from "@/lib/db/settings";
import { Collections, getDoc } from "@/lib/db/collections";
import { getPractitionerFor, assessmentsOfPractitioner } from "@/lib/db/queries/practitioners";
import { PageHeader } from "@/components/ui";
import { PrintButton } from "@/components/ui/PrintButton";
import { ReportView } from "@/components/assessments/ReportView";
import type { Params } from "@/lib/types";

export default async function ReportPage({ params }: { params: Params<{ id: string; rid: string }> }) {
  const user = await requireStaff();
  const { id, rid } = await params;
  const [p, r, settings, assessments] = await Promise.all([getPractitionerFor(user, id), getDoc(Collections.reports(), rid), getSettings(), assessmentsOfPractitioner(id)]);
  if (!p || !r || r.practitionerId !== id) notFound();
  return (
    <div>
      <div className="no-print"><PageHeader title={r.title} back={`/praticantes/${id}/relatorios`} actions={<PrintButton />} /></div>
      <ReportView report={r} practitioner={p} orgName={settings.orgName} assessments={assessments} />
    </div>
  );
}
