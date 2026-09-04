"use client";
/**
 * No navegador o Firebase é usado apenas para o login (obter o token).
 * O SDK é carregado sob demanda (import dinâmico) para não pesar o carregamento inicial.
 */
export async function loadClientAuth() {
  const [{ getApps, initializeApp }, auth] = await Promise.all([import("firebase/app"), import("firebase/auth")]);
  const config = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  };
  const app = getApps()[0] ?? initializeApp(config);
  const clientAuth = auth.getAuth(app);
  const g = globalThis as { __equoEmulatorsConnected?: boolean };
  if (process.env.NEXT_PUBLIC_USE_EMULATORS === "1" && !g.__equoEmulatorsConnected) {
    g.__equoEmulatorsConnected = true;
    auth.connectAuthEmulator(clientAuth, "http://127.0.0.1:9099", { disableWarnings: true });
  }
  return { clientAuth, ...auth };
}
