import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { LoginForm } from "./LoginForm";
import { Alert } from "@/components/ui";
import { Collections } from "@/lib/db/collections";
import type { SearchParams } from "@/lib/types";

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
    <div className="rounded-3xl bg-white border border-ink-100 shadow-sm p-7">
      <div className="mb-6 text-center">
        <div className="mx-auto h-14 w-14 rounded-2xl bg-brand-600 text-white flex items-center justify-center text-2xl">🐴</div>
        <h1 className="mt-4 text-xl font-semibold">Bem-vindo</h1>
        <p className="text-sm text-ink-500">Entre para acessar o sistema.</p>
      </div>
      {msg && <div className="mb-4"><Alert tone="success">{msg}</Alert></div>}
      <LoginForm next={next} />
    </div>
  );
}
