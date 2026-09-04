import { requirePermission } from "@/lib/auth/session";
import { Collections, mapDocs } from "@/lib/db/collections";
import { Card, Input, PageHeader, Select, Table, thCls, tdCls, EmptyState } from "@/components/ui";
import { formatDateTime } from "@/lib/domain/dates";
import type { SearchParams } from "@/lib/types";
import { sp1 } from "@/lib/types";

export const metadata = { title: "Auditoria" };

const ENTITIES: Record<string, string> = { "": "Todas", collaborator: "Colaboradores", user: "Usuários", timeEntry: "Jornada", payrollMonth: "Pagamentos", document: "Documentos", practitioner: "Praticantes", guardian: "Responsáveis", appointment: "Agenda", session: "Atendimentos", assessment: "Avaliações", report: "Relatórios", announcement: "Comunicados", settings: "Configurações", financialEntry: "Lançamentos financeiros", financialTransaction: "Movimentações", billingPlan: "Planos de cobrança", recurrenceRule: "Recorrências", financialCategory: "Categorias financeiras", costCenter: "Centros de custo", financialAccount: "Contas financeiras", paymentMethod: "Formas de pagamento", supplier: "Fornecedores", finance: "Configurações financeiras" };

export default async function AuditPage({ searchParams }: { searchParams: SearchParams }) {
  await requirePermission("audit.view");
  const sp = await searchParams;
  const entity = sp1(sp, "entidade") ?? "";
  const q = (sp1(sp, "busca") ?? "").toLowerCase();
  let query: FirebaseFirestore.Query = Collections.auditLogs();
  if (entity) query = query.where("entity", "==", entity);
  const logs = mapDocs(await (query.orderBy("at", "desc").limit(300).get() as Promise<FirebaseFirestore.QuerySnapshot<import("@/lib/db/types").AuditLog>>));
  const filtered = q ? logs.filter((l) => [l.userName, l.action, l.entityLabel ?? "", JSON.stringify(l.details ?? {})].join(" ").toLowerCase().includes(q)) : logs;
  return (
    <div>
      <PageHeader title="Auditoria" subtitle="Quem fez o quê, e quando. Registros importantes não podem ser apagados pela interface." />
      <form className="flex flex-wrap gap-2 mb-4">
        <Select name="entidade" defaultValue={entity} className="max-w-xs">{Object.entries(ENTITIES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select>
        <Input name="busca" defaultValue={q} placeholder="Buscar por usuário, ação ou nome…" className="max-w-sm" />
        <button className="h-11 px-4 rounded-xl bg-primary-600 text-white text-sm font-medium">Filtrar</button>
      </form>
      <Card>
        {filtered.length === 0 ? <EmptyState title="Nenhum registro" /> : (
          <Table>
            <thead><tr><th className={thCls}>Quando</th><th className={thCls}>Quem</th><th className={thCls}>Ação</th><th className={thCls}>Registro</th><th className={thCls}>Detalhes</th></tr></thead>
            <tbody>
              {filtered.map((l) => (
                <tr key={l.id}>
                  <td className={`${tdCls} whitespace-nowrap`}>{formatDateTime(l.at)}</td>
                  <td className={tdCls}>{l.userName}</td>
                  <td className={`${tdCls} font-mono text-xs`}>{l.action}</td>
                  <td className={tdCls}><span className="text-xs text-ink-500">{ENTITIES[l.entity] ?? l.entity}</span><br />{l.entityLabel ?? l.entityId}</td>
                  <td className={tdCls}>{l.details && Object.keys(l.details).length > 0 && <details><summary className="text-xs text-primary-700 cursor-pointer">ver</summary><pre className="text-[11px] whitespace-pre-wrap break-all max-w-md text-ink-700">{JSON.stringify(l.details, null, 1)}</pre></details>}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  );
}
