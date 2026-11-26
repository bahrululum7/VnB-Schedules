import 'dotenv/config';
import express from 'express';
import crypto from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';
import type {
  ActivityCategory,
  AuthenticatedUser,
  BearSnackId,
  DayConfirmationState,
  DayConfirmationTimestamps,
  PartnerRole,
  PartnerSlot,
  PetGameState,
  ScheduleItem,
  ScheduleOwner,
  SharedWorkspaceState,
  SpinnerOption,
} from './src/types.ts';
import {
  FRUIT_SELL_COINS,
  MAX_FRUIT_GRAMS,
  SNACK_CATALOG,
  advancePetAndTreeTime,
  clampStat,
  computeGrowthStage,
  createInitialPetGameState,
  formatServerTodayISO,
  normalizePetGameState,
} from './src/utils/petGameEngine.ts';

const PORT = Number(process.env.PORT) || 3000;
const STATE_FILE = path.join(os.tmpdir(), 'vnb-schedules-state-v3.json');
const KV_KEY = 'vnb_schedules_workspace_v3';

// Salted scrypt verifier for the couple passcode so no plaintext secret is stored in source.
const PASSCODE_SALT = 'vnb_couple_salt_v1';
const DEFAULT_PASSCODE_SCRYPT_HEX =
  '59c66b193fe0dfe4240de2e0df51671051065edde5f208e84b3b6af1fd69ae52192ccfa1f6b4f27b3db345b7d6e5342f1901f10b70c22d3a3f0b15f0fb3f274b';

// Salted scrypt verifier for the Admin reward menu passcode.
const ADMIN_PASSCODE_SALT = 'vnb_admin_salt_v1';
const ADMIN_PASSCODE_SCRYPT_HEX =
  'f8f8760d67de427eed8e9191d92ece6472a7fe3c64be21d246768e856e89624afbf99fc811dea18cf3ee3763e11ee298072bfb388091e23b16041222c52e30a9';

// Deterministic fallback secret so tokens & cookies stay valid across Vercel serverless containers
const DERIVED_FALLBACK_SECRET = crypto
  .createHash('sha256')
  .update(`${PASSCODE_SALT}:${DEFAULT_PASSCODE_SCRYPT_HEX}:session`)
  .digest('hex');

function getSessionSecret(): string {
  return (
    process.env.SESSION_SECRET?.trim() ||
    process.env.COUPLE_PASSCODE?.trim() ||
    DERIVED_FALLBACK_SECRET
  );
}

function createSignedToken(user: AuthenticatedUser): string {
  const payload = {
    slot: user.slot,
    name: user.name,
    role: user.role,
    exp: Date.now() + 1000 * 60 * 60 * 24 * 7,
    jti: crypto.randomUUID(),
  };
  const encoded = Buffer.from(JSON.stringify(payload), 'utf-8').toString('base64url');
  const sig = crypto
    .createHmac('sha256', getSessionSecret())
    .update(encoded)
    .digest('base64url');
  return `${encoded}.${sig}`;
}

const revokedTokens = new Set<string>();

function verifySignedToken(token: string): AuthenticatedUser | null {
  if (!token || revokedTokens.has(token)) return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [encoded, sig] = parts;
  if (!encoded || !sig) return null;

  const expectedSig = crypto
    .createHmac('sha256', getSessionSecret())
    .update(encoded)
    .digest('base64url');

  const sigBuf = Buffer.from(sig);
  const expectedBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
    return null;
  }

  try {
    const parsed = JSON.parse(
      Buffer.from(encoded, 'base64url').toString('utf-8')
    ) as AuthenticatedUser & { exp?: number };
    if (!parsed.exp || Date.now() > parsed.exp) return null;
    if (parsed.slot !== 'partner1' && parsed.slot !== 'partner2') return null;
    if (typeof parsed.name !== 'string' || !parsed.name) return null;
    return {
      slot: parsed.slot,
      name: parsed.name,
      role: parsed.slot,
    };
  } catch {
    return null;
  }
}

function verifyPasscode(input: string): boolean {
  if (typeof input !== 'string' || input.length === 0 || input.length > 128) {
    return false;
  }
  const normalized = input.trim();
  const envPasscode = process.env.COUPLE_PASSCODE?.trim();

  if (envPasscode && envPasscode.length > 0) {
    const inputHash = crypto.createHash('sha256').update(normalized).digest();
    const expectedHash = crypto.createHash('sha256').update(envPasscode).digest();
    return crypto.timingSafeEqual(inputHash, expectedHash);
  }

  const derived = crypto.scryptSync(normalized, PASSCODE_SALT, 64);
  const expected = Buffer.from(DEFAULT_PASSCODE_SCRYPT_HEX, 'hex');
  return derived.length === expected.length && crypto.timingSafeEqual(derived, expected);
}

function verifyAdminPasscode(input: string): boolean {
  if (typeof input !== 'string' || input.length === 0 || input.length > 128) {
    return false;
  }
  const normalized = input.trim();
  const envAdmin = process.env.ADMIN_PASSCODE?.trim();

  if (envAdmin && envAdmin.length > 0) {
    const inputHash = crypto.createHash('sha256').update(normalized).digest();
    const expectedHash = crypto.createHash('sha256').update(envAdmin).digest();
    return crypto.timingSafeEqual(inputHash, expectedHash);
  }

  const derived = crypto.scryptSync(normalized, ADMIN_PASSCODE_SALT, 64);
  const expected = Buffer.from(ADMIN_PASSCODE_SCRYPT_HEX, 'hex');
  return derived.length === expected.length && crypto.timingSafeEqual(derived, expected);
}

function createAdminToken(slot: PartnerSlot): string {
  const payload = {
    scope: 'vnb-admin',
    slot,
    exp: Date.now() + 1000 * 60 * 60 * 12,
    jti: crypto.randomUUID(),
  };
  const encoded = Buffer.from(JSON.stringify(payload), 'utf-8').toString('base64url');
  const sig = crypto
    .createHmac('sha256', getSessionSecret())
    .update(encoded)
    .digest('base64url');
  return `${encoded}.${sig}`;
}

function verifyAdminToken(token: string, expectedSlot: PartnerSlot): boolean {
  if (!token) return false;
  const parts = token.split('.');
  if (parts.length !== 2) return false;
  const [encoded, sig] = parts;
  if (!encoded || !sig) return false;

  const expectedSig = crypto
    .createHmac('sha256', getSessionSecret())
    .update(encoded)
    .digest('base64url');
  const sigBuf = Buffer.from(sig);
  const expectedBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
    return false;
  }
  try {
    const parsed = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf-8')) as {
      scope?: string;
      slot?: string;
      exp?: number;
    };
    return (
      parsed.scope === 'vnb-admin' &&
      parsed.slot === expectedSlot &&
      typeof parsed.exp === 'number' &&
      Date.now() <= parsed.exp
    );
  } catch {
    return false;
  }
}

const DEFAULT_SPINNER_OPTIONS: SpinnerOption[] = [
  { id: 'spin-1', label: 'Nonton Film Bareng', addedBy: 'VnB' },
  { id: 'spin-2', label: 'Makan Malam via VC', addedBy: 'VnB' },
  { id: 'spin-3', label: 'Deep Talk Malam', addedBy: 'VnB' },
  { id: 'spin-4', label: 'Main Game Berdua', addedBy: 'VnB' },
  { id: 'spin-5', label: 'Sleep Call', addedBy: 'VnB' },
  { id: 'spin-6', label: 'Belajar Bareng (Silent VC)', addedBy: 'VnB' },
];

