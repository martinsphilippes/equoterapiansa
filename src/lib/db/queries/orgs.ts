import "server-only";
import { cache } from "react";
import { Collections, mapDocs } from "../collections";
import { DEFAULT_ORG_ID } from "../org-context";
import type { Organization, UserProfile } from "../types";
import { orgsOf } from "@/lib/auth/session";

/** Todas as unidades cadastradas. Coleção global, fora do contexto de unidade. */
export const listOrganizations = cache(async (): Promise<Organization[]> =>
  mapDocs(await Collections.organizations().get()).sort((a, b) => (a.id === DEFAULT_ORG_ID ? -1 : b.id === DEFAULT_ORG_ID ? 1 : a.name.localeCompare(b.name, "pt-BR"))));

export const getOrganization = cache(async (id: string): Promise<Organization | null> => {
  const snap = await Collections.organizations().doc(id).get();
  return snap.exists ? (snap.data() as Organization) : null;
});

/** Unidades que a pessoa pode acessar, na ordem de exibição. */
export async function organizationsFor(user: UserProfile): Promise<Organization[]> {
  const allowed = orgsOf(user);
  const all = await listOrganizations();
  return allowed.map((id) => all.find((o) => o.id === id)).filter((o): o is Organization => !!o && o.active);
}
