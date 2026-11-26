import { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import {
  Apple,
  Backpack,
  Bath,
  BedDouble,
  Check,
  Coins,
  Droplets,
  Edit3,
  Gamepad2,
  Gift,
  Heart,
  Package,
  RefreshCw,
  ShoppingBag,
  Sparkles,
  Sprout,
  Store,
  Sun,
  Ticket,
  Utensils,
  Zap,
} from 'lucide-react';
import type { BearSnackId, PetGameState } from '../types';
import {
  FRUIT_SELL_COINS,
  MAX_FRUIT_GRAMS,
  SNACK_CATALOG,
} from '../utils/petGameEngine';
import { playPopSound } from '../utils/sound';
import { BearVisualSvg, type BearActionEffect } from './BearVisualSvg';
import { FruitTreeSvg } from './FruitTreeSvg';
import { NpcShopVisualSvg } from './NpcShopVisualSvg';

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
  }) => Promise<{ ok: boolean; message?: string; error?: string }>;
}

type RightTabId = 'care' | 'garden' | 'inventory' | 'shop';
type StageViewId = 'room' | 'garden';

const STAGE_LABELS = {
  baby: { title: 'Bayi Beruang', nextXp: 100, prevXp: 0 },
  teen: { title: 'Beruang Remaja', nextXp: 250, prevXp: 100 },
  adult: { title: 'Beruang Dewasa', nextXp: 250, prevXp: 250 },
} as const;

