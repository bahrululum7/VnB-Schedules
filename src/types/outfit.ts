export type OutfitGender = 'female' | 'male';

export type AvatarCollectionId =
  | 'avataaars'
  | 'adventurer'
  | 'lorelei'
  | 'toonHead'
  | 'micah'
  | 'openPeeps'
  | 'personas'
  | 'bigEars';

export type StudioCategoryId =
  | 'rambut'
  | 'poni'
  | 'hijab'
  | 'wajah'
  | 'mata'
  | 'alis'
  | 'hidung'
  | 'mulut'
  | 'telinga'
  | 'baju'
  | 'motif'
  | 'aksesoris'
  | 'kumis';

export interface CharacterConfig {
  styleId: AvatarCollectionId;
  seed: string;
  // Shared colors (stored as 6-char hex without '#' or normalized automatically)
  skinColor: string;
  hairColor: string;
  clothesColor: string;
  hatColor: string;
  accessoriesColor: string;
  // Per-trait generic slots mapped cleanly per collection
  headShape: string;
  hair: string;
  rearHair: string; // front/back hair or frontHair (bigEars / toonHead)
  hijabOrHat: string; // specifically for hijab/topi tab when style separates or shares top
  eyes: string;
  eyebrows: string;
  nose: string;
  mouth: string;
  ears: string;
  clothing: string;
  clothingGraphic: string;
  accessories: string; // glasses / eyepatch
  earrings: string;
  hairAccessories: string;
  facialHair: string;
  cheekFeature: string;
  mask: string;
}

export interface CoupleOutfitsState {
  female: CharacterConfig;
  male: CharacterConfig;
}
