import "server-only";
import { getApps, initializeApp, cert, type App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, FieldValue, Timestamp } from "firebase-admin/firestore";

/**
 * Inicialização única do Firebase Admin.
 * - Produção: credenciais via FIREBASE_SERVICE_ACCOUNT_BASE64.
 * - Local: com os emuladores (FIRESTORE_EMULATOR_HOST etc.) basta o projectId.
 */
function init(): App {
  const existing = getApps()[0];
  if (existing) return existing;

  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
  const usingEmulators = !!process.env.FIRESTORE_EMULATOR_HOST;

  if (raw && !usingEmulators) {
    const json = JSON.parse(Buffer.from(raw, "base64").toString("utf8"));
    return initializeApp({ credential: cert(json), projectId: json.project_id ?? projectId });
  }
  if (!usingEmulators) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT_BASE64 não configurado. Veja .env.example e README.md.");
  }
  return initializeApp({ projectId });
}

export const adminApp = init();
export const adminAuth = getAuth(adminApp);
export const db = getFirestore(adminApp);
export const isEmulator = !!process.env.FIRESTORE_EMULATOR_HOST;
export { FieldValue, Timestamp };

try {
  db.settings({ ignoreUndefinedProperties: true });
} catch {
  // settings() só pode ser chamado uma vez; em hot reload ignoramos.
}
