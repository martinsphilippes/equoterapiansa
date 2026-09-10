import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission, hasPermission } from "@/lib/auth/session";
import { getSubmission } from "@/lib/db/queries/intake";
import { getSettings } from "@/lib/db/settings";
import { todayISO } from "@/lib/domain/dates";
import { Alert, Badge, Card, Checkbox, Field, Input, LinkButton, PageHeader, Select, Textarea } from "@/components/ui";
import { ActionForm } from "@/components/ui/ActionForm";
import { SubmitButton } from "@/components/ui/FormStatus";
import { ConfirmButton } from "@/components/ui/ConfirmButton";
import { PrintButton } from "@/components/ui/PrintButton";
import { convertIntake, reviewIntake } from "@/lib/actions/intake";
import { IntakeDocument } from "@/components/intake/IntakeDocument";
import type { Params } from "@/lib/types";

export default async function IntakeDetailPage({ params }: { params: Params<{ id: string }> }) {
  const user = await requirePermission("intake.manage");
  const { id } = await params;
  const [submission, settings] = await Promise.all([getSubmission(id), getSettings()]);
  if (!submission) notFound();
  const today = todayISO(settings.timezone);
  const canConvert = hasPermission(user, "practitioners.manage");
  return (
    <div className="space-y-5">
      <div className="no-print">
        <PageHeader
          back="/cadastros"
          title={submission.practitionerName}
          subtitle={`Protocolo ${submission.protocol}`}
          actions={<>
            <PrintButton />
            {submission.practitionerId && <LinkButton href={`/praticantes/${submission.practitionerId}`} size="sm" variant="outline">Ver praticante</LinkButton>}
          </>}
        />
      </div>

      {submission.answers.img_autoriza !== "sim" && (
        <div className="no-print"><Alert tone="warning">Imagem e voz <strong>não autorizadas</strong> nesta ficha. Não publique fotos deste praticante.</Alert></div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2">
          <IntakeDocument submission={submission} orgName={settings.orgName} today={today} />
        </div>

        <div className="space-y-5 no-print">
          <Card title="Conferência">
            <ActionForm action={reviewIntake} className="space-y-3">
              <input type="hidden" name="id" value={submission.id} />
              <Field label="Situação">
                <Select name="status" defaultValue={submission.status}>
                  <option value="new">Nova</option>
                  <option value="reviewed">Conferida</option>
                  {submission.practitionerId && <option value="converted">Convertida</option>}
                  <option value="archived">Arquivada</option>
                </Select>
              </Field>
              <Checkbox name="medicalDocs" value="1" label="Documentação médica apresentada" defaultChecked={submission.internal?.medicalDocs} />
              <Field label="Atestado / liberação médica">
                <Select name="medicalRelease" defaultValue={submission.internal?.medicalRelease ?? "na"}>
                  <option value="na">Não se aplica</option><option value="sim">Sim</option><option value="nao">Não</option>
                </Select>
              </Field>
              <Checkbox name="needsSupport" value="1" label="Necessita acompanhamento ou adaptação" defaultChecked={submission.internal?.needsSupport} />
              <Field label="Descrição do acompanhamento ou adaptação"><Input name="supportDescription" defaultValue={submission.internal?.supportDescription ?? ""} /></Field>
              <Field label="Status do cadastro">
                <Select name="registryStatus" defaultValue={submission.internal?.registryStatus ?? "pendente"}>
                  <option value="pendente">Pendente</option><option value="aprovado">Aprovado</option><option value="avaliacao">Necessita avaliação</option>
                </Select>
              </Field>
              <Field label="Observações da equipe"><Textarea name="notes" defaultValue={submission.internal?.notes ?? ""} className="min-h-20" /></Field>
              <SubmitButton>Salvar conferência</SubmitButton>
            </ActionForm>
          </Card>

          <Card title="Cadastro">
            {submission.practitionerId ? (
              <div className="space-y-2 text-sm">
                <Badge tone="green">Já convertida</Badge>
                <p className="text-ink-700">Esta ficha virou o praticante <Link prefetch={false} href={`/praticantes/${submission.practitionerId}`} className="text-primary-700 font-semibold hover:underline">{submission.practitionerName}</Link>.</p>
              </div>
            ) : canConvert ? (
              <ActionForm action={convertIntake} className="space-y-3">
                <input type="hidden" name="id" value={submission.id} />
                <p className="text-sm text-ink-700">
                  Cria o praticante com os dados da ficha{submission.answers.resp_nome ? " e o responsável legal informado" : ""}. As respostas de saúde marcadas como sim viram informações visíveis à equipe.
                </p>
                <ConfirmButton message="Criar o cadastro do praticante a partir desta ficha?" className="w-full">Converter em praticante</ConfirmButton>
              </ActionForm>
            ) : <p className="text-sm text-ink-500">Sem permissão para cadastrar praticantes.</p>}
          </Card>
        </div>
      </div>
    </div>
  );
}
