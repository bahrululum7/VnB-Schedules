import { useEffect, useMemo, useState } from 'react';
import {
  Check,
  Download,
  Eraser,
  Palette,
  Save,
  Shirt,
  Shuffle,
  Sparkles,
} from 'lucide-react';
import type {
  AvatarCollectionId,
  CharacterConfig,
  CoupleOutfitsState,
  OutfitGender,
  StudioCategoryId,
} from '../types/outfit';
import {
  ADVENTURER_EARRINGS,
  ADVENTURER_EYEBROWS,
  ADVENTURER_EYES,
  ADVENTURER_FEATURES,
  ADVENTURER_GLASSES,
  ADVENTURER_HAIR,
  ADVENTURER_MOUTHS,
  AVATAAARS_ACCESSORIES,
  AVATAAARS_CLOTHES,
  AVATAAARS_EYEBROWS,
  AVATAAARS_EYES,
  AVATAAARS_FACIAL_HAIR,
  AVATAAARS_GRAPHICS,
  AVATAAARS_HAIR,
  AVATAAARS_HIJAB,
  AVATAAARS_MOUTH,
  BIGEARS_CHEEKS,
  BIGEARS_EARS,
  BIGEARS_EYES,
  BIGEARS_FACES,
  BIGEARS_FRONT_HAIR,
  BIGEARS_HAIR,
  BIGEARS_MOUTHS,
  BIGEARS_NOSES,
  CATEGORY_LABELS,
  COLLECTION_LIST,
  GARMENT_PALETTE,
  HAIR_PALETTE,
  LORELEI_EARRINGS,
  LORELEI_EYEBROWS,
  LORELEI_EYES,
  LORELEI_FACIAL,
  LORELEI_GLASSES,
  LORELEI_HAIR,
  LORELEI_HEAD,
  LORELEI_MOUTHS,
  LORELEI_NOSES,
  MICAH_EARRINGS,
  MICAH_EARS,
  MICAH_EYEBROWS,
  MICAH_EYES,
  MICAH_FACIAL,
  MICAH_GLASSES,
  MICAH_HAIR,
  MICAH_MOUTH,
  MICAH_NOSE,
  MICAH_SHIRT,
  OPENPEEPS_ACCESSORIES,
  OPENPEEPS_FACES,
  OPENPEEPS_FACIAL,
  OPENPEEPS_HAIR,
  OPENPEEPS_HIJAB,
  PERSONAS_BODY,
  PERSONAS_EYES,
  PERSONAS_FACIAL,
  PERSONAS_HAIR,
  PERSONAS_MOUTHS,
  PERSONAS_NOSES,
  SKIN_PALETTE,
  TOON_BEARD,
  TOON_CLOTHES,
  TOON_EYEBROWS,
  TOON_EYES,
  TOON_HAIR,
  TOON_MOUTHS,
  TOON_REAR_HAIR,
  buildRawSvg,
  createDefaultCharacter,
  normalizeConfigForStyle,
  svgToDataUrl,
  type OptionItem,
} from '../utils/dicebearStudio';
import { playPopSound } from '../utils/sound';

const STORAGE_KEY = 'vnb_couple_outfits_v2';

interface OutfitGamePageProps {
  partner1Name: string;
  partner2Name: string;
  soundEnabled: boolean;
}

