import { notFound } from "next/navigation";
import { requirePermission, hasPermission } from "@/lib/auth/session";
import { getPractitionerFor, listGuardians, listProfessionals } from "@/lib/db/queries/practitioners";
import { PageHeader } from "@/components/ui";
import { PractitionerForm } from "@/components/practitioners/PractitionerForm";
import type { Params } from "@/lib/types";

export default async function EditPractitionerPage({ params }: { params: Params<{ id: string }> }) {
  const user = await requirePermission("practitioners.manage");
  const { id } = await params;
  const [p, professionals, guardians] = await Promise.all([getPractitionerFor(user, id), listProfessionals(), listGuardians()]);
  if (!p) notFound();
  return (
    <div className="max-w-3xl">
      <PageHeader title={`Editar · ${p.name}`} back={`/praticantes/${id}`} />
      <PractitionerForm practitioner={p} professionals={professionals} guardians={guardians} canSeeClinical={hasPermission(user, "clinical.view")} />
    </div>
  );
}
