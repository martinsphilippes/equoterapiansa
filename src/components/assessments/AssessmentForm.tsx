"use client";
import { useState } from "react";
import { ActionForm } from "@/components/ui/ActionForm";
import { SubmitButton } from "@/components/ui/FormStatus";
import { Card, Field, Input, Select, Textarea, cn } from "@/components/ui";
import { saveAssessment } from "@/lib/actions/assessments";
import type { Assessment, Collaborator, ScaleLevel } from "@/lib/db/types";

/**
 * Avaliação: uma linha por item, nota por botões (1 toque) e observação opcional.
 * Categorias colapsáveis para manter a tela leve no celular.
 */
export function AssessmentForm({ practitionerId, assessment, categories, scale, professionals, currentProfessionalId, lockProfessional, defaultType, today }: {
  practitionerId: string; assessment?: Assessment; categories: { id: string; name: string; items: { id: string; name: string }[] }[]; scale: ScaleLevel[]; professionals: Collaborator[]; currentProfessionalId?: string; lockProfessional: boolean; defaultType: Assessment["type"]; today: string;
}) {
  const [scores, setScores] = useState<Record<string, number | null>>(() => {
    const init: Record<string, number | null> = {};
    for (const [k, v] of Object.entries(assessment?.scores ?? {})) init[k] = v.score;
    return init;
  });
  const [openNotes, setOpenNotes] = useState<Set<string>>(new Set(Object.entries(assessment?.scores ?? {}).filter(([, v]) => v.note).map(([k]) => k)));
  const profId = assessment?.professionalId ?? currentProfessionalId ?? "";
  const filled = Object.values(scores).filter((v) => v !== null).length;
  const total = categories.reduce((a, c) => a + c.items.length, 0);

  return (
    <ActionForm action={saveAssessment} className="space-y-4">
      {assessment && <input type="hidden" name="id" value={assessment.id} />}
      <input type="hidden" name="practitionerId" value={practitionerId} />
      <Card>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <Field label="Tipo">
            <Select name="type" defaultValue={assessment?.type ?? defaultType}>
              <option value="initial">Avaliação inicial</option>
              <option value="periodic">Avaliação periódica</option>
              <option value="final">Avaliação final</option>
            </Select>
          </Field>
          <Field label="Data"><Input type="date" name="date" defaultValue={assessment?.date ?? today} required /></Field>
          <Field label="Profissional" className="col-span-2 sm:col-span-1">
            <Select name="professionalId" defaultValue={profId} disabled={lockProfessional} required>
              {professionals.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
            {lockProfessional && <input type="hidden" name="professionalId" value={profId} />}
          </Field>
        </div>
        <div className="mt-3 flex flex-wrap gap-2 text-xs text-ink-500">
          {scale.map((l) => <span key={l.value} className="rounded-full bg-sand-100 px-2 py-0.5"><b>{l.value}</b> {l.label}</span>)}
          <span className="ml-auto">{filled}/{total} itens avaliados</span>
        </div>
      </Card>

      {categories.map((c) => (
        <Card key={c.id} title={c.name}>
          <ul className="divide-y divide-ink-100 -my-2">
            {c.items.map((it) => (
              <li key={it.id} className="py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium">{it.name}</p>
                  <div className="flex gap-1">
                    {scale.map((l) => {
                      const on = scores[it.id] === l.value;
                      return (
                        <button key={l.value} type="button" title={l.label} onClick={() => setScores({ ...scores, [it.id]: on ? null : l.value })} className={cn("h-10 w-10 rounded-lg border text-sm font-semibold", on ? "bg-brand-600 border-brand-600 text-white" : "bg-white border-ink-100 text-ink-700 hover:bg-sand-100")}>{l.value}</button>
                      );
                    })}
                  </div>
                </div>
                <input type="hidden" name={`score_${it.id}`} value={scores[it.id] ?? ""} />
                {openNotes.has(it.id) ? (
                  <Textarea name={`note_${it.id}`} defaultValue={assessment?.scores[it.id]?.note ?? ""} className="mt-2 min-h-14 text-sm" placeholder="Observação qualitativa" />
                ) : (
                  <button type="button" className="mt-1 text-xs text-brand-700 hover:underline" onClick={() => setOpenNotes(new Set(openNotes).add(it.id))}>+ observação</button>
                )}
              </li>
            ))}
          </ul>
        </Card>
      ))}

      <Card title="Observações gerais">
        <Textarea name="generalNotes" defaultValue={assessment?.generalNotes ?? ""} />
      </Card>
      <div className="sticky bottom-20 md:bottom-4"><SubmitButton size="lg" className="w-full sm:w-auto shadow-lg">{assessment ? "Salvar alterações" : "Salvar avaliação"}</SubmitButton></div>
    </ActionForm>
  );
}
