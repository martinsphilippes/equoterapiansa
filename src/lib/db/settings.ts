import "server-only";
import { cache } from "react";
import { db } from "@/lib/firebase/admin";
import type { Settings } from "./types";
import { DEFAULT_SCHEDULE } from "@/lib/domain/time";
import { DEFAULT_TZ } from "@/lib/domain/dates";

export const DEFAULT_SCALE = [
  { value: 1, label: "Muito comprometido" },
  { value: 2, label: "Baixo" },
  { value: 3, label: "Regular" },
  { value: 4, label: "Bom" },
  { value: 5, label: "Muito bom" },
];

export const DEFAULT_SETTINGS: Settings = {
  orgName: "Equoterapia Nossa Senhora Aparecida",
  timezone: DEFAULT_TZ,
  schedule: DEFAULT_SCHEDULE,
  lateToleranceMinutes: 5,
  holidays: [],
  scale: DEFAULT_SCALE,
  assessmentIntervalMonths: 6,
  sessionTypes: ["Equoterapia", "Avaliação", "Reavaliação", "Atendimento em solo"],
  updatedAt: 0,
};

export const settingsRef = () => db.collection("settings").doc("general");

/** Lidas uma única vez por requisição (layout, página e actions compartilham). */
export const getSettings = cache(async (): Promise<Settings> => {
  const snap = await settingsRef().get();
  if (!snap.exists) return DEFAULT_SETTINGS;
  return { ...DEFAULT_SETTINGS, ...(snap.data() as Partial<Settings>) };
});

export const DEFAULT_JOB_ROLES = [
  { name: "Auxiliar guia", isProfessional: false },
  { name: "Equitador", isProfessional: false },
  { name: "Administrativo", isProfessional: false },
  { name: "Tratador", isProfessional: false },
  { name: "Fisioterapeuta", isProfessional: true },
  { name: "Psicólogo(a)", isProfessional: true },
  { name: "Terapeuta ocupacional", isProfessional: true },
  { name: "Fonoaudiólogo(a)", isProfessional: true },
];

export const DEFAULT_DOCUMENT_TYPES = [
  { name: "Documento de identificação", appliesTo: "collaborator", required: true, hasExpiry: false, visibleToGuardian: false },
  { name: "CPF", appliesTo: "collaborator", required: true, hasExpiry: false, visibleToGuardian: false },
  { name: "Comprovante de endereço", appliesTo: "collaborator", required: true, hasExpiry: false, visibleToGuardian: false },
  { name: "Contrato", appliesTo: "collaborator", required: true, hasExpiry: false, visibleToGuardian: false },
  { name: "Certificado", appliesTo: "collaborator", required: false, hasExpiry: true, visibleToGuardian: false },
  { name: "Documento trabalhista", appliesTo: "collaborator", required: false, hasExpiry: false, visibleToGuardian: false },
  { name: "Documento profissional", appliesTo: "collaborator", required: false, hasExpiry: true, visibleToGuardian: false },
  { name: "Outro", appliesTo: "collaborator", required: false, hasExpiry: false, visibleToGuardian: false },
  { name: "Documento de identificação", appliesTo: "practitioner", required: true, hasExpiry: false, visibleToGuardian: false },
  { name: "Laudo / encaminhamento médico", appliesTo: "practitioner", required: true, hasExpiry: true, visibleToGuardian: false },
  { name: "Termo de consentimento", appliesTo: "practitioner", required: true, hasExpiry: false, visibleToGuardian: true },
  { name: "Atestado / liberação", appliesTo: "practitioner", required: false, hasExpiry: true, visibleToGuardian: false },
  { name: "Outro", appliesTo: "practitioner", required: false, hasExpiry: false, visibleToGuardian: false },
] as const;

export const DEFAULT_ASSESSMENT_CATEGORIES: { name: string; items: string[] }[] = [
  { name: "Coordenação motora", items: ["Coordenação motora global", "Coordenação motora fina"] },
  { name: "Equilíbrio", items: ["Equilíbrio estático", "Equilíbrio dinâmico"] },
  { name: "Controle postural", items: ["Alinhamento do tronco", "Controle de cabeça e pescoço"] },
  { name: "Mobilidade", items: ["Amplitude de movimento", "Transferências (montar/desmontar)"] },
  { name: "Capacidade motora", items: ["Força", "Resistência"] },
  { name: "Comunicação", items: ["Expressão de necessidades", "Uso de gestos / recursos"] },
  { name: "Fala", items: ["Articulação", "Vocabulário"] },
  { name: "Compreensão", items: ["Compreensão de instruções simples", "Compreensão de instruções complexas"] },
  { name: "Cognição", items: ["Memória", "Resolução de problemas"] },
  { name: "Atenção", items: ["Atenção sustentada", "Atenção dividida"] },
  { name: "Interação social", items: ["Interação com a equipe", "Interação com o cavalo"] },
  { name: "Autonomia", items: ["Autonomia nas atividades", "Iniciativa"] },
  { name: "Comportamento", items: ["Tolerância à frustração", "Cooperação"] },
  { name: "Aspectos emocionais", items: ["Regulação emocional", "Confiança / segurança"] },
  { name: "Execução de comandos", items: ["Comandos ao cavalo", "Sequência de comandos"] },
  { name: "Percepção", items: ["Percepção corporal", "Percepção espacial"] },
  { name: "Evolução funcional", items: ["Funcionalidade nas atividades diárias"] },
];
