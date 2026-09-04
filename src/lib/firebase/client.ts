"use client";
import { getApps, initializeApp } from "firebase/app";
import { getAuth, connectAuthEmulator } from "firebase/auth";

/** No navegador o Firebase é usado apenas para o login (obter o token). */
const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = getApps()[0] ?? initializeApp(config);
export const clientAuth = getAuth(app);

declare global {
  var __equoEmulatorsConnected: boolean | undefined;
}

if (process.env.NEXT_PUBLIC_USE_EMULATORS === "1" && typeof window !== "undefined" && !globalThis.__equoEmulatorsConnected) {
  globalThis.__equoEmulatorsConnected = true;
  connectAuthEmulator(clientAuth, "http://127.0.0.1:9099", { disableWarnings: true });
}
