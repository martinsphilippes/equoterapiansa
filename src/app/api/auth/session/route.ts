import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { adminAuth } from "@/lib/firebase/admin";
import { Collections } from "@/lib/db/collections";
import { SESSION_COOKIE, SESSION_DAYS } from "@/lib/auth/session";

/** Troca o ID token (login no cliente) por um cookie de sessão httpOnly. */
export async function POST(req: Request) {
  const { idToken } = (await req.json().catch(() => ({}))) as { idToken?: string };
  if (!idToken) return NextResponse.json({ error: "Token ausente." }, { status: 400 });
  try {
    const decoded = await adminAuth.verifyIdToken(idToken, true);
    const profile = await Collections.users().doc(decoded.uid).get();
    if (!profile.exists || profile.data()?.active === false) {
      return NextResponse.json({ error: "Acesso não liberado. Fale com a administração." }, { status: 403 });
    }
    const expiresIn = SESSION_DAYS * 24 * 60 * 60 * 1000;
    const cookie = await adminAuth.createSessionCookie(idToken, { expiresIn });
    const store = await cookies();
    store.set(SESSION_COOKIE, cookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: expiresIn / 1000,
    });
    const role = profile.data()?.role;
    return NextResponse.json({ ok: true, role, mustChangePassword: !!profile.data()?.mustChangePassword });
  } catch {
    return NextResponse.json({ error: "Não foi possível iniciar a sessão." }, { status: 401 });
  }
}
