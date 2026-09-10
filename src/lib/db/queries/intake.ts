import "server-only";
import { cache } from "react";
import { AggregateField } from "firebase-admin/firestore";
import { Collections, mapDocs, getDoc } from "../collections";
import { enterOrg } from "../org-context";
import type { IntakeConfig, IntakeStatus, IntakeSubmission } from "../types";

const CONFIG_ID = "general";

/** Configuração do link público. Criada sob demanda com um token aleatório. */
export const getIntakeConfig = cache(async (): Promise<IntakeConfig> => {
  const snap = await Collections.intakeConfig().doc(CONFIG_ID).get();
  if (snap.exists) return snap.data() as IntakeConfig;
  return { id: CONFIG_ID, token: "", active: false, updatedAt: 0 };
});

/**
 * Resolve o token do link público para a unidade dona dele e entra nessa
 * unidade. É o único caminho de leitura sem sessão, e ele mesmo define o
 * contexto: sem isso, o formulário não saberia de qual empresa é.
 */
export async function configForToken(token: string): Promise<IntakeConfig | null> {
  if (!token) return null;
  const link = await Collections.publicLinks().doc(token).get();
  if (!link.exists) return null;
  const { orgId } = link.data() as { orgId: string };
  enterOrg(orgId);
  const config = await getIntakeConfig();
  if (!config.active || config.token !== token) return null;
  return config;
}

export async function listSubmissions(status: IntakeStatus | "all" = "new", limit = 200): Promise<IntakeSubmission[]> {
  let q = Collections.intakeSubmissions().orderBy("submittedAt", "desc").limit(limit);
  if (status !== "all") q = Collections.intakeSubmissions().where("status", "==", status).orderBy("submittedAt", "desc").limit(limit);
  return mapDocs(await q.get());
}

export const getSubmission = cache(async (id: string) => getDoc(Collections.intakeSubmissions(), id));

/** Quantidade de fichas novas, para o aviso na navegação. */
export const countNewSubmissions = cache(async (): Promise<number> => {
  const snap = await Collections.intakeSubmissions().where("status", "==", "new").count().get();
  return snap.data().count;
});

/** Envios na última hora: trava simples contra abuso do formulário aberto. */
export async function submissionsSince(ms: number): Promise<number> {
  const snap = await Collections.intakeSubmissions().where("submittedAt", ">=", ms).aggregate({ total: AggregateField.count() }).get();
  return Number(snap.data().total ?? 0);
}
