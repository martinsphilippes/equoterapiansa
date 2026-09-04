import "server-only";
import { db } from "@/lib/firebase/admin";

/**
 * Armazenamento de arquivos no próprio Firestore (plano gratuito, sem Storage).
 * Cada arquivo vira um documento de metadados em `files/{id}` e N blocos de até
 * 700 KB em `fileChunks/{id}_{n}` (limite do Firestore: 1 MiB por documento).
 * Leitura e escrita acontecem só no servidor, com verificação de permissão.
 */
export const MAX_FILE_BYTES = 4 * 1024 * 1024; // limite prático das funções da Vercel (4,5 MB por requisição)
const CHUNK = 700 * 1024;

export interface StoredFileMeta {
  id: string;
  name: string;
  contentType: string;
  size: number;
  chunks: number;
  createdAt: number;
  createdBy: string;
}

export async function saveFile(buffer: Buffer, opts: { name: string; contentType: string; createdBy: string }): Promise<StoredFileMeta> {
  if (buffer.length === 0) throw new Error("Arquivo vazio.");
  if (buffer.length > MAX_FILE_BYTES) throw new Error("Arquivo acima de 4 MB. Reduza a resolução do scanner ou envie em partes.");
  const ref = db.collection("files").doc();
  const chunks = Math.ceil(buffer.length / CHUNK);
  const meta: StoredFileMeta = { id: ref.id, name: opts.name, contentType: opts.contentType, size: buffer.length, chunks, createdAt: Date.now(), createdBy: opts.createdBy };
  const batch = db.batch();
  batch.set(ref, meta);
  for (let i = 0; i < chunks; i++) {
    batch.set(db.collection("fileChunks").doc(`${ref.id}_${i}`), { fileId: ref.id, index: i, data: buffer.subarray(i * CHUNK, (i + 1) * CHUNK) });
  }
  await batch.commit();
  return meta;
}

export async function readFile(fileId: string): Promise<{ meta: StoredFileMeta; buffer: Buffer } | null> {
  const metaSnap = await db.collection("files").doc(fileId).get();
  if (!metaSnap.exists) return null;
  const meta = metaSnap.data() as StoredFileMeta;
  const refs = Array.from({ length: meta.chunks }, (_, i) => db.collection("fileChunks").doc(`${fileId}_${i}`));
  const snaps = await db.getAll(...refs);
  const parts = snaps.map((s) => {
    const d = s.data()?.data as Buffer | Uint8Array | undefined;
    if (!d) throw new Error("Arquivo corrompido: bloco ausente.");
    return Buffer.from(d);
  });
  return { meta, buffer: Buffer.concat(parts) };
}

export async function deleteFile(fileId: string): Promise<void> {
  const metaSnap = await db.collection("files").doc(fileId).get();
  if (!metaSnap.exists) return;
  const meta = metaSnap.data() as StoredFileMeta;
  const batch = db.batch();
  for (let i = 0; i < meta.chunks; i++) batch.delete(db.collection("fileChunks").doc(`${fileId}_${i}`));
  batch.delete(metaSnap.ref);
  await batch.commit();
}

/** Extrai e valida o arquivo enviado em um FormData de server action. */
export async function fileFromForm(fd: FormData, key = "file"): Promise<{ buffer: Buffer; name: string; contentType: string }> {
  const f = fd.get(key);
  if (!(f instanceof File) || f.size === 0) throw new Error("Selecione um arquivo.");
  if (f.size > MAX_FILE_BYTES) throw new Error("Arquivo acima de 4 MB. Reduza a resolução do scanner ou envie em partes.");
  const contentType = f.type || "application/octet-stream";
  if (!/^(application\/pdf|image\/(jpeg|png|webp|heic|heif))$/.test(contentType)) throw new Error("Envie um PDF ou uma imagem (JPG, PNG, WebP).");
  return { buffer: Buffer.from(await f.arrayBuffer()), name: f.name.replace(/[^\w.\-() ]+/g, "_").slice(0, 120) || "arquivo", contentType };
}
