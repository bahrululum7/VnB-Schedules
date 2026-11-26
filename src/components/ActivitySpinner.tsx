import { useEffect, useRef, useState, type FormEvent } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  CalendarPlus,
  CheckCircle2,
  History,
  Lock,
  MoonStar,
  Plus,
  RotateCw,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import type {
  DayConfirmationState,
  DayKey,
  EditableDayKey,
  FreeSlot,
  SpinEvent,
  SpinnerOption,
} from '../types';
import {
  formatDuration,
  formatShortIndonesianDate,
  timeToMinutes,
} from '../utils/freeTime';

interface ActivitySpinnerProps {
  options: SpinnerOption[];
  lastSpin: SpinEvent | null;
  selectedDay: DayKey;
  yesterdayDate: string;
  todayDate: string;
  tomorrowDate: string;
  confirmedByDate: Record<string, DayConfirmationState>;
  isReadOnly: boolean;
  freeSlots: FreeSlot[];
  canBookQualityTime: boolean;
  onAddOption: (label: string) => Promise<string | null>;
  onDeleteOption: (id: string) => Promise<void>;
  onTriggerSpin: () => Promise<SpinEvent | null>;
  onInsertWinnerToSlot: (
    winnerLabel: string,
    startDate: string,
    endDate: string,
    startTime: string,
    endTime: string
  ) => Promise<string | null>;
}

const SEGMENT_COLORS = [
  { bg: '#F472B6', text: '#0B0B0F' },
  { bg: '#1D1D27', text: '#FCE7F3' },
  { bg: '#FB7185', text: '#0B0B0F' },
  { bg: '#262634', text: '#FDA4AF' },
  { bg: '#EC4899', text: '#0B0B0F' },
  { bg: '#16161F', text: '#FAF5F7' },
];

