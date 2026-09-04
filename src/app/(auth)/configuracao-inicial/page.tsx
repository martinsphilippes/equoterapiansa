import { redirect } from "next/navigation";
import { Collections } from "@/lib/db/collections";
import { SetupForm } from "./SetupForm";

export const metadata = { title: "Configuração inicial" };
export const dynamic = "force-dynamic";

export default async function SetupPage() {
  const owners = await Collections.users().where("role", "==", "owner").limit(1).get();
  if (!owners.empty) redirect("/entrar");
  return (
    <div className="rounded-3xl bg-white border border-ink-100 shadow-sm p-7">
      <h1 className="text-xl font-semibold">Configuração inicial</h1>
      <p className="text-sm text-ink-500 mt-1">Crie o primeiro acesso de Dono/Administrador. Esta tela desaparece depois disso.</p>
      <div className="mt-6">
        <SetupForm requiresSecret={!!process.env.SETUP_SECRET} />
      </div>
    </div>
  );
}
