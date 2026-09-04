import { requireGuardianPractitioner } from "@/lib/db/queries/family";
import { listDocuments } from "@/lib/db/queries/collaborators";
import { Card, EmptyState } from "@/components/ui";
import { isoToBR } from "@/lib/domain/dates";

export default async function FamilyDocumentsPage({ params }: { params: Promise<{ pid: string }> }) {
  const { pid } = await params;
  await requireGuardianPractitioner(pid);
  const docs = (await listDocuments("practitioner", pid)).filter((d) => d.visibleToGuardian);
  return (
    <Card title="Documentos autorizados" className="p-0">
      {docs.length === 0 ? <EmptyState title="Nenhum documento liberado" /> : (
        <ul className="divide-y divide-ink-100 -mt-5">{docs.map((d) => (
          <li key={d.id} className="px-4 py-3"><a href={`/api/files/${d.id}`} target="_blank" rel="noreferrer" className="font-medium text-brand-700 hover:underline">{d.typeName}</a><p className="text-sm text-ink-500">{d.fileName}{d.expiresAt ? ` · válido até ${isoToBR(d.expiresAt)}` : ""}</p></li>
        ))}</ul>
      )}
    </Card>
  );
}
