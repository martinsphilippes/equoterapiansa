"use server";
import { revalidatePath } from "next/cache";
import { actionUser, actorOf } from "@/lib/auth/session";
import { Collections, getDoc } from "@/lib/db/collections";
import { audit } from "@/lib/db/audit";
import type { Announcement, AnnouncementAudience } from "@/lib/db/types";
import { guard, str, opt, success, fail, type ActionResult } from "./result";
import { FieldValue } from "@/lib/firebase/admin";

export async function createAnnouncement(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return guard(async () => {
    const user = await actionUser("announcements.manage");
    const title = str(fd, "title");
    const body = str(fd, "body");
    const audience = str(fd, "audience") as AnnouncementAudience;
    if (!title) return fail("Informe o título.");
    if (!body) return fail("Escreva a mensagem.");
    if (!["all", "staff", "guardians", "guardian", "practitioner"].includes(audience)) return fail("Destino inválido.");
    let targetId: string | null = null;
    let targetName: string | null = null;
    if (audience === "guardian") {
      targetId = str(fd, "guardianId");
      const g = await getDoc(Collections.guardians(), targetId);
      if (!g) return fail("Selecione o responsável.");
      targetName = g.name;
    }
    if (audience === "practitioner") {
      targetId = str(fd, "practitionerId");
      const p = await getDoc(Collections.practitioners(), targetId);
      if (!p) return fail("Selecione o praticante.");
      targetName = p.name;
    }
    const ref = Collections.announcements().doc();
    const a: Announcement = { id: ref.id, title, body, audience, targetId, targetName, createdAt: Date.now(), createdBy: user.id, createdByName: user.name, readBy: [] };
    await ref.set(a);
    await audit(actorOf(user), { action: "announcement.create", entity: "announcement", entityId: ref.id, entityLabel: title, details: { audience, targetId } });
    revalidatePath("/comunicados");
    return success("Comunicado enviado.", ref.id, "/comunicados");
  });
}

export async function deleteAnnouncement(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return guard(async () => {
    const user = await actionUser("announcements.manage");
    const id = str(fd, "id");
    const a = await getDoc(Collections.announcements(), id);
    if (!a) return fail("Comunicado não encontrado.");
    await Collections.announcements().doc(id).delete();
    await audit(actorOf(user), { action: "announcement.delete", entity: "announcement", entityId: id, entityLabel: a.title });
    revalidatePath("/comunicados");
    return success("Comunicado excluído.");
  });
}

export async function markAnnouncementRead(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return guard(async () => {
    const user = await actionUser();
    const id = str(fd, "id");
    await Collections.announcements().doc(id).update({ readBy: FieldValue.arrayUnion(user.id) });
    revalidatePath("/comunicados");
    revalidatePath("/familia/comunicados");
    return success(undefined, undefined, opt(fd, "returnTo"));
  });
}
