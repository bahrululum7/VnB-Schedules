import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Check, Eraser, Palette, Save, Shirt, Shuffle, Sparkles } from 'lucide-react';
import type {
  AccessoryId,
  CardiganStyleId,
  CharacterOutfit,
  CoupleOutfitsState,
  EarStyleId,
  EyeStyleId,
  FaceShapeId,
  HairStyleId,
  HijabStyleId,
  KemejaStyleId,
  MouthStyleId,
  NoseStyleId,
  OutfitGender,
  PantsStyleId,
  ShirtStyleId,
  ShoesStyleId,
} from '../types/outfit';
import { OutfitCharacterSvg } from './OutfitCharacterSvg';
import { playPopSound } from '../utils/sound';

const STORAGE_KEY = 'vnb_couple_outfits_v1';

interface OutfitGamePageProps {
  partner1Name: string;
  partner2Name: string;
  soundEnabled: boolean;
}

type CategoryTabId =
  | 'rambut'
  | 'wajah'
  | 'mata'
  | 'telinga'
  | 'hidung'
  | 'mulut'
  | 'hijab'
  | 'baju'
  | 'kemeja'
  | 'cardigan'
  | 'celana'
  | 'sepatu'
  | 'aksesoris';

const DEFAULT_FEMALE: CharacterOutfit = {
  skinTone: '#F7D3B5',
  faceShape: 'oval',
  eyes: 'sparkle',
  ears: 'pierced',
  nose: 'cute',
  mouth: 'smile',
  hairStyle: 'long_straight',
  hairColor: '#241C24',
  hijabStyle: 'none',
  hijabColor: '#F472B6',
  shirtStyle: 'blouse',
  shirtColor: '#FCE7F3',
  kemejaStyle: 'none',
  kemejaColor: '#F9A8D4',
  cardiganStyle: 'knit',
  cardiganColor: '#F472B6',
  pantsStyle: 'pleated_skirt',
  pantsColor: '#1F2030',
  shoesStyle: 'maryjane',
  shoesColor: '#181822',
  accessories: ['blush', 'ribbon', 'bag'],
};

const DEFAULT_MALE: CharacterOutfit = {
  skinTone: '#ECC3A1',
  faceShape: 'sharp',
  eyes: 'sweet',
  ears: 'normal',
  nose: 'slim',
  mouth: 'grin',
  hairStyle: 'comma',
  hairColor: '#1E1B22',
  hijabStyle: 'none',
  hijabColor: '#272736',
  shirtStyle: 'tshirt',
  shirtColor: '#F8FAFC',
  kemejaStyle: 'open',
  kemejaColor: '#3B354D',
  cardiganStyle: 'none',
  cardiganColor: '#272736',
  pantsStyle: 'jeans',
  pantsColor: '#25334B',
  shoesStyle: 'sneakers',
  shoesColor: '#181822',
  accessories: ['watch', 'glasses_square'],
};

function loadInitialOutfits(): CoupleOutfitsState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { female: DEFAULT_FEMALE, male: DEFAULT_MALE };
    const parsed = JSON.parse(raw) as Partial<CoupleOutfitsState>;
    return {
      female: { ...DEFAULT_FEMALE, ...(parsed.female ?? {}) },
      male: { ...DEFAULT_MALE, ...(parsed.male ?? {}) },
    };
  } catch {
    return { female: DEFAULT_FEMALE, male: DEFAULT_MALE };
  }
}

const SKIN_TONES = ['#FDE2CA', '#F7D3B5', '#ECC3A1', '#D9A57C', '#B67D56', '#845439'];
const HAIR_COLORS = ['#1E1B22', '#3B2820', '#5A3825', '#8C5E3C', '#D8A364', '#F472B6', '#C084FC'];
const GARMENT_COLORS = [
  '#F8FAFC',
  '#FCE7F3',
  '#F472B6',
  '#EC4899',
  '#FB7185',
  '#A78BFA',
  '#60A5FA',
  '#34D399',
  '#FBBF24',
  '#9CA3AF',
  '#3F3F46',
  '#25334B',
  '#181822',
];

