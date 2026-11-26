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

export function addDaysToDateStr(dateStr: string, deltaDays: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  if (!y || !m || !d) return dateStr;
  const dt = new Date(y, m - 1, d + deltaDays);
  return formatLocalDateISO(dt);
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

function diffDays(baseDateStr: string, targetDateStr: string): number {
  const [y1, m1, d1] = baseDateStr.split('-').map(Number);
  const [y2, m2, d2] = targetDateStr.split('-').map(Number);
  if (!y1 || !m1 || !d1 || !y2 || !m2 || !d2) return 0;
  const t1 = Date.UTC(y1, m1 - 1, d1);
  const t2 = Date.UTC(y2, m2 - 1, d2);
  return Math.round((t2 - t1) / (1000 * 60 * 60 * 24));
}

/**
 * Projects a ScheduleItem onto an N-day timeline starting at `windowStartDate`
 * (where 1 day = 1440 minutes, 2 days = 2880 minutes).
 */
export function getItemTimelineRange(
  item: ScheduleItem,
  windowStartDate: string,
  totalWindowMinutes: number
): { start: number; end: number } | null {
  const startDayOffset = diffDays(windowStartDate, item.date);
  const itemEndDate = item.endDate || item.date;
  const endDayOffset = diffDays(windowStartDate, itemEndDate);

  const absStart = startDayOffset * 1440 + timeToMinutes(item.startTime);
  const absEnd = endDayOffset * 1440 + timeToMinutes(item.endTime);

  if (absEnd <= absStart) return null;
  const clampedStart = Math.max(0, absStart);
  const clampedEnd = Math.min(totalWindowMinutes, absEnd);
  if (clampedEnd <= clampedStart) return null;
  return { start: clampedStart, end: clampedEnd };
}

function offsetToDateAndTime(
  windowStartDate: string,
  offsetMinutes: number,
  isEnd: boolean
): { date: string; time: string } {
  const clamped = Math.max(0, offsetMinutes);
  const dayOffset = isEnd && clamped > 0 && clamped % 1440 === 0
    ? Math.floor((clamped - 1) / 1440)
    : Math.floor(clamped / 1440);
  const minuteInDay = isEnd && clamped > 0 && clamped % 1440 === 0
    ? 1439
    : clamped % 1440;
  return {
    date: addDaysToDateStr(windowStartDate, dayOffset),
    time: minutesToTime(minuteInDay),
  };
}

/**
 * Computes detailed free intervals labeled by who is free across a multi-day continuous window
 * (e.g., 1 day = 24h for Kemarin, or 2 days = 48h continuous for Hari Ini -> Besok).
 */
export function computeWindowDetailedFreeSlots(
  schedules: ScheduleItem[],
  windowStartDate: string,
  numDays: 1 | 2,
  options?: { minDurationMinutes?: number }
): AvailabilitySlot[] {
  const totalMinutes = numDays * 1440 - 1; // inclusive up to 23:59 on last day
  const minDuration = options?.minDurationMinutes ?? 30;

  const p1Busy: Array<{ start: number; end: number }> = [];
  const p2Busy: Array<{ start: number; end: number }> = [];

  for (const s of schedules) {
    const range = getItemTimelineRange(s, windowStartDate, totalMinutes);
    if (!range) continue;
    if (s.owner === 'partner1' || s.owner === 'together') {
      p1Busy.push(range);
    }
    if (s.owner === 'partner2' || s.owner === 'together') {
      p2Busy.push(range);
    }
  }

  const boundaries = new Set<number>([0, totalMinutes]);
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
    .map((seg) => {
      const startInfo = offsetToDateAndTime(windowStartDate, seg.start, false);
      const endInfo = offsetToDateAndTime(windowStartDate, seg.end, true);
      return {
        startDate: startInfo.date,
        endDate: endInfo.date,
        startTime: startInfo.time,
        endTime: endInfo.time,
        durationMinutes: seg.end - seg.start,
        freeFor: seg.freeFor,
      };
    });
}

export function computeDetailedFreeSlots(
  schedules: ScheduleItem[],
  targetDate: string,
  options?: { minDurationMinutes?: number }
): AvailabilitySlot[] {
  return computeWindowDetailedFreeSlots(schedules, targetDate, 1, options);
}

export function computeMutualFreeSlots(
  schedules: ScheduleItem[],
  targetDate: string,
  options?: { minDurationMinutes?: number }
): FreeSlot[] {
  return computeWindowDetailedFreeSlots(schedules, targetDate, 1, options).filter(
    (s) => s.freeFor === 'both'
  );
}
