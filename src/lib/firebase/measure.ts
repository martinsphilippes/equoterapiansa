import "server-only";
import { DocumentReference, Query, Firestore } from "firebase-admin/firestore";

/**
 * Instrumentação opcional (MEASURE_READS=1): conta leituras do Firestore
 * (documentos lidos) para auditoria de performance. Nunca ativa em produção.
 */
declare global {
  var __fsReads: { docs: number; ops: number } | undefined;
}

export function installReadCounter() {
  if (process.env.MEASURE_READS !== "1" || globalThis.__fsReads) return;
  globalThis.__fsReads = { docs: 0, ops: 0 };
  const bump = (docs: number) => { const c = globalThis.__fsReads!; c.ops++; c.docs += docs; };
  const docGet = DocumentReference.prototype.get;
  DocumentReference.prototype.get = async function (this: DocumentReference, ...args: Parameters<typeof docGet>) {
    const snap = await docGet.apply(this, args);
    bump(1);
    return snap;
  } as typeof docGet;
  const queryGet = Query.prototype.get;
  Query.prototype.get = async function (this: Query, ...args: Parameters<typeof queryGet>) {
    const snap = await queryGet.apply(this, args);
    bump(Math.max(1, snap.size));
    return snap;
  } as typeof queryGet;
  const getAll = Firestore.prototype.getAll;
  Firestore.prototype.getAll = async function (this: Firestore, ...args: Parameters<typeof getAll>) {
    const snaps = await getAll.apply(this, args);
    bump(snaps.length);
    return snaps;
  } as typeof getAll;
}

export function readReadCounter(reset = false) {
  const c = globalThis.__fsReads ?? { docs: 0, ops: 0 };
  const out = { ...c };
  if (reset && globalThis.__fsReads) { globalThis.__fsReads.docs = 0; globalThis.__fsReads.ops = 0; }
  return out;
}
