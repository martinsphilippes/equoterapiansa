import type { Permission, Role } from "@/lib/auth/permissions";

/** Datas são armazenadas como "YYYY-MM-DD" e horas como "HH:mm" (fuso da instituição). */
export type ISODate = string;
export type HM = string;

export interface UserProfile {
  id: string; // uid do Firebase Auth
  email: string;
  name: string;
  role: Role;
  permissions: Permission[]; // efetivas (padrão do perfil, ajustável pelo Dono)
  collaboratorId?: string;
  guardianId?: string;
  active: boolean;
  mustChangePassword?: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface WorkPeriod {
  start: HM;
  end: HM;
}

export interface WorkSchedule {
  /** Dias da semana trabalhados (0=domingo ... 6=sábado). */
  weekdays: number[];
  periods: WorkPeriod[];
}

export interface ScaleLevel {
  value: number;
  label: string;
}

export interface Settings {
  orgName: string;
  timezone: string;
  schedule: WorkSchedule;
  /** Tolerância de atraso em minutos antes de contar como atraso. */
  lateToleranceMinutes: number;
  /** Feriados / dias sem expediente (YYYY-MM-DD). */
  holidays: ISODate[];
  scale: ScaleLevel[];
  assessmentIntervalMonths: number;
  sessionTypes: string[];
  updatedAt: number;
}

export interface JobRole {
  id: string;
  name: string;
  active: boolean;
  /** Se true, o colaborador com esta função pode registrar atendimentos (perfil profissional). */
  isProfessional: boolean;
  createdAt: number;
}

export type CollaboratorStatus = "active" | "away" | "terminated";
export type PayType = "monthly" | "hourly";

export interface Collaborator {
  id: string;
  name: string;
  cpf?: string;
  phone?: string;
  email?: string;
  address?: string;
  birthDate?: ISODate;
  admissionDate?: ISODate;
  terminationDate?: ISODate | null;
  jobRoleId?: string;
  jobRoleName?: string;
  payType: PayType;
  salary?: number; // mensal
  hourlyRate?: number;
  /** Jornada própria; se ausente usa a jornada padrão das configurações. */
  schedule?: WorkSchedule | null;
  bankInfo?: string;
  notes?: string;
  status: CollaboratorStatus;
  userId?: string;
  createdAt: number;
  updatedAt: number;
  createdBy: string;
  updatedBy: string;
}

export type DocumentOwnerType = "collaborator" | "practitioner";

export interface DocumentType {
  id: string;
  name: string;
  appliesTo: DocumentOwnerType;
  required: boolean;
  hasExpiry: boolean;
  /** Visível para o responsável na área da família (apenas praticante). */
  visibleToGuardian: boolean;
  active: boolean;
  createdAt: number;
}

export interface StoredDocument {
  id: string;
  ownerType: DocumentOwnerType;
  ownerId: string;
  typeId: string;
  typeName: string;
  fileName: string;
  storagePath: string;
  size: number;
  contentType: string;
  expiresAt?: ISODate | null;
  notes?: string;
  visibleToGuardian: boolean;
  uploadedBy: string;
  uploadedByName: string;
  uploadedAt: number;
}

export type TimeEntryStatus = "present" | "absent" | "justified" | "off";

export interface TimeEntry {
  id: string; // `${collaboratorId}_${date}`
  collaboratorId: string;
  date: ISODate;
  /** Períodos registrados. `out` ausente = ainda dentro. */
  periods: { in: HM; out?: HM }[];
  breakMinutes: number;
  status: TimeEntryStatus;
  justification?: string;
  managerNote?: string;
  /** Campos calculados no servidor ao salvar. */
  workedMinutes: number;
  expectedMinutes: number;
  lateMinutes: number;
  earlyLeaveMinutes: number;
  source: "self" | "manager";
  createdAt: number;
  updatedAt: number;
  updatedBy: string;
}

export interface PayrollAdjustment {
  id: string;
  description: string;
  amount: number; // positivo = acréscimo, negativo = desconto
}

export interface PayrollMonth {
  id: string; // `${collaboratorId}_${competence}`
  collaboratorId: string;
  collaboratorName: string;
  competence: string; // YYYY-MM
  payType: PayType;
  salary?: number;
  hourlyRate?: number;
  expectedMinutes: number;
  workedMinutes: number;
  absences: number;
  lateCount: number;
  earlyLeaveCount: number;
  referenceHourlyRate: number;
  baseAmount: number;
  adjustments: PayrollAdjustment[];
  calculatedAmount: number;
  paidAmount?: number | null;
  status: "paid" | "unpaid";
  paidAt?: ISODate | null;
  notes?: string;
  /** Quando pago, os números ficam congelados. */
  frozen: boolean;
  createdAt: number;
  updatedAt: number;
  updatedBy: string;
}

export type PractitionerStatus = "active" | "reassessment" | "paused" | "closed";

export interface Practitioner {
  id: string;
  name: string;
  birthDate?: ISODate;
  cpf?: string;
  address?: string;
  phone?: string;
  email?: string;
  photoPath?: string | null;
  entryDate: ISODate;
  status: PractitionerStatus;
  importantInfo?: string; // visível à equipe
  clinicalInfo?: string; // restrito (clinical.view)
  additionalContacts?: string;
  guardianIds: string[];
  /** Profissionais que acompanham este praticante (controle de acesso). */
  professionalIds: string[];
  closure?: {
    date: ISODate;
    reason: string;
    notes?: string;
    decidedBy: string;
    decidedByName: string;
    finalAssessmentId?: string | null;
    reportId?: string | null;
  } | null;
  createdAt: number;
  updatedAt: number;
  createdBy: string;
  updatedBy: string;
}

export interface Guardian {
  id: string;
  name: string;
  cpf?: string;
  phone?: string;
  email?: string;
  address?: string;
  relationship: string;
  appAccess: boolean;
  userId?: string;
  practitionerIds: string[];
  createdAt: number;
  updatedAt: number;
}

export type AppointmentStatus = "scheduled" | "confirmed" | "done" | "missed" | "cancelled" | "rescheduled";

export interface Appointment {
  id: string;
  practitionerId: string;
  practitionerName: string;
  professionalId: string;
  professionalName: string;
  date: ISODate;
  startTime: HM;
  endTime: HM;
  type: string;
  status: AppointmentStatus;
  sessionId?: string | null;
  notes?: string;
  createdAt: number;
  updatedAt: number;
  createdBy: string;
  updatedBy: string;
}

export interface Session {
  id: string;
  appointmentId?: string | null;
  practitionerId: string;
  practitionerName: string;
  professionalId: string;
  professionalName: string;
  date: ISODate;
  time: HM;
  attended: boolean;
  horse?: string;
  activities: string[];
  objective?: string;
  observations?: string;
  incidents?: string;
  evolution?: string;
  createdAt: number;
  updatedAt: number;
  createdBy: string;
  updatedBy: string;
}

export interface AssessmentItem {
  id: string;
  name: string;
  active: boolean;
}

export interface AssessmentCategory {
  id: string;
  name: string;
  order: number;
  active: boolean;
  items: AssessmentItem[];
  createdAt: number;
}

export type AssessmentType = "initial" | "periodic" | "final";

export interface AssessmentScore {
  score: number | null;
  note?: string;
}

export interface Assessment {
  id: string;
  practitionerId: string;
  practitionerName: string;
  type: AssessmentType;
  date: ISODate;
  professionalId: string;
  professionalName: string;
  /** itemId -> nota/observação */
  scores: Record<string, AssessmentScore>;
  /** Snapshot das categorias no momento (para histórico estável). */
  categoriesSnapshot: { id: string; name: string; items: { id: string; name: string }[] }[];
  categoryAverages: Record<string, number | null>;
  overallAverage: number | null;
  scaleMax: number;
  generalNotes?: string;
  createdAt: number;
  updatedAt: number;
  createdBy: string;
  updatedBy: string;
}

export interface EvolutionReport {
  id: string;
  practitionerId: string;
  practitionerName: string;
  title: string;
  periodStart: ISODate;
  periodEnd: ISODate;
  initialAssessmentId?: string | null;
  currentAssessmentId?: string | null;
  professionalId: string;
  professionalName: string;
  /** Conteúdo congelado no momento da geração. */
  snapshot: {
    age: number | null;
    entryDate: ISODate;
    frequency: { expected: number; done: number; missed: number; cancelled: number; percent: number };
    professionals: string[];
    objectives: string[];
    comparison: { categoryId: string; category: string; initial: number | null; current: number | null; delta: number | null }[];
    overall: { initial: number | null; current: number | null; delta: number | null; percentChange: number | null };
    sessionsCount: number;
  };
  observations?: string;
  conclusion?: string;
  sharedWithGuardians: boolean;
  createdAt: number;
  createdBy: string;
}

export type AnnouncementAudience = "all" | "staff" | "guardians" | "guardian" | "practitioner";

export interface Announcement {
  id: string;
  title: string;
  body: string;
  audience: AnnouncementAudience;
  targetId?: string | null; // guardianId ou practitionerId
  targetName?: string | null;
  createdAt: number;
  createdBy: string;
  createdByName: string;
  readBy: string[];
}

export interface PractitionerEvent {
  id: string;
  practitionerId: string;
  date: ISODate;
  type: "entry" | "status" | "closure" | "note";
  title: string;
  description?: string;
  createdAt: number;
  createdBy: string;
}

export interface AuditLog {
  id: string;
  action: string;
  entity: string;
  entityId: string;
  entityLabel?: string;
  userId: string;
  userName: string;
  at: number;
  details?: Record<string, unknown>;
}
