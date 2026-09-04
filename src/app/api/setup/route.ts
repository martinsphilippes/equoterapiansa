import { NextResponse } from "next/server";
import { adminAuth, db } from "@/lib/firebase/admin";
import { Collections } from "@/lib/db/collections";
import { seedDefaults } from "@/lib/db/seed";
import { DEFAULT_PERMISSIONS } from "@/lib/auth/permissions";

export const dynamic = "force-dynamic";

/** Cria o primeiro usuário Dono. Só funciona enquanto não existir nenhum dono. */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { name?: string; email?: string; password?: string; secret?: string; orgName?: string };
  const existing = await Collections.users().where("role", "==", "owner").limit(1).get();
  if (!existing.empty) return NextResponse.json({ error: "O sistema já foi configurado." }, { status: 409 });
  if (process.env.SETUP_SECRET && body.secret !== process.env.SETUP_SECRET) {
    return NextResponse.json({ error: "Segredo de configuração inválido." }, { status: 403 });
  }
  if (!body.name || !body.email || !body.password || body.password.length < 8) {
    return NextResponse.json({ error: "Informe nome, e-mail e uma senha com pelo menos 8 caracteres." }, { status: 400 });
  }
  try {
    const user = await adminAuth.createUser({ email: body.email, password: body.password, displayName: body.name, emailVerified: true });
    await adminAuth.setCustomUserClaims(user.uid, { role: "owner" });
    const now = Date.now();
    await Collections.users().doc(user.uid).set({
      id: user.uid, email: body.email, name: body.name, role: "owner",
      permissions: DEFAULT_PERMISSIONS.owner, active: true, createdAt: now, updatedAt: now,
    });
    await seedDefaults(body.orgName?.trim() || "Equoterapia");
    await db.collection("auditLogs").add({
      action: "setup", entity: "system", entityId: "setup", userId: user.uid, userName: body.name, at: now, details: {},
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro ao criar usuário.";
    return NextResponse.json({ error: msg.includes("email-already-exists") ? "Este e-mail já está em uso." : msg }, { status: 400 });
  }
}

export async function GET() {
  const existing = await Collections.users().where("role", "==", "owner").limit(1).get();
  return NextResponse.json({ configured: !existing.empty, requiresSecret: !!process.env.SETUP_SECRET });
}
