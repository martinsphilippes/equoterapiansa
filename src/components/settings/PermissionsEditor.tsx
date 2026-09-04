"use client";
import { useState } from "react";
import { ActionForm } from "@/components/ui/ActionForm";
import { SubmitButton } from "@/components/ui/FormStatus";
import { Checkbox, Select } from "@/components/ui";
import { updateUserPermissions } from "@/lib/actions/users";
import { ALL_PERMISSIONS, DEFAULT_PERMISSIONS, PERMISSIONS, type Permission, type Role } from "@/lib/auth/permissions";

export function PermissionsEditor({ userId, role, current }: { userId: string; role: Role; current: Permission[] }) {
  const [open, setOpen] = useState(false);
  const [selRole, setSelRole] = useState<Role>(role);
  const [perms, setPerms] = useState<Set<Permission>>(new Set(current));
  if (!open) return <button className="text-sm text-brand-700 hover:underline mt-1" onClick={() => setOpen(true)}>Ajustar perfil e permissões</button>;
  return (
    <ActionForm action={updateUserPermissions} className="mt-3 rounded-xl bg-sand-50 border border-ink-100 p-3 space-y-3" onSuccess={() => setOpen(false)}>
      <input type="hidden" name="userId" value={userId} />
      <div className="flex items-center gap-2">
        <Select name="role" value={selRole} className="max-w-xs h-9" onChange={(e) => { const r = e.target.value as Role; setSelRole(r); setPerms(new Set(DEFAULT_PERMISSIONS[r])); }}>
          <option value="manager">Gerente</option>
          <option value="professional">Profissional de atendimento</option>
          <option value="staff">Colaborador</option>
        </Select>
        <button type="button" className="text-xs text-ink-500 hover:underline" onClick={() => setPerms(new Set(DEFAULT_PERMISSIONS[selRole]))}>Restaurar padrão do perfil</button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
        {ALL_PERMISSIONS.map((p) => (
          <Checkbox key={p} name="permissions" value={p} label={PERMISSIONS[p]} checked={perms.has(p)} onChange={(e) => { const n = new Set(perms); if (e.target.checked) n.add(p); else n.delete(p); setPerms(n); }} />
        ))}
      </div>
      <div className="flex gap-2">
        <SubmitButton size="sm">Salvar permissões</SubmitButton>
        <button type="button" className="text-sm text-ink-500" onClick={() => setOpen(false)}>Cancelar</button>
      </div>
    </ActionForm>
  );
}
