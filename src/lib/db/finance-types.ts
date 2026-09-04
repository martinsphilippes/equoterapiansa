import type { ISODate } from "./types";

/**
 * Modelo financeiro integrado. Entidades existentes (praticante, responsável,
 * colaborador, ficha mensal) são referenciadas por id + nome desnormalizado.
 * Valores em reais com 2 casas (number). Datas "YYYY-MM-DD", competência "YYYY-MM".
 */
export type FinanceKind = "receivable" | "payable";
export type CategoryType = "income" | "expense";
export type DreGroup = "revenue" | "deductions" | "costs" | "operating" | "other";

export interface FinancialCategory {
  id: string;
  name: string;
  type: CategoryType;
  parentId?: string | null;
  code?: string;
  order: number;
  dreGroup?: DreGroup | null;
  active: boolean;
  createdAt: number;
}

export interface CostCenter {
  id: string;
  name: string;
  parentId?: string | null;
  active: boolean;
  createdAt: number;
}

export type AccountType = "cash" | "bank" | "digital" | "wallet" | "other";
export interface FinancialAccount {
  id: string;
  name: string;
  type: AccountType;
  institution?: string;
  initialBalance: number;
  initialBalanceDate: ISODate;
  active: boolean;
  createdAt: number;
}

export interface PaymentMethod {
  id: string;
  name: string;
  order: number;
  active: boolean;
}

export interface Supplier {
  id: string;
  name: string;
  taxId?: string;
  phone?: string;
  email?: string;
  notes?: string;
  bankInfo?: string;
  pix?: string;
  defaultCategoryId?: string | null;
  defaultCostCenterId?: string | null;
  active: boolean;
  createdAt: number;
  updatedAt: number;
}

/** Status armazenado. "overdue" é derivado na leitura (vencimento < hoje e em aberto). */
export type EntryStatus = "planned" | "pending" | "partial" | "paid" | "cancelled";
export type EntryDisplayStatus = EntryStatus | "overdue";

export interface FinancialEntry {
  id: string;
  kind: FinanceKind;
  description: string;
  amount: number;       // valor original
  discount: number;
  interest: number;
  fine: number;
  netAmount: number;    // amount - discount + interest + fine
  paidAmount: number;   // soma das movimentações não estornadas
  openAmount: number;   // netAmount - paidAmount (para agregações)
  status: EntryStatus;
  competence: string;   // YYYY-MM
  issueDate: ISODate;
  dueDate: ISODate;
  settledDate?: ISODate | null;
  categoryId: string;
  categoryName: string;
  costCenterId?: string | null;
  costCenterName?: string | null;
  accountId?: string | null;
  paymentMethodId?: string | null;
  practitionerId?: string | null;
  practitionerName?: string | null;
  guardianId?: string | null;
  guardianName?: string | null;
  collaboratorId?: string | null;
  collaboratorName?: string | null;
  supplierId?: string | null;
  supplierName?: string | null;
  payrollMonthId?: string | null;
  billingPlanId?: string | null;
  recurrenceId?: string | null;
  installment?: { number: number; total: number; groupId: string } | null;
  reference?: string;
  notes?: string;
  /** Visível na área da família (cobranças do responsável). */
  visibleToGuardian: boolean;
  cancelledAt?: number | null;
  cancelReason?: string | null;
  createdAt: number;
  createdBy: string;
  updatedAt: number;
  updatedBy: string;
}

export type TransactionType = "in" | "out" | "transfer_in" | "transfer_out";
export interface FinancialTransaction {
  id: string;
  type: TransactionType;
  amount: number;
  date: ISODate;
  accountId: string;
  accountName: string;
  entryId?: string | null;
  entryKind?: FinanceKind | null;
  entryCompetence?: string | null;
  categoryId?: string | null;
  categoryName?: string | null;
  costCenterId?: string | null;
  paymentMethodId?: string | null;
  transferId?: string | null;
  description: string;
  notes?: string;
  reconciled: boolean;
  reconciledAt?: number | null;
  reconciledBy?: string | null;
  reversed: boolean;
  reversedAt?: number | null;
  reversalReason?: string | null;
  createdAt: number;
  createdBy: string;
  updatedAt: number;
  updatedBy: string;
}

export type Frequency = "weekly" | "monthly" | "bimonthly" | "quarterly" | "semiannual" | "annual" | "custom";
export interface RecurrenceRule {
  id: string;
  kind: FinanceKind;
  frequency: Frequency;
  /** Para "custom": a cada N meses. */
  intervalMonths?: number | null;
  dueDay: number; // 1..28
  startDate: ISODate;
  endDate?: ISODate | null;
  /** Próxima data a gerar. */
  nextDueDate: ISODate;
  generatedCount: number;
  template: {
    description: string;
    amount: number;
    categoryId: string;
    categoryName: string;
    costCenterId?: string | null;
    costCenterName?: string | null;
    accountId?: string | null;
    paymentMethodId?: string | null;
    supplierId?: string | null;
    supplierName?: string | null;
    collaboratorId?: string | null;
    collaboratorName?: string | null;
    practitionerId?: string | null;
    practitionerName?: string | null;
    guardianId?: string | null;
    guardianName?: string | null;
    notes?: string;
  };
  active: boolean;
  createdAt: number;
  updatedAt: number;
}

export type BillingModel = "fixed" | "per_session" | "package";
/** Modelo financeiro do praticante (mensalidade, pacote, bolsa...). */
export interface BillingPlan {
  id: string;
  practitionerId: string;
  practitionerName: string;
  guardianId: string;         // responsável financeiro
  guardianName: string;
  name: string;               // ex.: Mensalidade equoterapia
  billingModel: BillingModel;
  amount: number;
  discountType: "none" | "fixed" | "percent";
  discountValue: number;
  frequency: Exclude<Frequency, "weekly" | "custom">;
  dueDay: number;
  startDate: ISODate;
  endDate?: ISODate | null;
  categoryId: string;
  categoryName: string;
  costCenterId?: string | null;
  costCenterName?: string | null;
  sessionsIncluded?: number | null;
  notes?: string;
  /** Última competência gerada (YYYY-MM). */
  lastGenerated?: string | null;
  active: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface FinancialSettings {
  defaultAccountId?: string | null;
  payrollCategoryId?: string | null;
  payrollCostCenterId?: string | null;
  tuitionCategoryId?: string | null;
  tuitionCostCenterId?: string | null;
  showToGuardians: boolean;
  updatedAt: number;
}

/**
 * Resumo mensal mantido incrementalmente (mesmo batch das escritas).
 * expected: por competência (regime de competência), a partir dos lançamentos.
 * received: por competência, o que foi efetivamente liquidado dos lançamentos daquela competência.
 * cash: por mês da movimentação (fluxo de caixa), excluindo transferências e estornos.
 */
export interface FinancialSummary {
  month: string; // YYYY-MM
  expected?: { income?: SummaryBucket; expense?: SummaryBucket };
  received?: { income?: SummaryBucket; expense?: SummaryBucket };
  cash?: { in?: SummaryBucket; out?: SummaryBucket };
}
export interface SummaryBucket {
  total?: number;
  discounts?: number;
  byCategory?: Record<string, number>;
  byCostCenter?: Record<string, number>;
}
