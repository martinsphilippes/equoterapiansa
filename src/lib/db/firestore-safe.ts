import "server-only";
import { cache } from "react";
import { after } from "next/server";

/**
 * Consultas do Firestore podem exigir índices compostos. Enquanto um índice não
 * existe (ou ainda está sendo construído) a consulta falha com FAILED_PRECONDITION.
 * Aqui isso vira degradação controlada: a tela continua abrindo, os dados que
 * dependem daquele índice ficam vazios e um aviso explica o que fazer.
 */
const pending = cache(() => new Map<string, { label: string; link: string | null }>());

interface Grpcish { code?: number; message?: string; details?: string }

export function isIndexError(e: unknown): boolean {
  const err = (e ?? {}) as Grpcish;
  const text = `${err.details ?? ""} ${err.message ?? ""}`;
  return err.code === 9 && /requires an index|index is currently building|no matching index/i.test(text);
}

export function indexLinkOf(e: unknown): string | null {
  const err = (e ?? {}) as Grpcish;
  const m = `${err.details ?? ""} ${err.message ?? ""}`.match(/https:\/\/console\.firebase\.google\.com\/\S+/);
  return m ? m[0].replace(/[).,]+$/, "") : null;
}

/**
 * Autorreparo: ao detectar índice ausente, tenta criá-lo em segundo plano (depois
 * da resposta). Uma tentativa por instância a cada 10 minutos; criar índice é
 * idempotente e não custa nada no plano gratuito.
 */
let nextAttempt = 0;
let repairing = false;
function scheduleIndexRepair() {
  const now = Date.now();
  if (repairing || now < nextAttempt) return;
  repairing = true;
  nextAttempt = now + 10 * 60_000;
  const run = async () => {
    try {
      const { createMissingIndexes } = await import("./index-admin");
      const r = await createMissingIndexes();
      // Sem permissão no Google Cloud não adianta insistir: espera muito mais.
      if (r.permissionDenied) nextAttempt = Date.now() + 6 * 60 * 60_000;
      console.log("[firestore] autocriação de índices:", JSON.stringify({ created: r.created, existing: r.existing, permissionDenied: r.permissionDenied, failed: r.failed.length }));
    } catch (e) {
      console.warn("[firestore] autocriação de índices falhou:", e instanceof Error ? e.message : e);
    } finally {
      repairing = false;
    }
  };
  try {
    after(run);
  } catch {
    void run();
  }
}

/** Executa a consulta; se faltar índice, registra o aviso e devolve o valor de reserva. */
export async function safeQuery<T>(label: string, run: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await run();
  } catch (e) {
    if (!isIndexError(e)) throw e;
    const link = indexLinkOf(e);
    pending().set(`${label}|${link ?? ""}`, { label, link });
    console.warn(`[firestore] índice ausente em "${label}"${link ? `: ${link}` : ""}`);
    scheduleIndexRepair();
    return fallback;
  }
}

/** Índices que faltaram durante a renderização desta requisição. */
export function pendingIndexIssues(): { label: string; link: string | null }[] {
  return Array.from(pending().values());
}
