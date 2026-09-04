"use server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/firebase/admin";
import { actionUser, actorOf, canAccessPractitioner } from "@/lib/auth/session";
import { Collections, getDoc } from "@/lib/db/collections";
import { audit } from "@/lib/db/audit";
import { deleteFile, fileFromForm, saveFile } from "@/lib/files/store";
import type { DocumentOwnerType, StoredDocument } from "@/lib/db/types";
import { guard, str, opt, success, fail, ISO_DATE, type ActionResult } from "./result";

/** Recebe o arquivo (até 4 MB), grava no Firestore em blocos e registra o documento. */
export async function registerDocument(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return guard(async () => {
    const user = await actionUser(["documents.manage", "collaborators.manage", "practitioners.manage"]);
    const ownerType = str(fd, "ownerType") as DocumentOwnerType;
    const ownerId = str(fd, "ownerId");
    const typeId = str(fd, "typeId");
    const expiresAt = opt(fd, "expiresAt");
    if (!["collaborator", "practitioner"].includes(ownerType)) return fail("Tipo inválido.");
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
    const file = await fileFromForm(fd);
    const stored = await saveFile(file.buffer, { name: file.name, contentType: file.contentType, createdBy: user.id });
    const ref = Collections.documents().doc();
    const doc: StoredDocument = {
      id: ref.id, ownerType, ownerId, typeId, typeName: type.name, fileName: file.name, storagePath: stored.id, size: stored.size, contentType: file.contentType,
      expiresAt: expiresAt ?? null, notes: opt(fd, "notes"), visibleToGuardian: type.visibleToGuardian,
      uploadedBy: user.id, uploadedByName: user.name, uploadedAt: Date.now(),
    };
    const batch = db.batch();
    batch.set(ref, doc);
    await audit(actorOf(user), { action: "document.upload", entity: "document", entityId: ref.id, entityLabel: file.name, details: { ownerType, ownerId, typeName: type.name, size: stored.size } }, batch);
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
    await deleteFile(doc.storagePath).catch(() => {});
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
    const p = await getDoc(Collections.practitioners(), practitionerId);
    if (!p) return fail("Praticante não encontrado.");
    const file = await fileFromForm(fd);
    if (!file.contentType.startsWith("image/")) return fail("A foto precisa ser uma imagem.");
    const stored = await saveFile(file.buffer, { name: file.name, contentType: file.contentType, createdBy: user.id });
    if (p.photoPath) await deleteFile(p.photoPath).catch(() => {});
    await Collections.practitioners().doc(practitionerId).update({ photoPath: stored.id, updatedAt: Date.now(), updatedBy: user.id });
    await audit(actorOf(user), { action: "practitioner.photo", entity: "practitioner", entityId: practitionerId, entityLabel: p.name });
    revalidatePath(`/praticantes/${practitionerId}`);
    return success("Foto atualizada.");
  });
}
