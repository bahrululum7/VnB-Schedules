import { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { AnimatePresence, motion } from 'motion/react';
import { BellRing, Heart, Sparkles, X } from 'lucide-react';
import type { ScheduleItem } from '../types';
import { formatShortIndonesianDate } from '../utils/freeTime';
import { playCuteAlarmChime } from '../utils/sound';

export interface ActiveAlarmPayload {
  item: ScheduleItem;
  partner1Name: string;
  partner2Name: string;
  soundEnabled: boolean;
}

interface ExplosionAlarmModalProps {
  alarm: ActiveAlarmPayload | null;
  onDismiss: () => void;
}

export function ExplosionAlarmModal({ alarm, onDismiss }: ExplosionAlarmModalProps) {
  useEffect(() => {
    if (!alarm) return;

    if (alarm.soundEnabled) {
      playCuteAlarmChime();
    }

    const colors = ['#F472B6', '#FB7185', '#FDA4AF', '#FFFFFF', '#EC4899'];

    try {
      confetti({
        particleCount: 85,
        spread: 95,
        origin: { y: 0.52 },
        colors,
        startVelocity: 42,
      });

      const timer = window.setTimeout(() => {
        confetti({
          particleCount: 45,
          angle: 60,
          spread: 70,
          origin: { x: 0.15, y: 0.55 },
          colors,
        });
        confetti({
          particleCount: 45,
          angle: 120,
          spread: 70,
          origin: { x: 0.85, y: 0.55 },
          colors,
        });
      }, 180);

      return () => window.clearTimeout(timer);
    } catch {
      // Ignore confetti canvas fallback issues in headless environments.
    }
  }, [alarm]);

  const getGreetingMessage = (payload: ActiveAlarmPayload): string => {
    const { item, partner1Name, partner2Name } = payload;
    if (item.owner === 'together') {
      return `Hei ${partner1Name} & ${partner2Name}, sudah waktunya untuk memulai kegiatan kalian! Semangat ya !`;
    }
    const targetName = item.owner === 'partner1' ? partner1Name : partner2Name;
    return `Hei ${targetName}, sudah waktunya untuk memulai kegiatan kamu! Semangat ya !`;
  };

  return (
    <AnimatePresence>
      {alarm && (
        <motion.div
          key={alarm.item.id + alarm.item.startTime}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="alarm-card-title"
        >
          {/* Radial explosion shockwave rings */}
          <div className="pointer-events-none fixed inset-0 flex items-center justify-center overflow-hidden">
            <div className="w-64 h-64 rounded-full border-2 border-pink-400/70 animate-shockwave" />
          </div>

          <motion.div
            initial={{ scale: 0.25, opacity: 0, rotate: -3 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            exit={{ scale: 0.85, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 360, damping: 22 }}
            className="relative w-full max-w-md rounded-2xl bg-[#15151E] border border-pink-400/50 p-7 shadow-2xl shadow-pink-500/20 text-center"
          >
            <button
              type="button"
              onClick={onDismiss}
              aria-label="Tutup notifikasi alarm"
              className="absolute top-4 right-4 w-9 h-9 rounded-lg flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="mx-auto mb-5 w-14 h-14 rounded-2xl bg-pink-500/15 border border-pink-400/35 flex items-center justify-center text-pink-300">
              {alarm.item.owner === 'together' ? (
                <Heart className="w-7 h-7 fill-pink-400 text-pink-400" />
              ) : (
                <BellRing className="w-7 h-7 text-pink-300" />
              )}
            </div>

            <p className="font-mono-tabular text-xs font-medium tracking-wide text-pink-300 mb-2">
              {alarm.item.startTime} – {alarm.item.endTime} · {formatShortIndonesianDate(alarm.item.date)}
            </p>

            <h2
              id="alarm-card-title"
              className="font-display text-2xl font-bold text-white mb-3 text-balance"
            >
              {alarm.item.title}
            </h2>

            <p className="text-base leading-relaxed text-pink-100/95 bg-pink-500/10 border border-pink-400/20 rounded-xl px-4 py-3.5 mb-6">
              {getGreetingMessage(alarm)}
            </p>

            <button
              type="button"
              onClick={onDismiss}
              className="w-full min-h-[44px] px-5 py-2.5 rounded-xl bg-pink-500 hover:bg-pink-400 text-zinc-950 font-semibold text-sm transition-colors inline-flex items-center justify-center gap-2 cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>Siap, Semangat!</span>
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
