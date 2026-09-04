import { requirePermission } from "@/lib/auth/session";
import { listJobRoles } from "@/lib/db/queries/collaborators";
import { Badge, Card, Checkbox, Field, Input } from "@/components/ui";
import { ActionForm } from "@/components/ui/ActionForm";
import { SubmitButton } from "@/components/ui/FormStatus";
import { saveJobRole, toggleJobRole } from "@/lib/actions/settings";

export default async function JobRolesPage() {
  await requirePermission("settings.manage");
  const roles = await listJobRoles(false);
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      <Card title="Funções cadastradas">
        <ul className="divide-y divide-ink-100">
          {roles.map((r) => (
            <li key={r.id} className="py-2.5">
              <ActionForm action={saveJobRole} className="flex flex-wrap items-center gap-2">
                <input type="hidden" name="id" value={r.id} />
                <Input name="name" defaultValue={r.name} className="flex-1 min-w-40 h-9" />
                <Checkbox name="isProfessional" label="Atende praticantes" defaultChecked={r.isProfessional} />
                <SubmitButton size="sm" variant="outline">Salvar</SubmitButton>
              </ActionForm>
              <div className="flex items-center gap-2 mt-1">
                {r.active ? <Badge tone="green">Ativa</Badge> : <Badge tone="gray">Inativa</Badge>}
                <ActionForm action={toggleJobRole}><input type="hidden" name="id" value={r.id} /><SubmitButton size="sm" variant="ghost" pendingText="…">{r.active ? "Desativar" : "Reativar"}</SubmitButton></ActionForm>
              </div>
            </li>
          ))}
        </ul>
      </Card>
      <Card title="Nova função">
        <ActionForm action={saveJobRole} className="space-y-3" resetOnSuccess>
          <Field label="Nome"><Input name="name" required placeholder="Ex.: Auxiliar guia" /></Field>
          <Checkbox name="isProfessional" label="Esta função registra atendimentos e avaliações (perfil profissional)" />
          <SubmitButton>Adicionar</SubmitButton>
        </ActionForm>
      </Card>
    </div>
  );
}
