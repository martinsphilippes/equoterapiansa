import { Badge, Table, thCls, tdCls, EmptyState } from "@/components/ui";
import { ActionForm } from "@/components/ui/ActionForm";
import { ConfirmButton } from "@/components/ui/ConfirmButton";
import { deleteDocument } from "@/lib/actions/documents";
import { isoToBR, todayISO } from "@/lib/domain/dates";
import { formatBytes } from "@/lib/domain/format";
import type { DocumentStatus } from "@/lib/db/queries/collaborators";
import type { StoredDocument } from "@/lib/db/types";

export function DocumentPendingBadges({ status }: { status: DocumentStatus }) {
  if (status.missing.length === 0 && status.expired.length === 0 && status.expiringSoon.length === 0) return <Badge tone="green">Documentação em dia</Badge>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {status.missing.length > 0 && <Badge tone="amber">{status.missing.length} pendente{status.missing.length > 1 ? "s" : ""}</Badge>}
      {status.expired.length > 0 && <Badge tone="red">{status.expired.length} vencido{status.expired.length > 1 ? "s" : ""}</Badge>}
      {status.expiringSoon.length > 0 && <Badge tone="amber">{status.expiringSoon.length} vencendo</Badge>}
    </div>
  );
}

export function DocumentList({ docs, status, canDelete }: { docs: StoredDocument[]; status: DocumentStatus; canDelete: boolean }) {
  const today = todayISO();
  return (
    <div className="space-y-4">
      {status.missing.length > 0 && (
        <div className="rounded-xl bg-amber-50 border border-amber-100 p-3 text-sm text-amber-900">
          <p className="font-medium">Documentos obrigatórios pendentes:</p>
          <ul className="list-disc ml-5 mt-1">{status.missing.map((t) => <li key={t.id}>{t.name}</li>)}</ul>
        </div>
      )}
      {docs.length === 0 ? (
        <EmptyState title="Nenhum documento enviado" />
      ) : (
        <Table>
          <thead><tr><th className={thCls}>Documento</th><th className={thCls}>Arquivo</th><th className={thCls}>Validade</th><th className={thCls}>Enviado</th><th className={thCls}></th></tr></thead>
          <tbody>
            {docs.map((d) => {
              const expired = d.expiresAt && d.expiresAt < today;
              return (
                <tr key={d.id}>
                  <td className={tdCls}><span className="font-medium">{d.typeName}</span>{d.notes && <span className="block text-xs text-ink-500">{d.notes}</span>}</td>
                  <td className={tdCls}><a className="text-brand-700 hover:underline break-all" href={`/api/files/${d.id}`} target="_blank" rel="noreferrer">{d.fileName}</a><span className="block text-xs text-ink-500">{formatBytes(d.size)}</span></td>
                  <td className={tdCls}>{d.expiresAt ? <span className={expired ? "text-red-700 font-medium" : ""}>{isoToBR(d.expiresAt)}{expired ? " (vencido)" : ""}</span> : "—"}</td>
                  <td className={tdCls}><span className="text-xs text-ink-500">{new Date(d.uploadedAt).toLocaleDateString("pt-BR")}<br />{d.uploadedByName}</span></td>
                  <td className={tdCls}>
                    {canDelete && (
                      <ActionForm action={deleteDocument}>
                        <input type="hidden" name="id" value={d.id} />
                        <ConfirmButton message={`Excluir "${d.fileName}"?`} variant="ghost" size="sm" className="text-red-700">Excluir</ConfirmButton>
                      </ActionForm>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      )}
    </div>
  );
}
