"use client";
import { useState } from "react";
import { ActionForm } from "@/components/ui/ActionForm";
import { SubmitButton } from "@/components/ui/FormStatus";
import { Field, Input, Select, Textarea } from "@/components/ui";
import { createAnnouncement } from "@/lib/actions/announcements";

export function AnnouncementForm({ guardians, practitioners }: { guardians: { id: string; name: string }[]; practitioners: { id: string; name: string }[] }) {
  const [audience, setAudience] = useState("all");
  return (
    <ActionForm action={createAnnouncement} className="space-y-4">
      <Field label="Para quem">
        <Select name="audience" value={audience} onChange={(e) => setAudience(e.target.value)}>
          <option value="all">Todos (equipe e responsáveis)</option>
          <option value="staff">Somente a equipe</option>
          <option value="guardians">Todos os responsáveis</option>
          <option value="guardian">Um responsável específico</option>
          <option value="practitioner">Responsáveis de um praticante</option>
        </Select>
      </Field>
      {audience === "guardian" && <Field label="Responsável"><Select name="guardianId" required><option value="">Selecione…</option>{guardians.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}</Select></Field>}
      {audience === "practitioner" && <Field label="Praticante"><Select name="practitionerId" required><option value="">Selecione…</option>{practitioners.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</Select></Field>}
      <Field label="Título"><Input name="title" required placeholder="Ex.: Não haverá atendimento na sexta-feira" /></Field>
      <Field label="Mensagem"><Textarea name="body" required className="min-h-32" /></Field>
      <SubmitButton size="lg">Enviar comunicado</SubmitButton>
    </ActionForm>
  );
}
