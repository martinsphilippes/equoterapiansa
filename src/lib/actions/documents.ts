"use server";
import { revalidatePath } from "next/cache";
import { bucket, db } from "@/lib/firebase/admin";
import { actionUser, actorOf, canAccessPractitioner } from "@/lib/auth/session";
import { Collections, getDoc } from "@/lib/db/collections";
import { audit } from "@/lib/db/audit";
import type { DocumentOwnerType, StoredDocument } from "@/lib/db/types";
import { guard, str, opt, success, fail, ISO_DATE, type ActionResult } from "./result";

/** Move o arquivo da pasta temporária para o destino definitivo (com fallback para o emulador). */
async function moveFile(from: string, to: string) {
  const b = bucket();
  const src = b.file(from);
  try {
    await src.move(to);
  } catch {
    const [buf] = await src.download();
    const [meta] = await src.getMetadata().catch(() => [{ contentType: undefined }]);
    await b.file(to).save(buf, { contentType: meta?.contentType });
    await src.delete().catch(() => {});
  }
}

function safeName(name: string) {
  return name.replace(/[^\w.\-() ]+/g, "_").slice(0, 120);
}

export async function registerDocument(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return guard(async () => {
    const user = await actionUser(["documents.manage", "collaborators.manage", "practitioners.manage"]);
    const ownerType = str(fd, "ownerType") as DocumentOwnerType;
    const ownerId = str(fd, "ownerId");
    const typeId = str(fd, "typeId");
    const tempPath = str(fd, "tempPath");
    const fileName = safeName(str(fd, "fileName") || "arquivo");
    const size = Number(str(fd, "size") || 0);
    const contentType = str(fd, "contentType") || "application/octet-stream";
    const expiresAt = opt(fd, "expiresAt");
    if (!["collaborator", "practitioner"].includes(ownerType)) return fail("Tipo inválido.");
    if (!tempPath.startsWith(`uploads/${user.id}/`)) return fail("Arquivo inválido.");
    if (expiresAt && !ISO_DATE.test(expiresAt)) return fail("Data de validade inválida.");
    const type = await getDoc(Collections.documentTypes(), typeId);
    if (!type || type.appliesTo !== ownerType) return fail("Tipo de documento inválido.");
    if (ownerType === "practitioner") {
      const p = await getDoc(Collections.practitioners(), ownerId);
      if (!p) return fail("Praticante não encontrado.");
      if (!canAccessPractitioner(user, p) && !user.permissions.includes("documents.manage")) return fail("Sem permissão para este praticante.");
    } else {
      const c = await getDoc(Collections.collaborators(), ownerId);
      if (!c) return fail("Colaborador não encontrado.");
    }
    const ref = Collections.documents().doc();
    const storagePath = `documents/${ownerType}/${ownerId}/${ref.id}-${fileName}`;
    await moveFile(tempPath, storagePath);
    const doc: StoredDocument = {
      id: ref.id, ownerType, ownerId, typeId, typeName: type.name, fileName, storagePath, size, contentType,
      expiresAt: expiresAt ?? null, notes: opt(fd, "notes"), visibleToGuardian: type.visibleToGuardian,
      uploadedBy: user.id, uploadedByName: user.name, uploadedAt: Date.now(),
    };
    const batch = db.batch();
    batch.set(ref, doc);
    await audit(actorOf(user), { action: "document.upload", entity: "document", entityId: ref.id, entityLabel: fileName, details: { ownerType, ownerId, typeName: type.name } }, batch);
    await batch.commit();
    revalidatePath(ownerType === "collaborator" ? `/colaboradores/${ownerId}` : `/praticantes/${ownerId}`);
    return success("Documento enviado.", ref.id);
  });
}

export async function deleteDocument(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return guard(async () => {
    const user = await actionUser("documents.manage");
    const id = str(fd, "id");
    const doc = await getDoc(Collections.documents(), id);
    if (!doc) return fail("Documento não encontrado.");
    await bucket().file(doc.storagePath).delete().catch(() => {});
    const batch = db.batch();
    batch.delete(Collections.documents().doc(id));
    await audit(actorOf(user), { action: "document.delete", entity: "document", entityId: id, entityLabel: doc.fileName, details: { ownerType: doc.ownerType, ownerId: doc.ownerId } }, batch);
    await batch.commit();
    revalidatePath(doc.ownerType === "collaborator" ? `/colaboradores/${doc.ownerId}` : `/praticantes/${doc.ownerId}`);
    return success("Documento excluído.");
  });
}

export async function setPractitionerPhoto(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return guard(async () => {
    const user = await actionUser("practitioners.manage");
    const practitionerId = str(fd, "ownerId");
    const tempPath = str(fd, "tempPath");
    if (!tempPath.startsWith(`uploads/${user.id}/`)) return fail("Arquivo inválido.");
    const p = await getDoc(Collections.practitioners(), practitionerId);
    if (!p) return fail("Praticante não encontrado.");
    const storagePath = `practitioners/${practitionerId}/photo-${Date.now()}`;
    await moveFile(tempPath, storagePath);
    if (p.photoPath) await bucket().file(p.photoPath).delete().catch(() => {});
    await Collections.practitioners().doc(practitionerId).update({ photoPath: storagePath, updatedAt: Date.now(), updatedBy: user.id });
    await audit(actorOf(user), { action: "practitioner.photo", entity: "practitioner", entityId: practitionerId, entityLabel: p.name });
    revalidatePath(`/praticantes/${practitionerId}`);
    return success("Foto atualizada.");
  });
}
