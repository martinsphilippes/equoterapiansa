import { requireUser } from "@/lib/auth/session";
import { Card, Field, Input, PageHeader, Alert } from "@/components/ui";
import { ActionForm } from "@/components/ui/ActionForm";
import { SubmitButton } from "@/components/ui/FormStatus";
import { changePassword, updateProfileName } from "@/lib/actions/account";
import { ROLE_LABELS } from "@/lib/auth/permissions";
import { LogoutButton } from "@/components/layout/LogoutButton";
import type { SearchParams } from "@/lib/types";

export const metadata = { title: "Minha conta" };

export default async function AccountPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireUser();
  const sp = await searchParams;
  const forced = sp["trocar-senha"] === "1" || user.mustChangePassword;
  return (
    <div className="max-w-lg space-y-5">
      <PageHeader title="Minha conta" subtitle={`${user.email} · ${ROLE_LABELS[user.role]}`} />
      {forced && <Alert tone="warning">Por segurança, defina uma nova senha antes de continuar.</Alert>}
      <Card title="Alterar senha">
        <ActionForm action={changePassword} className="space-y-4">
          <Field label="Nova senha"><Input name="password" type="password" minLength={8} required autoComplete="new-password" /></Field>
          <Field label="Confirmar nova senha"><Input name="confirm" type="password" minLength={8} required autoComplete="new-password" /></Field>
          <SubmitButton>Salvar nova senha</SubmitButton>
        </ActionForm>
      </Card>
      <Card title="Meu nome">
        <ActionForm action={updateProfileName} className="space-y-4">
          <Field label="Nome"><Input name="name" defaultValue={user.name} required /></Field>
          <SubmitButton variant="outline">Atualizar</SubmitButton>
        </ActionForm>
      </Card>
      <div className="md:hidden"><LogoutButton /></div>
    </div>
  );
}