const CATEGORY_TABS: Array<{ id: CategoryTabId; label: string }> = [
  { id: 'rambut', label: 'Rambut' },
  { id: 'wajah', label: 'Wajah' },
  { id: 'mata', label: 'Mata' },
  { id: 'telinga', label: 'Telinga' },
  { id: 'hidung', label: 'Hidung' },
  { id: 'mulut', label: 'Mulut' },
  { id: 'hijab', label: 'Hijab' },
  { id: 'baju', label: 'Baju' },
  { id: 'kemeja', label: 'Kemeja' },
  { id: 'cardigan', label: 'Cardigan' },
  { id: 'celana', label: 'Celana / Rok' },
  { id: 'sepatu', label: 'Sepatu' },
  { id: 'aksesoris', label: 'Aksesoris' },
];

const FACE_OPTIONS: Array<{ id: FaceShapeId; label: string }> = [
  { id: 'oval', label: 'Oval' },
  { id: 'round', label: 'Bulat' },
  { id: 'chubby', label: 'Chubby' },
  { id: 'sharp', label: 'Tirus' },
];

const EYE_OPTIONS: Array<{ id: EyeStyleId; label: string }> = [
  { id: 'sparkle', label: 'Berbinar' },
  { id: 'sweet', label: 'Manis' },
  { id: 'wide', label: 'Bulat Lebar' },
  { id: 'happy', label: 'Senyum' },
  { id: 'cool', label: 'Cool' },
  { id: 'wink', label: 'Kedip' },
];

const EAR_OPTIONS: Array<{ id: EarStyleId; label: string }> = [
  { id: 'normal', label: 'Normal' },
  { id: 'small', label: 'Kecil' },
  { id: 'pierced', label: 'Anting Pink' },
  { id: 'hidden', label: 'Lepas / Sembunyi' },
];

const NOSE_OPTIONS: Array<{ id: NoseStyleId; label: string }> = [
  { id: 'cute', label: 'Imut' },
  { id: 'slim', label: 'Mancung' },
  { id: 'button', label: 'Kancing' },
  { id: 'line', label: 'Garis' },
];

const MOUTH_OPTIONS: Array<{ id: MouthStyleId; label: string }> = [
  { id: 'smile', label: 'Senyum' },
  { id: 'grin', label: 'Ceria' },
  { id: 'o_cute', label: 'Kaget Imut' },
  { id: 'calm', label: 'Tenang' },
  { id: 'tongue', label: 'Melet' },
  { id: 'smirk', label: 'Smirk' },
];

const HAIR_OPTIONS: Array<{ id: HairStyleId; label: string }> = [
  { id: 'none', label: 'Lepas / Botak' },
  { id: 'long_straight', label: 'Panjang Lurus' },
  { id: 'bob', label: 'Bob Pendek' },
  { id: 'wavy', label: 'Gelombang' },
  { id: 'bun', label: 'Cepol Atas' },
  { id: 'twintails', label: 'Kuncir Dua' },
  { id: 'comma', label: 'Comma Hair' },
  { id: 'twoblock', label: 'Two-Block' },
  { id: 'curly', label: 'Ikal / Curly' },
  { id: 'sidepart', label: 'Belah Samping' },
  { id: 'buzz', label: 'Cepak Rapi' },
];

const HIJAB_OPTIONS: Array<{ id: HijabStyleId; label: string }> = [
  { id: 'none', label: 'Lepas Hijab' },
  { id: 'pashmina', label: 'Pashmina' },
  { id: 'square', label: 'Segi Empat' },
  { id: 'bergo', label: 'Bergo Santai' },
  { id: 'syari', label: 'Hijab Syari' },
];

const SHIRT_OPTIONS: Array<{ id: ShirtStyleId; label: string }> = [
  { id: 'none', label: 'Lepas Baju' },
  { id: 'tshirt', label: 'Kaos Polos' },
  { id: 'oversize', label: 'Kaos Oversize' },
  { id: 'blouse', label: 'Blouse Manis' },
  { id: 'turtleneck', label: 'Turtleneck' },
  { id: 'polo', label: 'Kaos Polo' },
];

const KEMEJA_OPTIONS: Array<{ id: KemejaStyleId; label: string }> = [
  { id: 'none', label: 'Lepas Kemeja' },
  { id: 'buttoned', label: 'Kemeja Kancing' },
  { id: 'open', label: 'Kemeja Terbuka' },
  { id: 'flannel', label: 'Kemeja Flanel' },
  { id: 'short_sleeve', label: 'Lengan Pendek' },
];

