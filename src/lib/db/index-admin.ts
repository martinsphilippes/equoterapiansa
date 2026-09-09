import "server-only";
import { adminApp, isEmulator } from "@/lib/firebase/admin";
import required from "../../../firestore.indexes.json";

/**
 * Criação e conferência dos índices compostos usando a API Admin do Firestore
 * com a mesma credencial de serviço do aplicativo. Evita depender do console.
 */
export interface IndexField { fieldPath: string; order?: string; arrayConfig?: string }
export interface RequiredIndex { collectionGroup: string; queryScope: string; fields: IndexField[] }
export type IndexState = "READY" | "CREATING" | "NEEDS_REPAIR" | "MISSING" | "UNKNOWN";
export interface IndexStatus extends RequiredIndex { state: IndexState }

export const REQUIRED_INDEXES: RequiredIndex[] = (required.indexes ?? []) as RequiredIndex[];

const API = "https://firestore.googleapis.com/v1";

function projectId(): string {
  return (adminApp.options.projectId ?? process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "") as string;
}

async function token(): Promise<string> {
  const credential = adminApp.options.credential;
  if (!credential) throw new Error("Credencial do Firebase indisponível.");
  const t = await credential.getAccessToken();
  return t.access_token;
}

/** Assinatura estável de um índice, para comparar o desejado com o existente. */
export function signature(i: { collectionGroup?: string; fields: IndexField[] }, collectionGroup?: string): string {
  const cg = i.collectionGroup ?? collectionGroup ?? "";
  const fields = i.fields
    .filter((f) => f.fieldPath !== "__name__")
    .map((f) => `${f.fieldPath}:${f.arrayConfig ?? f.order ?? "ASCENDING"}`)
    .join(",");
  return `${cg}[${fields}]`;
}

async function listOf(collectionGroup: string): Promise<{ signature: string; state: IndexState }[]> {
  const url = `${API}/projects/${projectId()}/databases/(default)/collectionGroups/${collectionGroup}/indexes`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${await token()}` }, cache: "no-store" });
  if (!res.ok) throw new Error(`${res.status} ${(await res.text()).slice(0, 300)}`);
  const body = (await res.json()) as { indexes?: { fields: IndexField[]; state?: string }[] };
  return (body.indexes ?? []).map((i) => ({ signature: signature({ fields: i.fields }, collectionGroup), state: (i.state as IndexState) ?? "UNKNOWN" }));
}

/** Estado de cada índice necessário. Uma chamada por coleção envolvida. */
export async function indexStatus(): Promise<{ ok: true; items: IndexStatus[] } | { ok: false; error: string }> {
  if (isEmulator) return { ok: true, items: REQUIRED_INDEXES.map((i) => ({ ...i, state: "READY" as const })) };
  try {
    const groups = Array.from(new Set(REQUIRED_INDEXES.map((i) => i.collectionGroup)));
    const lists = await Promise.all(groups.map(async (g) => [g, await listOf(g)] as const));
    const existing = new Map(lists.flatMap(([, l]) => l.map((x) => [x.signature, x.state] as const)));
    return { ok: true, items: REQUIRED_INDEXES.map((i) => ({ ...i, state: existing.get(signature(i)) ?? "MISSING" })) };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/** Cria os índices que faltam. Idempotente: o que já existe é ignorado. */
export async function createMissingIndexes(): Promise<{ created: number; existing: number; failed: { index: string; error: string }[] }> {
  const status = await indexStatus();
  if (!status.ok) return { created: 0, existing: 0, failed: [{ index: "listagem", error: status.error }] };
  const missing = status.items.filter((i) => i.state === "MISSING");
  const failed: { index: string; error: string }[] = [];
  let created = 0;
  const bearer = `Bearer ${await token()}`;
  for (const i of missing) {
    const url = `${API}/projects/${projectId()}/databases/(default)/collectionGroups/${i.collectionGroup}/indexes`;
    const res = await fetch(url, {
      method: "POST",
      headers: { Authorization: bearer, "Content-Type": "application/json" },
      body: JSON.stringify({ queryScope: i.queryScope || "COLLECTION", fields: i.fields }),
      cache: "no-store",
    });
    if (res.ok) created++;
    else if (res.status === 409) continue; // já existe
    else failed.push({ index: signature(i), error: `${res.status} ${(await res.text()).slice(0, 200)}` });
  }
  return { created, existing: status.items.length - missing.length, failed };
}