function createInitialState(): SharedWorkspaceState {
  return {
    revision: 0,
    partners: {
      partner1: {
        slot: 'partner1',
        name: 'Pasangan 1',
        role: 'partner1',
        online: false,
      },
      partner2: {
        slot: 'partner2',
        name: 'Pasangan 2',
        role: 'partner2',
        online: false,
      },
    },
    schedules: [],
    deletedScheduleIds: [],
    confirmedByDate: {},
    confirmedUpdatedAt: {},
    spinnerOptions: [...DEFAULT_SPINNER_OPTIONS],
    lastSpin: null,
    petGame: createInitialPetGameState(),
  };
}

function sanitizeConfirmedByDate(
  raw: unknown
): Record<string, DayConfirmationState> {
  if (!raw || typeof raw !== 'object') return {};
  const result: Record<string, DayConfirmationState> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(k) && v && typeof v === 'object') {
      const entry = v as { partner1?: unknown; partner2?: unknown };
      result[k] = {
        partner1: Boolean(entry.partner1),
        partner2: Boolean(entry.partner2),
      };
    }
  }
  return result;
}

function sanitizeConfirmedUpdatedAt(
  raw: unknown
): Record<string, DayConfirmationTimestamps> {
  if (!raw || typeof raw !== 'object') return {};
  const result: Record<string, DayConfirmationTimestamps> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(k) && v && typeof v === 'object') {
      const entry = v as { partner1?: unknown; partner2?: unknown };
      result[k] = {
        partner1: typeof entry.partner1 === 'number' ? entry.partner1 : 0,
        partner2: typeof entry.partner2 === 'number' ? entry.partner2 : 0,
      };
    }
  }
  return result;
}

function normalizeState(parsed: Partial<SharedWorkspaceState>): SharedWorkspaceState {
  const base = createInitialState();
  const deletedList = Array.isArray(parsed.deletedScheduleIds)
    ? parsed.deletedScheduleIds.filter((id): id is string => typeof id === 'string').slice(-300)
    : [];
  const deletedSet = new Set(deletedList);

  return {
    revision: typeof parsed.revision === 'number' ? parsed.revision : 0,
    partners: {
      partner1: {
        ...base.partners.partner1,
        ...(parsed.partners?.partner1 ?? {}),
        role: 'partner1',
        online: false,
      },
      partner2: {
        ...base.partners.partner2,
        ...(parsed.partners?.partner2 ?? {}),
        role: 'partner2',
        online: false,
      },
    },
    schedules: Array.isArray(parsed.schedules)
      ? parsed.schedules.filter(
          (s): s is ScheduleItem =>
            Boolean(
              s &&
                typeof s.id === 'string' &&
                !deletedSet.has(s.id) &&
                typeof s.date === 'string' &&
                /^\d{4}-\d{2}-\d{2}$/.test(s.date)
            )
        )
      : [],
    deletedScheduleIds: deletedList,
    confirmedByDate: sanitizeConfirmedByDate(parsed.confirmedByDate),
    confirmedUpdatedAt: sanitizeConfirmedUpdatedAt(parsed.confirmedUpdatedAt),
    spinnerOptions:
      Array.isArray(parsed.spinnerOptions) && parsed.spinnerOptions.length > 0
        ? parsed.spinnerOptions
        : [...DEFAULT_SPINNER_OPTIONS],
    lastSpin: parsed.lastSpin ?? null,
    petGame: normalizePetGameState(parsed.petGame),
  };
}

function loadStateFromDisk(): SharedWorkspaceState {
  try {
    if (fs.existsSync(STATE_FILE)) {
      const raw = fs.readFileSync(STATE_FILE, 'utf-8');
      return normalizeState(JSON.parse(raw) as Partial<SharedWorkspaceState>);
    }
  } catch {
    // Fall back to fresh state if temp state cannot be parsed.
  }
  return createInitialState();
}

function getKvConfig(): { url: string; token: string } | null {
  const url = (
    process.env.KV_REST_API_URL ||
    process.env.UPSTASH_REDIS_REST_URL ||
    ''
  ).trim();
  const token = (
    process.env.KV_REST_API_TOKEN ||
    process.env.UPSTASH_REDIS_REST_TOKEN ||
    ''
  ).trim();
  if (url && token) return { url: url.replace(/\/+$/, ''), token };
  return null;
}

