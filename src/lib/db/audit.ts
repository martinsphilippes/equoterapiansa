import "server-only";
import { Collections } from "./collections";
import type { WriteBatch } from "firebase-admin/firestore";

export interface Actor {
  id: string;
  name: string;
}

/**
 * Registra uma ação importante. Pode ser incluída em um batch para ser
 * gravada atomicamente junto com a alteração.
 */
export function audit(
  actor: Actor,
  entry: { action: string; entity: string; entityId: string; entityLabel?: string; details?: Record<string, unknown> },
  batch?: WriteBatch
) {
  const ref = Collections.auditLogs().doc();
  const data = {
    id: ref.id,
    action: entry.action,
    entity: entry.entity,
    entityId: entry.entityId,
    entityLabel: entry.entityLabel,
    userId: actor.id,
    userName: actor.name,
    at: Date.now(),
    details: entry.details ?? {},
  };
  if (batch) {
    batch.set(ref, data);
    return Promise.resolve();
  }
  return ref.set(data);
}