export function ActivitySpinner({
  options,
  lastSpin,
  selectedDay,
  yesterdayDate,
  todayDate,
  tomorrowDate,
  confirmedByDate,
  isReadOnly,
  freeSlots,
  canBookQualityTime,
  onAddOption,
  onDeleteOption,
  onTriggerSpin,
  onInsertWinnerToSlot,
}: ActivitySpinnerProps) {
  const [newLabel, setNewLabel] = useState('');
  const [adding, setAdding] = useState(false);
  const [spinning, setSpinning] = useState(false);
  const [rotationDeg, setRotationDeg] = useState(0);
  const [displayedWinner, setDisplayedWinner] = useState<string | null>(null);
  const [spunByName, setSpunByName] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [selectedSlotIdx, setSelectedSlotIdx] = useState(0);
  const [customStartDay, setCustomStartDay] = useState<EditableDayKey>('today');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [crossMidnight, setCrossMidnight] = useState(false);
  const [inserting, setInserting] = useState(false);
  const [confirmedInserted, setConfirmedInserted] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const lastHandledSpinId = useRef<string | null>(lastSpin?.id ?? null);
  const spinTimerRef = useRef<number | null>(null);
  const optionsCountRef = useRef<number>(options.length);
  optionsCountRef.current = options.length;

  const freeSlotsKey = freeSlots
    .map((s) => `${s.startDate}-${s.startTime}-${s.endDate}-${s.endTime}`)
    .join('|');

  useEffect(() => {
    return () => {
      if (spinTimerRef.current !== null) {
        window.clearTimeout(spinTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const chosen = freeSlots[selectedSlotIdx] ?? freeSlots[0];
    if (chosen) {
      const startsTomorrow = chosen.startDate === tomorrowDate;
      const isOvernight = chosen.endDate !== chosen.startDate;
      setCustomStartDay(startsTomorrow ? 'tomorrow' : 'today');
      setCustomStart(chosen.startTime);
      setCustomEnd(chosen.endTime);
      setCrossMidnight(isOvernight);
    } else {
      setCustomStartDay('today');
      setCustomStart('');
      setCustomEnd('');
      setCrossMidnight(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSlotIdx, freeSlotsKey, selectedDay, tomorrowDate]);

  useEffect(() => {
    setSelectedSlotIdx(0);
    setConfirmedInserted(null);
    setShowConfirmModal(false);
  }, [selectedDay]);

  const spinId = lastSpin?.id ?? null;
  useEffect(() => {
    if (!lastSpin || !spinId || spinId === lastHandledSpinId.current) return;
    lastHandledSpinId.current = spinId;

    if (spinTimerRef.current !== null) {
      window.clearTimeout(spinTimerRef.current);
    }

    const count = Math.max(optionsCountRef.current, 1);
    const sliceDeg = 360 / count;
    const idx = Math.min(lastSpin.winnerIndex, count - 1);
    const sliceCenterAngle = idx * sliceDeg + sliceDeg / 2;
    const targetMod = (360 - sliceCenterAngle) % 360;

    setSpinning(true);
    setShowConfirmModal(false);
    setConfirmedInserted(null);
    setErrorMsg(null);

    setRotationDeg((prev) => {
      const currentMod = ((prev % 360) + 360) % 360;
      const delta = (targetMod - currentMod + 360) % 360;
      return prev + 360 * 5 + delta;
    });

    const winnerLabel = lastSpin.winnerLabel;
    const spinnerAuthor = lastSpin.spunBy;

    spinTimerRef.current = window.setTimeout(() => {
      spinTimerRef.current = null;
      setSpinning(false);
      setDisplayedWinner(winnerLabel);
      setSpunByName(spinnerAuthor);
      setShowConfirmModal(true);
    }, 3400);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spinId]);

  const formatSlotOptionLabel = (slot: FreeSlot): string => {
    const startShort = formatShortIndonesianDate(slot.startDate);
    const endShort = formatShortIndonesianDate(slot.endDate);
    if (slot.startDate === slot.endDate) {
      return `${slot.startTime} – ${slot.endTime} (${startShort} · ${formatDuration(slot.durationMinutes)})`;
    }
    return `${slot.startTime} (${startShort}) – ${slot.endTime} (${endShort}) · ${formatDuration(slot.durationMinutes)}`;
  };

  const handleAdd = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!newLabel.trim() || isReadOnly) return;
    setAdding(true);
    const err = await onAddOption(newLabel.trim());
    setAdding(false);
    if (err) {
      setErrorMsg(err);
    } else {
      setNewLabel('');
    }
  };

  const handleSpinClick = async () => {
    if (
      isReadOnly ||
      !canBookQualityTime ||
      spinning ||
      options.length < 2 ||
      freeSlots.length === 0
    ) {
      return;
    }
    setErrorMsg(null);
    setConfirmedInserted(null);
    setShowConfirmModal(false);
    await onTriggerSpin();
  };

  const handleConfirmInsert = async () => {
    if (isReadOnly || !displayedWinner || !customStart || !customEnd) return;
    setErrorMsg(null);

    const chosenSlot = freeSlots[selectedSlotIdx] ?? freeSlots[0];
    if (!chosenSlot) {
      setErrorMsg('Pilih jam kosong yang tersedia terlebih dahulu.');
      return;
    }

    const pickedStartDate = customStartDay === 'tomorrow' ? tomorrowDate : todayDate;
    const pickedCrossMidnight = customStartDay === 'today' && crossMidnight;
    const pickedEndDate = pickedCrossMidnight ? tomorrowDate : pickedStartDate;

    const startOffset =
      (pickedStartDate === tomorrowDate ? 1440 : 0) + timeToMinutes(customStart);
    const endOffset =
      (pickedEndDate === tomorrowDate ? 1440 : 0) + timeToMinutes(customEnd);

    if (endOffset <= startOffset) {
      setErrorMsg(
        'Jam selesai harus lebih malam dari jam mulai (aktifkan Lanjut ke Besok jika lintas tengah malam).'
      );
      return;
    }
    if (endOffset - startOffset > 1440) {
      setErrorMsg('Durasi satu kegiatan maksimal 24 jam.');
      return;
    }

    const slotStartOffset =
      (chosenSlot.startDate === tomorrowDate ? 1440 : 0) +
      timeToMinutes(chosenSlot.startTime);
    const slotEndOffset =
      (chosenSlot.endDate === tomorrowDate ? 1440 : 0) +
      timeToMinutes(chosenSlot.endTime);

    if (startOffset < slotStartOffset || endOffset > slotEndOffset) {
      setErrorMsg(
        `Jam harus berada di dalam rentang kosong ${formatSlotOptionLabel(chosenSlot)}.`
      );
      return;
    }

    const startConf = confirmedByDate[pickedStartDate];
    const endConf = confirmedByDate[pickedEndDate];
    const startOk = Boolean(startConf?.partner1 && startConf?.partner2);
    const endOk = Boolean(endConf?.partner1 && endConf?.partner2);
    if (!startOk || !endOk) {
      setErrorMsg(
        pickedEndDate !== pickedStartDate
          ? 'Quality Time lintas tengah malam memerlukan konfirmasi selesai dari kalian berdua untuk Hari Ini & Besok.'
          : `Konfirmasi selesai isi jadwal pribadi berdua untuk ${formatShortIndonesianDate(pickedStartDate)} dulu ya.`
      );
      return;
    }

    setInserting(true);
    const err = await onInsertWinnerToSlot(
      displayedWinner,
      pickedStartDate,
      pickedEndDate,
      customStart,
      customEnd
    );
    setInserting(false);
    if (err) {
      setErrorMsg(err);
    } else {
      const rangeText =
        pickedEndDate !== pickedStartDate
          ? `${customStart} (${formatShortIndonesianDate(pickedStartDate)}) – ${customEnd} (${formatShortIndonesianDate(pickedEndDate)})`
          : `${customStart} – ${customEnd} (${formatShortIndonesianDate(pickedStartDate)})`;
      setConfirmedInserted(`${displayedWinner} (${rangeText})`);
      setDisplayedWinner(null);
      setShowConfirmModal(false);
    }
  };

  const count = options.length;
  const sliceAngle = count > 0 ? 360 / count : 360;

  const describeArc = (index: number) => {
    const startAngle = ((index * sliceAngle - 90) * Math.PI) / 180;
    const endAngle = (((index + 1) * sliceAngle - 90) * Math.PI) / 180;
    const r = 135;
    const cx = 150;
    const cy = 150;
    const x1 = cx + r * Math.cos(startAngle);
    const y1 = cy + r * Math.sin(startAngle);
    const x2 = cx + r * Math.cos(endAngle);
    const y2 = cy + r * Math.sin(endAngle);
    const largeArc = sliceAngle > 180 ? 1 : 0;
    return `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`;
  };

  const windowLabel = isReadOnly
    ? `Kemarin (${formatShortIndonesianDate(yesterdayDate)})`
    : `Hari Ini (${formatShortIndonesianDate(todayDate)}) → Besok (${formatShortIndonesianDate(tomorrowDate)})`;

  const chosenSlot = freeSlots[selectedSlotIdx] ?? freeSlots[0];
  const slotAllowsTomorrowStart = chosenSlot
    ? chosenSlot.endDate === tomorrowDate
    : false;
  const slotAllowsTodayStart = chosenSlot
    ? chosenSlot.startDate === todayDate
    : false;

  const renderSlotTimeInputs = (prefix: string) => (
    <>
      <div className="space-y-1.5">
        <label htmlFor={`${prefix}-slot`} className="block text-xs text-zinc-400">
          Rentang Jam Kosong ({windowLabel})
        </label>
        <select
          id={`${prefix}-slot`}
          value={selectedSlotIdx}
          onChange={(e) => setSelectedSlotIdx(Number(e.target.value))}
          className="w-full min-h-[42px] rounded-xl bg-[#14141B] border border-white/15 px-3 py-2 text-xs font-mono-tabular text-white focus:outline-none focus:border-pink-400"
        >
          {freeSlots.map((slot, i) => (
            <option
              key={`${slot.startDate}-${slot.startTime}-${slot.endDate}-${slot.endTime}`}
              value={i}
            >
              {formatSlotOptionLabel(slot)}
            </option>
          ))}
        </select>
      </div>

      {slotAllowsTodayStart && slotAllowsTomorrowStart && (
        <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-[#14141B] border border-white/10">
          <button
            type="button"
            onClick={() => setCustomStartDay('today')}
            className={`min-h-[34px] rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              customStartDay === 'today'
                ? 'bg-pink-500 text-zinc-950'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Mulai Hari Ini
          </button>
          <button
            type="button"
            onClick={() => {
              setCustomStartDay('tomorrow');
              setCrossMidnight(false);
            }}
            className={`min-h-[34px] rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              customStartDay === 'tomorrow'
                ? 'bg-pink-500 text-zinc-950'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Mulai Besok
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label htmlFor={`${prefix}-start`} className="block text-[11px] text-zinc-400">
            Mulai Jam
          </label>
          <input
            id={`${prefix}-start`}
            type="time"
            value={customStart}
            onChange={(e) => {
              const val = e.target.value;
              setCustomStart(val);
              if (
                customStartDay === 'today' &&
                val &&
                customEnd &&
                timeToMinutes(customEnd) <= timeToMinutes(val)
              ) {
                setCrossMidnight(true);
              }
            }}
            className="w-full min-h-[40px] rounded-xl bg-[#14141B] border border-white/15 px-3 py-1.5 text-sm font-mono-tabular text-white focus:outline-none focus:border-pink-400"
          />
        </div>
        <div className="space-y-1">
          <label htmlFor={`${prefix}-end`} className="block text-[11px] text-zinc-400">
            Selesai Jam
          </label>
          <input
            id={`${prefix}-end`}
            type="time"
            value={customEnd}
            onChange={(e) => {
              const val = e.target.value;
              setCustomEnd(val);
              if (
                customStartDay === 'today' &&
                customStart &&
                val &&
                timeToMinutes(val) <= timeToMinutes(customStart)
              ) {
                setCrossMidnight(true);
              }
            }}
            className="w-full min-h-[40px] rounded-xl bg-[#14141B] border border-white/15 px-3 py-1.5 text-sm font-mono-tabular text-white focus:outline-none focus:border-pink-400"
          />
        </div>
      </div>

      {customStartDay === 'today' && slotAllowsTomorrowStart && (
        <label className="flex items-center gap-2.5 text-xs text-pink-200 cursor-pointer pt-1">
          <input
            type="checkbox"
            checked={crossMidnight}
            onChange={(e) => setCrossMidnight(e.target.checked)}
            className="accent-pink-500 w-4 h-4 cursor-pointer"
          />
          <MoonStar className="w-3.5 h-3.5 text-pink-400 shrink-0" />
          <span>Lanjut ke Besok ({formatShortIndonesianDate(tomorrowDate)})</span>
        </label>
      )}
    </>
  );

  return (
    <>
      <section
        id="spin-kegiatan"
        className={`rounded-2xl border p-6 sm:p-7 transition-colors ${
          !isReadOnly && canBookQualityTime
            ? 'bg-[#14141B] border-pink-400/30'
            : 'bg-[#121218] border-white/10'
        }`}
      >
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6 pb-5 border-b border-white/[0.07]">
          <div>
            <h2 className="font-display text-xl sm:text-2xl font-bold text-white">
              Langkah 3 · Spinner Kegiatan Quality Time
            </h2>
            <p className="text-sm text-zinc-400 mt-1">
              {isReadOnly
                ? 'Tab Kemarin hanya menampilkan riwayat jadwal. Pindah ke Hari Ini → Besok untuk memutar spinner.'
                : canBookQualityTime
                  ? 'Isi kegiatan spinner, pilih jam kosong (termasuk malam sampai dini hari besok), lalu putar dan konfirmasi hasilnya.'
                  : 'Terbuka otomatis setelah kalian berdua konfirmasi selesai isi jadwal pribadi.'}
            </p>
          </div>
          {isReadOnly ? (
            <div className="inline-flex items-center gap-2 text-xs font-medium text-zinc-400 shrink-0">
              <History className="w-4 h-4 text-pink-400/70" />
              <span>Mode Riwayat</span>
            </div>
          ) : (
            !canBookQualityTime && (
              <div className="inline-flex items-center gap-2 text-xs font-medium text-zinc-400 shrink-0">
                <Lock className="w-4 h-4 text-pink-400/70" />
                <span>Menunggu konfirmasi berdua</span>
              </div>
            )
          )}
        </div>

        {isReadOnly ? (
          <div className="rounded-xl bg-[#0E0E13] border border-white/10 p-8 text-center space-y-2">
            <History className="w-7 h-7 text-pink-400/70 mx-auto" />
            <p className="font-display text-base font-semibold text-white">
              Riwayat Kemarin Hanya Untuk Dilihat
            </p>
            <p className="text-sm text-zinc-400 max-w-md mx-auto">
              Spinner tidak aktif di tab {windowLabel}. Pilih tab{' '}
              <span className="text-pink-300 font-medium">Hari Ini → Besok</span> untuk memutar spinner berdua.
            </p>
          </div>
        ) : !canBookQualityTime ? (
          <div className="rounded-xl bg-[#0E0E13] border border-white/10 p-8 text-center space-y-2">
            <Lock className="w-7 h-7 text-pink-400/70 mx-auto" />
            <p className="font-display text-base font-semibold text-white">
              Spinner Masih Terkunci
            </p>
            <p className="text-sm text-zinc-400 max-w-md mx-auto">
              Selesaikan jadwal pribadi masing-masing lalu tekan tombol{' '}
              <span className="text-pink-300 font-medium">Konfirmasi Hari Ini</span> atau{' '}
              <span className="text-pink-300 font-medium">Konfirmasi Besok</span> agar spinner terbuka.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left Column: Step 1 & Step 2 */}
            <div className="lg:col-span-6 space-y-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-display text-sm font-bold text-pink-300">
                    1. Isi Kegiatan untuk Spinner
                  </h3>
                  <span className="text-xs text-zinc-500">{options.length} pilihan</span>
                </div>

                <form onSubmit={handleAdd} className="flex gap-2">
                  <input
                    type="text"
                    value={newLabel}
                    onChange={(e) => setNewLabel(e.target.value)}
                    maxLength={50}
                    placeholder="Tambah ide kegiatan... (misal: Sleep Call Malam)"
                    className="flex-1 min-h-[44px] rounded-xl bg-[#0E0E13] border border-white/15 px-3.5 py-2 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-pink-400"
                  />
                  <button
                    type="submit"
                    disabled={adding || !newLabel.trim()}
                    className="min-h-[44px] px-4 py-2 rounded-xl bg-[#22222E] hover:bg-pink-500 hover:text-zinc-950 disabled:opacity-50 border border-white/15 text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 whitespace-nowrap"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Tambah</span>
                  </button>
                </form>

                <div className="rounded-xl bg-[#0E0E13] border border-white/10 divide-y divide-white/[0.06] max-h-[220px] overflow-y-auto">
                  {options.map((opt, idx) => (
                    <div
                      key={opt.id}
                      className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{
                            backgroundColor: SEGMENT_COLORS[idx % SEGMENT_COLORS.length].bg,
                          }}
                          aria-hidden="true"
                        />
                        <span className="text-zinc-100 truncate">{opt.label}</span>
                        <span className="text-xs text-zinc-500 shrink-0">· {opt.addedBy}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => void onDeleteOption(opt.id)}
                        disabled={options.length <= 2}
                        aria-label={`Hapus ${opt.label}`}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-500 hover:text-rose-300 hover:bg-rose-500/10 disabled:opacity-30 transition-colors cursor-pointer shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-3 pt-4 border-t border-white/[0.07]">
                <h3 className="font-display text-sm font-bold text-pink-300">
                  2. Pilih Jam Kosong yang Mau Diisi Hasil Spinner
                </h3>

                {freeSlots.length === 0 ? (
                  <p className="text-xs text-zinc-400 rounded-xl bg-[#0E0E13] border border-white/10 p-3.5">
                    Tidak ada jam kosong minimal 30 menit di rentang {windowLabel}.
                  </p>
                ) : (
                  <div className="rounded-xl bg-[#0E0E13] border border-white/10 p-4 space-y-3">
                    {renderSlotTimeInputs('spinner-main')}

                    <button
                      type="button"
                      onClick={handleSpinClick}
                      disabled={spinning || options.length < 2 || freeSlots.length === 0}
                      className="w-full min-h-[44px] px-5 py-2.5 rounded-xl bg-pink-500 hover:bg-pink-400 disabled:opacity-50 text-zinc-950 font-semibold text-sm inline-flex items-center justify-center gap-2 transition-colors cursor-pointer"
                    >
                      <RotateCw className={`w-4 h-4 ${spinning ? 'animate-spin' : ''}`} />
                      <span>{spinning ? 'Lagi Muter...' : 'Putar Spinner untuk Jam Ini'}</span>
                    </button>
                  </div>
                )}

                {errorMsg && !showConfirmModal && (
                  <p className="text-xs text-rose-300">{errorMsg}</p>
                )}
              </div>
            </div>

            {/* Right Column: Wheel + Result Banner */}
            <div className="lg:col-span-6 flex flex-col items-center justify-center space-y-5">
              <div className="relative w-full max-w-[300px] aspect-square flex items-center justify-center">
                <div
                  className="absolute -top-2 left-1/2 -translate-x-1/2 z-20 drop-shadow"
                  aria-hidden="true"
                >
                  <svg width="28" height="28" viewBox="0 0 28 28">
                    <path d="M14 26 L4 6 L24 6 Z" fill="#FFFFFF" stroke="#EC4899" strokeWidth="2.5" />
                  </svg>
                </div>

                <svg
                  viewBox="0 0 300 300"
                  className="w-full h-full drop-shadow-xl"
                  style={{
                    transform: `rotate(${rotationDeg}deg)`,
                    transition: spinning
                      ? 'transform 3.4s cubic-bezier(0.15, 0.85, 0.2, 1)'
                      : 'none',
                  }}
                >
                  <circle
                    cx="150"
                    cy="150"
                    r="142"
                    fill="#0B0B0F"
                    stroke="#F472B6"
                    strokeOpacity="0.45"
                    strokeWidth="3"
                  />
                  {options.map((opt, idx) => {
                    const palette = SEGMENT_COLORS[idx % SEGMENT_COLORS.length];
                    const midAngleDeg = idx * sliceAngle + sliceAngle / 2 - 90;
                    const labelShort =
                      opt.label.length > 15 ? `${opt.label.slice(0, 14)}…` : opt.label;
                    return (
                      <g key={opt.id}>
                        <path
                          d={describeArc(idx)}
                          fill={palette.bg}
                          stroke="#0B0B0F"
                          strokeWidth="2"
                        />
                        <text
                          x="150"
                          y="150"
                          fill={palette.text}
                          fontSize="10.5"
                          fontWeight="600"
                          fontFamily="DM Sans, sans-serif"
                          textAnchor="end"
                          dominantBaseline="middle"
                          transform={`rotate(${midAngleDeg}, 150, 150) translate(122, 0)`}
                        >
                          {labelShort}
                        </text>
                      </g>
                    );
                  })}
                  <circle cx="150" cy="150" r="22" fill="#0B0B0F" stroke="#F472B6" strokeWidth="3" />
                  <circle cx="150" cy="150" r="7" fill="#F472B6" />
                </svg>
              </div>

              {displayedWinner && !spinning && !showConfirmModal && (
                <div className="w-full rounded-xl bg-pink-500/12 border border-pink-400/40 p-4 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs text-pink-300 font-semibold">Hasil Spin</p>
                    <p className="font-display text-base font-bold text-white truncate">
                      {displayedWinner}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowConfirmModal(true)}
                    className="min-h-[38px] px-4 py-2 rounded-xl bg-pink-500 hover:bg-pink-400 text-zinc-950 font-semibold text-xs shrink-0 cursor-pointer"
                  >
                    Konfirmasi & Masukin
                  </button>
                </div>
              )}

              {confirmedInserted && (
                <div className="w-full rounded-xl bg-pink-500/10 border border-pink-400/30 px-4 py-3 flex items-center gap-2.5 text-xs text-pink-200">
                  <CheckCircle2 className="w-4 h-4 text-pink-400 shrink-0" />
                  <span>
                    Berhasil! <strong className="text-white">{confirmedInserted}</strong> sudah masuk ke jadwal Quality Time.
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </section>

      <AnimatePresence>
        {showConfirmModal && displayedWinner && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            aria-labelledby="spin-result-card-title"
          >
            <motion.div
              initial={{ scale: 0.75, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 360, damping: 24 }}
              className="relative w-full max-w-md rounded-2xl bg-[#15151E] border border-pink-400/45 p-6 shadow-2xl shadow-pink-500/20 space-y-5 max-h-[92vh] overflow-y-auto"
            >
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                aria-label="Tutup kartu hasil spin"
                className="absolute top-4 right-4 w-9 h-9 rounded-lg flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="text-center space-y-2 pt-1">
                <div className="mx-auto w-12 h-12 rounded-2xl bg-pink-500/15 border border-pink-400/35 flex items-center justify-center text-pink-300">
                  <Sparkles className="w-6 h-6" />
                </div>
                <p className="text-xs font-medium text-pink-300">
                  Hasil Spinner{spunByName ? ` · diputar ${spunByName}` : ''}
                </p>
                <h3
                  id="spin-result-card-title"
                  className="font-display text-2xl font-bold text-white text-balance"
                >
                  {displayedWinner}
                </h3>
              </div>

              {freeSlots.length > 0 ? (
                <div className="rounded-xl bg-[#0E0E13] border border-white/10 p-4 space-y-3">
                  {renderSlotTimeInputs('spinner-modal')}
                </div>
              ) : (
                <p className="text-xs text-center text-zinc-400">
                  Belum ada jam kosong yang tersisa di {windowLabel}.
                </p>
              )}

              {errorMsg && (
                <div className="rounded-xl bg-rose-500/15 border border-rose-400/35 px-3.5 py-2.5 text-xs text-rose-200">
                  {errorMsg}
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-2.5">
                <button
                  type="button"
                  disabled={inserting || freeSlots.length === 0 || !customStart || !customEnd}
                  onClick={handleConfirmInsert}
                  className="flex-1 min-h-[44px] px-4 py-2.5 rounded-xl bg-pink-500 hover:bg-pink-400 disabled:opacity-50 text-zinc-950 font-semibold text-xs inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <CalendarPlus className="w-4 h-4" />
                  <span>
                    {inserting ? 'Menyimpan...' : 'Konfirmasi & Masukkan ke Jadwal'}
                  </span>
                </button>
                <button
                  type="button"
                  disabled={spinning}
                  onClick={handleSpinClick}
                  className="min-h-[44px] px-4 py-2.5 rounded-xl border border-white/15 text-xs font-medium text-zinc-300 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                >
                  Putar Ulang
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
