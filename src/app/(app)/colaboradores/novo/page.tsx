import { requirePermission, hasPermission } from "@/lib/auth/session";
import { listJobRoles } from "@/lib/db/queries/collaborators";
import { PageHeader } from "@/components/ui";
import { CollaboratorForm } from "@/components/collaborators/CollaboratorForm";

export const metadata = { title: "Novo colaborador" };

export default async function NewCollaboratorPage() {
  const user = await requirePermission("collaborators.manage");
  const jobRoles = await listJobRoles();
  return (
    <div className="max-w-3xl">
      <PageHeader title="Novo colaborador" back="/colaboradores" />
      <CollaboratorForm jobRoles={jobRoles} canSeeFinance={hasPermission(user, "finance.view")} />
    </div>
  );
}