async function loadStateFromKv(): Promise<SharedWorkspaceState | null> {
  const kv = getKvConfig();
  if (!kv) return null;
  try {
    const res = await fetch(`${kv.url}/get/${encodeURIComponent(KV_KEY)}`, {
      headers: { Authorization: `Bearer ${kv.token}` },
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { result?: string | null };
    if (!body.result) return null;
    return normalizeState(JSON.parse(body.result) as Partial<SharedWorkspaceState>);
  } catch {
    return null;
  }
}

async function saveStateToKv(state: SharedWorkspaceState): Promise<void> {
  const kv = getKvConfig();
  if (!kv) return;
  try {
    await fetch(`${kv.url}/set/${encodeURIComponent(KV_KEY)}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${kv.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(state),
    });
  } catch {
    // Ignore transient KV write failures; /tmp + client reconcile cover fallback.
  }
}

function mergeTwoStates(
  a: SharedWorkspaceState,
  b: SharedWorkspaceState
): SharedWorkspaceState {
  const deletedSet = new Set<string>([
    ...(a.deletedScheduleIds ?? []),
    ...(b.deletedScheduleIds ?? []),
  ]);
  const deletedScheduleIds = Array.from(deletedSet).slice(-300);

  const scheduleMap = new Map<string, ScheduleItem>();
  for (const item of [...a.schedules, ...b.schedules]) {
    if (!deletedSet.has(item.id)) {
      scheduleMap.set(item.id, item);
    }
  }
  const schedules = Array.from(scheduleMap.values()).sort(
    (x, y) => timeMinutes(x.startTime) - timeMinutes(y.startTime)
  );

  const allDates = new Set<string>([
    ...Object.keys(a.confirmedByDate ?? {}),
    ...Object.keys(b.confirmedByDate ?? {}),
  ]);
  const confirmedByDate: Record<string, DayConfirmationState> = {};
  const confirmedUpdatedAt: Record<string, DayConfirmationTimestamps> = {};

  for (const dateKey of allDates) {
    const aConf = a.confirmedByDate?.[dateKey] ?? { partner1: false, partner2: false };
    const bConf = b.confirmedByDate?.[dateKey] ?? { partner1: false, partner2: false };
    const aTs = a.confirmedUpdatedAt?.[dateKey] ?? { partner1: aConf.partner1 ? 1 : 0, partner2: aConf.partner2 ? 1 : 0 };
    const bTs = b.confirmedUpdatedAt?.[dateKey] ?? { partner1: bConf.partner1 ? 1 : 0, partner2: bConf.partner2 ? 1 : 0 };

    const useB1 = bTs.partner1 > aTs.partner1 || (bTs.partner1 === aTs.partner1 && bConf.partner1);
    const useB2 = bTs.partner2 > aTs.partner2 || (bTs.partner2 === aTs.partner2 && bConf.partner2);

    confirmedByDate[dateKey] = {
      partner1: useB1 ? bConf.partner1 : aConf.partner1,
      partner2: useB2 ? bConf.partner2 : aConf.partner2,
    };
    confirmedUpdatedAt[dateKey] = {
      partner1: Math.max(aTs.partner1, bTs.partner1),
      partner2: Math.max(aTs.partner2, bTs.partner2),
    };
  }

  const pickPartnerName = (nameA: string, nameB: string, slotNum: '1' | '2') => {
    const defaultName = `Pasangan ${slotNum}`;
    if (nameB && nameB !== defaultName) return nameB;
    if (nameA && nameA !== defaultName) return nameA;
    return defaultName;
  };

  const primarySpin =
    (b.lastSpin?.spunAt ?? 0) >= (a.lastSpin?.spunAt ?? 0) ? b.lastSpin : a.lastSpin;

  const spinOptMap = new Map<string, SpinnerOption>();
  for (const opt of [...a.spinnerOptions, ...b.spinnerOptions]) {
    spinOptMap.set(opt.id, opt);
  }

  const primaryPetGame =
    (b.petGame?.updatedAt ?? 0) >= (a.petGame?.updatedAt ?? 0)
      ? normalizePetGameState(b.petGame ?? a.petGame)
      : normalizePetGameState(a.petGame ?? b.petGame);

  return {
    revision: Math.max(a.revision ?? 0, b.revision ?? 0),
    partners: {
      partner1: {
        slot: 'partner1',
        name: pickPartnerName(a.partners.partner1.name, b.partners.partner1.name, '1'),
        role: 'partner1',
        online: false,
      },
      partner2: {
        slot: 'partner2',
        name: pickPartnerName(a.partners.partner2.name, b.partners.partner2.name, '2'),
        role: 'partner2',
        online: false,
      },
    },
    schedules,
    deletedScheduleIds,
    confirmedByDate,
    confirmedUpdatedAt,
    spinnerOptions:
      spinOptMap.size > 0
        ? Array.from(spinOptMap.values())
        : [...DEFAULT_SPINNER_OPTIONS],
    lastSpin: primarySpin,
    petGame: primaryPetGame,
  };
}

let workspaceState: SharedWorkspaceState = loadStateFromDisk();
const lastSeenAt: Record<PartnerSlot, number> = {
  partner1: 0,
  partner2: 0,
};
const ONLINE_TTL_MS = 12000;

async function persistState(): Promise<void> {
  workspaceState.revision = Math.max(Date.now(), (workspaceState.revision ?? 0) + 1);
  try {
    fs.writeFileSync(STATE_FILE, JSON.stringify(workspaceState), 'utf-8');
  } catch {
    // Ignore transient temp write failures.
  }
  await saveStateToKv(workspaceState);
}

async function syncFromExternalStorage(): Promise<void> {
  const diskState = loadStateFromDisk();
  if ((diskState.revision ?? 0) > (workspaceState.revision ?? 0)) {
    workspaceState = mergeTwoStates(workspaceState, diskState);
  }
  const kvState = await loadStateFromKv();
  if (kvState && (kvState.revision ?? 0) > (workspaceState.revision ?? 0)) {
    workspaceState = mergeTwoStates(workspaceState, kvState);
    try {
      fs.writeFileSync(STATE_FILE, JSON.stringify(workspaceState), 'utf-8');
    } catch {
      // Ignore temp write errors.
    }
  }
}

function recalculatePresence(): void {
  const now = Date.now();
  workspaceState.partners.partner1.online = now - lastSeenAt.partner1 < ONLINE_TTL_MS;
  workspaceState.partners.partner2.online = now - lastSeenAt.partner2 < ONLINE_TTL_MS;
}

function isValidDateStr(d: unknown): d is string {
  return typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d);
}

function addOneDayStr(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  if (!y || !m || !d) return dateStr;
  const dt = new Date(Date.UTC(y, m - 1, d + 1));
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(dt.getUTCDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

function isDateWithinServerWindow(dateStr: string): boolean {
  const [y, m, d] = dateStr.split('-').map(Number);
  if (!y || !m || !d) return false;
  const targetMs = Date.UTC(y, m - 1, d);
  const nowMs = Date.now();
  const diffDays = (targetMs - nowMs) / (1000 * 60 * 60 * 24);
  return diffDays >= -2 && diffDays <= 3;
}

function isValidTime(t: unknown): t is string {
  if (typeof t !== 'string') return false;
  return /^(([01]\d|2[0-3]):[0-5]\d|24:00)$/.test(t);
}

function timeMinutes(t: string): number {
  if (t === '24:00') return 24 * 60;
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function getDateConf(dateStr: string): DayConfirmationState {
  return (
    workspaceState.confirmedByDate[dateStr] ?? {
      partner1: false,
      partner2: false,
    }
  );
}

function isDateConfirmedByBoth(dateStr: string): boolean {
  const c = getDateConf(dateStr);
  return Boolean(c.partner1 && c.partner2);
}

const VALID_OWNERS = new Set<ScheduleOwner>(['partner1', 'partner2', 'together']);
const VALID_CATEGORIES = new Set<ActivityCategory>([
  'kuliah',
  'kerja',
  'belajar',
  'quality_time',
  'lainnya',
]);

const app = express();
app.set('etag', false);
app.use(express.json({ limit: '128kb' }));
app.use('/api', (_req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Surrogate-Control', 'no-store');
  next();
});

const COOKIE_NAME = 'vnb_session';

function parseSessionCookie(req: express.Request): string | null {
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) return null;
  const pairs = cookieHeader.split(';');
  for (const pair of pairs) {
    const eqIdx = pair.indexOf('=');
    if (eqIdx === -1) continue;
    const key = pair.slice(0, eqIdx).trim();
    if (key === COOKIE_NAME) {
      try {
        return decodeURIComponent(pair.slice(eqIdx + 1).trim());
      } catch {
        return null;
      }
    }
  }
  return null;
}

function setSessionCookie(
  req: express.Request,
  res: express.Response,
  token: string
): void {
  const proto = req.headers['x-forwarded-proto'];
  const isHttps =
    req.secure ||
    proto === 'https' ||
    req.hostname === 'localhost' ||
    req.hostname === '127.0.0.1';
  const parts = [
    `${COOKIE_NAME}=${encodeURIComponent(token)}`,
    'Path=/',
    `Max-Age=${60 * 60 * 24 * 7}`,
    'HttpOnly',
  ];
  if (isHttps) {
    parts.push('SameSite=None', 'Secure', 'Partitioned');
  } else {
    parts.push('SameSite=Lax');
  }
  res.setHeader('Set-Cookie', parts.join('; '));
}

function clearSessionCookie(req: express.Request, res: express.Response): void {
  const proto = req.headers['x-forwarded-proto'];
  const isHttps =
    req.secure ||
    proto === 'https' ||
    req.hostname === 'localhost' ||
    req.hostname === '127.0.0.1';
  const parts = [`${COOKIE_NAME}=`, 'Path=/', 'Max-Age=0', 'HttpOnly'];
  if (isHttps) {
    parts.push('SameSite=None', 'Secure', 'Partitioned');
  } else {
    parts.push('SameSite=Lax');
  }
  res.setHeader('Set-Cookie', parts.join('; '));
}

function extractAuth(req: express.Request): {
  token: string;
  source: 'bearer' | 'cookie';
} | null {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const bearer = authHeader.slice(7).trim();
    if (bearer) return { token: bearer, source: 'bearer' };
  }
  const cookieToken = parseSessionCookie(req);
  if (cookieToken) return { token: cookieToken, source: 'cookie' };
  return null;
}

function verifyCookieCsrf(req: express.Request): boolean {
  if (req.headers['x-requested-with'] === 'XMLHttpRequest') {
    return true;
  }
  const origin = req.headers.origin;
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  if (typeof origin === 'string' && typeof host === 'string') {
    try {
      const originHost = new URL(origin).host;
      return originHost === host;
    } catch {
      return false;
    }
  }
  return false;
}

interface AuthedRequest extends express.Request {
  authUser: AuthenticatedUser;
  authToken: string;
}

async function requireAuth(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
): Promise<void> {
  await syncFromExternalStorage();
  const auth = extractAuth(req);
  if (!auth) {
    res.status(401).json({ error: 'Silakan login terlebih dahulu.' });
    return;
  }
  if (
    auth.source === 'cookie' &&
    ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method) &&
    !verifyCookieCsrf(req)
  ) {
    res.status(403).json({ error: 'Permintaan tidak valid.' });
    return;
  }
  const user = verifySignedToken(auth.token);
  if (!user) {
    res.status(401).json({ error: 'Sesi login sudah berakhir, silakan masuk lagi.' });
    return;
  }
  lastSeenAt[user.slot] = Date.now();
  (req as AuthedRequest).authUser = user;
  (req as AuthedRequest).authToken = auth.token;
  next();
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.get('/api/partners-preview', async (_req, res) => {
  await syncFromExternalStorage();
  res.json({
    partner1: {
      slot: 'partner1',
      name: workspaceState.partners.partner1.name,
      role: workspaceState.partners.partner1.role,
    },
    partner2: {
      slot: 'partner2',
      name: workspaceState.partners.partner2.name,
      role: workspaceState.partners.partner2.role,
    },
  });
});

app.get('/api/auth/session', async (req, res) => {
  await syncFromExternalStorage();
  const auth = extractAuth(req);
  if (!auth) {
    res.json({ authenticated: false });
    return;
  }
  const user = verifySignedToken(auth.token);
  if (!user) {
    clearSessionCookie(req, res);
    res.json({ authenticated: false });
    return;
  }
  if (workspaceState.partners[user.slot].name.startsWith('Pasangan ')) {
    workspaceState.partners[user.slot].name = user.name;
  }
  lastSeenAt[user.slot] = Date.now();
  recalculatePresence();
  res.json({
    authenticated: true,
    token: auth.token,
    user,
    state: workspaceState,
  });
});

app.post('/api/auth/login', async (req, res) => {
  await syncFromExternalStorage();
  const { name, password, slot } = req.body as {
    name?: unknown;
    password?: unknown;
    slot?: unknown;
  };

  if (typeof name !== 'string' || name.trim().length < 1 || name.trim().length > 32) {
    res.status(400).json({ error: 'Isi nama panggilan kamu dulu ya (maks 32 huruf).' });
    return;
  }

  if (typeof password !== 'string' || !verifyPasscode(password)) {
    res.status(401).json({ error: 'Password salah nih. Coba cek lagi ya!' });
    return;
  }

  const cleanName = name.trim();
  let chosenSlot: PartnerSlot = 'partner1';
  if (slot === 'partner1' || slot === 'partner2') {
    chosenSlot = slot;
  } else if (
    workspaceState.partners.partner2.name.toLowerCase() === cleanName.toLowerCase()
  ) {
    chosenSlot = 'partner2';
  } else if (
    workspaceState.partners.partner1.name.toLowerCase() === cleanName.toLowerCase()
  ) {
    chosenSlot = 'partner1';
  } else if (
    workspaceState.partners.partner1.name !== 'Pasangan 1' &&
    workspaceState.partners.partner2.name === 'Pasangan 2'
  ) {
    chosenSlot = 'partner2';
  }

  const chosenRole: PartnerRole = chosenSlot;

  workspaceState.partners[chosenSlot] = {
    ...workspaceState.partners[chosenSlot],
    name: cleanName,
    role: chosenRole,
  };
  lastSeenAt[chosenSlot] = Date.now();

  const user: AuthenticatedUser = {
    slot: chosenSlot,
    name: cleanName,
    role: chosenRole,
  };
  const token = createSignedToken(user);

  setSessionCookie(req, res, token);
  await persistState();
  recalculatePresence();

  res.json({
    token,
    user,
    state: workspaceState,
  });
});

app.post('/api/auth/logout', requireAuth, (req, res) => {
  const { authUser, authToken } = req as AuthedRequest;
  revokedTokens.add(authToken);
  lastSeenAt[authUser.slot] = 0;
  clearSessionCookie(req, res);
  recalculatePresence();
  res.json({ ok: true });
});

app.get('/api/state', requireAuth, async (req, res) => {
  const { authUser } = req as AuthedRequest;
  if (workspaceState.partners[authUser.slot].name.startsWith('Pasangan ')) {
    workspaceState.partners[authUser.slot].name = authUser.name;
  }
  const clientToday = isValidDateStr(req.query.clientToday)
    ? req.query.clientToday
    : formatServerTodayISO();
  const currentPet = normalizePetGameState(workspaceState.petGame, clientToday);
  const advanced = advancePetAndTreeTime(currentPet, clientToday, Date.now());
  if (
    advanced.tree.lastCalendarDate !== currentPet.tree.lastCalendarDate ||
    advanced.tree.status !== currentPet.tree.status ||
    advanced.pet.energy !== currentPet.pet.energy ||
    advanced.pet.hunger !== currentPet.pet.hunger
  ) {
    workspaceState.petGame = advanced;
    await persistState();
  }
  recalculatePresence();
  res.json({ state: workspaceState });
});

/**
 * Reconciles valid client-held state (from local cache / prior serverless container)
 * into the active server container so schedules & confirmations are never dropped across cold starts.
 */
app.post('/api/state/reconcile', requireAuth, async (req, res) => {
  const { authUser } = req as AuthedRequest;
  const { schedules, deletedIds, confirmations } = (req.body ?? {}) as {
    schedules?: unknown;
    deletedIds?: unknown;
    confirmations?: unknown;
  };

  let changed = false;

  if (workspaceState.partners[authUser.slot].name.startsWith('Pasangan ')) {
    workspaceState.partners[authUser.slot].name = authUser.name;
    changed = true;
  }

  const deletedSet = new Set<string>(workspaceState.deletedScheduleIds ?? []);

  if (Array.isArray(deletedIds)) {
    for (const delId of deletedIds.slice(0, 100)) {
      if (typeof delId !== 'string' || !delId.startsWith('sch-')) continue;
      const existing = workspaceState.schedules.find((s) => s.id === delId);
      if (!deletedSet.has(delId)) {
        deletedSet.add(delId);
        changed = true;
      }
      if (existing) {
        workspaceState.schedules = workspaceState.schedules.filter((s) => s.id !== delId);
        changed = true;
      }
    }
  }

  if (confirmations && typeof confirmations === 'object') {
    workspaceState.confirmedUpdatedAt = workspaceState.confirmedUpdatedAt ?? {};
    for (const [dateKey, rawEntry] of Object.entries(
      confirmations as Record<string, unknown>
    ).slice(0, 10)) {
      if (!isValidDateStr(dateKey) || !isDateWithinServerWindow(dateKey)) continue;
      if (!rawEntry || typeof rawEntry !== 'object') continue;
      const entry = rawEntry as { confirmed?: unknown; updatedAt?: unknown };
      if (typeof entry.confirmed !== 'boolean') continue;
      const incomingTs =
        typeof entry.updatedAt === 'number' && Number.isFinite(entry.updatedAt)
          ? entry.updatedAt
          : 1;
      const currentTs =
        workspaceState.confirmedUpdatedAt[dateKey]?.[authUser.slot] ?? 0;
      if (incomingTs > currentTs) {
        const curConf = getDateConf(dateKey);
        workspaceState.confirmedByDate[dateKey] = {
          ...curConf,
          [authUser.slot]: entry.confirmed,
        };
        workspaceState.confirmedUpdatedAt[dateKey] = {
          partner1: workspaceState.confirmedUpdatedAt[dateKey]?.partner1 ?? 0,
          partner2: workspaceState.confirmedUpdatedAt[dateKey]?.partner2 ?? 0,
          [authUser.slot]: incomingTs,
        };
        changed = true;
      }
    }
  }

  if (Array.isArray(schedules)) {
    const existingIds = new Set(workspaceState.schedules.map((s) => s.id));
    for (const rawItem of schedules.slice(0, 100)) {
      if (!rawItem || typeof rawItem !== 'object') continue;
      const item = rawItem as Partial<ScheduleItem>;
      if (
        typeof item.id !== 'string' ||
        !item.id.startsWith('sch-') ||
        deletedSet.has(item.id) ||
        existingIds.has(item.id)
      ) {
        continue;
      }
      if (item.owner !== authUser.slot && item.owner !== 'together') {
        continue;
      }
      if (!isValidDateStr(item.date) || !isDateWithinServerWindow(item.date)) continue;
      const itemEndDate =
        isValidDateStr(item.endDate) &&
        (item.endDate === item.date || item.endDate === addOneDayStr(item.date))
          ? item.endDate
          : item.date;
      if (
        typeof item.title !== 'string' ||
        item.title.trim().length < 1 ||
        item.title.trim().length > 80
      ) {
        continue;
      }
      if (!isValidTime(item.startTime) || !isValidTime(item.endTime)) continue;
      const startMin = timeMinutes(item.startTime);
      const endMin =
        itemEndDate > item.date ? 24 * 60 + timeMinutes(item.endTime) : timeMinutes(item.endTime);
      if (endMin <= startMin || endMin - startMin > 24 * 60) continue;

      const resolvedCategory: ActivityCategory =
        typeof item.category === 'string' &&
        VALID_CATEGORIES.has(item.category as ActivityCategory)
          ? (item.category as ActivityCategory)
          : item.owner === 'together'
            ? 'quality_time'
            : 'lainnya';

      workspaceState.schedules.push({
        id: item.id,
        date: item.date,
        ...(itemEndDate !== item.date ? { endDate: itemEndDate } : {}),
        owner: item.owner,
        title: item.title.trim(),
        category: resolvedCategory,
        startTime: item.startTime,
        endTime: item.endTime,
        createdBy:
          typeof item.createdBy === 'string' && item.createdBy.trim()
            ? item.createdBy.trim().slice(0, 32)
            : authUser.name,
        createdAt:
          typeof item.createdAt === 'number' && Number.isFinite(item.createdAt)
            ? item.createdAt
            : Date.now(),
      });
      existingIds.add(item.id);
      changed = true;
    }
  }

  if (changed) {
    workspaceState.deletedScheduleIds = Array.from(deletedSet).slice(-300);
    workspaceState.schedules.sort((a, b) =>
      a.date !== b.date
        ? a.date.localeCompare(b.date)
        : timeMinutes(a.startTime) - timeMinutes(b.startTime)
    );
    await persistState();
  }

  recalculatePresence();
  res.json({ ok: true, state: workspaceState });
});

app.post('/api/schedules', requireAuth, async (req, res) => {
  const { authUser } = req as AuthedRequest;
  const { date, endDate, clientToday, owner, title, category, startTime, endTime } = req.body as {
    date?: unknown;
    endDate?: unknown;
    clientToday?: unknown;
    owner?: unknown;
    title?: unknown;
    category?: unknown;
    startTime?: unknown;
    endTime?: unknown;
  };

  if (!isValidDateStr(date) || !isDateWithinServerWindow(date)) {
    res.status(400).json({ error: 'Tanggal jadwal tidak valid.' });
    return;
  }

  const resolvedEndDate = isValidDateStr(endDate) ? endDate : date;
  const nextDayStr = addOneDayStr(date);
  if (resolvedEndDate !== date && resolvedEndDate !== nextDayStr) {
    res.status(400).json({ error: 'Tanggal selesai maksimal hari berikutnya (lintas tengah malam).' });
    return;
  }

  if (isValidDateStr(clientToday) && date < clientToday) {
    res.status(400).json({
      error: 'Jadwal kemarin hanya bisa dilihat sebagai riwayat dan tidak bisa ditambah.',
    });
    return;
  }

  const resolvedOwner: ScheduleOwner =
    typeof owner === 'string' && VALID_OWNERS.has(owner as ScheduleOwner)
      ? (owner as ScheduleOwner)
      : authUser.slot;

  if (resolvedOwner !== authUser.slot && resolvedOwner !== 'together') {
    res.status(403).json({
      error: 'Kamu hanya bisa mengisi jadwal kamu sendiri atau jadwal Quality Time bareng.',
    });
    return;
  }

  if (resolvedOwner === 'together') {
    const startOk = isDateConfirmedByBoth(date);
    const endOk = resolvedEndDate === date || isDateConfirmedByBoth(resolvedEndDate);
    if (!startOk || !endOk) {
      res.status(400).json({
        error:
          resolvedEndDate !== date
            ? 'Untuk Quality Time lintas tengah malam, konfirmasi selesai isi jadwal pribadi untuk Hari Ini dan Besok dulu ya.'
            : 'Konfirmasi selesai isi jadwal pribadi berdua dulu sebelum mengisi Quality Time ya.',
      });
      return;
    }
  }

  if (typeof title !== 'string' || title.trim().length < 1 || title.trim().length > 80) {
    res.status(400).json({ error: 'Nama kegiatan wajib diisi (maks 80 huruf).' });
    return;
  }

  if (!isValidTime(startTime) || !isValidTime(endTime)) {
    res.status(400).json({ error: 'Format jam mulai & selesai harus HH:MM.' });
    return;
  }

  const startTotalMin = timeMinutes(startTime);
  const endTotalMin =
    resolvedEndDate > date ? 24 * 60 + timeMinutes(endTime) : timeMinutes(endTime);

  if (endTotalMin <= startTotalMin) {
    res.status(400).json({
      error: 'Jam selesai harus lebih malam dari jam mulai (atau pilih lanjut ke Besok).',
    });
    return;
  }
  if (endTotalMin - startTotalMin > 24 * 60) {
    res.status(400).json({ error: 'Durasi satu jadwal maksimal 24 jam.' });
    return;
  }

  const resolvedCategory: ActivityCategory =
    typeof category === 'string' && VALID_CATEGORIES.has(category as ActivityCategory)
      ? (category as ActivityCategory)
      : resolvedOwner === 'together'
        ? 'quality_time'
        : 'lainnya';

  const ownerTag =
    resolvedOwner === 'partner1' ? 'p1' : resolvedOwner === 'partner2' ? 'p2' : 'qt';

  const newItem: ScheduleItem = {
    id: `sch-${ownerTag}-${crypto.randomUUID()}`,
    date,
    ...(resolvedEndDate !== date ? { endDate: resolvedEndDate } : {}),
    owner: resolvedOwner,
    title: title.trim(),
    category: resolvedCategory,
    startTime,
    endTime,
    createdBy: authUser.name,
    createdAt: Date.now(),
  };

  workspaceState.schedules.push(newItem);
  workspaceState.schedules.sort((a, b) =>
    a.date !== b.date
      ? a.date.localeCompare(b.date)
      : timeMinutes(a.startTime) - timeMinutes(b.startTime)
  );

  await persistState();
  recalculatePresence();
  res.status(201).json({ item: newItem, state: workspaceState });
});

app.delete('/api/schedules/:id', requireAuth, async (req, res) => {
  const id = req.params.id;
  const clientToday = req.query.clientToday;
  const target = workspaceState.schedules.find((s) => s.id === id);
  if (!target) {
    const deleted = new Set(workspaceState.deletedScheduleIds ?? []);
    if (!deleted.has(id)) {
      deleted.add(id);
      workspaceState.deletedScheduleIds = Array.from(deleted).slice(-300);
      await persistState();
    }
    recalculatePresence();
    res.json({ ok: true, state: workspaceState });
    return;
  }
  const effectiveEndDate = target.endDate || target.date;
  if (isValidDateStr(clientToday) && effectiveEndDate < clientToday) {
    res.status(400).json({
      error: 'Riwayat jadwal kemarin tidak bisa dihapus.',
    });
    return;
  }

  const deleted = new Set(workspaceState.deletedScheduleIds ?? []);
  deleted.add(id);
  workspaceState.deletedScheduleIds = Array.from(deleted).slice(-300);
  workspaceState.schedules = workspaceState.schedules.filter((s) => s.id !== id);
  await persistState();
  recalculatePresence();
  res.json({ ok: true, state: workspaceState });
});

app.post('/api/schedules/confirm', requireAuth, async (req, res) => {
  const { authUser } = req as AuthedRequest;
  const { date, clientToday, confirmed } = req.body as {
    date?: unknown;
    clientToday?: unknown;
    confirmed?: unknown;
  };

  if (!isValidDateStr(date) || !isDateWithinServerWindow(date)) {
    res.status(400).json({ error: 'Tanggal jadwal tidak valid.' });
    return;
  }
  if (isValidDateStr(clientToday) && date < clientToday) {
    res.status(400).json({ error: 'Riwayat jadwal kemarin tidak bisa diubah.' });
    return;
  }

  const nextVal = typeof confirmed === 'boolean' ? confirmed : true;
  const current = getDateConf(date);
  workspaceState.confirmedByDate[date] = {
    ...current,
    [authUser.slot]: nextVal,
  };
  workspaceState.confirmedUpdatedAt = workspaceState.confirmedUpdatedAt ?? {};
  const currentTs = workspaceState.confirmedUpdatedAt[date] ?? {
    partner1: 0,
    partner2: 0,
  };
  workspaceState.confirmedUpdatedAt[date] = {
    ...currentTs,
    [authUser.slot]: Date.now(),
  };

  await persistState();
  recalculatePresence();
  res.json({ ok: true, state: workspaceState });
});

app.post('/api/spinner/options', requireAuth, async (req, res) => {
  const { authUser } = req as AuthedRequest;
  const { label, date, secondaryDate } = req.body as {
    label?: unknown;
    date?: unknown;
    secondaryDate?: unknown;
  };

  if (!isValidDateStr(date)) {
    res.status(400).json({ error: 'Tanggal jadwal tidak valid.' });
    return;
  }
  const hasConfirmed =
    isDateConfirmedByBoth(date) ||
    (isValidDateStr(secondaryDate) && isDateConfirmedByBoth(secondaryDate));
  if (!hasConfirmed) {
    res.status(400).json({
      error: 'Spinner terbuka setelah kalian berdua konfirmasi selesai isi jadwal pribadi.',
    });
    return;
  }

  if (typeof label !== 'string' || label.trim().length < 1 || label.trim().length > 50) {
    res.status(400).json({ error: 'Nama kegiatan spin wajib diisi (maks 50 huruf).' });
    return;
  }

  const option: SpinnerOption = {
    id: `spin-${crypto.randomUUID()}`,
    label: label.trim(),
    addedBy: authUser.name,
  };

  workspaceState.spinnerOptions.push(option);
  await persistState();
  recalculatePresence();
  res.status(201).json({ option, state: workspaceState });
});

app.delete('/api/spinner/options/:id', requireAuth, async (req, res) => {
  const id = req.params.id;
  const dateParam = req.query.date;
  const secondaryDateParam = req.query.secondaryDate;
  if (!isValidDateStr(dateParam)) {
    res.status(400).json({ error: 'Tanggal jadwal tidak valid.' });
    return;
  }
  const hasConfirmed =
    isDateConfirmedByBoth(dateParam) ||
    (isValidDateStr(secondaryDateParam) && isDateConfirmedByBoth(secondaryDateParam));
  if (!hasConfirmed) {
    res.status(400).json({
      error: 'Spinner terbuka setelah kalian berdua konfirmasi selesai isi jadwal pribadi.',
    });
    return;
  }

  if (workspaceState.spinnerOptions.length <= 2) {
    res.status(400).json({ error: 'Minimal sisakan 2 pilihan kegiatan buat diputar ya.' });
    return;
  }
  workspaceState.spinnerOptions = workspaceState.spinnerOptions.filter((o) => o.id !== id);
  await persistState();
  recalculatePresence();
  res.json({ ok: true, state: workspaceState });
});

app.post('/api/spinner/spin', requireAuth, async (req, res) => {
  const { authUser } = req as AuthedRequest;
  const { date, secondaryDate, clientToday } = (req.body ?? {}) as {
    date?: unknown;
    secondaryDate?: unknown;
    clientToday?: unknown;
  };
  if (!isValidDateStr(date)) {
    res.status(400).json({ error: 'Tanggal jadwal tidak valid.' });
    return;
  }
  if (isValidDateStr(clientToday) && date < clientToday) {
    res.status(400).json({ error: 'Riwayat kemarin tidak bisa diputar di spinner.' });
    return;
  }
  const hasConfirmed =
    isDateConfirmedByBoth(date) ||
    (isValidDateStr(secondaryDate) && isDateConfirmedByBoth(secondaryDate));
  if (!hasConfirmed) {
    res.status(400).json({
      error: 'Spinner terbuka setelah kalian berdua konfirmasi selesai isi jadwal pribadi.',
    });
    return;
  }

  const options = workspaceState.spinnerOptions;
  if (options.length < 2) {
    res.status(400).json({ error: 'Tambahkan minimal 2 pilihan kegiatan dulu.' });
    return;
  }

  const winnerIndex = crypto.randomInt(0, options.length);
  const winner = options[winnerIndex];
  const spinEvent = {
    id: `evt-${crypto.randomUUID()}`,
    winnerId: winner.id,
    winnerLabel: winner.label,
    winnerIndex,
    spunBy: authUser.name,
    spunAt: Date.now(),
  };

  workspaceState.lastSpin = spinEvent;
  await persistState();
  recalculatePresence();
  res.json({ spinEvent, state: workspaceState });
});

function requireAdmin(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
): void {
  const { authUser } = req as AuthedRequest;
  const adminTokenHeader = req.headers['x-admin-token'];
  const adminToken = typeof adminTokenHeader === 'string' ? adminTokenHeader.trim() : '';
  if (!verifyAdminToken(adminToken, authUser.slot)) {
    res.status(403).json({ error: 'Sesi Admin belum aktif atau kadaluarsa. Masukkan passcode Admin lagi.' });
    return;
  }
  next();
}

app.post('/api/admin/verify', requireAuth, (req, res) => {
  const { authUser } = req as AuthedRequest;
  const { passcode } = (req.body ?? {}) as { passcode?: unknown };
  if (typeof passcode !== 'string' || !verifyAdminPasscode(passcode)) {
    res.status(401).json({ error: 'Passcode Admin salah. Coba cek lagi ya.' });
    return;
  }
  const adminToken = createAdminToken(authUser.slot);
  res.json({ ok: true, adminToken });
});

app.put('/api/admin/rewards', requireAuth, requireAdmin, async (req, res) => {
  const { rewards } = (req.body ?? {}) as { rewards?: unknown };
  if (!Array.isArray(rewards) || rewards.length !== 3) {
    res.status(400).json({ error: 'Harus mengisi tepat 3 pilihan hadiah.' });
    return;
  }
  const sanitized: Array<{ id: string; title: string }> = [];
  for (let i = 0; i < 3; i++) {
    const rawTitle = rewards[i];
    if (typeof rawTitle !== 'string' || rawTitle.trim().length < 1 || rawTitle.trim().length > 120) {
      res.status(400).json({ error: `Hadiah ${i + 1} wajib diisi (maks 120 karakter).` });
      return;
    }
    sanitized.push({ id: `reward-${i + 1}`, title: rawTitle.trim() });
  }

  const currentPet = normalizePetGameState(workspaceState.petGame);
  workspaceState.petGame = {
    ...currentPet,
    rewards: sanitized,
    updatedAt: Date.now(),
  };
  await persistState();
  recalculatePresence();
  res.json({ ok: true, state: workspaceState });
});

app.post('/api/admin/pet/simulate-day', requireAuth, requireAdmin, async (req, res) => {
  const { clientToday } = (req.body ?? {}) as { clientToday?: unknown };
  const todayStr = isValidDateStr(clientToday) ? clientToday : formatServerTodayISO();
  const currentPet = normalizePetGameState(workspaceState.petGame, todayStr);
  const nextPet = advancePetAndTreeTime(currentPet, todayStr, Date.now(), 1);
  workspaceState.petGame = nextPet;
  await persistState();
  recalculatePresence();
  res.json({ ok: true, state: workspaceState });
});

app.post('/api/pet/action', requireAuth, async (req, res) => {
  const { authUser } = req as AuthedRequest;
  const { action, clientToday, snackId, rewardId, name } = (req.body ?? {}) as {
    action?: unknown;
    clientToday?: unknown;
    snackId?: unknown;
    rewardId?: unknown;
    name?: unknown;
  };

  if (typeof action !== 'string') {
    res.status(400).json({ error: 'Aksi game tidak valid.' });
    return;
  }

  const todayStr = isValidDateStr(clientToday) ? clientToday : formatServerTodayISO();
  const nowMs = Date.now();
  const baseGame = normalizePetGameState(workspaceState.petGame, todayStr);
  const game: PetGameState = advancePetAndTreeTime(baseGame, todayStr, nowMs);
  const pet = { ...game.pet };
  const tree = { ...game.tree };
  const inventory = {
    ...game.inventory,
    snacks: { ...game.inventory.snacks },
  };
  let rewards = [...game.rewards];
  let claimedHistory = [...game.claimedHistory];
  let message = '';

  switch (action) {
    case 'rename': {
      if (typeof name !== 'string' || name.trim().length < 1 || name.trim().length > 24) {
        res.status(400).json({ error: 'Nama beruang harus 1–24 huruf.' });
        return;
      }
      pet.name = name.trim();
      message = `Nama beruang diganti menjadi ${pet.name}.`;
      break;
    }

    case 'sleep_toggle': {
      if (pet.isSleeping) {
        pet.isSleeping = false;
        pet.isExhausted = pet.energy <= 20;
        message = `${pet.name} bangun dari tidurnya!`;
      } else {
        pet.isSleeping = true;
        pet.isExhausted = false;
        message = `${pet.name} mulai tidur nyenyak untuk memulihkan energi.`;
      }
      pet.lastUpdatedAt = nowMs;
      break;
    }

    case 'sleep_tick': {
      if (pet.isSleeping) {
        pet.energy = clampStat(pet.energy + 12);
        pet.lastUpdatedAt = nowMs;
        if (pet.energy >= 100) {
          pet.isSleeping = false;
          pet.isExhausted = false;
          pet.xp += 15;
          pet.happiness = clampStat(pet.happiness + 10);
          message = `${pet.name} bangun segar dengan energi penuh! (+15 XP)`;
        } else {
          message = `${pet.name} sedang tidur nyenyak...`;
        }
      }
      break;
    }

    case 'feed': {
      if (pet.isSleeping) {
        res.status(400).json({ error: `${pet.name} sedang tidur. Bangunkan dulu sebelum makan.` });
        return;
      }
      const snack = SNACK_CATALOG.find((s) => s.id === snackId) ?? SNACK_CATALOG[0];
      if (snack.id !== 'berry') {
        const count = inventory.snacks[snack.id] ?? 0;
        if (count <= 0) {
          res.status(400).json({ error: `Stok ${snack.name} habis! Beli di Toko NPC dulu.` });
          return;
        }
        inventory.snacks[snack.id] = count - 1;
      }
      pet.hunger = clampStat(pet.hunger + snack.hungerGain);
      pet.happiness = clampStat(pet.happiness + snack.happinessGain);
      pet.energy = clampStat(pet.energy + snack.energyGain);
      if (pet.energy > 25) pet.isExhausted = false;
      pet.xp += 10;
      pet.lastUpdatedAt = nowMs;
      message = `${pet.name} lahap makan ${snack.name}! (+10 XP)`;
      break;
    }

    case 'bath': {
      if (pet.isSleeping) {
        res.status(400).json({ error: `${pet.name} sedang tidur. Bangunkan dulu untuk mandi.` });
        return;
      }
      pet.hygiene = 100;
      pet.happiness = clampStat(pet.happiness + 12);
      pet.xp += 10;
      pet.lastUpdatedAt = nowMs;
      message = `${pet.name} mandi busa wangi dan bersih berkilau! (+10 XP)`;
      break;
    }

    case 'play': {
      if (pet.isSleeping) {
        res.status(400).json({ error: `${pet.name} sedang tidur. Bangunkan dulu kalau mau bermain.` });
        return;
      }
      if (pet.isExhausted || pet.energy <= 20) {
        pet.isExhausted = true;
        workspaceState.petGame = { ...game, pet, updatedAt: nowMs };
        await persistState();
        res.status(400).json({ error: `${pet.name} kelelahan! Tidurkan dulu agar energinya pulih.` });
        return;
      }
      pet.happiness = clampStat(pet.happiness + 22);
      pet.energy = clampStat(pet.energy - 16);
      pet.hunger = clampStat(pet.hunger - 8);
      pet.hygiene = clampStat(pet.hygiene - 10);
      pet.xp += 12;
      if (pet.energy <= 20) pet.isExhausted = true;
      pet.lastUpdatedAt = nowMs;
      message = pet.isExhausted
        ? `${pet.name} senang bermain tapi sekarang mulai kelelahan! Waktunya tidur.`
        : `${pet.name} senang bermain bersama! (+12 XP)`;
      break;
    }

    case 'water_tree': {
      if (pet.isSleeping) {
        res.status(400).json({ error: `${pet.name} sedang tidur. Bangunkan dulu untuk menyiram pohon.` });
        return;
      }
      if (pet.isExhausted || pet.energy <= 15) {
        pet.isExhausted = true;
        workspaceState.petGame = { ...game, pet, updatedAt: nowMs };
        await persistState();
        res.status(400).json({ error: `${pet.name} kelelahan! Tidurkan dulu sebelum menyiram tanaman.` });
        return;
      }
      if (tree.status === 'dead') {
        res.status(400).json({ error: 'Pohon sudah mati karena lupa disiram 2x dalam 3 hari. Tanam bibit baru dulu ya.' });
        return;
      }
      if (tree.status === 'fruiting') {
        res.status(400).json({ error: 'Pohon sudah berbuah lebat! Panen buahnya dulu ya.' });
        return;
      }
      if (tree.wateringsToday >= 3) {
        res.status(400).json({ error: 'Pohon sudah disiram 3x hari ini! Lanjutkan besok ya.' });
        return;
      }

      tree.wateringsToday += 1;
      tree.lastWateredAt = nowMs;
      if (tree.wateringsToday >= 3 && tree.missedDays === 1) {
        // Recover visually once fully watered today, while keeping missedDays count for the 3-day rule
        tree.status = 'growing';
      }
      if (tree.cycleDay >= 3 && tree.wateringsToday >= 3 && tree.missedDays < 2) {
        tree.status = 'fruiting';
      }

      pet.energy = clampStat(pet.energy - 14);
      pet.hygiene = clampStat(pet.hygiene - 7);
      pet.happiness = clampStat(pet.happiness + 8);
      pet.xp += 15;
      if (pet.energy <= 20) pet.isExhausted = true;
      pet.lastUpdatedAt = nowMs;

      message =
        tree.status === 'fruiting'
          ? `Hore! Pohon indah ${pet.name} berbuah lebat setelah dirawat 3 hari! (+15 XP)`
          : `Berhasil menyiram pohon (${tree.wateringsToday}/3 hari ini). (+15 XP)`;
      break;
    }

    case 'harvest_tree': {
      if (tree.status !== 'fruiting') {
        res.status(400).json({ error: 'Pohon belum berbuah. Rawat dan siram 3x sehari selama 3 hari ya.' });
        return;
      }
      if (inventory.fruitGrams >= MAX_FRUIT_GRAMS) {
        res.status(400).json({ error: 'Inventory sudah penuh 1 kg (1.000 g)! Jual buahnya ke Toko NPC dulu ya.' });
        return;
      }

      const yieldGrams = tree.missedDays === 0 ? 1000 : 500;
      const beforeGrams = inventory.fruitGrams;
      inventory.fruitGrams = Math.min(MAX_FRUIT_GRAMS, beforeGrams + yieldGrams);
      const gainedGrams = inventory.fruitGrams - beforeGrams;

      tree.plantedDate = todayStr;
      tree.lastCalendarDate = todayStr;
      tree.cycleDay = 1;
      tree.wateringsToday = 0;
      tree.missedDays = 0;
      tree.status = 'growing';
      tree.totalHarvests += 1;

      pet.xp += 25;
      pet.happiness = clampStat(pet.happiness + 15);
      pet.energy = clampStat(pet.energy - 10);
      if (pet.energy <= 20) pet.isExhausted = true;
      pet.lastUpdatedAt = nowMs;

      message = `Panen berhasil! +${gainedGrams} g masuk ke Inventory (${inventory.fruitGrams}/1.000 g). (+25 XP)`;
      break;
    }

    case 'replant_tree': {
      if (tree.status !== 'dead') {
        res.status(400).json({ error: 'Pohon masih hidup dan bisa terus dirawat.' });
        return;
      }
      tree.plantedDate = todayStr;
      tree.lastCalendarDate = todayStr;
      tree.cycleDay = 1;
      tree.wateringsToday = 0;
      tree.missedDays = 0;
      tree.status = 'growing';
      message = 'Bibit pohon indah baru berhasil ditanam! Jangan lupa siram 3x sehari selama 3 hari ya.';
      break;
    }

    case 'sell_fruit': {
      if (inventory.fruitGrams < MAX_FRUIT_GRAMS) {
        res.status(400).json({
          error: `Kumpulkan buah sampai 1 kg (1.000 g) dulu ya! Saat ini baru ${inventory.fruitGrams} g.`,
        });
        return;
      }
      inventory.fruitGrams = 0;
      inventory.coins += FRUIT_SELL_COINS;
      inventory.claimTickets += 1;
      pet.xp += 30;
      pet.happiness = clampStat(pet.happiness + 15);
      pet.lastUpdatedAt = nowMs;
      message = `1 kg buah terjual ke Toko NPC! +${FRUIT_SELL_COINS} Koin & +1 Tiket Klaim Hadiah!`;
      break;
    }

    case 'buy_snack': {
      const snack = SNACK_CATALOG.find((s) => s.id === snackId);
      if (!snack || snack.priceCoins <= 0) {
        res.status(400).json({ error: 'Item makanan tidak valid untuk dibeli.' });
        return;
      }
      if (inventory.coins < snack.priceCoins) {
        res.status(400).json({ error: `Koin belum cukup! Butuh ${snack.priceCoins} koin.` });
        return;
      }
      inventory.coins -= snack.priceCoins;
      inventory.snacks[snack.id] = (inventory.snacks[snack.id] ?? 0) + 1;
      message = `Berhasil membeli 1 ${snack.name} dari Toko NPC!`;
      break;
    }

    case 'claim_reward': {
      if (inventory.claimTickets < 1) {
        res.status(400).json({ error: 'Belum punya Tiket Klaim. Jual 1 kg buah ke Toko NPC dulu ya!' });
        return;
      }
      const chosen = rewards.find((r) => r.id === rewardId);
      if (!chosen) {
        res.status(400).json({ error: 'Pilih salah satu dari 3 hadiah yang tersedia.' });
        return;
      }
      inventory.claimTickets -= 1;
      claimedHistory = [
        {
          id: `claim-${crypto.randomUUID()}`,
          rewardId: chosen.id,
          rewardTitle: chosen.title,
          claimedBy: authUser.name,
          claimedAt: nowMs,
        },
        ...claimedHistory,
      ].slice(0, 50);
      message = `Selamat! Hadiah "${chosen.title}" berhasil diklaim oleh ${authUser.name}!`;
      break;
    }

    default: {
      res.status(400).json({ error: 'Aksi tidak dikenali.' });
      return;
    }
  }

  pet.stage = computeGrowthStage(pet.xp);

  workspaceState.petGame = {
    pet,
    tree,
    inventory,
    rewards,
    claimedHistory,
    updatedAt: nowMs,
  };

  await persistState();
  recalculatePresence();
  res.json({ ok: true, message, state: workspaceState });
});

app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'Endpoint API tidak ditemukan.' });
});

if (!process.env.VERCEL) {
  (async () => {
    if (process.env.NODE_ENV !== 'production') {
      const { createServer: createViteServer } = await import('vite');
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'spa',
      });
      app.use(vite.middlewares);
    } else {
      const distPath = path.resolve(process.cwd(), 'dist');
      app.use(express.static(distPath));
      app.get('*', (_req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    }

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`VnB Schedules server running on http://0.0.0.0:${PORT}`);
    });
  })();
}

export default app;
