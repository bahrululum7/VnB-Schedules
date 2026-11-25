import { BellRing, CheckCircle2, Heart, History, Plus, Trash2, User } from 'lucide-react';
import type {
  ActivityCategory,
  AuthenticatedUser,
  DayConfirmationState,
  DayKey,
  PartnerProfile,
  ScheduleItem,
  ScheduleOwner,
} from '../types';
import { timeToMinutes } from '../utils/freeTime';

interface ScheduleTable24hProps {
  selectedDay: DayKey;
  targetDate: string;
  dateLabel: string;
  isReadOnly: boolean;
  currentHour: number;
  currentUser: AuthenticatedUser;
  partner1: PartnerProfile;
  partner2: PartnerProfile;
  schedules: ScheduleItem[];
  dayConf: DayConfirmationState;
  bothConfirmed: boolean;
  confirming: boolean;
  onAddAtHour: (owner: ScheduleOwner, startTime: string, endTime: string) => void;
  onDeleteItem: (id: string) => Promise<void>;
  onToggleConfirm: (nextVal: boolean) => Promise<void>;
  onPreviewAlarm: (item: ScheduleItem) => void;
}

const CATEGORY_LABELS: Record<ActivityCategory, string> = {
  kuliah: 'Kuliah',
  kerja: 'Kerja',
  belajar: 'Belajar',
  quality_time: 'Quality Time',
  lainnya: 'Lainnya',
};

const HOURS = Array.from({ length: 24 }, (_, i) => i);

function formatHourRange(hour: number): { label: string; start: string; end: string } {
  const start = `${String(hour).padStart(2, '0')}:00`;
  const endLabel = `${String(hour + 1).padStart(2, '0')}:00`;
  const endValue = hour === 23 ? '23:59' : endLabel;
  return {
    label: `${start} – ${endLabel}`,
    start,
    end: endValue,
  };
}

function getItemsInHour(items: ScheduleItem[], hour: number): ScheduleItem[] {
  const hourStart = hour * 60;
  const hourEnd = (hour + 1) * 60;
  return items.filter((item) => {
    const s = timeToMinutes(item.startTime);
    const e = timeToMinutes(item.endTime);
    return s < hourEnd && e > hourStart;
  });
}

function startsInHour(item: ScheduleItem, hour: number): boolean {
  const s = timeToMinutes(item.startTime);
  return s >= hour * 60 && s < (hour + 1) * 60;
}

