import "server-only";
import { db } from "@/lib/firebase/admin";
import { Collections } from "./collections";
import { DEFAULT_ASSESSMENT_CATEGORIES, DEFAULT_DOCUMENT_TYPES, DEFAULT_JOB_ROLES, DEFAULT_SETTINGS, settingsRef } from "./settings";

/** Dados iniciais configuráveis (funções, tipos de documentos, categorias de avaliação, jornada). */
export async function seedDefaults(orgName: string) {
  const now = Date.now();
  const batch = db.batch();
  batch.set(settingsRef(), { ...DEFAULT_SETTINGS, orgName, updatedAt: now });
  for (const r of DEFAULT_JOB_ROLES) {
    const ref = Collections.jobRoles().doc();
    batch.set(ref, { id: ref.id, name: r.name, isProfessional: r.isProfessional, active: true, createdAt: now });
  }
  for (const d of DEFAULT_DOCUMENT_TYPES) {
    const ref = Collections.documentTypes().doc();
    batch.set(ref, { id: ref.id, ...d, active: true, createdAt: now });
  }
  DEFAULT_ASSESSMENT_CATEGORIES.forEach((c, i) => {
    const ref = Collections.assessmentCategories().doc();
    batch.set(ref, {
      id: ref.id, name: c.name, order: i + 1, active: true, createdAt: now,
      items: c.items.map((name, j) => ({ id: `${ref.id}_${j + 1}`, name, active: true })),
    });
  });
  await batch.commit();
}
