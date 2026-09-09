import "server-only";
import { cache } from "react";

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

/** Executa a consulta; se faltar índice, registra o aviso e devolve o valor de reserva. */
export async function safeQuery<T>(label: string, run: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await run();
  } catch (e) {
    if (!isIndexError(e)) throw e;
    const link = indexLinkOf(e);
    pending().set(`${label}|${link ?? ""}`, { label, link });
    console.warn(`[firestore] índice ausente em "${label}"${link ? `: ${link}` : ""}`);
    return fallback;
  }
}

/** Índices que faltaram durante a renderização desta requisição. */
export function pendingIndexIssues(): { label: string; link: string | null }[] {
  return Array.from(pending().values());
}
