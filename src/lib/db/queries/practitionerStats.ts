import "server-only";
import { cache } from "react";
import { appointmentsOfPractitioner, assessmentsOfPractitioner } from "./practitioners";
import { computeFrequency } from "@/lib/domain/frequency";
import { compareAssessments } from "@/lib/domain/assessments";
import { addMonths } from "@/lib/domain/dates";
import type { Practitioner, Settings } from "../types";
import { ageFrom } from "@/lib/domain/dates";

export const practitionerStats = cache(async (p: Practitioner, settings: Settings) => {
  const [appointments, assessments] = await Promise.all([appointmentsOfPractitioner(p.id), assessmentsOfPractitioner(p.id)]);
  const freq = computeFrequency(appointments);
  const initial = assessments.find((a) => a.type === "initial") ?? assessments[0] ?? null;
  const last = assessments.length ? assessments[assessments.length - 1] : null;
  const cmp = compareAssessments(initial, last && last.id !== initial?.id ? last : null);
  const nextAssessment = last ? `${addMonths(last.date.slice(0, 7), settings.assessmentIntervalMonths)}-${last.date.slice(8, 10)}` : null;
  return {
    appointments, assessments, freq,
    stats: {
      age: ageFrom(p.birthDate),
      frequencyPercent: freq.percent,
      lastAssessment: last?.date ?? null,
      nextAssessment: p.status === "closed" ? null : nextAssessment,
      evolutionPercent: cmp.overall.percentChange,
      evolutionDelta: cmp.overall.delta,
    },
  };
});
