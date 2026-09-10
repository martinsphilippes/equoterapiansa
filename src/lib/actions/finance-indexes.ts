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
    // Fica no log da plataforma, para diagnóstico sem precisar abrir a tela.
    console.log("[firestore] criação manual de índices:", JSON.stringify({ created: r.created, existing: r.existing, permissionDenied: r.permissionDenied, failed: r.failed.slice(0, 2) }));
    await audit(actorOf(user), { action: "finance.indexes.create", entity: "finance", entityId: "indexes", entityLabel: "Índices do Firestore", details: r });
    revalidatePath("/financeiro/configuracoes");
    revalidatePath("/financeiro");
    if (r.permissionDenied) {
      return fail("A conta de serviço ainda não tem permissão para criar índices. Confira o papel Cloud Datastore Index Admin no IAM e tente de novo em um minuto.");
    }
    if (r.failed.length > 0) {
      return fail(`Não foi possível criar ${r.failed.length} índice(s): ${r.failed[0].error}`);
    }
    if (r.created === 0) return success("Todos os índices já existem.");
    return success(`${r.created} índice(s) em construção. Leva alguns minutos; depois recarregue a página.`);
  });
}
