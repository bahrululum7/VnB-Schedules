import { useEffect, useState, type FormEvent } from 'react';
import { Eye, EyeOff, Heart, Lock, User } from 'lucide-react';
import type { AuthenticatedUser, PartnerRole, PartnerSlot, SharedWorkspaceState } from '../types';
import { CoupleIllustration } from './CoupleIllustration';

interface PartnerPreview {
  partner1: { slot: PartnerSlot; name: string; role: PartnerRole };
  partner2: { slot: PartnerSlot; name: string; role: PartnerRole };
}

interface LoginGateProps {
  onLoginSuccess: (payload: {
    token: string;
    user: AuthenticatedUser;
    state: SharedWorkspaceState;
  }) => void;
}

export function LoginGate({ onLoginSuccess }: LoginGateProps) {
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<PartnerSlot>('partner1');
  const [preview, setPreview] = useState<PartnerPreview | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetch('/api/partners-preview')
      .then((r) => (r.ok ? r.json() : null))
      .then((data: PartnerPreview | null) => {
        if (active && data) {
          setPreview(data);
        }
      })
      .catch(() => {
        // Preview is optional.
      });
    return () => {
      active = false;
    };
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!name.trim()) {
      setErrorMsg('Isi nama panggilan kamu dulu ya.');
      return;
    }
    if (!password) {
      setErrorMsg('Jangan lupa isi password-nya ya.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          password,
          slot: selectedSlot,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'Gagal masuk, coba cek lagi ya.');
        return;
      }
      onLoginSuccess(data);
    } catch {
      setErrorMsg('Koneksi ke server lagi bermasalah, coba sebentar lagi.');
    } finally {
      setSubmitting(false);
    }
  };

  const p1Label =
    preview && preview.partner1.name !== 'Pasangan 1'
      ? preview.partner1.name
      : 'Pasangan 1';
  const p2Label =
    preview && preview.partner2.name !== 'Pasangan 2'
      ? preview.partner2.name
      : 'Pasangan 2';

  return (
    <div className="min-h-screen bg-[#0B0B0F] text-[#FAF5F7] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        {/* Left: Brand & Illustration */}
        <div className="lg:col-span-6 space-y-6">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 text-xs font-medium text-pink-300">
              <Heart className="w-3.5 h-3.5 fill-pink-400 text-pink-400" />
              <span>Jadwal Berdua · Real-Time</span>
            </div>
            <h1 className="font-display text-4xl sm:text-5xl font-bold tracking-tight text-white text-balance">
              VnB Schedules
            </h1>
            <p className="text-base text-zinc-400 leading-relaxed max-w-md">
              Tulis kegiatan hari ini & besok bareng pasangan, cari jam kosong buat quality time, dan putar spin biar nggak bingung mau ngapain.
            </p>
          </div>

          <div className="rounded-2xl bg-[#14141B] border border-white/10 p-5">
            <CoupleIllustration
              partner1Name={selectedSlot === 'partner1' && name.trim() ? name.trim() : p1Label}
              partner2Name={selectedSlot === 'partner2' && name.trim() ? name.trim() : p2Label}
            />
          </div>
        </div>

        {/* Right: Login Card */}
        <div className="lg:col-span-6">
          <div className="rounded-2xl bg-[#14141B] border border-pink-400/20 p-6 sm:p-8 shadow-xl shadow-black/40">
            <div className="mb-6">
              <h2 className="font-display text-2xl font-bold text-white">
                Masuk Dulu Yuk
              </h2>
              <p className="text-sm text-zinc-400 mt-1">
                Biar nama panggilan dan jadwal kalian kesimpan rapi di sini.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Partner Slot Selector */}
              <div className="space-y-2">
                <label className="block text-xs font-medium text-zinc-300">
                  Pilih posisi jadwal kamu
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedSlot('partner1')}
                    className={`min-h-[56px] rounded-xl border px-3.5 py-2.5 text-left transition-colors cursor-pointer ${
                      selectedSlot === 'partner1'
                        ? 'bg-pink-500/15 border-pink-400 text-white'
                        : 'bg-[#1B1B24] border-white/10 text-zinc-400 hover:text-zinc-200 hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center gap-2 text-sm font-semibold">
                      <User className="w-4 h-4 text-pink-400 shrink-0" />
                      <span className="truncate">{p1Label}</span>
                    </div>
                    <p className="text-xs text-zinc-400 mt-0.5 truncate">
                      Jadwal kolom kiri
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedSlot('partner2')}
                    className={`min-h-[56px] rounded-xl border px-3.5 py-2.5 text-left transition-colors cursor-pointer ${
                      selectedSlot === 'partner2'
                        ? 'bg-pink-500/15 border-pink-400 text-white'
                        : 'bg-[#1B1B24] border-white/10 text-zinc-400 hover:text-zinc-200 hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center gap-2 text-sm font-semibold">
                      <User className="w-4 h-4 text-pink-300 shrink-0" />
                      <span className="truncate">{p2Label}</span>
                    </div>
                    <p className="text-xs text-zinc-400 mt-0.5 truncate">
                      Jadwal kolom kanan
                    </p>
                  </button>
                </div>
              </div>

              {/* Nickname */}
              <div className="space-y-1.5">
                <label htmlFor="login-name" className="block text-xs font-medium text-zinc-300">
                  Nama Panggilan Kamu
                </label>
                <input
                  id="login-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={32}
                  placeholder="Contoh: Vina atau Bahrul"
                  className="w-full min-h-[44px] rounded-xl bg-[#0E0E13] border border-white/15 px-3.5 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-pink-400 transition-colors"
                />
              </div>

              {/* Passcode */}
              <div className="space-y-1.5">
                <label htmlFor="login-password" className="block text-xs font-medium text-zinc-300">
                  Kata Sandi Berdua
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Masukkan kata sandi..."
                    className="w-full min-h-[44px] rounded-xl bg-[#0E0E13] border border-white/15 pl-10 pr-11 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-pink-400 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? 'Sembunyikan sandi' : 'Lihat sandi'}
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg flex items-center justify-center text-zinc-400 hover:text-white cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {errorMsg && (
                <div
                  role="alert"
                  className="rounded-xl bg-rose-500/15 border border-rose-400/35 px-3.5 py-2.5 text-xs text-rose-200"
                >
                  {errorMsg}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full min-h-[46px] rounded-xl bg-pink-500 hover:bg-pink-400 disabled:opacity-60 text-zinc-950 font-semibold text-sm transition-colors cursor-pointer"
              >
                {submitting ? 'Lagi masuk...' : 'Masuk ke Jadwal Kita'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
