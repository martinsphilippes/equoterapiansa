"use client";
import { Card, Field, Input, Textarea } from "@/components/ui";
import { ActionForm } from "@/components/ui/ActionForm";
import { SubmitButton } from "@/components/ui/FormStatus";
import { updateIntakeSettings } from "@/lib/actions/intake";

/**
 * Os documentos podem pertencer a outra instituição que não a configurada no
 * sistema. O nome informado aqui aparece no formulário, nos termos e na
 * impressão, e fica gravado em cada ficha enviada.
 */
export function IntakeSettingsCard({ entityName, entityCity, intro, orgName }: { entityName?: string; entityCity?: string; intro?: string; orgName: string }) {
  return (
    <Card title="Instituição dos documentos">
      <ActionForm action={updateIntakeSettings} className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Nome da instituição" hint={`Em branco usa ${orgName}.`}>
            <Input name="entityName" defaultValue={entityName ?? ""} placeholder={orgName} />
          </Field>
          <Field label="Cidade e estado" hint="Sai ao pé dos documentos impressos.">
            <Input name="entityCity" defaultValue={entityCity ?? ""} placeholder="Ex.: Ituiutaba – Minas Gerais" />
          </Field>
        </div>
        <Field label="Mensagem de abertura do formulário" hint="Opcional. Substitui o texto padrão da tela pública.">
          <Textarea name="intro" defaultValue={intro ?? ""} className="min-h-16" />
        </Field>
        <SubmitButton>Salvar</SubmitButton>
        <p className="text-xs text-ink-500">Fichas já enviadas guardam o nome vigente na época e não mudam.</p>
      </ActionForm>
    </Card>
  );
}
