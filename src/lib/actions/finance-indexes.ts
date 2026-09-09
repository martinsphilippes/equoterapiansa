"use server";
import { revalidatePath } from "next/cache";
import { guard, success, fail, type ActionResult } from "./result";
import { actionUser, actorOf } from "@/lib/auth/session";
import { audit } from "@/lib/db/audit";
import { createMissingIndexes } from "@/lib/db/index-admin";

/** Cria no Firestore os índices que o sistema precisa, usando a credencial do app. */
export async function ensureIndexes(_p: ActionResult | null, _fd: FormData): Promise<ActionResult> {
  return guard(async () => {
    const user = await actionUser("finance.setup");
    const r = await createMissingIndexes();
    await audit(actorOf(user), { action: "finance.indexes.create", entity: "finance", entityId: "indexes", entityLabel: "Índices do Firestore", details: r });
    revalidatePath("/financeiro/configuracoes");
    revalidatePath("/financeiro");
    if (r.failed.length > 0) {
      const first = r.failed[0];
      return fail(`Não foi possível criar todos os índices (${first.error}). Crie pelo console do Firebase ou rode: firebase deploy --only firestore:indexes`);
    }
    if (r.created === 0) return success("Todos os índices já existem.");
    return success(`${r.created} índice(s) em construção. Leva alguns minutos; depois recarregue a página.`);
  });
}