function loadInitialOutfits(): CoupleOutfitsState {
  const defFemale = createDefaultCharacter('female', 'avataaars');
  const defMale = createDefaultCharacter('male', 'avataaars');
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { female: defFemale, male: defMale };
    const parsed = JSON.parse(raw) as Partial<CoupleOutfitsState>;
    const fStyle = parsed.female?.styleId ?? 'avataaars';
    const mStyle = parsed.male?.styleId ?? 'avataaars';
    return {
      female: normalizeConfigForStyle({ ...defFemale, ...(parsed.female ?? {}) }, fStyle, 'female'),
      male: normalizeConfigForStyle({ ...defMale, ...(parsed.male ?? {}) }, mStyle, 'male'),
    };
  } catch {
    return { female: defFemale, male: defMale };
  }
}

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
  const [activeTab, setActiveTab] = useState<StudioCategoryId>('rambut');
  const [savedNotice, setSavedNotice] = useState(false);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(outfits));
    } catch {
      // Ignore storage errors.
    }
  }, [outfits]);

  const currentConfig = outfits[activeGender];
  const currentMeta = useMemo(
    () => COLLECTION_LIST.find((m) => m.id === currentConfig.styleId) ?? COLLECTION_LIST[0],
    [currentConfig.styleId]
  );

  useEffect(() => {
    if (!currentMeta.categories.includes(activeTab)) {
      setActiveTab(currentMeta.categories[0]);
    }
  }, [currentMeta, activeTab]);

  const femaleDataUrl = useMemo(() => svgToDataUrl(buildRawSvg(outfits.female)), [outfits.female]);
  const maleDataUrl = useMemo(() => svgToDataUrl(buildRawSvg(outfits.male)), [outfits.male]);

  const updateCurrent = (
    updater: Partial<CharacterConfig> | ((prev: CharacterConfig) => CharacterConfig),
    equipping = true
  ) => {
    if (soundEnabled) playPopSound(equipping);
    setOutfits((prev) => ({
      ...prev,
      [activeGender]:
        typeof updater === 'function' ? updater(prev[activeGender]) : { ...prev[activeGender], ...updater },
    }));
  };

  const handleSwitchCollection = (nextStyle: AvatarCollectionId) => {
    if (nextStyle === currentConfig.styleId) return;
    if (soundEnabled) playPopSound(true);
    setOutfits((prev) => ({
      ...prev,
      [activeGender]: normalizeConfigForStyle(prev[activeGender], nextStyle, activeGender),
    }));
  };

  const handleStripAll = () => {
    updateCurrent(
      (prev) => ({
        ...prev,
        hair: prev.styleId === 'personas' ? 'bald' : prev.styleId === 'openPeeps' ? 'noHair1' : 'none',
        rearHair: 'none',
        hijabOrHat: 'none',
        accessories: 'none',
        earrings: 'none',
        hairAccessories: 'none',
        facialHair: 'none',
        cheekFeature: 'none',
        mask: 'none',
      }),
      false
    );
  };

  const handleRandomize = () => {
    const isFemale = activeGender === 'female';
    const s = currentConfig.styleId;
    const next: Partial<CharacterConfig> = {
      skinColor: pickRandom(SKIN_PALETTE),
      hairColor: pickRandom(HAIR_PALETTE),
      clothesColor: pickRandom(GARMENT_PALETTE),
      hatColor: pickRandom(GARMENT_PALETTE),
      accessoriesColor: pickRandom(['262e33', '3c4f5c', 'f472b6', 'f8fafc', 'a78bfa']),
    };

    if (s === 'avataaars') {
      const wearHijab = isFemale && Math.random() < 0.25;
      next.hijabOrHat = wearHijab ? 'hijab' : Math.random() < 0.15 ? pickRandom(AVATAAARS_HIJAB.slice(1)).id : 'none';
      next.hair = pickRandom(AVATAAARS_HAIR.slice(1)).id;
      next.clothing = pickRandom(AVATAAARS_CLOTHES).id;
      next.clothingGraphic = pickRandom(AVATAAARS_GRAPHICS).id;
      next.eyes = pickRandom(AVATAAARS_EYES).id;
      next.eyebrows = pickRandom(AVATAAARS_EYEBROWS).id;
      next.mouth = pickRandom(AVATAAARS_MOUTH).id;
      next.accessories = Math.random() < 0.35 ? pickRandom(AVATAAARS_ACCESSORIES.slice(1)).id : 'none';
      next.facialHair = !isFemale && Math.random() < 0.3 ? pickRandom(AVATAAARS_FACIAL_HAIR.slice(1)).id : 'none';
    } else if (s === 'lorelei') {
      next.headShape = pickRandom(LORELEI_HEAD).id;
      next.hair = pickRandom(LORELEI_HAIR).id;
      next.eyes = pickRandom(LORELEI_EYES).id;
      next.eyebrows = pickRandom(LORELEI_EYEBROWS).id;
      next.nose = pickRandom(LORELEI_NOSES).id;
      next.mouth = pickRandom(LORELEI_MOUTHS.slice(0, 18)).id;
      next.accessories = Math.random() < 0.3 ? pickRandom(LORELEI_GLASSES.slice(1)).id : 'none';
      next.earrings = isFemale && Math.random() < 0.5 ? pickRandom(LORELEI_EARRINGS.slice(1)).id : 'none';
      next.hairAccessories = isFemale && Math.random() < 0.3 ? 'flowers' : 'none';
      next.facialHair = !isFemale && Math.random() < 0.25 ? pickRandom(LORELEI_FACIAL.slice(1)).id : 'none';
    } else if (s === 'adventurer') {
      next.hair = pickRandom(ADVENTURER_HAIR.slice(1)).id;
      next.eyes = pickRandom(ADVENTURER_EYES).id;
      next.eyebrows = pickRandom(ADVENTURER_EYEBROWS).id;
      next.mouth = pickRandom(ADVENTURER_MOUTHS).id;
      next.accessories = Math.random() < 0.3 ? pickRandom(ADVENTURER_GLASSES.slice(1)).id : 'none';
      next.earrings = isFemale && Math.random() < 0.45 ? pickRandom(ADVENTURER_EARRINGS.slice(1)).id : 'none';
      next.cheekFeature = Math.random() < 0.5 ? 'blush' : 'none';
    } else if (s === 'toonHead') {
      next.hair = pickRandom(TOON_HAIR.slice(1)).id;
      next.rearHair = isFemale ? pickRandom(TOON_REAR_HAIR.slice(1)).id : 'none';
      next.clothing = pickRandom(TOON_CLOTHES).id;
      next.eyes = pickRandom(TOON_EYES).id;
      next.eyebrows = pickRandom(TOON_EYEBROWS).id;
      next.mouth = pickRandom(TOON_MOUTHS).id;
      next.facialHair = !isFemale && Math.random() < 0.25 ? pickRandom(TOON_BEARD.slice(1)).id : 'none';
    } else if (s === 'micah') {
      next.hair = pickRandom(MICAH_HAIR.slice(1)).id;
      next.clothing = pickRandom(MICAH_SHIRT).id;
      next.ears = pickRandom(MICAH_EARS).id;
      next.earrings = isFemale && Math.random() < 0.5 ? pickRandom(MICAH_EARRINGS.slice(1)).id : 'none';
      next.nose = pickRandom(MICAH_NOSE).id;
      next.eyes = pickRandom(MICAH_EYES).id;
      next.eyebrows = pickRandom(MICAH_EYEBROWS).id;
      next.mouth = pickRandom(MICAH_MOUTH).id;
      next.accessories = Math.random() < 0.35 ? pickRandom(MICAH_GLASSES.slice(1)).id : 'none';
      next.facialHair = !isFemale && Math.random() < 0.25 ? pickRandom(MICAH_FACIAL.slice(1)).id : 'none';
    } else if (s === 'openPeeps') {
      next.hijabOrHat = isFemale && Math.random() < 0.2 ? 'hijab' : 'none';
      next.hair = pickRandom(OPENPEEPS_HAIR).id;
      next.mouth = pickRandom(OPENPEEPS_FACES.slice(0, 12)).id;
      next.accessories = Math.random() < 0.35 ? pickRandom(OPENPEEPS_ACCESSORIES.slice(1)).id : 'none';
      next.facialHair = !isFemale && Math.random() < 0.25 ? pickRandom(OPENPEEPS_FACIAL.slice(1)).id : 'none';
    } else if (s === 'personas') {
      next.hair = pickRandom(PERSONAS_HAIR.slice(0, 18)).id;
      next.clothing = pickRandom(PERSONAS_BODY).id;
      next.eyes = pickRandom(PERSONAS_EYES).id;
      next.nose = pickRandom(PERSONAS_NOSES).id;
      next.mouth = pickRandom(PERSONAS_MOUTHS.slice(0, 5)).id;
      next.facialHair = !isFemale && Math.random() < 0.25 ? pickRandom(PERSONAS_FACIAL.slice(1)).id : 'none';
    } else {
      next.headShape = pickRandom(BIGEARS_FACES).id;
      next.ears = pickRandom(BIGEARS_EARS).id;
      next.hair = pickRandom(BIGEARS_HAIR).id;
      next.rearHair = pickRandom(BIGEARS_FRONT_HAIR).id;
      next.eyes = pickRandom(BIGEARS_EYES).id;
      next.nose = pickRandom(BIGEARS_NOSES).id;
      next.mouth = pickRandom(BIGEARS_MOUTHS.slice(0, 18)).id;
      next.cheekFeature = Math.random() < 0.5 ? pickRandom(BIGEARS_CHEEKS.slice(1)).id : 'none';
    }

    updateCurrent(next, true);
  };

  const applyPreset = (preset: 'date' | 'hijab' | 'anime' | 'jacket' | 'santai') => {
    if (soundEnabled) playPopSound(true);
    if (preset === 'date') {
      setOutfits({
        female: {
          ...createDefaultCharacter('female', 'avataaars'),
          hair: 'straightAndStrand',
          hijabOrHat: 'none',
          hairColor: '2c1b18',
          clothing: 'collarAndSweater',
          clothesColor: 'ffafb9',
          eyes: 'happy',
          mouth: 'smile',
          accessories: 'none',
        },
        male: {
          ...createDefaultCharacter('male', 'avataaars'),
          hair: 'shortWaved',
          hijabOrHat: 'none',
          hairColor: '1e1b22',
          clothing: 'blazerAndShirt',
          clothesColor: '262e33',
          eyes: 'default',
          mouth: 'twinkle',
          accessories: 'wayfarers',
        },
      });
      return;
    }

    if (preset === 'hijab') {
      setOutfits({
        female: {
          ...createDefaultCharacter('female', 'avataaars'),
          hijabOrHat: 'hijab',
          hatColor: 'f472b6',
          clothing: 'blazerAndSweater',
          clothesColor: 'fce7f3',
          eyes: 'happy',
          mouth: 'twinkle',
          accessories: 'round',
          accessoriesColor: '262e33',
        },
        male: {
          ...createDefaultCharacter('male', 'avataaars'),
          hair: 'theCaesarAndSidePart',
          hijabOrHat: 'none',
          clothing: 'collarAndSweater',
          clothesColor: '25557c',
          eyes: 'happy',
          mouth: 'smile',
          accessories: 'prescription01',
        },
      });
      return;
    }

    if (preset === 'anime') {
      setOutfits({
        female: {
          ...createDefaultCharacter('female', 'lorelei'),
          hair: 'variant24',
          hairColor: '2c1b18',
          eyes: 'variant06',
          mouth: 'happy04',
          earrings: 'variant02',
          hairAccessories: 'flowers',
          hatColor: 'f472b6',
          cheekFeature: 'freckles',
        },
        male: {
          ...createDefaultCharacter('male', 'lorelei'),
          hair: 'variant09',
          hairColor: '1e1b22',
          eyes: 'variant12',
          mouth: 'happy02',
          accessories: 'variant02',
        },
      });
      return;
    }

    if (preset === 'jacket') {
      setOutfits({
        female: {
          ...createDefaultCharacter('female', 'toonHead'),
          hair: 'bun',
          rearHair: 'longWavy',
          clothing: 'openJacket',
          clothesColor: 'f472b6',
          eyes: 'happy',
          mouth: 'smile',
        },
        male: {
          ...createDefaultCharacter('male', 'toonHead'),
          hair: 'undercut',
          rearHair: 'none',
          clothing: 'turtleNeck',
          clothesColor: '262e33',
          eyes: 'bow',
          mouth: 'laugh',
        },
      });
      return;
    }

    // Santai
    setOutfits({
      female: {
        ...createDefaultCharacter('female', 'adventurer'),
        hair: 'long12',
        hairColor: '4a312c',
        eyes: 'variant04',
        mouth: 'variant03',
        cheekFeature: 'blush',
        earrings: 'variant01',
      },
      male: {
        ...createDefaultCharacter('male', 'adventurer'),
        hair: 'short08',
        hairColor: '0e0e0e',
        eyes: 'variant02',
        mouth: 'variant05',
        accessories: 'variant03',
      },
    });
  };

  const handleSaveManual = () => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(outfits));
    } catch {
      // Ignore quota errors.
    }
    if (soundEnabled) playPopSound(true);
    setSavedNotice(true);
    window.setTimeout(() => setSavedNotice(false), 1800);
  };

  const handleDownloadSvg = () => {
    const svg = buildRawSvg(currentConfig);
    const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vnb-${activeGender}-${currentConfig.styleId}.svg`;
    a.click();
    URL.revokeObjectURL(url);
    if (soundEnabled) playPopSound(true);
  };

  // Resolve options & handler for the currently active tab + collection
  const activeTabControl = useMemo(() => {
    const s = currentConfig.styleId;

    const makeControl = (
      options: OptionItem[],
      selectedValue: string,
      field: keyof CharacterConfig,
      extraOverridesOnSelect?: Partial<CharacterConfig>
    ) => ({
      options,
      selectedValue,
      field,
      onSelect: (id: string) =>
        updateCurrent(
          { [field]: id, ...(extraOverridesOnSelect ?? {}) } as Partial<CharacterConfig>,
          id !== 'none'
        ),
    });

    if (s === 'avataaars') {
      switch (activeTab) {
        case 'rambut':
          return makeControl(AVATAAARS_HAIR, currentConfig.hijabOrHat === 'none' ? currentConfig.hair : 'none', 'hair', { hijabOrHat: 'none' });
        case 'hijab':
          return makeControl(AVATAAARS_HIJAB, currentConfig.hijabOrHat, 'hijabOrHat');
        case 'baju':
          return makeControl(AVATAAARS_CLOTHES, currentConfig.clothing, 'clothing');
        case 'motif':
          return makeControl(AVATAAARS_GRAPHICS, currentConfig.clothingGraphic, 'clothingGraphic', { clothing: 'graphicShirt' });
        case 'mata':
          return makeControl(AVATAAARS_EYES, currentConfig.eyes, 'eyes');
        case 'alis':
          return makeControl(AVATAAARS_EYEBROWS, currentConfig.eyebrows, 'eyebrows');
        case 'mulut':
          return makeControl(AVATAAARS_MOUTH, currentConfig.mouth, 'mouth');
        case 'aksesoris':
          return makeControl(AVATAAARS_ACCESSORIES, currentConfig.accessories, 'accessories');
        case 'kumis':
          return makeControl(AVATAAARS_FACIAL_HAIR, currentConfig.facialHair, 'facialHair');
        default:
          return null;
      }
    }

    if (s === 'lorelei') {
      switch (activeTab) {
        case 'rambut':
          return makeControl(LORELEI_HAIR, currentConfig.hair, 'hair');
        case 'wajah':
          return makeControl(LORELEI_HEAD, currentConfig.headShape, 'headShape');
        case 'mata':
          return makeControl(LORELEI_EYES, currentConfig.eyes, 'eyes');
        case 'alis':
          return makeControl(LORELEI_EYEBROWS, currentConfig.eyebrows, 'eyebrows');
        case 'hidung':
          return makeControl(LORELEI_NOSES, currentConfig.nose, 'nose');
        case 'mulut':
          return makeControl(LORELEI_MOUTHS, currentConfig.mouth, 'mouth');
        case 'aksesoris':
          return makeControl(LORELEI_GLASSES, currentConfig.accessories, 'accessories');
        case 'telinga':
          return makeControl(LORELEI_EARRINGS, currentConfig.earrings, 'earrings');
        case 'kumis':
          return makeControl(LORELEI_FACIAL, currentConfig.facialHair, 'facialHair');
        default:
          return null;
      }
    }

    if (s === 'adventurer') {
      switch (activeTab) {
        case 'rambut':
          return makeControl(ADVENTURER_HAIR, currentConfig.hair, 'hair');
        case 'mata':
          return makeControl(ADVENTURER_EYES, currentConfig.eyes, 'eyes');
        case 'alis':
          return makeControl(ADVENTURER_EYEBROWS, currentConfig.eyebrows, 'eyebrows');
        case 'mulut':
          return makeControl(ADVENTURER_MOUTHS, currentConfig.mouth, 'mouth');
        case 'telinga':
          return makeControl(ADVENTURER_EARRINGS, currentConfig.earrings, 'earrings');
        case 'aksesoris':
          return makeControl(ADVENTURER_GLASSES, currentConfig.accessories, 'accessories');
        case 'wajah':
          return makeControl(ADVENTURER_FEATURES, currentConfig.cheekFeature, 'cheekFeature');
        default:
          return null;
      }
    }

    if (s === 'toonHead') {
      switch (activeTab) {
        case 'rambut':
          return makeControl(TOON_HAIR, currentConfig.hair, 'hair');
        case 'poni':
          return makeControl(TOON_REAR_HAIR, currentConfig.rearHair, 'rearHair');
        case 'baju':
          return makeControl(TOON_CLOTHES, currentConfig.clothing, 'clothing');
        case 'mata':
          return makeControl(TOON_EYES, currentConfig.eyes, 'eyes');
        case 'alis':
          return makeControl(TOON_EYEBROWS, currentConfig.eyebrows, 'eyebrows');
        case 'mulut':
          return makeControl(TOON_MOUTHS, currentConfig.mouth, 'mouth');
        case 'kumis':
          return makeControl(TOON_BEARD, currentConfig.facialHair, 'facialHair');
        default:
          return null;
      }
    }

    if (s === 'micah') {
      switch (activeTab) {
        case 'rambut':
          return makeControl(MICAH_HAIR, currentConfig.hair, 'hair');
        case 'baju':
          return makeControl(MICAH_SHIRT, currentConfig.clothing, 'clothing');
        case 'telinga':
          return makeControl(MICAH_EARS, currentConfig.ears, 'ears');
        case 'hidung':
          return makeControl(MICAH_NOSE, currentConfig.nose, 'nose');
        case 'mata':
          return makeControl(MICAH_EYES, currentConfig.eyes, 'eyes');
        case 'alis':
          return makeControl(MICAH_EYEBROWS, currentConfig.eyebrows, 'eyebrows');
        case 'mulut':
          return makeControl(MICAH_MOUTH, currentConfig.mouth, 'mouth');
        case 'aksesoris':
          return makeControl(MICAH_GLASSES, currentConfig.accessories, 'accessories');
        case 'kumis':
          return makeControl(MICAH_FACIAL, currentConfig.facialHair, 'facialHair');
        default:
          return null;
      }
    }

    if (s === 'openPeeps') {
      switch (activeTab) {
        case 'rambut':
          return makeControl(OPENPEEPS_HAIR, currentConfig.hijabOrHat === 'none' ? currentConfig.hair : 'none', 'hair', { hijabOrHat: 'none' });
        case 'hijab':
          return makeControl(OPENPEEPS_HIJAB, currentConfig.hijabOrHat, 'hijabOrHat');
        case 'mulut':
          return makeControl(OPENPEEPS_FACES, currentConfig.mouth, 'mouth');
        case 'aksesoris':
          return makeControl(OPENPEEPS_ACCESSORIES, currentConfig.accessories, 'accessories');
        case 'kumis':
          return makeControl(OPENPEEPS_FACIAL, currentConfig.facialHair, 'facialHair');
        default:
          return null;
      }
    }

    if (s === 'personas') {
      switch (activeTab) {
        case 'rambut':
          return makeControl(PERSONAS_HAIR, currentConfig.hair, 'hair');
        case 'baju':
          return makeControl(PERSONAS_BODY, currentConfig.clothing, 'clothing');
        case 'mata':
          return makeControl(PERSONAS_EYES, currentConfig.eyes, 'eyes');
        case 'hidung':
          return makeControl(PERSONAS_NOSES, currentConfig.nose, 'nose');
        case 'mulut':
          return makeControl(PERSONAS_MOUTHS, currentConfig.mouth, 'mouth');
        case 'kumis':
          return makeControl(PERSONAS_FACIAL, currentConfig.facialHair, 'facialHair');
        default:
          return null;
      }
    }

    // bigEars
    switch (activeTab) {
      case 'rambut':
        return makeControl(BIGEARS_HAIR, currentConfig.hair, 'hair');
      case 'poni':
        return makeControl(BIGEARS_FRONT_HAIR, currentConfig.rearHair, 'rearHair');
      case 'telinga':
        return makeControl(BIGEARS_EARS, currentConfig.ears, 'ears');
      case 'wajah':
        return makeControl(BIGEARS_FACES, currentConfig.headShape, 'headShape');
      case 'mata':
        return makeControl(BIGEARS_EYES, currentConfig.eyes, 'eyes');
      case 'hidung':
        return makeControl(BIGEARS_NOSES, currentConfig.nose, 'nose');
      case 'mulut':
        return makeControl(BIGEARS_MOUTHS, currentConfig.mouth, 'mouth');
      default:
        return null;
    }
  }, [currentConfig, activeTab]);

  // Generate crisp live SVG thumbnail previews for every option in the active tab
  const optionThumbnails = useMemo(() => {
    if (!activeTabControl) return [];
    const { options, field } = activeTabControl;
    const extra: Partial<CharacterConfig> =
      activeTab === 'rambut' && (currentConfig.styleId === 'avataaars' || currentConfig.styleId === 'openPeeps')
        ? { hijabOrHat: 'none' }
        : activeTab === 'motif'
          ? { clothing: 'graphicShirt' }
          : {};

    return options.map((opt) => ({
      ...opt,
      thumbUrl: svgToDataUrl(
        buildRawSvg(currentConfig, {
          ...extra,
          [field]: opt.id,
        } as Partial<CharacterConfig>)
      ),
    }));
  }, [activeTabControl, activeTab, currentConfig]);

  const renderColorRow = (
    label: string,
    colors: string[],
    selectedHex: string,
    onSelect: (hex: string) => void
  ) => (
    <div className="space-y-2 pt-3 border-t border-white/[0.08]">
      <div className="flex items-center gap-1.5 text-xs font-medium text-zinc-300">
        <Palette className="w-3.5 h-3.5 text-pink-400" />
        <span>{label}</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {colors.map((hex) => {
          const active = selectedHex.toLowerCase() === hex.toLowerCase();
          const lightSwatch = ['f8fafc', 'fce7f3', 'ffdbb4', 'f7d3b5', 'ecdcbf', 'e8e1e1', 'ffafb9'].includes(
            hex.toLowerCase()
          );
          return (
            <button
              key={hex}
              type="button"
              onClick={() => onSelect(hex)}
              aria-label={`Pilih warna #${hex}`}
              className={`w-8 h-8 rounded-full border-2 transition-transform cursor-pointer flex items-center justify-center ${
                active ? 'border-pink-400 scale-110' : 'border-white/20 hover:scale-105'
              }`}
              style={{ backgroundColor: `#${hex}` }}
            >
              {active && <Check className={`w-3.5 h-3.5 ${lightSwatch ? 'text-zinc-950' : 'text-white'}`} />}
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header & Global Actions */}
      <section className="rounded-2xl bg-[#14141B] border border-white/10 p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-pink-300">
            <Shirt className="w-4 h-4" />
            <span>Koleksi Ilustrasi DiceBear Studio · 8 Gaya & Ratusan Opsi</span>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-white mt-1">
            Studio Karakter & Outfit Pasangan
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Pilih gaya ilustrasi siap pakai, lalu pasang atau lepas rambut, hijab, baju, mata, hidung, mulut, telinga, dan aksesoris tanpa saling menimpa.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleRandomize}
            className="min-h-[42px] px-4 py-2 rounded-xl bg-pink-500 hover:bg-pink-400 text-zinc-950 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
          >
            <Shuffle className="w-4 h-4" />
            <span>Acak Gaya</span>
          </button>
          <button
            type="button"
            onClick={handleStripAll}
            className="min-h-[42px] px-4 py-2 rounded-xl bg-[#1D1D27] hover:bg-rose-500/15 border border-white/10 hover:border-rose-400/40 text-xs font-semibold text-zinc-200 hover:text-rose-200 inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
          >
            <Eraser className="w-4 h-4" />
            <span>Lepas Semua</span>
          </button>
          <button
            type="button"
            onClick={handleDownloadSvg}
            className="min-h-[42px] px-4 py-2 rounded-xl bg-[#1D1D27] hover:bg-white/10 border border-white/10 text-xs font-semibold text-zinc-200 inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
          >
            <Download className="w-4 h-4" />
            <span>Unduh SVG</span>
          </button>
          <button
            type="button"
            onClick={handleSaveManual}
            className="min-h-[42px] px-4 py-2 rounded-xl bg-[#1D1D27] hover:bg-pink-500/15 border border-white/10 hover:border-pink-400/40 text-xs font-semibold text-pink-200 inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
          >
            {savedNotice ? <Check className="w-4 h-4 text-pink-400" /> : <Save className="w-4 h-4" />}
            <span>{savedNotice ? 'Tersimpan!' : 'Simpan Gaya'}</span>
          </button>
        </div>
      </section>

      {/* Main Split: White-Blur Couple Stage + Rich Option Drawer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Soft White Blurred Couple Stage */}
        <section className="lg:col-span-5 rounded-2xl bg-[#14141B] border border-white/10 p-4 sm:p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-semibold text-zinc-200">
              Panggung Pasangan ({activeGender === 'female' ? 'Wanita Aktif' : 'Lelaki Aktif'})
            </span>
            <div className="flex flex-wrap gap-1.5">
              {(
                [
                  { id: 'date', label: 'Date Night' },
                  { id: 'hijab', label: 'Hijab & Rapi' },
                  { id: 'anime', label: 'Anime Lorelei' },
                  { id: 'jacket', label: 'Jaket Kartun' },
                  { id: 'santai', label: 'Santai' },
                ] as const
              ).map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => applyPreset(p.id)}
                  className="px-2.5 py-1 rounded-lg bg-[#1D1D27] hover:bg-pink-500/20 border border-white/10 hover:border-pink-400/40 text-[11px] font-medium text-zinc-200 transition-colors cursor-pointer whitespace-nowrap"
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Female Card (White Blurred Studio Backdrop) */}
            <button
              type="button"
              onClick={() => {
                if (soundEnabled && activeGender !== 'female') playPopSound(true);
                setActiveGender('female');
              }}
              className={`relative overflow-hidden rounded-2xl p-3 border text-center transition-all cursor-pointer flex flex-col items-center bg-white/95 backdrop-blur-xl ${
                activeGender === 'female'
                  ? 'border-pink-400 ring-2 ring-pink-400/60 shadow-lg shadow-pink-500/15'
                  : 'border-white/60 hover:border-pink-300'
              }`}
            >
              <div
                className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white via-pink-50/75 to-white/95"
                aria-hidden="true"
              />
              <div
                className="pointer-events-none absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-36 h-36 rounded-full bg-pink-200/45 blur-2xl"
                aria-hidden="true"
              />
              <div className="relative z-10 w-full aspect-square max-h-[270px] flex items-center justify-center p-1">
                <img
                  src={femaleDataUrl}
                  alt={`Karakter Wanita (${partner1Name})`}
                  className="w-full h-full object-contain drop-shadow-sm select-none"
                />
              </div>
              <div className="relative z-10 mt-2 pt-2 border-t border-zinc-200/80 w-full">
                <p className="font-display text-sm font-bold text-zinc-900 truncate">
                  Wanita · {partner1Name}
                </p>
                <p className="text-[11px] font-medium text-pink-600 truncate">
                  {activeGender === 'female' ? 'Sedang didandani' : COLLECTION_LIST.find((m) => m.id === outfits.female.styleId)?.name}
                </p>
              </div>
            </button>

            {/* Male Card (White Blurred Studio Backdrop) */}
            <button
              type="button"
              onClick={() => {
                if (soundEnabled && activeGender !== 'male') playPopSound(true);
                setActiveGender('male');
              }}
              className={`relative overflow-hidden rounded-2xl p-3 border text-center transition-all cursor-pointer flex flex-col items-center bg-white/95 backdrop-blur-xl ${
                activeGender === 'male'
                  ? 'border-pink-400 ring-2 ring-pink-400/60 shadow-lg shadow-pink-500/15'
                  : 'border-white/60 hover:border-pink-300'
              }`}
            >
              <div
                className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white via-pink-50/75 to-white/95"
                aria-hidden="true"
              />
              <div
                className="pointer-events-none absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-36 h-36 rounded-full bg-pink-200/45 blur-2xl"
                aria-hidden="true"
              />
              <div className="relative z-10 w-full aspect-square max-h-[270px] flex items-center justify-center p-1">
                <img
                  src={maleDataUrl}
                  alt={`Karakter Lelaki (${partner2Name})`}
                  className="w-full h-full object-contain drop-shadow-sm select-none"
                />
              </div>
              <div className="relative z-10 mt-2 pt-2 border-t border-zinc-200/80 w-full">
                <p className="font-display text-sm font-bold text-zinc-900 truncate">
                  Lelaki · {partner2Name}
                </p>
                <p className="text-[11px] font-medium text-pink-600 truncate">
                  {activeGender === 'male' ? 'Sedang didandani' : COLLECTION_LIST.find((m) => m.id === outfits.male.styleId)?.name}
                </p>
              </div>
            </button>
          </div>
        </section>

        {/* Right: Collection Picker + Dynamic Visual Option Drawer */}
        <section className="lg:col-span-7 rounded-2xl bg-[#14141B] border border-white/10 p-5 sm:p-6 space-y-5">
          {/* Character Switcher */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/[0.08]">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-pink-400 shrink-0" />
              <h2 className="font-display text-base sm:text-lg font-bold text-white">
                Kostumisasi ({activeGender === 'female' ? `Wanita · ${partner1Name}` : `Lelaki · ${partner2Name}`})
              </h2>
            </div>

            <div className="inline-flex p-1 rounded-xl bg-[#0B0B0F] border border-white/10 self-start">
              <button
                type="button"
                onClick={() => {
                  if (soundEnabled && activeGender !== 'female') playPopSound(true);
                  setActiveGender('female');
                }}
                className={`min-h-[36px] px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  activeGender === 'female' ? 'bg-pink-500 text-zinc-950' : 'text-zinc-400 hover:text-white'
                }`}
              >
                Wanita
              </button>
              <button
                type="button"
                onClick={() => {
                  if (soundEnabled && activeGender !== 'male') playPopSound(true);
                  setActiveGender('male');
                }}
                className={`min-h-[36px] px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  activeGender === 'male' ? 'bg-pink-500 text-zinc-950' : 'text-zinc-400 hover:text-white'
                }`}
              >
                Lelaki
              </button>
            </div>
          </div>

          {/* 8 Ready-Made Art Style Collections */}
          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-semibold text-zinc-300">
                Koleksi Gaya Ilustrasi
              </span>
              <span className="text-[11px] text-zinc-400">
                {currentMeta.description}
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {COLLECTION_LIST.map((col) => {
                const active = col.id === currentConfig.styleId;
                return (
                  <button
                    key={col.id}
                    type="button"
                    onClick={() => handleSwitchCollection(col.id)}
                    className={`px-3 py-2 rounded-xl border text-left transition-colors cursor-pointer ${
                      active
                        ? 'bg-pink-500 border-pink-400 text-zinc-950'
                        : 'bg-[#0E0E13] border-white/10 text-zinc-200 hover:border-pink-400/40'
                    }`}
                  >
                    <div className="text-xs font-bold truncate">{col.name}</div>
                    <div className={`text-[10px] truncate ${active ? 'text-zinc-900/80' : 'text-zinc-400'}`}>
                      {col.badge}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Category Tabs (Dynamic per Style) */}
          <div className="flex flex-wrap gap-1.5 pt-1 border-t border-white/[0.06]">
            {currentMeta.categories.map((tab) => {
              const active = activeTab === tab;
              return (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={`min-h-[38px] px-3 py-1.5 rounded-xl border text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                    active
                      ? 'bg-pink-500 border-pink-400 text-zinc-950'
                      : 'bg-[#0E0E13] border-white/10 text-zinc-300 hover:border-pink-400/40 hover:text-white'
                  }`}
                >
                  {CATEGORY_LABELS[tab]}
                </button>
              );
            })}
          </div>

          {/* Visual Thumbnail Preview Grid */}
          <div className="space-y-4">
            {activeTabControl ? (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2.5 max-h-[360px] overflow-y-auto pr-1">
                {optionThumbnails.map((opt) => {
                  const active = activeTabControl.selectedValue === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => activeTabControl.onSelect(opt.id)}
                      className={`group rounded-xl p-2 border transition-all cursor-pointer flex flex-col items-center gap-1.5 text-center ${
                        active
                          ? 'bg-pink-500/20 border-pink-400 ring-1 ring-pink-400/60'
                          : opt.isRemove
                            ? 'bg-[#0E0E13] border-rose-400/25 hover:bg-rose-500/10'
                            : 'bg-[#0E0E13] border-white/10 hover:border-pink-400/40 hover:bg-[#191924]'
                      }`}
                    >
                      <div className="w-14 h-14 rounded-lg bg-white/95 flex items-center justify-center overflow-hidden p-0.5">
                        <img
                          src={opt.thumbUrl}
                          alt={opt.label}
                          loading="lazy"
                          className="w-full h-full object-contain"
                        />
                      </div>
                      <span
                        className={`text-[11px] font-semibold leading-tight line-clamp-2 ${
                          active ? 'text-pink-200' : opt.isRemove ? 'text-rose-200' : 'text-zinc-200'
                        }`}
                      >
                        {opt.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-zinc-400">
                Sesuaikan warna kulit karakter melalui palet di bawah ini.
              </p>
            )}

            {/* Micah Earrings selector inside Telinga & Anting tab */}
            {currentConfig.styleId === 'micah' && activeTab === 'telinga' && (
              <div className="space-y-2 pt-2 border-t border-white/[0.08]">
                <span className="text-xs font-medium text-zinc-300">Model Anting</span>
                <div className="flex flex-wrap gap-2">
                  {MICAH_EARRINGS.map((earOpt) => {
                    const active = currentConfig.earrings === earOpt.id;
                    return (
                      <button
                        key={earOpt.id}
                        type="button"
                        onClick={() => updateCurrent({ earrings: earOpt.id }, earOpt.id !== 'none')}
                        className={`min-h-[38px] px-3.5 py-1.5 rounded-xl border text-xs font-semibold cursor-pointer ${
                          active
                            ? 'bg-pink-500 border-pink-400 text-zinc-950'
                            : 'bg-[#0E0E13] border-white/10 text-zinc-200 hover:border-pink-400/40'
                        }`}
                      >
                        {earOpt.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Extra Lorelei Hair Flowers / Freckles toggles */}
            {currentConfig.styleId === 'lorelei' && (activeTab === 'rambut' || activeTab === 'wajah') && (
              <div className="flex flex-wrap gap-2 pt-2 border-t border-white/[0.08]">
                <button
                  type="button"
                  onClick={() =>
                    updateCurrent(
                      { hairAccessories: currentConfig.hairAccessories === 'flowers' ? 'none' : 'flowers' },
                      currentConfig.hairAccessories !== 'flowers'
                    )
                  }
                  className={`min-h-[38px] px-3.5 py-1.5 rounded-xl border text-xs font-semibold cursor-pointer ${
                    currentConfig.hairAccessories === 'flowers'
                      ? 'bg-pink-500 border-pink-400 text-zinc-950'
                      : 'bg-[#0E0E13] border-white/10 text-zinc-200'
                  }`}
                >
                  Hiasan Bunga Rambut ({currentConfig.hairAccessories === 'flowers' ? 'Terpasang' : 'Lepas'})
                </button>
                <button
                  type="button"
                  onClick={() =>
                    updateCurrent(
                      { cheekFeature: currentConfig.cheekFeature === 'freckles' ? 'none' : 'freckles' },
                      currentConfig.cheekFeature !== 'freckles'
                    )
                  }
                  className={`min-h-[38px] px-3.5 py-1.5 rounded-xl border text-xs font-semibold cursor-pointer ${
                    currentConfig.cheekFeature === 'freckles'
                      ? 'bg-pink-500 border-pink-400 text-zinc-950'
                      : 'bg-[#0E0E13] border-white/10 text-zinc-200'
                  }`}
                >
                  Bintik Pipi ({currentConfig.cheekFeature === 'freckles' ? 'Terpasang' : 'Lepas'})
                </button>
              </div>
            )}

            {/* Open Peeps Mask toggle */}
            {currentConfig.styleId === 'openPeeps' && activeTab === 'aksesoris' && (
              <div className="flex flex-wrap gap-2 pt-2 border-t border-white/[0.08]">
                {(
                  [
                    { id: 'none', label: 'Tanpa Masker' },
                    { id: 'medicalMask', label: 'Masker Medis' },
                    { id: 'respirator', label: 'Masker Respirator' },
                  ] as const
                ).map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => updateCurrent({ mask: m.id }, m.id !== 'none')}
                    className={`min-h-[38px] px-3.5 py-1.5 rounded-xl border text-xs font-semibold cursor-pointer ${
                      currentConfig.mask === m.id
                        ? 'bg-pink-500 border-pink-400 text-zinc-950'
                        : 'bg-[#0E0E13] border-white/10 text-zinc-200'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            )}

            {/* Contextual Color Pickers */}
            {activeTab === 'wajah' &&
              renderColorRow('Warna Kulit', SKIN_PALETTE, currentConfig.skinColor, (skinColor) =>
                updateCurrent({ skinColor })
              )}

            {(activeTab === 'rambut' || activeTab === 'poni' || activeTab === 'alis' || activeTab === 'kumis') &&
              renderColorRow('Warna Rambut', HAIR_PALETTE, currentConfig.hairColor, (hairColor) =>
                updateCurrent({ hairColor })
              )}

            {activeTab === 'hijab' &&
              renderColorRow('Warna Hijab / Topi', GARMENT_PALETTE, currentConfig.hatColor, (hatColor) =>
                updateCurrent({ hatColor })
              )}

            {(activeTab === 'baju' || activeTab === 'motif') &&
              renderColorRow('Warna Baju / Outerwear', GARMENT_PALETTE, currentConfig.clothesColor, (clothesColor) =>
                updateCurrent({ clothesColor })
              )}

            {activeTab === 'aksesoris' &&
              (currentConfig.styleId === 'avataaars' || currentConfig.styleId === 'micah' || currentConfig.styleId === 'lorelei') &&
              renderColorRow('Warna Kacamata', GARMENT_PALETTE, currentConfig.accessoriesColor, (accessoriesColor) =>
                updateCurrent({ accessoriesColor })
              )}
          </div>
        </section>
      </div>
    </div>
  );
}
