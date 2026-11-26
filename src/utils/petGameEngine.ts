import type {
  AdminRewardOption,
  BearGrowthStage,
  BearPetState,
  BearSnackId,
  ClaimedRewardRecord,
  InventoryState,
  PetGameState,
  TreeMissionState,
} from '../types';

export interface SnackCatalogItem {
  id: BearSnackId;
  name: string;
  description: string;
  hungerGain: number;
  happinessGain: number;
  energyGain: number;
  priceCoins: number;
}

export const SNACK_CATALOG: SnackCatalogItem[] = [
  {
    id: 'berry',
    name: 'Buah Berry Segar',
    description: 'Camilan harian gratis (+22 Kenyang, +6 Bahagia)',
    hungerGain: 22,
    happinessGain: 6,
    energyGain: 2,
    priceCoins: 0,
  },
  {
    id: 'bread',
    name: 'Roti Susu Hangat',
    description: 'Roti lembut (+35 Kenyang, +10 Bahagia)',
    hungerGain: 35,
    happinessGain: 10,
    energyGain: 5,
    priceCoins: 20,
  },
  {
    id: 'honey',
    name: 'Madu Hutan Emas',
    description: 'Favorit beruang (+45 Kenyang, +20 Bahagia, +10 Energi)',
    hungerGain: 45,
    happinessGain: 20,
    energyGain: 10,
    priceCoins: 40,
  },
  {
    id: 'salmon',
    name: 'Salmon Panggang',
    description: 'Porsi besar (+65 Kenyang, +25 Bahagia, +14 Energi)',
    hungerGain: 65,
    happinessGain: 25,
    energyGain: 14,
    priceCoins: 65,
  },
];

export const DEFAULT_ADMIN_REWARDS: AdminRewardOption[] = [
  { id: 'reward-1', title: 'Traktir Kopi / Boba Favorit' },
  { id: 'reward-2', title: 'Pilih Film Movie Night Berdua' },
  { id: 'reward-3', title: 'Voucher Peluk & Pijat 15 Menit' },
];

export const DEFAULT_MILESTONE_REWARDS: AdminRewardOption[] = [
  { id: 'ms-1', title: 'Traktir Es Krim / Dessert Manis' },
  { id: 'ms-2', title: 'Request Lagu / Voice Note Romantis' },
  { id: 'ms-3', title: 'Bebas Pilih Menu Makan Malam Berdua' },
  { id: 'ms-4', title: 'Kartu Ucapan Spesial + Peluk Hangat' },
];

export const MAX_FRUIT_GRAMS = 1000; // 1 kg maksimal
export const FRUIT_SELL_COINS = 150;

// Real-time slow pacing & anti-farming cooldowns
export const XP_PER_LEVEL = 200; // Lv 10 = 1.800 XP, Lv 20 = 3.800 XP, Lv 30 = 5.800 XP
export const SLEEP_ENERGY_PER_MIN = 1; // 1 menit tidur = +1% energi (100 menit untuk 0->100%)
export const SLEEP_XP_MIN_MS = 30 * 60 * 1000; // Minimal tidur 30 menit baru dapat bonus XP bangun

export const FEED_COOLDOWN_MS = 30 * 60 * 1000; // 30 menit antar makan
export const BATH_COOLDOWN_MS = 60 * 60 * 1000; // 1 jam antar mandi
export const PLAY_COOLDOWN_MS = 45 * 60 * 1000; // 45 menit antar main
export const MAX_WATERINGS_PER_DAY = 2; // 2x sehari
export const TREE_WATER_COOLDOWN_MS = 8 * 60 * 60 * 1000; // 8 jam antara siraman 1 dan 2

export function clampStat(val: number): number {
  const clamped = Math.max(0, Math.min(100, val));
  return Math.round(clamped * 100) / 100;
}

export function computeLevelFromXp(xp: number): number {
  const safeXp = Math.max(0, Math.floor(xp));
  return Math.floor(safeXp / XP_PER_LEVEL) + 1;
}

export function computeGrowthStage(level: number): BearGrowthStage {
  if (level >= 15) return 'adult';
  if (level >= 5) return 'teen';
  return 'baby';
}

