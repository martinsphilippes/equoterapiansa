import { NextResponse, type NextRequest } from "next/server";

const PUBLIC = ["/entrar", "/configuracao-inicial", "/manifest.webmanifest", "/sw.js", "/icons", "/api/auth", "/api/setup", "/offline"];

/**
 * Apenas verifica a presença do cookie de sessão para redirecionar cedo.
 * A verificação criptográfica acontece no servidor (lib/auth/session.ts).
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (PUBLIC.some((p) => pathname === p || pathname.startsWith(p + "/"))) return NextResponse.next();
  const has = request.cookies.has("__session");
  if (!has) {
    const url = request.nextUrl.clone();
    url.pathname = "/entrar";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icons/|.*\\.(?:png|svg|ico|webmanifest)$).*)"],
};
