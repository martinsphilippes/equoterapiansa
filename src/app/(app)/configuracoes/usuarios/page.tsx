import { requirePermission } from "@/lib/auth/session";
import { Collections, mapDocs } from "@/lib/db/collections";
import { Card, Badge } from "@/components/ui";
import { ActionForm } from "@/components/ui/ActionForm";
import { ConfirmButton } from "@/components/ui/ConfirmButton";
import { resetUserPassword, setUserActive } from "@/lib/actions/users";
import { effectivePermissions } from "@/lib/auth/session";
import { ROLE_LABELS } from "@/lib/auth/permissions";
import { PermissionsEditor } from "@/components/settings/PermissionsEditor";
import { AddUserForm } from "@/components/settings/AddUserForm";
import { listCollaborators } from "@/lib/db/queries/collaborators";
import { listOrganizations } from "@/lib/db/queries/orgs";
import { DEFAULT_ORG_ID } from "@/lib/db/org-context";
import { UserOrgForm } from "@/components/settings/UserOrgForm";

export default async function UsersPage() {
  const me = await requirePermission("users.manage");
  const [users, collaborators, guardianDocs, jobRoleDocs, orgs] = await Promise.all([
    mapDocs(await Collections.users().get()),
    listCollaborators({ status: "active" }),
    mapDocs(await Collections.guardians().get()),
    mapDocs(await Collections.jobRoles().get()),
    listOrganizations(),
  ]);
  const orgName = (id?: string) => orgs.find((o) => o.id === (id || DEFAULT_ORG_ID))?.name ?? (id || DEFAULT_ORG_ID);
  // Só a unidade em uso: usuários de outra empresa não aparecem aqui.
  const mine = (u: { orgId?: string }) => (u.orgId || DEFAULT_ORG_ID) === (me.activeOrgId || DEFAULT_ORG_ID);
  users.sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  const staff = users.filter((u) => u.role !== "guardian" && mine(u));
  const guardians = users.filter((u) => u.role === "guardian" && mine(u));
  const freeCollaborators = collaborators.filter((c) => !c.userId).map((c) => ({ id: c.id, name: c.name, email: c.email, hint: c.jobRoleName }));
  const freeGuardians = guardianDocs.filter((g) => !g.userId).sort((a, b) => a.name.localeCompare(b.name, "pt-BR")).map((g) => ({ id: g.id, name: g.name, email: g.email, hint: g.relationship }));
  const jobRoles = jobRoleDocs.sort((a, b) => a.name.localeCompare(b.name, "pt-BR")).map((j) => ({ id: j.id, name: j.name }));
  return (
    <div className="space-y-5">
      <AddUserForm collaborators={freeCollaborators} guardians={freeGuardians} jobRoles={jobRoles} isOwner={me.role === "owner"} />
      <Card title="Equipe">
        <ul className="divide-y divide-border">
          {staff.map((u) => (
            <li key={u.id} className="py-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-medium">{u.name} {u.id === me.id && <span className="text-xs text-ink-500">(você)</span>}</p>
                  <p className="text-sm text-ink-500">{u.email} · {ROLE_LABELS[u.role]} · {orgName(u.orgId)}{u.orgIds?.length ? ` (+${u.orgIds.length})` : ""}</p>
                </div>
                <div className="flex items-center gap-2">
                  {u.active ? <Badge tone="green">Ativo</Badge> : <Badge tone="red">Desativado</Badge>}
                  {u.id !== me.id && u.role !== "owner" && (
                    <>
                      <ActionForm action={resetUserPassword}><input type="hidden" name="userId" value={u.id} /><ConfirmButton message="Gerar nova senha provisória?" size="sm" variant="ghost">Nova senha</ConfirmButton></ActionForm>
                      <ActionForm action={setUserActive}><input type="hidden" name="userId" value={u.id} /><input type="hidden" name="active" value={u.active ? "0" : "1"} /><ConfirmButton message={u.active ? "Desativar este acesso?" : "Reativar este acesso?"} size="sm" variant="ghost">{u.active ? "Desativar" : "Reativar"}</ConfirmButton></ActionForm>
                    </>
                  )}
                </div>
              </div>
              {me.role === "owner" && u.role !== "owner" && (
                <>
                  <PermissionsEditor userId={u.id} role={u.role} current={effectivePermissions(u)} />
                  {orgs.length > 1 && <UserOrgForm userId={u.id} orgId={u.orgId ?? DEFAULT_ORG_ID} extras={u.orgIds ?? []} orgs={orgs.map((o) => ({ id: o.id, name: o.name }))} />}
                </>
              )}
            </li>
          ))}
        </ul>
      </Card>
      <Card title="Responsáveis com acesso">
        {guardians.length === 0 ? <p className="text-sm text-ink-500">Nenhum responsável com acesso ainda. Libere o acesso na ficha do responsável.</p> : (
          <ul className="divide-y divide-border">
            {guardians.map((u) => (
              <li key={u.id} className="py-2.5 flex flex-wrap items-center justify-between gap-2">
                <div><p className="font-medium">{u.name}</p><p className="text-sm text-ink-500">{u.email}</p></div>
                <div className="flex items-center gap-2">
                  {u.active ? <Badge tone="green">Ativo</Badge> : <Badge tone="red">Desativado</Badge>}
                  <ActionForm action={resetUserPassword}><input type="hidden" name="userId" value={u.id} /><ConfirmButton message="Gerar nova senha provisória?" size="sm" variant="ghost">Nova senha</ConfirmButton></ActionForm>
                  <ActionForm action={setUserActive}><input type="hidden" name="userId" value={u.id} /><input type="hidden" name="active" value={u.active ? "0" : "1"} /><ConfirmButton message={u.active ? "Desativar este acesso?" : "Reativar este acesso?"} size="sm" variant="ghost">{u.active ? "Desativar" : "Reativar"}</ConfirmButton></ActionForm>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

