import { Stat } from "@/components/ui";
import { minutesToHM } from "@/lib/domain/dates";
import type { MonthSummary } from "@/lib/domain/time";

export function MonthSummaryCards({ s }: { s: MonthSummary }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <Stat label="Horas previstas" value={minutesToHM(s.expectedMinutes)} />
      <Stat label="Horas registradas" value={minutesToHM(s.workedMinutes)} hint={s.deltaMinutes === 0 ? "sem diferença" : `${s.deltaMinutes > 0 ? "+" : ""}${minutesToHM(s.deltaMinutes)} em relação ao previsto`} tone={s.deltaMinutes < 0 ? "amber" : "green"} />
      <Stat label="Faltas" value={s.absences} hint={s.justifiedAbsences ? `+${s.justifiedAbsences} justificada(s)` : undefined} tone={s.absences > 0 ? "red" : "default"} />
      <Stat label="Atrasos" value={s.lateCount} hint={s.earlyLeaveCount ? `${s.earlyLeaveCount} saída(s) antecipada(s)` : undefined} tone={s.lateCount > 0 ? "amber" : "default"} />
    </div>
  );
}
