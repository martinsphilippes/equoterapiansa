/** Tipos utilitários para páginas do App Router (params/searchParams são Promises). */
export type SearchParams = Promise<Record<string, string | string[] | undefined>>;
export type Params<T extends Record<string, string>> = Promise<T>;
export function sp1(sp: Record<string, string | string[] | undefined>, key: string): string | undefined {
  const v = sp[key];
  return Array.isArray(v) ? v[0] : v;
}
