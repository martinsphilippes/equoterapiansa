/**
 * Matriz de permissões. Uma única fonte de verdade usada pelo servidor
 * (server actions, páginas e rotas) para decidir o que cada perfil pode fazer.
 */
export const ROLES = ["owner", "manager", "professional", "staff", "guardian"] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  owner: "Dono / Administrador",
  manager: "Gerente",
  professional: "Profissional de atendimento",
  staff: "Colaborador",
  guardian: "Responsável",
};

export const PERMISSIONS = {
  "dashboard.view": "Ver painel da direção",
  "collaborators.view": "Ver colaboradores",
  "collaborators.manage": "Cadastrar e editar colaboradores",
  "finance.view": "Ver salários e valores",
  "payments.manage": "Fechar e marcar pagamentos",
  "time.manage": "Conferir e corrigir jornada da equipe",
  "documents.manage": "Enviar e excluir documentos",
  "practitioners.view": "Ver praticantes",
  "practitioners.manage": "Cadastrar e editar praticantes e responsáveis",
  "clinical.view": "Ver informações clínicas e terapêuticas",
  "sessions.record": "Registrar atendimentos e presença",
  "assessments.record": "Registrar avaliações",
  "reports.manage": "Gerar e compartilhar relatórios",
  "schedule.manage": "Criar e alterar agendamentos",
  "announcements.manage": "Enviar comunicados",
  "settings.manage": "Configurações do sistema",
  "users.manage": "Gerenciar acessos e permissões",
  "audit.view": "Ver auditoria",
  "finance.dashboard": "Financeiro: ver painel e relatórios",
  "finance.receivables.view": "Financeiro: ver contas a receber",
  "finance.receivables.manage": "Financeiro: criar, editar e cancelar contas a receber",
  "finance.receivables.settle": "Financeiro: registrar recebimentos",
  "finance.payables.view": "Financeiro: ver contas a pagar",
  "finance.payables.manage": "Financeiro: criar, editar e cancelar contas a pagar",
  "finance.payables.settle": "Financeiro: registrar pagamentos",
  "finance.setup": "Financeiro: categorias, centros de custo, contas, formas e fornecedores",
  "finance.reconcile": "Financeiro: conciliação e transferências",
} as const;

export type Permission = keyof typeof PERMISSIONS;
export const ALL_PERMISSIONS = Object.keys(PERMISSIONS) as Permission[];

/** Permissões padrão por perfil. O Dono pode ajustar as do Gerente por usuário. */
export const DEFAULT_PERMISSIONS: Record<Role, Permission[]> = {
  owner: ALL_PERMISSIONS,
  manager: [
    "dashboard.view",
    "collaborators.view",
    "collaborators.manage",
    "time.manage",
    "documents.manage",
    "practitioners.view",
    "practitioners.manage",
    "clinical.view",
    "sessions.record",
    "assessments.record",
    "reports.manage",
    "schedule.manage",
    "announcements.manage",
  ],
  professional: ["practitioners.view", "clinical.view", "sessions.record", "assessments.record", "reports.manage"],
  staff: [],
  guardian: [],
};

export function isStaffRole(role: Role) {
  return role !== "guardian";
}
