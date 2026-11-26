import { Fragment, useRef } from 'react';
import {
  BellRing,
  CheckCircle2,
  Heart,
  History,
  MoonStar,
  Plus,
  Trash2,
  User,
} from 'lucide-react';
import type {
  ActivityCategory,
  AuthenticatedUser,
  DayConfirmationState,
  DayKey,
  EditableDayKey,
  PartnerProfile,
  ScheduleItem,
  ScheduleOwner,
} from '../types';
import {
  formatShortIndonesianDate,
  getItemTimelineRange,
} from '../utils/freeTime';

interface ScheduleTable24hProps {
  selectedDay: DayKey;
  yesterdayDate: string;
  todayDate: string;
  tomorrowDate: string;
  currentHour: number;
  currentUser: AuthenticatedUser;
  partner1: PartnerProfile;
  partner2: PartnerProfile;
  schedules: ScheduleItem[];
  confirmedByDate: Record<string, DayConfirmationState>;
  confirming: boolean;
  onAddAtHour: (
    day: EditableDayKey,
    owner: ScheduleOwner,
    startTime: string,
    endTime: string
  ) => void;
  onDeleteItem: (id: string) => Promise<void>;
  onToggleConfirm: (date: string, nextVal: boolean) => Promise<void>;
  onPreviewAlarm: (item: ScheduleItem) => void;
}

const CATEGORY_LABELS: Record<ActivityCategory, string> = {
  kuliah: 'Kuliah',
  kerja: 'Kerja',
  belajar: 'Belajar',
  quality_time: 'Quality Time',
  lainnya: 'Lainnya',
};

function formatHourRange(hourOfDay: number): { label: string; start: string; end: string } {
  const start = `${String(hourOfDay).padStart(2, '0')}:00`;
  const endLabel = `${String(hourOfDay + 1).padStart(2, '0')}:00`;
  const endValue = hourOfDay === 23 ? '23:59' : endLabel;
  return {
    label: `${start} – ${endLabel}`,
    start,
    end: endValue,
  };
}

