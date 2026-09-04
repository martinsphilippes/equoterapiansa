import { NextResponse } from "next/server";
import { getCurrentUser, canAccessPractitioner, hasAny } from "@/lib/auth/session";
import { Collections, getDoc } from "@/lib/db/collections";
import { bucket, isEmulator } from "@/lib/firebase/admin";
import { audit } from "@/lib/db/audit";

/** Entrega um documento armazenado, após verificar permissão. */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  let storagePath: string | null = null;
  let contentType = "application/octet-stream";
  let fileName = "arquivo";

  if (id.startsWith("photo_")) {
    const practitionerId = id.slice(6);
    const p = await getDoc(Collections.practitioners(), practitionerId);
    if (!p || !p.photoPath) return NextResponse.json({ error: "Não encontrado." }, { status: 404 });
    if (!canAccessPractitioner(user, p) && !hasAny(user, ["practitioners.view"])) return NextResponse.json({ error: "Sem permissão." }, { status: 403 });
    storagePath = p.photoPath;
    contentType = "image/jpeg";
    fileName = "foto.jpg";
  } else {
    const doc = await getDoc(Collections.documents(), id);
    if (!doc) return NextResponse.json({ error: "Não encontrado." }, { status: 404 });
    let allowed = false;
    if (doc.ownerType === "collaborator") {
      allowed = hasAny(user, ["collaborators.view", "documents.manage"]) || user.collaboratorId === doc.ownerId;
    } else {
      const p = await getDoc(Collections.practitioners(), doc.ownerId);
      if (p) {
        if (user.role === "guardian") allowed = canAccessPractitioner(user, p) && doc.visibleToGuardian;
        else allowed = canAccessPractitioner(user, p) || hasAny(user, ["documents.manage"]);
      }
    }
    if (!allowed) return NextResponse.json({ error: "Sem permissão." }, { status: 403 });
    storagePath = doc.storagePath;
    contentType = doc.contentType || contentType;
    fileName = doc.fileName;
    await audit({ id: user.id, name: user.name }, { action: "document.view", entity: "document", entityId: doc.id, entityLabel: doc.fileName });
  }

  const file = bucket().file(storagePath);
  if (!isEmulator) {
    try {
      const [url] = await file.getSignedUrl({ action: "read", expires: Date.now() + 10 * 60 * 1000, responseDisposition: `inline; filename="${encodeURIComponent(fileName)}"` });
      return NextResponse.redirect(url);
    } catch {
      // se a conta de serviço não puder assinar, transmite o arquivo pelo servidor
    }
  }
  const [buf] = await file.download();
  return new NextResponse(new Uint8Array(buf), {
    headers: { "Content-Type": contentType, "Content-Disposition": `inline; filename="${encodeURIComponent(fileName)}"`, "Cache-Control": "private, max-age=60" },
  });
}
