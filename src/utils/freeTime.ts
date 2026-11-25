import type { AvailabilitySlot, FreeForOwner, FreeSlot, ScheduleItem } from '../types';

export function formatLocalDateISO(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function addDaysToDate(date: Date, deltaDays: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + deltaDays);
  return next;
}

export function formatShortIndonesianDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  if (!y || !m || !d) return dateStr;
  const dt = new Date(y, m - 1, d);
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
  }).format(dt);
}

export function timeToMinutes(time: string): number {
  if (time === '24:00') return 24 * 60;
  const [h, m] = time.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return 0;
  return h * 60 + m;
}

export function minutesToTime(totalMinutes: number): string {
  const clamped = Math.max(0, Math.min(24 * 60, totalMinutes));
  if (clamped === 24 * 60) return '23:59';
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
  targetDate: string,
  options?: { windowStart?: string; windowEnd?: string; minDurationMinutes?: number }
): FreeSlot[] {
  const windowStartMin = timeToMinutes(options?.windowStart ?? '00:00');
  const windowEndMin = timeToMinutes(options?.windowEnd ?? '23:59');
  const minDuration = options?.minDurationMinutes ?? 30;

  const daySchedules = schedules.filter((s) => s.date === targetDate);

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

/**
 * Computes detailed free intervals labeled by who is free in that time window:
 * 'both' (Partner 1 & Partner 2), 'partner1' only, or 'partner2' only.
 */
export function computeDetailedFreeSlots(
  schedules: ScheduleItem[],
  targetDate: string,
  options?: { windowStart?: string; windowEnd?: string; minDurationMinutes?: number }
): AvailabilitySlot[] {
  const windowStartMin = timeToMinutes(options?.windowStart ?? '00:00');
  const windowEndMin = timeToMinutes(options?.windowEnd ?? '23:59');
  const minDuration = options?.minDurationMinutes ?? 30;

  const daySchedules = schedules.filter((s) => s.date === targetDate);
  const p1Busy = daySchedules
    .filter((s) => s.owner === 'partner1' || s.owner === 'together')
    .map((s) => ({
      start: Math.max(windowStartMin, timeToMinutes(s.startTime)),
      end: Math.min(windowEndMin, timeToMinutes(s.endTime)),
    }))
    .filter((iv) => iv.end > iv.start);

  const p2Busy = daySchedules
    .filter((s) => s.owner === 'partner2' || s.owner === 'together')
    .map((s) => ({
      start: Math.max(windowStartMin, timeToMinutes(s.startTime)),
      end: Math.min(windowEndMin, timeToMinutes(s.endTime)),
    }))
    .filter((iv) => iv.end > iv.start);

  const boundaries = new Set<number>([windowStartMin, windowEndMin]);
  for (const iv of [...p1Busy, ...p2Busy]) {
    boundaries.add(iv.start);
    boundaries.add(iv.end);
  }
  const sortedPoints = Array.from(boundaries).sort((a, b) => a - b);

  const rawSegments: Array<{ start: number; end: number; freeFor: FreeForOwner }> = [];

  for (let i = 0; i < sortedPoints.length - 1; i++) {
    const a = sortedPoints[i];
    const b = sortedPoints[i + 1];
    if (b <= a) continue;

    const p1HasBusy = p1Busy.some((iv) => iv.start < b && iv.end > a);
    const p2HasBusy = p2Busy.some((iv) => iv.start < b && iv.end > a);

    if (p1HasBusy && p2HasBusy) continue;

    const freeFor: FreeForOwner =
      !p1HasBusy && !p2HasBusy ? 'both' : !p1HasBusy ? 'partner1' : 'partner2';

    const prev = rawSegments[rawSegments.length - 1];
    if (prev && prev.end === a && prev.freeFor === freeFor) {
      prev.end = b;
    } else {
      rawSegments.push({ start: a, end: b, freeFor });
    }
  }

  return rawSegments
    .filter((seg) => seg.end - seg.start >= minDuration)
    .map((seg) => ({
      startTime: minutesToTime(seg.start),
      endTime: minutesToTime(seg.end),
      durationMinutes: seg.end - seg.start,
      freeFor: seg.freeFor,
    }));
}
