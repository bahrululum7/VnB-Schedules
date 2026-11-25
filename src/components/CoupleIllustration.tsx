import { motion, useReducedMotion } from 'motion/react';

interface CoupleIllustrationProps {
  partner1Name?: string;
  partner2Name?: string;
  compact?: boolean;
}

export function CoupleIllustration({
  partner1Name = 'Pasangan 1',
  partner2Name = 'Pasangan 2',
  compact = false,
}: CoupleIllustrationProps) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <div className="relative w-full select-none">
      <svg
        viewBox="0 0 560 230"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={compact ? 'w-full h-auto max-h-44' : 'w-full h-auto max-h-60'}
        role="img"
        aria-label="Ilustrasi pasangan VnB Schedules"
      >
        <defs>
          <radialGradient id="pinkGlowLeft" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#F472B6" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#F472B6" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="pinkGlowRight" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FB7185" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#FB7185" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Soft ambient circles behind characters */}
        <circle cx="130" cy="128" r="82" fill="url(#pinkGlowLeft)" />
        <circle cx="430" cy="128" r="82" fill="url(#pinkGlowRight)" />

        {/* Ground subtle line */}
        <line x1="45" y1="204" x2="515" y2="204" stroke="#F472B6" strokeOpacity="0.2" strokeWidth="1.5" strokeLinecap="round" />

        {/* LDR Connection Arc */}
        <path
          d="M 185 110 Q 280 35 372 110"
          stroke="#F472B6"
          strokeWidth="2"
          strokeDasharray="5 6"
          strokeLinecap="round"
          strokeOpacity="0.7"
        />

        {/* Floating Heart on LDR Arc */}
        <motion.g
          animate={prefersReducedMotion ? undefined : { y: [-3, 3, -3], scale: [1, 1.08, 1] }}
          transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
          style={{ transformOrigin: '280px 66px' }}
        >
          <circle cx="280" cy="66" r="16" fill="#1C1520" stroke="#F472B6" strokeOpacity="0.5" strokeWidth="1.5" />
          <path
            d="M280 73.5C280 73.5 271 67.8 271 62.6C271 59.9 273.1 58 275.5 58C277.3 58 278.9 59 280 60.5C281.1 59 282.7 58 284.5 58C286.9 58 289 59.9 289 62.6C289 67.8 280 73.5 280 73.5Z"
            fill="#F472B6"
          />
        </motion.g>

        {/* Tiny floating signal hearts */}
        <motion.path
          d="M225 84C225 84 220 80.7 220 77.7C220 76.2 221.2 75 222.6 75C223.7 75 224.5 75.6 225 76.4C225.5 75.6 226.3 75 227.4 75C228.8 75 230 76.2 230 77.7C230 80.7 225 84 225 84Z"
          fill="#FDA4AF"
          animate={prefersReducedMotion ? undefined : { y: [-2, 3, -2], opacity: [0.55, 1, 0.55] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.path
          d="M335 84C335 84 330 80.7 330 77.7C330 76.2 331.2 75 332.6 75C333.7 75 334.5 75.6 335 76.4C335.5 75.6 336.3 75 337.4 75C338.8 75 340 76.2 340 77.7C340 80.7 335 84 335 84Z"
          fill="#FDA4AF"
          animate={prefersReducedMotion ? undefined : { y: [2, -3, 2], opacity: [0.55, 1, 0.55] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
        />

        {/* ==================== LEFT: WANITA DOKTER LDR ==================== */}
        <g>
          {/* Hair back */}
          <path d="M96 92 C92 122 96 142 104 146 L156 146 C164 142 168 122 164 92 Z" fill="#2A1D28" />
          {/* Cute bun / ponytail */}
          <circle cx="130" cy="64" r="14" fill="#2A1D28" />
          <rect x="122" y="71" width="16" height="6" rx="3" fill="#F472B6" />

          {/* Pink medical scrubs underneath */}
          <path d="M104 142 L156 142 L162 204 L98 204 Z" fill="#F472B6" />
          {/* White doctor coat */}
          <path d="M95 140 C95 135 104 132 115 132 L123 145 L123 204 L91 204 Z" fill="#FAF5F7" />
          <path d="M165 140 C165 135 156 132 145 132 L137 145 L137 204 L169 204 Z" fill="#FAF5F7" />
          {/* Coat lapels */}
          <path d="M115 132 L123 158 L112 156 Z" fill="#E8DDE2" />
          <path d="M145 132 L137 158 L148 156 Z" fill="#E8DDE2" />
          {/* Pocket & pink pen */}
          <rect x="145" y="166" width="14" height="16" rx="3" stroke="#D5C8CE" strokeWidth="1.5" fill="#FFFFFF" />
          <line x1="150" y1="160" x2="150" y2="167" stroke="#EC4899" strokeWidth="2.5" strokeLinecap="round" />
          {/* Medical cross badge */}
          <rect x="100" y="152" width="14" height="10" rx="2" fill="#FCE7F3" stroke="#F472B6" strokeWidth="1" />
          <path d="M107 154.5 V159.5 M104.5 157 H109.5" stroke="#EC4899" strokeWidth="1.5" strokeLinecap="round" />

          {/* Neck */}
          <rect x="122" y="121" width="16" height="14" rx="6" fill="#FCD7C4" />

          {/* Stethoscope around neck */}
          <path
            d="M113 133 C111 154 120 166 130 166 C140 166 149 154 147 133"
            stroke="#1F1F2B"
            strokeWidth="3.5"
            strokeLinecap="round"
            fill="none"
          />
          <path d="M130 166 L130 179" stroke="#1F1F2B" strokeWidth="3" strokeLinecap="round" />
          <circle cx="130" cy="182" r="5.5" fill="#F472B6" stroke="#1F1F2B" strokeWidth="2" />

          {/* Head */}
          <circle cx="130" cy="100" r="27" fill="#FCD7C4" />
          {/* Cute bangs */}
          <path d="M102 96 C104 76 118 71 130 71 C144 71 157 78 158 96 C150 86 140 84 130 88 C120 84 110 86 102 96 Z" fill="#2A1D28" />
          {/* Blush cheeks */}
          <ellipse cx="114" cy="106" rx="4.5" ry="2.5" fill="#FB7185" fillOpacity="0.45" />
          <ellipse cx="146" cy="106" rx="4.5" ry="2.5" fill="#FB7185" fillOpacity="0.45" />
          {/* Eyes */}
          <circle cx="120" cy="100" r="2.6" fill="#1F1F2B" />
          <circle cx="140" cy="100" r="2.6" fill="#1F1F2B" />
          <circle cx="121" cy="99" r="0.9" fill="#FFFFFF" />
          <circle cx="141" cy="99" r="0.9" fill="#FFFFFF" />
          {/* Warm smile */}
          <path d="M125 110 Q130 115 135 110" stroke="#9F4E5B" strokeWidth="2" strokeLinecap="round" fill="none" />

          {/* Arm holding phone for LDR */}
          <path d="M161 148 L175 160 L168 172" stroke="#FAF5F7" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" />
          <rect x="163" y="148" width="13" height="21" rx="3" fill="#181820" stroke="#F472B6" strokeWidth="1.5" />
          <circle cx="169.5" cy="158" r="2.5" fill="#F472B6" />
        </g>

        {/* ==================== RIGHT: LELAKI PENUH PIKIRAN ==================== */}
        <g>
          {/* Cute swirling thought bubbles above his head */}
          <motion.g
            animate={prefersReducedMotion ? undefined : { y: [-2.5, 2.5, -2.5] }}
            transition={{ duration: 3.4, repeat: Infinity, ease: 'easeInOut' }}
          >
            {/* Small trail dots */}
            <circle cx="404" cy="74" r="3" fill="#252532" stroke="#FDA4AF" strokeOpacity="0.45" strokeWidth="1.2" />
            <circle cx="395" cy="62" r="4.5" fill="#252532" stroke="#FDA4AF" strokeOpacity="0.55" strokeWidth="1.2" />

            {/* Left thought cloud: tasks / clock */}
            <rect x="352" y="20" width="46" height="30" rx="12" fill="#1E1E29" stroke="#FDA4AF" strokeOpacity="0.6" strokeWidth="1.4" />
            <circle cx="366" cy="35" r="6" stroke="#F472B6" strokeWidth="1.4" />
            <path d="M366 32 V35 H368.5" stroke="#F472B6" strokeWidth="1.4" strokeLinecap="round" />
            <line x1="377" y1="31" x2="390" y2="31" stroke="#FAF5F7" strokeOpacity="0.7" strokeWidth="1.8" strokeLinecap="round" />
            <line x1="377" y1="38" x2="387" y2="38" stroke="#FAF5F7" strokeOpacity="0.45" strokeWidth="1.8" strokeLinecap="round" />
          </motion.g>

          <motion.g
            animate={prefersReducedMotion ? undefined : { y: [2.5, -2.5, 2.5] }}
            transition={{ duration: 3.1, repeat: Infinity, ease: 'easeInOut' }}
          >
            {/* Right thought cloud: thinking of her + study/work */}
            <circle cx="458" cy="70" r="3" fill="#252532" stroke="#F472B6" strokeOpacity="0.5" strokeWidth="1.2" />
            <circle cx="468" cy="58" r="4.5" fill="#252532" stroke="#F472B6" strokeOpacity="0.6" strokeWidth="1.2" />
            <rect x="444" y="16" width="54" height="32" rx="14" fill="#1E1E29" stroke="#F472B6" strokeOpacity="0.65" strokeWidth="1.4" />
            {/* Laptop / book icon */}
            <rect x="454" y="26" width="14" height="10" rx="2" stroke="#FDA4AF" strokeWidth="1.4" />
            <line x1="452" y1="38" x2="470" y2="38" stroke="#FDA4AF" strokeWidth="1.5" strokeLinecap="round" />
            {/* Little heart inside his thoughts */}
            <path
              d="M483 37C483 37 477.5 33.4 477.5 30.2C477.5 28.5 478.8 27.3 480.4 27.3C481.5 27.3 482.5 27.9 483 28.9C483.5 27.9 484.5 27.3 485.6 27.3C487.2 27.3 488.5 28.5 488.5 30.2C488.5 33.4 483 37 483 37Z"
              fill="#F472B6"
            />
          </motion.g>

          {/* Swirl doodle over head showing full of thoughts */}
          <motion.path
            d="M422 57 C422 50 434 49 435 55 C436 60 427 62 426 57 C425 54 430 53 431 56"
            stroke="#FDA4AF"
            strokeWidth="1.8"
            strokeLinecap="round"
            fill="none"
            animate={prefersReducedMotion ? undefined : { rotate: [0, 8, -8, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            style={{ transformOrigin: '429px 56px' }}
          />

          {/* Dark hoodie body */}
          <path d="M394 142 C394 134 404 132 414 132 L446 132 C456 132 466 134 466 142 L470 204 L390 204 Z" fill="#1F1F2B" stroke="#36364A" strokeWidth="1.5" />
          {/* Pink hoodie collar & drawstrings */}
          <path d="M412 132 Q430 148 448 132" stroke="#F472B6" strokeWidth="3" strokeLinecap="round" fill="none" />
          <line x1="422" y1="141" x2="420" y2="161" stroke="#FDA4AF" strokeWidth="2" strokeLinecap="round" />
          <line x1="438" y1="141" x2="440" y2="161" stroke="#FDA4AF" strokeWidth="2" strokeLinecap="round" />
          {/* Tiny heart patch on hoodie */}
          <circle cx="448" cy="158" r="5" fill="#F472B6" fillOpacity="0.2" />
          <circle cx="448" cy="158" r="2.2" fill="#F472B6" />

          {/* Neck */}
          <rect x="422" y="121" width="16" height="14" rx="6" fill="#F5CBAF" />

          {/* Head */}
          <circle cx="430" cy="100" r="27" fill="#F5CBAF" />
          {/* Messy cute dark hair */}
          <path
            d="M401 98 C399 76 413 66 431 67 C448 68 460 79 458 98 C452 87 444 83 434 86 C427 81 416 83 401 98 Z"
            fill="#1D1D28"
          />
          <path d="M418 70 L424 62 L431 70 L439 64 L443 73" fill="#1D1D28" />

          {/* Thoughtful eyes & brow */}
          <path d="M414 93 L424 95" stroke="#1D1D28" strokeWidth="2" strokeLinecap="round" />
          <path d="M436 95 L446 93" stroke="#1D1D28" strokeWidth="2" strokeLinecap="round" />
          <circle cx="420" cy="101" r="2.6" fill="#1D1D28" />
          <circle cx="440" cy="101" r="2.6" fill="#1D1D28" />
          <circle cx="421" cy="100" r="0.9" fill="#FFFFFF" />
          <circle cx="441" cy="100" r="0.9" fill="#FFFFFF" />
          {/* Gentle thoughtful mouth */}
          <path d="M424 112 Q430 110 436 113" stroke="#8C4E42" strokeWidth="2" strokeLinecap="round" fill="none" />

          {/* Hand resting on chin (thinking pose) */}
          <path d="M398 154 L408 134 L420 122" stroke="#1F1F2B" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="421" cy="120" r="5.5" fill="#F5CBAF" />
        </g>

        {/* Clean labels under characters */}
        <text x="130" y="222" textAnchor="middle" fill="#FDA4AF" fontSize="11.5" fontWeight="600" fontFamily="Plus Jakarta Sans, sans-serif">
          {partner1Name}
        </text>
        <text x="430" y="222" textAnchor="middle" fill="#E2D9DF" fontSize="11.5" fontWeight="600" fontFamily="Plus Jakarta Sans, sans-serif">
          {partner2Name}
        </text>
      </svg>
    </div>
  );
}
