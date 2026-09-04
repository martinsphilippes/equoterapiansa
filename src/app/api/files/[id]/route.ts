import { NextResponse } from "next/server";
import { getCurrentUser, canAccessPractitioner, hasAny } from "@/lib/auth/session";
import { Collections, getDoc } from "@/lib/db/collections";
import { readFile } from "@/lib/files/store";
import { audit } from "@/lib/db/audit";

/** Entrega um arquivo armazenado (documento ou foto), após verificar permissão. */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  let fileId: string;
  let fileName = "arquivo";

  if (id.startsWith("photo_")) {
    const p = await getDoc(Collections.practitioners(), id.slice(6));
    if (!p || !p.photoPath) return NextResponse.json({ error: "Não encontrado." }, { status: 404 });
    if (!canAccessPractitioner(user, p) && !hasAny(user, ["practitioners.view"])) return NextResponse.json({ error: "Sem permissão." }, { status: 403 });
    fileId = p.photoPath;
    fileName = "foto";
  } else {
    const doc = await getDoc(Collections.documents(), id);
    if (!doc) return NextResponse.json({ error: "Não encontrado." }, { status: 404 });
    let allowed = false;
    if (doc.ownerType === "collaborator") {
      allowed = hasAny(user, ["collaborators.view", "documents.manage"]) || user.collaboratorId === doc.ownerId;
    } else {
      const p = await getDoc(Collections.practitioners(), doc.ownerId);
      if (p) allowed = user.role === "guardian" ? canAccessPractitioner(user, p) && doc.visibleToGuardian : canAccessPractitioner(user, p) || hasAny(user, ["documents.manage"]);
    }
    if (!allowed) return NextResponse.json({ error: "Sem permissão." }, { status: 403 });
    fileId = doc.storagePath;
    fileName = doc.fileName;
    await audit({ id: user.id, name: user.name }, { action: "document.view", entity: "document", entityId: doc.id, entityLabel: doc.fileName });
  }

  const file = await readFile(fileId);
  if (!file) return NextResponse.json({ error: "Arquivo não encontrado." }, { status: 404 });
  return new NextResponse(new Uint8Array(file.buffer), {
    headers: {
      "Content-Type": file.meta.contentType,
      "Content-Length": String(file.buffer.length),
      "Content-Disposition": `inline; filename="${encodeURIComponent(fileName)}"`,
      "Cache-Control": "private, max-age=60",
    },
  });
}
