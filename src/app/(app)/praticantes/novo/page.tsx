import { requirePermission, hasPermission } from "@/lib/auth/session";
import { listGuardians, listProfessionals } from "@/lib/db/queries/practitioners";
import { PageHeader } from "@/components/ui";
import { PractitionerForm } from "@/components/practitioners/PractitionerForm";

export const metadata = { title: "Novo praticante" };

export default async function NewPractitionerPage() {
  const user = await requirePermission("practitioners.manage");
  const [professionals, guardians] = await Promise.all([listProfessionals(), listGuardians()]);
  return (
    <div className="max-w-3xl">
      <PageHeader title="Novo praticante" back="/praticantes" />
      <PractitionerForm professionals={professionals} guardians={guardians} canSeeClinical={hasPermission(user, "clinical.view")} />
    </div>
  );
}
