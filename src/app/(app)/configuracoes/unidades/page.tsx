import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/session";
import { listOrganizations } from "@/lib/db/queries/orgs";
import { DEFAULT_ORG_ID } from "@/lib/db/org-context";
import { Alert, Badge, Card, Field, Input, PageHeader } from "@/components/ui";
import { ActionForm } from "@/components/ui/ActionForm";
import { SubmitButton } from "@/components/ui/FormStatus";
import { createOrg, renameOrg } from "@/lib/actions/orgs";
import { isoToBR } from "@/lib/domain/dates";

export const metadata = { title: "Unidades" };

export default async function OrgsPage() {
  const user = await requirePermission("settings.manage");
  if (user.role !== "owner") redirect("/sem-permissao");
  const orgs = await listOrganizations();
  return (
    <div className="space-y-5">
      <PageHeader title="Unidades" subtitle="Empresas atendidas por este sistema. Cada uma tem dados próprios e separados." />

      <Alert tone="info">
        Cada unidade guarda praticantes, equipe, agenda, financeiro, fichas e auditoria em separado. Um usuário enxerga apenas a unidade a que pertence; só o Dono pode ter acesso a mais de uma e alternar pelo seletor no topo.
      </Alert>

      <Card className="p-0" title={`${orgs.length} unidade(s)`}>
        <ul className="divide-y divide-border -mt-5">
          {orgs.map((o) => (
            <li key={o.id} className="px-4 py-3">
              <ActionForm action={renameOrg} className="flex flex-wrap items-end gap-2">
                <input type="hidden" name="id" value={o.id} />
                <Field label="Nome" className="flex-1 min-w-48"><Input name="name" defaultValue={o.name} className="h-9" /></Field>
                <Field label="Cidade e estado" className="flex-1 min-w-40"><Input name="city" defaultValue={o.city ?? ""} className="h-9" /></Field>
                <SubmitButton size="sm" variant="outline" pendingText="…">Salvar</SubmitButton>
              </ActionForm>
              <p className="mt-1 text-xs text-ink-500 flex items-center gap-2">
                {o.id === DEFAULT_ORG_ID ? <Badge tone="blue">Principal</Badge> : <Badge tone="gray">{o.id}</Badge>}
                {user.activeOrgId === o.id && <Badge tone="green">Em uso</Badge>}
                criada em {isoToBR(new Date(o.createdAt).toISOString().slice(0, 10))}
              </p>
            </li>
          ))}
        </ul>
      </Card>

      <Card title="Nova unidade">
        <ActionForm action={createOrg} className="space-y-3" resetOnSuccess>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Nome da empresa"><Input name="name" required placeholder="Ex.: Equitação Vida" /></Field>
            <Field label="Cidade e estado"><Input name="city" placeholder="Ex.: Ituiutaba – Minas Gerais" /></Field>
          </div>
          <SubmitButton>Criar unidade</SubmitButton>
          <p className="text-xs text-ink-500">
            A unidade nasce com jornada, funções, tipos de documento, escala de avaliação e plano de contas próprios. Nada é copiado da unidade atual, e os índices do banco são criados automaticamente.
          </p>
        </ActionForm>
      </Card>
    </div>
  );
}
