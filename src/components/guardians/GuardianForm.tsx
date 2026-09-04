import { ActionForm } from "@/components/ui/ActionForm";
import { SubmitButton } from "@/components/ui/FormStatus";
import { Card, Checkbox, Field, Input, Select } from "@/components/ui";
import { saveGuardian } from "@/lib/actions/practitioners";
import type { Guardian, Practitioner } from "@/lib/db/types";

const RELATIONSHIPS = ["Mãe", "Pai", "Tutor(a)", "Avó/Avô", "Irmã/Irmão", "Outro responsável"];

export function GuardianForm({ guardian: g, practitioners, preselect, returnTo }: { guardian?: Guardian; practitioners: Practitioner[]; preselect?: string; returnTo?: string }) {
  return (
    <ActionForm action={saveGuardian} className="space-y-5">
      {g && <input type="hidden" name="id" value={g.id} />}
      {returnTo && <input type="hidden" name="returnTo" value={returnTo} />}
      <Card title="Dados do responsável">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Nome completo" className="sm:col-span-2"><Input name="name" defaultValue={g?.name} required autoFocus /></Field>
          <Field label="Parentesco">
            <Select name="relationship" defaultValue={g?.relationship ?? "Mãe"}>{RELATIONSHIPS.map((r) => <option key={r}>{r}</option>)}</Select>
          </Field>
          <Field label="CPF"><Input name="cpf" inputMode="numeric" defaultValue={g?.cpf} /></Field>
          <Field label="Telefone"><Input name="phone" inputMode="tel" defaultValue={g?.phone} /></Field>
          <Field label="E-mail" hint="Usado para o acesso ao aplicativo."><Input name="email" type="email" defaultValue={g?.email} /></Field>
          <Field label="Endereço" className="sm:col-span-2"><Input name="address" defaultValue={g?.address} /></Field>
        </div>
      </Card>
      <Card title="Praticantes sob responsabilidade">
        {practitioners.length === 0 ? <p className="text-sm text-ink-500">Nenhum praticante cadastrado.</p> : (
          <div className="space-y-1.5 max-h-72 overflow-y-auto">
            {practitioners.map((p) => <Checkbox key={p.id} name="practitionerIds" value={p.id} label={p.name} defaultChecked={g?.practitionerIds.includes(p.id) || preselect === p.id} />)}
          </div>
        )}
      </Card>
      <SubmitButton size="lg">{g ? "Salvar alterações" : "Cadastrar responsável"}</SubmitButton>
    </ActionForm>
  );
}
