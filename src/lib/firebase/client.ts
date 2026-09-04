"use client";
import { getApps, initializeApp } from "firebase/app";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import { getStorage, connectStorageEmulator } from "firebase/storage";

const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = getApps()[0] ?? initializeApp(config);
export const clientAuth = getAuth(app);
export const clientStorage = getStorage(app);

declare global {
  var __equoEmulatorsConnected: boolean | undefined;
}

if (process.env.NEXT_PUBLIC_USE_EMULATORS === "1" && typeof window !== "undefined" && !globalThis.__equoEmulatorsConnected) {
  globalThis.__equoEmulatorsConnected = true;
  connectAuthEmulator(clientAuth, "http://127.0.0.1:9099", { disableWarnings: true });
  connectStorageEmulator(clientStorage, "127.0.0.1", 9199);
}
