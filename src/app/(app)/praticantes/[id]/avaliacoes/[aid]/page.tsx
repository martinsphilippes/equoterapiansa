import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStaff, hasPermission } from "@/lib/auth/session";
import { getSettings } from "@/lib/db/settings";
import { Collections, getDoc } from "@/lib/db/collections";
import { getPractitionerFor, listProfessionals } from "@/lib/db/queries/practitioners";
import { Badge, Card, PageHeader } from "@/components/ui";
import { ActionForm } from "@/components/ui/ActionForm";
import { ConfirmButton } from "@/components/ui/ConfirmButton";
import { AssessmentForm } from "@/components/assessments/AssessmentForm";
import { deleteAssessment } from "@/lib/actions/assessments";
import { isoToBR, todayISO } from "@/lib/domain/dates";
import type { Params, SearchParams } from "@/lib/types";
import { sp1 } from "@/lib/types";

const TYPE = { initial: "Avaliação inicial", periodic: "Avaliação periódica", final: "Avaliação final" };

export default async function AssessmentPage({ params, searchParams }: { params: Params<{ id: string; aid: string }>; searchParams: SearchParams }) {
  const user = await requireStaff();
  const { id, aid } = await params;
  const sp = await searchParams;
  const [p, a, settings] = await Promise.all([getPractitionerFor(user, id), getDoc(Collections.assessments(), aid), getSettings()]);
  if (!p || !a || a.practitionerId !== id) notFound();
  const canEdit = hasPermission(user, "assessments.record") && (user.role !== "professional" || a.professionalId === user.collaboratorId);
  if (sp1(sp, "editar") === "1" && canEdit) {
    const professionals = await listProfessionals();
    const scale = Array.from({ length: a.scaleMax }, (_, i) => settings.scale.find((l) => l.value === i + 1) ?? { value: i + 1, label: String(i + 1) });
    return (
      <div className="max-w-3xl">
        <PageHeader title={`Editar · ${TYPE[a.type]}`} back={`/praticantes/${id}/avaliacoes/${aid}`} />
        <AssessmentForm practitionerId={id} assessment={a} categories={a.categoriesSnapshot} scale={scale} professionals={professionals} lockProfessional={user.role === "professional"} defaultType={a.type} today={todayISO(settings.timezone)} />
      </div>
    );
  }
  const scaleLabel = (v: number | null) => v === null ? "—" : `${v} · ${settings.scale.find((l) => l.value === v)?.label ?? ""}`;
  return (
    <div className="space-y-4">
      <PageHeader title={TYPE[a.type]} subtitle={`${isoToBR(a.date)} · ${a.professionalName}`} back={`/praticantes/${id}/avaliacoes`} actions={<>
        {canEdit && <Link prefetch={false} href={`/praticantes/${id}/avaliacoes/${aid}?editar=1`} className="inline-flex items-center h-9 px-3 rounded-xl border border-border bg-surface text-sm">Editar</Link>}
        {hasPermission(user, "practitioners.manage") && <ActionForm action={deleteAssessment}><input type="hidden" name="id" value={aid} /><ConfirmButton message="Excluir esta avaliação? Esta ação fica registrada na auditoria." variant="ghost" size="sm" className="text-red-700">Excluir</ConfirmButton></ActionForm>}
      </>} />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="rounded-2xl bg-primary-600 text-white p-4"><p className="text-xs uppercase tracking-wide opacity-80">Média geral</p><p className="text-3xl font-semibold">{a.overallAverage ?? "—"}<span className="text-base opacity-80">/{a.scaleMax}</span></p></div>
      </div>
      {a.categoriesSnapshot.map((c) => (
        <Card key={c.id} title={<span className="flex items-center gap-2">{c.name} <Badge tone="green">média {a.categoryAverages[c.id] ?? "—"}</Badge></span>}>
          <ul className="divide-y divide-border -my-2">
            {c.items.map((it) => {
              const s = a.scores[it.id];
              return (
                <li key={it.id} className="py-2.5 flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0"><p className="text-sm font-medium">{it.name}</p>{s?.note && <p className="text-sm text-ink-500 mt-0.5">“{s.note}”</p>}</div>
                  <span className={`text-sm font-semibold ${s?.score ? "text-primary-800" : "text-ink-300"}`}>{scaleLabel(s?.score ?? null)}</span>
                </li>
              );
            })}
          </ul>
        </Card>
      ))}
      {a.generalNotes && <Card title="Observações gerais"><p className="text-sm whitespace-pre-wrap">{a.generalNotes}</p></Card>}
    </div>
  );
}