const CARDIGAN_OPTIONS: Array<{ id: CardiganStyleId; label: string }> = [
  { id: 'none', label: 'Lepas Cardigan' },
  { id: 'knit', label: 'Cardigan Rajut' },
  { id: 'long_cardigan', label: 'Long Cardigan' },
  { id: 'vest', label: 'Rompi / Vest' },
  { id: 'zip_hoodie', label: 'Zip Hoodie' },
];

const PANTS_OPTIONS: Array<{ id: PantsStyleId; label: string }> = [
  { id: 'none', label: 'Lepas Celana' },
  { id: 'jeans', label: 'Jeans' },
  { id: 'trousers', label: 'Celana Bahan' },
  { id: 'culottes', label: 'Kulot Panjang' },
  { id: 'cargo', label: 'Celana Cargo' },
  { id: 'pleated_skirt', label: 'Rok Rempel' },
  { id: 'shorts', label: 'Celana Pendek' },
];

const SHOES_OPTIONS: Array<{ id: ShoesStyleId; label: string }> = [
  { id: 'none', label: 'Lepas Sepatu' },
  { id: 'sneakers', label: 'Sneakers' },
  { id: 'loafers', label: 'Loafers' },
  { id: 'boots', label: 'Boots' },
  { id: 'maryjane', label: 'Mary Jane' },
  { id: 'slippers', label: 'Sandal Santai' },
];

const ACCESSORY_OPTIONS: Array<{ id: AccessoryId; label: string }> = [
  { id: 'glasses_round', label: 'Kacamata Bulat' },
  { id: 'glasses_square', label: 'Kacamata Kotak' },
  { id: 'blush', label: 'Blush Pipi' },
  { id: 'ribbon', label: 'Pita Rambut' },
  { id: 'cap', label: 'Topi' },
  { id: 'necklace', label: 'Kalung' },
  { id: 'watch', label: 'Jam Tangan' },
  { id: 'bag', label: 'Tas Selempang' },
];

