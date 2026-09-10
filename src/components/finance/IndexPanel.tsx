import { Badge, Card, Table, thCls, tdCls } from "@/components/ui";
import { ActionForm } from "@/components/ui/ActionForm";
import { SubmitButton } from "@/components/ui/FormStatus";
import { ensureIndexes } from "@/lib/actions/finance-indexes";
import { indexStatus, serviceAccountEmail, REQUIRED_INDEXES } from "@/lib/db/index-admin";

const LABEL: Record<string, { tone: "green" | "amber" | "red" | "gray"; text: string }> = {
  READY: { tone: "green", text: "Pronto" },
  CREATING: { tone: "amber", text: "Construindo" },
  MISSING: { tone: "red", text: "Faltando" },
  NEEDS_REPAIR: { tone: "red", text: "Precisa reparo" },
  UNKNOWN: { tone: "gray", text: "Desconhecido" },
};

/** Conferência e criação dos índices compostos que as consultas exigem. */
export async function IndexPanel() {
  const status = await indexStatus();
  const project = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "";
  const consoleUrl = `https://console.firebase.google.com/project/${project}/firestore/databases/-default-/indexes`;
  const iamUrl = `https://console.cloud.google.com/iam-admin/iam?project=${project}`;
  const account = serviceAccountEmail();
  const missing = status.ok ? status.items.filter((i) => i.state !== "READY").length : 0;
  return (
    <div className="space-y-5">
      <Card title="Índices do banco de dados">
        <p className="text-sm text-ink-700">
          O Firestore precisa de índices para as consultas com vários filtros. Sem eles, as telas que dependem daquela consulta ficam sem dados. A criação leva alguns minutos e não custa nada no plano gratuito.
        </p>
        {status.ok ? (
          <div className="mt-3 space-y-3">
            <p className="text-sm font-semibold">{missing === 0 ? "Todos os índices necessários estão prontos." : `${missing} índice(s) pendente(s) de ${status.items.length}.`}</p>
            <ActionForm action={ensureIndexes}>
              <SubmitButton pendingText="Criando…">{missing === 0 ? "Conferir novamente" : "Criar índices que faltam"}</SubmitButton>
            </ActionForm>
            {missing > 0 && (
              <div className="rounded-xl bg-surface-50 border border-border p-3 text-sm space-y-2">
                <p className="font-semibold">Se aparecer &ldquo;sem permissão&rdquo;</p>
                <p className="text-ink-700">A conta de serviço do aplicativo precisa do papel <strong>Administrador de índices do Cloud Datastore</strong> para criar índices. É uma vez só: depois disso o sistema resolve sozinho sempre que faltar algum.</p>
                <ol className="list-decimal pl-5 space-y-1 text-ink-700">
                  <li>Abra o <a href={iamUrl} target="_blank" rel="noreferrer" className="text-primary-600 underline font-semibold">IAM do Google Cloud</a> deste projeto.</li>
                  <li>Localize {account ? <code className="bg-surface-100 px-1 rounded break-all">{account}</code> : "a conta de serviço do Firebase Admin"} e clique no lápis para editar.</li>
                  <li>Adicione o papel <code className="bg-surface-100 px-1 rounded">Cloud Datastore Index Admin</code> e salve.</li>
                  <li>Volte aqui e clique em <strong>Criar índices que faltam</strong>.</li>
                </ol>
                <p className="text-ink-700">Alternativa pelo terminal, sem mexer em permissão: <code className="bg-surface-100 px-1 rounded">firebase deploy --only firestore:indexes</code></p>
              </div>
            )}
          </div>
        ) : (
          <div className="mt-3 space-y-2 text-sm">
            <p className="font-semibold text-danger">Não foi possível consultar os índices.</p>
            <p className="text-ink-500 break-words">{status.error}</p>
            <p>Crie-os pelo terminal com <code className="bg-surface-100 px-1 rounded">firebase deploy --only firestore:indexes</code> ou manualmente no <a href={consoleUrl} target="_blank" rel="noreferrer" className="underline font-semibold">console do Firebase</a>, usando a lista de campos abaixo.</p>
          </div>
        )}
      </Card>
      {status.ok ? (
        <Card className="p-0" title="Detalhe">
          <div className="-mt-5 overflow-x-auto">
            <Table>
              <thead><tr><th className={thCls}>Coleção</th><th className={thCls}>Campos</th><th className={thCls}>Estado</th></tr></thead>
              <tbody>
                {status.items.map((i) => {
                  const l = LABEL[i.state] ?? LABEL.UNKNOWN;
                  return (
                    <tr key={`${i.collectionGroup}-${i.fields.map((f) => f.fieldPath).join("-")}`}>
                      <td className={tdCls}>{i.collectionGroup}</td>
                      <td className={tdCls}><span className="text-xs text-ink-700">{i.fields.map((f) => f.fieldPath).join(" · ")}</span></td>
                      <td className={tdCls}><Badge tone={l.tone}>{l.text}</Badge></td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          </div>
        </Card>
      ) : (
        <Card className="p-0" title="Índices necessários">
          <div className="-mt-5 overflow-x-auto">
            <Table>
              <thead><tr><th className={thCls}>Coleção</th><th className={thCls}>Campos (nesta ordem, crescente)</th></tr></thead>
              <tbody>
                {REQUIRED_INDEXES.map((i) => (
                  <tr key={`${i.collectionGroup}-${i.fields.map((f) => f.fieldPath).join("-")}`}>
                    <td className={tdCls}>{i.collectionGroup}</td>
                    <td className={tdCls}><span className="text-xs text-ink-700">{i.fields.map((f) => `${f.fieldPath}${f.order === "DESCENDING" ? " (desc)" : ""}`).join(" · ")}</span></td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        </Card>
      )}
    </div>
  );
}
