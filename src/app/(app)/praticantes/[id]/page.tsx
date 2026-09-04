import { notFound } from "next/navigation";
import { requireStaff, hasPermission } from "@/lib/auth/session";
import { getPractitionerFor } from "@/lib/db/queries/practitioners";
import { getMany, Collections } from "@/lib/db/collections";
import { Card, DescriptionList, Field, Select, Textarea, Alert, LinkButton } from "@/components/ui";
import { ActionForm } from "@/components/ui/ActionForm";
import { SubmitButton } from "@/components/ui/FormStatus";
import { PhotoUploader } from "@/components/documents/Uploader";
import { setPractitionerPhoto } from "@/lib/actions/documents";
import { setPractitionerStatus } from "@/lib/actions/practitioners";
import { formatCPF, formatPhone } from "@/lib/domain/format";
import { isoToBR } from "@/lib/domain/dates";
import type { Params } from "@/lib/types";

export default async function PractitionerDataPage({ params }: { params: Params<{ id: string }> }) {
  const user = await requireStaff();
  const { id } = await params;
  const p = await getPractitionerFor(user, id);
  if (!p) notFound();
  const professionals = await getMany(Collections.collaborators(), p.professionalIds);
  const canManage = hasPermission(user, "practitioners.manage");
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      <div className="lg:col-span-2 space-y-5">
        <Card title="Dados cadastrais" action={canManage && <PhotoUploader ownerId={p.id} save={setPractitionerPhoto} />}>
          <DescriptionList items={[
            { label: "Nascimento", value: isoToBR(p.birthDate) },
            { label: "CPF", value: formatCPF(p.cpf) },
            { label: "Telefone", value: formatPhone(p.phone) },
            { label: "E-mail", value: p.email ?? "—" },
            { label: "Endereço", value: p.address ?? "—" },
            { label: "Entrada", value: isoToBR(p.entryDate) },
            { label: "Contatos adicionais", value: p.additionalContacts ?? "—" },
            { label: "Equipe", value: professionals.length ? professionals.map((c) => c.name).join(", ") : "Nenhum profissional atribuído" },
          ]} />
        </Card>
        {p.importantInfo && <Card title="Informações importantes"><p className="text-sm whitespace-pre-wrap">{p.importantInfo}</p></Card>}
        {hasPermission(user, "clinical.view") && (
          <Card title="Informações clínicas / terapêuticas">
            {p.clinicalInfo ? <p className="text-sm whitespace-pre-wrap">{p.clinicalInfo}</p> : <p className="text-sm text-ink-500">Nenhuma informação registrada.</p>}
            <p className="text-xs text-ink-500 mt-3">Área restrita: visível apenas para perfis com permissão de informações clínicas.</p>
          </Card>
        )}
        {p.closure && (
          <Card title="Encerramento">
            <DescriptionList items={[
              { label: "Data", value: isoToBR(p.closure.date) },
              { label: "Motivo", value: p.closure.reason },
              { label: "Decisão", value: p.closure.decidedByName },
              { label: "Observações", value: p.closure.notes ?? "—" },
            ]} />
            {p.closure.reportId && <div className="mt-3"><LinkButton href={`/praticantes/${p.id}/relatorios/${p.closure.reportId}`} variant="outline" size="sm">Ver relatório final</LinkButton></div>}
          </Card>
        )}
      </div>
      <div className="space-y-5">
        {canManage && p.status !== "closed" && (
          <Card title="Situação do acompanhamento">
            <ActionForm action={setPractitionerStatus} className="space-y-3">
              <input type="hidden" name="id" value={p.id} />
              <Field label="Alterar para">
                <Select name="status" defaultValue={p.status}>
                  <option value="active">Em acompanhamento</option>
                  <option value="reassessment">Reavaliação</option>
                  <option value="paused">Pausado</option>
                </Select>
              </Field>
              <Field label="Motivo / observação"><Textarea name="note" className="min-h-16" /></Field>
              <SubmitButton variant="outline" size="sm">Salvar situação</SubmitButton>
            </ActionForm>
            <div className="mt-4 pt-4 border-t border-ink-100">
              <LinkButton href={`/praticantes/${p.id}/encerrar`} variant="ghost" size="sm" className="text-red-700">Encerrar acompanhamento…</LinkButton>
            </div>
          </Card>
        )}
        {p.status === "closed" && <Alert tone="info">Acompanhamento encerrado em {isoToBR(p.closure?.date)}. Os dados permanecem disponíveis para consulta.</Alert>}
      </div>
    </div>
  );
}