function pickRandom<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function OutfitGamePage({
  partner1Name,
  partner2Name,
  soundEnabled,
}: OutfitGamePageProps) {
  const [outfits, setOutfits] = useState<CoupleOutfitsState>(loadInitialOutfits);
  const [activeGender, setActiveGender] = useState<OutfitGender>('female');
  const [activeTab, setActiveTab] = useState<CategoryTabId>('rambut');
  const [savedNotice, setSavedNotice] = useState(false);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(outfits));
    } catch {
      // Ignore storage quota issues.
    }
  }, [outfits]);

  const currentOutfit = outfits[activeGender];

  const updateCurrent = (
    updater: Partial<CharacterOutfit> | ((prev: CharacterOutfit) => CharacterOutfit),
    equipping = true
  ) => {
    if (soundEnabled) playPopSound(equipping);
    setOutfits((prev) => ({
      ...prev,
      [activeGender]:
        typeof updater === 'function' ? updater(prev[activeGender]) : { ...prev[activeGender], ...updater },
    }));
  };

  const toggleAccessory = (accId: AccessoryId) => {
    const exists = currentOutfit.accessories.includes(accId);
    updateCurrent(
      (prev) => ({
        ...prev,
        accessories: exists
          ? prev.accessories.filter((id) => id !== accId)
          : [...prev.accessories, accId],
      }),
      !exists
    );
  };

  const handleStripAll = () => {
    updateCurrent(
      {
        hairStyle: 'none',
        hijabStyle: 'none',
        shirtStyle: 'none',
        kemejaStyle: 'none',
        cardiganStyle: 'none',
        pantsStyle: 'none',
        shoesStyle: 'none',
        accessories: [],
      },
      false
    );
  };

  const handleRandomize = () => {
    const isFemale = activeGender === 'female';
    const wearHijab = isFemale && Math.random() < 0.35;
    updateCurrent({
      faceShape: pickRandom(FACE_OPTIONS).id,
      eyes: pickRandom(EYE_OPTIONS).id,
      mouth: pickRandom(MOUTH_OPTIONS).id,
      hairStyle: wearHijab
        ? 'none'
        : isFemale
          ? pickRandom(['long_straight', 'bob', 'wavy', 'bun', 'twintails'] as HairStyleId[])
          : pickRandom(['comma', 'twoblock', 'curly', 'sidepart'] as HairStyleId[]),
      hairColor: pickRandom(HAIR_COLORS),
      hijabStyle: wearHijab
        ? pickRandom(['pashmina', 'square', 'bergo', 'syari'] as HijabStyleId[])
        : 'none',
      hijabColor: pickRandom(GARMENT_COLORS),
      shirtStyle: pickRandom(['tshirt', 'oversize', 'blouse', 'turtleneck', 'polo'] as ShirtStyleId[]),
      shirtColor: pickRandom(GARMENT_COLORS),
      kemejaStyle: Math.random() < 0.45 ? pickRandom(['open', 'buttoned', 'flannel'] as KemejaStyleId[]) : 'none',
      kemejaColor: pickRandom(GARMENT_COLORS),
      cardiganStyle: Math.random() < 0.45 ? pickRandom(['knit', 'vest', 'zip_hoodie'] as CardiganStyleId[]) : 'none',
      cardiganColor: pickRandom(GARMENT_COLORS),
      pantsStyle: isFemale
        ? pickRandom(['jeans', 'culottes', 'pleated_skirt', 'trousers'] as PantsStyleId[])
        : pickRandom(['jeans', 'trousers', 'cargo', 'shorts'] as PantsStyleId[]),
      pantsColor: pickRandom(['#181822', '#25334B', '#3F3F46', '#F8FAFC', '#F472B6']),
      shoesStyle: pickRandom(['sneakers', 'loafers', 'boots', 'maryjane'] as ShoesStyleId[]),
      shoesColor: pickRandom(['#181822', '#F8FAFC', '#F472B6', '#3F3F46']),
      accessories: isFemale
        ? (Math.random() < 0.5 ? ['blush', 'bag'] : ['glasses_round', 'necklace'])
        : (Math.random() < 0.5 ? ['watch', 'glasses_square'] : ['cap', 'watch']),
    });
  };

  const applyPreset = (preset: 'date' | 'kuliah' | 'santai' | 'hijab') => {
    if (soundEnabled) playPopSound(true);
    if (preset === 'date') {
      setOutfits((prev) => ({
        female: {
          ...prev.female,
          hairStyle: 'wavy',
          hijabStyle: 'none',
          shirtStyle: 'blouse',
          shirtColor: '#FCE7F3',
          kemejaStyle: 'none',
          cardiganStyle: 'knit',
          cardiganColor: '#F472B6',
          pantsStyle: 'pleated_skirt',
          pantsColor: '#181822',
          shoesStyle: 'maryjane',
          shoesColor: '#181822',
          accessories: ['blush', 'ribbon', 'bag', 'necklace'],
        },
        male: {
          ...prev.male,
          hairStyle: 'comma',
          hijabStyle: 'none',
          shirtStyle: 'tshirt',
          shirtColor: '#F8FAFC',
          kemejaStyle: 'open',
          kemejaColor: '#181822',
          cardiganStyle: 'none',
          pantsStyle: 'trousers',
          pantsColor: '#25334B',
          shoesStyle: 'loafers',
          shoesColor: '#181822',
          accessories: ['watch', 'glasses_square'],
        },
      }));
      return;
    }

    if (preset === 'kuliah') {
      setOutfits((prev) => ({
        female: {
          ...prev.female,
          hairStyle: 'bun',
          hijabStyle: 'none',
          shirtStyle: 'tshirt',
          shirtColor: '#F8FAFC',
          kemejaStyle: 'open',
          kemejaColor: '#60A5FA',
          cardiganStyle: 'none',
          pantsStyle: 'jeans',
          pantsColor: '#25334B',
          shoesStyle: 'sneakers',
          shoesColor: '#F8FAFC',
          accessories: ['glasses_round', 'bag'],
        },
        male: {
          ...prev.male,
          hairStyle: 'twoblock',
          hijabStyle: 'none',
          shirtStyle: 'polo',
          shirtColor: '#F472B6',
          kemejaStyle: 'none',
          cardiganStyle: 'zip_hoodie',
          cardiganColor: '#3F3F46',
          pantsStyle: 'cargo',
          pantsColor: '#181822',
          shoesStyle: 'sneakers',
          shoesColor: '#F8FAFC',
          accessories: ['watch'],
        },
      }));
      return;
    }

    if (preset === 'hijab') {
      setOutfits((prev) => ({
        female: {
          ...prev.female,
          hijabStyle: 'pashmina',
          hijabColor: '#F472B6',
          shirtStyle: 'turtleneck',
          shirtColor: '#FCE7F3',
          kemejaStyle: 'none',
          cardiganStyle: 'long_cardigan',
          cardiganColor: '#3F3F46',
          pantsStyle: 'culottes',
          pantsColor: '#181822',
          shoesStyle: 'sneakers',
          shoesColor: '#F8FAFC',
          accessories: ['blush', 'bag'],
        },
        male: {
          ...prev.male,
          hairStyle: 'sidepart',
          hijabStyle: 'none',
          shirtStyle: 'tshirt',
          shirtColor: '#F8FAFC',
          kemejaStyle: 'buttoned',
          kemejaColor: '#25334B',
          cardiganStyle: 'vest',
          cardiganColor: '#181822',
          pantsStyle: 'trousers',
          pantsColor: '#3F3F46',
          shoesStyle: 'loafers',
          shoesColor: '#181822',
          accessories: ['watch'],
        },
      }));
      return;
    }

    // Santai
    setOutfits((prev) => ({
      female: {
        ...prev.female,
        hairStyle: 'twintails',
        hijabStyle: 'none',
        shirtStyle: 'oversize',
        shirtColor: '#F472B6',
        kemejaStyle: 'none',
        cardiganStyle: 'none',
        pantsStyle: 'shorts',
        pantsColor: '#25334B',
        shoesStyle: 'slippers',
        shoesColor: '#FCE7F3',
        accessories: ['blush'],
      },
      male: {
        ...prev.male,
        hairStyle: 'curly',
        hijabStyle: 'none',
        shirtStyle: 'oversize',
        shirtColor: '#3F3F46',
        kemejaStyle: 'none',
        cardiganStyle: 'none',
        pantsStyle: 'shorts',
        pantsColor: '#181822',
        shoesStyle: 'slippers',
        shoesColor: '#F472B6',
        accessories: ['cap'],
      },
    }));
  };

  const handleSaveManual = () => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(outfits));
    } catch {
      // Ignore storage error.
    }
    if (soundEnabled) playPopSound(true);
    setSavedNotice(true);
    window.setTimeout(() => setSavedNotice(false), 1800);
  };

  const renderColorRow = (
    label: string,
    colors: string[],
    selectedColor: string,
    onSelect: (hex: string) => void
  ) => (
    <div className="space-y-2 pt-3 border-t border-white/[0.07]">
      <div className="flex items-center gap-1.5 text-xs font-medium text-zinc-300">
        <Palette className="w-3.5 h-3.5 text-pink-400" />
        <span>{label}</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {colors.map((hex) => {
          const active = selectedColor.toLowerCase() === hex.toLowerCase();
          return (
            <button
              key={hex}
              type="button"
              onClick={() => onSelect(hex)}
              aria-label={`Pilih warna ${hex}`}
              className={`w-8 h-8 rounded-full border-2 transition-transform cursor-pointer flex items-center justify-center ${
                active ? 'border-pink-400 scale-110' : 'border-white/20 hover:scale-105'
              }`}
              style={{ backgroundColor: hex }}
            >
              {active && (
                <Check
                  className={`w-3.5 h-3.5 ${
                    hex === '#F8FAFC' || hex === '#FCE7F3' || hex === '#FDE2CA' || hex === '#F7D3B5'
                      ? 'text-zinc-950'
                      : 'text-white'
                  }`}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );

  const renderOptionGrid = <T extends string>(
    options: Array<{ id: T; label: string }>,
    currentValue: T,
    onSelect: (val: T) => void
  ) => (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
      {options.map((opt) => {
        const active = currentValue === opt.id;
        const isRemove = opt.id === 'none' || opt.id === 'hidden';
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => onSelect(opt.id)}
            className={`min-h-[44px] px-3 py-2 rounded-xl border text-xs font-semibold transition-all cursor-pointer text-left flex items-center justify-between gap-2 ${
              active
                ? 'bg-pink-500 border-pink-400 text-zinc-950 shadow-sm shadow-pink-500/20'
                : isRemove
                  ? 'bg-[#0E0E13] border-rose-400/25 text-rose-200 hover:bg-rose-500/15'
                  : 'bg-[#0E0E13] border-white/10 text-zinc-200 hover:border-pink-400/40 hover:bg-[#191924]'
            }`}
          >
            <span className="truncate">{opt.label}</span>
            {active && <Check className="w-3.5 h-3.5 shrink-0" />}
          </button>
        );
      })}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Studio Header & Toolbar */}
      <section className="rounded-2xl bg-[#14141B] border border-white/10 p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-pink-300">
            <Shirt className="w-4 h-4" />
            <span>Minigames Pasangan · Pasang & Lepas Outfit</span>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-white mt-1">
            Studio Outfit Wanita & Lelaki
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Klik karakter untuk didandani, pasang atau lepas rambut, wajah, hijab, baju, kemeja, cardigan, celana, sepatu, sampai aksesoris.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleRandomize}
            className="min-h-[44px] px-4 py-2 rounded-xl bg-pink-500 hover:bg-pink-400 text-zinc-950 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
          >
            <Shuffle className="w-4 h-4" />
            <span>Acak Outfit</span>
          </button>
          <button
            type="button"
            onClick={handleStripAll}
            className="min-h-[44px] px-4 py-2 rounded-xl bg-[#1D1D27] hover:bg-rose-500/15 border border-white/10 hover:border-rose-400/40 text-xs font-semibold text-zinc-200 hover:text-rose-200 inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
          >
            <Eraser className="w-4 h-4" />
            <span>Lepas Semua</span>
          </button>
          <button
            type="button"
            onClick={handleSaveManual}
            className="min-h-[44px] px-4 py-2 rounded-xl bg-[#1D1D27] hover:bg-pink-500/15 border border-white/10 hover:border-pink-400/40 text-xs font-semibold text-pink-200 inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
          >
            {savedNotice ? <Check className="w-4 h-4 text-pink-400" /> : <Save className="w-4 h-4" />}
            <span>{savedNotice ? 'Gaya Tersimpan!' : 'Simpan Gaya'}</span>
          </button>
        </div>
      </section>

      {/* Main Split Stage + Wardrobe Drawer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Interactive Couple Stage */}
        <section className="lg:col-span-5 rounded-2xl bg-[#14141B] border border-white/10 p-5 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-zinc-300">
              Panggung Pasangan ({activeGender === 'female' ? 'Wanita Aktif' : 'Lelaki Aktif'})
            </span>
            <div className="flex flex-wrap gap-1.5">
              {(
                [
                  { id: 'date', label: 'Date Night' },
                  { id: 'kuliah', label: 'Kuliah' },
                  { id: 'hijab', label: 'Rapi / Hijab' },
                  { id: 'santai', label: 'Santai' },
                ] as const
              ).map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => applyPreset(p.id)}
                  className="px-2.5 py-1 rounded-lg bg-[#1D1D27] hover:bg-pink-500/20 border border-white/10 hover:border-pink-400/40 text-[11px] font-medium text-zinc-200 transition-colors cursor-pointer"
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Female Character Stage Card */}
            <motion.button
              type="button"
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                if (soundEnabled) playPopSound(true);
                setActiveGender('female');
              }}
              className={`rounded-2xl p-3 border text-center transition-all cursor-pointer flex flex-col items-center ${
                activeGender === 'female'
                  ? 'bg-gradient-to-b from-pink-500/15 to-[#0E0E13] border-pink-400 shadow-lg shadow-pink-500/10'
                  : 'bg-[#0E0E13] border-white/10 hover:border-white/25'
              }`}
            >
              <div className="w-full aspect-[240/360] max-h-[320px] flex items-center justify-center">
                <OutfitCharacterSvg gender="female" outfit={outfits.female} />
              </div>
              <div className="mt-2 pt-2 border-t border-white/[0.07] w-full">
                <p className="font-display text-sm font-bold text-white truncate">
                  Wanita
                </p>
                <p className="text-[11px] text-pink-300 truncate">
                  {activeGender === 'female' ? 'Sedang didandani' : partner1Name}
                </p>
              </div>
            </motion.button>

            {/* Male Character Stage Card */}
            <motion.button
              type="button"
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                if (soundEnabled) playPopSound(true);
                setActiveGender('male');
              }}
              className={`rounded-2xl p-3 border text-center transition-all cursor-pointer flex flex-col items-center ${
                activeGender === 'male'
                  ? 'bg-gradient-to-b from-pink-500/15 to-[#0E0E13] border-pink-400 shadow-lg shadow-pink-500/10'
                  : 'bg-[#0E0E13] border-white/10 hover:border-white/25'
              }`}
            >
              <div className="w-full aspect-[240/360] max-h-[320px] flex items-center justify-center">
                <OutfitCharacterSvg gender="male" outfit={outfits.male} />
              </div>
              <div className="mt-2 pt-2 border-t border-white/[0.07] w-full">
                <p className="font-display text-sm font-bold text-white truncate">
                  Lelaki
                </p>
                <p className="text-[11px] text-pink-300 truncate">
                  {activeGender === 'male' ? 'Sedang didandani' : partner2Name}
                </p>
              </div>
            </motion.button>
          </div>
        </section>

        {/* Right: Category Drawer */}
        <section className="lg:col-span-7 rounded-2xl bg-[#14141B] border border-white/10 p-5 sm:p-6 space-y-5">
          {/* Character Toggle */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/[0.08]">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-pink-400 shrink-0" />
              <h2 className="font-display text-base sm:text-lg font-bold text-white">
                Lemari & Fitur Karakter ({activeGender === 'female' ? 'Wanita' : 'Lelaki'})
              </h2>
            </div>

            <div className="inline-flex p-1 rounded-xl bg-[#0B0B0F] border border-white/10 self-start">
              <button
                type="button"
                onClick={() => setActiveGender('female')}
                className={`min-h-[36px] px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  activeGender === 'female'
                    ? 'bg-pink-500 text-zinc-950'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Wanita
              </button>
              <button
                type="button"
                onClick={() => setActiveGender('male')}
                className={`min-h-[36px] px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  activeGender === 'male'
                    ? 'bg-pink-500 text-zinc-950'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Lelaki
              </button>
            </div>
          </div>

          {/* 13 Category Tabs */}
          <div className="flex flex-wrap gap-1.5">
            {CATEGORY_TABS.map((tab) => {
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`min-h-[38px] px-3 py-1.5 rounded-xl border text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                    active
                      ? 'bg-pink-500 border-pink-400 text-zinc-950'
                      : 'bg-[#0E0E13] border-white/10 text-zinc-300 hover:border-pink-400/40 hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Active Category Controls */}
          <div className="space-y-4 pt-2">
            {activeTab === 'rambut' && (
              <>
                {currentOutfit.hijabStyle !== 'none' && (
                  <div className="rounded-xl bg-pink-500/10 border border-pink-400/30 px-3.5 py-2.5 text-xs text-pink-200 flex items-center justify-between gap-2">
                    <span>Karakter sedang memakai hijab. Lepas hijab dulu untuk melihat model rambut.</span>
                    <button
                      type="button"
                      onClick={() => updateCurrent({ hijabStyle: 'none' }, false)}
                      className="px-2.5 py-1 rounded-lg bg-pink-500 text-zinc-950 font-semibold shrink-0 cursor-pointer"
                    >
                      Lepas Hijab
                    </button>
                  </div>
                )}
                {renderOptionGrid(HAIR_OPTIONS, currentOutfit.hairStyle, (hairStyle) =>
                  updateCurrent({ hairStyle }, hairStyle !== 'none')
                )}
                {renderColorRow('Warna Rambut', HAIR_COLORS, currentOutfit.hairColor, (hairColor) =>
                  updateCurrent({ hairColor })
                )}
              </>
            )}

            {activeTab === 'wajah' && (
              <>
                {renderOptionGrid(FACE_OPTIONS, currentOutfit.faceShape, (faceShape) =>
                  updateCurrent({ faceShape })
                )}
                {renderColorRow('Warna Kulit', SKIN_TONES, currentOutfit.skinTone, (skinTone) =>
                  updateCurrent({ skinTone })
                )}
              </>
            )}

            {activeTab === 'mata' &&
              renderOptionGrid(EYE_OPTIONS, currentOutfit.eyes, (eyes) =>
                updateCurrent({ eyes })
              )}

            {activeTab === 'telinga' &&
              renderOptionGrid(EAR_OPTIONS, currentOutfit.ears, (ears) =>
                updateCurrent({ ears }, ears !== 'hidden')
              )}

            {activeTab === 'hidung' &&
              renderOptionGrid(NOSE_OPTIONS, currentOutfit.nose, (nose) =>
                updateCurrent({ nose })
              )}

            {activeTab === 'mulut' &&
              renderOptionGrid(MOUTH_OPTIONS, currentOutfit.mouth, (mouth) =>
                updateCurrent({ mouth })
              )}

            {activeTab === 'hijab' && (
              <>
                {renderOptionGrid(HIJAB_OPTIONS, currentOutfit.hijabStyle, (hijabStyle) =>
                  updateCurrent({ hijabStyle }, hijabStyle !== 'none')
                )}
                {renderColorRow('Warna Hijab', GARMENT_COLORS, currentOutfit.hijabColor, (hijabColor) =>
                  updateCurrent({ hijabColor })
                )}
              </>
            )}

            {activeTab === 'baju' && (
              <>
                {renderOptionGrid(SHIRT_OPTIONS, currentOutfit.shirtStyle, (shirtStyle) =>
                  updateCurrent({ shirtStyle }, shirtStyle !== 'none')
                )}
                {renderColorRow('Warna Baju', GARMENT_COLORS, currentOutfit.shirtColor, (shirtColor) =>
                  updateCurrent({ shirtColor })
                )}
              </>
            )}

            {activeTab === 'kemeja' && (
              <>
                {renderOptionGrid(KEMEJA_OPTIONS, currentOutfit.kemejaStyle, (kemejaStyle) =>
                  updateCurrent({ kemejaStyle }, kemejaStyle !== 'none')
                )}
                {renderColorRow('Warna Kemeja', GARMENT_COLORS, currentOutfit.kemejaColor, (kemejaColor) =>
                  updateCurrent({ kemejaColor })
                )}
              </>
            )}

            {activeTab === 'cardigan' && (
              <>
                {renderOptionGrid(CARDIGAN_OPTIONS, currentOutfit.cardiganStyle, (cardiganStyle) =>
                  updateCurrent({ cardiganStyle }, cardiganStyle !== 'none')
                )}
                {renderColorRow('Warna Cardigan', GARMENT_COLORS, currentOutfit.cardiganColor, (cardiganColor) =>
                  updateCurrent({ cardiganColor })
                )}
              </>
            )}

            {activeTab === 'celana' && (
              <>
                {renderOptionGrid(PANTS_OPTIONS, currentOutfit.pantsStyle, (pantsStyle) =>
                  updateCurrent({ pantsStyle }, pantsStyle !== 'none')
                )}
                {renderColorRow('Warna Celana / Rok', GARMENT_COLORS, currentOutfit.pantsColor, (pantsColor) =>
                  updateCurrent({ pantsColor })
                )}
              </>
            )}

            {activeTab === 'sepatu' && (
              <>
                {renderOptionGrid(SHOES_OPTIONS, currentOutfit.shoesStyle, (shoesStyle) =>
                  updateCurrent({ shoesStyle }, shoesStyle !== 'none')
                )}
                {renderColorRow('Warna Sepatu', GARMENT_COLORS, currentOutfit.shoesColor, (shoesColor) =>
                  updateCurrent({ shoesColor })
                )}
              </>
            )}

            {activeTab === 'aksesoris' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-zinc-400">
                    Pilih beberapa aksesoris sekaligus (klik lagi untuk melepas).
                  </span>
                  {currentOutfit.accessories.length > 0 && (
                    <button
                      type="button"
                      onClick={() => updateCurrent({ accessories: [] }, false)}
                      className="text-xs font-semibold text-rose-300 hover:text-rose-200 cursor-pointer"
                    >
                      Lepas Semua Aksesoris
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {ACCESSORY_OPTIONS.map((opt) => {
                    const equipped = currentOutfit.accessories.includes(opt.id);
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => toggleAccessory(opt.id)}
                        className={`min-h-[44px] px-3 py-2 rounded-xl border text-xs font-semibold transition-all cursor-pointer text-left flex items-center justify-between gap-2 ${
                          equipped
                            ? 'bg-pink-500 border-pink-400 text-zinc-950'
                            : 'bg-[#0E0E13] border-white/10 text-zinc-200 hover:border-pink-400/40'
                        }`}
                      >
                        <span className="truncate">{opt.label}</span>
                        <span className="text-[11px] shrink-0">
                          {equipped ? 'Terpasang' : 'Pasang'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
