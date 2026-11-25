export type PartnerSlot = 'partner1' | 'partner2';
export type ScheduleOwner = PartnerSlot | 'together';
export type DayKey = 'yesterday' | 'today' | 'tomorrow';
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
  date: string; // YYYY-MM-DD
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
}

export interface AuthenticatedUser {
  slot: PartnerSlot;
  name: string;
  role: PartnerRole;
}

export interface FreeSlot {
  startTime: string;
  endTime: string;
  durationMinutes: number;
}

export type FreeForOwner = 'both' | 'partner1' | 'partner2';

export interface AvailabilitySlot extends FreeSlot {
  freeFor: FreeForOwner;
}
