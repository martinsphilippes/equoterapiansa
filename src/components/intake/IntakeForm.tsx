"use client";
import { useState } from "react";
import { ActionForm } from "@/components/ui/ActionForm";
import { SubmitButton } from "@/components/ui/FormStatus";
import { Card, Checkbox, Field, Input, Select, Textarea } from "@/components/ui";
import { submitIntake } from "@/lib/actions/intake";
import {
  IMAGE_PURPOSE_IDS, INTAKE_DOCS, INTAKE_PRIVACY, INTAKE_SECTIONS, INTAKE_SIGNATURE_FIELDS,
  ageOn, isMinorOn, withOrg, type IntakeField,
} from "@/lib/domain/intake";

/**
 * Formulário público dos três documentos. A identificação é pedida uma única vez
 * e vale para todos. A seção do responsável aparece sozinha quando a data de
 * nascimento indica menor de idade, e cada pergunta de saúde só pede observação
 * quando a resposta é sim.
 */
export function IntakeForm({ token, today, orgName }: { token: string; today: string; orgName: string }) {
  const [birthDate, setBirthDate] = useState("");
  const [yes, setYes] = useState<Record<string, boolean>>({});
  const age = birthDate ? ageOn(birthDate, today) : null;
  const minor = birthDate ? isMinorOn(birthDate, today) : false;
  const allowsImage = yes.img_autoriza ?? false;

  const renderField = (f: IntakeField) => {
    const wide = f.wide ? "sm:col-span-2" : "";
    if (f.type === "yesno") {
      const on = yes[f.id] ?? false;
      return (
        <div key={f.id} className={`${wide} rounded-xl border border-border bg-surface p-3`}>
          <p className="text-sm font-semibold text-ink-900">{f.label}</p>
          <div className="mt-2 flex gap-2">
            {([["nao", "Não"], ["sim", "Sim"]] as const).map(([v, l]) => (
              <label key={v} className={`px-4 py-1.5 rounded-full text-sm font-semibold cursor-pointer border ${(on ? "sim" : "nao") === v ? "bg-primary text-white border-primary" : "bg-surface border-border text-ink-700"}`}>
                <input type="radio" name={f.id} value={v} className="sr-only" defaultChecked={v === "nao"} onChange={() => setYes((s) => ({ ...s, [f.id]: v === "sim" }))} />
                {l}
              </label>
            ))}
          </div>
          {f.note && on && <div className="mt-3"><Field label={f.noteLabel ?? "Qual/observação"}><Input name={`${f.id}_obs`} /></Field></div>}
        </div>
      );
    }
    if (f.type === "choice") {
      return (
        <Field key={f.id} label={f.label} className={wide}>
          <Select name={f.id} defaultValue="" required={f.required}>
            <option value="">Selecione…</option>
            {(f.options ?? []).map((o) => <option key={o} value={o}>{o}</option>)}
          </Select>
        </Field>
      );
    }
    if (f.type === "textarea") return <Field key={f.id} label={f.label} className={wide}><Textarea name={f.id} className="min-h-20" /></Field>;
    if (f.type === "consent") return <Checkbox key={f.id} name={f.id} value="sim" label={withOrg(f.label, orgName)} className={`${wide} items-start`} required={f.required} />;
    if (f.id === "nascimento") {
      return <Field key={f.id} label={f.label} className={wide}><Input name={f.id} type="date" required={f.required} value={birthDate} onChange={(e) => setBirthDate(e.target.value)} /></Field>;
    }
    const type = f.type === "date" ? "date" : f.type === "email" ? "email" : f.type === "tel" ? "tel" : "text";
    const inputMode = f.type === "cpf" ? "numeric" : f.type === "tel" ? "tel" : undefined;
    return (
      <Field key={f.id} label={f.label} hint={f.hint} className={wide}>
        <Input name={f.id} type={type} inputMode={inputMode} placeholder={f.placeholder} required={f.required} />
      </Field>
    );
  };

  return (
    <ActionForm action={submitIntake} className="space-y-6">
      <input type="hidden" name="token" value={token} />
      <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden className="hidden" />

      {INTAKE_DOCS.map((doc, index) => {
        const sections = INTAKE_SECTIONS.filter((s) => s.doc === doc.id && (!s.minorOnly || minor));
        return (
          <section key={doc.id} className="space-y-4">
            <div className="flex items-baseline gap-3">
              <span className="h-7 w-7 shrink-0 rounded-full bg-primary text-white text-sm font-bold grid place-items-center">{index + 1}</span>
              <div>
                <h2 className="text-lg font-extrabold text-ink-900">{doc.title}</h2>
                <p className="text-sm text-ink-500">{doc.purpose}</p>
              </div>
            </div>

            {sections.map((section) => (
              <Card key={section.id} title={section.title}>
                {section.description && <p className="text-sm text-ink-500 -mt-2 mb-4">{section.description}</p>}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {section.fields
                    .filter((f) => !IMAGE_PURPOSE_IDS.includes(f.id) || allowsImage)
                    .map(renderField)}
                  {section.id === "aluno" && age !== null && (
                    <p className="sm:col-span-2 text-sm text-ink-700">Idade: <strong>{age} anos</strong>{minor ? " · menor de idade, preencha também os dados do responsável legal." : ""}</p>
                  )}
                  {section.id === "imagem_uso" && allowsImage && (
                    <p className="sm:col-span-2 text-xs text-ink-500">Marque as finalidades autorizadas. Deixar todas em branco equivale a não autorizar.</p>
                  )}
                </div>
                {section.notice && <p className="mt-4 text-xs text-ink-700 bg-warning-soft border border-amber-100 rounded-xl p-3">{section.notice}</p>}
              </Card>
            ))}

            <Card title={doc.id === "ficha" ? "Declaração de saúde e aptidão" : "Declaração"}>
              <ul className="space-y-2 text-sm text-ink-700 list-disc pl-5">
                {doc.declarations.map((d) => <li key={d}>{withOrg(d, orgName)}</li>)}
              </ul>
              {doc.commitments && (
                <>
                  <p className="mt-4 text-sm font-semibold text-ink-900">Comprometo-me a:</p>
                  <ul className="mt-2 space-y-2 text-sm text-ink-700 list-disc pl-5">
                    {doc.commitments.map((c) => <li key={c}>{withOrg(c, orgName)}</li>)}
                  </ul>
                </>
              )}
              {doc.id === "ficha" && <p className="mt-4 text-sm text-ink-700">{INTAKE_PRIVACY}</p>}
              {doc.closing?.map((c) => <p key={c} className="mt-3 text-sm text-ink-700">{withOrg(c, orgName)}</p>)}
              <div className="mt-5 grid grid-cols-1 gap-3">
                {doc.consents
                  .filter((c) => (c.id !== "aceite_autorizacao" || minor) && (c.id !== "img_declaracao" || allowsImage))
                  .map(renderField)}
              </div>
            </Card>
          </section>
        );
      })}

      <Card title="Identificação de quem preenche">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{INTAKE_SIGNATURE_FIELDS.map(renderField)}</div>
        <p className="mt-3 text-xs text-ink-500">Vale como assinatura eletrônica dos documentos acima, com data e hora do envio.</p>
      </Card>

      <div className="flex flex-col gap-3">
        <SubmitButton size="lg" pendingText="Enviando…">Enviar ficha</SubmitButton>
        <p className="text-xs text-ink-500">Ao enviar você recebe um número de protocolo. Guarde-o para conferir com a secretaria.</p>
      </div>
    </ActionForm>
  );
}
