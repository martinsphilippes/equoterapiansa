import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission, hasPermission } from "@/lib/auth/session";
import { Collections, getDoc, getMany } from "@/lib/db/collections";
import { Badge, Card, DescriptionList, Field, Input, LinkButton, PageHeader } from "@/components/ui";
import { ActionForm } from "@/components/ui/ActionForm";
import { SubmitButton } from "@/components/ui/FormStatus";
import { ConfirmButton } from "@/components/ui/ConfirmButton";
import { grantGuardianAccess, resetUserPassword, setUserActive } from "@/lib/actions/users";
import { formatCPF, formatPhone } from "@/lib/domain/format";
import type { Params } from "@/lib/types";

export default async function GuardianPage({ params }: { params: Params<{ id: string }> }) {
  const user = await requirePermission(["practitioners.view", "practitioners.manage"]);
  const { id } = await params;
  const g = await getDoc(Collections.guardians(), id);
  if (!g) notFound();
  const [practitioners, account] = await Promise.all([getMany(Collections.practitioners(), g.practitionerIds), g.userId ? getDoc(Collections.users(), g.userId) : null]);
  const canManage = hasPermission(user, "practitioners.manage");
  const canUsers = hasPermission(user, "users.manage") || canManage;
  return (
    <div>
      <PageHeader back="/responsaveis" title={g.name} subtitle={g.relationship} actions={canManage && <LinkButton href={`/responsaveis/${id}/editar`} variant="outline">Editar</LinkButton>} />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          <Card title="Dados">
            <DescriptionList items={[
              { label: "CPF", value: formatCPF(g.cpf) },
              { label: "Telefone", value: formatPhone(g.phone) },
              { label: "E-mail", value: g.email ?? "—" },
              { label: "Endereço", value: g.address ?? "—" },
            ]} />
          </Card>
          <Card title="Praticantes">
            {practitioners.length === 0 ? <p className="text-sm text-ink-500">Nenhum praticante vinculado.</p> : (
              <ul className="divide-y divide-border">{practitioners.map((p) => <li key={p.id} className="py-2"><Link href={`/praticantes/${p.id}`} className="font-medium hover:underline">{p.name}</Link></li>)}</ul>
            )}
          </Card>
        </div>
        <div className="space-y-5">
          <Card title="Acesso ao aplicativo (área da família)">
            {account ? (
              <div className="space-y-3">
                <p className="text-sm">{account.email}</p>
                {account.active ? <Badge tone="green">Ativo</Badge> : <Badge tone="red">Desativado</Badge>}
                <p className="text-xs text-ink-500">Este responsável vê somente os praticantes vinculados a ele.</p>
                {canUsers && (
                  <div className="flex flex-wrap gap-2">
                    <ActionForm action={resetUserPassword}><input type="hidden" name="userId" value={account.id} /><ConfirmButton message="Gerar nova senha provisória?" size="sm" variant="outline">Nova senha</ConfirmButton></ActionForm>
                    <ActionForm action={setUserActive}><input type="hidden" name="userId" value={account.id} /><input type="hidden" name="active" value={account.active ? "0" : "1"} /><ConfirmButton message={account.active ? "Desativar o acesso?" : "Reativar o acesso?"} size="sm" variant={account.active ? "danger" : "secondary"}>{account.active ? "Desativar" : "Reativar"}</ConfirmButton></ActionForm>
                  </div>
                )}
              </div>
            ) : canUsers ? (
              <ActionForm action={grantGuardianAccess} className="space-y-3" keepOnSuccess>
                <input type="hidden" name="guardianId" value={g.id} />
                <Field label="E-mail de acesso"><Input name="email" type="email" defaultValue={g.email ?? ""} required /></Field>
                <Field label="Senha provisória (opcional)"><Input name="password" type="text" minLength={8} autoComplete="off" /></Field>
                <SubmitButton size="sm">Liberar acesso</SubmitButton>
                <p className="text-xs text-ink-500">Anote a senha provisória exibida após a liberação.</p>
              </ActionForm>
            ) : <p className="text-sm text-ink-500">Sem acesso liberado.</p>}
          </Card>
        </div>
      </div>
    </div>
  );
}
