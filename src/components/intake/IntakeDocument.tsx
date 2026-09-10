import { INTAKE_CONSENTS, INTAKE_DECLARATIONS, INTAKE_PRIVACY, INTAKE_SECTIONS, INTAKE_SIGNATURE_FIELDS, INTAKE_TITLE, ageOn, answerLabel } from "@/lib/domain/intake";
import { isoToBR, formatDateTime } from "@/lib/domain/dates";
import type { IntakeSubmission } from "@/lib/db/types";

/** Documento completo da ficha, na ordem do papel. É esta marcação que sai na impressão. */
export function IntakeDocument({ submission, orgName, today }: { submission: IntakeSubmission; orgName: string; today: string }) {
  const a = submission.answers;
  const age = submission.birthDate ? ageOn(submission.birthDate, today) : null;
  return (
    <article className="bg-surface rounded-2xl border border-border p-6 print:border-0 print:p-0 print:rounded-none">
      <header className="border-b border-border pb-4 mb-5">
        <p className="text-xs uppercase tracking-wide text-ink-500">{orgName}</p>
        <h1 className="text-xl font-extrabold text-ink-900">{INTAKE_TITLE}</h1>
        <p className="text-sm text-ink-500 mt-1">
          Protocolo {submission.protocol} · enviado em {formatDateTime(submission.submittedAt)}
          {submission.internal?.checkedBy ? ` · conferido por ${submission.internal.checkedBy}` : ""}
        </p>
      </header>

      {INTAKE_SECTIONS.map((section) => {
        if (section.minorOnly && !submission.minor) return null;
        return (
          <section key={section.id} className="mb-5 break-inside-avoid">
            <h2 className="text-sm font-extrabold uppercase tracking-wide text-primary-700 mb-2">{section.title}</h2>
            <dl className="divide-y divide-border">
              {section.fields.map((f) => {
                const value = answerLabel(f, a[f.id]);
                const note = a[`${f.id}_obs`];
                return (
                  <div key={f.id} className="py-1.5 flex gap-4 text-sm">
                    <dt className="text-ink-500 flex-1">{f.label}</dt>
                    <dd className="text-ink-900 font-medium text-right max-w-[55%] whitespace-pre-wrap">
                      {value}{note ? <span className="block text-ink-700 font-normal">{note}</span> : null}
                    </dd>
                  </div>
                );
              })}
              {section.id === "aluno" && age !== null && (
                <div className="py-1.5 flex gap-4 text-sm"><dt className="text-ink-500 flex-1">Idade</dt><dd className="text-ink-900 font-medium">{age} anos</dd></div>
              )}
            </dl>
            {section.notice && <p className="mt-2 text-xs text-ink-700">{section.notice}</p>}
          </section>
        );
      })}

      <section className="mb-5 break-inside-avoid">
        <h2 className="text-sm font-extrabold uppercase tracking-wide text-primary-700 mb-2">Termo de declaração de saúde e aptidão</h2>
        <ul className="text-sm text-ink-700 space-y-1 list-disc pl-5">
          {INTAKE_DECLARATIONS.map((d) => <li key={d}>{d}</li>)}
        </ul>
        <p className="text-sm text-ink-700 mt-2">{INTAKE_PRIVACY}</p>
        <dl className="divide-y divide-border mt-3">
          {[...INTAKE_SIGNATURE_FIELDS, ...INTAKE_CONSENTS.filter((c) => c.id !== "aceite_autorizacao" || submission.minor)].map((f) => (
            <div key={f.id} className="py-1.5 flex gap-4 text-sm">
              <dt className="text-ink-500 flex-1">{f.label}</dt>
              <dd className="text-ink-900 font-medium text-right">{answerLabel(f, a[f.id])}</dd>
            </div>
          ))}
        </dl>
        <p className="text-xs text-ink-500 mt-2">
          Aceite eletrônico registrado em {formatDateTime(submission.submittedAt)} por {a.assin_nome ?? "—"}
          {a.assin_cpf ? `, CPF ${a.assin_cpf}` : ""}.
        </p>
      </section>

      <section className="break-inside-avoid">
        <h2 className="text-sm font-extrabold uppercase tracking-wide text-primary-700 mb-3">Assinaturas</h2>
        <div className="grid grid-cols-2 gap-8 text-xs text-ink-500">
          <div className="pt-10 border-t border-ink-300">Praticante — {submission.practitionerName}</div>
          <div className="pt-10 border-t border-ink-300">Responsável legal{submission.guardianName ? ` — ${submission.guardianName}` : ""}</div>
          <div className="pt-10 border-t border-ink-300">Responsável pela instituição</div>
          <div className="pt-10 border-t border-ink-300">Data</div>
        </div>
      </section>

      {submission.internal && (
        <section className="mt-5 break-inside-avoid border-t border-border pt-4">
          <h2 className="text-sm font-extrabold uppercase tracking-wide text-primary-700 mb-2">Uso interno</h2>
          <dl className="divide-y divide-border text-sm">
            <div className="py-1.5 flex gap-4"><dt className="text-ink-500 flex-1">Cadastro conferido por</dt><dd className="font-medium">{submission.internal.checkedBy ?? "—"}{submission.internal.checkedAt ? ` · ${formatDateTime(submission.internal.checkedAt)}` : ""}</dd></div>
            <div className="py-1.5 flex gap-4"><dt className="text-ink-500 flex-1">Documentação médica apresentada</dt><dd className="font-medium">{submission.internal.medicalDocs ? "Sim" : "Não"}</dd></div>
            <div className="py-1.5 flex gap-4"><dt className="text-ink-500 flex-1">Atestado / liberação médica</dt><dd className="font-medium">{submission.internal.medicalRelease === "sim" ? "Sim" : submission.internal.medicalRelease === "nao" ? "Não" : "Não se aplica"}</dd></div>
            <div className="py-1.5 flex gap-4"><dt className="text-ink-500 flex-1">Necessita acompanhamento ou adaptação</dt><dd className="font-medium">{submission.internal.needsSupport ? "Sim" : "Não"}</dd></div>
            {submission.internal.notes && <div className="py-1.5 flex gap-4"><dt className="text-ink-500 flex-1">Observações</dt><dd className="font-medium text-right max-w-[55%] whitespace-pre-wrap">{submission.internal.notes}</dd></div>}
          </dl>
        </section>
      )}

      <footer className="hidden print:block mt-6 pt-3 border-t border-border text-xs text-ink-500">
        {orgName} · ficha {submission.protocol} · impresso em {isoToBR(today)}
      </footer>
    </article>
  );
}
