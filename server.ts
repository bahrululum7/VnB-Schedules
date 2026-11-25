import 'dotenv/config';
import express from 'express';
import crypto from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';
import type {
  ActivityCategory,
  AuthenticatedUser,
  DayKey,
  PartnerRole,
  PartnerSlot,
  ScheduleItem,
  ScheduleOwner,
  SharedWorkspaceState,
  SpinnerOption,
} from './src/types.ts';

const PORT = Number(process.env.PORT) || 3000;
const STATE_FILE = path.join(os.tmpdir(), 'vnb-schedules-state-v2.json');

// Salted scrypt verifier for the couple passcode so no plaintext secret is stored in source.
const PASSCODE_SALT = 'vnb_couple_salt_v1';
const DEFAULT_PASSCODE_SCRYPT_HEX =
  '59c66b193fe0dfe4240de2e0df51671051065edde5f208e84b3b6af1fd69ae52192ccfa1f6b4f27b3db345b7d6e5342f1901f10b70c22d3a3f0b15f0fb3f274b';

const RUNTIME_FALLBACK_SECRET = crypto.randomBytes(32).toString('hex');

function getSessionSecret(): string {
  return (
    process.env.SESSION_SECRET?.trim() ||
    process.env.COUPLE_PASSCODE?.trim() ||
    RUNTIME_FALLBACK_SECRET
  );
}

function createSignedToken(user: AuthenticatedUser): string {
  const payload = {
    slot: user.slot,
    name: user.name,
    role: user.role,
    exp: Date.now() + 1000 * 60 * 60 * 24 * 7, // 7 days
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
    confirmedPersonal: {
      today: { partner1: false, partner2: false },
      tomorrow: { partner1: false, partner2: false },
    },
    spinnerOptions: [...DEFAULT_SPINNER_OPTIONS],
    lastSpin: null,
  };
}

function loadState(): SharedWorkspaceState {
  try {
    if (fs.existsSync(STATE_FILE)) {
      const raw = fs.readFileSync(STATE_FILE, 'utf-8');
      const parsed = JSON.parse(raw) as Partial<SharedWorkspaceState>;
      const base = createInitialState();
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
        schedules: Array.isArray(parsed.schedules) ? parsed.schedules : [],
        confirmedPersonal: {
          today: {
            partner1: Boolean(parsed.confirmedPersonal?.today?.partner1),
            partner2: Boolean(parsed.confirmedPersonal?.today?.partner2),
          },
          tomorrow: {
            partner1: Boolean(parsed.confirmedPersonal?.tomorrow?.partner1),
            partner2: Boolean(parsed.confirmedPersonal?.tomorrow?.partner2),
          },
        },
        spinnerOptions:
          Array.isArray(parsed.spinnerOptions) && parsed.spinnerOptions.length > 0
            ? parsed.spinnerOptions
            : [...DEFAULT_SPINNER_OPTIONS],
        lastSpin: parsed.lastSpin ?? null,
      };
    }
  } catch {
    // Fall back to fresh state if temp state cannot be parsed.
  }
  return createInitialState();
}

let workspaceState: SharedWorkspaceState = loadState();
const lastSeenAt: Record<PartnerSlot, number> = {
  partner1: 0,
  partner2: 0,
};
const ONLINE_TTL_MS = 12000;

function persistState(): void {
  workspaceState.revision = (workspaceState.revision ?? 0) + 1;
  try {
    fs.writeFileSync(STATE_FILE, JSON.stringify(workspaceState), 'utf-8');
  } catch {
    // Ignore transient temp write failures.
  }
}

function syncFromDiskIfNewer(): void {
  const diskState = loadState();
  if ((diskState.revision ?? 0) > (workspaceState.revision ?? 0)) {
    workspaceState = diskState;
  }
}

