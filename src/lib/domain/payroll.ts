import type { Collaborator, PayrollAdjustment } from "@/lib/db/types";
import type { MonthSummary } from "./time";

export interface PayrollComputation {
  referenceHourlyRate: number;
  baseAmount: number;
  hourlySimulation: number;
  calculatedAmount: number;
}

/**
 * Cálculo de referência. Não toma decisão trabalhista: apresenta o valor
 * base (salário ou horas × valor/hora), o valor/hora de referência e uma
 * simulação proporcional às horas, deixando a decisão para a administração.
 */
export function computePayroll(
  collaborator: Pick<Collaborator, "payType" | "salary" | "hourlyRate">,
  summary: Pick<MonthSummary, "expectedMinutes" | "workedMinutes">,
  adjustments: PayrollAdjustment[]
): PayrollComputation {
  const workedHours = summary.workedMinutes / 60;
  const expectedHours = summary.expectedMinutes / 60;
  let referenceHourlyRate = 0;
  let baseAmount = 0;

  if (collaborator.payType === "hourly") {
    referenceHourlyRate = collaborator.hourlyRate ?? 0;
    baseAmount = round2(referenceHourlyRate * workedHours);
  } else {
    const salary = collaborator.salary ?? 0;
    referenceHourlyRate = expectedHours > 0 ? round2(salary / expectedHours) : 0;
    baseAmount = round2(salary);
  }
  const hourlySimulation = round2(referenceHourlyRate * workedHours);
  const adj = adjustments.reduce((a, x) => a + (Number(x.amount) || 0), 0);
  return {
    referenceHourlyRate,
    baseAmount,
    hourlySimulation,
    calculatedAmount: round2(baseAmount + adj),
  };
}

export function round2(n: number) {
  return Math.round(n * 100) / 100;
}