export function ScheduleTable24h({
  selectedDay,
  yesterdayDate,
  todayDate,
  tomorrowDate,
  currentHour,
  currentUser,
  partner1,
  partner2,
  schedules,
  confirmedByDate,
  confirming,
  onAddAtHour,
  onDeleteItem,
  onToggleConfirm,
  onPreviewAlarm,
}: ScheduleTable24hProps) {
  const currentHourRowRef = useRef<HTMLTableRowElement | null>(null);
  const nightRowRef = useRef<HTMLTableRowElement | null>(null);
  const midnightRowRef = useRef<HTMLTableRowElement | null>(null);

  const isReadOnly = selectedDay === 'yesterday';
  const windowStartDate = isReadOnly ? yesterdayDate : todayDate;
  const totalHours = isReadOnly ? 24 : 48;
  const totalWindowMinutes = totalHours * 60;

  const todayConf: DayConfirmationState = confirmedByDate[todayDate] ?? {
    partner1: false,
    partner2: false,
  };
  const tomorrowConf: DayConfirmationState = confirmedByDate[tomorrowDate] ?? {
    partner1: false,
    partner2: false,
  };

  const bothConfirmedToday = Boolean(todayConf.partner1 && todayConf.partner2);
  const bothConfirmedTomorrow = Boolean(
    tomorrowConf.partner1 && tomorrowConf.partner2
  );

  // Project schedules onto the 24h (yesterday) or 48h (continuous today -> tomorrow) timeline
  const projectedItems = schedules
    .map((item) => {
      const range = getItemTimelineRange(item, windowStartDate, totalWindowMinutes);
      if (!range) return null;
      return { item, startMin: range.start, endMin: range.end };
    })
    .filter(
      (entry): entry is { item: ScheduleItem; startMin: number; endMin: number } =>
        entry !== null
    );

  const getSlotItemsInAbsHour = (
    owner: ScheduleOwner,
    absHour: number
  ): Array<{ item: ScheduleItem; startMin: number; endMin: number }> => {
    const hStart = absHour * 60;
    const hEnd = (absHour + 1) * 60;
    return projectedItems.filter(
      (entry) =>
        entry.item.owner === owner && entry.startMin < hEnd && entry.endMin > hStart
    );
  };

  const scrollToRow = (ref: { current: HTMLTableRowElement | null }) => {
    ref.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const renderCell = (
    absHour: number,
    rowDay: EditableDayKey,
    owner: ScheduleOwner,
    cellEntries: Array<{ item: ScheduleItem; startMin: number; endMin: number }>,
    canEditCell: boolean,
    isHourMutuallyFree: boolean
  ) => {
    const hourOfDay = absHour % 24;
    const { start, end } = formatHourRange(hourOfDay);
    const isTogether = owner === 'together';
    const hourStartMin = absHour * 60;
    const hourEndMin = (absHour + 1) * 60;

    if (cellEntries.length === 0) {
      if (canEditCell && !isReadOnly) {
        return (
          <button
            type="button"
            onClick={() => onAddAtHour(rowDay, owner, start, end)}
            className={`w-full min-h-[40px] rounded-lg px-2.5 py-1.5 text-left text-xs transition-colors flex items-center justify-between gap-2 group cursor-pointer ${
              isTogether && isHourMutuallyFree
                ? 'bg-pink-500/8 hover:bg-pink-500/20 border border-dashed border-pink-400/30 text-pink-200/80'
                : 'hover:bg-white/[0.04] text-zinc-600 hover:text-zinc-300'
            }`}
          >
            <span>
              {isTogether && isHourMutuallyFree
                ? 'Jam kosong · Isi Quality Time'
                : 'Kosong'}
            </span>
            <Plus className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
          </button>
        );
      }

      return (
        <div className="min-h-[40px] px-2.5 py-1.5 flex items-center text-xs text-zinc-600">
          {isReadOnly
            ? '—'
            : isTogether && isHourMutuallyFree
              ? 'Jam kosong (konfirmasi dulu)'
              : 'Kosong'}
        </div>
      );
    }

    return (
      <div className="space-y-1.5">
        {cellEntries.map(({ item, startMin }) => {
          const isStartRow = startMin >= hourStartMin && startMin < hourEndMin;
          const canDelete = !isReadOnly;
          const isOvernight = Boolean(item.endDate && item.endDate !== item.date);

          if (!isStartRow) {
            return (
              <div
                key={`${item.id}-cont-${absHour}`}
                className={`rounded-lg px-2.5 py-1.5 text-xs flex items-center justify-between gap-2 border ${
                  isTogether
                    ? 'bg-pink-500/12 border-pink-400/25 text-pink-200'
                    : 'bg-white/[0.04] border-white/10 text-zinc-400'
                }`}
              >
                <span className="truncate">↳ Lanjutan: {item.title}</span>
                <span className="font-mono-tabular text-[11px] shrink-0">
                  s/d {item.endTime}
                  {isOvernight ? ` (${formatShortIndonesianDate(item.endDate!)})` : ''}
                </span>
              </div>
            );
          }

          return (
            <div
              key={item.id}
              className={`rounded-lg px-2.5 py-2 border flex items-start justify-between gap-2 ${
                isTogether
                  ? 'bg-pink-500/18 border-pink-400/45'
                  : item.owner === currentUser.slot
                    ? 'bg-[#1D1B26] border-pink-400/30'
                    : 'bg-[#181822] border-white/15'
              }`}
            >
              <div className="min-w-0">
                <p className="font-mono-tabular text-[11px] font-medium text-pink-300">
                  {item.startTime} – {item.endTime}
                  {isOvernight
                    ? ` (${formatShortIndonesianDate(item.endDate!)})`
                    : ''}
                </p>
                <p className="text-xs sm:text-sm font-semibold text-white truncate">
                  {item.title}
                </p>
                <p className="text-[11px] text-zinc-400">
                  {CATEGORY_LABELS[item.category]} · {item.createdBy}
                </p>
              </div>

              <div className="flex items-center gap-0.5 shrink-0">
                {!isReadOnly && (
                  <button
                    type="button"
                    onClick={() => onPreviewAlarm(item)}
                    title="Tes notif alarm kegiatan ini"
                    aria-label={`Tes alarm untuk ${item.title}`}
                    className="w-7 h-7 rounded-md flex items-center justify-center text-zinc-400 hover:text-pink-300 hover:bg-pink-500/15 transition-colors cursor-pointer"
                  >
                    <BellRing className="w-3.5 h-3.5" />
                  </button>
                )}
                {canDelete && (
                  <button
                    type="button"
                    onClick={() => void onDeleteItem(item.id)}
                    title="Hapus jadwal"
                    aria-label={`Hapus ${item.title}`}
                    className="w-7 h-7 rounded-md flex items-center justify-center text-zinc-400 hover:text-rose-300 hover:bg-rose-500/15 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderDayConfirmationCard = (
    label: string,
    dateStr: string,
    conf: DayConfirmationState
  ) => {
    const ownDone = conf[currentUser.slot];
    const partnerSlot = currentUser.slot === 'partner1' ? 'partner2' : 'partner1';
    const partnerDone = conf[partnerSlot];
    const partnerObj = partnerSlot === 'partner1' ? partner1 : partner2;

    return (
      <div className="rounded-xl border border-white/10 bg-[#14141B] px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-pink-400 shrink-0" />
            <span className="font-display text-sm font-bold text-white truncate">
              {label} ({formatShortIndonesianDate(dateStr)})
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-0.5">
            {currentUser.name}: {ownDone ? 'Sudah konfirmasi' : 'Belum konfirmasi'} ·{' '}
            {partnerObj.name} ({partnerObj.online ? 'Online' : 'Offline'}):{' '}
            {partnerDone ? 'Sudah' : 'Belum'}
          </p>
        </div>

        {ownDone ? (
          <button
            type="button"
            disabled={confirming}
            onClick={() => void onToggleConfirm(dateStr, false)}
            className="min-h-[36px] px-3 py-1.5 rounded-lg border border-white/15 text-xs font-medium text-zinc-200 hover:bg-white/5 transition-colors cursor-pointer shrink-0 whitespace-nowrap"
          >
            Ubah Lagi
          </button>
        ) : (
          <button
            type="button"
            disabled={confirming}
            onClick={() => void onToggleConfirm(dateStr, true)}
            className="min-h-[38px] px-3.5 py-1.5 rounded-xl bg-pink-500 hover:bg-pink-400 disabled:opacity-60 text-zinc-950 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 whitespace-nowrap"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>{confirming ? 'Menyimpan...' : `Konfirmasi ${label}`}</span>
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="rounded-2xl bg-[#14141B] border border-white/10 overflow-hidden">
      {isReadOnly ? (
        <div className="p-4 sm:p-5 border-b border-white/[0.08] bg-[#101016] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 text-sm font-medium text-pink-200">
            <History className="w-4 h-4 text-pink-400 shrink-0" />
            <span>
              Riwayat Jadwal Kemarin ({formatShortIndonesianDate(yesterdayDate)}) · Hanya Lihat
            </span>
          </div>
          <p className="text-xs text-zinc-400">
            Jadwal kemarin tersimpan sebagai arsip dan tidak bisa diubah lagi.
          </p>
        </div>
      ) : (
        <div className="p-4 sm:p-5 border-b border-white/[0.08] space-y-3 bg-[#101016]">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {renderDayConfirmationCard('Hari Ini', todayDate, todayConf)}
            {renderDayConfirmationCard('Besok', tomorrowDate, tomorrowConf)}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
            <p className="text-zinc-400">
              Tabel menyambung 48 jam dari <span className="text-pink-200 font-medium">Hari Ini</span> ke{' '}
              <span className="text-pink-200 font-medium">Besok</span> agar kegiatan malam sampai dini hari mudah dipantau.
            </p>
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => scrollToRow(currentHourRowRef)}
                className="px-2.5 py-1.5 rounded-lg bg-[#1A1A24] hover:bg-pink-500/20 border border-white/10 text-zinc-200 transition-colors cursor-pointer whitespace-nowrap"
              >
                Ke Jam Sekarang
              </button>
              <button
                type="button"
                onClick={() => scrollToRow(nightRowRef)}
                className="px-2.5 py-1.5 rounded-lg bg-[#1A1A24] hover:bg-pink-500/20 border border-white/10 text-pink-200 transition-colors cursor-pointer whitespace-nowrap"
              >
                Malam Ini (22:00)
              </button>
              <button
                type="button"
                onClick={() => scrollToRow(midnightRowRef)}
                className="px-2.5 py-1.5 rounded-lg bg-[#1A1A24] hover:bg-pink-500/20 border border-white/10 text-zinc-200 transition-colors cursor-pointer whitespace-nowrap"
              >
                Tengah Malam (00:00 Besok)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Continuous 00:00 Hari Ini -> 24:00 Besok Schedule Table */}
      <div className="overflow-x-auto max-h-[720px] overflow-y-auto">
        <table className="w-full min-w-[760px] border-collapse text-left">
          <thead className="sticky top-0 z-10">
            <tr className="border-b border-white/10 bg-[#111118] text-xs font-semibold text-zinc-300">
              <th className="w-40 px-4 py-3.5 font-mono-tabular">
                {isReadOnly ? 'Jam (00–24)' : 'Jam (48j Berlanjut)'}
              </th>
              <th className="w-1/3 px-4 py-3.5">
                <div className="flex items-center justify-between gap-2">
                  <span>Jadwal {partner1.name}</span>
                  {currentUser.slot === 'partner1' && (
                    <span className="text-[11px] font-normal text-pink-300">
                      Jadwal kamu
                    </span>
                  )}
                </div>
              </th>
              <th className="w-1/3 px-4 py-3.5 bg-[#18121B]">
                <div className="flex items-center gap-1.5 text-pink-200">
                  <Heart className="w-3.5 h-3.5 text-pink-400 fill-pink-400 shrink-0" />
                  <span>Quality Time Bareng</span>
                </div>
              </th>
              <th className="w-1/3 px-4 py-3.5">
                <div className="flex items-center justify-between gap-2">
                  <span>Jadwal {partner2.name}</span>
                  {currentUser.slot === 'partner2' && (
                    <span className="text-[11px] font-normal text-pink-300">
                      Jadwal kamu
                    </span>
                  )}
                </div>
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-white/[0.06]">
            {Array.from({ length: totalHours }, (_, absHour) => {
              const isSecondDay = !isReadOnly && absHour >= 24;
              const hourOfDay = absHour % 24;
              const rowDay: EditableDayKey = isSecondDay ? 'tomorrow' : 'today';
              const rowDateStr = isReadOnly
                ? yesterdayDate
                : isSecondDay
                  ? tomorrowDate
                  : todayDate;
              const rowDayConfirmedBoth = isSecondDay
                ? bothConfirmedTomorrow
                : bothConfirmedToday;

              const { label } = formatHourRange(hourOfDay);
              const p1Entries = getSlotItemsInAbsHour('partner1', absHour);
              const p2Entries = getSlotItemsInAbsHour('partner2', absHour);
              const qtEntries = getSlotItemsInAbsHour('together', absHour);

              const isMutuallyFree =
                p1Entries.length === 0 &&
                p2Entries.length === 0 &&
                qtEntries.length === 0;
              const isCurrentHour =
                !isReadOnly && !isSecondDay && hourOfDay === currentHour;
              const isMidnightBorder = !isReadOnly && absHour === 24;

              return (
                <Fragment key={`${rowDateStr}-${hourOfDay}`}>
                  {isMidnightBorder && (
                    <tr
                      key="midnight-transition"
                      ref={midnightRowRef}
                      className="bg-pink-500/15 border-y border-pink-400/40"
                    >
                      <td
                        colSpan={4}
                        className="px-4 py-2.5 text-xs font-semibold text-pink-200"
                      >
                        <div className="flex items-center gap-2">
                          <MoonStar className="w-4 h-4 text-pink-400 shrink-0" />
                          <span>
                            Pergantian Hari (00:00) · Memasuki Besok (
                            {formatShortIndonesianDate(tomorrowDate)})
                          </span>
                        </div>
                      </td>
                    </tr>
                  )}
                  <tr
                    key={`${rowDateStr}-${hourOfDay}`}
                    ref={
                      isCurrentHour
                        ? currentHourRowRef
                        : !isReadOnly && absHour === 22
                          ? nightRowRef
                          : undefined
                    }
                    className={
                      isCurrentHour
                        ? 'bg-pink-500/[0.08]'
                        : isSecondDay
                          ? 'bg-[#12121A] hover:bg-white/[0.02] transition-colors'
                          : 'hover:bg-white/[0.015] transition-colors'
                    }
                  >
                    <td className="px-4 py-2.5 align-top font-mono-tabular text-xs font-medium text-zinc-300 whitespace-nowrap">
                      <div>{label}</div>
                      <div className="text-[10px] font-sans text-zinc-500 mt-0.5">
                        {isReadOnly
                          ? `Kemarin (${formatShortIndonesianDate(yesterdayDate)})`
                          : isSecondDay
                            ? `Besok (${formatShortIndonesianDate(tomorrowDate)})`
                            : `Hari Ini (${formatShortIndonesianDate(todayDate)})`}
                      </div>
                      {isCurrentHour && (
                        <div className="text-[10px] font-sans font-semibold text-pink-300 mt-0.5">
                          Jam sekarang
                        </div>
                      )}
                    </td>

                    <td className="px-3 py-2 align-top">
                      {renderCell(
                        absHour,
                        rowDay,
                        'partner1',
                        p1Entries,
                        !isReadOnly && currentUser.slot === 'partner1',
                        false
                      )}
                    </td>

                    <td className="px-3 py-2 align-top bg-[#17121A]/60">
                      {renderCell(
                        absHour,
                        rowDay,
                        'together',
                        qtEntries,
                        !isReadOnly && rowDayConfirmedBoth,
                        isMutuallyFree
                      )}
                    </td>

                    <td className="px-3 py-2 align-top">
                      {renderCell(
                        absHour,
                        rowDay,
                        'partner2',
                        p2Entries,
                        !isReadOnly && currentUser.slot === 'partner2',
                        false
                      )}
                    </td>
                  </tr>
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
