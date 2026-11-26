import { useEffect, useRef, useState, type FormEvent } from 'react';
import { MoonStar, X } from 'lucide-react';
import type {
  ActivityCategory,
  AuthenticatedUser,
  DayConfirmationState,
  EditableDayKey,
  ScheduleOwner,
} from '../types';
import { addDaysToDateStr, formatShortIndonesianDate, timeToMinutes } from '../utils/freeTime';

export interface AddScheduleInitial {
  day: EditableDayKey;
  endDay?: EditableDayKey;
  owner: ScheduleOwner;
  title?: string;
  category?: ActivityCategory;
  startTime?: string;
  endTime?: string;
}

interface AddScheduleModalProps {
  open: boolean;
  initial: AddScheduleInitial | null;
  currentUser: AuthenticatedUser;
  todayDate: string;
  tomorrowDate: string;
  confirmedByDate: Record<string, DayConfirmationState>;
  onClose: () => void;
  onSave: (payload: {
    date: string;
    endDate?: string;
    owner: ScheduleOwner;
    title: string;
    category: ActivityCategory;
    startTime: string;
    endTime: string;
  }) => Promise<string | null>;
}

const PERSONAL_PRESETS: Array<{ label: string; category: ActivityCategory }> = [
  { label: 'Kuliah', category: 'kuliah' },
  { label: 'Kerja', category: 'kerja' },
  { label: 'Belajar', category: 'belajar' },
  { label: 'Nugas', category: 'belajar' },
];

const TOGETHER_PRESETS: Array<{ label: string; category: ActivityCategory }> = [
  { label: 'Nonton Bareng', category: 'quality_time' },
  { label: 'Sleep Call', category: 'quality_time' },
  { label: 'Makan Bareng VC', category: 'quality_time' },
  { label: 'Deep Talk', category: 'quality_time' },
];

