import { NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase/admin";
import { getCurrentUser } from "@/lib/auth/session";

/**
 * Token curto para o navegador enviar arquivos direto ao Storage
 * (pasta temporária uploads/{uid}). Só para perfis da equipe.
 */
export async function POST() {
  const user = await getCurrentUser();
  if (!user || user.role === "guardian") return NextResponse.json({ error: "Sem permissão." }, { status: 403 });
  const token = await adminAuth.createCustomToken(user.id, { role: user.role });
  return NextResponse.json({ token, uid: user.id });
}
