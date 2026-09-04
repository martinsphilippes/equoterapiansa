import { ActionForm } from "@/components/ui/ActionForm";
import { SubmitButton } from "@/components/ui/FormStatus";
import { Card, Checkbox, Field, Input, Textarea } from "@/components/ui";
import { savePractitioner } from "@/lib/actions/practitioners";
import type { Collaborator, Guardian, Practitioner } from "@/lib/db/types";

export function PractitionerForm({ practitioner: p, professionals, guardians, canSeeClinical }: { practitioner?: Practitioner; professionals: Collaborator[]; guardians: Guardian[]; canSeeClinical: boolean }) {
  return (
    <ActionForm action={savePractitioner} className="space-y-5">
      {p && <input type="hidden" name="id" value={p.id} />}
      <Card title="Dados do praticante">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Nome completo" className="sm:col-span-2"><Input name="name" defaultValue={p?.name} required autoFocus /></Field>
          <Field label="Data de nascimento"><Input name="birthDate" type="date" defaultValue={p?.birthDate} /></Field>
          <Field label="CPF (se houver)"><Input name="cpf" inputMode="numeric" defaultValue={p?.cpf} /></Field>
          <Field label="Telefone"><Input name="phone" inputMode="tel" defaultValue={p?.phone} /></Field>
          <Field label="E-mail"><Input name="email" type="email" defaultValue={p?.email} /></Field>
          <Field label="Endereço" className="sm:col-span-2"><Input name="address" defaultValue={p?.address} /></Field>
          <Field label="Data de entrada na instituição"><Input name="entryDate" type="date" defaultValue={p?.entryDate ?? new Date().toISOString().slice(0, 10)} required /></Field>
          <Field label="Contatos adicionais"><Input name="additionalContacts" defaultValue={p?.additionalContacts} placeholder="Nome e telefone" /></Field>
          <Field label="Informações importantes" hint="Visível para toda a equipe que atende (ex.: alergias, cuidados, preferências)." className="sm:col-span-2"><Textarea name="importantInfo" defaultValue={p?.importantInfo} /></Field>
          {canSeeClinical && <Field label="Informações clínicas / terapêuticas" hint="Restrito a quem tem permissão de informações clínicas." className="sm:col-span-2"><Textarea name="clinicalInfo" defaultValue={p?.clinicalInfo} /></Field>}
        </div>
      </Card>
      <Card title="Equipe e responsáveis">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <p className="text-sm font-medium text-ink-700 mb-2">Profissionais que acompanham</p>
            {professionals.length === 0 ? <p className="text-sm text-ink-500">Nenhum colaborador com função de atendimento cadastrado.</p> : (
              <div className="space-y-1.5">{professionals.map((c) => <Checkbox key={c.id} name="professionalIds" value={c.id} label={`${c.name} · ${c.jobRoleName ?? ""}`} defaultChecked={p?.professionalIds.includes(c.id)} />)}</div>
            )}
            <p className="text-xs text-ink-500 mt-2">Somente os profissionais marcados (e os com agendamento) veem este praticante.</p>
          </div>
          <div>
            <p className="text-sm font-medium text-ink-700 mb-2">Responsáveis</p>
            {guardians.length === 0 ? <p className="text-sm text-ink-500">Nenhum responsável cadastrado ainda. Você pode cadastrar depois na aba Responsáveis.</p> : (
              <div className="space-y-1.5 max-h-64 overflow-y-auto">{guardians.map((g) => <Checkbox key={g.id} name="guardianIds" value={g.id} label={`${g.name} · ${g.relationship}`} defaultChecked={p?.guardianIds.includes(g.id)} />)}</div>
            )}
          </div>
        </div>
      </Card>
      <SubmitButton size="lg">{p ? "Salvar alterações" : "Cadastrar praticante"}</SubmitButton>
    </ActionForm>
  );
}