export function BearPetGamePage({
  game,
  todayDate,
  currentUserName,
  soundEnabled,
  onAction,
}: BearPetGamePageProps) {
  const [rightTab, setRightTab] = useState<RightTabId>('care');
  const [stageView, setStageView] = useState<StageViewId>('room');
  const [effect, setEffect] = useState<BearActionEffect>('none');
  const [isWateringAnim, setIsWateringAnim] = useState(false);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(game.pet.name);

  useEffect(() => {
    setNameInput(game.pet.name);
  }, [game.pet.name]);

  // Automatic sleep energy recovery tick while the bear is sleeping
  useEffect(() => {
    if (!game.pet.isSleeping) return;
    const id = window.setInterval(() => {
      void onAction({ action: 'sleep_tick' });
    }, 4000);
    return () => window.clearInterval(id);
  }, [game.pet.isSleeping, onAction]);

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

    if (visualEffect) {
      setEffect(visualEffect);
      window.setTimeout(() => setEffect('none'), 1600);
    }
    if (payload.action === 'water_tree') {
      setIsWateringAnim(true);
      window.setTimeout(() => setIsWateringAnim(false), 1600);
    }
    if (payload.action === 'claim_reward' || payload.action === 'harvest_tree') {
      try {
        confetti({
          particleCount: 70,
          spread: 65,
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

  const { pet, tree, inventory, rewards, claimedHistory } = game;
  const stageInfo = STAGE_LABELS[pet.stage];
  const xpProgress =
    pet.stage === 'adult'
      ? 100
      : Math.min(
          100,
          Math.round(((pet.xp - stageInfo.prevXp) / (stageInfo.nextXp - stageInfo.prevXp)) * 100)
        );
  const fruitPct = Math.min(100, Math.round((inventory.fruitGrams / MAX_FRUIT_GRAMS) * 100));
  const fruitKgText = `${(inventory.fruitGrams / 1000).toFixed(2)} kg`;

  const treeStatusLabel =
    tree.status === 'dead'
      ? 'Pohon Mati (Lupa Siram 2x)'
      : tree.status === 'wilting'
        ? 'Tanaman Melayu! Segera Siram'
        : tree.status === 'fruiting'
          ? 'Berbuah Lebat! Siap Panen'
          : `Sehat · Hari ${Math.min(3, tree.cycleDay)}/3`;

  const statItems = [
    { label: 'Kenyang', value: pet.hunger, icon: Utensils, barClass: 'bg-amber-400' },
    { label: 'Kebersihan', value: pet.hygiene, icon: Bath, barClass: 'bg-sky-400' },
    { label: 'Energi', value: pet.energy, icon: Zap, barClass: pet.energy <= 20 ? 'bg-rose-500' : 'bg-emerald-400' },
    { label: 'Bahagia', value: pet.happiness, icon: Heart, barClass: 'bg-pink-400' },
  ];

  return (
    <div className="space-y-6">
      {/* Top Pet & Mission Header */}
      <section className="rounded-2xl bg-[#14141B] border border-white/10 p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-pink-300">
            <span>Pelihara Beruang · {stageInfo.title}</span>
            <span aria-hidden="true">·</span>
            <span className="tabular-nums">{pet.xp} XP</span>
            <span aria-hidden="true">·</span>
            <span>Pemain: {currentUserName}</span>
          </div>

          {editingName ? (
            <form onSubmit={handleRenameSubmit} className="flex items-center gap-2 mt-1">
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
            <div className="flex items-center gap-2.5">
              <h1 className="font-display text-2xl sm:text-3xl font-bold text-white">
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

          {/* Growth XP Progress */}
          <div className="flex items-center gap-3 max-w-md pt-1">
            <div className="flex-1 h-2 rounded-full bg-[#0B0B0F] border border-white/10 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-pink-500 to-amber-400 transition-all duration-300"
                style={{ width: `${xpProgress}%` }}
              />
            </div>
            <span className="text-[11px] text-zinc-400 tabular-nums whitespace-nowrap">
              {pet.stage === 'adult' ? 'Dewasa Maksimal' : `${pet.xp}/${stageInfo.nextXp} XP ke tahap berikutnya`}
            </span>
          </div>
        </div>

        {/* Summary Metrics */}
        <div className="grid grid-cols-3 gap-2.5 sm:gap-3 shrink-0">
          <div className="rounded-xl bg-[#0E0E13] border border-white/10 px-3.5 py-2.5">
            <div className="flex items-center gap-1.5 text-[11px] text-zinc-400">
              <Apple className="w-3.5 h-3.5 text-pink-400" />
              <span>Buah Tas</span>
            </div>
            <p className="font-mono-tabular text-sm sm:text-base font-bold text-white mt-0.5">
              {fruitKgText}
            </p>
          </div>
          <div className="rounded-xl bg-[#0E0E13] border border-white/10 px-3.5 py-2.5">
            <div className="flex items-center gap-1.5 text-[11px] text-zinc-400">
              <Coins className="w-3.5 h-3.5 text-amber-400" />
              <span>Koin NPC</span>
            </div>
            <p className="font-mono-tabular text-sm sm:text-base font-bold text-white mt-0.5">
              {inventory.coins}
            </p>
          </div>
          <div className="rounded-xl bg-[#0E0E13] border border-white/10 px-3.5 py-2.5">
            <div className="flex items-center gap-1.5 text-[11px] text-zinc-400">
              <Ticket className="w-3.5 h-3.5 text-emerald-400" />
              <span>Tiket Hadiah</span>
            </div>
            <p className="font-mono-tabular text-sm sm:text-base font-bold text-white mt-0.5">
              {inventory.claimTickets}
            </p>
          </div>
        </div>
      </section>

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

      {/* Main Split Stage + Interactive Tabs */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Interactive Bear Room & Fruit Garden Stage */}
        <section className="lg:col-span-6 rounded-2xl bg-[#14141B] border border-white/10 p-4 sm:p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="inline-flex p-1 rounded-xl bg-[#0B0B0F] border border-white/10">
              <button
                type="button"
                onClick={() => setStageView('room')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                  stageView === 'room' ? 'bg-pink-500 text-zinc-950' : 'text-zinc-400 hover:text-white'
                }`}
              >
                Kamar {pet.name}
              </button>
              <button
                type="button"
                onClick={() => setStageView('garden')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                  stageView === 'garden' ? 'bg-pink-500 text-zinc-950' : 'text-zinc-400 hover:text-white'
                }`}
              >
                Kebun Pohon Buah
              </button>
            </div>

            <span className="text-xs text-zinc-400">
              {pet.isSleeping
                ? 'Sedang tidur memulihkan energi...'
                : pet.isExhausted
                  ? 'Kelelahan — tidurkan beruang!'
                  : stageView === 'garden'
                    ? treeStatusLabel
                    : `Tanggal Kebun: ${todayDate}`}
            </span>
          </div>

          {/* Soft Bright Stage Canvas */}
          <div
            className={`relative rounded-2xl overflow-hidden border p-4 min-h-[300px] sm:min-h-[330px] flex flex-col items-center justify-center transition-colors ${
              pet.isSleeping
                ? 'bg-gradient-to-b from-slate-900 via-indigo-950 to-slate-900 border-indigo-400/30'
                : stageView === 'garden'
                  ? 'bg-gradient-to-b from-sky-50 via-emerald-50 to-amber-50 border-emerald-200/70'
                  : 'bg-gradient-to-b from-white via-rose-50/70 to-amber-50/60 border-white/60'
            }`}
          >
            {stageView === 'room' ? (
              <BearVisualSvg pet={pet} effect={effect} />
            ) : (
              <div className="w-full flex flex-col items-center">
                <FruitTreeSvg tree={tree} isWatering={isWateringAnim} />
                <p
                  className={`mt-1 text-xs font-bold ${
                    tree.status === 'dead'
                      ? 'text-rose-700'
                      : tree.status === 'wilting'
                        ? 'text-amber-700'
                        : 'text-emerald-800'
                  }`}
                >
                  {treeStatusLabel} · Siram hari ini: {tree.wateringsToday}/3
                </p>
              </div>
            )}
          </div>

          {/* 4 Pou Status Meters */}
          <div className="grid grid-cols-2 gap-3">
            {statItems.map((s) => {
              const Icon = s.icon;
              return (
                <div
                  key={s.label}
                  className="rounded-xl bg-[#0E0E13] border border-white/10 p-3 space-y-1.5"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="inline-flex items-center gap-1.5 font-semibold text-zinc-200">
                      <Icon className="w-3.5 h-3.5 text-pink-400" />
                      {s.label}
                    </span>
                    <span className="font-mono-tabular font-bold text-white">{s.value}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                    <div
                      className={`h-full ${s.barClass} transition-all duration-300`}
                      style={{ width: `${s.value}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Right: Care, Garden Mission, Inventory, NPC Shop */}
        <section className="lg:col-span-6 rounded-2xl bg-[#14141B] border border-white/10 p-5 sm:p-6 space-y-5">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 p-1 rounded-xl bg-[#0B0B0F] border border-white/10">
            {(
              [
                { id: 'care', label: 'Rawat', icon: Heart },
                { id: 'garden', label: 'Kebun', icon: Sprout },
                { id: 'inventory', label: 'Inventory', icon: Backpack },
                { id: 'shop', label: 'Toko NPC', icon: Store },
              ] as const
            ).map((t) => {
              const Icon = t.icon;
              const active = rightTab === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    setRightTab(t.id);
                    if (t.id === 'garden') setStageView('garden');
                    if (t.id === 'care') setStageView('room');
                  }}
                  className={`min-h-[40px] px-3 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
                    active ? 'bg-pink-500 text-zinc-950' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span>{t.label}</span>
                </button>
              );
            })}
          </div>

          {/* Tab 1: Rawat Beruang (Makan, Mandi, Tidur, Main) */}
          {rightTab === 'care' && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <button
                  type="button"
                  disabled={busy || pet.isSleeping}
                  onClick={() => void runAction({ action: 'bath' }, 'bath')}
                  className="min-h-[52px] px-4 py-2.5 rounded-xl bg-[#0E0E13] hover:bg-sky-500/15 border border-white/10 hover:border-sky-400/40 disabled:opacity-50 text-left transition-colors cursor-pointer flex items-center gap-3"
                >
                  <Bath className="w-5 h-5 text-sky-400 shrink-0" />
                  <div>
                    <div className="text-xs font-bold text-white">Mandi Busa</div>
                    <div className="text-[11px] text-zinc-400">Bersih 100%</div>
                  </div>
                </button>

                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void runAction({ action: 'sleep_toggle' })}
                  className={`min-h-[52px] px-4 py-2.5 rounded-xl border text-left transition-colors cursor-pointer flex items-center gap-3 ${
                    pet.isSleeping
                      ? 'bg-indigo-500/20 border-indigo-400 text-indigo-100'
                      : 'bg-[#0E0E13] hover:bg-indigo-500/15 border-white/10 hover:border-indigo-400/40 text-white'
                  }`}
                >
                  {pet.isSleeping ? (
                    <Sun className="w-5 h-5 text-amber-300 shrink-0" />
                  ) : (
                    <BedDouble className="w-5 h-5 text-indigo-400 shrink-0" />
                  )}
                  <div>
                    <div className="text-xs font-bold">
                      {pet.isSleeping ? 'Bangunkan' : 'Tidurkan'}
                    </div>
                    <div className="text-[11px] text-zinc-400">
                      {pet.isSleeping ? 'Energi sedang naik' : 'Pulihkan kelelahan'}
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  disabled={busy || pet.isSleeping || pet.isExhausted}
                  onClick={() => void runAction({ action: 'play' }, 'play')}
                  className="min-h-[52px] px-4 py-2.5 rounded-xl bg-[#0E0E13] hover:bg-pink-500/15 border border-white/10 hover:border-pink-400/40 disabled:opacity-50 text-left transition-colors cursor-pointer flex items-center gap-3"
                >
                  <Gamepad2 className="w-5 h-5 text-pink-400 shrink-0" />
                  <div>
                    <div className="text-xs font-bold text-white">Main Bareng</div>
                    <div className="text-[11px] text-zinc-400">+22 Bahagia (-16 Energi)</div>
                  </div>
                </button>
              </div>

              {pet.isExhausted && !pet.isSleeping && (
                <div className="rounded-xl bg-rose-500/10 border border-rose-400/30 px-4 py-3 text-xs text-rose-200">
                  {pet.name} sedang kelelahan karena terus beraktivitas! Klik tombol Tidurkan agar energinya terisi kembali.
                </div>
              )}

              <div className="space-y-2.5 pt-2 border-t border-white/[0.08]">
                <h3 className="text-xs font-semibold text-zinc-200">
                  Pilih Makanan untuk {pet.name}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {SNACK_CATALOG.map((snack) => {
                    const count = inventory.snacks[snack.id] ?? 0;
                    const disabled = busy || pet.isSleeping || (snack.id !== 'berry' && count <= 0);
                    return (
                      <button
                        key={snack.id}
                        type="button"
                        disabled={disabled}
                        onClick={() => void runAction({ action: 'feed', snackId: snack.id }, 'feed')}
                        className="p-3 rounded-xl bg-[#0E0E13] hover:bg-amber-500/10 border border-white/10 hover:border-amber-400/40 disabled:opacity-45 text-left transition-colors cursor-pointer flex items-center justify-between gap-2"
                      >
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-white truncate">{snack.name}</div>
                          <div className="text-[11px] text-zinc-400 truncate">{snack.description}</div>
                        </div>
                        <span className="text-[11px] font-mono-tabular font-semibold text-amber-300 shrink-0">
                          {snack.id === 'berry' ? 'Gratis' : `Stok: ${count}`}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Misi Bercocok Tanam (3 Hari Sekali, 3x/hari, Melayu & Mati) */}
          {rightTab === 'garden' && (
            <div className="space-y-4">
              <div className="rounded-xl bg-[#0E0E13] border border-white/10 p-4 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-bold text-white">Misi Pohon Buah Beruang</h3>
                  <span className="text-xs font-semibold text-emerald-300 tabular-nums">
                    Total Panen: {tree.totalHarvests}x
                  </span>
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Siram pohon 3 kali sehari selama 3 hari agar berbuah indah. Jika lupa siram 1 hari, tanaman akan melayu; jika sampai lupa siram 2 kali dalam 3 hari, pohon mati dan tidak akan berbuah.
                </p>
              </div>

              {/* 3-Day & Daily Watering Progress */}
              <div className="grid grid-cols-3 gap-2.5">
                <div className="rounded-xl bg-[#0E0E13] border border-white/10 p-3">
                  <p className="text-[11px] text-zinc-400">Siklus Hari</p>
                  <p className="font-mono-tabular text-lg font-bold text-white">
                    Hari {Math.min(3, tree.cycleDay)} / 3
                  </p>
                </div>
                <div className="rounded-xl bg-[#0E0E13] border border-white/10 p-3">
                  <p className="text-[11px] text-zinc-400">Siram Hari Ini</p>
                  <p className="font-mono-tabular text-lg font-bold text-sky-300">
                    {tree.wateringsToday} / 3x
                  </p>
                </div>
                <div className="rounded-xl bg-[#0E0E13] border border-white/10 p-3">
                  <p className="text-[11px] text-zinc-400">Lupa Siram</p>
                  <p
                    className={`font-mono-tabular text-lg font-bold ${
                      tree.missedDays >= 2
                        ? 'text-rose-400'
                        : tree.missedDays === 1
                          ? 'text-amber-400'
                          : 'text-emerald-400'
                    }`}
                  >
                    {tree.missedDays} / 2x
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-3">
                {tree.status === 'dead' ? (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void runAction({ action: 'replant_tree' })}
                    className="w-full min-h-[46px] px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-bold inline-flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span>Tanam Ulang Bibit Baru</span>
                  </button>
                ) : tree.status === 'fruiting' ? (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void runAction({ action: 'harvest_tree' })}
                    className="w-full min-h-[46px] px-4 py-2.5 rounded-xl bg-pink-500 hover:bg-pink-400 text-zinc-950 text-xs font-bold inline-flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>
                      Panen Buah (+{tree.missedDays === 0 ? '1.000 g / 1 kg' : '500 g / 0.5 kg'})
                    </span>
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={busy || pet.isSleeping || pet.isExhausted || tree.wateringsToday >= 3}
                    onClick={() => void runAction({ action: 'water_tree' }, 'water')}
                    className="w-full min-h-[46px] px-4 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-zinc-950 text-xs font-bold inline-flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Droplets className="w-4 h-4" />
                    <span>
                      {tree.wateringsToday >= 3
                        ? 'Sudah Disiram 3x Hari Ini (Tunggu Besok)'
                        : `Siram Pohon (${tree.wateringsToday}/3) · -14 Energi`}
                    </span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Tab 3: Inventory (Max 1kg Buah + Snack + Claimed Vouchers) */}
          {rightTab === 'inventory' && (
            <div className="space-y-4">
              <div className="rounded-xl bg-[#0E0E13] border border-white/10 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white inline-flex items-center gap-2">
                    <Package className="w-4 h-4 text-pink-400" />
                    Keranjang Buah Panen
                  </span>
                  <span className="font-mono-tabular text-xs font-bold text-pink-300">
                    {inventory.fruitGrams} g / 1.000 g (1 kg maks)
                  </span>
                </div>
                <div className="h-3 rounded-full bg-white/10 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-pink-500 to-rose-400 transition-all duration-300"
                    style={{ width: `${fruitPct}%` }}
                  />
                </div>
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="text-zinc-400">
                    {inventory.fruitGrams >= MAX_FRUIT_GRAMS
                      ? 'Penuh 1 kg! Siap dijual ke Toko NPC untuk klaim hadiah.'
                      : `Kurang ${MAX_FRUIT_GRAMS - inventory.fruitGrams} g lagi untuk penuh 1 kg.`}
                  </span>
                  {inventory.fruitGrams >= MAX_FRUIT_GRAMS && (
                    <button
                      type="button"
                      onClick={() => setRightTab('shop')}
                      className="px-3 py-1.5 rounded-lg bg-pink-500 text-zinc-950 font-semibold cursor-pointer shrink-0"
                    >
                      Ke Toko NPC
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-xs font-semibold text-zinc-300">Stok Makanan di Tas</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {SNACK_CATALOG.map((snack) => (
                    <div
                      key={snack.id}
                      className="rounded-xl bg-[#0E0E13] border border-white/10 p-2.5 text-center"
                    >
                      <p className="text-[11px] font-semibold text-white truncate">{snack.name}</p>
                      <p className="font-mono-tabular text-xs text-amber-300 mt-0.5">
                        {snack.id === 'berry' ? 'Tak Terbatas' : `${inventory.snacks[snack.id] ?? 0} pcs`}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-white/[0.08]">
                <h3 className="text-xs font-semibold text-zinc-300">
                  Hadiah yang Sudah Diklaim ({claimedHistory.length})
                </h3>
                {claimedHistory.length === 0 ? (
                  <p className="text-xs text-zinc-500">
                    Belum ada hadiah yang diklaim. Panen & jual 1 kg buah ke Toko NPC untuk klaim 1 hadiah!
                  </p>
                ) : (
                  <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
                    {claimedHistory.map((item) => (
                      <div
                        key={item.id}
                        className="rounded-xl bg-emerald-500/10 border border-emerald-400/25 px-3.5 py-2.5 flex items-center justify-between gap-2"
                      >
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-emerald-200 truncate">
                            {item.rewardTitle}
                          </p>
                          <p className="text-[11px] text-zinc-400">
                            Diklaim oleh {item.claimedBy} ·{' '}
                            {new Date(item.claimedAt).toLocaleDateString('id-ID', {
                              day: 'numeric',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                        </div>
                        <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tab 4: Toko NPC (Jual 1 kg Buah -> Klaim 1 dari 3 Hadiah + Beli Snack) */}
          {rightTab === 'shop' && (
            <div className="space-y-5">
              {/* NPC Shopkeeper Banner */}
              <div className="rounded-xl bg-[#0E0E13] border border-white/10 p-4 flex flex-col sm:flex-row items-center gap-4">
                <div className="shrink-0">
                  <NpcShopVisualSvg />
                </div>
                <div className="space-y-2 flex-1">
                  <p className="text-xs font-bold text-pink-300">
                    Toko Buah Tuan Rubah (NPC)
                  </p>
                  <p className="text-xs text-zinc-300 leading-relaxed">
                    “Bawa 1 kg (1.000 g) buah segar hasil kebun beruangmu ke sini! Aku beli seharga {FRUIT_SELL_COINS} koin plus 1 Tiket Klaim untuk pilih 1 dari 3 hadiah spesial!”
                  </p>
                  <button
                    type="button"
                    disabled={busy || inventory.fruitGrams < MAX_FRUIT_GRAMS}
                    onClick={() => void runAction({ action: 'sell_fruit' })}
                    className="min-h-[40px] px-4 py-2 rounded-xl bg-pink-500 hover:bg-pink-400 disabled:opacity-45 text-zinc-950 text-xs font-bold inline-flex items-center gap-2 cursor-pointer"
                  >
                    <ShoppingBag className="w-4 h-4" />
                    <span>
                      {inventory.fruitGrams >= MAX_FRUIT_GRAMS
                        ? `Jual 1 kg Buah (+${FRUIT_SELL_COINS} Koin & +1 Tiket)`
                        : `Butuh 1 kg (${inventory.fruitGrams}/1.000 g)`}
                    </span>
                  </button>
                </div>
              </div>

              {/* Claim 1 of 3 Admin Rewards */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-white inline-flex items-center gap-1.5">
                    <Gift className="w-4 h-4 text-pink-400" />
                    <span>Pilih 1 dari 3 Hadiah Spesial</span>
                  </h3>
                  <span className="text-xs font-semibold text-emerald-300 tabular-nums">
                    Tiket Kamu: {inventory.claimTickets}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {rewards.map((rew, idx) => (
                    <div
                      key={rew.id}
                      className={`rounded-xl border p-3.5 flex flex-col justify-between gap-3 ${
                        inventory.claimTickets >= 1
                          ? 'bg-pink-500/10 border-pink-400/40'
                          : 'bg-[#0E0E13] border-white/10 opacity-85'
                      }`}
                    >
                      <div className="space-y-1">
                        <p className="text-[11px] font-semibold text-pink-300">
                          Hadiah {idx + 1}
                        </p>
                        <p className="text-xs font-bold text-white leading-snug break-words">
                          {rew.title}
                        </p>
                      </div>
                      <button
                        type="button"
                        disabled={busy || inventory.claimTickets < 1}
                        onClick={() => void runAction({ action: 'claim_reward', rewardId: rew.id })}
                        className="w-full min-h-[36px] px-3 py-1.5 rounded-lg bg-pink-500 hover:bg-pink-400 disabled:bg-white/10 disabled:text-zinc-500 text-zinc-950 text-xs font-bold cursor-pointer"
                      >
                        {inventory.claimTickets >= 1 ? 'Klaim Hadiah Ini' : 'Terkunci (Butuh 1 Tiket)'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Buy Extra Bear Snacks */}
              <div className="space-y-2.5 pt-2 border-t border-white/[0.08]">
                <h3 className="text-xs font-semibold text-zinc-300">
                  Beli Makanan Beruang (Koin Kamu: {inventory.coins})
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {SNACK_CATALOG.filter((s) => s.priceCoins > 0).map((snack) => (
                    <button
                      key={snack.id}
                      type="button"
                      disabled={busy || inventory.coins < snack.priceCoins}
                      onClick={() => void runAction({ action: 'buy_snack', snackId: snack.id })}
                      className="p-3 rounded-xl bg-[#0E0E13] hover:bg-amber-500/10 border border-white/10 hover:border-amber-400/40 disabled:opacity-45 text-left transition-colors cursor-pointer space-y-1"
                    >
                      <div className="text-xs font-bold text-white">{snack.name}</div>
                      <div className="text-[11px] text-amber-300 font-mono-tabular font-semibold">
                        {snack.priceCoins} Koin
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
