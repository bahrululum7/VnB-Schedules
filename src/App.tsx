import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  BellRing,
  CalendarHeart,
  CheckCircle2,
  Clock,
  LogOut,
  Plus,
  Volume2,
  VolumeX,
} from 'lucide-react';
import type {
  ActivityCategory,
  AuthenticatedUser,
  DayKey,
  ScheduleItem,
  ScheduleOwner,
  SharedWorkspaceState,
  SpinEvent,
} from './types';
import { computeMutualFreeSlots, formatDuration, timeToMinutes } from './utils/freeTime';
import { LoginGate } from './components/LoginGate';
import { CoupleIllustration } from './components/CoupleIllustration';
import { ScheduleTable24h } from './components/ScheduleTable24h';
import { AddScheduleModal, type AddScheduleInitial } from './components/AddScheduleModal';
import { ActivitySpinner } from './components/ActivitySpinner';
import {
  ExplosionAlarmModal,
  type ActiveAlarmPayload,
} from './components/ExplosionAlarmModal';

function formatClockHM(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function formatClockHMS(date: Date): string {
  return `${formatClockHM(date)}:${String(date.getSeconds()).padStart(2, '0')}`;
}

function formatIndonesianDate(date: Date): string {
  return new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

export default function App() {
  const [token, setToken] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<AuthenticatedUser | null>(null);
  const [workspace, setWorkspace] = useState<SharedWorkspaceState | null>(null);

  const [selectedDay, setSelectedDay] = useState<DayKey>('today');
  const [modalOpen, setModalOpen] = useState(false);
  const [modalInitial, setModalInitial] = useState<AddScheduleInitial | null>(null);
  const [confirming, setConfirming] = useState(false);

  const [soundEnabled, setSoundEnabled] = useState(true);
  const [activeAlarm, setActiveAlarm] = useState<ActiveAlarmPayload | null>(null);
  const [nowTime, setNowTime] = useState(() => new Date());

  const firedAlarmsRef = useRef<Set<string>>(new Set());
  const freeTimeSectionRef = useRef<HTMLElement | null>(null);
  const prevBothConfirmedRef = useRef<boolean>(false);
  const latestRevisionRef = useRef<number>(0);
  const mutationEpochRef = useRef<number>(0);

  const applyServerState = useCallback(
    (nextState: SharedWorkspaceState, options?: { isMutation?: boolean; pollEpoch?: number }) => {
      const nextRev = nextState.revision ?? 0;
      if (options?.isMutation) {
        mutationEpochRef.current += 1;
        latestRevisionRef.current = Math.max(latestRevisionRef.current, nextRev);
        setWorkspace(nextState);
        return;
      }

      if (
        options?.pollEpoch !== undefined &&
        options.pollEpoch !== mutationEpochRef.current
      ) {
        return;
      }
      if (nextRev < latestRevisionRef.current) {
        return;
      }
      latestRevisionRef.current = nextRev;
      setWorkspace(nextState);
    },
    []
  );

  // Live clock tick every 1 second for real-time display & exact alarm triggering
  useEffect(() => {
    const id = window.setInterval(() => {
      setNowTime(new Date());
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

  // HTTP polling sync every 2.5s (compatible with Vercel Serverless Functions)
  useEffect(() => {
    if (!token) return;

    let disposed = false;
    let inFlight = false;

    const syncState = async () => {
      if (disposed || inFlight) return;
      inFlight = true;
      const pollEpoch = mutationEpochRef.current;
      try {
        const res = await fetch('/api/state', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (disposed) return;
        if (res.status === 401) {
          setToken(null);
          setCurrentUser(null);
          setWorkspace(null);
          return;
        }
        if (res.ok) {
          const data = (await res.json()) as { state?: SharedWorkspaceState };
          if (data.state) {
            applyServerState(data.state, { pollEpoch });
          }
        }
      } catch {
        // Retry on next poll interval.
      } finally {
        inFlight = false;
      }
    };

    const intervalId = window.setInterval(() => {
      void syncState();
    }, 2500);

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        void syncState();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      disposed = true;
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [token, applyServerState]);

  // Trigger explosion alarm automatically when live clock matches a "today" schedule startTime
  useEffect(() => {
    if (!workspace || !currentUser) return;

    const currentHHMM = formatClockHM(nowTime);
    const todayKey = nowTime.toDateString();

    const matchingItem = workspace.schedules.find((item) => {
      if (item.day !== 'today') return false;
      if (item.startTime !== currentHHMM) return false;
      const fireKey = `${item.id}:${todayKey}:${currentHHMM}`;
      if (firedAlarmsRef.current.has(fireKey)) return false;
      return true;
    });

    if (matchingItem) {
      const fireKey = `${matchingItem.id}:${todayKey}:${currentHHMM}`;
      firedAlarmsRef.current.add(fireKey);
      setActiveAlarm({
        item: matchingItem,
        partner1Name: workspace.partners.partner1.name,
        partner2Name: workspace.partners.partner2.name,
        soundEnabled,
      });
    }
  }, [nowTime, workspace, currentUser, soundEnabled]);

  const bothConfirmed = useMemo(() => {
    if (!workspace) return false;
    const dayConf = workspace.confirmedPersonal[selectedDay];
    return Boolean(dayConf?.partner1 && dayConf?.partner2);
  }, [workspace, selectedDay]);

  // Guide users straight to free-time / Quality Time section once both partners confirm
  useEffect(() => {
    if (bothConfirmed && !prevBothConfirmedRef.current) {
      freeTimeSectionRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
    prevBothConfirmedRef.current = bothConfirmed;
  }, [bothConfirmed]);

  const apiFetch = useCallback(
    async (url: string, init?: RequestInit) => {
      if (!token) throw new Error('Belum login');
      const res = await fetch(url, {
        ...init,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          ...(init?.headers ?? {}),
        },
      });
      if (res.status === 401) {
        setToken(null);
        setCurrentUser(null);
        setWorkspace(null);
      }
      return res;
    },
    [token]
  );

  const handleLoginSuccess = (payload: {
    token: string;
    user: AuthenticatedUser;
    state: SharedWorkspaceState;
  }) => {
    latestRevisionRef.current = payload.state.revision ?? 0;
    mutationEpochRef.current = 0;
    setToken(payload.token);
    setCurrentUser(payload.user);
    setWorkspace(payload.state);
  };

  const handleLogout = async () => {
    try {
      await apiFetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // Clear local session regardless.
    }
    latestRevisionRef.current = 0;
    mutationEpochRef.current = 0;
    setToken(null);
    setCurrentUser(null);
    setWorkspace(null);
  };

  const openAddModal = (initial: Partial<AddScheduleInitial>) => {
    if (!currentUser) return;
    const requestedOwner = initial.owner ?? currentUser.slot;
    const safeOwner: ScheduleOwner =
      requestedOwner === 'together' && bothConfirmed
        ? 'together'
        : currentUser.slot;

    setModalInitial({
      day: initial.day ?? selectedDay,
      owner: safeOwner,
      title: initial.title,
      category: initial.category,
      startTime: initial.startTime,
      endTime: initial.endTime,
    });
    setModalOpen(true);
  };

  const handleSaveSchedule = async (payload: {
    day: DayKey;
    owner: ScheduleOwner;
    title: string;
    category: ActivityCategory;
    startTime: string;
    endTime: string;
  }): Promise<string | null> => {
    try {
      mutationEpochRef.current += 1;
      const res = await apiFetch('/api/schedules', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      const raw = await res.text();
      let data: { error?: string; state?: SharedWorkspaceState } | null = null;
      try {
        data = JSON.parse(raw);
      } catch {
        data = null;
      }
      if (!data) {
        return `Server tidak merespons dengan benar (HTTP ${res.status}).`;
      }
      if (!res.ok) return data.error || 'Gagal menyimpan jadwal.';
      if (data.state) applyServerState(data.state, { isMutation: true });
      return null;
    } catch {
      return 'Koneksi ke server bermasalah.';
    }
  };

  const handleDeleteSchedule = async (id: string) => {
    try {
      mutationEpochRef.current += 1;
      const res = await apiFetch(`/api/schedules/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (res.ok && data.state) applyServerState(data.state, { isMutation: true });
    } catch {
      // Ignored; next poll reconciles.
    }
  };

  const handleToggleConfirm = async (nextVal: boolean) => {
    setConfirming(true);
    try {
      mutationEpochRef.current += 1;
      const res = await apiFetch('/api/schedules/confirm', {
        method: 'POST',
        body: JSON.stringify({ day: selectedDay, confirmed: nextVal }),
      });
      const data = await res.json();
      if (res.ok && data.state) applyServerState(data.state, { isMutation: true });
    } catch {
      // Ignore transient error.
    } finally {
      setConfirming(false);
    }
  };

  const handleAddSpinOption = async (label: string): Promise<string | null> => {
    try {
      mutationEpochRef.current += 1;
      const res = await apiFetch('/api/spinner/options', {
        method: 'POST',
        body: JSON.stringify({ label, day: selectedDay }),
      });
      const data = await res.json();
      if (!res.ok) return data.error || 'Gagal menambah pilihan.';
      if (data.state) applyServerState(data.state, { isMutation: true });
      return null;
    } catch {
      return 'Koneksi bermasalah.';
    }
  };

  const handleDeleteSpinOption = async (id: string) => {
    try {
      mutationEpochRef.current += 1;
      const res = await apiFetch(
        `/api/spinner/options/${encodeURIComponent(id)}?day=${selectedDay}`,
        {
          method: 'DELETE',
        }
      );
      const data = await res.json();
      if (res.ok && data.state) applyServerState(data.state, { isMutation: true });
    } catch {
      // Ignore transient error.
    }
  };

  const handleTriggerSpin = async (): Promise<SpinEvent | null> => {
    try {
      mutationEpochRef.current += 1;
      const res = await apiFetch('/api/spinner/spin', {
        method: 'POST',
        body: JSON.stringify({ day: selectedDay }),
      });
      const data = await res.json();
      if (res.ok && data.state) {
        applyServerState(data.state, { isMutation: true });
        return data.spinEvent as SpinEvent;
      }
      return null;
    } catch {
      return null;
    }
  };

  const handleInsertSpinWinner = async (
    winnerLabel: string,
    startTime: string,
    endTime: string
  ): Promise<string | null> => {
    return handleSaveSchedule({
      day: selectedDay,
      owner: 'together',
      title: winnerLabel,
      category: 'quality_time',
      startTime,
      endTime,
    });
  };

  const handleTestAlarm = () => {
    if (!workspace || !currentUser) return;
    const todayItems = workspace.schedules.filter((s) => s.day === 'today');
    const sample: ScheduleItem = todayItems[0] ?? {
      id: 'preview-alarm',
      day: selectedDay,
      owner: 'together',
      title: 'Quality Time Berdua',
      category: 'quality_time',
      startTime: formatClockHM(nowTime),
      endTime: '21:00',
      createdBy: currentUser.name,
      createdAt: Date.now(),
    };
    setActiveAlarm({
      item: sample,
      partner1Name: workspace.partners.partner1.name,
      partner2Name: workspace.partners.partner2.name,
      soundEnabled,
    });
  };

  const freeSlots = useMemo(() => {
    if (!workspace) return [];
    return computeMutualFreeSlots(workspace.schedules, selectedDay);
  }, [workspace, selectedDay]);

  // Find next upcoming today schedule for live-clock alarm indicator
  const nextTodayAlarm = useMemo(() => {
    if (!workspace) return null;
    const nowMin = nowTime.getHours() * 60 + nowTime.getMinutes();
    const upcoming = workspace.schedules
      .filter((s) => s.day === 'today' && timeToMinutes(s.startTime) >= nowMin)
      .sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));
    return upcoming[0] ?? null;
  }, [workspace, nowTime]);

  if (!token || !currentUser || !workspace) {
    return <LoginGate onLoginSuccess={handleLoginSuccess} />;
  }

  const { partner1, partner2 } = workspace.partners;
  const dayConf = workspace.confirmedPersonal[selectedDay];
  const ownConfirmed = dayConf[currentUser.slot];

  return (
    <div className="min-h-screen bg-[#0B0B0F] text-[#FAF5F7]">
      {/* Strict 3-zone Top Navigation Bar */}
      <header className="sticky top-0 z-30 bg-[#0B0B0F]/90 backdrop-blur-md border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-8">
          <a
            href="#top"
            className="font-display text-lg font-bold tracking-tight text-white whitespace-nowrap shrink-0"
          >
            VnB Schedules
          </a>

          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-zinc-400">
            <a
              href="#jadwal"
              className="hover:text-pink-300 transition-colors whitespace-nowrap shrink-0"
            >
              Jadwal Berdua
            </a>
            <a
              href="#jam-kosong"
              className="hover:text-pink-300 transition-colors whitespace-nowrap shrink-0"
            >
              Jam Kosong
            </a>
            <a
              href="#spin-kegiatan"
              className="hover:text-pink-300 transition-colors whitespace-nowrap shrink-0"
            >
              Spin Kegiatan
            </a>
          </nav>

          <div className="shrink-0">
            <button
              type="button"
              onClick={() => openAddModal({ owner: currentUser.slot, day: selectedDay })}
              className="min-h-[40px] px-4 py-2 rounded-xl bg-pink-500 hover:bg-pink-400 text-zinc-950 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Isi Jadwal {currentUser.name}</span>
            </button>
          </div>
        </div>
      </header>

      <main id="top" className="max-w-7xl mx-auto px-4 sm:px-6 py-7 space-y-8">
        {/* Hero, Live Clock & Couple Illustration */}
        <section className="rounded-2xl bg-[#14141B] border border-white/10 p-6 sm:p-7 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          <div className="lg:col-span-6 space-y-5">
            <div className="space-y-2">
              <p className="text-xs font-medium text-pink-300">
                Masuk sebagai {currentUser.name} · {formatIndonesianDate(nowTime)}
              </p>
              <h1 className="font-display text-2xl sm:text-3xl font-bold text-white text-balance">
                Jadwal {partner1.name} & {partner2.name}
              </h1>
              <p className="text-sm text-zinc-400 leading-relaxed max-w-lg">
                Isi jadwal masing-masing dulu lalu konfirmasi selesai, setelah itu pilih jam kosong buat quality time berdua.
              </p>
            </div>

            {/* Live Digital Clock + Auto-Alarm Status */}
            <div className="rounded-xl bg-[#0E0E13] border border-pink-400/20 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[11px] text-zinc-400">Jam Sekarang (Auto-Alarm)</p>
                <p className="font-mono-tabular text-2xl sm:text-3xl font-bold text-white tracking-tight">
                  {formatClockHMS(nowTime)}
                </p>
              </div>
              <div className="text-left sm:text-right">
                <p className="text-[11px] text-pink-300 font-medium">
                  {nextTodayAlarm
                    ? `Alarm berikutnya · ${nextTodayAlarm.startTime}`
                    : 'Belum ada alarm jadwal hari ini'}
                </p>
                <p className="text-xs text-zinc-400 truncate max-w-[210px]">
                  {nextTodayAlarm
                    ? nextTodayAlarm.title
                    : 'Otomatis nyala saat jam sesuai jadwal'}
                </p>
              </div>
            </div>

            {/* Workspace Toolbar */}
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Day Segmented Switcher */}
              <div className="inline-flex p-1 rounded-xl bg-[#0B0B0F] border border-white/10">
                <button
                  type="button"
                  onClick={() => setSelectedDay('today')}
                  className={`min-h-[36px] px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                    selectedDay === 'today'
                      ? 'bg-pink-500 text-zinc-950'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  Hari Ini
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedDay('tomorrow')}
                  className={`min-h-[36px] px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                    selectedDay === 'tomorrow'
                      ? 'bg-pink-500 text-zinc-950'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  Besok
                </button>
              </div>

              <button
                type="button"
                onClick={handleTestAlarm}
                className="min-h-[44px] px-3.5 py-2 rounded-xl bg-[#1D1D27] hover:bg-pink-500/15 border border-white/10 hover:border-pink-400/40 text-xs font-medium text-pink-200 inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
              >
                <BellRing className="w-3.5 h-3.5 text-pink-400" />
                <span>Tes Efek Alarm</span>
              </button>

              <button
                type="button"
                onClick={() => setSoundEnabled((v) => !v)}
                aria-label={soundEnabled ? 'Matikan suara alarm' : 'Nyalakan suara alarm'}
                className="min-h-[44px] px-3 py-2 rounded-xl bg-[#1D1D27] border border-white/10 text-xs font-medium text-zinc-300 hover:text-white inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
              >
                {soundEnabled ? (
                  <Volume2 className="w-3.5 h-3.5 text-pink-300" />
                ) : (
                  <VolumeX className="w-3.5 h-3.5 text-zinc-500" />
                )}
                <span>{soundEnabled ? 'Suara Nyala' : 'Bisu'}</span>
              </button>

              <button
                type="button"
                onClick={handleLogout}
                className="min-h-[44px] px-3 py-2 rounded-xl border border-white/10 text-xs font-medium text-zinc-400 hover:text-white hover:bg-white/5 inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Ganti Akun</span>
              </button>
            </div>
          </div>

          <div className="lg:col-span-6">
            <CoupleIllustration
              partner1Name={partner1.name}
              partner2Name={partner2.name}
              compact
            />
          </div>
        </section>

        {/* Unified 1-View Dual Partner + Shared Schedule Columns */}
        <section id="jadwal" className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="font-display text-xl font-bold text-white">
                Langkah 1 · Isi & Konfirmasi Jadwal Pribadi ({selectedDay === 'today' ? 'Hari Ini' : 'Besok'})
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                {bothConfirmed
                  ? 'Kalian berdua sudah konfirmasi! Sekarang lanjut isi Quality Time di jam kosong.'
                  : ownConfirmed
                    ? 'Kamu sudah konfirmasi selesai. Menunggu pasanganmu konfirmasi jadwalnya.'
                    : `Isi jadwal ${currentUser.name} terlebih dahulu, lalu tekan "Konfirmasi Selesai Isi Jadwal".`}
              </p>
            </div>
            <p className="text-xs text-zinc-500">
              Sinkronisasi langsung aktif
            </p>
          </div>

          <ScheduleTable24h
            selectedDay={selectedDay}
            currentHour={nowTime.getHours()}
            currentUser={currentUser}
            partner1={partner1}
            partner2={partner2}
            schedules={workspace.schedules}
            dayConf={dayConf}
            bothConfirmed={bothConfirmed}
            confirming={confirming}
            onAddAtHour={(owner, startTime, endTime) =>
              openAddModal({
                owner,
                day: selectedDay,
                startTime,
                endTime,
                category: owner === 'together' ? 'quality_time' : 'kuliah',
              })
            }
            onDeleteItem={handleDeleteSchedule}
            onToggleConfirm={handleToggleConfirm}
            onPreviewAlarm={(item) =>
              setActiveAlarm({
                item,
                partner1Name: partner1.name,
                partner2Name: partner2.name,
                soundEnabled,
              })
            }
          />
        </section>

        {/* Step 2: Mutual Free Time Recommendations Strip */}
        <section
          ref={freeTimeSectionRef}
          id="jam-kosong"
          className={`rounded-2xl border p-5 sm:p-6 space-y-4 transition-colors ${
            bothConfirmed
              ? 'bg-[#17121A] border-pink-400/50'
              : 'bg-[#14141B] border-white/10'
          }`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              {bothConfirmed ? (
                <CheckCircle2 className="w-4 h-4 text-pink-400 shrink-0" />
              ) : (
                <Clock className="w-4 h-4 text-pink-400 shrink-0" />
              )}
              <h2 className="font-display text-base sm:text-lg font-bold text-white">
                Langkah 2 · Rekomendasi Jam Kosong Bareng ({selectedDay === 'today' ? 'Hari Ini' : 'Besok'})
              </h2>
            </div>
            <p className="text-xs text-zinc-400">
              {bothConfirmed
                ? 'Sudah siap! Pilih salah satu jam kosong di bawah untuk Quality Time bareng.'
                : `Menunggu konfirmasi selesai dari ${!dayConf.partner1 && !dayConf.partner2 ? `${partner1.name} & ${partner2.name}` : !dayConf.partner1 ? partner1.name : partner2.name}`}
            </p>
          </div>

          {freeSlots.length === 0 ? (
            <p className="text-sm text-zinc-400 py-2">
              Jadwal kalian di hari ini penuh semua. Coba cek tab Besok atau ubah jadwal yang bentrok.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {freeSlots.map((slot) => (
                <div
                  key={`${slot.startTime}-${slot.endTime}`}
                  className="rounded-xl bg-[#0E0E13] border border-white/10 p-3.5 flex flex-col justify-between gap-3"
                >
                  <div>
                    <p className="font-mono-tabular text-sm font-semibold text-white">
                      {slot.startTime} – {slot.endTime}
                    </p>
                    <p className="text-xs text-pink-300 mt-0.5">
                      Kosong {formatDuration(slot.durationMinutes)}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={!bothConfirmed}
                    onClick={() =>
                      openAddModal({
                        day: selectedDay,
                        owner: 'together',
                        category: 'quality_time',
                        startTime: slot.startTime,
                        endTime: slot.endTime,
                      })
                    }
                    className={`min-h-[38px] w-full px-3 py-1.5 rounded-lg border text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-colors ${
                      bothConfirmed
                        ? 'bg-pink-500 hover:bg-pink-400 border-pink-400 text-zinc-950 cursor-pointer'
                        : 'bg-[#181822] border-white/10 text-zinc-500 cursor-not-allowed'
                    }`}
                  >
                    <CalendarHeart className="w-3.5 h-3.5" />
                    <span>{bothConfirmed ? 'Isi Quality Time' : 'Konfirmasi Dulu'}</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Spinner Section */}
        <ActivitySpinner
          options={workspace.spinnerOptions}
          lastSpin={workspace.lastSpin}
          selectedDay={selectedDay}
          freeSlots={freeSlots}
          canBookQualityTime={bothConfirmed}
          onAddOption={handleAddSpinOption}
          onDeleteOption={handleDeleteSpinOption}
          onTriggerSpin={handleTriggerSpin}
          onInsertWinnerToSlot={handleInsertSpinWinner}
        />
      </main>

      <footer className="max-w-7xl mx-auto px-4 sm:px-6 py-8 border-t border-white/[0.06] text-xs text-zinc-500 flex flex-col sm:flex-row items-center justify-between gap-2">
        <span>VnB Schedules · Dibuat khusus untuk jadwal berdua</span>
        <span>{partner1.name} & {partner2.name}</span>
      </footer>

      <AddScheduleModal
        open={modalOpen}
        initial={modalInitial}
        currentUser={currentUser}
        confirmedPersonal={workspace.confirmedPersonal}
        onClose={() => setModalOpen(false)}
        onSave={handleSaveSchedule}
      />

      <ExplosionAlarmModal
        alarm={activeAlarm}
        onDismiss={() => setActiveAlarm(null)}
      />
    </div>
  );
}