export function AddScheduleModal({
  open,
  initial,
  currentUser,
  todayDate,
  tomorrowDate,
  confirmedByDate,
  onClose,
  onSave,
}: AddScheduleModalProps) {
  const [day, setDay] = useState<EditableDayKey>('today');
  const [crossMidnight, setCrossMidnight] = useState(false);
  const [owner, setOwner] = useState<ScheduleOwner>(currentUser.slot);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<ActivityCategory>('kuliah');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('11:00');
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const wasOpenRef = useRef(false);
  const confirmedRef = useRef(confirmedByDate);
  confirmedRef.current = confirmedByDate;

  const startDate = day === 'today' ? todayDate : tomorrowDate;
  const endDate = crossMidnight ? addDaysToDateStr(startDate, 1) : startDate;

  const startConf = confirmedByDate[startDate];
  const endConf = confirmedByDate[endDate];
  const bothConfirmedForSelection = crossMidnight
    ? Boolean(startConf?.partner1 && startConf?.partner2 && endConf?.partner1 && endConf?.partner2)
    : Boolean(startConf?.partner1 && startConf?.partner2);

  useEffect(() => {
    const justOpened = open && !wasOpenRef.current;
    wasOpenRef.current = open;

    if (justOpened && initial) {
      const targetDay = initial.day;
      const isOvernight = Boolean(initial.endDay && initial.endDay !== targetDay);
      const sDate = targetDay === 'today' ? todayDate : tomorrowDate;
      const eDate = isOvernight ? addDaysToDateStr(sDate, 1) : sDate;
      const sConf = confirmedRef.current[sDate];
      const eConf = confirmedRef.current[eDate];
      const canUseTogether = isOvernight
        ? Boolean(sConf?.partner1 && sConf?.partner2 && eConf?.partner1 && eConf?.partner2)
        : Boolean(sConf?.partner1 && sConf?.partner2);

      const safeOwner: ScheduleOwner =
        initial.owner === 'together' && canUseTogether
          ? 'together'
          : currentUser.slot;

      setDay(targetDay);
      setCrossMidnight(isOvernight);
      setOwner(safeOwner);
      setTitle(initial.title ?? '');
      setCategory(
        initial.category ?? (safeOwner === 'together' ? 'quality_time' : 'kuliah')
      );
      setStartTime(initial.startTime ?? '09:00');
      setEndTime(initial.endTime ?? '11:00');
      setErrorMsg(null);
    }
  }, [open, initial, currentUser.slot, todayDate, tomorrowDate]);

  if (!open) return null;

  const presets = owner === 'together' ? TOGETHER_PRESETS : PERSONAL_PRESETS;

  const handleTimeChange = (nextStart: string, nextEnd: string) => {
    setStartTime(nextStart);
    setEndTime(nextEnd);
    if (nextStart && nextEnd && timeToMinutes(nextEnd) <= timeToMinutes(nextStart)) {
      setCrossMidnight(true);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!title.trim()) {
      setErrorMsg('Tulis dulu nama kegiatannya ya.');
      return;
    }
    if (!startTime || !endTime) {
      setErrorMsg('Isi jam mulai & selesai terlebih dahulu.');
      return;
    }
    const startMin = timeToMinutes(startTime);
    const endMin = crossMidnight ? 24 * 60 + timeToMinutes(endTime) : timeToMinutes(endTime);
    if (endMin <= startMin) {
      setErrorMsg(
        'Jam selesai lebih awal dari jam mulai. Aktifkan "Lanjut ke hari berikutnya" jika melewati tengah malam.'
      );
      return;
    }
    if (endMin - startMin > 24 * 60) {
      setErrorMsg('Durasi satu jadwal maksimal 24 jam.');
      return;
    }

    setSaving(true);
    const err = await onSave({
      date: startDate,
      ...(crossMidnight ? { endDate } : {}),
      owner,
      title: title.trim(),
      category,
      startTime,
      endTime,
    });
    setSaving(false);
    if (err) {
      setErrorMsg(err);
    } else {
      onClose();
    }
  };

  const todayConf = confirmedByDate[todayDate];
  const tomorrowConf = confirmedByDate[tomorrowDate];

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-schedule-title"
    >
      <div className="w-full max-w-md rounded-2xl bg-[#14141B] border border-pink-400/25 p-6 shadow-2xl max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 id="add-schedule-title" className="font-display text-lg font-bold text-white">
            Tambah Jadwal Baru
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup form jadwal"
            className="w-9 h-9 rounded-lg flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Hari Mulai */}
          <div className="space-y-1.5">
            <span className="block text-xs font-medium text-zinc-300">Mulai di Hari</span>
            <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-[#0E0E13] border border-white/10">
              <button
                type="button"
                onClick={() => {
                  setDay('today');
                  if (
                    owner === 'together' &&
                    !(todayConf?.partner1 && todayConf?.partner2)
                  ) {
                    setOwner(currentUser.slot);
                    setCategory('kuliah');
                  }
                }}
                className={`min-h-[38px] rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  day === 'today'
                    ? 'bg-pink-500 text-zinc-950'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Hari Ini ({formatShortIndonesianDate(todayDate)})
              </button>
              <button
                type="button"
                onClick={() => {
                  setDay('tomorrow');
                  if (
                    owner === 'together' &&
                    !(tomorrowConf?.partner1 && tomorrowConf?.partner2)
                  ) {
                    setOwner(currentUser.slot);
                    setCategory('kuliah');
                  }
                }}
                className={`min-h-[38px] rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  day === 'tomorrow'
                    ? 'bg-pink-500 text-zinc-950'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Besok ({formatShortIndonesianDate(tomorrowDate)})
              </button>
            </div>
          </div>

          {/* Pemilik Jadwal: Strictly own schedule or Quality Time */}
          <div className="space-y-1.5">
            <span className="block text-xs font-medium text-zinc-300">Jadwal Siapa?</span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setOwner(currentUser.slot);
                  if (category === 'quality_time') setCategory('kuliah');
                }}
                className={`min-h-[40px] px-3 rounded-xl border text-xs font-semibold truncate transition-colors cursor-pointer ${
                  owner === currentUser.slot
                    ? 'bg-pink-500/20 border-pink-400 text-pink-200'
                    : 'bg-[#0E0E13] border-white/10 text-zinc-400 hover:text-white'
                }`}
              >
                Jadwal {currentUser.name}
              </button>
              <button
                type="button"
                disabled={!bothConfirmedForSelection}
                onClick={() => {
                  setOwner('together');
                  setCategory('quality_time');
                }}
                className={`min-h-[40px] px-3 rounded-xl border text-xs font-semibold truncate transition-colors ${
                  !bothConfirmedForSelection
                    ? 'bg-[#0E0E13] border-white/5 text-zinc-600 cursor-not-allowed'
                    : owner === 'together'
                      ? 'bg-pink-500 border-pink-400 text-zinc-950 cursor-pointer'
                      : 'bg-[#0E0E13] border-white/10 text-zinc-400 hover:text-white cursor-pointer'
                }`}
              >
                Quality Time Bareng
              </button>
            </div>
            {!bothConfirmedForSelection && (
              <p className="text-[11px] text-zinc-500">
                {crossMidnight
                  ? 'Quality Time lintas tengah malam terbuka setelah jadwal Hari Ini & Besok dikonfirmasi berdua.'
                  : 'Quality Time terbuka setelah kalian berdua konfirmasi selesai isi jadwal pribadi.'}
              </p>
            )}
          </div>

          {/* Quick Pick Templates */}
          <div className="space-y-1.5">
            <span className="block text-xs font-medium text-zinc-400">Pilih cepat (opsional)</span>
            <div className="flex flex-wrap gap-1.5">
              {presets.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => {
                    setTitle(preset.label);
                    setCategory(preset.category);
                  }}
                  className="px-2.5 py-1.5 rounded-lg bg-[#1C1C26] hover:bg-pink-500/20 border border-white/10 hover:border-pink-400/40 text-xs text-zinc-200 transition-colors cursor-pointer whitespace-nowrap"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div className="space-y-1.5">
            <label htmlFor="schedule-title" className="block text-xs font-medium text-zinc-300">
              Nama Kegiatan
            </label>
            <input
              id="schedule-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={80}
              placeholder={
                owner === 'together'
                  ? 'Misal: Deep Talk & Nonton Malam'
                  : 'Misal: Belajar / Nugas Malam'
              }
              className="w-full min-h-[44px] rounded-xl bg-[#0E0E13] border border-white/15 px-3.5 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-pink-400"
            />
          </div>

          {/* Category + Time */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <label htmlFor="schedule-category" className="block text-xs font-medium text-zinc-300">
                Jenis
              </label>
              <select
                id="schedule-category"
                value={category}
                onChange={(e) => setCategory(e.target.value as ActivityCategory)}
                className="w-full min-h-[44px] rounded-xl bg-[#0E0E13] border border-white/15 px-3 py-2 text-xs text-white focus:outline-none focus:border-pink-400"
              >
                <option value="kuliah">Kuliah</option>
                <option value="kerja">Kerja</option>
                <option value="belajar">Belajar</option>
                <option value="quality_time">Quality Time</option>
                <option value="lainnya">Lainnya</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="schedule-start" className="block text-xs font-medium text-zinc-300">
                Jam Mulai
              </label>
              <input
                id="schedule-start"
                type="time"
                value={startTime}
                onChange={(e) => handleTimeChange(e.target.value, endTime)}
                className="w-full min-h-[44px] rounded-xl bg-[#0E0E13] border border-white/15 px-3 py-2 text-sm font-mono-tabular text-white focus:outline-none focus:border-pink-400"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="schedule-end" className="block text-xs font-medium text-zinc-300">
                Jam Selesai
              </label>
              <input
                id="schedule-end"
                type="time"
                value={endTime}
                onChange={(e) => handleTimeChange(startTime, e.target.value)}
                className="w-full min-h-[44px] rounded-xl bg-[#0E0E13] border border-white/15 px-3 py-2 text-sm font-mono-tabular text-white focus:outline-none focus:border-pink-400"
              />
            </div>
          </div>

          {/* Overnight / Cross-Midnight Toggle */}
          <label className="flex items-start gap-3 rounded-xl bg-[#0E0E13] border border-white/10 p-3 cursor-pointer hover:border-pink-400/35 transition-colors">
            <input
              type="checkbox"
              checked={crossMidnight}
              onChange={(e) => {
                const next = e.target.checked;
                setCrossMidnight(next);
                if (next && owner === 'together') {
                  const targetEndDate = addDaysToDateStr(startDate, 1);
                  const ec = confirmedByDate[targetEndDate];
                  if (!(startConf?.partner1 && startConf?.partner2 && ec?.partner1 && ec?.partner2)) {
                    setOwner(currentUser.slot);
                    setCategory('kuliah');
                  }
                }
              }}
              className="mt-0.5 accent-pink-500 w-4 h-4 shrink-0 cursor-pointer"
            />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-pink-200">
                <MoonStar className="w-3.5 h-3.5 text-pink-400 shrink-0" />
                <span>Lanjut ke hari berikutnya (lintas tengah malam)</span>
              </div>
              <p className="text-[11px] text-zinc-400 mt-0.5 font-mono-tabular">
                {startTime || '--:--'} ({formatShortIndonesianDate(startDate)}) →{' '}
                {endTime || '--:--'} ({formatShortIndonesianDate(endDate)})
              </p>
            </div>
          </label>

          {errorMsg && (
            <div className="rounded-xl bg-rose-500/15 border border-rose-400/35 px-3.5 py-2.5 text-xs text-rose-200">
              {errorMsg}
            </div>
          )}

          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[42px] px-4 py-2 rounded-xl border border-white/15 text-xs font-medium text-zinc-300 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={saving}
              className="min-h-[42px] px-5 py-2 rounded-xl bg-pink-500 hover:bg-pink-400 disabled:opacity-60 text-zinc-950 text-xs font-semibold transition-colors cursor-pointer"
            >
              {saving ? 'Menyimpan...' : 'Simpan Jadwal'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
