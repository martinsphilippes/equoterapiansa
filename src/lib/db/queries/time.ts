import "server-only";
import { Collections, mapDocs } from "../collections";
import { getSettings } from "../settings";
import { isWorkingDay, scheduleFor } from "@/lib/domain/time";
import { listDays, monthRange } from "@/lib/domain/dates";
import type { Collaborator, TimeEntry } from "../types";

export async function entriesOfDay(date: string): Promise<TimeEntry[]> {
  const snap = await Collections.timeEntries().where("date", "==", date).get();
  return mapDocs(snap);
}

export async function monthDaysFor(c: Collaborator, competence: string) {
  const settings = await getSettings();
  const schedule = scheduleFor(settings, c.schedule);
  const { start, end } = monthRange(competence);
  return listDays(start, end).map((date) => ({ date, isWorking: isWorkingDay(date, schedule, settings.holidays) && (!c.admissionDate || date >= c.admissionDate) && (!c.terminationDate || date <= c.terminationDate) }));
}