export function ScheduleTable24h({
  selectedDay,
  targetDate,
  dateLabel,
  isReadOnly,
  currentHour,
  currentUser,
  partner1,
  partner2,
  schedules,
  dayConf,
  bothConfirmed,
  confirming,
  onAddAtHour,
  onDeleteItem,
  onToggleConfirm,
  onPreviewAlarm,
}: ScheduleTable24hProps) {
  const dayItems = schedules.filter((s) => s.date === targetDate);
  const p1Items = dayItems.filter((s) => s.owner === 'partner1');
  const p2Items = dayItems.filter((s) => s.owner === 'partner2');
  const qtItems = dayItems.filter((s) => s.owner === 'together');

  const renderCell = (
    hour: number,
    owner: ScheduleOwner,
    cellItems: ScheduleItem[],
    canEditCell: boolean,
    isHourMutuallyFree: boolean
  ) => {
    const { start, end } = formatHourRange(hour);
    const isTogether = owner === 'together';

    if (cellItems.length === 0) {
      if (canEditCell && !isReadOnly) {
        return (
          <button
            type="button"
            onClick={() => onAddAtHour(owner, start, end)}
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
        {cellItems.map((item) => {
          const isStartRow = startsInHour(item, hour);
          const canDelete =
            !isReadOnly &&
            (item.owner === currentUser.slot || item.owner === 'together');

          if (!isStartRow) {
            return (
              <div
                key={`${item.id}-cont-${hour}`}
                className={`rounded-lg px-2.5 py-1.5 text-xs flex items-center justify-between gap-2 border ${
                  isTogether
                    ? 'bg-pink-500/12 border-pink-400/25 text-pink-200'
                    : 'bg-white/[0.04] border-white/10 text-zinc-400'
                }`}
              >
                <span className="truncate">↳ Lanjutan: {item.title}</span>
                <span className="font-mono-tabular text-[11px] shrink-0">
                  s/d {item.endTime}
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

  return (
    <div className="rounded-2xl bg-[#14141B] border border-white/10 overflow-hidden">
      {isReadOnly ? (
        <div className="p-4 sm:p-5 border-b border-white/[0.08] bg-[#101016] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 text-sm font-medium text-pink-200">
            <History className="w-4 h-4 text-pink-400 shrink-0" />
            <span>Riwayat Jadwal Kemarin ({dateLabel}) · Hanya Lihat</span>
          </div>
          <p className="text-xs text-zinc-400">
            Jadwal kemarin tersimpan sebagai arsip dan tidak bisa diubah lagi.
          </p>
        </div>
      ) : (
        <div className="p-4 sm:p-5 border-b border-white/[0.08] grid grid-cols-1 md:grid-cols-2 gap-3 bg-[#101016]">
          {/* Partner 1 Confirmation Box */}
          <div
            className={`rounded-xl border px-4 py-3 flex items-center justify-between gap-3 ${
              currentUser.slot === 'partner1'
                ? 'bg-[#171520] border-pink-400/30'
                : 'bg-[#14141B] border-white/10'
            }`}
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-pink-400 shrink-0" />
                <span className="font-display text-sm font-bold text-white truncate">
                  {partner1.name}
                </span>
                <span className="text-xs text-zinc-400">
                  · {partner1.online ? 'Online' : 'Offline'}
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                {dayConf.partner1
                  ? 'Sudah konfirmasi selesai isi jadwal'
                  : 'Belum konfirmasi selesai isi jadwal'}
              </p>
            </div>

            {currentUser.slot === 'partner1' ? (
              dayConf.partner1 ? (
                <button
                  type="button"
                  disabled={confirming}
                  onClick={() => void onToggleConfirm(false)}
                  className="min-h-[36px] px-3 py-1.5 rounded-lg border border-white/15 text-xs font-medium text-zinc-200 hover:bg-white/5 transition-colors cursor-pointer shrink-0 whitespace-nowrap"
                >
                  Ubah Lagi
                </button>
              ) : (
                <button
                  type="button"
                  disabled={confirming}
                  onClick={() => void onToggleConfirm(true)}
                  className="min-h-[38px] px-3.5 py-1.5 rounded-xl bg-pink-500 hover:bg-pink-400 disabled:opacity-60 text-zinc-950 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 whitespace-nowrap"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{confirming ? 'Menyimpan...' : 'Konfirmasi Selesai'}</span>
                </button>
              )
            ) : (
              <CheckCircle2
                className={`w-5 h-5 shrink-0 ${
                  dayConf.partner1 ? 'text-pink-400' : 'text-zinc-700'
                }`}
              />
            )}
          </div>

          {/* Partner 2 Confirmation Box */}
          <div
            className={`rounded-xl border px-4 py-3 flex items-center justify-between gap-3 ${
              currentUser.slot === 'partner2'
                ? 'bg-[#171520] border-pink-400/30'
                : 'bg-[#14141B] border-white/10'
            }`}
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-pink-300 shrink-0" />
                <span className="font-display text-sm font-bold text-white truncate">
                  {partner2.name}
                </span>
                <span className="text-xs text-zinc-400">
                  · {partner2.online ? 'Online' : 'Offline'}
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                {dayConf.partner2
                  ? 'Sudah konfirmasi selesai isi jadwal'
                  : 'Belum konfirmasi selesai isi jadwal'}
              </p>
            </div>

            {currentUser.slot === 'partner2' ? (
              dayConf.partner2 ? (
                <button
                  type="button"
                  disabled={confirming}
                  onClick={() => void onToggleConfirm(false)}
                  className="min-h-[36px] px-3 py-1.5 rounded-lg border border-white/15 text-xs font-medium text-zinc-200 hover:bg-white/5 transition-colors cursor-pointer shrink-0 whitespace-nowrap"
                >
                  Ubah Lagi
                </button>
              ) : (
                <button
                  type="button"
                  disabled={confirming}
                  onClick={() => void onToggleConfirm(true)}
                  className="min-h-[38px] px-3.5 py-1.5 rounded-xl bg-pink-500 hover:bg-pink-400 disabled:opacity-60 text-zinc-950 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 whitespace-nowrap"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{confirming ? 'Menyimpan...' : 'Konfirmasi Selesai'}</span>
                </button>
              )
            ) : (
              <CheckCircle2
                className={`w-5 h-5 shrink-0 ${
                  dayConf.partner2 ? 'text-pink-400' : 'text-zinc-700'
                }`}
              />
            )}
          </div>
        </div>
      )}

      {/* Full 00:00 - 24:00 Schedule Table */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] border-collapse text-left">
          <thead>
            <tr className="border-b border-white/10 bg-[#111118] text-xs font-semibold text-zinc-300">
              <th className="w-36 px-4 py-3.5 font-mono-tabular">Jam (00–24)</th>
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
            {HOURS.map((hour) => {
              const { label } = formatHourRange(hour);
              const p1HourItems = getItemsInHour(p1Items, hour);
              const p2HourItems = getItemsInHour(p2Items, hour);
              const qtHourItems = getItemsInHour(qtItems, hour);
              const isMutuallyFree =
                p1HourItems.length === 0 &&
                p2HourItems.length === 0 &&
                qtHourItems.length === 0;
              const isCurrentHour = selectedDay === 'today' && hour === currentHour;

              return (
                <tr
                  key={hour}
                  className={
                    isCurrentHour
                      ? 'bg-pink-500/[0.07]'
                      : 'hover:bg-white/[0.015] transition-colors'
                  }
                >
                  <td className="px-4 py-2.5 align-top font-mono-tabular text-xs font-medium text-zinc-300 whitespace-nowrap">
                    <div>{label}</div>
                    {isCurrentHour && (
                      <div className="text-[10px] font-sans font-semibold text-pink-300 mt-0.5">
                        Jam sekarang
                      </div>
                    )}
                  </td>

                  <td className="px-3 py-2 align-top">
                    {renderCell(
                      hour,
                      'partner1',
                      p1HourItems,
                      !isReadOnly && currentUser.slot === 'partner1',
                      false
                    )}
                  </td>

                  <td className="px-3 py-2 align-top bg-[#17121A]/60">
                    {renderCell(
                      hour,
                      'together',
                      qtHourItems,
                      !isReadOnly && bothConfirmed,
                      isMutuallyFree
                    )}
                  </td>

                  <td className="px-3 py-2 align-top">
                    {renderCell(
                      hour,
                      'partner2',
                      p2HourItems,
                      !isReadOnly && currentUser.slot === 'partner2',
                      false
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
