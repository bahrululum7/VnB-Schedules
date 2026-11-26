import { useEffect, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import {
  Apple,
  Backpack,
  Bath,
  BedDouble,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Coins,
  Droplets,
  Edit3,
  Gamepad2,
  Gift,
  Heart,
  Home,
  Package,
  RefreshCw,
  ShoppingBag,
  Sparkles,
  Sprout,
  Store,
  Sun,
  Ticket,
  Trophy,
  Utensils,
  Zap,
} from 'lucide-react';
import type { BearSnackId, PetGameState } from '../types';
import {
  BATH_COOLDOWN_MS,
  FEED_COOLDOWN_MS,
  FRUIT_SELL_COINS,
  LEVEL_UP_MIN_HAPPINESS,
  MAX_FRUIT_GRAMS,
  MAX_WATERINGS_PER_DAY,
  PLAY_COOLDOWN_MS,
  SNACK_CATALOG,
  TREE_WATER_COOLDOWN_MS,
  formatRemainingDuration,
} from '../utils/petGameEngine';
import { playPopSound } from '../utils/sound';
import { BearVisualSvg, type BearActionEffect } from './BearVisualSvg';
import { FruitTreeSvg } from './FruitTreeSvg';
import { NpcShopVisualSvg } from './NpcShopVisualSvg';
import { ExternalGameAsset } from './ExternalGameAsset';
import roomDayBg from '../assets/images/bear_room_day_bg_1795714289729.jpg';
import roomNightBg from '../assets/images/bear_room_night_bg_1795714289676.jpg';
import gardenBg from '../assets/images/bear_garden_bg_1795714291191.jpg';
import shopBg from '../assets/images/bear_shop_bg_1795714291119.jpg';

interface BearPetGamePageProps {
  game: PetGameState;
  todayDate: string;
  currentUserName: string;
  soundEnabled: boolean;
  onAction: (payload: {
    action: string;
    snackId?: BearSnackId;
    rewardId?: string;
    name?: string;
  }) => Promise<{
    ok: boolean;
    message?: string;
    error?: string;
    milestoneTriggered?: { level: number; rewardTitle: string } | null;
  }>;
}

const ROOMS = [
  { id: 'room', label: 'Kamar', icon: Home },
  { id: 'garden', label: 'Kebun', icon: Sprout },
  { id: 'inventory', label: 'Keranjang', icon: Backpack },
  { id: 'shop', label: 'Toko NPC', icon: Store },
] as const;

const STAGE_TITLES = {
  baby: 'Bayi Beruang',
  teen: 'Beruang Remaja',
  adult: 'Beruang Dewasa',
} as const;

const SNACK_OPENMOJI: Record<BearSnackId, { hex: string; fallback: string }> = {
  berry: { hex: '1F353', fallback: '🍓' },
  bread: { hex: '1F35E', fallback: '🍞' },
  honey: { hex: '1F36F', fallback: '🍯' },
  salmon: { hex: '1F41F', fallback: '🐟' },
};

export function BearPetGamePage({
  game,
  todayDate,
  currentUserName,
  soundEnabled,
  onAction,
}: BearPetGamePageProps) {
  const [roomIndex, setRoomIndex] = useState(0);
  const [showSnackDrawer, setShowSnackDrawer] = useState(false);
  const [effect, setEffect] = useState<BearActionEffect>('none');
  const [isWateringAnim, setIsWateringAnim] = useState(false);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [milestoneBanner, setMilestoneBanner] = useState<{
    level: number;
    rewardTitle: string;
  } | null>(null);

  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(game.pet.name);
  const [nowMs, setNowMs] = useState(() => Date.now());

  const swipeStartXRef = useRef<number | null>(null);

  useEffect(() => {
    setNameInput(game.pet.name);
  }, [game.pet.name]);

  // Live 1-second tick for real-time cooldown countdowns & phone clock
  useEffect(() => {
    const id = window.setInterval(() => {
      setNowMs(Date.now());
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

  // Periodic sync while sleeping (server computes exact +1% energy per 1 minute)
  useEffect(() => {
    if (!game.pet.isSleeping) return;
    const id = window.setInterval(() => {
      void onAction({ action: 'sleep_tick' });
    }, 20000);
    return () => window.clearInterval(id);
  }, [game.pet.isSleeping, onAction]);

  const goPrevRoom = () => setRoomIndex((idx) => (idx === 0 ? ROOMS.length - 1 : idx - 1));
  const goNextRoom = () => setRoomIndex((idx) => (idx === ROOMS.length - 1 ? 0 : idx + 1));

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // Do not hijack button clicks
    if ((e.target as HTMLElement).closest('button, input')) {
      swipeStartXRef.current = null;
      return;
    }
    swipeStartXRef.current = e.clientX;
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (swipeStartXRef.current === null) return;
    const deltaX = e.clientX - swipeStartXRef.current;
    swipeStartXRef.current = null;
    if (Math.abs(deltaX) < 42) return;
    if (deltaX < 0) goNextRoom();
    else goPrevRoom();
  };

  const runAction = async (
    payload: { action: string; snackId?: BearSnackId; rewardId?: string; name?: string },
    visualEffect?: BearActionEffect
  ) => {
    if (busy) return;
    setBusy(true);
    setFeedback(null);
    const res = await onAction(payload);
    setBusy(false);

    if (!res.ok) {
      if (soundEnabled) playPopSound(false);
      setFeedback({ type: 'err', text: res.error || 'Aksi gagal dilakukan.' });
      return;
    }

    if (soundEnabled) playPopSound(true);
    if (res.message) {
      setFeedback({ type: 'ok', text: res.message });
    }
    if (res.milestoneTriggered) {
      setMilestoneBanner(res.milestoneTriggered);
    }

    if (visualEffect) {
      setEffect(visualEffect);
      window.setTimeout(() => setEffect('none'), 1600);
    }
    if (payload.action === 'water_tree') {
      setIsWateringAnim(true);
      window.setTimeout(() => setIsWateringAnim(false), 1600);
    }
    if (payload.action === 'feed') {
      setShowSnackDrawer(false);
    }
    if (
      payload.action === 'claim_reward' ||
      payload.action === 'harvest_tree' ||
      res.milestoneTriggered
    ) {
      try {
        confetti({
          particleCount: 75,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#EC4899', '#F472B6', '#34D399', '#FBBF24'],
        });
      } catch {
        // Ignore confetti failures in headless environments.
      }
    }
  };

  const handleRenameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await onAction({ action: 'rename', name: nameInput });
    if (res.ok) {
      setEditingName(false);
      setFeedback({ type: 'ok', text: res.message || 'Nama beruang diperbarui.' });
    } else {
      setFeedback({ type: 'err', text: res.error || 'Gagal mengganti nama.' });
    }
  };

  const { pet, tree, inventory, rewards, milestoneRewards, claimedHistory } = game;
  const roundedHappiness = Math.round(pet.happiness);
  const qualifiesForTomorrowLevelUp = roundedHappiness > LEVEL_UP_MIN_HAPPINESS;
  const nextMilestoneLevel = Math.floor(pet.level / 10) * 10 + 10;

  // Live cooldown calculations
  const feedRemainMs =
    pet.lastFedAt > 0 ? Math.max(0, FEED_COOLDOWN_MS - (nowMs - pet.lastFedAt)) : 0;
  const bathRemainMs =
    pet.lastBathedAt > 0 ? Math.max(0, BATH_COOLDOWN_MS - (nowMs - pet.lastBathedAt)) : 0;
  const playRemainMs =
    pet.lastPlayedAt > 0 ? Math.max(0, PLAY_COOLDOWN_MS - (nowMs - pet.lastPlayedAt)) : 0;
  const waterRemainMs =
    tree.wateringsToday === 1 && tree.lastWateredAt > 0
      ? Math.max(0, TREE_WATER_COOLDOWN_MS - (nowMs - tree.lastWateredAt))
      : 0;

  const fruitPct = Math.min(100, Math.round((inventory.fruitGrams / MAX_FRUIT_GRAMS) * 100));
  const fruitKgText = `${(inventory.fruitGrams / 1000).toFixed(2)} kg`;
  const phoneClockText = new Intl.DateTimeFormat('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(nowMs);

  const treeStatusLabel =
    tree.status === 'dead'
      ? 'Pohon Mati (Lupa Siram 2x)'
      : tree.status === 'wilting'
        ? 'Tanaman Melayu! Siram Segera'
        : tree.status === 'fruiting'
          ? 'Berbuah 1 kg! Siap Dipetik'
          : `Sehat · Hari ${Math.min(3, tree.cycleDay)}/3`;

  const statItems = [
    { label: 'Kenyang', value: Math.round(pet.hunger), icon: Utensils, barClass: 'bg-amber-400' },
    { label: 'Bersih', value: Math.round(pet.hygiene), icon: Bath, barClass: 'bg-sky-400' },
    {
      label: 'Energi',
      value: Math.round(pet.energy),
      icon: Zap,
      barClass: pet.energy <= 20 ? 'bg-rose-500' : 'bg-emerald-400',
    },
    { label: 'Bahagia', value: Math.round(pet.happiness), icon: Heart, barClass: 'bg-pink-400' },
  ];

  const activeRoom = ROOMS[roomIndex];

  return (
    <div className="space-y-6">
      {/* Milestone Celebration Notice */}
      {milestoneBanner && (
        <div className="rounded-2xl bg-gradient-to-r from-pink-500/20 via-amber-500/15 to-emerald-500/20 border border-pink-400/40 px-5 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <ExternalGameAsset hexCode="1F381" alt="Hadiah Level" className="w-10 h-10 shrink-0" fallbackEmoji="🎁" />
            <div>
              <p className="text-xs font-bold text-amber-300">
                Selamat! {pet.name} Mencapai Level {milestoneBanner.level}
              </p>
              <p className="text-sm font-bold text-white">
                Hadiah Random Didapat: {milestoneBanner.rewardTitle}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setMilestoneBanner(null)}
            className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-semibold text-white cursor-pointer shrink-0"
          >
            Tutup
          </button>
        </div>
      )}

      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`rounded-xl border px-4 py-3 text-xs sm:text-sm font-medium flex items-center justify-between gap-3 ${
            feedback.type === 'err'
              ? 'bg-rose-500/10 border-rose-400/35 text-rose-200'
              : 'bg-emerald-500/10 border-emerald-400/35 text-emerald-200'
          }`}
        >
          <span>{feedback.text}</span>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-xs underline opacity-80 hover:opacity-100 cursor-pointer shrink-0"
          >
            Tutup
          </button>
        </div>
      )}

      {/* Balanced Desktop Split: Left Handheld Smartphone Game Frame + Right Companion Info */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* LEFT: HANDHELD SMARTPHONE GAME CONSOLE */}
        <div className="lg:col-span-6 flex flex-col items-center">
          <div className="w-full max-w-[410px] rounded-[2.75rem] bg-[#181822] p-3 border-[3px] border-zinc-700/80 shadow-2xl shadow-black/70">
            {/* Inner Phone Screen */}
            <div className="rounded-[2.15rem] bg-[#0B0B0F] overflow-hidden border border-white/10 flex flex-col">
              {/* Top Phone Status Bar & Notch */}
              <div className="bg-[#111119] px-5 pt-2.5 pb-2 border-b border-white/10">
                <div className="flex items-center justify-between text-[11px] font-semibold text-zinc-300 tabular-nums">
                  <span>{phoneClockText}</span>
                  <div className="w-20 h-4 rounded-full bg-black border border-white/10" aria-hidden="true" />
                  <span className="text-pink-300">Lv. {pet.level}</span>
                </div>

                {/* Live Phone Mini HUD */}
                <div className="mt-2 flex items-center justify-between gap-2 text-[11px] tabular-nums">
                  <div className="flex items-center gap-2 text-zinc-200 font-semibold">
                    <span className="inline-flex items-center gap-1">
                      <Coins className="w-3.5 h-3.5 text-amber-400" />
                      {inventory.coins}
                    </span>
                    <span className="text-zinc-600">·</span>
                    <span className="inline-flex items-center gap-1">
                      <Ticket className="w-3.5 h-3.5 text-emerald-400" />
                      {inventory.claimTickets}
                    </span>
                    <span className="text-zinc-600">·</span>
                    <span className="inline-flex items-center gap-1">
                      <Apple className="w-3.5 h-3.5 text-pink-400" />
                      {fruitKgText}
                    </span>
                  </div>
                  <span className="text-zinc-400 font-medium">{activeRoom.label}</span>
                </div>
              </div>

              {/* Swipeable Viewport Stage (No Browser Refresh!) */}
              <div
                onPointerDown={handlePointerDown}
                onPointerUp={handlePointerUp}
                className="relative h-[535px] overflow-hidden select-none touch-pan-y"
              >
                {/* Left / Right Live Arrow Buttons */}
                <button
                  type="button"
                  onClick={goPrevRoom}
                  aria-label="Geser ke ruangan sebelumnya"
                  className="absolute left-2 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-black/55 hover:bg-black/75 border border-white/20 text-white flex items-center justify-center backdrop-blur-sm transition-transform active:scale-95 cursor-pointer"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  onClick={goNextRoom}
                  aria-label="Geser ke ruangan berikutnya"
                  className="absolute right-2 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-black/55 hover:bg-black/75 border border-white/20 text-white flex items-center justify-center backdrop-blur-sm transition-transform active:scale-95 cursor-pointer"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>

                {/* Horizontal Sliding Track of 4 Live Rooms */}
                <div
                  className="flex h-full transition-transform duration-300 ease-out"
                  style={{ transform: `translateX(-${roomIndex * 100}%)` }}
                >
                  {/* SLIDE 0: KAMAR BERUANG */}
                  <div className="w-full h-full shrink-0 relative flex flex-col justify-between">
                    <img
                      src={pet.isSleeping ? roomNightBg : roomDayBg}
                      alt={pet.isSleeping ? 'Kamar tidur malam beruang' : 'Kamar cerah beruang'}
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/75" />

                    {/* Top 4 Stat Bars Overlay */}
                    <div className="relative z-10 p-3.5 space-y-2">
                      <div className="grid grid-cols-2 gap-1.5">
                        {statItems.map((s) => {
                          const Icon = s.icon;
                          return (
                            <div
                              key={s.label}
                              className="rounded-xl bg-black/60 backdrop-blur-md border border-white/15 px-2.5 py-1.5"
                            >
                              <div className="flex items-center justify-between text-[11px] text-white font-semibold">
                                <span className="inline-flex items-center gap-1">
                                  <Icon className="w-3 h-3 text-pink-300" />
                                  {s.label}
                                </span>
                                <span className="font-mono-tabular">{s.value}%</span>
                              </div>
                              <div className="h-1.5 rounded-full bg-white/15 overflow-hidden mt-1">
                                <div
                                  className={`h-full ${s.barClass} transition-all duration-300`}
                                  style={{ width: `${s.value}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      <div className="text-center">
                        <span className="inline-block px-3 py-1 rounded-lg bg-black/55 backdrop-blur-sm text-[11px] font-semibold text-white">
                          {pet.isSleeping
                            ? 'Tidur nyenyak · +1% energi tiap 1 menit'
                            : pet.isExhausted
                              ? 'Kelelahan! Tidurkan beruang sekarang'
                              : `${pet.name} · ${STAGE_TITLES[pet.stage]} (Lv. ${pet.level})`}
                        </span>
                      </div>
                    </div>

                    {/* Center Animated Bear Character */}
                    <div className="relative z-10 flex-1 flex items-center justify-center px-10">
                      <BearVisualSvg pet={pet} effect={effect} />
                    </div>

                    {/* Snack Drawer Overlay inside Phone */}
                    {showSnackDrawer && (
                      <div className="relative z-20 mx-3 mb-2 rounded-2xl bg-[#14141B]/95 backdrop-blur-md border border-white/15 p-3 space-y-2">
                        <div className="flex items-center justify-between text-xs font-bold text-white">
                          <span>Pilih Makanan ({feedRemainMs > 0 ? `Tunggu ${formatRemainingDuration(feedRemainMs)}` : 'Siap Makan'})</span>
                          <button
                            type="button"
                            onClick={() => setShowSnackDrawer(false)}
                            className="text-zinc-400 hover:text-white text-[11px] cursor-pointer"
                          >
                            Tutup
                          </button>
                        </div>
                        <div className="grid grid-cols-2 gap-1.5">
                          {SNACK_CATALOG.map((snack) => {
                            const count = inventory.snacks[snack.id] ?? 0;
                            const disabled =
                              busy ||
                              pet.isSleeping ||
                              feedRemainMs > 0 ||
                              (snack.id !== 'berry' && count <= 0);
                            const art = SNACK_OPENMOJI[snack.id];
                            return (
                              <button
                                key={snack.id}
                                type="button"
                                disabled={disabled}
                                onClick={() => void runAction({ action: 'feed', snackId: snack.id }, 'feed')}
                                className="p-2 rounded-xl bg-[#0B0B0F] hover:bg-amber-500/15 border border-white/10 disabled:opacity-45 flex items-center gap-2 text-left cursor-pointer"
                              >
                                <ExternalGameAsset
                                  hexCode={art.hex}
                                  alt={snack.name}
                                  className="w-7 h-7 shrink-0"
                                  fallbackEmoji={art.fallback}
                                />
                                <div className="min-w-0">
                                  <p className="text-[11px] font-bold text-white truncate">{snack.name}</p>
                                  <p className="text-[10px] text-amber-300 tabular-nums">
                                    {snack.id === 'berry' ? 'Gratis' : `Stok: ${count}`}
                                  </p>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Bottom Pou Care Buttons */}
                    <div className="relative z-10 p-3 grid grid-cols-4 gap-1.5">
                      <button
                        type="button"
                        disabled={busy || pet.isSleeping}
                        onClick={() => setShowSnackDrawer((v) => !v)}
                        className="min-h-[54px] rounded-xl bg-black/70 hover:bg-amber-500/25 border border-white/15 text-white flex flex-col items-center justify-center gap-0.5 text-[11px] font-semibold disabled:opacity-45 cursor-pointer backdrop-blur-sm"
                      >
                        <Utensils className="w-4 h-4 text-amber-300" />
                        <span>Makan</span>
                        <span className="text-[9px] text-zinc-300 tabular-nums">
                          {feedRemainMs > 0 ? formatRemainingDuration(feedRemainMs) : 'Siap'}
                        </span>
                      </button>

                      <button
                        type="button"
                        disabled={busy || pet.isSleeping || bathRemainMs > 0}
                        onClick={() => void runAction({ action: 'bath' }, 'bath')}
                        className="min-h-[54px] rounded-xl bg-black/70 hover:bg-sky-500/25 border border-white/15 text-white flex flex-col items-center justify-center gap-0.5 text-[11px] font-semibold disabled:opacity-45 cursor-pointer backdrop-blur-sm"
                      >
                        <Bath className="w-4 h-4 text-sky-300" />
                        <span>Mandi</span>
                        <span className="text-[9px] text-zinc-300 tabular-nums">
                          {bathRemainMs > 0 ? formatRemainingDuration(bathRemainMs) : 'Siap'}
                        </span>
                      </button>

                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void runAction({ action: 'sleep_toggle' })}
                        className={`min-h-[54px] rounded-xl border text-white flex flex-col items-center justify-center gap-0.5 text-[11px] font-semibold cursor-pointer backdrop-blur-sm ${
                          pet.isSleeping
                            ? 'bg-indigo-600/80 border-indigo-300'
                            : 'bg-black/70 hover:bg-indigo-500/25 border-white/15'
                        }`}
                      >
                        {pet.isSleeping ? (
                          <Sun className="w-4 h-4 text-amber-300" />
                        ) : (
                          <BedDouble className="w-4 h-4 text-indigo-300" />
                        )}
                        <span>{pet.isSleeping ? 'Bangun' : 'Tidur'}</span>
                        <span className="text-[9px] text-zinc-200 tabular-nums">
                          {pet.isSleeping ? '+1%/mnt' : 'Istirahat'}
                        </span>
                      </button>

                      <button
                        type="button"
                        disabled={busy || pet.isSleeping || pet.isExhausted || playRemainMs > 0}
                        onClick={() => void runAction({ action: 'play' }, 'play')}
                        className="min-h-[54px] rounded-xl bg-black/70 hover:bg-pink-500/25 border border-white/15 text-white flex flex-col items-center justify-center gap-0.5 text-[11px] font-semibold disabled:opacity-45 cursor-pointer backdrop-blur-sm"
                      >
                        <Gamepad2 className="w-4 h-4 text-pink-300" />
                        <span>Main</span>
                        <span className="text-[9px] text-zinc-300 tabular-nums">
                          {playRemainMs > 0 ? formatRemainingDuration(playRemainMs) : 'Siap'}
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* SLIDE 1: KEBUN POHON BUAH */}
                  <div className="w-full h-full shrink-0 relative flex flex-col justify-between">
                    <img
                      src={gardenBg}
                      alt="Kebun cerah tempat menanam pohon buah"
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/75" />

                    {/* Top Garden Status */}
                    <div className="relative z-10 p-3.5 space-y-2">
                      <div className="grid grid-cols-3 gap-1.5">
                        <div className="rounded-xl bg-black/60 backdrop-blur-md border border-white/15 px-2.5 py-1.5 text-center">
                          <p className="text-[10px] text-zinc-300">Siklus</p>
                          <p className="font-mono-tabular text-xs font-bold text-white">
                            Hari {Math.min(3, tree.cycleDay)}/3
                          </p>
                        </div>
                        <div className="rounded-xl bg-black/60 backdrop-blur-md border border-white/15 px-2.5 py-1.5 text-center">
                          <p className="text-[10px] text-zinc-300">Siram Hari Ini</p>
                          <p className="font-mono-tabular text-xs font-bold text-sky-300">
                            {tree.wateringsToday}/{MAX_WATERINGS_PER_DAY}x
                          </p>
                        </div>
                        <div className="rounded-xl bg-black/60 backdrop-blur-md border border-white/15 px-2.5 py-1.5 text-center">
                          <p className="text-[10px] text-zinc-300">Lupa Siram</p>
                          <p
                            className={`font-mono-tabular text-xs font-bold ${
                              tree.missedDays >= 2
                                ? 'text-rose-300'
                                : tree.missedDays === 1
                                  ? 'text-amber-300'
                                  : 'text-emerald-300'
                            }`}
                          >
                            {tree.missedDays}/2x
                          </p>
                        </div>
                      </div>

                      <div className="text-center">
                        <span className="inline-block px-3 py-1 rounded-lg bg-black/60 backdrop-blur-sm text-[11px] font-semibold text-white">
                          {treeStatusLabel}
                        </span>
                      </div>
                    </div>

                    {/* Center Fruit Tree */}
                    <div className="relative z-10 flex-1 flex items-center justify-center px-8">
                      <FruitTreeSvg tree={tree} isWatering={isWateringAnim} />
                    </div>

                    {/* Bottom Garden Action */}
                    <div className="relative z-10 p-3.5 space-y-2">
                      {waterRemainMs > 0 && tree.status !== 'dead' && tree.status !== 'fruiting' && (
                        <div className="rounded-xl bg-black/75 border border-sky-400/30 px-3 py-2 text-[11px] text-sky-200 flex items-center justify-center gap-1.5 tabular-nums">
                          <Clock className="w-3.5 h-3.5 text-sky-300 shrink-0" />
                          <span>Jeda siram ke-2 (8 jam): sisa {formatRemainingDuration(waterRemainMs)}</span>
                        </div>
                      )}

                      {tree.status === 'dead' ? (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void runAction({ action: 'replant_tree' })}
                          className="w-full min-h-[48px] px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-bold inline-flex items-center justify-center gap-2 cursor-pointer shadow-lg"
                        >
                          <RefreshCw className="w-4 h-4" />
                          <span>Tanam Ulang Bibit Baru</span>
                        </button>
                      ) : tree.status === 'fruiting' ? (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void runAction({ action: 'harvest_tree' })}
                          className="w-full min-h-[48px] px-4 py-2.5 rounded-xl bg-pink-500 hover:bg-pink-400 text-zinc-950 text-xs font-bold inline-flex items-center justify-center gap-2 cursor-pointer shadow-lg"
                        >
                          <Sparkles className="w-4 h-4" />
                          <span>Petik Buah 1 kg ke Keranjang!</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={
                            busy ||
                            pet.isSleeping ||
                            pet.isExhausted ||
                            tree.wateringsToday >= MAX_WATERINGS_PER_DAY ||
                            waterRemainMs > 0
                          }
                          onClick={() => void runAction({ action: 'water_tree' }, 'water')}
                          className="w-full min-h-[48px] px-4 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 disabled:bg-slate-800/90 disabled:text-zinc-400 text-zinc-950 text-xs font-bold inline-flex items-center justify-center gap-2 cursor-pointer shadow-lg"
                        >
                          <Droplets className="w-4 h-4" />
                          <span>
                            {tree.wateringsToday >= MAX_WATERINGS_PER_DAY
                              ? 'Sudah Siram 2x Hari Ini (Tunggu Besok)'
                              : waterRemainMs > 0
                                ? `Tunggu ${formatRemainingDuration(waterRemainMs)} untuk Siram ke-2`
                                : `Siram Pohon (${tree.wateringsToday}/${MAX_WATERINGS_PER_DAY})`}
                          </span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* SLIDE 2: KERANJANG PANEN & INVENTORY */}
                  <div className="w-full h-full shrink-0 bg-[#12121A] p-4 overflow-y-auto space-y-4">
                    <div className="rounded-2xl bg-[#1A1A25] border border-white/10 p-4 space-y-3">
                      <div className="flex items-center gap-3">
                        <ExternalGameAsset
                          hexCode="1F9FA"
                          alt="Keranjang Buah"
                          className="w-11 h-11 shrink-0"
                          fallbackEmoji="🧺"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-white">Keranjang & Inventory Buah</p>
                          <p className="font-mono-tabular text-sm font-bold text-pink-300">
                            {inventory.fruitGrams} g / 1.000 g (1 kg)
                          </p>
                        </div>
                      </div>

                      <div className="h-3 rounded-full bg-black/50 border border-white/10 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-pink-500 to-rose-400 transition-all duration-300"
                          style={{ width: `${fruitPct}%` }}
                        />
                      </div>

                      <div className="flex items-center justify-between gap-2 text-[11px]">
                        <span className="text-zinc-300">
                          {inventory.fruitGrams >= MAX_FRUIT_GRAMS
                            ? 'Keranjang penuh 1 kg! Siap dijual ke Toko NPC.'
                            : 'Petik pohon buah di hari ke-3 untuk mengisi 1 kg.'}
                        </span>
                        {inventory.fruitGrams >= MAX_FRUIT_GRAMS && (
                          <button
                            type="button"
                            onClick={() => setRoomIndex(3)}
                            className="px-3 py-1.5 rounded-lg bg-pink-500 text-zinc-950 font-bold cursor-pointer shrink-0"
                          >
                            Jual
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <p className="text-xs font-bold text-zinc-200 inline-flex items-center gap-1.5">
                        <Package className="w-3.5 h-3.5 text-amber-300" />
                        <span>Stok Makanan di Tas</span>
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        {SNACK_CATALOG.map((snack) => {
                          const art = SNACK_OPENMOJI[snack.id];
                          return (
                            <div
                              key={snack.id}
                              className="rounded-xl bg-[#1A1A25] border border-white/10 p-2.5 flex items-center gap-2.5"
                            >
                              <ExternalGameAsset
                                hexCode={art.hex}
                                alt={snack.name}
                                className="w-7 h-7 shrink-0"
                                fallbackEmoji={art.fallback}
                              />
                              <div className="min-w-0">
                                <p className="text-[11px] font-semibold text-white truncate">
                                  {snack.name}
                                </p>
                                <p className="font-mono-tabular text-[11px] text-amber-300">
                                  {snack.id === 'berry'
                                    ? 'Gratis'
                                    : `${inventory.snacks[snack.id] ?? 0} pcs`}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <p className="text-xs font-bold text-zinc-200 inline-flex items-center gap-1.5">
                        <Trophy className="w-3.5 h-3.5 text-emerald-300" />
                        <span>Riwayat Hadiah Didapat ({claimedHistory.length})</span>
                      </p>
                      {claimedHistory.length === 0 ? (
                        <p className="text-xs text-zinc-500">
                          Belum ada hadiah. Jual panen 1 kg ke Toko NPC atau capai Level 10, 20, 30!
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {claimedHistory.map((item) => (
                            <div
                              key={item.id}
                              className="rounded-xl bg-emerald-500/10 border border-emerald-400/25 px-3 py-2 flex items-center justify-between gap-2"
                            >
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-emerald-200 truncate">
                                  {item.source === 'level_milestone' && item.milestoneLevel
                                    ? `[Lv. ${item.milestoneLevel}] `
                                    : ''}
                                  {item.rewardTitle}
                                </p>
                                <p className="text-[10px] text-zinc-400 truncate">
                                  {item.claimedBy} ·{' '}
                                  {new Date(item.claimedAt).toLocaleDateString('id-ID', {
                                    day: 'numeric',
                                    month: 'short',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </p>
                              </div>
                              <Check className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* SLIDE 3: TOKO NPC & KLAIM 1 DARI 3 HADIAH */}
                  <div className="w-full h-full shrink-0 relative flex flex-col">
                    <img
                      src={shopBg}
                      alt="Toko buah NPC"
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-[#0B0B0F]/80 backdrop-blur-[1px]" />

                    <div className="relative z-10 flex-1 overflow-y-auto p-4 space-y-4">
                      {/* NPC Shopkeeper & Sell 1 kg */}
                      <div className="rounded-2xl bg-[#161622]/95 border border-white/15 p-3.5 space-y-3">
                        <div className="flex items-center gap-3">
                          <div className="scale-90 origin-left shrink-0">
                            <NpcShopVisualSvg />
                          </div>
                          <div className="min-w-0 space-y-1">
                            <p className="text-xs font-bold text-pink-300">Toko Tuan Rubah (NPC)</p>
                            <p className="text-[11px] text-zinc-300 leading-snug">
                              Jual 1 kg buah dari keranjangmu untuk +{FRUIT_SELL_COINS} koin & +1 Tiket Hadiah!
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          disabled={busy || inventory.fruitGrams < MAX_FRUIT_GRAMS}
                          onClick={() => void runAction({ action: 'sell_fruit' })}
                          className="w-full min-h-[42px] px-3 py-2 rounded-xl bg-pink-500 hover:bg-pink-400 disabled:bg-white/10 disabled:text-zinc-400 text-zinc-950 text-xs font-bold inline-flex items-center justify-center gap-2 cursor-pointer"
                        >
                          <ShoppingBag className="w-4 h-4" />
                          <span>
                            {inventory.fruitGrams >= MAX_FRUIT_GRAMS
                              ? `Jual 1 kg Buah (+${FRUIT_SELL_COINS} Koin & +1 Tiket)`
                              : `Butuh 1 kg Buah (${inventory.fruitGrams}/1.000 g)`}
                          </span>
                        </button>
                      </div>

                      {/* Claim 1 of 3 Harvest Rewards */}
                      <div className="rounded-2xl bg-[#161622]/95 border border-white/15 p-3.5 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-bold text-white inline-flex items-center gap-1.5">
                            <Gift className="w-3.5 h-3.5 text-pink-400" />
                            <span>Klaim 1 dari 3 Hadiah</span>
                          </p>
                          <span className="text-[11px] font-bold text-emerald-300 tabular-nums">
                            Tiket: {inventory.claimTickets}
                          </span>
                        </div>

                        <div className="space-y-2">
                          {rewards.map((rew, idx) => (
                            <div
                              key={rew.id}
                              className="rounded-xl bg-[#0E0E15] border border-white/10 p-2.5 flex items-center justify-between gap-2"
                            >
                              <div className="min-w-0">
                                <p className="text-[10px] text-pink-300 font-semibold">
                                  Pilihan {idx + 1}
                                </p>
                                <p className="text-xs font-bold text-white break-words">{rew.title}</p>
                              </div>
                              <button
                                type="button"
                                disabled={busy || inventory.claimTickets < 1}
                                onClick={() =>
                                  void runAction({ action: 'claim_reward', rewardId: rew.id })
                                }
                                className="px-3 py-1.5 rounded-lg bg-pink-500 hover:bg-pink-400 disabled:bg-white/10 disabled:text-zinc-500 text-zinc-950 text-[11px] font-bold shrink-0 cursor-pointer"
                              >
                                Klaim
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Buy Extra Snacks */}
                      <div className="rounded-2xl bg-[#161622]/95 border border-white/15 p-3.5 space-y-2">
                        <p className="text-xs font-bold text-zinc-200">
                          Beli Makanan (Koin: {inventory.coins})
                        </p>
                        <div className="grid grid-cols-3 gap-1.5">
                          {SNACK_CATALOG.filter((s) => s.priceCoins > 0).map((snack) => {
                            const art = SNACK_OPENMOJI[snack.id];
                            return (
                              <button
                                key={snack.id}
                                type="button"
                                disabled={busy || inventory.coins < snack.priceCoins}
                                onClick={() =>
                                  void runAction({ action: 'buy_snack', snackId: snack.id })
                                }
                                className="p-2 rounded-xl bg-[#0E0E15] hover:bg-amber-500/15 border border-white/10 disabled:opacity-45 flex flex-col items-center text-center gap-1 cursor-pointer"
                              >
                                <ExternalGameAsset
                                  hexCode={art.hex}
                                  alt={snack.name}
                                  className="w-6 h-6"
                                  fallbackEmoji={art.fallback}
                                />
                                <span className="text-[10px] font-semibold text-white leading-tight line-clamp-1">
                                  {snack.name}
                                </span>
                                <span className="text-[10px] font-mono-tabular font-bold text-amber-300">
                                  {snack.priceCoins} Koin
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Phone Navigation Dock + Dots */}
              <div className="bg-[#111119] border-t border-white/10 px-3 pt-2 pb-3 space-y-2">
                <div className="flex items-center justify-center gap-1.5" aria-hidden="true">
                  {ROOMS.map((r, idx) => (
                    <span
                      key={r.id}
                      className={`h-1.5 rounded-full transition-all ${
                        idx === roomIndex ? 'w-5 bg-pink-400' : 'w-1.5 bg-zinc-600'
                      }`}
                    />
                  ))}
                </div>

                <div className="grid grid-cols-4 gap-1">
                  {ROOMS.map((room, idx) => {
                    const Icon = room.icon;
                    const active = roomIndex === idx;
                    return (
                      <button
                        key={room.id}
                        type="button"
                        onClick={() => setRoomIndex(idx)}
                        className={`min-h-[44px] rounded-xl flex flex-col items-center justify-center gap-0.5 text-[11px] font-semibold transition-colors cursor-pointer ${
                          active
                            ? 'bg-pink-500 text-zinc-950'
                            : 'text-zinc-400 hover:text-white hover:bg-white/5'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span>{room.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
          <p className="text-[11px] text-zinc-400 mt-2.5 text-center">
            Geser layar HP ke kiri/kanan atau klik tombol panah untuk berpindah ruangan langsung.
          </p>
        </div>

        {/* RIGHT: BEAR PROFILE, LEVEL MILESTONES & REAL-TIME RULES */}
        <div className="lg:col-span-6 space-y-5">
          {/* Bear Identity & Level Card */}
          <section className="rounded-2xl bg-[#14141B] border border-white/10 p-5 sm:p-6 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-pink-300">
                  <span>Level {pet.level}</span>
                  <span aria-hidden="true">·</span>
                  <span>{STAGE_TITLES[pet.stage]}</span>
                  <span aria-hidden="true">·</span>
                  <span>Pemain: {currentUserName}</span>
                </div>

                {editingName ? (
                  <form onSubmit={handleRenameSubmit} className="flex items-center gap-2 pt-1">
                    <input
                      type="text"
                      value={nameInput}
                      onChange={(e) => setNameInput(e.target.value)}
                      maxLength={24}
                      className="px-3 py-1.5 rounded-lg bg-[#0B0B0F] border border-pink-400/50 text-white text-base font-semibold focus:outline-none"
                    />
                    <button
                      type="submit"
                      className="px-3 py-1.5 rounded-lg bg-pink-500 text-zinc-950 text-xs font-semibold cursor-pointer"
                    >
                      Simpan
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingName(false)}
                      className="px-3 py-1.5 rounded-lg bg-white/5 text-zinc-300 text-xs cursor-pointer"
                    >
                      Batal
                    </button>
                  </form>
                ) : (
                  <div className="flex items-center gap-2">
                    <h1 className="font-display text-2xl font-bold text-white">
                      {pet.name} si Beruang Kebun
                    </h1>
                    <button
                      type="button"
                      onClick={() => setEditingName(true)}
                      aria-label="Ubah nama beruang"
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-pink-300 hover:bg-white/5 transition-colors cursor-pointer"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              <ExternalGameAsset
                hexCode="1F43B"
                alt="Ikon Beruang"
                className="w-12 h-12 shrink-0"
                fallbackEmoji="🐻"
              />
            </div>

            {/* Daily Level Qualification Bar */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs text-zinc-300 tabular-nums">
                <span>Naik Level Harian (Syarat Bahagia &gt; 80%)</span>
                <span
                  className={`font-mono-tabular font-semibold ${
                    qualifiesForTomorrowLevelUp ? 'text-emerald-300' : 'text-amber-300'
                  }`}
                >
                  Bahagia: {roundedHappiness}% {qualifiesForTomorrowLevelUp ? '(Siap Naik Level)' : '(Perlu >80%)'}
                </span>
              </div>
              <div className="relative h-2.5 rounded-full bg-[#0B0B0F] border border-white/10 overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${
                    qualifiesForTomorrowLevelUp
                      ? 'bg-gradient-to-r from-emerald-500 to-pink-400'
                      : 'bg-gradient-to-r from-amber-500 to-rose-400'
                  }`}
                  style={{ width: `${Math.min(100, roundedHappiness)}%` }}
                />
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-white/80"
                  style={{ left: '80%' }}
                  title="Batas minimum 80%"
                />
              </div>
              <p className="text-[11px] text-zinc-400">
                {qualifiesForTomorrowLevelUp
                  ? `Pertahankan kebahagiaan di atas 80% sampai pergantian hari agar ${pet.name} naik ke Level ${pet.level + 1}.`
                  : `Jika saat berganti hari kebahagiaan masih ≤80%, level ${pet.name} tidak akan naik.`}
              </p>
            </div>
          </section>

          {/* Level 10, 20, 30 Random Milestone Rewards Preview */}
          <section className="rounded-2xl bg-[#14141B] border border-white/10 p-5 sm:p-6 space-y-3.5">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-display text-base font-bold text-white inline-flex items-center gap-2">
                <Trophy className="w-4 h-4 text-amber-400" />
                <span>Hadiah Random Level 10, 20, 30...</span>
              </h2>
              <span className="text-xs font-semibold text-amber-300 tabular-nums">
                Target Berikutnya: Lv. {nextMilestoneLevel}
              </span>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Setiap kali {pet.name} mencapai kelipatan level 10 (Level 10, 20, 30, dst.), sistem otomatis memilih 1 hadiah acak dari daftar berikut:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {milestoneRewards.map((mr) => (
                <div
                  key={mr.id}
                  className="rounded-xl bg-[#0E0E13] border border-white/10 px-3 py-2 text-xs text-zinc-200 flex items-center gap-2"
                >
                  <Gift className="w-3.5 h-3.5 text-pink-400 shrink-0" />
                  <span className="truncate">{mr.title}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Real-Time Rules & Pacing Guide */}
          <section className="rounded-2xl bg-[#14141B] border border-white/10 p-5 sm:p-6 space-y-3">
            <h2 className="font-display text-base font-bold text-white">
              Aturan Main & Waktu Nyata ({todayDate})
            </h2>
            <ul className="space-y-2 text-xs text-zinc-300 leading-relaxed">
              <li>
                <strong className="text-white">Naik Level Harian:</strong> Beruang naik 1 level setiap pergantian hari (1 hari = +1 level) dengan syarat kebahagiaan berada di atas 80%.
              </li>
              <li>
                <strong className="text-white">Tidur Real-Time:</strong> 1 menit tidur menambah +1% energi. Makan (jeda 30 menit), main (jeda 45 menit), dan mandi (jeda 1 jam) mengikuti waktu tunggu alami.
              </li>
              <li>
                <strong className="text-white">Kelelahan:</strong> Jika energi turun ke ≤20%, beruang kelelahan dan harus ditidurkan sebelum bisa main atau menyiram pohon.
              </li>
              <li>
                <strong className="text-white">Siram Pohon (2x/Hari, Jeda 8 Jam):</strong> Siram 2 kali sehari dengan jarak 8 jam antara siraman ke-1 dan ke-2. Lupa 1 hari membuat pohon melayu; lupa 2 hari dalam 3 hari membuat pohon mati.
              </li>
              <li>
                <strong className="text-white">Panen 1 kg & Toko NPC:</strong> Pada hari ke-3 pohon berbuah 1 kg (1.000 g). Petik ke keranjang & inventory, lalu jual di Toko NPC untuk memilih 1 dari 3 hadiah spesial.
              </li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
