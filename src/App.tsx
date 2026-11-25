import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  BellRing,
  CalendarHeart,
  CheckCircle2,
  Clock,
  LogOut,
  Plus,
  UserCheck,
  Volume2,
  VolumeX,
} from 'lucide-react';
import type {
  ActivityCategory,
  AuthenticatedUser,
  DayKey,
  EditableDayKey,
  ScheduleItem,
  ScheduleOwner,
  SharedWorkspaceState,
  SpinEvent,
} from './types';
import {
  addDaysToDate,
  computeDetailedFreeSlots,
  formatDuration,
  formatLocalDateISO,
  formatShortIndonesianDate,
  timeToMinutes,
} from './utils/freeTime';
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
  const [checkingSession, setCheckingSession] = useState(true);

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

  // Live calendar dates derived directly from the live clock so rollover happens automatically at 00:00:00
  const todayDate = formatLocalDateISO(nowTime);
  const yesterdayDate = formatLocalDateISO(addDaysToDate(nowTime, -1));
  const tomorrowDate = formatLocalDateISO(addDaysToDate(nowTime, 1));

  const targetDate =
    selectedDay === 'yesterday'
      ? yesterdayDate
      : selectedDay === 'tomorrow'
        ? tomorrowDate
        : todayDate;

  const isReadOnly = selectedDay === 'yesterday';
  const targetDateShort = formatShortIndonesianDate(targetDate);
  const targetDayDisplay =
    selectedDay === 'yesterday'
      ? `Kemarin (${targetDateShort})`
      : selectedDay === 'today'
        ? `Hari Ini (${targetDateShort})`
        : `Besok (${targetDateShort})`;

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

  // Restore session from HttpOnly cookie on page refresh
  useEffect(() => {
    let active = true;
    fetch('/api/auth/session', {
      credentials: 'same-origin',
    })
      .then((r) => (r.ok ? r.json() : null))
      .then(
        (
          data: {
            authenticated?: boolean;
            token?: string;
            user?: AuthenticatedUser;
            state?: SharedWorkspaceState;
          } | null
        ) => {
          if (!active) return;
          if (data?.authenticated && data.user && data.state) {
            latestRevisionRef.current = data.state.revision ?? 0;
            mutationEpochRef.current = 0;
            setToken(data.token ?? 'cookie-session');
            setCurrentUser(data.user);
            setWorkspace(data.state);
          }
        }
      )
      .catch(() => {
        // Show login screen if session check fails.
      })
      .finally(() => {
        if (active) setCheckingSession(false);
      });

    return () => {
      active = false;
    };
  }, []);

  // Live clock tick every 1 second for real-time display, midnight day rollover & exact alarm triggering
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
        const headers: Record<string, string> = {
          'X-Requested-With': 'XMLHttpRequest',
        };
        if (token !== 'cookie-session') {
          headers.Authorization = `Bearer ${token}`;
        }
        const res = await fetch('/api/state', {
          credentials: 'same-origin',
          headers,
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

  // Trigger explosion alarm automatically when live clock matches a today calendar-date schedule
  useEffect(() => {
    if (!workspace || !currentUser) return;

    const currentHHMM = formatClockHM(nowTime);

    const matchingItem = workspace.schedules.find((item) => {
      if (item.date !== todayDate) return false;
      if (item.startTime !== currentHHMM) return false;
      const fireKey = `${item.id}:${todayDate}:${currentHHMM}`;
      if (firedAlarmsRef.current.has(fireKey)) return false;
      return true;
    });

    if (matchingItem) {
      const fireKey = `${matchingItem.id}:${todayDate}:${currentHHMM}`;
      firedAlarmsRef.current.add(fireKey);
      setActiveAlarm({
        item: matchingItem,
        partner1Name: workspace.partners.partner1.name,
        partner2Name: workspace.partners.partner2.name,
        soundEnabled,
      });
    }
  }, [nowTime, todayDate, workspace, currentUser, soundEnabled]);

  const dayConf = useMemo(() => {
    if (!workspace) return { partner1: false, partner2: false };
    return (
      workspace.confirmedByDate?.[targetDate] ?? {
        partner1: false,
        partner2: false,
      }
    );
  }, [workspace, targetDate]);

  const bothConfirmed = Boolean(dayConf.partner1 && dayConf.partner2);

  // Guide users straight to free-time / Quality Time section once both partners confirm
  useEffect(() => {
    if (!isReadOnly && bothConfirmed && !prevBothConfirmedRef.current) {
      freeTimeSectionRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
    prevBothConfirmedRef.current = !isReadOnly && bothConfirmed;
  }, [bothConfirmed, isReadOnly]);

  const apiFetch = useCallback(
    async (url: string, init?: RequestInit) => {
      if (!token) throw new Error('Belum login');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
      };
      if (token !== 'cookie-session') {
        headers.Authorization = `Bearer ${token}`;
      }
      const res = await fetch(url, {
        ...init,
        credentials: 'same-origin',
        headers: {
          ...headers,
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
    if (!currentUser || isReadOnly) return;
    const requestedOwner = initial.owner ?? currentUser.slot;
    const safeDay: EditableDayKey =
      initial.day ?? (selectedDay === 'tomorrow' ? 'tomorrow' : 'today');
    const safeDate = safeDay === 'today' ? todayDate : tomorrowDate;
    const safeConf = workspace?.confirmedByDate?.[safeDate];
    const canTogether = Boolean(safeConf?.partner1 && safeConf?.partner2);
    const safeOwner: ScheduleOwner =
      requestedOwner === 'together' && canTogether
        ? 'together'
        : currentUser.slot;

    setModalInitial({
      day: safeDay,
      owner: safeOwner,
      title: initial.title,
      category: initial.category,
      startTime: initial.startTime,
      endTime: initial.endTime,
    });
    setModalOpen(true);
  };

  const handleSaveSchedule = async (payload: {
    date: string;
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
        body: JSON.stringify({ ...payload, clientToday: todayDate }),
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
    if (isReadOnly) return;
    try {
      mutationEpochRef.current += 1;
      const res = await apiFetch(
        `/api/schedules/${encodeURIComponent(id)}?clientToday=${encodeURIComponent(todayDate)}`,
        {
          method: 'DELETE',
        }
      );
      const data = await res.json();
      if (res.ok && data.state) applyServerState(data.state, { isMutation: true });
    } catch {
      // Ignored; next poll reconciles.
    }
  };

  const handleToggleConfirm = async (nextVal: boolean) => {
    if (isReadOnly) return;
    setConfirming(true);
    try {
      mutationEpochRef.current += 1;
      const res = await apiFetch('/api/schedules/confirm', {
        method: 'POST',
        body: JSON.stringify({
          date: targetDate,
          clientToday: todayDate,
          confirmed: nextVal,
        }),
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
    if (isReadOnly) return 'Riwayat kemarin tidak bisa diubah.';
    try {
      mutationEpochRef.current += 1;
      const res = await apiFetch('/api/spinner/options', {
        method: 'POST',
        body: JSON.stringify({ label, date: targetDate }),
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
    if (isReadOnly) return;
    try {
      mutationEpochRef.current += 1;
      const res = await apiFetch(
        `/api/spinner/options/${encodeURIComponent(id)}?date=${encodeURIComponent(targetDate)}`,
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
    if (isReadOnly) return null;
    try {
      mutationEpochRef.current += 1;
      const res = await apiFetch('/api/spinner/spin', {
        method: 'POST',
        body: JSON.stringify({ date: targetDate, clientToday: todayDate }),
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
    if (isReadOnly) return 'Riwayat kemarin tidak bisa diubah.';
    return handleSaveSchedule({
      date: targetDate,
      owner: 'together',
      title: winnerLabel,
      category: 'quality_time',
      startTime,
      endTime,
    });
  };

  const handleTestAlarm = () => {
    if (!workspace || !currentUser) return;
    const todayItems = workspace.schedules.filter((s) => s.date === todayDate);
    const sample: ScheduleItem = todayItems[0] ?? {
      id: 'preview-alarm',
      date: todayDate,
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

  const detailedFreeSlots = useMemo(() => {
    if (!workspace) return [];
    return computeDetailedFreeSlots(workspace.schedules, targetDate);
  }, [workspace, targetDate]);

  const mutualFreeSlots = useMemo(
    () => detailedFreeSlots.filter((s) => s.freeFor === 'both'),
    [detailedFreeSlots]
  );

  // Find next upcoming today schedule for live-clock alarm indicator
  const nextTodayAlarm = useMemo(() => {
    if (!workspace) return null;
    const nowMin = nowTime.getHours() * 60 + nowTime.getMinutes();
    const upcoming = workspace.schedules
      .filter((s) => s.date === todayDate && timeToMinutes(s.startTime) >= nowMin)
      .sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));
    return upcoming[0] ?? null;
  }, [workspace, todayDate, nowTime]);

  if (checkingSession) {
    return (
      <div className="min-h-screen bg-[#0B0B0F] text-[#FAF5F7] flex items-center justify-center p-6">
        <div className="text-center space-y-2">
          <p className="font-display text-xl font-bold text-white">VnB Schedules</p>
          <p className="text-sm text-pink-300">Memuat jadwal kalian...</p>
        </div>
      </div>
    );
  }

  if (!token || !currentUser || !workspace) {
    return <LoginGate onLoginSuccess={handleLoginSuccess} />;
  }

  const { partner1, partner2 } = workspace.partners;
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
            {isReadOnly ? (
              <button
                type="button"
                onClick={() => setSelectedDay('today')}
                className="min-h-[40px] px-4 py-2 rounded-xl border border-pink-400/35 bg-pink-500/10 hover:bg-pink-500/20 text-pink-200 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                <span>Kembali ke Hari Ini</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() =>
                  openAddModal({
                    owner: currentUser.slot,
                    day: selectedDay === 'tomorrow' ? 'tomorrow' : 'today',
                  })
                }
                className="min-h-[40px] px-4 py-2 rounded-xl bg-pink-500 hover:bg-pink-400 text-zinc-950 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>Isi Jadwal {currentUser.name}</span>
              </button>
            )}
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
              {/* 3-Day Segmented Switcher: Kemarin (Riwayat) | Hari Ini | Besok */}
              <div className="inline-flex p-1 rounded-xl bg-[#0B0B0F] border border-white/10">
                <button
                  type="button"
                  onClick={() => setSelectedDay('yesterday')}
                  className={`min-h-[36px] px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                    selectedDay === 'yesterday'
                      ? 'bg-pink-500 text-zinc-950'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  Kemarin ({formatShortIndonesianDate(yesterdayDate)})
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedDay('today')}
                  className={`min-h-[36px] px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                    selectedDay === 'today'
                      ? 'bg-pink-500 text-zinc-950'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  Hari Ini ({formatShortIndonesianDate(todayDate)})
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedDay('tomorrow')}
                  className={`min-h-[36px] px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                    selectedDay === 'tomorrow'
                      ? 'bg-pink-500 text-zinc-950'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  Besok ({formatShortIndonesianDate(tomorrowDate)})
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
                Langkah 1 · {isReadOnly ? 'Riwayat Jadwal' : 'Isi & Konfirmasi Jadwal Pribadi'} · {targetDayDisplay}
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                {isReadOnly
                  ? 'Mode lihat riwayat kemarin. Jadwal otomatis berpindah setiap pergantian hari pukul 00:00.'
                  : bothConfirmed
                    ? 'Kalian berdua sudah konfirmasi! Sekarang lanjut isi Quality Time di jam kosong.'
                    : ownConfirmed
                      ? 'Kamu sudah konfirmasi selesai. Menunggu pasanganmu konfirmasi jadwalnya.'
                      : `Isi jadwal ${currentUser.name} terlebih dahulu, lalu tekan "Konfirmasi Selesai Isi Jadwal".`}
              </p>
            </div>
            <p className="text-xs text-zinc-500">
              {isReadOnly ? 'Arsip hanya lihat' : 'Sinkronisasi langsung aktif'}
            </p>
          </div>

          <ScheduleTable24h
            selectedDay={selectedDay}
            targetDate={targetDate}
            dateLabel={targetDateShort}
            isReadOnly={isReadOnly}
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
                day: selectedDay === 'tomorrow' ? 'tomorrow' : 'today',
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

        {/* Step 2: Labeled Free Time Recommendations */}
        <section
          ref={freeTimeSectionRef}
          id="jam-kosong"
          className={`rounded-2xl border p-5 sm:p-6 space-y-4 transition-colors ${
            !isReadOnly && bothConfirmed
              ? 'bg-[#17121A] border-pink-400/50'
              : 'bg-[#14141B] border-white/10'
          }`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              {bothConfirmed && !isReadOnly ? (
                <CheckCircle2 className="w-4 h-4 text-pink-400 shrink-0" />
              ) : (
                <Clock className="w-4 h-4 text-pink-400 shrink-0" />
              )}
              <h2 className="font-display text-base sm:text-lg font-bold text-white">
                Langkah 2 · Rekomendasi Jam Kosong · {targetDayDisplay}
              </h2>
            </div>
            <p className="text-xs text-zinc-400">
              {isReadOnly
                ? 'Menampilkan catatan jam kosong di hari kemarin (hanya lihat).'
                : bothConfirmed
                  ? 'Sudah siap! Jam kosong berdua bisa langsung diisi Quality Time.'
                  : `Menunggu konfirmasi selesai dari ${!dayConf.partner1 && !dayConf.partner2 ? `${partner1.name} & ${partner2.name}` : !dayConf.partner1 ? partner1.name : partner2.name}`}
            </p>
          </div>

          {detailedFreeSlots.length === 0 ? (
            <p className="text-sm text-zinc-400 py-2">
              Tidak ada jeda kosong minimal 30 menit di {targetDayDisplay}.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {detailedFreeSlots.map((slot) => {
                const isBoth = slot.freeFor === 'both';
                const freeOwnerLabel =
                  slot.freeFor === 'both'
                    ? `Kosong berdua · ${partner1.name} & ${partner2.name}`
                    : slot.freeFor === 'partner1'
                      ? `Kosong milik ${partner1.name} saja`
                      : `Kosong milik ${partner2.name} saja`;
                const ownerSubNote =
                  slot.freeFor === 'both'
                    ? `Kosong ${formatDuration(slot.durationMinutes)}`
                    : slot.freeFor === 'partner1'
                      ? `${formatDuration(slot.durationMinutes)} · ${partner2.name} lagi ada kegiatan`
                      : `${formatDuration(slot.durationMinutes)} · ${partner1.name} lagi ada kegiatan`;
                const isCurrentUserSoloFree =
                  slot.freeFor === currentUser.slot;

                return (
                  <div
                    key={`${slot.startTime}-${slot.endTime}-${slot.freeFor}`}
                    className={`rounded-xl border p-3.5 flex flex-col justify-between gap-3 ${
                      isBoth
                        ? 'bg-[#15111A] border-pink-400/35'
                        : 'bg-[#0E0E13] border-white/10'
                    }`}
                  >
                    <div className="space-y-1">
                      <p
                        className={`text-[11px] font-semibold leading-snug ${
                          isBoth ? 'text-pink-300' : 'text-zinc-300'
                        }`}
                      >
                        {freeOwnerLabel}
                      </p>
                      <p className="font-mono-tabular text-sm font-semibold text-white">
                        {slot.startTime} – {slot.endTime}
                      </p>
                      <p className="text-xs text-zinc-400">{ownerSubNote}</p>
                    </div>

                    {isReadOnly ? (
                      <div className="min-h-[36px] px-3 py-1.5 rounded-lg bg-[#16161F] border border-white/5 text-xs text-zinc-500 flex items-center justify-center">
                        Riwayat · Hanya Lihat
                      </div>
                    ) : isBoth ? (
                      <button
                        type="button"
                        disabled={!bothConfirmed}
                        onClick={() =>
                          openAddModal({
                            day: selectedDay === 'tomorrow' ? 'tomorrow' : 'today',
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
                    ) : isCurrentUserSoloFree ? (
                      <button
                        type="button"
                        onClick={() =>
                          openAddModal({
                            day: selectedDay === 'tomorrow' ? 'tomorrow' : 'today',
                            owner: currentUser.slot,
                            category: 'kuliah',
                            startTime: slot.startTime,
                            endTime: slot.endTime,
                          })
                        }
                        className="min-h-[38px] w-full px-3 py-1.5 rounded-lg border border-white/15 bg-[#181822] hover:border-pink-400/40 hover:text-pink-200 text-zinc-200 text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <UserCheck className="w-3.5 h-3.5 text-pink-300" />
                        <span>Isi Jadwal {currentUser.name}</span>
                      </button>
                    ) : (
                      <div className="min-h-[38px] px-3 py-1.5 rounded-lg bg-[#14141B] border border-white/10 text-xs text-zinc-500 flex items-center justify-center text-center">
                        Bukan jam kosongmu
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Spinner Section */}
        <ActivitySpinner
          options={workspace.spinnerOptions}
          lastSpin={workspace.lastSpin}
          selectedDay={selectedDay}
          dateLabel={targetDateShort}
          isReadOnly={isReadOnly}
          freeSlots={mutualFreeSlots}
          canBookQualityTime={!isReadOnly && bothConfirmed}
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
        todayDate={todayDate}
        tomorrowDate={tomorrowDate}
        confirmedByDate={workspace.confirmedByDate ?? {}}
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
