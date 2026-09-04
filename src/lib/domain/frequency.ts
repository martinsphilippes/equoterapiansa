import type { Appointment } from "@/lib/db/types";

export interface Frequency {
  expected: number;
  done: number;
  missed: number;
  cancelled: number;
  pending: number;
  percent: number;
}

/**
 * Frequência = realizadas / (realizadas + faltas).
 * Cancelamentos (pela instituição ou reagendados) não penalizam o praticante.
 */
export function computeFrequency(appointments: Appointment[]): Frequency {
  let done = 0, missed = 0, cancelled = 0, pending = 0;
  for (const a of appointments) {
    if (a.status === "done") done++;
    else if (a.status === "missed") missed++;
    else if (a.status === "cancelled" || a.status === "rescheduled") cancelled++;
    else pending++;
  }
  const expected = done + missed + pending;
  const base = done + missed;
  return { expected, done, missed, cancelled, pending, percent: base ? Math.round((done / base) * 100) : 0 };
}
