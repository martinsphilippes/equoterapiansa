"use client";
import { useState } from "react";
import { ActionForm } from "@/components/ui/ActionForm";
import { SubmitButton } from "@/components/ui/FormStatus";
import { Card, Field, Input, Select } from "@/components/ui";
import { createStaffAccess, grantCollaboratorAccess, grantGuardianAccess } from "@/lib/actions/users";

export interface PersonOption { id: string; name: string; email?: string; hint?: string }

type Mode = "novo" | "colaborador" | "responsavel";

/**
 * Criação de acesso direto na tela de Usuários, nos três caminhos possíveis:
 * pessoa nova (cadastra o colaborador junto), colaborador já cadastrado e
 * responsável. A senha provisória permanece visível após a criação.
 */
export function AddUserForm({ collaborators, guardians, jobRoles, isOwner }: { collaborators: PersonOption[]; guardians: PersonOption[]; jobRoles: PersonOption[]; isOwner: boolean }) {
  const [mode, setMode] = useState<Mode>("novo");
  const [collaboratorId, setCollaboratorId] = useState("");
  const [guardianId, setGuardianId] = useState("");
  const chosenCollaborator = collaborators.find((c) => c.id === collaboratorId);
  const chosenGuardian = guardians.find((g) => g.id === guardianId);
  const tabs: [Mode, string][] = [["novo", "Nova pessoa"], ["colaborador", `Colaborador sem acesso (${collaborators.length})`], ["responsavel", `Responsável sem acesso (${guardians.length})`]];
  const roleOptions = (
    <>
      {isOwner && <option value="manager">Gerente</option>}
      <option value="professional">Profissional (atendimento)</option>
      <option value="staff">Apoio</option>
    </>
  );
  return (
    <Card title="Adicionar usuário">
      <div className="flex flex-wrap gap-2 mb-4">
        {tabs.map(([v, label]) => (
          <button key={v} type="button" onClick={() => setMode(v)}
            className={`px-3 py-1.5 rounded-full text-sm font-semibold ${mode === v ? "bg-primary text-white" : "bg-surface border border-border"}`}>{label}</button>
        ))}
      </div>

      {mode === "novo" && (
        <ActionForm action={createStaffAccess} className="space-y-3" keepOnSuccess>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Nome completo"><Input name="name" required autoComplete="off" /></Field>
            <Field label="E-mail de acesso"><Input name="email" type="email" required autoComplete="off" /></Field>
            <Field label="Perfil"><Select name="role" defaultValue="staff">{roleOptions}</Select></Field>
            <Field label="Função (opcional)"><Select name="jobRoleId"><option value="">—</option>{jobRoles.map((j) => <option key={j.id} value={j.id}>{j.name}</option>)}</Select></Field>
            <Field label="Senha provisória (opcional)" hint="Deixe em branco para o sistema gerar."><Input name="password" type="text" minLength={8} autoComplete="off" /></Field>
          </div>
          <p className="text-xs text-ink-500">A pessoa também é cadastrada na equipe, para registrar jornada e pagamentos. Complete os demais dados depois em Equipe.</p>
          <SubmitButton>Criar acesso</SubmitButton>
        </ActionForm>
      )}

      {mode === "colaborador" && (
        collaborators.length === 0 ? <p className="text-sm text-ink-500">Todos os colaboradores ativos já possuem acesso.</p> : (
          <ActionForm action={grantCollaboratorAccess} className="space-y-3" keepOnSuccess>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Colaborador">
                <Select name="collaboratorId" value={collaboratorId} onChange={(e) => setCollaboratorId(e.target.value)} required>
                  <option value="">Selecione…</option>
                  {collaborators.map((c) => <option key={c.id} value={c.id}>{c.name}{c.hint ? ` · ${c.hint}` : ""}</option>)}
                </Select>
              </Field>
              <Field label="Perfil"><Select name="role" defaultValue="staff">{roleOptions}</Select></Field>
              <Field label="E-mail de acesso"><Input name="email" type="email" defaultValue={chosenCollaborator?.email ?? ""} key={collaboratorId} required autoComplete="off" /></Field>
              <Field label="Senha provisória (opcional)"><Input name="password" type="text" minLength={8} autoComplete="off" /></Field>
            </div>
            <SubmitButton>Criar acesso</SubmitButton>
          </ActionForm>
        )
      )}

      {mode === "responsavel" && (
        guardians.length === 0 ? <p className="text-sm text-ink-500">Todos os responsáveis cadastrados já possuem acesso.</p> : (
          <ActionForm action={grantGuardianAccess} className="space-y-3" keepOnSuccess>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Responsável">
                <Select name="guardianId" value={guardianId} onChange={(e) => setGuardianId(e.target.value)} required>
                  <option value="">Selecione…</option>
                  {guardians.map((g) => <option key={g.id} value={g.id}>{g.name}{g.hint ? ` · ${g.hint}` : ""}</option>)}
                </Select>
              </Field>
              <Field label="E-mail de acesso"><Input name="email" type="email" defaultValue={chosenGuardian?.email ?? ""} key={guardianId} required autoComplete="off" /></Field>
              <Field label="Senha provisória (opcional)"><Input name="password" type="text" minLength={8} autoComplete="off" /></Field>
            </div>
            <p className="text-xs text-ink-500">O responsável vê apenas os praticantes vinculados a ele.</p>
            <SubmitButton>Criar acesso</SubmitButton>
          </ActionForm>
        )
      )}
    </Card>
  );
}
