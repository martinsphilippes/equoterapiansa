import { requirePermission } from "@/lib/auth/session";
import { getSettings } from "@/lib/db/settings";
import { Card, Field, Input, Textarea } from "@/components/ui";
import { ActionForm } from "@/components/ui/ActionForm";
import { SubmitButton } from "@/components/ui/FormStatus";
import { ScheduleFields } from "@/components/collaborators/CollaboratorForm";
import { updateGeneralSettings, updateScale } from "@/lib/actions/settings";

export default async function GeneralSettingsPage() {
  await requirePermission("settings.manage");
  const s = await getSettings();
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      <ActionForm action={updateGeneralSettings} className="space-y-5">
        <Card title="Instituição">
          <div className="space-y-4">
            <Field label="Nome"><Input name="orgName" defaultValue={s.orgName} required /></Field>
            <Field label="Fuso horário"><Input name="timezone" defaultValue={s.timezone} /></Field>
            <Field label="Tipos de atendimento (um por linha)"><Textarea name="sessionTypes" defaultValue={s.sessionTypes.join("\n")} /></Field>
            <Field label="Intervalo padrão entre avaliações (meses)"><Input name="assessmentIntervalMonths" type="number" min={1} defaultValue={s.assessmentIntervalMonths} /></Field>
          </div>
        </Card>
        <Card title="Jornada padrão">
          <div className="space-y-4">
            <ScheduleFields schedule={s.schedule} toggle={false} />
            <Field label="Tolerância de atraso (minutos)"><Input name="lateToleranceMinutes" type="number" min={0} defaultValue={s.lateToleranceMinutes} /></Field>
            <Field label="Feriados / dias sem expediente" hint="Datas no formato AAAA-MM-DD separadas por vírgula ou linha."><Textarea name="holidays" defaultValue={s.holidays.join("\n")} /></Field>
          </div>
        </Card>
        <SubmitButton>Salvar configurações</SubmitButton>
      </ActionForm>

      <ActionForm action={updateScale}>
        <Card title="Escala de avaliação">
          <p className="text-sm text-ink-500 mb-3">Defina os níveis em sequência (1 é o mais baixo). Deixe em branco os níveis não usados.</p>
          <div className="space-y-2">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="w-6 text-sm text-ink-500 text-right">{i + 1}</span>
                <Input name={`level${i + 1}`} defaultValue={s.scale.find((l) => l.value === i + 1)?.label ?? ""} placeholder={i < 5 ? "" : "(não usado)"} />
              </div>
            ))}
          </div>
          <div className="mt-4"><SubmitButton variant="outline">Salvar escala</SubmitButton></div>
          <p className="text-xs text-ink-500 mt-3">Alterar a escala não muda avaliações já registradas (cada avaliação guarda a escala usada).</p>
        </Card>
      </ActionForm>
    </div>
  );
}
