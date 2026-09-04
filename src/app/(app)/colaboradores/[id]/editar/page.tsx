import { notFound } from "next/navigation";
import { requirePermission, hasPermission } from "@/lib/auth/session";
import { listJobRoles } from "@/lib/db/queries/collaborators";
import { getCollaborator } from "@/lib/db/queries/collaborators";
import { PageHeader } from "@/components/ui";
import { CollaboratorForm } from "@/components/collaborators/CollaboratorForm";
import type { Params } from "@/lib/types";

export default async function EditCollaboratorPage({ params }: { params: Params<{ id: string }> }) {
  const user = await requirePermission("collaborators.manage");
  const { id } = await params;
  const [c, jobRoles] = await Promise.all([getCollaborator(id), listJobRoles()]);
  if (!c) notFound();
  return (
    <div className="max-w-3xl">
      <PageHeader title={`Editar · ${c.name}`} back={`/colaboradores/${id}`} />
      <CollaboratorForm collaborator={c} jobRoles={jobRoles} canSeeFinance={hasPermission(user, "finance.view")} />
    </div>
  );
}
