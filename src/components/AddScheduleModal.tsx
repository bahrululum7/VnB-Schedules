import { useEffect, useState, type FormEvent } from 'react';
import { X } from 'lucide-react';
import type {
  ActivityCategory,
  AuthenticatedUser,
  DayConfirmationState,
  DayKey,
  ScheduleOwner,
} from '../types';

export interface AddScheduleInitial {
  day: DayKey;
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
  confirmedPersonal: {
    today: DayConfirmationState;
    tomorrow: DayConfirmationState;
  };
  onClose: () => void;
  onSave: (payload: {
    day: DayKey;
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
  confirmedPersonal,
  onClose,
  onSave,
}: AddScheduleModalProps) {
  const [day, setDay] = useState<DayKey>('today');
  const [owner, setOwner] = useState<ScheduleOwner>(currentUser.slot);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<ActivityCategory>('kuliah');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('11:00');
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const bothConfirmedForDay =
    confirmedPersonal[day].partner1 && confirmedPersonal[day].partner2;

  useEffect(() => {
    if (open && initial) {
      const targetDay = initial.day;
      const canUseTogether =
        confirmedPersonal[targetDay].partner1 && confirmedPersonal[targetDay].partner2;
      const safeOwner: ScheduleOwner =
        initial.owner === 'together' && canUseTogether
          ? 'together'
          : currentUser.slot;

      setDay(targetDay);
      setOwner(safeOwner);
      setTitle(initial.title ?? '');
      setCategory(
        initial.category ?? (safeOwner === 'together' ? 'quality_time' : 'kuliah')
      );
      setStartTime(initial.startTime ?? '09:00');
      setEndTime(initial.endTime ?? '11:00');
      setErrorMsg(null);
    }
  }, [open, initial, currentUser.slot, confirmedPersonal]);

  if (!open) return null;

  const presets = owner === 'together' ? TOGETHER_PRESETS : PERSONAL_PRESETS;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!title.trim()) {
      setErrorMsg('Tulis dulu nama kegiatannya ya.');
      return;
    }
    setSaving(true);
    const err = await onSave({
      day,
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

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-schedule-title"
    >
      <div className="w-full max-w-md rounded-2xl bg-[#14141B] border border-pink-400/25 p-6 shadow-2xl">
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
          {/* Hari */}
          <div className="space-y-1.5">
            <span className="block text-xs font-medium text-zinc-300">Untuk Hari</span>
            <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-[#0E0E13] border border-white/10">
              <button
                type="button"
                onClick={() => {
                  setDay('today');
                  if (
                    owner === 'together' &&
                    !(confirmedPersonal.today.partner1 && confirmedPersonal.today.partner2)
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
                Hari Ini
              </button>
              <button
                type="button"
                onClick={() => {
                  setDay('tomorrow');
                  if (
                    owner === 'together' &&
                    !(confirmedPersonal.tomorrow.partner1 && confirmedPersonal.tomorrow.partner2)
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
                Besok
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
                disabled={!bothConfirmedForDay}
                onClick={() => {
                  setOwner('together');
                  setCategory('quality_time');
                }}
                className={`min-h-[40px] px-3 rounded-xl border text-xs font-semibold truncate transition-colors ${
                  !bothConfirmedForDay
                    ? 'bg-[#0E0E13] border-white/5 text-zinc-600 cursor-not-allowed'
                    : owner === 'together'
                      ? 'bg-pink-500 border-pink-400 text-zinc-950 cursor-pointer'
                      : 'bg-[#0E0E13] border-white/10 text-zinc-400 hover:text-white cursor-pointer'
                }`}
              >
                Quality Time Bareng
              </button>
            </div>
            {!bothConfirmedForDay && (
              <p className="text-[11px] text-zinc-500">
                Quality Time terbuka setelah kalian berdua konfirmasi selesai isi jadwal pribadi.
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
                  ? 'Misal: Nonton Film Bareng'
                  : 'Misal: Kuliah Blok Kardio / Belajar'
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
                onChange={(e) => setStartTime(e.target.value)}
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
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full min-h-[44px] rounded-xl bg-[#0E0E13] border border-white/15 px-3 py-2 text-sm font-mono-tabular text-white focus:outline-none focus:border-pink-400"
              />
            </div>
          </div>

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
