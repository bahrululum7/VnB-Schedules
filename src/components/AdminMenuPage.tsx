import { useEffect, useState } from 'react';
import { CalendarPlus, Check, Gift, KeyRound, Lock, ShieldCheck } from 'lucide-react';
import type { AdminRewardOption, ClaimedRewardRecord } from '../types';

interface AdminMenuPageProps {
  rewards: AdminRewardOption[];
  claimedHistory: ClaimedRewardRecord[];
  todayDate: string;
  adminToken: string | null;
  onVerifyPasscode: (passcode: string) => Promise<{ ok: boolean; error?: string }>;
  onSaveRewards: (titles: string[]) => Promise<{ ok: boolean; error?: string }>;
  onSimulateNextDay: () => Promise<{ ok: boolean; error?: string }>;
  onLockAdmin: () => void;
}

export function AdminMenuPage({
  rewards,
  claimedHistory,
  todayDate,
  adminToken,
  onVerifyPasscode,
  onSaveRewards,
  onSimulateNextDay,
  onLockAdmin,
}: AdminMenuPageProps) {
  const [passcode, setPasscode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const [rewardInputs, setRewardInputs] = useState<string[]>(() =>
    rewards.map((r) => r.title)
  );
  const [saving, setSaving] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [notice, setNotice] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  useEffect(() => {
    setRewardInputs(rewards.map((r) => r.title));
  }, [rewards]);

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passcode.trim() || verifying) return;
    setVerifying(true);
    setAuthError(null);
    const res = await onVerifyPasscode(passcode);
    setVerifying(false);
    if (!res.ok) {
      setAuthError(res.error || 'Passcode salah.');
      return;
    }
    setPasscode('');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    setNotice(null);
    const res = await onSaveRewards(rewardInputs);
    setSaving(false);
    if (res.ok) {
      setNotice({ type: 'ok', text: '3 pilihan hadiah berhasil disimpan dan langsung muncul di Toko NPC.' });
    } else {
      setNotice({ type: 'err', text: res.error || 'Gagal menyimpan hadiah.' });
    }
  };

  const handleSimulateDay = async () => {
    if (simulating) return;
    setSimulating(true);
    setNotice(null);
    const res = await onSimulateNextDay();
    setSimulating(false);
    if (res.ok) {
      setNotice({ type: 'ok', text: `Siklus pohon kebun dimajukan +1 hari dari ${todayDate}.` });
    } else {
      setNotice({ type: 'err', text: res.error || 'Gagal memajukan hari simulasi.' });
    }
  };

  if (!adminToken) {
    return (
      <div className="max-w-md mx-auto py-8">
        <section className="rounded-2xl bg-[#14141B] border border-white/10 p-6 sm:p-7 space-y-5">
          <div className="space-y-1.5 text-center">
            <div className="w-12 h-12 rounded-2xl bg-pink-500/15 border border-pink-400/30 flex items-center justify-center mx-auto text-pink-300">
              <KeyRound className="w-6 h-6" />
            </div>
            <h1 className="font-display text-xl font-bold text-white pt-2">
              Menu Khusus Admin
            </h1>
            <p className="text-xs text-zinc-400">
              Masukkan passcode admin untuk mengatur 3 teks hadiah game beruang dan melihat riwayat klaim.
            </p>
          </div>

          <form onSubmit={handleUnlock} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="admin-passcode" className="block text-xs font-medium text-zinc-300">
                Passcode Admin
              </label>
              <input
                id="admin-passcode"
                type="password"
                inputMode="numeric"
                autoComplete="off"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                placeholder="Masukkan passcode 6 digit"
                className="w-full px-4 py-2.5 rounded-xl bg-[#0B0B0F] border border-white/15 focus:border-pink-400 text-white text-sm tracking-widest focus:outline-none"
                required
              />
            </div>

            {authError && (
              <p className="text-xs text-rose-300 bg-rose-500/10 border border-rose-400/25 rounded-lg px-3 py-2">
                {authError}
              </p>
            )}

            <button
              type="submit"
              disabled={verifying}
              className="w-full min-h-[44px] px-4 py-2.5 rounded-xl bg-pink-500 hover:bg-pink-400 disabled:opacity-60 text-zinc-950 text-xs font-bold transition-colors cursor-pointer"
            >
              {verifying ? 'Memeriksa Passcode...' : 'Buka Menu Admin'}
            </button>
          </form>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl bg-[#14141B] border border-white/10 p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-emerald-300">
            <ShieldCheck className="w-4 h-4" />
            <span>Akses Admin Terverifikasi</span>
          </div>
          <h1 className="font-display text-2xl font-bold text-white mt-1">
            Pengaturan 3 Hadiah Toko NPC
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            Teks hadiah di bawah ini akan tampil di Toko NPC saat pemain menukarkan 1 kg buah hasil panen.
          </p>
        </div>

        <button
          type="button"
          onClick={onLockAdmin}
          className="min-h-[42px] px-4 py-2 rounded-xl bg-[#1D1D27] hover:bg-rose-500/15 border border-white/10 hover:border-rose-400/40 text-xs font-semibold text-zinc-200 hover:text-rose-200 inline-flex items-center gap-1.5 cursor-pointer shrink-0"
        >
          <Lock className="w-4 h-4" />
          <span>Kunci Menu Admin</span>
        </button>
      </section>

      {notice && (
        <div
          className={`rounded-xl border px-4 py-3 text-xs sm:text-sm font-medium ${
            notice.type === 'err'
              ? 'bg-rose-500/10 border-rose-400/35 text-rose-200'
              : 'bg-emerald-500/10 border-emerald-400/35 text-emerald-200'
          }`}
        >
          {notice.text}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Edit 3 Reward Texts */}
        <section className="lg:col-span-7 rounded-2xl bg-[#14141B] border border-white/10 p-5 sm:p-6 space-y-5">
          <div className="flex items-center gap-2">
            <Gift className="w-4 h-4 text-pink-400" />
            <h2 className="font-display text-base sm:text-lg font-bold text-white">
              Input 3 Pilihan Hadiah
            </h2>
          </div>

          <form onSubmit={handleSave} className="space-y-4">
            {[0, 1, 2].map((idx) => (
              <div key={idx} className="space-y-1.5">
                <label
                  htmlFor={`reward-input-${idx}`}
                  className="block text-xs font-semibold text-zinc-300"
                >
                  Tulisan Hadiah {idx + 1}
                </label>
                <input
                  id={`reward-input-${idx}`}
                  type="text"
                  maxLength={120}
                  value={rewardInputs[idx] ?? ''}
                  onChange={(e) =>
                    setRewardInputs((prev) => prev.map((v, i) => (i === idx ? e.target.value : v)))
                  }
                  placeholder={`Contoh hadiah ${idx + 1}`}
                  className="w-full px-4 py-2.5 rounded-xl bg-[#0B0B0F] border border-white/15 focus:border-pink-400 text-white text-sm focus:outline-none"
                  required
                />
              </div>
            ))}

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                type="submit"
                disabled={saving}
                className="min-h-[44px] px-5 py-2.5 rounded-xl bg-pink-500 hover:bg-pink-400 disabled:opacity-60 text-zinc-950 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>{saving ? 'Menyimpan...' : 'Simpan 3 Hadiah'}</span>
              </button>

              <button
                type="button"
                disabled={simulating}
                onClick={handleSimulateDay}
                className="min-h-[44px] px-4 py-2.5 rounded-xl bg-[#1D1D27] hover:bg-white/10 border border-white/10 text-xs font-semibold text-zinc-200 inline-flex items-center gap-1.5 cursor-pointer"
              >
                <CalendarPlus className="w-4 h-4 text-sky-400" />
                <span>{simulating ? 'Memproses...' : 'Uji Ganti Hari Pohon (+1 Hari)'}</span>
              </button>
            </div>
          </form>
        </section>

        {/* Right: Claimed History */}
        <section className="lg:col-span-5 rounded-2xl bg-[#14141B] border border-white/10 p-5 sm:p-6 space-y-4">
          <h2 className="font-display text-base sm:text-lg font-bold text-white">
            Riwayat Klaim Hadiah ({claimedHistory.length})
          </h2>

          {claimedHistory.length === 0 ? (
            <p className="text-xs text-zinc-400 py-4">
              Belum ada hadiah yang diklaim pemain dari Toko NPC.
            </p>
          ) : (
            <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
              {claimedHistory.map((item) => (
                <div
                  key={item.id}
                  className="rounded-xl bg-[#0E0E13] border border-white/10 p-3.5 space-y-1"
                >
                  <p className="text-xs font-bold text-pink-200">{item.rewardTitle}</p>
                  <p className="text-[11px] text-zinc-400">
                    Diklaim oleh {item.claimedBy} ·{' '}
                    {new Date(item.claimedAt).toLocaleDateString('id-ID', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
