import { INTAKE_DOCS, INTAKE_PRIVACY, INTAKE_SECTIONS, INTAKE_SIGNATURE_FIELDS, INTAKE_TITLE, IMAGE_PURPOSE_IDS, ageOn, answerLabel, withOrg } from "@/lib/domain/intake";
import { isoToBR, formatDateTime } from "@/lib/domain/dates";
import type { IntakeSubmission } from "@/lib/db/types";

/** Linha de resposta, no formato rótulo à esquerda e valor à direita. */
function Row({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="py-1.5 flex gap-4 text-sm">
      <dt className="text-ink-500 flex-1">{label}</dt>
      <dd className="text-ink-900 font-medium text-right max-w-[55%] whitespace-pre-wrap">
        {value}{note ? <span className="block text-ink-700 font-normal">{note}</span> : null}
      </dd>
    </div>
  );
}

/** Bloco de identificação repetido nos documentos seguintes, como no papel. */
function Identification({ submission }: { submission: IntakeSubmission }) {
  const a = submission.answers;
  return (
    <dl className="divide-y divide-border mb-4">
      <Row label="Nome completo" value={submission.practitionerName} />
      <Row label="Data de nascimento" value={submission.birthDate ? isoToBR(submission.birthDate) : "—"} />
      <Row label="CPF" value={a.cpf || "—"} />
      <Row label="Telefone / WhatsApp" value={a.telefone || "—"} />
      {submission.minor && <Row label="Responsável legal" value={`${a.resp_nome ?? "—"}${a.resp_parentesco ? ` (${a.resp_parentesco})` : ""}`} note={[a.resp_cpf && `CPF ${a.resp_cpf}`, a.resp_telefone].filter(Boolean).join(" · ") || undefined} />}
    </dl>
  );
}

/** Linhas de assinatura ao pé de cada documento. */
function Signatures({ submission }: { submission: IntakeSubmission }) {
  return (
    <div className="grid grid-cols-2 gap-8 text-xs text-ink-500 mt-4">
      <div className="pt-10 border-t border-ink-300">Praticante — {submission.practitionerName}</div>
      <div className="pt-10 border-t border-ink-300">Responsável legal{submission.guardianName ? ` — ${submission.guardianName}` : ""}</div>
      <div className="pt-10 border-t border-ink-300">Responsável pela instituição</div>
      <div className="pt-10 border-t border-ink-300">Data</div>
    </div>
  );
}

/** Os três documentos preenchidos, na ordem do papel. É esta marcação que sai na impressão. */
export function IntakeDocument({ submission, orgName, today }: { submission: IntakeSubmission; orgName: string; today: string }) {
  const a = submission.answers;
  const age = submission.birthDate ? ageOn(submission.birthDate, today) : null;
  const allowsImage = a.img_autoriza === "sim";
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

      {INTAKE_DOCS.map((doc, index) => {
        const sections = INTAKE_SECTIONS.filter((s) => s.doc === doc.id && (!s.minorOnly || submission.minor));
        return (
          <section key={doc.id} className={index > 0 ? "print:break-before-page pt-6 mt-6 border-t border-border print:border-0 print:pt-0" : ""}>
            <h2 className="text-base font-extrabold text-ink-900 mb-1">{index + 1}. {doc.title}</h2>
            <p className="text-xs text-ink-500 mb-4">{doc.purpose}</p>
            {index > 0 && <Identification submission={submission} />}

            {sections.map((section) => (
              <div key={section.id} className="mb-5 break-inside-avoid">
                <h3 className="text-sm font-extrabold uppercase tracking-wide text-primary-700 mb-2">{section.title}</h3>
                <dl className="divide-y divide-border">
                  {section.fields
                    .filter((f) => !IMAGE_PURPOSE_IDS.includes(f.id) || allowsImage)
                    .map((f) => (
                      <Row key={f.id} label={withOrg(f.label, orgName)}
                        // As cinco finalidades saem sempre listadas, como no papel, marcadas uma a uma.
                        value={IMAGE_PURPOSE_IDS.includes(f.id) ? (a[f.id] === "sim" ? "Autorizado" : "Não autorizado") : answerLabel(f, a[f.id])}
                        note={a[`${f.id}_obs`]} />
                    ))}
                  {section.id === "aluno" && age !== null && <Row label="Idade" value={`${age} anos`} />}
                  {section.id === "imagem_uso" && !allowsImage && <Row label="Finalidades" value="Não autorizadas" />}
                </dl>
                {section.notice && <p className="mt-2 text-xs text-ink-700">{section.notice}</p>}
              </div>
            ))}

            <div className="break-inside-avoid">
              <h3 className="text-sm font-extrabold uppercase tracking-wide text-primary-700 mb-2">Declaração</h3>
              <ul className="text-sm text-ink-700 space-y-1 list-disc pl-5">
                {doc.declarations.map((d) => <li key={d}>{withOrg(d, orgName)}</li>)}
              </ul>
              {doc.id === "ficha" && <p className="text-sm text-ink-700 mt-2">{INTAKE_PRIVACY}</p>}
              {doc.closing?.map((c) => <p key={c} className="text-sm text-ink-700 mt-2">{withOrg(c, orgName)}</p>)}
              <dl className="divide-y divide-border mt-3">
                {doc.consents
                  .filter((c) => (c.id !== "aceite_autorizacao" || submission.minor) && (c.id !== "img_declaracao" || allowsImage))
                  .map((f) => <Row key={f.id} label={withOrg(f.label, orgName)} value={answerLabel(f, a[f.id])} />)}
                {index === 0 && INTAKE_SIGNATURE_FIELDS.map((f) => <Row key={f.id} label={f.label} value={answerLabel(f, a[f.id])} />)}
              </dl>
              <p className="text-xs text-ink-500 mt-2">
                Aceite eletrônico registrado em {formatDateTime(submission.submittedAt)} por {a.assin_nome ?? "—"}
                {a.assin_cpf ? `, CPF ${a.assin_cpf}` : ""}.
              </p>
              <Signatures submission={submission} />
            </div>
          </section>
        );
      })}

      {submission.internal && (
        <section className="mt-6 pt-4 border-t border-border break-inside-avoid">
          <h2 className="text-sm font-extrabold uppercase tracking-wide text-primary-700 mb-2">Uso interno</h2>
          <dl className="divide-y divide-border text-sm">
            <Row label="Cadastro conferido por" value={`${submission.internal.checkedBy ?? "—"}${submission.internal.checkedAt ? ` · ${formatDateTime(submission.internal.checkedAt)}` : ""}`} />
            <Row label="Documentação médica apresentada" value={submission.internal.medicalDocs ? "Sim" : "Não"} />
            <Row label="Atestado / liberação médica" value={submission.internal.medicalRelease === "sim" ? "Sim" : submission.internal.medicalRelease === "nao" ? "Não" : "Não se aplica"} />
            <Row label="Necessita acompanhamento ou adaptação" value={submission.internal.needsSupport ? "Sim" : "Não"} note={submission.internal.supportDescription || undefined} />
            <Row label="Status do cadastro" value={submission.internal.registryStatus === "aprovado" ? "Aprovado" : submission.internal.registryStatus === "avaliacao" ? "Necessita avaliação" : "Pendente"} />
            {submission.internal.notes && <Row label="Observações da equipe" value={submission.internal.notes} />}
          </dl>
        </section>
      )}

      <footer className="hidden print:block mt-6 pt-3 border-t border-border text-xs text-ink-500">
        {orgName} · ficha {submission.protocol} · impresso em {isoToBR(today)}
      </footer>
    </article>
  );
}
