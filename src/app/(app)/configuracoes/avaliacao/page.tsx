import { requirePermission } from "@/lib/auth/session";
import { Collections, mapDocs } from "@/lib/db/collections";
import { Badge, Card, Field, Input } from "@/components/ui";
import { ActionForm } from "@/components/ui/ActionForm";
import { SubmitButton } from "@/components/ui/FormStatus";
import { saveAssessmentCategory, saveAssessmentItem, toggleAssessmentCategory } from "@/lib/actions/settings";

export default async function AssessmentSettingsPage() {
  await requirePermission("settings.manage");
  const categories = mapDocs(await Collections.assessmentCategories().get()).sort((a, b) => a.order - b.order);
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      <div className="lg:col-span-2 space-y-4">
        {categories.map((c) => (
          <Card key={c.id} className={c.active ? "" : "opacity-60"}>
            <ActionForm action={saveAssessmentCategory} className="flex items-center gap-2">
              <input type="hidden" name="id" value={c.id} />
              <Input name="name" defaultValue={c.name} className="flex-1 h-9 font-medium" />
              <SubmitButton size="sm" variant="outline">Salvar</SubmitButton>
            </ActionForm>
            <div className="flex items-center gap-2 mt-1 mb-3">
              {c.active ? <Badge tone="green">Ativa</Badge> : <Badge tone="gray">Inativa</Badge>}
              <ActionForm action={toggleAssessmentCategory}><input type="hidden" name="id" value={c.id} /><SubmitButton size="sm" variant="ghost" pendingText="…">{c.active ? "Desativar" : "Reativar"}</SubmitButton></ActionForm>
            </div>
            <ul className="space-y-1.5 ml-3 border-l-2 border-border pl-3">
              {c.items.map((it) => (
                <li key={it.id}>
                  <ActionForm action={saveAssessmentItem} className="flex items-center gap-2">
                    <input type="hidden" name="categoryId" value={c.id} />
                    <input type="hidden" name="itemId" value={it.id} />
                    <Input name="name" defaultValue={it.name} className={`flex-1 h-8 text-sm ${it.active ? "" : "line-through text-ink-300"}`} />
                    <SubmitButton size="sm" variant="ghost" pendingText="…">Salvar</SubmitButton>
                    <button type="submit" name="toggle" value="1" className="text-xs text-ink-500 hover:text-ink-900">{it.active ? "Desativar" : "Reativar"}</button>
                  </ActionForm>
                </li>
              ))}
              <li>
                <ActionForm action={saveAssessmentItem} className="flex items-center gap-2" resetOnSuccess>
                  <input type="hidden" name="categoryId" value={c.id} />
                  <Input name="name" placeholder="Novo item avaliado…" className="flex-1 h-8 text-sm" />
                  <SubmitButton size="sm" variant="secondary" pendingText="…">+ Item</SubmitButton>
                </ActionForm>
              </li>
            </ul>
          </Card>
        ))}
      </div>
      <div>
        <Card title="Nova área de avaliação">
          <ActionForm action={saveAssessmentCategory} className="space-y-3" resetOnSuccess>
            <Field label="Nome da área"><Input name="name" required placeholder="Ex.: Equilíbrio" /></Field>
            <SubmitButton>Adicionar área</SubmitButton>
          </ActionForm>
          <p className="text-xs text-ink-500 mt-3">Áreas e itens desativados deixam de aparecer em novas avaliações, mas o histórico é preservado.</p>
        </Card>
      </div>
    </div>
  );
}
