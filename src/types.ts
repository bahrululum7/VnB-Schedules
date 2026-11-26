export type PartnerSlot = 'partner1' | 'partner2';
export type ScheduleOwner = PartnerSlot | 'together';
export type DayKey = 'yesterday' | 'continuous';
export type EditableDayKey = 'today' | 'tomorrow';
export type ActivityCategory =
  | 'kuliah'
  | 'kerja'
  | 'belajar'
  | 'quality_time'
  | 'lainnya';

export type PartnerRole = 'partner1' | 'partner2';

export interface PartnerProfile {
  slot: PartnerSlot;
  name: string;
  role: PartnerRole;
  online: boolean;
}

export interface ScheduleItem {
  id: string;
  date: string; // Start date YYYY-MM-DD
  endDate?: string; // End date YYYY-MM-DD (defaults to date; next day for overnight e.g. 22:00 -> 03:00)
  owner: ScheduleOwner;
  title: string;
  category: ActivityCategory;
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  createdBy: string;
  createdAt: number;
}

export interface SpinnerOption {
  id: string;
  label: string;
  addedBy: string;
}

export interface SpinEvent {
  id: string;
  winnerId: string;
  winnerLabel: string;
  winnerIndex: number;
  spunBy: string;
  spunAt: number;
}

export interface DayConfirmationState {
  partner1: boolean;
  partner2: boolean;
}

export interface DayConfirmationTimestamps {
  partner1: number;
  partner2: number;
}

export type BearGrowthStage = 'baby' | 'teen' | 'adult';
export type TreeHealthStatus = 'growing' | 'wilting' | 'dead' | 'fruiting';

export type BearSnackId = 'berry' | 'bread' | 'honey' | 'salmon';

export interface BearPetState {
  name: string;
  xp: number;
  level: number;
  stage: BearGrowthStage;
  hunger: number; // 0..100 (100 = kenyang)
  hygiene: number; // 0..100 (100 = bersih)
  energy: number; // 0..100 (100 = bugar)
  happiness: number; // 0..100 (100 = bahagia)
  isSleeping: boolean;
  isExhausted: boolean;
  lastUpdatedAt: number;
  lastFedAt: number;
  lastBathedAt: number;
  lastPlayedAt: number;
  sleepStartedAt: number;
  lastLevelCheckDate: string; // YYYY-MM-DD for 1-day = +1 level check
  lastMilestoneLevelRewarded: number; // 0, 10, 20, 30...
}

export interface TreeMissionState {
  plantedDate: string; // YYYY-MM-DD
  lastCalendarDate: string; // YYYY-MM-DD
  cycleDay: number; // 1..3+
  wateringsToday: number; // 0..2
  missedDays: number; // 0..2+ (1 = melayu, >=2 = mati)
  status: TreeHealthStatus;
  totalHarvests: number;
  lastWateredAt: number;
}

export interface InventoryState {
  fruitGrams: number; // 0..1000 (1 kg max)
  coins: number;
  claimTickets: number;
  snacks: Record<BearSnackId, number>;
}

export interface AdminRewardOption {
  id: string;
  title: string;
}

export interface ClaimedRewardRecord {
  id: string;
  rewardId: string;
  rewardTitle: string;
  claimedBy: string;
  claimedAt: number;
  source?: 'npc_harvest' | 'level_milestone';
  milestoneLevel?: number;
}

export interface PetGameState {
  pet: BearPetState;
  tree: TreeMissionState;
  inventory: InventoryState;
  rewards: AdminRewardOption[]; // 3 hadiah Toko NPC (jual 1 kg buah)
  milestoneRewards: AdminRewardOption[]; // Hadiah random Level 10, 20, 30 dst.
  claimedHistory: ClaimedRewardRecord[];
  updatedAt: number;
}

export interface SharedWorkspaceState {
  revision?: number;
  partners: {
    partner1: PartnerProfile;
    partner2: PartnerProfile;
  };
  schedules: ScheduleItem[];
  deletedScheduleIds?: string[];
  confirmedByDate: Record<string, DayConfirmationState>;
  confirmedUpdatedAt?: Record<string, DayConfirmationTimestamps>;
  spinnerOptions: SpinnerOption[];
  lastSpin: SpinEvent | null;
  petGame?: PetGameState;
}

export interface AuthenticatedUser {
  slot: PartnerSlot;
  name: string;
  role: PartnerRole;
}

export interface FreeSlot {
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
}

export type FreeForOwner = 'both' | 'partner1' | 'partner2';

export interface AvailabilitySlot extends FreeSlot {
  freeFor: FreeForOwner;
}
