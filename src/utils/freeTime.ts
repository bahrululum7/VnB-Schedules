import type { DayKey, FreeSlot, ScheduleItem } from '../types';

export function timeToMinutes(time: string): number {
  if (time === '24:00') return 24 * 60;
  const [h, m] = time.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return 0;
  return h * 60 + m;
}

export function minutesToTime(totalMinutes: number): string {
  const clamped = Math.max(0, Math.min(23 * 60 + 59, totalMinutes));
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0 && m > 0) return `${h}j ${m}m`;
  if (h > 0) return `${h} jam`;
  return `${m} menit`;
}

/**
 * Computes mutually free intervals across the full 00:00 - 23:59 day
 * between Partner 1, Partner 2, and already-scheduled Quality Time blocks.
 */
export function computeMutualFreeSlots(
  schedules: ScheduleItem[],
  day: DayKey,
  options?: { windowStart?: string; windowEnd?: string; minDurationMinutes?: number }
): FreeSlot[] {
  const windowStartMin = timeToMinutes(options?.windowStart ?? '00:00');
  const windowEndMin = timeToMinutes(options?.windowEnd ?? '23:59');
  const minDuration = options?.minDurationMinutes ?? 30;

  const daySchedules = schedules.filter((s) => s.day === day);

  const busyIntervals = daySchedules
    .map((s) => ({
      start: Math.max(windowStartMin, timeToMinutes(s.startTime)),
      end: Math.min(windowEndMin, timeToMinutes(s.endTime)),
    }))
    .filter((iv) => iv.end > iv.start)
    .sort((a, b) => a.start - b.start);

  const merged: Array<{ start: number; end: number }> = [];
  for (const iv of busyIntervals) {
    if (merged.length === 0) {
      merged.push({ ...iv });
    } else {
      const prev = merged[merged.length - 1];
      if (iv.start <= prev.end) {
        prev.end = Math.max(prev.end, iv.end);
      } else {
        merged.push({ ...iv });
      }
    }
  }

  const freeSlots: FreeSlot[] = [];
  let cursor = windowStartMin;

  for (const busy of merged) {
    if (busy.start - cursor >= minDuration) {
      freeSlots.push({
        startTime: minutesToTime(cursor),
        endTime: minutesToTime(busy.start),
        durationMinutes: busy.start - cursor,
      });
    }
    cursor = Math.max(cursor, busy.end);
  }

  if (windowEndMin - cursor >= minDuration) {
    freeSlots.push({
      startTime: minutesToTime(cursor),
      endTime: minutesToTime(windowEndMin),
      durationMinutes: windowEndMin - cursor,
    });
  }

  return freeSlots;
}
