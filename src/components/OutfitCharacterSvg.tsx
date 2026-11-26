import type { CharacterOutfit, OutfitGender } from '../types/outfit';

interface OutfitCharacterSvgProps {
  gender: OutfitGender;
  outfit: CharacterOutfit;
  className?: string;
}

function shadeHex(hex: string, amount: number): string {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return hex;
  const num = parseInt(clean, 16);
  if (Number.isNaN(num)) return hex;
  const clamp = (v: number) => Math.max(0, Math.min(255, v));
  const r = clamp(((num >> 16) & 255) + amount);
  const g = clamp(((num >> 8) & 255) + amount);
  const b = clamp((num & 255) + amount);
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

export function OutfitCharacterSvg({
  gender,
  outfit,
  className = 'w-full h-full',
}: OutfitCharacterSvgProps) {
  const isFemale = gender === 'female';
  const hasHijab = outfit.hijabStyle !== 'none';
  const skinShadow = shadeHex(outfit.skinTone, -18);
  const hairShade = shadeHex(outfit.hairColor, -22);
  const hijabShade = shadeHex(outfit.hijabColor, -22);
  const shirtShade = shadeHex(outfit.shirtColor, -22);
  const kemejaShade = shadeHex(outfit.kemejaColor, -22);
  const cardiganShade = shadeHex(outfit.cardiganColor, -22);
  const pantsShade = shadeHex(outfit.pantsColor, -24);
  const shoesShade = shadeHex(outfit.shoesColor, -22);

  // Body proportions slightly differ between Wanita and Lelaki
  const shoulderHalf = isFemale ? 27 : 33;
  const waistHalf = isFemale ? 20 : 25;
  const hipHalf = isFemale ? 26 : 25;
  const armLeftX = isFemale ? 84 : 78;
  const armRightX = isFemale ? 156 : 162;

  const outline = '#181420';

  const renderFaceShape = () => {
    switch (outfit.faceShape) {
      case 'round':
        return (
          <ellipse
            cx="120"
            cy="96"
            rx="40"
            ry="38"
            fill={outfit.skinTone}
            stroke={outline}
            strokeWidth="2.4"
          />
        );
      case 'chubby':
        return (
          <path
            d="M 80 94 C 80 68, 97 56, 120 56 C 143 56, 160 68, 160 94 C 162 120, 146 137, 120 137 C 94 137, 78 120, 80 94 Z"
            fill={outfit.skinTone}
            stroke={outline}
            strokeWidth="2.4"
          />
        );
      case 'sharp':
        return (
          <path
            d="M 84 90 C 84 65, 98 54, 120 54 C 142 54, 156 65, 156 90 C 156 112, 138 134, 120 138 C 102 134, 84 112, 84 90 Z"
            fill={outfit.skinTone}
            stroke={outline}
            strokeWidth="2.4"
          />
        );
      case 'oval':
      default:
        return (
          <ellipse
            cx="120"
            cy="96"
            rx="36"
            ry="41"
            fill={outfit.skinTone}
            stroke={outline}
            strokeWidth="2.4"
          />
        );
    }
  };

  const renderEars = () => {
    if (hasHijab || outfit.ears === 'hidden') return null;
    const rx = outfit.ears === 'small' ? 5.5 : 7;
    const ry = outfit.ears === 'small' ? 8 : 10;
    const earOffsetX =
      outfit.faceShape === 'chubby' || outfit.faceShape === 'round' ? 40 : 36;
    const lx = 120 - earOffsetX;
    const rxPos = 120 + earOffsetX;
    return (
      <g>
        <ellipse
          cx={lx}
          cy="99"
          rx={rx}
          ry={ry}
          fill={outfit.skinTone}
          stroke={outline}
          strokeWidth="2.2"
        />
        <ellipse
          cx={rxPos}
          cy="99"
          rx={rx}
          ry={ry}
          fill={outfit.skinTone}
          stroke={outline}
          strokeWidth="2.2"
        />
        <path
          d={`M ${lx - 1.5} 96 Q ${lx + 1.5} 99 ${lx - 1} 103`}
          fill="none"
          stroke={skinShadow}
          strokeWidth="1.6"
          strokeLinecap="round"
        />
        <path
          d={`M ${rxPos + 1.5} 96 Q ${rxPos - 1.5} 99 ${rxPos + 1} 103`}
          fill="none"
          stroke={skinShadow}
          strokeWidth="1.6"
          strokeLinecap="round"
        />
        {outfit.ears === 'pierced' && (
          <>
            <circle cx={lx - 1} cy={106} r="2.6" fill="#F472B6" stroke={outline} strokeWidth="1" />
            <circle cx={rxPos + 1} cy={106} r="2.6" fill="#F472B6" stroke={outline} strokeWidth="1" />
          </>
        )}
      </g>
    );
  };

  const renderEyes = () => {
    const browColor = shadeHex(outfit.hairColor, -20);
    const renderBrows = (lift = 0) => (
      <g stroke={browColor} strokeWidth="2.3" strokeLinecap="round" fill="none">
        <path d={`M 96 ${83 - lift} Q 104 ${80 - lift} 112 ${83 - lift}`} />
        <path d={`M 128 ${83 - lift} Q 136 ${80 - lift} 144 ${83 - lift}`} />
      </g>
    );

    switch (outfit.eyes) {
      case 'happy':
        return (
          <g>
            {renderBrows(1)}
            <path d="M 96 97 Q 104 89 112 97" fill="none" stroke={outline} strokeWidth="2.8" strokeLinecap="round" />
            <path d="M 128 97 Q 136 89 144 97" fill="none" stroke={outline} strokeWidth="2.8" strokeLinecap="round" />
          </g>
        );
      case 'wink':
        return (
          <g>
            {renderBrows()}
            <ellipse cx="104" cy="96" rx="5.5" ry="6.5" fill="#181420" />
            <circle cx="102.5" cy="94" r="2" fill="#FFFFFF" />
            <path d="M 128 96 Q 136 90 144 96" fill="none" stroke={outline} strokeWidth="2.8" strokeLinecap="round" />
          </g>
        );
      case 'cool':
        return (
          <g>
            <g stroke={browColor} strokeWidth="2.6" strokeLinecap="round" fill="none">
              <path d="M 95 85 L 113 87" />
              <path d="M 127 87 L 145 85" />
            </g>
            <path d="M 97 95 L 112 95" stroke={outline} strokeWidth="2" strokeLinecap="round" />
            <path d="M 128 95 L 143 95" stroke={outline} strokeWidth="2" strokeLinecap="round" />
            <ellipse cx="104.5" cy="98" rx="4.5" ry="3.5" fill="#181420" />
            <ellipse cx="135.5" cy="98" rx="4.5" ry="3.5" fill="#181420" />
            <circle cx="103" cy="97" r="1.2" fill="#FFFFFF" />
            <circle cx="134" cy="97" r="1.2" fill="#FFFFFF" />
          </g>
        );
      case 'wide':
        return (
          <g>
            {renderBrows(2)}
            <ellipse cx="104" cy="96" rx="7" ry="8" fill="#FFFFFF" stroke={outline} strokeWidth="1.8" />
            <ellipse cx="136" cy="96" rx="7" ry="8" fill="#FFFFFF" stroke={outline} strokeWidth="1.8" />
            <circle cx="104.5" cy="96.5" r="4.5" fill="#181420" />
            <circle cx="135.5" cy="96.5" r="4.5" fill="#181420" />
            <circle cx="103" cy="94.5" r="1.8" fill="#FFFFFF" />
            <circle cx="134" cy="94.5" r="1.8" fill="#FFFFFF" />
          </g>
        );
      case 'sweet':
        return (
          <g>
            {renderBrows()}
            <ellipse cx="104" cy="96" rx="5.5" ry="6.2" fill="#181420" />
            <ellipse cx="136" cy="96" rx="5.5" ry="6.2" fill="#181420" />
            <circle cx="102.5" cy="94" r="2" fill="#FFFFFF" />
            <circle cx="134.5" cy="94" r="2" fill="#FFFFFF" />
            <path d="M 97 92 L 94 90 M 143 92 L 146 90" stroke={outline} strokeWidth="1.8" strokeLinecap="round" />
          </g>
        );
      case 'sparkle':
      default:
        return (
          <g>
            {renderBrows()}
            <ellipse cx="104" cy="96" rx="6.2" ry="7.2" fill="#181420" />
            <ellipse cx="136" cy="96" rx="6.2" ry="7.2" fill="#181420" />
            <circle cx="102" cy="93.5" r="2.3" fill="#FFFFFF" />
            <circle cx="134" cy="93.5" r="2.3" fill="#FFFFFF" />
            <circle cx="106" cy="98.5" r="1.1" fill="#FCE7F3" />
            <circle cx="138" cy="98.5" r="1.1" fill="#FCE7F3" />
          </g>
        );
    }
  };

  const renderNose = () => {
    switch (outfit.nose) {
      case 'slim':
        return (
          <path d="M 120 101 L 118.5 108 L 122 109" fill="none" stroke={skinShadow} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        );
      case 'button':
        return (
          <ellipse cx="120" cy="107" rx="3" ry="2" fill={skinShadow} opacity="0.7" />
        );
      case 'line':
        return (
          <path d="M 120 102 L 120 108" fill="none" stroke={skinShadow} strokeWidth="1.8" strokeLinecap="round" />
        );
      case 'cute':
      default:
        return (
          <path d="M 118 106 Q 120 109 122 106" fill="none" stroke={skinShadow} strokeWidth="1.8" strokeLinecap="round" />
        );
    }
  };

  const renderMouth = () => {
    switch (outfit.mouth) {
      case 'grin':
        return (
          <path
            d="M 111 116 Q 120 126 129 116 Z"
            fill="#FFFFFF"
            stroke={outline}
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
        );
      case 'o_cute':
        return (
          <ellipse cx="120" cy="119" rx="4" ry="4.5" fill="#FB7185" stroke={outline} strokeWidth="1.8" />
        );
      case 'calm':
        return (
          <path d="M 114 118 Q 120 120 126 118" fill="none" stroke={outline} strokeWidth="2" strokeLinecap="round" />
        );
      case 'tongue':
        return (
          <g>
            <path d="M 112 116 Q 120 123 128 116" fill="none" stroke={outline} strokeWidth="2" strokeLinecap="round" />
            <path d="M 116 119 Q 120 126 124 119 Z" fill="#FB7185" stroke={outline} strokeWidth="1.5" />
          </g>
        );
      case 'smirk':
        return (
          <path d="M 114 119 Q 122 120 128 115" fill="none" stroke={outline} strokeWidth="2" strokeLinecap="round" />
        );
      case 'smile':
      default:
        return (
          <path d="M 112 116 Q 120 123 128 116" fill="none" stroke={outline} strokeWidth="2.1" strokeLinecap="round" />
        );
    }
  };

  const renderBackHair = () => {
    if (hasHijab || outfit.hairStyle === 'none') return null;
    switch (outfit.hairStyle) {
      case 'long_straight':
        return (
          <path
            d="M 76 92 C 74 135, 70 185, 74 226 C 95 232, 145 232, 166 226 C 170 185, 166 135, 164 92 C 164 56, 144 45, 120 45 C 96 45, 76 56, 76 92 Z"
            fill={hairShade}
            stroke={outline}
            strokeWidth="2.4"
          />
        );
      case 'wavy':
        return (
          <path
            d="M 74 90 C 66 125, 78 150, 70 185 C 66 205, 76 224, 84 228 L 156 228 C 164 224, 174 205, 170 185 C 162 150, 174 125, 166 90 C 162 55, 142 44, 120 44 C 98 44, 78 55, 74 90 Z"
            fill={hairShade}
            stroke={outline}
            strokeWidth="2.4"
          />
        );
      case 'bob':
        return (
          <path
            d="M 76 92 C 74 122, 76 144, 88 150 L 152 150 C 164 144, 166 122, 164 92 C 162 56, 142 46, 120 46 C 98 46, 78 56, 76 92 Z"
            fill={hairShade}
            stroke={outline}
            strokeWidth="2.4"
          />
        );
      case 'twintails':
        return (
          <g fill={hairShade} stroke={outline} strokeWidth="2.3">
            <path d="M 80 86 C 60 95, 56 142, 64 185 C 72 184, 82 162, 84 124 Z" />
            <path d="M 160 86 C 180 95, 184 142, 176 185 C 168 184, 158 162, 156 124 Z" />
            <circle cx="80" cy="86" r="5" fill="#F472B6" />
            <circle cx="160" cy="86" r="5" fill="#F472B6" />
          </g>
        );
      case 'bun':
        return (
          <g fill={hairShade} stroke={outline} strokeWidth="2.3">
            <circle cx="120" cy="40" r="17" />
            <path d="M 108 48 Q 120 53 132 48" fill="none" stroke="#F472B6" strokeWidth="4" strokeLinecap="round" />
          </g>
        );
      default:
        return null;
    }
  };

  const renderFrontHair = () => {
    if (hasHijab || outfit.hairStyle === 'none') return null;

    switch (outfit.hairStyle) {
      case 'long_straight':
      case 'wavy':
      case 'bun':
        return (
          <path
            d="M 78 92 C 78 58, 96 44, 120 44 C 144 44, 162 58, 162 92 C 156 76, 148 68, 136 74 C 128 66, 118 66, 108 75 C 96 68, 84 76, 78 92 Z"
            fill={outfit.hairColor}
            stroke={outline}
            strokeWidth="2.3"
            strokeLinejoin="round"
          />
        );
      case 'bob':
        return (
          <path
            d="M 77 95 C 76 58, 96 45, 120 45 C 144 45, 164 58, 163 95 C 156 80, 144 74, 130 76 L 122 69 L 114 76 C 100 74, 84 80, 77 95 Z"
            fill={outfit.hairColor}
            stroke={outline}
            strokeWidth="2.3"
          />
        );
      case 'twintails':
        return (
          <path
            d="M 79 90 C 80 58, 96 46, 120 46 C 144 46, 160 58, 161 90 C 152 74, 138 72, 128 76 L 120 68 L 112 76 C 102 72, 88 74, 79 90 Z"
            fill={outfit.hairColor}
            stroke={outline}
            strokeWidth="2.3"
          />
        );
      case 'comma':
        return (
          <path
            d="M 80 90 C 78 55, 97 43, 120 43 C 144 43, 162 55, 160 90 C 155 72, 142 64, 128 72 C 122 76, 122 86, 128 84 C 118 82, 114 70, 106 66 C 95 66, 85 75, 80 90 Z"
            fill={outfit.hairColor}
            stroke={outline}
            strokeWidth="2.3"
          />
        );
      case 'twoblock':
        return (
          <path
            d="M 80 88 C 78 54, 96 42, 120 42 C 144 42, 162 54, 160 88 C 153 76, 144 72, 136 78 L 130 70 L 122 79 L 114 70 L 106 78 C 96 72, 86 76, 80 88 Z"
            fill={outfit.hairColor}
            stroke={outline}
            strokeWidth="2.3"
          />
        );
      case 'curly':
        return (
          <path
            d="M 79 90 C 72 78, 76 64, 86 58 C 89 46, 102 40, 114 43 C 122 36, 136 40, 142 47 C 154 47, 164 58, 161 70 C 166 80, 162 90, 156 90 C 148 76, 136 74, 126 78 C 116 72, 102 74, 92 80 C 86 78, 82 82, 79 90 Z"
            fill={outfit.hairColor}
            stroke={outline}
            strokeWidth="2.3"
          />
        );
      case 'sidepart':
        return (
          <path
            d="M 80 90 C 80 55, 98 44, 121 44 C 144 44, 160 56, 160 90 C 154 74, 140 65, 118 65 C 102 65, 88 75, 80 90 Z"
            fill={outfit.hairColor}
            stroke={outline}
            strokeWidth="2.3"
          />
        );
      case 'buzz':
        return (
          <path
            d="M 84 82 C 85 57, 100 49, 120 49 C 140 49, 155 57, 156 82 C 148 69, 136 64, 120 64 C 104 64, 92 69, 84 82 Z"
            fill={outfit.hairColor}
            stroke={outline}
            strokeWidth="2"
          />
        );
      default:
        return null;
    }
  };

  const renderHijab = () => {
    if (!hasHijab) return null;

    const drapeLength =
      outfit.hijabStyle === 'syari'
        ? 216
        : outfit.hijabStyle === 'pashmina'
          ? 186
          : outfit.hijabStyle === 'bergo'
            ? 176
            : 170;

    return (
      <g>
        {/* Outer hijab wrap & drape */}
        <path
          d={`M 74 96 C 72 52, 95 40, 120 40 C 145 40, 168 52, 166 96 C 166 130, 170 ${drapeLength - 18}, 158 ${drapeLength} Q 120 ${drapeLength + 16} 82 ${drapeLength} C 70 ${drapeLength - 18}, 74 130, 74 96 Z`}
          fill={outfit.hijabColor}
          stroke={outline}
          strokeWidth="2.4"
        />
        {/* Face cutout showing face cleanly */}
        {outfit.faceShape === 'round' || outfit.faceShape === 'chubby' ? (
          <ellipse cx="120" cy="98" rx="33" ry="34" fill="none" stroke={hijabShade} strokeWidth="2.5" />
        ) : null}
        {/* Inner hijab face opening border */}
        <path
          d="M 85 96 C 85 68, 100 58, 120 58 C 140 58, 155 68, 155 96 C 155 122, 140 137, 120 137 C 100 137, 85 122, 85 96 Z"
          fill="none"
          stroke={hijabShade}
          strokeWidth="3"
        />
        {outfit.hijabStyle === 'pashmina' && (
          <path
            d="M 86 142 Q 120 164 152 138"
            fill="none"
            stroke={hijabShade}
            strokeWidth="2.4"
            strokeLinecap="round"
          />
        )}
        {outfit.hijabStyle === 'square' && (
          <path
            d="M 96 144 L 120 172 L 144 144"
            fill="none"
            stroke={hijabShade}
            strokeWidth="2.2"
            strokeLinejoin="round"
          />
        )}
        {outfit.hijabStyle === 'bergo' && (
          <path
            d="M 87 72 Q 120 52 153 72"
            fill="none"
            stroke={hijabShade}
            strokeWidth="3"
            strokeLinecap="round"
          />
        )}
      </g>
    );
  };

  const renderShoes = () => {
    if (outfit.shoesStyle === 'none') {
      // Clean bare feet on studio floor
      return (
        <g fill={outfit.skinTone} stroke={outline} strokeWidth="2.1">
          <ellipse cx="101" cy="347" rx="11" ry="6.5" />
          <ellipse cx="139" cy="347" rx="11" ry="6.5" />
        </g>
      );
    }

    switch (outfit.shoesStyle) {
      case 'sneakers':
        return (
          <g>
            <path d="M 88 336 Q 88 352 114 351 L 114 336 Z" fill={outfit.shoesColor} stroke={outline} strokeWidth="2.2" />
            <path d="M 126 336 L 126 351 Q 152 352 152 336 Z" fill={outfit.shoesColor} stroke={outline} strokeWidth="2.2" />
            <rect x="88" y="347" width="26" height="5" rx="2.5" fill="#F8FAFC" stroke={outline} strokeWidth="1.8" />
            <rect x="126" y="347" width="26" height="5" rx="2.5" fill="#F8FAFC" stroke={outline} strokeWidth="1.8" />
          </g>
        );
      case 'boots':
        return (
          <g fill={outfit.shoesColor} stroke={outline} strokeWidth="2.2">
            <path d="M 89 318 L 113 318 L 114 351 L 86 351 Z" />
            <path d="M 127 318 L 151 318 L 154 351 L 126 351 Z" />
            <rect x="86" y="347" width="28" height="5" rx="2" fill={shoesShade} />
            <rect x="126" y="347" width="28" height="5" rx="2" fill={shoesShade} />
          </g>
        );
      case 'maryjane':
        return (
          <g>
            <ellipse cx="100" cy="346" rx="13" ry="7" fill={outfit.shoesColor} stroke={outline} strokeWidth="2.1" />
            <ellipse cx="140" cy="346" rx="13" ry="7" fill={outfit.shoesColor} stroke={outline} strokeWidth="2.1" />
            <path d="M 92 343 Q 100 339 109 343" fill="none" stroke={outline} strokeWidth="2" />
            <path d="M 131 343 Q 140 339 148 343" fill="none" stroke={outline} strokeWidth="2" />
          </g>
        );
      case 'slippers':
        return (
          <g>
            <ellipse cx="101" cy="348" rx="12" ry="5.5" fill={shoesShade} stroke={outline} strokeWidth="2" />
            <ellipse cx="139" cy="348" rx="12" ry="5.5" fill={shoesShade} stroke={outline} strokeWidth="2" />
            <rect x="92" y="342" width="18" height="6" rx="3" fill={outfit.shoesColor} stroke={outline} strokeWidth="1.8" />
            <rect x="130" y="342" width="18" height="6" rx="3" fill={outfit.shoesColor} stroke={outline} strokeWidth="1.8" />
          </g>
        );
      case 'loafers':
      default:
        return (
          <g fill={outfit.shoesColor} stroke={outline} strokeWidth="2.2">
            <path d="M 88 338 L 114 338 L 114 351 L 87 351 Z" />
            <path d="M 126 338 L 152 338 L 153 351 L 126 351 Z" />
            <line x1="94" y1="342" x2="108" y2="342" stroke={shoesShade} strokeWidth="2" />
            <line x1="132" y1="342" x2="146" y2="342" stroke={shoesShade} strokeWidth="2" />
          </g>
        );
    }
  };

  const renderPants = () => {
    // Modest studio inner shorts underneath when pants are removed
    if (outfit.pantsStyle === 'none') {
      return (
        <path
          d={`M ${120 - hipHalf} 234 L ${120 + hipHalf} 234 L ${120 + hipHalf + 2} 266 L 124 266 L 120 254 L 116 266 L ${120 - hipHalf - 2} 266 Z`}
          fill="#272736"
          stroke={outline}
          strokeWidth="2.2"
        />
      );
    }

    switch (outfit.pantsStyle) {
      case 'pleated_skirt':
        return (
          <g>
            <path
              d={`M ${120 - hipHalf + 2} 234 L ${120 + hipHalf - 2} 234 L 160 302 Q 120 310 80 302 Z`}
              fill={outfit.pantsColor}
              stroke={outline}
              strokeWidth="2.3"
              strokeLinejoin="round"
            />
            <line x1="104" y1="240" x2="96" y2="303" stroke={pantsShade} strokeWidth="1.8" />
            <line x1="120" y1="240" x2="120" y2="305" stroke={pantsShade} strokeWidth="1.8" />
            <line x1="136" y1="240" x2="144" y2="303" stroke={pantsShade} strokeWidth="1.8" />
          </g>
        );
      case 'shorts':
        return (
          <path
            d={`M ${120 - hipHalf} 234 L ${120 + hipHalf} 234 L ${120 + hipHalf + 4} 280 L 125 280 L 120 258 L 115 280 L ${120 - hipHalf - 4} 280 Z`}
            fill={outfit.pantsColor}
            stroke={outline}
            strokeWidth="2.3"
            strokeLinejoin="round"
          />
        );
      case 'culottes':
        return (
          <path
            d={`M ${120 - hipHalf} 234 L ${120 + hipHalf} 234 L 154 328 L 125 328 L 120 264 L 115 328 L 86 328 Z`}
            fill={outfit.pantsColor}
            stroke={outline}
            strokeWidth="2.3"
            strokeLinejoin="round"
          />
        );
      case 'cargo':
        return (
          <g>
            <path
              d={`M ${120 - hipHalf} 234 L ${120 + hipHalf} 234 L 150 335 L 126 335 L 120 264 L 114 335 L 90 335 Z`}
              fill={outfit.pantsColor}
              stroke={outline}
              strokeWidth="2.3"
              strokeLinejoin="round"
            />
            <rect x="89" y="276" width="12" height="16" rx="2" fill={pantsShade} stroke={outline} strokeWidth="1.6" />
            <rect x="139" y="276" width="12" height="16" rx="2" fill={pantsShade} stroke={outline} strokeWidth="1.6" />
          </g>
        );
      case 'trousers':
        return (
          <g>
            <path
              d={`M ${120 - hipHalf} 234 L ${120 + hipHalf} 234 L 147 335 L 125 335 L 120 262 L 115 335 L 93 335 Z`}
              fill={outfit.pantsColor}
              stroke={outline}
              strokeWidth="2.3"
              strokeLinejoin="round"
            />
            <line x1="103" y1="252" x2="103" y2="330" stroke={pantsShade} strokeWidth="1.5" />
            <line x1="137" y1="252" x2="137" y2="330" stroke={pantsShade} strokeWidth="1.5" />
          </g>
        );
      case 'jeans':
      default:
        return (
          <g>
            <path
              d={`M ${120 - hipHalf} 234 L ${120 + hipHalf} 234 L 146 335 L 126 335 L 120 262 L 114 335 L 94 335 Z`}
              fill={outfit.pantsColor}
              stroke={outline}
              strokeWidth="2.3"
              strokeLinejoin="round"
            />
            <path d="M 96 244 Q 104 248 106 238 M 144 244 Q 136 248 134 238" fill="none" stroke={pantsShade} strokeWidth="1.6" />
          </g>
        );
    }
  };

  const renderShirt = () => {
    const lx = 120 - shoulderHalf;
    const rx = 120 + shoulderHalf;
    const wlx = 120 - waistHalf;
    const wrx = 120 + waistHalf;

    // Modest studio innerwear tank when no top layer at all OR underneath open kemeja/cardigan
    if (outfit.shirtStyle === 'none') {
      return (
        <path
          d={`M 103 152 L 111 152 Q 120 163 129 152 L 137 152 L ${wrx - 2} 236 L ${wlx + 2} 236 Z`}
          fill="#272736"
          stroke={outline}
          strokeWidth="2.1"
        />
      );
    }

    const isLongSleeve =
      outfit.shirtStyle === 'oversize' ||
      outfit.shirtStyle === 'blouse' ||
      outfit.shirtStyle === 'turtleneck';

    return (
      <g>
        {/* Sleeves */}
        {isLongSleeve ? (
          <g fill={outfit.shirtColor} stroke={outline} strokeWidth="2.2">
            <path d={`M ${lx} 156 L ${armLeftX - 7} 230 L ${armLeftX + 6} 232 L ${wlx + 1} 178 Z`} />
            <path d={`M ${rx} 156 L ${armRightX + 7} 230 L ${armRightX - 6} 232 L ${wrx - 1} 178 Z`} />
          </g>
        ) : (
          <g fill={outfit.shirtColor} stroke={outline} strokeWidth="2.2">
            <path d={`M ${lx} 156 L ${armLeftX - 6} 188 L ${armLeftX + 7} 192 L ${wlx + 1} 176 Z`} />
            <path d={`M ${rx} 156 L ${armRightX + 6} 188 L ${armRightX - 7} 192 L ${wrx - 1} 176 Z`} />
          </g>
        )}

        {/* Torso */}
        <path
          d={`M ${lx} 156 Q 120 147 ${rx} 156 L ${wrx + (outfit.shirtStyle === 'oversize' ? 4 : 0)} 238 L ${wlx - (outfit.shirtStyle === 'oversize' ? 4 : 0)} 238 Z`}
          fill={outfit.shirtColor}
          stroke={outline}
          strokeWidth="2.3"
          strokeLinejoin="round"
        />

        {outfit.shirtStyle === 'turtleneck' && (
          <rect
            x="109"
            y="141"
            width="22"
            height="14"
            rx="4"
            fill={shirtShade}
            stroke={outline}
            strokeWidth="2"
          />
        )}

        {outfit.shirtStyle === 'polo' && (
          <g>
            <path d="M 108 152 L 120 166 L 132 152" fill={shirtShade} stroke={outline} strokeWidth="1.8" />
            <line x1="120" y1="166" x2="120" y2="184" stroke={outline} strokeWidth="2" />
          </g>
        )}

        {outfit.shirtStyle === 'blouse' && (
          <path
            d="M 105 153 Q 112 165 120 157 Q 128 165 135 153"
            fill="none"
            stroke={shirtShade}
            strokeWidth="2.4"
            strokeLinecap="round"
          />
        )}
      </g>
    );
  };

  const renderKemeja = () => {
    if (outfit.kemejaStyle === 'none') return null;

    const lx = 120 - shoulderHalf - 1;
    const rx = 120 + shoulderHalf + 1;
    const wlx = 120 - waistHalf - 1;
    const wrx = 120 + waistHalf + 1;
    const isShortSleeve = outfit.kemejaStyle === 'short_sleeve';
    const isOpen = outfit.kemejaStyle === 'open';
    const isFlannel = outfit.kemejaStyle === 'flannel';

    return (
      <g>
        {/* Sleeves */}
        {isShortSleeve ? (
          <g fill={outfit.kemejaColor} stroke={outline} strokeWidth="2.2">
            <path d={`M ${lx} 156 L ${armLeftX - 7} 191 L ${armLeftX + 7} 194 L ${wlx + 1} 176 Z`} />
            <path d={`M ${rx} 156 L ${armRightX + 7} 191 L ${armRightX - 7} 194 L ${wrx - 1} 176 Z`} />
          </g>
        ) : (
          <g fill={outfit.kemejaColor} stroke={outline} strokeWidth="2.2">
            <path d={`M ${lx} 156 L ${armLeftX - 8} 232 L ${armLeftX + 6} 234 L ${wlx + 1} 178 Z`} />
            <path d={`M ${rx} 156 L ${armRightX + 8} 232 L ${armRightX - 6} 234 L ${wrx - 1} 178 Z`} />
          </g>
        )}

        {isOpen ? (
          <g>
            {/* Open front panels so baju underneath stays visible */}
            <path
              d={`M ${lx} 155 L 112 152 L 111 239 L ${wlx} 239 Z`}
              fill={outfit.kemejaColor}
              stroke={outline}
              strokeWidth="2.2"
              strokeLinejoin="round"
            />
            <path
              d={`M ${rx} 155 L 128 152 L 129 239 L ${wrx} 239 Z`}
              fill={outfit.kemejaColor}
              stroke={outline}
              strokeWidth="2.2"
              strokeLinejoin="round"
            />
          </g>
        ) : (
          <g>
            <path
              d={`M ${lx} 155 L 110 150 L 120 158 L 130 150 L ${rx} 155 L ${wrx} 239 L ${wlx} 239 Z`}
              fill={outfit.kemejaColor}
              stroke={outline}
              strokeWidth="2.3"
              strokeLinejoin="round"
            />
            {isFlannel && (
              <g stroke={kemejaShade} strokeWidth="1.6" opacity="0.75">
                <line x1={wlx + 4} y1="176" x2={wrx - 4} y2="176" />
                <line x1={wlx + 2} y1="198" x2={wrx - 2} y2="198" />
                <line x1={wlx + 1} y1="220" x2={wrx - 1} y2="220" />
                <line x1="108" y1="154" x2="106" y2="238" />
                <line x1="132" y1="154" x2="134" y2="238" />
              </g>
            )}
            {/* Buttons */}
            <line x1="120" y1="158" x2="120" y2="237" stroke={kemejaShade} strokeWidth="1.8" />
            <circle cx="120" cy="172" r="2" fill="#FFFFFF" stroke={outline} strokeWidth="1" />
            <circle cx="120" cy="192" r="2" fill="#FFFFFF" stroke={outline} strokeWidth="1" />
            <circle cx="120" cy="212" r="2" fill="#FFFFFF" stroke={outline} strokeWidth="1" />
          </g>
        )}

        {/* Collar */}
        <path
          d="M 108 150 L 117 162 L 106 161 Z M 132 150 L 123 162 L 134 161 Z"
          fill={kemejaShade}
          stroke={outline}
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
      </g>
    );
  };

  const renderCardigan = () => {
    if (outfit.cardiganStyle === 'none') return null;

    const lx = 120 - shoulderHalf - 2;
    const rx = 120 + shoulderHalf + 2;
    const wlx = 120 - waistHalf - 3;
    const wrx = 120 + waistHalf + 3;
    const bottomY = outfit.cardiganStyle === 'long_cardigan' ? 286 : 242;
    const hasSleeves = outfit.cardiganStyle !== 'vest';

    return (
      <g>
        {hasSleeves && (
          <g fill={outfit.cardiganColor} stroke={outline} strokeWidth="2.3">
            <path d={`M ${lx} 155 L ${armLeftX - 9} 233 L ${armLeftX + 7} 235 L ${wlx + 2} 180 Z`} />
            <path d={`M ${rx} 155 L ${armRightX + 9} 233 L ${armRightX - 7} 235 L ${wrx - 2} 180 Z`} />
          </g>
        )}

        {outfit.cardiganStyle === 'zip_hoodie' ? (
          <g>
            <path
              d={`M ${lx} 154 L 110 148 L 120 156 L 130 148 L ${rx} 154 L ${wrx} 242 L ${wlx} 242 Z`}
              fill={outfit.cardiganColor}
              stroke={outline}
              strokeWidth="2.3"
            />
            <line x1="120" y1="156" x2="120" y2="242" stroke={cardiganShade} strokeWidth="2.4" />
            <path d="M 100 226 L 114 226 L 114 240 L 100 240 Z M 126 226 L 140 226 L 140 240 L 126 240 Z" fill={cardiganShade} stroke={outline} strokeWidth="1.6" />
          </g>
        ) : outfit.cardiganStyle === 'vest' ? (
          <path
            d={`M ${lx + 4} 154 L 108 151 L 120 175 L 132 151 L ${rx - 4} 154 L ${wrx - 2} 236 L ${wlx + 2} 236 Z`}
            fill={outfit.cardiganColor}
            stroke={outline}
            strokeWidth="2.3"
            strokeLinejoin="round"
          />
        ) : (
          <g>
            {/* Open Knit / Long Cardigan sides */}
            <path
              d={`M ${lx} 154 L 108 151 L 112 192 L 110 ${bottomY} L ${wlx - 2} ${bottomY} Z`}
              fill={outfit.cardiganColor}
              stroke={outline}
              strokeWidth="2.3"
              strokeLinejoin="round"
            />
            <path
              d={`M ${rx} 154 L 132 151 L 128 192 L 130 ${bottomY} L ${wrx + 2} ${bottomY} Z`}
              fill={outfit.cardiganColor}
              stroke={outline}
              strokeWidth="2.3"
              strokeLinejoin="round"
            />
          </g>
        )}
      </g>
    );
  };

  const renderAccessories = () => {
    const acc = new Set(outfit.accessories);
    return (
      <g>
        {acc.has('blush') && (
          <g opacity="0.55">
            <ellipse cx="95" cy="109" rx="7" ry="4" fill="#FB7185" />
            <ellipse cx="145" cy="109" rx="7" ry="4" fill="#FB7185" />
          </g>
        )}

        {acc.has('necklace') && (
          <g>
            <path d="M 106 151 Q 120 165 134 151" fill="none" stroke="#FDE047" strokeWidth="2.3" />
            <circle cx="120" cy="160" r="3" fill="#F472B6" stroke={outline} strokeWidth="1.2" />
          </g>
        )}

        {acc.has('watch') && (
          <g>
            <rect
              x={armLeftX - 7}
              y="231"
              width="12"
              height="6"
              rx="2"
              fill="#F472B6"
              stroke={outline}
              strokeWidth="1.5"
            />
            <circle cx={armLeftX - 1} cy="234" r="2.2" fill="#FFFFFF" />
          </g>
        )}

        {acc.has('bag') && (
          <g>
            <line
              x1="100"
              y1="154"
              x2="152"
              y2="238"
              stroke="#1E1B28"
              strokeWidth="4.2"
              strokeLinecap="round"
            />
            <rect
              x="141"
              y="233"
              width="24"
              height="22"
              rx="5"
              fill="#F472B6"
              stroke={outline}
              strokeWidth="2"
            />
            <path d="M 141 240 L 165 240" stroke={outline} strokeWidth="1.8" />
          </g>
        )}

        {acc.has('glasses_round') && (
          <g stroke="#FAF5F7" strokeWidth="2.4" fill="rgba(255,255,255,0.1)">
            <circle cx="104" cy="96" r="10.5" />
            <circle cx="136" cy="96" r="10.5" />
            <line x1="114.5" y1="96" x2="125.5" y2="96" />
          </g>
        )}

        {acc.has('glasses_square') && (
          <g stroke="#F472B6" strokeWidth="2.4" fill="rgba(255,255,255,0.1)">
            <rect x="92" y="88" width="23" height="16" rx="4" />
            <rect x="125" y="88" width="23" height="16" rx="4" />
            <line x1="115" y1="95" x2="125" y2="95" />
          </g>
        )}

        {acc.has('ribbon') && (
          <g transform="translate(148, 60) rotate(18)">
            <path d="M 0 0 L -11 -7 L -11 7 Z" fill="#F472B6" stroke={outline} strokeWidth="1.8" />
            <path d="M 0 0 L 11 -7 L 11 7 Z" fill="#F472B6" stroke={outline} strokeWidth="1.8" />
            <circle cx="0" cy="0" r="3.5" fill="#FCE7F3" stroke={outline} strokeWidth="1.5" />
          </g>
        )}

        {acc.has('cap') && (
          <g>
            <path
              d="M 80 73 C 80 43, 160 43, 160 73 Z"
              fill="#1E1E2C"
              stroke={outline}
              strokeWidth="2.3"
            />
            <path
              d="M 74 73 Q 120 63 172 74 Q 145 81 74 73 Z"
              fill="#F472B6"
              stroke={outline}
              strokeWidth="2.1"
            />
          </g>
        )}
      </g>
    );
  };

  return (
    <svg
      viewBox="0 0 240 375"
      className={className}
      role="img"
      aria-label={isFemale ? 'Karakter Wanita' : 'Karakter Lelaki'}
    >
      {/* Studio Ground Shadow */}
      <ellipse cx="120" cy="356" rx="54" ry="9" fill="#050508" opacity="0.7" />

      {/* Back Hair */}
      {renderBackHair()}

      {/* Legs (Skin underneath pants/skirt) */}
      <g fill={outfit.skinTone} stroke={outline} strokeWidth="2.2">
        <rect x="93" y="245" width="16" height="96" rx="8" />
        <rect x="131" y="245" width="16" height="96" rx="8" />
      </g>

      {/* Arms (Skin underneath sleeves) */}
      <g fill={outfit.skinTone} stroke={outline} strokeWidth="2.2">
        <path
          d={`M ${120 - shoulderHalf + 2} 160 L ${armLeftX - 5} 238 Q ${armLeftX + 1} 248 ${armLeftX + 7} 239 L ${120 - waistHalf + 2} 178 Z`}
        />
        <path
          d={`M ${120 + shoulderHalf - 2} 160 L ${armRightX + 5} 238 Q ${armRightX - 1} 248 ${armRightX - 7} 239 L ${120 + waistHalf - 2} 178 Z`}
        />
      </g>

      {/* Shoes */}
      {renderShoes()}

      {/* Pants / Skirt */}
      {renderPants()}

      {/* Base Torso Skin + Neck */}
      <g>
        <rect
          x="111"
          y="130"
          width="18"
          height="26"
          rx="6"
          fill={outfit.skinTone}
          stroke={outline}
          strokeWidth="2.2"
        />
        <path
          d={`M ${120 - shoulderHalf} 155 Q 120 147 ${120 + shoulderHalf} 155 L ${120 + waistHalf} 236 L ${120 - waistHalf} 236 Z`}
          fill={outfit.skinTone}
          stroke={outline}
          strokeWidth="2.2"
        />
      </g>

      {/* Top Clothing Layers: Baju -> Kemeja -> Cardigan */}
      {renderShirt()}
      {renderKemeja()}
      {renderCardigan()}

      {/* Ears & Head */}
      {renderEars()}
      {renderFaceShape()}

      {/* Facial Features */}
      {renderEyes()}
      {renderNose()}
      {renderMouth()}

      {/* Front Hair or Hijab */}
      {renderFrontHair()}
      {renderHijab()}

      {/* Accessories */}
      {renderAccessories()}
    </svg>
  );
}
