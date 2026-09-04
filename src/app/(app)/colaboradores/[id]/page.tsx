import { requirePermission, hasPermission } from "@/lib/auth/session";
import { getCollaborator } from "@/lib/db/queries/collaborators";
import { getSettings } from "@/lib/db/settings";
import { Card, DescriptionList, Field, Input, Select } from "@/components/ui";
import { ActionForm } from "@/components/ui/ActionForm";
import { SubmitButton } from "@/components/ui/FormStatus";
import { setCollaboratorStatus } from "@/lib/actions/collaborators";
import { formatBRL, formatCPF, formatPhone } from "@/lib/domain/format";
import { isoToBR, ageFrom } from "@/lib/domain/dates";
import { scheduleFor, expectedMinutesPerDay } from "@/lib/domain/time";
import type { Params } from "@/lib/types";
import { notFound } from "next/navigation";

const WD = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export default async function CollaboratorDataPage({ params }: { params: Params<{ id: string }> }) {
  const user = await requirePermission(["collaborators.view", "collaborators.manage"]);
  const { id } = await params;
  const [c, settings] = await Promise.all([getCollaborator(id), getSettings()]);
  if (!c) notFound();
  const schedule = scheduleFor(settings, c.schedule);
  const finance = hasPermission(user, "finance.view");
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      <div className="lg:col-span-2 space-y-5">
        <Card title="Dados pessoais">
          <DescriptionList items={[
            { label: "CPF", value: formatCPF(c.cpf) },
            { label: "Nascimento", value: c.birthDate ? `${isoToBR(c.birthDate)} (${ageFrom(c.birthDate)} anos)` : "—" },
            { label: "Telefone", value: formatPhone(c.phone) },
            { label: "E-mail", value: c.email ?? "—" },
            { label: "Endereço", value: c.address ?? "—" },
            { label: "Admissão", value: isoToBR(c.admissionDate) },
            ...(c.terminationDate ? [{ label: "Desligamento", value: isoToBR(c.terminationDate) }] : []),
          ]} />
        </Card>
        <Card title="Jornada prevista">
          <DescriptionList items={[
            { label: "Origem", value: c.schedule ? "Jornada própria" : "Jornada padrão da instituição" },
            { label: "Dias", value: schedule.weekdays.map((d) => WD[d]).join(", ") },
            { label: "Períodos", value: schedule.periods.map((p) => `${p.start}–${p.end}`).join(" · ") },
            { label: "Horas por dia", value: `${(expectedMinutesPerDay(schedule) / 60).toFixed(1).replace(".", ",")}h` },
          ]} />
        </Card>
        {finance && (
          <Card title="Remuneração">
            <DescriptionList items={[
              { label: "Tipo", value: c.payType === "hourly" ? "Valor por hora" : "Salário mensal" },
              { label: c.payType === "hourly" ? "Valor por hora" : "Salário", value: formatBRL(c.payType === "hourly" ? c.hourlyRate : c.salary) },
              { label: "Dados bancários / PIX", value: c.bankInfo ?? "—" },
            ]} />
          </Card>
        )}
        {c.notes && <Card title="Observações"><p className="text-sm whitespace-pre-wrap">{c.notes}</p></Card>}
      </div>
      <div className="space-y-5">
        {hasPermission(user, "collaborators.manage") && (
          <Card title="Situação">
            <ActionForm action={setCollaboratorStatus} className="space-y-3">
              <input type="hidden" name="id" value={c.id} />
              <Field label="Alterar para">
                <Select name="status" defaultValue={c.status}>
                  <option value="active">Ativo</option>
                  <option value="away">Afastado</option>
                  <option value="terminated">Desligado</option>
                </Select>
              </Field>
              <Field label="Data de desligamento (se aplicável)"><Input type="date" name="terminationDate" defaultValue={c.terminationDate ?? ""} /></Field>
              <SubmitButton variant="outline" size="sm">Salvar situação</SubmitButton>
              <p className="text-xs text-ink-500">Ao desligar, o acesso ao sistema é bloqueado automaticamente.</p>
            </ActionForm>
          </Card>
        )}
      </div>
    </div>
  );
}
