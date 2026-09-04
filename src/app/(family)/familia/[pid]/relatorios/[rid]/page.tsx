import { notFound } from "next/navigation";
import { requireGuardianPractitioner } from "@/lib/db/queries/family";
import { getSettings } from "@/lib/db/settings";
import { Collections, getDoc } from "@/lib/db/collections";
import { assessmentsOfPractitioner } from "@/lib/db/queries/practitioners";
import { PrintButton } from "@/components/ui/PrintButton";
import { ReportView } from "@/components/assessments/ReportView";

export default async function FamilyReportPage({ params }: { params: Promise<{ pid: string; rid: string }> }) {
  const { pid, rid } = await params;
  const { practitioner: p } = await requireGuardianPractitioner(pid);
  const [r, settings, assessments] = await Promise.all([getDoc(Collections.reports(), rid), getSettings(), assessmentsOfPractitioner(pid)]);
  if (!r || r.practitionerId !== pid || !r.sharedWithGuardians) notFound();
  return (
    <div className="space-y-3">
      <div className="no-print flex justify-end"><PrintButton /></div>
      <ReportView report={r} practitioner={p} orgName={settings.orgName} assessments={assessments} />
    </div>
  );
}
