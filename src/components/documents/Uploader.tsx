"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Field, Input, Select, Alert } from "@/components/ui";
import type { ActionResult } from "@/lib/actions/result";
import type { DocumentType } from "@/lib/db/types";

type Register = (prev: ActionResult | null, fd: FormData) => Promise<ActionResult>;
const MAX = 4 * 1024 * 1024;

/**
 * Fotos e digitalizações de celular costumam ter 3–8 MB. Antes de enviar,
 * imagens são redimensionadas (máx. 1600 px) e recomprimidas em JPEG no
 * próprio navegador, o que costuma resultar em 200–600 KB. PDFs vão como estão.
 */
export async function prepareFile(file: File, maxSide = 1600, quality = 0.82): Promise<File> {
  if (!file.type.startsWith("image/") || file.type === "image/gif") return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/jpeg", quality));
    if (!blob) return file;
    return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg" });
  } catch {
    return file;
  }
}

export function DocumentUploader({ ownerType, ownerId, types, register }: { ownerType: "collaborator" | "practitioner"; ownerId: string; types: DocumentType[]; register: Register }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [typeId, setTypeId] = useState(types[0]?.id ?? "");
  const formRef = useRef<HTMLFormElement>(null);
  const selected = types.find((t) => t.id === typeId);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    const raw = fd.get("file") as File | null;
    if (!raw || raw.size === 0) { setError("Selecione um arquivo."); return; }
    setBusy(true);
    try {
      const file = await prepareFile(raw);
      if (file.size > MAX) throw new Error("Arquivo acima de 4 MB. Para PDFs, reduza a resolução do scanner (150 dpi costuma bastar).");
      fd.set("file", file);
      fd.set("ownerType", ownerType);
      fd.set("ownerId", ownerId);
      const r = await register(null, fd);
      if (!r.ok) throw new Error(r.error);
      formRef.current?.reset();
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha no envio.");
    } finally {
      setBusy(false);
    }
  }

  if (!open) return <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>+ Enviar documento</Button>;

  return (
    <form ref={formRef} onSubmit={submit} className="rounded-xl border border-border bg-surface-50 p-4 space-y-3">
      {error && <Alert tone="error">{error}</Alert>}
      <Field label="Tipo de documento">
        <Select name="typeId" value={typeId} onChange={(e) => setTypeId(e.target.value)} required>
          {types.map((t) => <option key={t.id} value={t.id}>{t.name}{t.required ? " (obrigatório)" : ""}</option>)}
        </Select>
      </Field>
      <Field label="Arquivo" hint="PDF ou foto. Fotos são otimizadas automaticamente; PDFs até 4 MB.">
        <Input name="file" type="file" accept="application/pdf,image/*" required className="py-2" />
      </Field>
      {selected?.hasExpiry && <Field label="Válido até"><Input name="expiresAt" type="date" /></Field>}
      <Field label="Observação (opcional)"><Input name="notes" /></Field>
      <div className="flex gap-2">
        <Button type="submit" disabled={busy}>{busy ? "Enviando…" : "Enviar"}</Button>
        <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={busy}>Cancelar</Button>
      </div>
    </form>
  );
}

export function PhotoUploader({ ownerId, save }: { ownerId: string; save: Register }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.files?.[0];
    if (!raw) return;
    setBusy(true); setError(null);
    try {
      const file = await prepareFile(raw, 600, 0.85);
      const fd = new FormData();
      fd.set("ownerId", ownerId);
      fd.set("file", file);
      const r = await save(null, fd);
      if (!r.ok) throw new Error(r.error);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha no envio.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <label className="text-xs text-primary-700 cursor-pointer hover:underline">
      {busy ? "Enviando…" : "Alterar foto"}
      <input type="file" accept="image/*" className="hidden" onChange={onChange} disabled={busy} />
      {error && <span className="block text-red-700">{error}</span>}
    </label>
  );
}
