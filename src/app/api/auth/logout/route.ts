import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ORG_COOKIE, SESSION_COOKIE } from "@/lib/auth/session";

export async function POST() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
  store.delete(ORG_COOKIE);
  return NextResponse.json({ ok: true });
}
