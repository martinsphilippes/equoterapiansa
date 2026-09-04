import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStaff, hasPermission } from "@/lib/auth/session";
import { getSettings } from "@/lib/db/settings";
import { getPractitionerFor, assessmentsOfPractitioner, listProfessionals } from "@/lib/db/queries/practitioners";
import { reportsOfPractitioner } from "@/lib/db/queries/reports";
import { Badge, Card, Checkbox, EmptyState, Field, Input, Select, Textarea } from "@/components/ui";
import { ActionForm } from "@/components/ui/ActionForm";
import { SubmitButton } from "@/components/ui/FormStatus";
import { generateReport, toggleReportShare } from "@/lib/actions/assessments";
import { isoToBR, todayISO } from "@/lib/domain/dates";
import type { Params } from "@/lib/types";

export default async function ReportsPage({ params }: { params: Params<{ id: string }> }) {
  const user = await requireStaff();
  const { id } = await params;
  const [p, settings, reports, assessments, professionals] = await Promise.all([getPractitionerFor(user, id), getSettings(), reportsOfPractitioner(id), assessmentsOfPractitioner(id), listProfessionals()]);
  if (!p) notFound();
  const canManage = hasPermission(user, "reports.manage");
  const initial = assessments.find((a) => a.type === "initial") ?? assessments[0];
  const latest = assessments[assessments.length - 1];
  const TYPE = { initial: "Inicial", periodic: "Periódica", final: "Final" };
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      <div className="lg:col-span-2">
        <Card title="Relatórios gerados" className="p-0">
          {reports.length === 0 ? <EmptyState title="Nenhum relatório ainda" description="Gere um relatório de evolução a partir das avaliações e atendimentos registrados." /> : (
            <ul className="divide-y divide-ink-100 -mt-5">
              {reports.map((r) => (
                <li key={r.id} className="px-4 py-3 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <Link href={`/praticantes/${id}/relatorios/${r.id}`} className="font-medium hover:underline">{r.title}</Link>
                    <p className="text-sm text-ink-500">{isoToBR(r.periodStart)} a {isoToBR(r.periodEnd)} · {r.professionalName}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {r.sharedWithGuardians ? <Badge tone="green">Visível à família</Badge> : <Badge tone="gray">Interno</Badge>}
                    {canManage && <ActionForm action={toggleReportShare}><input type="hidden" name="id" value={r.id} /><SubmitButton size="sm" variant="ghost" pendingText="…">{r.sharedWithGuardians ? "Ocultar" : "Liberar"}</SubmitButton></ActionForm>}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
      {canManage && (
        <Card title="Gerar relatório de evolução">
          <ActionForm action={generateReport} className="space-y-3">
            <input type="hidden" name="practitionerId" value={id} />
            <Field label="Título"><Input name="title" defaultValue="Relatório de evolução" /></Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Início do período"><Input type="date" name="periodStart" defaultValue={p.entryDate} required /></Field>
              <Field label="Fim do período"><Input type="date" name="periodEnd" defaultValue={todayISO(settings.timezone)} required /></Field>
            </div>
            <Field label="Avaliação inicial (referência)">
              <Select name="initialAssessmentId" defaultValue={initial?.id ?? ""}><option value="">Nenhuma</option>{assessments.map((a) => <option key={a.id} value={a.id}>{isoToBR(a.date)} · {TYPE[a.type]}</option>)}</Select>
            </Field>
            <Field label="Avaliação atual">
              <Select name="currentAssessmentId" defaultValue={latest && latest.id !== initial?.id ? latest.id : ""}><option value="">Nenhuma</option>{assessments.map((a) => <option key={a.id} value={a.id}>{isoToBR(a.date)} · {TYPE[a.type]}</option>)}</Select>
            </Field>
            <Field label="Profissional responsável">
              <Select name="professionalId" defaultValue={user.collaboratorId ?? professionals[0]?.id ?? ""} required>{professionals.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select>
            </Field>
            <Field label="Observações profissionais"><Textarea name="observations" className="min-h-20" /></Field>
            <Field label="Conclusão"><Textarea name="conclusion" className="min-h-20" /></Field>
            <Checkbox name="sharedWithGuardians" label="Liberar para os responsáveis na área da família" />
            <SubmitButton className="w-full">Gerar relatório</SubmitButton>
            <p className="text-xs text-ink-500">Frequência, atendimentos, objetivos e comparativo são preenchidos automaticamente com os dados do período.</p>
          </ActionForm>
        </Card>
      )}
    </div>
  );
}