function recalculatePresence(): void {
  const now = Date.now();
  workspaceState.partners.partner1.online = now - lastSeenAt.partner1 < ONLINE_TTL_MS;
  workspaceState.partners.partner2.online = now - lastSeenAt.partner2 < ONLINE_TTL_MS;
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

const VALID_DAYS = new Set<DayKey>(['today', 'tomorrow']);
const VALID_OWNERS = new Set<ScheduleOwner>(['partner1', 'partner2', 'together']);
const VALID_CATEGORIES = new Set<ActivityCategory>([
  'kuliah',
  'kerja',
  'belajar',
  'quality_time',
  'lainnya',
]);

const app = express();
app.use(express.json({ limit: '64kb' }));

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

function requireAuth(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
): void {
  syncFromDiskIfNewer();
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

app.get('/api/partners-preview', (_req, res) => {
  syncFromDiskIfNewer();
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

app.get('/api/auth/session', (req, res) => {
  syncFromDiskIfNewer();
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

app.post('/api/auth/login', (req, res) => {
  syncFromDiskIfNewer();
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
  persistState();
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

app.get('/api/state', requireAuth, (req, res) => {
  const { authUser } = req as AuthedRequest;
  // Sync name if this serverless instance just warmed up
  if (workspaceState.partners[authUser.slot].name.startsWith('Pasangan ')) {
    workspaceState.partners[authUser.slot].name = authUser.name;
  }
  recalculatePresence();
  res.json({ state: workspaceState });
});

app.post('/api/schedules', requireAuth, (req, res) => {
  const { authUser } = req as AuthedRequest;
  const { day, owner, title, category, startTime, endTime } = req.body as {
    day?: unknown;
    owner?: unknown;
    title?: unknown;
    category?: unknown;
    startTime?: unknown;
    endTime?: unknown;
  };

  if (typeof day !== 'string' || !VALID_DAYS.has(day as DayKey)) {
    res.status(400).json({ error: 'Pilihan hari tidak valid.' });
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

  const dayConf = workspaceState.confirmedPersonal[day as DayKey];
  if (resolvedOwner === 'together' && (!dayConf.partner1 || !dayConf.partner2)) {
    res.status(400).json({
      error: 'Konfirmasi selesai isi jadwal pribadi berdua dulu sebelum mengisi Quality Time ya.',
    });
    return;
  }

  if (typeof title !== 'string' || title.trim().length < 1 || title.trim().length > 80) {
    res.status(400).json({ error: 'Nama kegiatan wajib diisi (maks 80 huruf).' });
    return;
  }

  if (!isValidTime(startTime) || !isValidTime(endTime)) {
    res.status(400).json({ error: 'Format jam mulai & selesai harus HH:MM.' });
    return;
  }

  if (timeMinutes(endTime) <= timeMinutes(startTime)) {
    res.status(400).json({ error: 'Jam selesai harus lebih malam dari jam mulai.' });
    return;
  }

  const resolvedCategory: ActivityCategory =
    typeof category === 'string' && VALID_CATEGORIES.has(category as ActivityCategory)
      ? (category as ActivityCategory)
      : resolvedOwner === 'together'
        ? 'quality_time'
        : 'lainnya';

  const newItem: ScheduleItem = {
    id: `sch-${crypto.randomUUID()}`,
    day: day as DayKey,
    owner: resolvedOwner,
    title: title.trim(),
    category: resolvedCategory,
    startTime,
    endTime,
    createdBy: authUser.name,
    createdAt: Date.now(),
  };

  workspaceState.schedules.push(newItem);
  workspaceState.schedules.sort(
    (a, b) => timeMinutes(a.startTime) - timeMinutes(b.startTime)
  );

  persistState();
  recalculatePresence();
  res.status(201).json({ item: newItem, state: workspaceState });
});

app.delete('/api/schedules/:id', requireAuth, (req, res) => {
  const { authUser } = req as AuthedRequest;
  const id = req.params.id;
  const target = workspaceState.schedules.find((s) => s.id === id);
  if (!target) {
    res.status(404).json({ error: 'Jadwal tidak ditemukan.' });
    return;
  }
  if (target.owner !== authUser.slot && target.owner !== 'together') {
    res.status(403).json({
      error: 'Kamu tidak bisa menghapus jadwal pribadi pasanganmu.',
    });
    return;
  }

  workspaceState.schedules = workspaceState.schedules.filter((s) => s.id !== id);
  persistState();
  recalculatePresence();
  res.json({ ok: true, state: workspaceState });
});

app.post('/api/schedules/confirm', requireAuth, (req, res) => {
  const { authUser } = req as AuthedRequest;
  const { day, confirmed } = req.body as { day?: unknown; confirmed?: unknown };

  if (typeof day !== 'string' || !VALID_DAYS.has(day as DayKey)) {
    res.status(400).json({ error: 'Pilihan hari tidak valid.' });
    return;
  }

  const nextVal = typeof confirmed === 'boolean' ? confirmed : true;
  workspaceState.confirmedPersonal[day as DayKey][authUser.slot] = nextVal;

  persistState();
  recalculatePresence();
  res.json({ ok: true, state: workspaceState });
});

app.post('/api/spinner/options', requireAuth, (req, res) => {
  const { authUser } = req as AuthedRequest;
  const { label, day } = req.body as { label?: unknown; day?: unknown };

  const targetDay: DayKey =
    typeof day === 'string' && VALID_DAYS.has(day as DayKey) ? (day as DayKey) : 'today';
  const dayConf = workspaceState.confirmedPersonal[targetDay];
  if (!dayConf.partner1 || !dayConf.partner2) {
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
  persistState();
  recalculatePresence();
  res.status(201).json({ option, state: workspaceState });
});

app.delete('/api/spinner/options/:id', requireAuth, (req, res) => {
  const id = req.params.id;
  const dayParam = req.query.day;
  const targetDay: DayKey =
    typeof dayParam === 'string' && VALID_DAYS.has(dayParam as DayKey)
      ? (dayParam as DayKey)
      : 'today';
  const dayConf = workspaceState.confirmedPersonal[targetDay];
  if (!dayConf.partner1 || !dayConf.partner2) {
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
  persistState();
  recalculatePresence();
  res.json({ ok: true, state: workspaceState });
});

app.post('/api/spinner/spin', requireAuth, (req, res) => {
  const { authUser } = req as AuthedRequest;
  const { day } = (req.body ?? {}) as { day?: unknown };
  const targetDay: DayKey =
    typeof day === 'string' && VALID_DAYS.has(day as DayKey) ? (day as DayKey) : 'today';
  const dayConf = workspaceState.confirmedPersonal[targetDay];
  if (!dayConf.partner1 || !dayConf.partner2) {
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
  persistState();
  recalculatePresence();
  res.json({ spinEvent, state: workspaceState });
});

app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'Endpoint API tidak ditemukan.' });
});

// Start standalone HTTP server when NOT running inside Vercel Serverless Functions
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
