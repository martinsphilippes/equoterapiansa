import "server-only";
import { Collections, mapDocs } from "../collections";
import type { Announcement, UserProfile } from "../types";
import { hasPermission } from "@/lib/auth/session";

/** Comunicados visíveis para o usuário, do mais recente para o mais antigo. */
export async function announcementsFor(user: UserProfile, practitionerIds: string[] = [], limit = 200): Promise<Announcement[]> {
  const all = mapDocs(await Collections.announcements().orderBy("createdAt", "desc").limit(limit).get());
  if (user.role === "guardian") {
    return all.filter((a) => a.audience === "all" || a.audience === "guardians" || (a.audience === "guardian" && a.targetId === user.guardianId) || (a.audience === "practitioner" && a.targetId && practitionerIds.includes(a.targetId)));
  }
  if (hasPermission(user, "announcements.manage")) return all;
  return all.filter((a) => a.audience === "all" || a.audience === "staff" || (a.audience === "practitioner" && a.targetId && practitionerIds.includes(a.targetId)));
}
