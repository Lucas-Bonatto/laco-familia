// Leaves room in iOS for the five water reminders and other family events.
export const MAX_MEDICATION_DOSES = 45;

export function calculateMedicationDoses(durationDays: number, intervalHours: number) {
  if (!Number.isFinite(durationDays) || !Number.isFinite(intervalHours)) return 0;
  if (durationDays < 1 || intervalHours < 1) return 0;
  return Math.ceil((durationDays * 24) / intervalHours);
}

export function medicationScheduleError(durationDays: number, intervalHours: number) {
  if (!Number.isInteger(durationDays) || durationDays < 1 || durationDays > 30) {
    return 'A duração deve ser de 1 a 30 dias.';
  }
  if (!Number.isInteger(intervalHours) || intervalHours < 1 || intervalHours > 24) {
    return 'O intervalo deve ser de 1 a 24 horas.';
  }
  const totalDoses = calculateMedicationDoses(durationDays, intervalHours);
  if (totalDoses > MAX_MEDICATION_DOSES) {
    return `Essa combinação gera ${totalDoses} doses. Para garantir os alertas no iPhone, use até ${MAX_MEDICATION_DOSES} doses por tratamento.`;
  }
  return null;
}

export function timeParts(time: string, fallbackDate?: string) {
  const match = /^(\d{2}):(\d{2})$/.exec(time);
  if (match) {
    const hour = Number(match[1]);
    const minute = Number(match[2]);
    if (hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59) return { hour, minute };
  }
  const fallback = fallbackDate ? new Date(fallbackDate) : new Date();
  return { hour: fallback.getHours(), minute: fallback.getMinutes() };
}

export function nextDailyOccurrence(time: string, fallbackDate?: string, referenceDate = new Date()) {
  const { hour, minute } = timeParts(time, fallbackDate);
  const next = new Date(referenceDate);
  next.setHours(hour, minute, 0, 0);
  if (next.getTime() <= referenceDate.getTime()) next.setDate(next.getDate() + 1);
  return next;
}
