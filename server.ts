import 'dotenv/config';
import express from 'express';
import http from 'http';
import crypto from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { WebSocketServer, WebSocket } from 'ws';
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

function persistState(): void {
  try {
    fs.writeFileSync(STATE_FILE, JSON.stringify(workspaceState), 'utf-8');
  } catch {
    // Ignore transient temp write failures.
  }
}

interface SessionRecord {
  token: string;
  user: AuthenticatedUser;
  createdAt: number;
}

const sessions = new Map<string, SessionRecord>();
const wsClients = new Map<WebSocket, { user: AuthenticatedUser }>();

function recalculatePresence(): void {
  let p1Online = false;
  let p2Online = false;
  for (const client of wsClients.values()) {
    if (client.user.slot === 'partner1') p1Online = true;
    if (client.user.slot === 'partner2') p2Online = true;
  }
  workspaceState.partners.partner1.online = p1Online;
  workspaceState.partners.partner2.online = p2Online;
}

function broadcastState(extraEvent?: { type: string; payload: unknown }): void {
  recalculatePresence();
  const stateMsg = JSON.stringify({
    type: 'state:sync',
    payload: workspaceState,
  });
  const extraMsg = extraEvent ? JSON.stringify(extraEvent) : null;

  for (const ws of wsClients.keys()) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(stateMsg);
      if (extraMsg) ws.send(extraMsg);
    }
  }
}

function isValidTime(t: unknown): t is string {
  if (typeof t !== 'string') return false;
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(t);
}

function timeMinutes(t: string): number {
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

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '64kb' }));

  const server = http.createServer(app);
  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws) => {
    let authenticated = false;

    const authTimeout = setTimeout(() => {
      if (!authenticated && ws.readyState === WebSocket.OPEN) {
        ws.close(4001, 'Auth timeout');
      }
    }, 8000);

    ws.on('message', (rawData) => {
      try {
        const msg = JSON.parse(rawData.toString()) as { type?: string; token?: string };
        if (msg.type === 'auth' && typeof msg.token === 'string') {
          const session = sessions.get(msg.token);
          if (!session) {
            ws.send(JSON.stringify({ type: 'auth:error', message: 'Sesi tidak valid' }));
            ws.close(4003, 'Unauthorized');
            return;
          }
          authenticated = true;
          clearTimeout(authTimeout);
          wsClients.set(ws, { user: session.user });
          broadcastState();
        }
      } catch {
        // Ignore malformed socket frames.
      }
    });

    ws.on('close', () => {
      clearTimeout(authTimeout);
      if (wsClients.has(ws)) {
        wsClients.delete(ws);
        broadcastState();
      }
    });
  });

  function extractToken(req: express.Request): string | null {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
    return authHeader.slice(7).trim();
  }

  function requireAuth(
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ): void {
    const token = extractToken(req);
    if (!token) {
      res.status(401).json({ error: 'Silakan login terlebih dahulu.' });
      return;
    }
    const session = sessions.get(token);
    if (!session) {
      res.status(401).json({ error: 'Sesi login sudah berakhir, silakan masuk lagi.' });
      return;
    }
    (req as express.Request & { authSession: SessionRecord }).authSession = session;
    next();
  }

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

  app.get('/api/partners-preview', (_req, res) => {
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

  app.post('/api/auth/login', (req, res) => {
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

    const token = crypto.randomBytes(32).toString('hex');
    const user: AuthenticatedUser = {
      slot: chosenSlot,
      name: cleanName,
      role: chosenRole,
    };
    sessions.set(token, { token, user, createdAt: Date.now() });

    persistState();
    broadcastState();

    res.json({
      token,
      user,
      state: workspaceState,
    });
  });

  app.post('/api/auth/logout', requireAuth, (req, res) => {
    const { authSession } = req as express.Request & { authSession: SessionRecord };
    sessions.delete(authSession.token);
    res.json({ ok: true });
  });

  app.get('/api/state', requireAuth, (_req, res) => {
    recalculatePresence();
    res.json({ state: workspaceState });
  });

  // Strict authorization: user can ONLY create schedules for their own slot or 'together'
  app.post('/api/schedules', requireAuth, (req, res) => {
    const { authSession } = req as express.Request & { authSession: SessionRecord };
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
        : authSession.user.slot;

    // Enforce: partner1 cannot add for partner2, and vice versa
    if (resolvedOwner !== authSession.user.slot && resolvedOwner !== 'together') {
      res.status(403).json({
        error: 'Kamu hanya bisa mengisi jadwal kamu sendiri atau jadwal Quality Time bareng.',
      });
      return;
    }

    // Quality time requires both partners to have confirmed personal schedules for that day
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
      createdBy: authSession.user.name,
      createdAt: Date.now(),
    };

    workspaceState.schedules.push(newItem);
    workspaceState.schedules.sort(
      (a, b) => timeMinutes(a.startTime) - timeMinutes(b.startTime)
    );

    persistState();
    broadcastState();
    res.status(201).json({ item: newItem, state: workspaceState });
  });

  // Strict authorization: user can ONLY delete their own schedule or a 'together' schedule
  app.delete('/api/schedules/:id', requireAuth, (req, res) => {
    const { authSession } = req as express.Request & { authSession: SessionRecord };
    const id = req.params.id;
    const target = workspaceState.schedules.find((s) => s.id === id);
    if (!target) {
      res.status(404).json({ error: 'Jadwal tidak ditemukan.' });
      return;
    }
    if (target.owner !== authSession.user.slot && target.owner !== 'together') {
      res.status(403).json({
        error: 'Kamu tidak bisa menghapus jadwal pribadi pasanganmu.',
      });
      return;
    }

    workspaceState.schedules = workspaceState.schedules.filter((s) => s.id !== id);
    persistState();
    broadcastState();
    res.json({ ok: true, state: workspaceState });
  });

  // Confirm / unconfirm personal schedule completion for a day
  app.post('/api/schedules/confirm', requireAuth, (req, res) => {
    const { authSession } = req as express.Request & { authSession: SessionRecord };
    const { day, confirmed } = req.body as { day?: unknown; confirmed?: unknown };

    if (typeof day !== 'string' || !VALID_DAYS.has(day as DayKey)) {
      res.status(400).json({ error: 'Pilihan hari tidak valid.' });
      return;
    }

    const nextVal = typeof confirmed === 'boolean' ? confirmed : true;
    workspaceState.confirmedPersonal[day as DayKey][authSession.user.slot] = nextVal;

    persistState();
    broadcastState();
    res.json({ ok: true, state: workspaceState });
  });

  app.post('/api/spinner/options', requireAuth, (req, res) => {
    const { authSession } = req as express.Request & { authSession: SessionRecord };
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
      addedBy: authSession.user.name,
    };

    workspaceState.spinnerOptions.push(option);
    persistState();
    broadcastState();
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
    broadcastState();
    res.json({ ok: true, state: workspaceState });
  });

  app.post('/api/spinner/spin', requireAuth, (req, res) => {
    const { authSession } = req as express.Request & { authSession: SessionRecord };
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
      spunBy: authSession.user.name,
      spunAt: Date.now(),
    };

    workspaceState.lastSpin = spinEvent;
    persistState();
    broadcastState({ type: 'spinner:spun', payload: spinEvent });
    res.json({ spinEvent, state: workspaceState });
  });

  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'Endpoint API tidak ditemukan.' });
  });

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

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`VnB Schedules server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