export function formatRemainingDuration(ms: number): string {
  const totalSec = Math.max(0, Math.ceil(ms / 1000));
  const hours = Math.floor(totalSec / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;
  if (hours > 0) {
    return `${hours}j ${minutes}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds}d`;
  }
  return `${seconds}d`;
}

export function formatServerTodayISO(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function calendarDaysBetween(fromDateStr: string, toDateStr: string): number {
  const [fy, fm, fd] = fromDateStr.split('-').map(Number);
  const [ty, tm, td] = toDateStr.split('-').map(Number);
  if (!fy || !fm || !fd || !ty || !tm || !td) return 0;
  const fromMs = Date.UTC(fy, fm - 1, fd);
  const toMs = Date.UTC(ty, tm - 1, td);
  return Math.max(0, Math.floor((toMs - fromMs) / (1000 * 60 * 60 * 24)));
}

export function createInitialPetGameState(todayStr = formatServerTodayISO()): PetGameState {
  const now = Date.now();
  return {
    pet: {
      name: 'Kuma',
      xp: 0,
      level: 1,
      stage: 'baby',
      hunger: 85,
      hygiene: 90,
      energy: 85,
      happiness: 85,
      isSleeping: false,
      isExhausted: false,
      lastUpdatedAt: now,
      lastFedAt: 0,
      lastBathedAt: 0,
      lastPlayedAt: 0,
      sleepStartedAt: 0,
      lastMilestoneLevelRewarded: 0,
    },
    tree: {
      plantedDate: todayStr,
      lastCalendarDate: todayStr,
      cycleDay: 1,
      wateringsToday: 0,
      missedDays: 0,
      status: 'growing',
      totalHarvests: 0,
      lastWateredAt: 0,
    },
    inventory: {
      fruitGrams: 0,
      coins: 40,
      claimTickets: 0,
      snacks: {
        berry: 99,
        bread: 2,
        honey: 1,
        salmon: 0,
      },
    },
    rewards: DEFAULT_ADMIN_REWARDS.map((r) => ({ ...r })),
    milestoneRewards: DEFAULT_MILESTONE_REWARDS.map((r) => ({ ...r })),
    claimedHistory: [],
    updatedAt: now,
  };
}

export function normalizePetGameState(
  raw: unknown,
  todayStr = formatServerTodayISO()
): PetGameState {
  const base = createInitialPetGameState(todayStr);
  if (!raw || typeof raw !== 'object') return base;
  const r = raw as Partial<PetGameState>;

  const rawPet = (r.pet ?? {}) as Partial<BearPetState>;
  const xp =
    typeof rawPet.xp === 'number' && Number.isFinite(rawPet.xp)
      ? Math.max(0, Math.round(rawPet.xp))
      : 0;
  const level = computeLevelFromXp(xp);
  const energy = clampStat(typeof rawPet.energy === 'number' ? rawPet.energy : base.pet.energy);
  const isSleeping = Boolean(rawPet.isSleeping);
  const isExhausted = isSleeping ? false : energy <= 20 || Boolean(rawPet.isExhausted && energy < 50);

  const pet: BearPetState = {
    name:
      typeof rawPet.name === 'string' && rawPet.name.trim().length > 0
        ? rawPet.name.trim().slice(0, 24)
        : base.pet.name,
    xp,
    level,
    stage: computeGrowthStage(level),
    hunger: clampStat(typeof rawPet.hunger === 'number' ? rawPet.hunger : base.pet.hunger),
    hygiene: clampStat(typeof rawPet.hygiene === 'number' ? rawPet.hygiene : base.pet.hygiene),
    energy,
    happiness: clampStat(typeof rawPet.happiness === 'number' ? rawPet.happiness : base.pet.happiness),
    isSleeping,
    isExhausted,
    lastUpdatedAt:
      typeof rawPet.lastUpdatedAt === 'number' && Number.isFinite(rawPet.lastUpdatedAt)
        ? rawPet.lastUpdatedAt
        : Date.now(),
    lastFedAt:
      typeof rawPet.lastFedAt === 'number' && Number.isFinite(rawPet.lastFedAt)
        ? rawPet.lastFedAt
        : 0,
    lastBathedAt:
      typeof rawPet.lastBathedAt === 'number' && Number.isFinite(rawPet.lastBathedAt)
        ? rawPet.lastBathedAt
        : 0,
    lastPlayedAt:
      typeof rawPet.lastPlayedAt === 'number' && Number.isFinite(rawPet.lastPlayedAt)
        ? rawPet.lastPlayedAt
        : 0,
    sleepStartedAt:
      typeof rawPet.sleepStartedAt === 'number' && Number.isFinite(rawPet.sleepStartedAt)
        ? rawPet.sleepStartedAt
        : 0,
    lastMilestoneLevelRewarded:
      typeof rawPet.lastMilestoneLevelRewarded === 'number' &&
      Number.isFinite(rawPet.lastMilestoneLevelRewarded)
        ? Math.max(0, Math.floor(rawPet.lastMilestoneLevelRewarded / 10) * 10)
        : 0,
  };

  const rawTree = (r.tree ?? {}) as Partial<TreeMissionState>;
  const validStatus =
    rawTree.status === 'growing' ||
    rawTree.status === 'wilting' ||
    rawTree.status === 'dead' ||
    rawTree.status === 'fruiting'
      ? rawTree.status
      : 'growing';

  const tree: TreeMissionState = {
    plantedDate:
      typeof rawTree.plantedDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(rawTree.plantedDate)
        ? rawTree.plantedDate
        : todayStr,
    lastCalendarDate:
      typeof rawTree.lastCalendarDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(rawTree.lastCalendarDate)
        ? rawTree.lastCalendarDate
        : todayStr,
    cycleDay:
      typeof rawTree.cycleDay === 'number' && Number.isFinite(rawTree.cycleDay)
        ? Math.max(1, Math.round(rawTree.cycleDay))
        : 1,
    wateringsToday:
      typeof rawTree.wateringsToday === 'number' && Number.isFinite(rawTree.wateringsToday)
        ? Math.max(0, Math.min(MAX_WATERINGS_PER_DAY, Math.round(rawTree.wateringsToday)))
        : 0,
    missedDays:
      typeof rawTree.missedDays === 'number' && Number.isFinite(rawTree.missedDays)
        ? Math.max(0, Math.round(rawTree.missedDays))
        : 0,
    status: validStatus,
    totalHarvests:
      typeof rawTree.totalHarvests === 'number' && Number.isFinite(rawTree.totalHarvests)
        ? Math.max(0, Math.round(rawTree.totalHarvests))
        : 0,
    lastWateredAt:
      typeof rawTree.lastWateredAt === 'number' && Number.isFinite(rawTree.lastWateredAt)
        ? rawTree.lastWateredAt
        : 0,
  };

  const rawInv = (r.inventory ?? {}) as Partial<InventoryState>;
  const rawSnacks = (rawInv.snacks ?? {}) as Partial<Record<BearSnackId, number>>;
  const inventory: InventoryState = {
    fruitGrams:
      typeof rawInv.fruitGrams === 'number' && Number.isFinite(rawInv.fruitGrams)
        ? Math.max(0, Math.min(MAX_FRUIT_GRAMS, Math.round(rawInv.fruitGrams)))
        : 0,
    coins:
      typeof rawInv.coins === 'number' && Number.isFinite(rawInv.coins)
        ? Math.max(0, Math.round(rawInv.coins))
        : 40,
    claimTickets:
      typeof rawInv.claimTickets === 'number' && Number.isFinite(rawInv.claimTickets)
        ? Math.max(0, Math.round(rawInv.claimTickets))
        : 0,
    snacks: {
      berry: 99,
      bread: typeof rawSnacks.bread === 'number' ? Math.max(0, Math.round(rawSnacks.bread)) : 2,
      honey: typeof rawSnacks.honey === 'number' ? Math.max(0, Math.round(rawSnacks.honey)) : 1,
      salmon: typeof rawSnacks.salmon === 'number' ? Math.max(0, Math.round(rawSnacks.salmon)) : 0,
    },
  };

  const rewards: AdminRewardOption[] =
    Array.isArray(r.rewards) && r.rewards.length === 3
      ? r.rewards.map((item, idx) => ({
          id: `reward-${idx + 1}`,
          title:
            typeof item?.title === 'string' && item.title.trim().length > 0
              ? item.title.trim().slice(0, 120)
              : DEFAULT_ADMIN_REWARDS[idx].title,
        }))
      : DEFAULT_ADMIN_REWARDS.map((item) => ({ ...item }));

  const milestoneRewards: AdminRewardOption[] =
    Array.isArray(r.milestoneRewards) && r.milestoneRewards.length >= 1
      ? r.milestoneRewards
          .filter((item) => item && typeof item.title === 'string' && item.title.trim().length > 0)
          .slice(0, 10)
          .map((item, idx) => ({
            id: `ms-${idx + 1}`,
            title: item.title.trim().slice(0, 120),
          }))
      : DEFAULT_MILESTONE_REWARDS.map((item) => ({ ...item }));

  const finalMilestoneRewards =
    milestoneRewards.length > 0
      ? milestoneRewards
      : DEFAULT_MILESTONE_REWARDS.map((item) => ({ ...item }));

  const claimedHistory: ClaimedRewardRecord[] = Array.isArray(r.claimedHistory)
    ? r.claimedHistory
        .filter(
          (c): c is ClaimedRewardRecord =>
            Boolean(c && typeof c.id === 'string' && typeof c.rewardTitle === 'string' && typeof c.claimedBy === 'string')
        )
        .slice(0, 60)
    : [];

  return {
    pet,
    tree,
    inventory,
    rewards,
    milestoneRewards: finalMilestoneRewards,
    claimedHistory,
    updatedAt: typeof r.updatedAt === 'number' && Number.isFinite(r.updatedAt) ? r.updatedAt : Date.now(),
  };
}

/**
 * Advances Pou stats at realistic multi-hour pacing:
 * - Sleeping recovers +1% energy per 1 minute (100 minutes for 0 -> 100%)
 * - Awake stats decay gradually over ~6-9 hours
 * - Tree checks 2x/day watering (with 8h gap enforced on action) over a 3-day cycle
 */
export function advancePetAndTreeTime(
  state: PetGameState,
  todayStr: string,
  nowMs = Date.now(),
  forcedDaysAdvance = 0
): PetGameState {
  const pet = { ...state.pet };
  const tree = { ...state.tree };

  const elapsedMs = Math.max(0, nowMs - pet.lastUpdatedAt);
  const elapsedMinutes = Math.min(24 * 60, elapsedMs / 60000);

  if (elapsedMs >= 15000) {
    if (pet.isSleeping) {
      // 1 minute sleep = +1% energy
      const gained = elapsedMinutes * SLEEP_ENERGY_PER_MIN;
      pet.energy = clampStat(pet.energy + gained);
      pet.hunger = clampStat(pet.hunger - elapsedMinutes * 0.08);
      pet.hygiene = clampStat(pet.hygiene - elapsedMinutes * 0.05);
      if (pet.energy >= 100) {
        pet.energy = 100;
        pet.isSleeping = false;
        pet.isExhausted = false;
      }
    } else {
      // Multi-hour realistic awake decay (~6-9 hours from full to empty)
      pet.hunger = clampStat(pet.hunger - elapsedMinutes * 0.22);
      pet.hygiene = clampStat(pet.hygiene - elapsedMinutes * 0.18);
      pet.energy = clampStat(pet.energy - elapsedMinutes * 0.2);
      const moodDecay =
        pet.hunger < 25 || pet.hygiene < 25 || pet.energy <= 20 ? 0.35 : 0.14;
      pet.happiness = clampStat(pet.happiness - elapsedMinutes * moodDecay);
      if (pet.energy <= 20) {
        pet.isExhausted = true;
      }
    }
    pet.lastUpdatedAt = nowMs;
  }

  // Tree day rollover (requires 2 waterings/day)
  const calendarDiff =
    forcedDaysAdvance > 0
      ? forcedDaysAdvance
      : calendarDaysBetween(tree.lastCalendarDate, todayStr);

  if (calendarDiff > 0) {
    for (let step = 0; step < Math.min(calendarDiff, 10); step++) {
      if (tree.status !== 'dead' && tree.status !== 'fruiting') {
        if (tree.wateringsToday < MAX_WATERINGS_PER_DAY) {
          tree.missedDays += 1;
        }
        tree.cycleDay += 1;
        tree.wateringsToday = 0;

        if (tree.missedDays >= 2) {
          tree.status = 'dead';
        } else if (tree.missedDays === 1) {
          tree.status = 'wilting';
        } else {
          tree.status = 'growing';
        }
      } else if (tree.status === 'fruiting') {
        tree.wateringsToday = 0;
      }
    }
    tree.lastCalendarDate = todayStr;
  }

  pet.level = computeLevelFromXp(pet.xp);
  pet.stage = computeGrowthStage(pet.level);

  return {
    ...state,
    pet,
    tree,
    updatedAt: nowMs,
  };
}
