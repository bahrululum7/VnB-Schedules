import { motion } from 'motion/react';
import type { TreeMissionState } from '../types';

interface FruitTreeSvgProps {
  tree: TreeMissionState;
  isWatering?: boolean;
}

export function FruitTreeSvg({ tree, isWatering = false }: FruitTreeSvgProps) {
  const isDead = tree.status === 'dead';
  const isWilting = tree.status === 'wilting';
  const isFruiting = tree.status === 'fruiting';
  const isDay1 = !isDead && !isFruiting && tree.cycleDay <= 1;

  const leafMain = isDead ? '#6B5B53' : isWilting ? '#CA8A04' : '#22C55E';
  const leafHighlight = isDead ? '#78716C' : isWilting ? '#EAB308' : '#4ADE80';
  const leafDark = isDead ? '#44403C' : isWilting ? '#A16207' : '#15803D';

  return (
    <div className="relative w-full h-full flex items-center justify-center select-none">
      <svg viewBox="0 0 280 280" className="w-full h-full max-w-[270px] max-h-[270px] drop-shadow-md">
        <defs>
          <radialGradient id="soilGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#92400E" />
            <stop offset="100%" stopColor="#451A03" />
          </radialGradient>
          <radialGradient id="fruitShine" cx="35%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#FBCFE8" />
            <stop offset="55%" stopColor="#EC4899" />
            <stop offset="100%" stopColor="#9D174D" />
          </radialGradient>
        </defs>

        {/* Garden Grass Mound */}
        <ellipse cx="140" cy="246" rx="96" ry="18" fill={isDead ? '#57534E' : '#86EFAC'} opacity="0.55" />
        <ellipse cx="140" cy="242" rx="68" ry="14" fill="url(#soilGlow)" />

        {/* Trunk & Branches */}
        {isDay1 ? (
          <g>
            <path d="M136 240 L137 166 Q140 158 144 166 L145 240 Z" fill="#78350F" />
            <path d="M140 194 Q120 176 112 164" stroke="#78350F" strokeWidth="6" strokeLinecap="round" fill="none" />
            <path d="M140 184 Q162 170 168 156" stroke="#78350F" strokeWidth="5.5" strokeLinecap="round" fill="none" />
          </g>
        ) : (
          <g>
            <path
              d="M124 242 Q130 198 128 148 L152 148 Q150 198 158 242 Z"
              fill={isDead ? '#44403C' : '#78350F'}
              stroke={isDead ? '#292524' : '#451A03'}
              strokeWidth="2"
            />
            <path
              d="M135 162 Q104 134 86 112"
              stroke={isDead ? '#44403C' : '#78350F'}
              strokeWidth="9"
              strokeLinecap="round"
              fill="none"
            />
            <path
              d="M145 156 Q178 130 194 108"
              stroke={isDead ? '#44403C' : '#78350F'}
              strokeWidth="9"
              strokeLinecap="round"
              fill="none"
            />
          </g>
        )}

        {/* Canopy */}
        {isDead ? (
          <g>
            {/* Withered bare twigs & fallen leaves */}
            <path d="M106 130 L84 114 M176 124 L198 106 M140 148 L142 106" stroke="#44403C" strokeWidth="4" strokeLinecap="round" />
            <ellipse cx="96" cy="244" rx="8" ry="4" fill="#78716C" />
            <ellipse cx="182" cy="246" rx="9" ry="4" fill="#A8A29E" />
          </g>
        ) : isDay1 ? (
          <motion.g
            animate={isWilting ? { rotate: [0, 2, 0] } : { scale: [1, 1.02, 1] }}
            transition={{ duration: 3, repeat: Infinity }}
          >
            <circle cx="140" cy="142" r="36" fill={leafDark} />
            <circle cx="114" cy="154" r="24" fill={leafMain} />
            <circle cx="166" cy="152" r="24" fill={leafMain} />
            <circle cx="140" cy="124" r="28" fill={leafHighlight} />
          </motion.g>
        ) : (
          <motion.g
            animate={isWilting ? { y: [0, 3, 0] } : { scale: [1, 1.015, 1] }}
            transition={{ duration: 3.2, repeat: Infinity }}
          >
            <circle cx="140" cy="108" r="56" fill={leafDark} />
            <circle cx="92" cy="126" r="40" fill={leafMain} />
            <circle cx="188" cy="126" r="40" fill={leafMain} />
            <circle cx="118" cy="86" r="38" fill={leafMain} />
            <circle cx="164" cy="88" r="36" fill={leafHighlight} />
            <circle cx="140" cy="112" r="42" fill={leafHighlight} opacity="0.85" />

            {/* Pink Blossoms on Day 2+ */}
            {!isWilting && !isFruiting && (
              <g>
                <circle cx="102" cy="112" r="6" fill="#FBCFE8" />
                <circle cx="176" cy="96" r="6.5" fill="#F9A8D4" />
                <circle cx="136" cy="76" r="6" fill="#FBCFE8" />
                <circle cx="164" cy="130" r="5.5" fill="#F9A8D4" />
              </g>
            )}

            {/* Plump Glowing Fruits when Fruiting (Day 3 + watered!) */}
            {isFruiting && (
              <g>
                {[
                  { cx: 96, cy: 122 },
                  { cx: 126, cy: 90 },
                  { cx: 162, cy: 84 },
                  { cx: 186, cy: 120 },
                  { cx: 142, cy: 124 },
                  { cx: 112, cy: 144 },
                  { cx: 168, cy: 142 },
                ].map((f, idx) => (
                  <motion.g
                    key={idx}
                    animate={{ scale: [1, 1.08, 1] }}
                    transition={{ duration: 1.5, delay: idx * 0.15, repeat: Infinity }}
                  >
                    <circle cx={f.cx} cy={f.cy} r="11" fill="url(#fruitShine)" stroke="#FFF1F2" strokeWidth="1.5" />
                    <path d={`M${f.cx} ${f.cy - 11} Q${f.cx + 4} ${f.cy - 17} ${f.cx + 7} ${f.cy - 14}`} stroke="#15803D" strokeWidth="2" fill="none" />
                  </motion.g>
                ))}
              </g>
            )}
          </motion.g>
        )}

        {/* Watering Splash Droplets */}
        {isWatering && (
          <g>
            {[95, 118, 140, 162, 185].map((x, idx) => (
              <motion.path
                key={idx}
                d={`M${x} 36 Q${x + 5} 46 ${x} 52 Q${x - 5} 46 ${x} 36 Z`}
                fill="#38BDF8"
                animate={{ y: [0, 88], opacity: [0, 1, 0] }}
                transition={{ duration: 0.85, delay: idx * 0.1, repeat: Infinity }}
              />
            ))}
          </g>
        )}
      </svg>
    </div>
  );
}
