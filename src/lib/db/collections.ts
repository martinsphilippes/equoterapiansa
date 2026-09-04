import "server-only";
import { db } from "@/lib/firebase/admin";
import type { CollectionReference, DocumentData, DocumentReference } from "firebase-admin/firestore";
import type {
  Announcement, Appointment, Assessment, AssessmentCategory, AuditLog, Collaborator, DocumentType,
  EvolutionReport, Guardian, JobRole, PayrollMonth, Practitioner, PractitionerEvent, Session,
  StoredDocument, TimeEntry, UserProfile,
} from "./types";

function col<T extends DocumentData>(name: string) {
  return db.collection(name) as CollectionReference<T>;
}

export const Collections = {
  users: () => col<UserProfile>("users"),
  jobRoles: () => col<JobRole>("jobRoles"),
  collaborators: () => col<Collaborator>("collaborators"),
  documentTypes: () => col<DocumentType>("documentTypes"),
  documents: () => col<StoredDocument>("documents"),
  timeEntries: () => col<TimeEntry>("timeEntries"),
  payrollMonths: () => col<PayrollMonth>("payrollMonths"),
  practitioners: () => col<Practitioner>("practitioners"),
  guardians: () => col<Guardian>("guardians"),
  appointments: () => col<Appointment>("appointments"),
  sessions: () => col<Session>("sessions"),
  assessmentCategories: () => col<AssessmentCategory>("assessmentCategories"),
  assessments: () => col<Assessment>("assessments"),
  reports: () => col<EvolutionReport>("reports"),
  announcements: () => col<Announcement>("announcements"),
  practitionerEvents: () => col<PractitionerEvent>("practitionerEvents"),
  auditLogs: () => col<AuditLog>("auditLogs"),
};

export function newId(collection: string) {
  return db.collection(collection).doc().id;
}

export async function getDoc<T>(ref: CollectionReference<T>, id: string): Promise<T | null> {
  const snap = await ref.doc(id).get();
  return snap.exists ? ({ ...(snap.data() as T), id: snap.id } as T) : null;
}

export function mapDocs<T>(snap: FirebaseFirestore.QuerySnapshot<T>): T[] {
  return snap.docs.map((d) => ({ ...(d.data() as T), id: d.id }));
}

/** Busca em lote por ids (Firestore limita `in` a 30). */
export async function getMany<T>(ref: CollectionReference<T>, ids: string[]): Promise<T[]> {
  const unique = Array.from(new Set(ids.filter(Boolean)));
  if (unique.length === 0) return [];
  const out: T[] = [];
  for (let i = 0; i < unique.length; i += 30) {
    const chunk = unique.slice(i, i + 30);
    const snaps = await db.getAll(...chunk.map((id) => ref.doc(id) as unknown as DocumentReference<DocumentData>));
    for (const s of snaps) if (s.exists) out.push({ ...(s.data() as T), id: s.id });
  }
  return out;
}
