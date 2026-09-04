import { unstable_rethrow } from "next/navigation";

export type ActionResult = { ok: true; message?: string; id?: string; redirect?: string } | { ok: false; error: string };

export function fail(error: string): ActionResult {
  return { ok: false, error };
}
export function success(message?: string, id?: string, redirect?: string): ActionResult {
  return { ok: true, message, id, redirect };
}

/** Converte exceções em resultado amigável para a interface (preserva redirects do Next). */
export async function guard(fn: () => Promise<ActionResult>): Promise<ActionResult> {
  try {
    return await fn();
  } catch (e) {
    unstable_rethrow(e);
    const msg = e instanceof Error ? e.message : "Erro inesperado.";
    return { ok: false, error: msg };
  }
}

export function str(fd: FormData, key: string): string {
  const v = fd.get(key);
  return typeof v === "string" ? v.trim() : "";
}
export function opt(fd: FormData, key: string): string | undefined {
  const v = str(fd, key);
  return v === "" ? undefined : v;
}
export function num(fd: FormData, key: string): number | undefined {
  let v = str(fd, key);
  if (v === "") return undefined;
  // aceita "2.300,50" e "2300.50"
  if (v.includes(",")) v = v.replace(/\./g, "").replace(",", ".");
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}
export function bool(fd: FormData, key: string): boolean {
  const v = fd.get(key);
  return v === "on" || v === "true" || v === "1";
}
export function list(fd: FormData, key: string): string[] {
  return fd.getAll(key).map((v) => String(v).trim()).filter(Boolean);
}
export const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
export const HM = /^\d{2}:\d{2}$/;
