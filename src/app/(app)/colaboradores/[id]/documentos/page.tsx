import { requirePermission, hasPermission } from "@/lib/auth/session";
import { listDocumentTypes, listDocuments, documentStatus } from "@/lib/db/queries/collaborators";
import { Card } from "@/components/ui";
import { DocumentUploader } from "@/components/documents/Uploader";
import { DocumentList, DocumentPendingBadges } from "@/components/documents/DocumentList";
import { registerDocument } from "@/lib/actions/documents";
import type { Params } from "@/lib/types";

export default async function CollaboratorDocumentsPage({ params }: { params: Params<{ id: string }> }) {
  const user = await requirePermission(["collaborators.view", "collaborators.manage"]);
  const { id } = await params;
  const [types, docs] = await Promise.all([listDocumentTypes("collaborator"), listDocuments("collaborator", id)]);
  const status = documentStatus(types, docs);
  const canManage = hasPermission(user, "documents.manage") || hasPermission(user, "collaborators.manage");
  return (
    <Card title={<span className="flex items-center gap-3">Documentos <DocumentPendingBadges status={status} /></span>} action={canManage && <DocumentUploader ownerType="collaborator" ownerId={id} types={types} register={registerDocument} />}>
      <DocumentList docs={docs} status={status} canDelete={hasPermission(user, "documents.manage")} />
    </Card>
  );
}
