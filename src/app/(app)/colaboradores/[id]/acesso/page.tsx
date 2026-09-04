import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth/session";
import { Collections, getDoc } from "@/lib/db/collections";
import { Alert, Card, Field, Input, Select, Badge } from "@/components/ui";
import { ActionForm } from "@/components/ui/ActionForm";
import { SubmitButton } from "@/components/ui/FormStatus";
import { ConfirmButton } from "@/components/ui/ConfirmButton";
import { grantCollaboratorAccess, resetUserPassword, setUserActive } from "@/lib/actions/users";
import { ROLE_LABELS } from "@/lib/auth/permissions";
import type { Params } from "@/lib/types";
import Link from "next/link";

export default async function CollaboratorAccessPage({ params }: { params: Params<{ id: string }> }) {
  const user = await requirePermission("users.manage");
  const { id } = await params;
  const c = await getDoc(Collections.collaborators(), id);
  if (!c) notFound();
  const account = c.userId ? await getDoc(Collections.users(), c.userId) : null;
  const jobRole = c.jobRoleId ? await getDoc(Collections.jobRoles(), c.jobRoleId) : null;

  return (
    <div className="max-w-xl space-y-5">
      {account ? (
        <Card title="Acesso ao sistema">
          <dl className="text-sm space-y-2">
            <div className="flex justify-between"><dt className="text-ink-500">E-mail</dt><dd>{account.email}</dd></div>
            <div className="flex justify-between"><dt className="text-ink-500">Perfil</dt><dd>{ROLE_LABELS[account.role]}</dd></div>
            <div className="flex justify-between"><dt className="text-ink-500">Situação</dt><dd>{account.active ? <Badge tone="green">Ativo</Badge> : <Badge tone="red">Desativado</Badge>}</dd></div>
          </dl>
          <p className="text-xs text-ink-500 mt-3">Para ajustar o perfil e as permissões detalhadas, use <Link href="/configuracoes/usuarios" className="text-brand-700 hover:underline">Configurações → Usuários</Link>.</p>
          <div className="flex flex-wrap gap-2 mt-4">
            <ActionForm action={resetUserPassword}>
              <input type="hidden" name="userId" value={account.id} />
              <ConfirmButton message="Gerar uma nova senha provisória? A senha atual deixará de funcionar." variant="outline" size="sm">Gerar nova senha provisória</ConfirmButton>
            </ActionForm>
            <ActionForm action={setUserActive}>
              <input type="hidden" name="userId" value={account.id} />
              <input type="hidden" name="active" value={account.active ? "0" : "1"} />
              <ConfirmButton message={account.active ? "Desativar o acesso deste colaborador?" : "Reativar o acesso?"} variant={account.active ? "danger" : "secondary"} size="sm">{account.active ? "Desativar acesso" : "Reativar acesso"}</ConfirmButton>
            </ActionForm>
          </div>
        </Card>
      ) : (
        <Card title="Liberar acesso ao sistema">
          {c.status === "terminated" ? <Alert tone="warning">Colaborador desligado não pode receber acesso.</Alert> : (
            <ActionForm action={grantCollaboratorAccess} className="space-y-4" keepOnSuccess>
              <input type="hidden" name="collaboratorId" value={c.id} />
              <Field label="E-mail de acesso"><Input name="email" type="email" defaultValue={c.email ?? ""} required /></Field>
              <Field label="Perfil" hint={jobRole?.isProfessional ? "A função cadastrada é de atendimento; sugerimos o perfil Profissional." : "Colaborador vê apenas a própria jornada e a agenda."}>
                <Select name="role" defaultValue={jobRole?.isProfessional ? "professional" : "staff"}>
                  <option value="staff">Colaborador</option>
                  <option value="professional">Profissional de atendimento</option>
                  {user.role === "owner" && <option value="manager">Gerente</option>}
                </Select>
              </Field>
              <Field label="Senha provisória (opcional)" hint="Se vazio, o sistema gera uma senha. O usuário deve trocá-la no primeiro acesso."><Input name="password" type="text" minLength={8} autoComplete="off" /></Field>
              <SubmitButton>Criar acesso</SubmitButton>
              <p className="text-xs text-ink-500">Anote a senha provisória exibida após a criação: ela não será mostrada novamente.</p>
            </ActionForm>
          )}
        </Card>
      )}
    </div>
  );
}
