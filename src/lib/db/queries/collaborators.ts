import "server-only";
import { Collections, mapDocs } from "../collections";
import type { Collaborator, DocumentType, StoredDocument } from "../types";
import { todayISO } from "@/lib/domain/dates";

export async function listCollaborators(opts?: { status?: Collaborator["status"] | "all" }): Promise<Collaborator[]> {
  let q: FirebaseFirestore.Query<Collaborator> = Collections.collaborators();
  if (opts?.status && opts.status !== "all") q = q.where("status", "==", opts.status);
  const snap = await q.get();
  return mapDocs(snap).sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
}

export async function listJobRoles(activeOnly = true) {
  const snap = await Collections.jobRoles().get();
  return mapDocs(snap).filter((r) => !activeOnly || r.active).sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
}

export async function listDocumentTypes(appliesTo?: DocumentType["appliesTo"], activeOnly = true) {
  const snap = await Collections.documentTypes().get();
  return mapDocs(snap)
    .filter((t) => (!appliesTo || t.appliesTo === appliesTo) && (!activeOnly || t.active))
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
}

export async function listDocuments(ownerType: StoredDocument["ownerType"], ownerId: string) {
  const snap = await Collections.documents().where("ownerType", "==", ownerType).where("ownerId", "==", ownerId).get();
  return mapDocs(snap).sort((a, b) => b.uploadedAt - a.uploadedAt);
}

export interface DocumentStatus {
  missing: DocumentType[];
  expired: StoredDocument[];
  expiringSoon: StoredDocument[];
}

/** Pendências documentais: obrigatórios ausentes, vencidos e vencendo em 30 dias. */
export function documentStatus(types: DocumentType[], docs: StoredDocument[], today = todayISO()): DocumentStatus {
  const present = new Set(docs.map((d) => d.typeId));
  const missing = types.filter((t) => t.required && t.active && !present.has(t.id));
  const soon = new Date(today);
  soon.setUTCDate(soon.getUTCDate() + 30);
  const soonIso = soon.toISOString().slice(0, 10);
  const expired = docs.filter((d) => d.expiresAt && d.expiresAt < today);
  const expiringSoon = docs.filter((d) => d.expiresAt && d.expiresAt >= today && d.expiresAt <= soonIso);
  return { missing, expired, expiringSoon };
}

/** Pendências documentais de todos os donos de um tipo (para dashboard). */
export async function pendingDocumentsCount(ownerType: StoredDocument["ownerType"], ownerIds: string[]): Promise<{ ownerId: string; missing: number; expired: number }[]> {
  if (ownerIds.length === 0) return [];
  const [types, snap] = await Promise.all([listDocumentTypes(ownerType), Collections.documents().where("ownerType", "==", ownerType).get()]);
  const docs = mapDocs(snap);
  const today = todayISO();
  return ownerIds
    .map((ownerId) => {
      const st = documentStatus(types, docs.filter((d) => d.ownerId === ownerId), today);
      return { ownerId, missing: st.missing.length, expired: st.expired.length };
    })
    .filter((x) => x.missing > 0 || x.expired > 0);
}
