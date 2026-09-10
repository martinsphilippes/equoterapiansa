import "server-only";
import { AsyncLocalStorage } from "node:async_hooks";
import { cache } from "react";

/**
 * Unidade (empresa) da requisição atual.
 *
 * Cada unidade guarda seus dados em coleções próprias: a unidade principal usa
 * os nomes originais e as demais recebem um prefixo. A separação é física, não
 * um filtro que alguém possa esquecer numa consulta nova — uma consulta feita
 * na unidade errada simplesmente não encontra a coleção da outra.
 *
 * Guardar a unidade não é trivial porque quem descobre qual é (a autenticação)
 * é chamado de dentro de quem precisa dela (a tela ou a ação). Por isso o valor
 * mora em um objeto criado *antes*, no início da requisição, e a autenticação
 * apenas o preenche:
 *
 * - Em telas (render), esse objeto vem do cache do React, que já é por requisição.
 * - Em ações e rotas, vem de um escopo aberto explicitamente por `withOrgScope`
 *   (é o que `guard` faz em toda ação), porque ali o cache do React não tem
 *   escopo de requisição — cada chamada devolveria um objeto novo.
 */
export const DEFAULT_ORG_ID = "principal";

type Scope = {
  orgId: string | null;
  /** Sessão da requisição, resolvida uma única vez (o cache do React não vale em ações). */
  user?: unknown;
};

/** Escopo aberto no ponto de entrada (ações e rotas). Mutável de propósito. */
const scopeStore = new AsyncLocalStorage<Scope>();

/** Escopo por requisição em render, cortesia do cache do React. */
const holder = cache((): Scope => ({ orgId: null }));

/** Usado só por runInOrg, que troca de unidade dentro de um trecho conhecido. */
const explicitStore = new AsyncLocalStorage<{ orgId: string }>();

function holderOrNull(): Scope | null {
  try {
    return holder();
  } catch {
    return null; // fora de um escopo React
  }
}

/**
 * Abre o escopo da unidade para uma ação ou rota. Sem isso, a unidade
 * descoberta pela autenticação não chegaria de volta a quem a chamou.
 */
export function withOrgScope<T>(fn: () => T): T {
  if (scopeStore.getStore()) return fn(); // já aberto por quem chamou
  return scopeStore.run({ orgId: null }, fn);
}

/** Define a unidade desta requisição. Chamado pela autenticação. */
export function enterOrg(orgId: string): void {
  const id = orgId || DEFAULT_ORG_ID;
  const scope = scopeStore.getStore();
  if (scope) scope.orgId = id;
  const h = holderOrNull();
  if (h) h.orgId = id;
}

/** Escopo aberto da ação/rota atual, quando existe. */
export function orgScope(): Scope | null {
  return scopeStore.getStore() ?? null;
}

/** Executa um trecho em outra unidade (semear dados, ler um link público). */
export function runInOrg<T>(orgId: string, fn: () => T): T {
  return explicitStore.run({ orgId: orgId || DEFAULT_ORG_ID }, fn);
}

export function currentOrgIdOrNull(): string | null {
  return explicitStore.getStore()?.orgId ?? scopeStore.getStore()?.orgId ?? holderOrNull()?.orgId ?? null;
}

/**
 * Falha fechada: sem unidade definida não há leitura nem escrita. Preferimos um
 * erro visível a servir dados da unidade errada.
 */
export function currentOrgId(): string {
  const orgId = currentOrgIdOrNull();
  if (!orgId) throw new Error("Unidade não definida para esta operação. Verifique a autenticação da tela ou ação.");
  return orgId;
}

/** Prefixo das coleções da unidade. A principal fica sem prefixo, preservando os dados existentes. */
export function orgPrefix(orgId: string = currentOrgId()): string {
  return orgId === DEFAULT_ORG_ID ? "" : `${orgId}_`;
}

/** Identificador utilizável como nome de coleção. */
export function slugifyOrgId(name: string): string {
  return name.normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);
}
