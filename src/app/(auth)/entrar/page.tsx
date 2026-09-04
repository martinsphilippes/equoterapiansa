import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { LoginForm } from "./LoginForm";
import { Collections } from "@/lib/db/collections";
import type { SearchParams } from "@/lib/types";
import { Alert } from "@/components/ui";

export const metadata = { title: "Entrar" };
export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await getCurrentUser();
  if (user) redirect(user.role === "guardian" ? "/familia" : "/painel");
  const owners = await Collections.users().where("role", "==", "owner").limit(1).get();
  if (owners.empty) redirect("/configuracao-inicial");
  const sp = await searchParams;
  const next = typeof sp.next === "string" ? sp.next : undefined;
  const msg = sp.msg === "senha-alterada" ? "Senha alterada com sucesso. Entre novamente com a nova senha." : undefined;
  return (
    <div className="rounded-3xl bg-surface border border-border shadow-float p-7">
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold tracking-tight text-ink-900">Bem-vindo</h1>
        <p className="text-sm text-ink-500 mt-1">Entre com o e-mail e a senha fornecidos pela instituição.</p>
      </div>
      {msg && <div className="mb-4"><Alert tone="success">{msg}</Alert></div>}
      <LoginForm next={next} />
      <p className="mt-6 text-center text-[11px] uppercase tracking-[0.18em] text-ink-300">Equoterapia Nossa Senhora Aparecida</p>
    </div>
  );
}
