"use client";
import { useRef, useState } from "react";
import { signInWithCustomToken, signOut } from "firebase/auth";
import { ref, uploadBytesResumable } from "firebase/storage";
import { useRouter } from "next/navigation";
import { clientAuth, clientStorage } from "@/lib/firebase/client";
import { Button, Field, Input, Select, Alert } from "@/components/ui";
import type { ActionResult } from "@/lib/actions/result";
import type { DocumentType } from "@/lib/db/types";

type Register = (prev: ActionResult | null, fd: FormData) => Promise<ActionResult>;

/**
 * Envio de arquivo em 3 passos: token curto → upload direto ao Storage
 * (pasta temporária do usuário) → registro no servidor, que move o arquivo
 * para o destino definitivo e grava o documento com auditoria.
 */
export async function uploadToTemp(file: File, onProgress?: (pct: number) => void): Promise<{ tempPath: string }> {
  const res = await fetch("/api/auth/upload-token", { method: "POST" });
  if (!res.ok) throw new Error("Sem permissão para enviar arquivos.");
  const { token, uid } = await res.json();
  await signInWithCustomToken(clientAuth, token);
  const tempPath = `uploads/${uid}/${Date.now()}-${Math.random().toString(36).slice(2)}-${file.name}`;
  try {
    await new Promise<void>((resolve, reject) => {
      const task = uploadBytesResumable(ref(clientStorage, tempPath), file, { contentType: file.type || "application/octet-stream" });
      task.on("state_changed", (s) => onProgress?.(Math.round((s.bytesTransferred / s.totalBytes) * 100)), reject, () => resolve());
    });
  } finally {
    await signOut(clientAuth).catch(() => {});
  }
  return { tempPath };
}

export function DocumentUploader({ ownerType, ownerId, types, register }: { ownerType: "collaborator" | "practitioner"; ownerId: string; types: DocumentType[]; register: Register }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [typeId, setTypeId] = useState(types[0]?.id ?? "");
  const formRef = useRef<HTMLFormElement>(null);
  const selected = types.find((t) => t.id === typeId);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    const file = fd.get("file") as File | null;
    if (!file || file.size === 0) { setError("Selecione um arquivo."); return; }
    if (file.size > 25 * 1024 * 1024) { setError("Arquivo acima de 25 MB."); return; }
    try {
      setProgress(0);
      const { tempPath } = await uploadToTemp(file, setProgress);
      const body = new FormData();
      body.set("ownerType", ownerType);
      body.set("ownerId", ownerId);
      body.set("typeId", String(fd.get("typeId")));
      body.set("tempPath", tempPath);
      body.set("fileName", file.name);
      body.set("size", String(file.size));
      body.set("contentType", file.type);
      body.set("expiresAt", String(fd.get("expiresAt") ?? ""));
      body.set("notes", String(fd.get("notes") ?? ""));
      const r = await register(null, body);
      if (!r.ok) throw new Error(r.error);
      formRef.current?.reset();
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha no envio.");
    } finally {
      setProgress(null);
    }
  }

  if (!open) return <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>+ Enviar documento</Button>;

  return (
    <form ref={formRef} onSubmit={submit} className="rounded-xl border border-ink-100 bg-sand-50 p-4 space-y-3">
      {error && <Alert tone="error">{error}</Alert>}
      <Field label="Tipo de documento">
        <Select name="typeId" value={typeId} onChange={(e) => setTypeId(e.target.value)} required>
          {types.map((t) => <option key={t.id} value={t.id}>{t.name}{t.required ? " (obrigatório)" : ""}</option>)}
        </Select>
      </Field>
      <Field label="Arquivo" hint="PDF ou imagem, até 25 MB.">
        <Input name="file" type="file" accept="application/pdf,image/*" required className="py-2" />
      </Field>
      {selected?.hasExpiry && <Field label="Válido até"><Input name="expiresAt" type="date" /></Field>}
      <Field label="Observação (opcional)"><Input name="notes" /></Field>
      <div className="flex gap-2">
        <Button type="submit" disabled={progress !== null}>{progress === null ? "Enviar" : `Enviando ${progress}%`}</Button>
        <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
      </div>
    </form>
  );
}

export function PhotoUploader({ ownerId, save }: { ownerId: string; save: Register }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true); setError(null);
    try {
      const { tempPath } = await uploadToTemp(file);
      const body = new FormData();
      body.set("ownerId", ownerId);
      body.set("tempPath", tempPath);
      const r = await save(null, body);
      if (!r.ok) throw new Error(r.error);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha no envio.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <label className="text-xs text-brand-700 cursor-pointer hover:underline">
      {busy ? "Enviando…" : "Alterar foto"}
      <input type="file" accept="image/*" className="hidden" onChange={onChange} disabled={busy} />
      {error && <span className="block text-red-700">{error}</span>}
    </label>
  );
}
