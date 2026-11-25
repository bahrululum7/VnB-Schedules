import type {
  DayConfirmationState,
  DayConfirmationTimestamps,
  PartnerSlot,
  ScheduleItem,
  SharedWorkspaceState,
  SpinnerOption,
} from '../types';
import { timeToMinutes } from './freeTime';

const CACHE_KEY = 'vnb_workspace_cache_v3';

export function loadCachedWorkspace(): SharedWorkspaceState | null {
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<SharedWorkspaceState>;
    if (!parsed || !parsed.partners || !Array.isArray(parsed.schedules)) {
      return null;
    }
    return {
      revision: typeof parsed.revision === 'number' ? parsed.revision : 0,
      partners: parsed.partners,
      schedules: parsed.schedules,
      deletedScheduleIds: Array.isArray(parsed.deletedScheduleIds)
        ? parsed.deletedScheduleIds
        : [],
      confirmedByDate: parsed.confirmedByDate ?? {},
      confirmedUpdatedAt: parsed.confirmedUpdatedAt ?? {},
      spinnerOptions: Array.isArray(parsed.spinnerOptions)
        ? parsed.spinnerOptions
        : [],
      lastSpin: parsed.lastSpin ?? null,
    };
  } catch {
    return null;
  }
}

export function saveCachedWorkspace(state: SharedWorkspaceState): void {
  try {
    window.localStorage.setItem(CACHE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage quota or private browsing errors.
  }
}

export function mergeWorkspaceStates(
  localState: SharedWorkspaceState | null,
  serverState: SharedWorkspaceState,
  extraDeletedIds: Iterable<string> = []
): SharedWorkspaceState {
  if (!localState) {
    const deletedSet = new Set<string>([
      ...(serverState.deletedScheduleIds ?? []),
      ...extraDeletedIds,
    ]);
    return {
      ...serverState,
      deletedScheduleIds: Array.from(deletedSet).slice(-300),
      schedules: serverState.schedules.filter((s) => !deletedSet.has(s.id)),
    };
  }

  const deletedSet = new Set<string>([
    ...(localState.deletedScheduleIds ?? []),
    ...(serverState.deletedScheduleIds ?? []),
    ...extraDeletedIds,
  ]);
  const deletedScheduleIds = Array.from(deletedSet).slice(-300);

  const scheduleMap = new Map<string, ScheduleItem>();
  for (const item of [...localState.schedules, ...serverState.schedules]) {
    if (!deletedSet.has(item.id)) {
      scheduleMap.set(item.id, item);
    }
  }
  const schedules = Array.from(scheduleMap.values()).sort(
    (a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime)
  );

  const allDates = new Set<string>([
    ...Object.keys(localState.confirmedByDate ?? {}),
    ...Object.keys(serverState.confirmedByDate ?? {}),
  ]);
  const confirmedByDate: Record<string, DayConfirmationState> = {};
  const confirmedUpdatedAt: Record<string, DayConfirmationTimestamps> = {};

  for (const dateKey of allDates) {
    const lConf = localState.confirmedByDate?.[dateKey] ?? {
      partner1: false,
      partner2: false,
    };
    const sConf = serverState.confirmedByDate?.[dateKey] ?? {
      partner1: false,
      partner2: false,
    };
    const lTs = localState.confirmedUpdatedAt?.[dateKey] ?? {
      partner1: lConf.partner1 ? 1 : 0,
      partner2: lConf.partner2 ? 1 : 0,
    };
    const sTs = serverState.confirmedUpdatedAt?.[dateKey] ?? {
      partner1: sConf.partner1 ? 1 : 0,
      partner2: sConf.partner2 ? 1 : 0,
    };

    const pickServer1 =
      sTs.partner1 > lTs.partner1 || (sTs.partner1 === lTs.partner1 && sConf.partner1);
    const pickServer2 =
      sTs.partner2 > lTs.partner2 || (sTs.partner2 === lTs.partner2 && sConf.partner2);

    confirmedByDate[dateKey] = {
      partner1: pickServer1 ? sConf.partner1 : lConf.partner1,
      partner2: pickServer2 ? sConf.partner2 : lConf.partner2,
    };
    confirmedUpdatedAt[dateKey] = {
      partner1: Math.max(lTs.partner1, sTs.partner1),
      partner2: Math.max(lTs.partner2, sTs.partner2),
    };
  }

  const pickPartnerName = (localName: string, serverName: string, num: '1' | '2') => {
    const def = `Pasangan ${num}`;
    if (serverName && serverName !== def) return serverName;
    if (localName && localName !== def) return localName;
    return def;
  };

  const spinOptMap = new Map<string, SpinnerOption>();
  for (const opt of [...localState.spinnerOptions, ...serverState.spinnerOptions]) {
    spinOptMap.set(opt.id, opt);
  }

  const lastSpin =
    (serverState.lastSpin?.spunAt ?? 0) >= (localState.lastSpin?.spunAt ?? 0)
      ? serverState.lastSpin
      : localState.lastSpin;

  return {
    revision: Math.max(localState.revision ?? 0, serverState.revision ?? 0),
    partners: {
      partner1: {
        ...serverState.partners.partner1,
        name: pickPartnerName(
          localState.partners.partner1.name,
          serverState.partners.partner1.name,
          '1'
        ),
      },
      partner2: {
        ...serverState.partners.partner2,
        name: pickPartnerName(
          localState.partners.partner2.name,
          serverState.partners.partner2.name,
          '2'
        ),
      },
    },
    schedules,
    deletedScheduleIds,
    confirmedByDate,
    confirmedUpdatedAt,
    spinnerOptions:
      spinOptMap.size > 0
        ? Array.from(spinOptMap.values())
        : serverState.spinnerOptions,
    lastSpin,
  };
}

export function findUnsyncedLocalDelta(
  mergedState: SharedWorkspaceState,
  serverState: SharedWorkspaceState,
  userSlot: PartnerSlot
): {
  schedules: ScheduleItem[];
  deletedIds: string[];
  confirmations: Record<string, { confirmed: boolean; updatedAt: number }>;
} | null {
  const serverScheduleIds = new Set(serverState.schedules.map((s) => s.id));
  const serverDeletedIds = new Set(serverState.deletedScheduleIds ?? []);

  const missingSchedules = mergedState.schedules.filter(
    (item) =>
      (item.owner === userSlot || item.owner === 'together') &&
      !serverScheduleIds.has(item.id) &&
      !serverDeletedIds.has(item.id)
  );

  const pendingDeletes = (mergedState.deletedScheduleIds ?? []).filter(
    (delId) => !serverDeletedIds.has(delId)
  );

  const confirmations: Record<string, { confirmed: boolean; updatedAt: number }> = {};
  for (const [dateKey, conf] of Object.entries(mergedState.confirmedByDate ?? {})) {
    const mergedTs = mergedState.confirmedUpdatedAt?.[dateKey]?.[userSlot] ?? 0;
    const serverTs = serverState.confirmedUpdatedAt?.[dateKey]?.[userSlot] ?? 0;
    if (mergedTs > serverTs) {
      confirmations[dateKey] = {
        confirmed: conf[userSlot],
        updatedAt: mergedTs,
      };
    }
  }

  if (
    missingSchedules.length === 0 &&
    pendingDeletes.length === 0 &&
    Object.keys(confirmations).length === 0
  ) {
    return null;
  }

  return {
    schedules: missingSchedules,
    deletedIds: pendingDeletes,
    confirmations,
  };
}
