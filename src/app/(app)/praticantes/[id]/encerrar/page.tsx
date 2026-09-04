import { notFound, redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/session";
import { getSettings } from "@/lib/db/settings";
import { getPractitionerFor, assessmentsOfPractitioner } from "@/lib/db/queries/practitioners";
import { Alert, Card, Checkbox, Field, Input, PageHeader, Select, Textarea } from "@/components/ui";
import { ActionForm } from "@/components/ui/ActionForm";
import { ConfirmButton } from "@/components/ui/ConfirmButton";
import { closePractitioner } from "@/lib/actions/assessments";
import { compareAssessments } from "@/lib/domain/assessments";
import { ComparisonTable } from "@/components/assessments/ComparisonTable";
import { isoToBR, todayISO } from "@/lib/domain/dates";
import type { Params } from "@/lib/types";

export default async function ClosePractitionerPage({ params }: { params: Params<{ id: string }> }) {
  const user = await requirePermission("practitioners.manage");
  const { id } = await params;
  const [p, settings, assessments] = await Promise.all([getPractitionerFor(user, id), getSettings(), assessmentsOfPractitioner(id)]);
  if (!p) notFound();
  if (p.status === "closed") redirect(`/praticantes/${id}`);
  const initial = assessments.find((a) => a.type === "initial") ?? assessments[0] ?? null;
  const last = assessments.length > 1 ? assessments[assessments.length - 1] : null;
  const cmp = compareAssessments(initial, last);
  const TYPE = { initial: "Inicial", periodic: "Periódica", final: "Final" };
  return (
    <div className="max-w-3xl space-y-5">
      <PageHeader title={`Encerrar acompanhamento · ${p.name}`} back={`/praticantes/${id}`} />
      <Alert tone="info">O sistema não decide sobre alta terapêutica. Esta tela apenas registra a decisão dos profissionais responsáveis, com as evidências acumuladas.</Alert>
      {initial && (
        <Card title="Evolução desde a entrada">
          {last ? <ComparisonTable rows={cmp.rows} overall={cmp.overall} max={Math.max(initial.scaleMax, last.scaleMax)} labels={{ initial: isoToBR(initial.date), current: isoToBR(last.date) }} /> : <p className="text-sm text-ink-500">Há apenas uma avaliação registrada. Considere registrar uma avaliação final antes de encerrar.</p>}
        </Card>
      )}
      <Card title="Registro do encerramento">
        <ActionForm action={closePractitioner} className="space-y-4">
          <input type="hidden" name="id" value={id} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Data"><Input type="date" name="date" defaultValue={todayISO(settings.timezone)} required /></Field>
            <Field label="Avaliação final (se registrada)">
              <Select name="finalAssessmentId" defaultValue={assessments.find((a) => a.type === "final")?.id ?? ""}><option value="">Nenhuma</option>{assessments.map((a) => <option key={a.id} value={a.id}>{isoToBR(a.date)} · {TYPE[a.type]}</option>)}</Select>
            </Field>
            <Field label="Motivo" className="sm:col-span-2"><Input name="reason" required placeholder="Ex.: objetivos alcançados; mudança de cidade; encaminhamento" /></Field>
            <Field label="Observações" className="sm:col-span-2"><Textarea name="notes" /></Field>
          </div>
          <div className="space-y-2">
            <Checkbox name="generateReport" label="Gerar relatório final automaticamente (entrada até hoje)" defaultChecked />
            <Checkbox name="shareReport" label="Liberar o relatório final para os responsáveis" />
          </div>
          <p className="text-xs text-ink-500">Agendamentos futuros serão cancelados. Responsável pela decisão: <b>{user.name}</b>.</p>
          <ConfirmButton message="Confirmar o encerramento do acompanhamento?" variant="danger">Encerrar acompanhamento</ConfirmButton>
        </ActionForm>
      </Card>
    </div>
  );
}
