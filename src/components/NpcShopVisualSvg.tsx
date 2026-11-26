export function NpcShopVisualSvg() {
  return (
    <svg viewBox="0 0 220 150" className="w-full max-w-[200px] h-auto select-none">
      {/* Wooden Stall Back */}
      <rect x="28" y="34" width="164" height="96" rx="10" fill="#FEF3C7" stroke="#92400E" strokeWidth="2.5" />

      {/* Shopkeeper Fox NPC */}
      <g transform="translate(110, 74)">
        {/* Ears */}
        <polygon points="-24,-14 -30,-38 -8,-22" fill="#EA580C" stroke="#7C2D12" strokeWidth="2" />
        <polygon points="24,-14 30,-38 8,-22" fill="#EA580C" stroke="#7C2D12" strokeWidth="2" />
        {/* Head */}
        <ellipse cx="0" cy="-4" rx="28" ry="23" fill="#F97316" stroke="#7C2D12" strokeWidth="2" />
        <path d="M-26 2 Q0 22 26 2 Q16 18 0 18 Q-16 18 -26 2 Z" fill="#FFF7ED" />
        {/* Glasses & Eyes */}
        <circle cx="-10" cy="-6" r="4" fill="#18181B" />
        <circle cx="10" cy="-6" r="4" fill="#18181B" />
        <circle cx="-10" cy="-6" r="7.5" fill="none" stroke="#3F3F46" strokeWidth="1.8" />
        <circle cx="10" cy="-6" r="7.5" fill="none" stroke="#3F3F46" strokeWidth="1.8" />
        <line x1="-2.5" y1="-6" x2="2.5" y2="-6" stroke="#3F3F46" strokeWidth="1.8" />
        {/* Nose & Smile */}
        <ellipse cx="0" cy="3" rx="4" ry="2.8" fill="#18181B" />
        <path d="M-6 8 Q0 13 6 8" stroke="#7C2D12" strokeWidth="2" fill="none" strokeLinecap="round" />
        {/* Green Apron */}
        <path d="M-24 18 L24 18 L28 42 L-28 42 Z" fill="#10B981" stroke="#065F46" strokeWidth="2" />
      </g>

      {/* Striped Awning */}
      <path d="M16 36 L204 36 L194 14 L26 14 Z" fill="#EC4899" stroke="#831843" strokeWidth="2.2" />
      <rect x="44" y="15" width="22" height="20" fill="#FDF2F8" />
      <rect x="98" y="15" width="24" height="20" fill="#FDF2F8" />
      <rect x="154" y="15" width="22" height="20" fill="#FDF2F8" />

      {/* Counter & Fruit Basket */}
      <rect x="20" y="102" width="180" height="32" rx="6" fill="#B45309" stroke="#78350F" strokeWidth="2.5" />
      <ellipse cx="62" cy="98" rx="18" ry="8" fill="#FDE68A" stroke="#92400E" strokeWidth="1.8" />
      <circle cx="56" cy="94" r="6" fill="#EC4899" />
      <circle cx="66" cy="93" r="6" fill="#F472B6" />
      <circle cx="61" cy="89" r="5.5" fill="#FB7185" />
    </svg>
  );
}
