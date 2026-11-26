import { motion } from 'motion/react';
import type { BearPetState } from '../types';

export type BearActionEffect = 'none' | 'feed' | 'bath' | 'play' | 'water';

interface BearVisualSvgProps {
  pet: BearPetState;
  effect?: BearActionEffect;
}

export function BearVisualSvg({ pet, effect = 'none' }: BearVisualSvgProps) {
  const stageScale = pet.stage === 'baby' ? 0.84 : pet.stage === 'teen' ? 0.94 : 1.04;
  const isDirty = pet.hygiene < 40;
  const isHungry = pet.hunger < 35;
  const isTired = !pet.isSleeping && (pet.isExhausted || pet.energy <= 20);
  const isHappyEffect = effect === 'feed' || effect === 'play';

  return (
    <div className="relative w-full h-full flex items-center justify-center select-none">
      <motion.svg
        viewBox="0 0 260 280"
        className="w-full h-full max-w-[270px] max-h-[270px] drop-shadow-md"
        animate={
          pet.isSleeping
            ? { y: [0, 3, 0] }
            : isHappyEffect
              ? { y: [0, -10, 0], scale: [1, 1.03, 1] }
              : isTired
                ? { y: [0, 2, 0] }
                : { y: [0, -4, 0] }
        }
        transition={{
          duration: isHappyEffect ? 0.55 : 2.6,
          repeat: isHappyEffect ? 2 : Infinity,
          ease: 'easeInOut',
        }}
      >
        <defs>
          <radialGradient id="bearFur" cx="45%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#D69E72" />
            <stop offset="65%" stopColor="#B8784A" />
            <stop offset="100%" stopColor="#945831" />
          </radialGradient>
          <radialGradient id="bearBelly" cx="50%" cy="40%" r="60%">
            <stop offset="0%" stopColor="#FFF1E2" />
            <stop offset="100%" stopColor="#F5D3B3" />
          </radialGradient>
          <radialGradient id="bearShadow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(24,24,34,0.22)" />
            <stop offset="100%" stopColor="rgba(24,24,34,0)" />
          </radialGradient>
        </defs>

        {/* Ground Shadow */}
        <ellipse cx="130" cy="252" rx="66" ry="13" fill="url(#bearShadow)" />

        <g transform={`translate(130, 155) scale(${stageScale}) translate(-130, -155)`}>
          {/* Ears */}
          <circle cx="80" cy="70" r="24" fill="url(#bearFur)" stroke="#744222" strokeWidth="2.5" />
          <circle cx="80" cy="72" r="13" fill="#F6CBB4" />
          <circle cx="180" cy="70" r="24" fill="url(#bearFur)" stroke="#744222" strokeWidth="2.5" />
          <circle cx="180" cy="72" r="13" fill="#F6CBB4" />

          {/* Legs */}
          <ellipse cx="95" cy="226" rx="22" ry="26" fill="url(#bearFur)" stroke="#744222" strokeWidth="2.5" />
          <ellipse cx="165" cy="226" rx="22" ry="26" fill="url(#bearFur)" stroke="#744222" strokeWidth="2.5" />
          <ellipse cx="95" cy="232" rx="12" ry="10" fill="#F5D3B3" />
          <ellipse cx="165" cy="232" rx="12" ry="10" fill="#F5D3B3" />

          {/* Arms */}
          <motion.ellipse
            cx="66"
            cy="178"
            rx="18"
            ry="32"
            transform="rotate(20 66 178)"
            fill="url(#bearFur)"
            stroke="#744222"
            strokeWidth="2.5"
            animate={isHappyEffect ? { rotate: [20, 42, 20] } : undefined}
            transition={{ duration: 0.45, repeat: isHappyEffect ? 3 : 0 }}
          />
          <motion.ellipse
            cx="194"
            cy="178"
            rx="18"
            ry="32"
            transform="rotate(-20 194 178)"
            fill="url(#bearFur)"
            stroke="#744222"
            strokeWidth="2.5"
            animate={isHappyEffect ? { rotate: [-20, -42, -20] } : undefined}
            transition={{ duration: 0.45, repeat: isHappyEffect ? 3 : 0 }}
          />

          {/* Body */}
          <ellipse cx="130" cy="182" rx="58" ry="56" fill="url(#bearFur)" stroke="#744222" strokeWidth="2.5" />
          <ellipse cx="130" cy="188" rx="38" ry="40" fill="url(#bearBelly)" />

          {/* Stage Outfit Accessories */}
          {pet.stage === 'baby' && (
            <g>
              {/* Cute pastel baby bib */}
              <path
                d="M98 148 Q130 160 162 148 Q166 184 130 190 Q94 184 98 148 Z"
                fill="#FBCFE8"
                stroke="#EC4899"
                strokeWidth="2"
              />
              <circle cx="130" cy="168" r="6" fill="#F472B6" />
            </g>
          )}

          {pet.stage === 'teen' && (
            <g>
              {/* Adventurer scarf */}
              <path
                d="M84 142 Q130 162 176 142 L170 158 Q130 176 90 158 Z"
                fill="#F472B6"
                stroke="#BE185D"
                strokeWidth="2"
              />
              <path d="M142 154 L160 184 L145 188 L132 158 Z" fill="#EC4899" stroke="#BE185D" strokeWidth="1.8" />
            </g>
          )}

          {pet.stage === 'adult' && (
            <g>
              {/* Cozy gardener vest */}
              <path
                d="M82 146 Q102 154 106 182 L106 218 Q84 212 76 188 Z"
                fill="#34D399"
                stroke="#065F46"
                strokeWidth="2"
              />
              <path
                d="M178 146 Q158 154 154 182 L154 218 Q176 212 184 188 Z"
                fill="#34D399"
                stroke="#065F46"
                strokeWidth="2"
              />
              <circle cx="96" cy="186" r="3.5" fill="#FBBF24" />
              <circle cx="164" cy="186" r="3.5" fill="#FBBF24" />
            </g>
          )}

          {/* Head */}
          <ellipse cx="130" cy="108" rx="64" ry="55" fill="url(#bearFur)" stroke="#744222" strokeWidth="2.5" />

          {/* Adult Sprout / Crown */}
          {pet.stage === 'adult' && (
            <g transform="translate(130, 50)">
              <path d="M0 4 Q0 -12 0 -14" stroke="#15803D" strokeWidth="3" strokeLinecap="round" />
              <path d="M0 -10 Q-16 -24 -18 -8 Q-12 0 0 -10 Z" fill="#4ADE80" stroke="#15803D" strokeWidth="1.8" />
              <path d="M0 -12 Q16 -26 18 -10 Q12 -2 0 -12 Z" fill="#22C55E" stroke="#15803D" strokeWidth="1.8" />
            </g>
          )}

          {/* Sleep Nightcap */}
          {pet.isSleeping && (
            <g>
              <path
                d="M82 76 Q130 22 182 76 Q152 60 82 76 Z"
                fill="#818CF8"
                stroke="#4338CA"
                strokeWidth="2"
              />
              <path d="M168 62 Q196 68 190 92" stroke="#4338CA" strokeWidth="2" fill="none" />
              <circle cx="191" cy="94" r="8" fill="#F8FAFC" stroke="#4338CA" strokeWidth="1.8" />
            </g>
          )}

          {/* Muzzle */}
          <ellipse cx="130" cy="122" rx="28" ry="22" fill="url(#bearBelly)" />
          <ellipse cx="130" cy="113" rx="10" ry="7" fill="#3B2314" />
          <ellipse cx="127" cy="111" rx="3" ry="1.8" fill="#FFF" opacity="0.55" />

          {/* Cheeks */}
          <ellipse cx="86" cy="120" rx="11" ry="6.5" fill="#FB7185" opacity={isTired ? 0.2 : 0.48} />
          <ellipse cx="174" cy="120" rx="11" ry="6.5" fill="#FB7185" opacity={isTired ? 0.2 : 0.48} />

          {/* Eyes */}
          {pet.isSleeping ? (
            <>
              <path d="M90 100 Q100 108 110 100" stroke="#3B2314" strokeWidth="3.5" fill="none" strokeLinecap="round" />
              <path d="M150 100 Q160 108 170 100" stroke="#3B2314" strokeWidth="3.5" fill="none" strokeLinecap="round" />
            </>
          ) : isTired ? (
            <>
              {/* Droopy exhausted eyes */}
              <ellipse cx="100" cy="100" rx="8" ry="7" fill="#27170E" />
              <path d="M89 96 L111 99" stroke="#945831" strokeWidth="5" strokeLinecap="round" />
              <ellipse cx="160" cy="100" rx="8" ry="7" fill="#27170E" />
              <path d="M149 99 L171 96" stroke="#945831" strokeWidth="5" strokeLinecap="round" />
              {/* Sweat drop */}
              <path d="M180 86 Q187 96 180 102 Q173 96 180 86 Z" fill="#60A5FA" stroke="#2563EB" strokeWidth="1.2" />
            </>
          ) : (
            <>
              <circle cx="100" cy="99" r="9.5" fill="#23160E" />
              <circle cx="97" cy="95" r="3.5" fill="#FFFFFF" />
              <circle cx="103" cy="102" r="1.6" fill="#FFFFFF" opacity="0.8" />
              <circle cx="160" cy="99" r="9.5" fill="#23160E" />
              <circle cx="157" cy="95" r="3.5" fill="#FFFFFF" />
              <circle cx="163" cy="102" r="1.6" fill="#FFFFFF" opacity="0.8" />
            </>
          )}

          {/* Mouth */}
          {pet.isSleeping ? (
            <circle cx="130" cy="130" r="4.5" fill="#9D174D" />
          ) : effect === 'feed' ? (
            <ellipse cx="130" cy="130" rx="9" ry="8" fill="#BE185D" />
          ) : isTired || isHungry ? (
            <path d="M120 132 Q130 125 140 132" stroke="#3B2314" strokeWidth="3" fill="none" strokeLinecap="round" />
          ) : (
            <path
              d="M118 126 Q124 134 130 128 Q136 134 142 126"
              stroke="#3B2314"
              strokeWidth="3"
              fill="none"
              strokeLinecap="round"
            />
          )}

          {/* Mud Smudges when Dirty */}
          {isDirty && (
            <g opacity="0.65">
              <ellipse cx="98" cy="132" rx="7" ry="4" fill="#6B4423" />
              <circle cx="155" cy="176" r="6" fill="#6B4423" />
              <circle cx="112" cy="196" r="4.5" fill="#6B4423" />
            </g>
          )}
        </g>

        {/* Sleep Zzz Animation */}
        {pet.isSleeping && (
          <g>
            <motion.text
              x="196"
              y="62"
              fill="#6366F1"
              fontSize="18"
              fontWeight="bold"
              animate={{ y: [62, 42], opacity: [0, 1, 0] }}
              transition={{ duration: 2.2, repeat: Infinity }}
            >
              Z
            </motion.text>
            <motion.text
              x="212"
              y="45"
              fill="#818CF8"
              fontSize="14"
              fontWeight="bold"
              animate={{ y: [45, 25], opacity: [0, 1, 0] }}
              transition={{ duration: 2.2, delay: 0.7, repeat: Infinity }}
            >
              z
            </motion.text>
          </g>
        )}

        {/* Bath Bubbles Animation */}
        {effect === 'bath' && (
          <g>
            {[
              { cx: 58, cy: 110, r: 12 },
              { cx: 204, cy: 102, r: 14 },
              { cx: 74, cy: 196, r: 10 },
              { cx: 190, cy: 185, r: 11 },
              { cx: 130, cy: 48, r: 10 },
            ].map((b, i) => (
              <motion.circle
                key={i}
                cx={b.cx}
                cy={b.cy}
                r={b.r}
                fill="#E0F2FE"
                fillOpacity="0.7"
                stroke="#38BDF8"
                strokeWidth="2"
                animate={{ y: [0, -18, 0], scale: [0.9, 1.12, 0.9] }}
                transition={{ duration: 1.2, delay: i * 0.15, repeat: Infinity }}
              />
            ))}
          </g>
        )}

        {/* Happy Hearts / Sparkles on Feed or Play */}
        {isHappyEffect && (
          <g>
            <motion.path
              d="M66 72 C66 64 56 64 56 72 C56 79 66 85 66 85 C66 85 76 79 76 72 C76 64 66 64 66 72 Z"
              fill="#F472B6"
              animate={{ y: [0, -16], opacity: [1, 0] }}
              transition={{ duration: 1.1, repeat: Infinity }}
            />
            <motion.path
              d="M196 66 C196 58 186 58 186 66 C186 73 196 79 196 79 C196 79 206 73 206 66 C206 58 196 58 196 66 Z"
              fill="#EC4899"
              animate={{ y: [0, -18], opacity: [1, 0] }}
              transition={{ duration: 1.1, delay: 0.3, repeat: Infinity }}
            />
          </g>
        )}
      </motion.svg>
    </div>
  );
}
