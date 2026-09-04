import { notFound } from "next/navigation";
import { requireStaff, hasPermission } from "@/lib/auth/session";
import { getPractitionerFor } from "@/lib/db/queries/practitioners";
import { listDocumentTypes, listDocuments, documentStatus } from "@/lib/db/queries/collaborators";
import { Card } from "@/components/ui";
import { DocumentUploader } from "@/components/documents/Uploader";
import { DocumentList, DocumentPendingBadges } from "@/components/documents/DocumentList";
import { registerDocument } from "@/lib/actions/documents";
import type { Params } from "@/lib/types";

export default async function PractitionerDocumentsPage({ params }: { params: Params<{ id: string }> }) {
  const user = await requireStaff();
  const { id } = await params;
  const p = await getPractitionerFor(user, id);
  if (!p) notFound();
  const [types, docs] = await Promise.all([listDocumentTypes("practitioner"), listDocuments("practitioner", id)]);
  const status = documentStatus(types, docs);
  const canUpload = hasPermission(user, "documents.manage") || hasPermission(user, "practitioners.manage");
  return (
    <Card title={<span className="flex items-center gap-3">Documentos <DocumentPendingBadges status={status} /></span>} action={canUpload && <DocumentUploader ownerType="practitioner" ownerId={id} types={types} register={registerDocument} />}>
      <DocumentList docs={docs} status={status} canDelete={hasPermission(user, "documents.manage")} />
    </Card>
  );
}
