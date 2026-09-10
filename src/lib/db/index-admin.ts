import "server-only";
import { adminApp, isEmulator } from "@/lib/firebase/admin";
import { orgPrefix } from "./org-context";
import required from "../../../firestore.indexes.json";

/**
 * Criação e conferência dos índices compostos usando a API Admin do Firestore
 * com a mesma credencial de serviço do aplicativo. Evita depender do console.
 */
export interface IndexField { fieldPath: string; order?: string; arrayConfig?: string }
export interface RequiredIndex { collectionGroup: string; queryScope: string; fields: IndexField[] }
export type IndexState = "READY" | "CREATING" | "NEEDS_REPAIR" | "MISSING" | "UNKNOWN";
export interface IndexStatus extends RequiredIndex { state: IndexState }

const BASE_INDEXES: RequiredIndex[] = (required.indexes ?? []) as RequiredIndex[];

/**
 * Índices da unidade atual. Cada unidade tem coleções próprias, então precisa
 * do mesmo conjunto de índices com o nome prefixado.
 */
export function requiredIndexes(): RequiredIndex[] {
  const prefix = orgPrefix();
  return BASE_INDEXES.map((i) => ({ ...i, collectionGroup: prefix + i.collectionGroup }));
}

/** Mantido para telas que só listam os campos esperados. */
export const REQUIRED_INDEXES: RequiredIndex[] = BASE_INDEXES;

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
  const wanted = requiredIndexes();
  if (isEmulator) return { ok: true, items: wanted.map((i) => ({ ...i, state: "READY" as const })) };
  try {
    const groups = Array.from(new Set(wanted.map((i) => i.collectionGroup)));
    const lists = await Promise.all(groups.map(async (g) => [g, await listOf(g)] as const));
    const existing = new Map(lists.flatMap(([, l]) => l.map((x) => [x.signature, x.state] as const)));
    return { ok: true, items: wanted.map((i) => ({ ...i, state: existing.get(signature(i)) ?? "MISSING" })) };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/** E-mail da conta de serviço, para orientar a liberação de permissão no Google Cloud. */
export function serviceAccountEmail(): string | null {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
  if (!raw) return null;
  try {
    return (JSON.parse(Buffer.from(raw, "base64").toString("utf8")) as { client_email?: string }).client_email ?? null;
  } catch {
    return null;
  }
}

/** Cria os índices que faltam. Idempotente: o que já existe é ignorado. */
export async function createMissingIndexes(): Promise<{ created: number; existing: number; failed: { index: string; error: string }[]; permissionDenied: boolean }> {
  const status = await indexStatus();
  if (!status.ok) return { created: 0, existing: 0, failed: [{ index: "listagem", error: status.error }], permissionDenied: status.error.includes("403") };
  const missing = status.items.filter((i) => i.state === "MISSING");
  const failed: { index: string; error: string }[] = [];
  let created = 0;
  if (missing.length === 0) return { created: 0, existing: status.items.length, failed, permissionDenied: false };
  const bearer = `Bearer ${await token()}`;
  // Em paralelo: a criação é rápida e o conjunto é pequeno e conhecido.
  const results = await Promise.all(missing.map(async (i) => {
    const url = `${API}/projects/${projectId()}/databases/(default)/collectionGroups/${i.collectionGroup}/indexes`;
    const res = await fetch(url, {
      method: "POST",
      headers: { Authorization: bearer, "Content-Type": "application/json" },
      body: JSON.stringify({ queryScope: i.queryScope || "COLLECTION", fields: i.fields }),
      cache: "no-store",
    });
    if (res.ok || res.status === 409) return { ok: true as const, counted: res.ok };
    return { ok: false as const, index: signature(i), error: `${res.status} ${(await res.text()).slice(0, 200)}` };
  }));
  for (const r of results) {
    if (r.ok) { if (r.counted) created++; }
    else failed.push({ index: r.index, error: r.error });
  }
  return { created, existing: status.items.length - missing.length, failed, permissionDenied: failed.some((f) => f.error.startsWith("403")) };
}
