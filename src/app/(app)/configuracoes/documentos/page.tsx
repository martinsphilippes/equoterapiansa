import { requirePermission } from "@/lib/auth/session";
import { listDocumentTypes } from "@/lib/db/queries/collaborators";
import { Badge, Card, Checkbox, Field, Input, Select } from "@/components/ui";
import { ActionForm } from "@/components/ui/ActionForm";
import { SubmitButton } from "@/components/ui/FormStatus";
import { saveDocumentType, toggleDocumentType } from "@/lib/actions/settings";
import type { DocumentType } from "@/lib/db/types";

function TypeList({ title, types }: { title: string; types: DocumentType[] }) {
  return (
    <Card title={title}>
      <ul className="divide-y divide-border">
        {types.map((t) => (
          <li key={t.id} className="py-2.5">
            <ActionForm action={saveDocumentType} className="space-y-2">
              <input type="hidden" name="id" value={t.id} />
              <input type="hidden" name="appliesTo" value={t.appliesTo} />
              <div className="flex items-center gap-2">
                <Input name="name" defaultValue={t.name} className="flex-1 h-9" />
                <SubmitButton size="sm" variant="outline">Salvar</SubmitButton>
              </div>
              <div className="flex flex-wrap gap-3 text-sm">
                <Checkbox name="required" label="Obrigatório" defaultChecked={t.required} />
                <Checkbox name="hasExpiry" label="Tem validade" defaultChecked={t.hasExpiry} />
                {t.appliesTo === "practitioner" && <Checkbox name="visibleToGuardian" label="Visível ao responsável" defaultChecked={t.visibleToGuardian} />}
              </div>
            </ActionForm>
            <div className="flex items-center gap-2 mt-1">
              {t.active ? <Badge tone="green">Ativo</Badge> : <Badge tone="gray">Inativo</Badge>}
              <ActionForm action={toggleDocumentType}><input type="hidden" name="id" value={t.id} /><SubmitButton size="sm" variant="ghost" pendingText="…">{t.active ? "Desativar" : "Reativar"}</SubmitButton></ActionForm>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}

export default async function DocumentTypesPage() {
  await requirePermission("settings.manage");
  const all = await listDocumentTypes(undefined, false);
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      <div className="space-y-5">
        <TypeList title="Documentos de colaboradores" types={all.filter((t) => t.appliesTo === "collaborator")} />
        <TypeList title="Documentos de praticantes" types={all.filter((t) => t.appliesTo === "practitioner")} />
      </div>
      <Card title="Novo tipo de documento">
        <ActionForm action={saveDocumentType} className="space-y-3" resetOnSuccess>
          <Field label="Nome"><Input name="name" required /></Field>
          <Field label="Aplica-se a"><Select name="appliesTo"><option value="collaborator">Colaboradores</option><option value="practitioner">Praticantes</option></Select></Field>
          <div className="flex flex-wrap gap-3">
            <Checkbox name="required" label="Obrigatório" />
            <Checkbox name="hasExpiry" label="Tem validade" />
            <Checkbox name="visibleToGuardian" label="Visível ao responsável (praticantes)" />
          </div>
          <SubmitButton>Adicionar</SubmitButton>
        </ActionForm>
      </Card>
    </div>
  );
}
