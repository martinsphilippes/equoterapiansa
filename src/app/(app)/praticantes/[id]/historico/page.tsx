import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStaff, hasAny } from "@/lib/auth/session";
import { getPractitionerFor } from "@/lib/db/queries/practitioners";
import { timelineOf } from "@/lib/db/queries/reports";
import { Card, EmptyState, Field, Input, Textarea } from "@/components/ui";
import { ActionForm } from "@/components/ui/ActionForm";
import { SubmitButton } from "@/components/ui/FormStatus";
import { addPractitionerNote } from "@/lib/actions/practitioners";
import { Timeline } from "@/components/practitioners/Timeline";
import type { Params } from "@/lib/types";

export default async function HistoryPage({ params }: { params: Params<{ id: string }> }) {
  const user = await requireStaff();
  const { id } = await params;
  const p = await getPractitionerFor(user, id);
  if (!p) notFound();
  const items = await timelineOf(id);
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      <div className="lg:col-span-2">
        <Card title="Linha do tempo">
          {items.length === 0 ? <EmptyState title="Sem registros" /> : <Timeline items={items} />}
        </Card>
      </div>
      {hasAny(user, ["practitioners.manage", "sessions.record"]) && (
        <Card title="Adicionar registro à linha do tempo">
          <ActionForm action={addPractitionerNote} className="space-y-3" resetOnSuccess>
            <input type="hidden" name="id" value={id} />
            <Field label="Data"><Input type="date" name="date" defaultValue={new Date().toISOString().slice(0, 10)} /></Field>
            <Field label="Título"><Input name="title" required placeholder="Ex.: Reunião com a família" /></Field>
            <Field label="Descrição"><Textarea name="description" className="min-h-16" /></Field>
            <SubmitButton variant="outline">Adicionar</SubmitButton>
          </ActionForm>
          <p className="text-xs text-ink-500 mt-3">Atendimentos, avaliações e relatórios entram automaticamente. <Link href={`/praticantes/${id}/atendimentos`} className="text-brand-700 hover:underline">Ver atendimentos</Link></p>
        </Card>
      )}
    </div>
  );
}
