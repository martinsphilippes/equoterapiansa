"use client";
import { Checkbox, Field, Select } from "@/components/ui";
import { ActionForm } from "@/components/ui/ActionForm";
import { SubmitButton } from "@/components/ui/FormStatus";
import { setUserOrgs } from "@/lib/actions/orgs";

/** Unidade a que a pessoa pertence, e acessos adicionais quando houver. */
export function UserOrgForm({ userId, orgId, extras, orgs }: { userId: string; orgId: string; extras: string[]; orgs: { id: string; name: string }[] }) {
  return (
    <ActionForm action={setUserOrgs} className="mt-2 rounded-xl bg-surface-50 border border-border p-3 space-y-2">
      <input type="hidden" name="userId" value={userId} />
      <Field label="Unidade da pessoa">
        <Select name="orgId" defaultValue={orgId} className="h-9">
          {orgs.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
        </Select>
      </Field>
      <div>
        <p className="text-xs font-semibold text-ink-700 mb-1">Também pode acessar</p>
        <div className="flex flex-wrap gap-3">
          {orgs.map((o) => (
            <Checkbox key={o.id} name="orgIds" value={o.id} label={o.name} defaultChecked={extras.includes(o.id)} className="text-xs" />
          ))}
        </div>
      </div>
      <SubmitButton size="sm" variant="outline" pendingText="…">Salvar unidade</SubmitButton>
    </ActionForm>
  );
}
