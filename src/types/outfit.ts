export type OutfitGender = 'female' | 'male';

export type FaceShapeId = 'oval' | 'round' | 'chubby' | 'sharp';
export type EyeStyleId = 'sparkle' | 'sweet' | 'wide' | 'happy' | 'cool' | 'wink';
export type EarStyleId = 'normal' | 'small' | 'pierced' | 'hidden';
export type NoseStyleId = 'cute' | 'slim' | 'button' | 'line';
export type MouthStyleId = 'smile' | 'grin' | 'o_cute' | 'calm' | 'tongue' | 'smirk';

export type HairStyleId =
  | 'none'
  | 'long_straight'
  | 'bob'
  | 'wavy'
  | 'bun'
  | 'twintails'
  | 'comma'
  | 'twoblock'
  | 'curly'
  | 'sidepart'
  | 'buzz';

export type HijabStyleId = 'none' | 'pashmina' | 'square' | 'bergo' | 'syari';
export type ShirtStyleId = 'none' | 'tshirt' | 'oversize' | 'blouse' | 'turtleneck' | 'polo';
export type KemejaStyleId = 'none' | 'buttoned' | 'open' | 'flannel' | 'short_sleeve';
export type CardiganStyleId = 'none' | 'knit' | 'long_cardigan' | 'vest' | 'zip_hoodie';
export type PantsStyleId = 'none' | 'jeans' | 'trousers' | 'culottes' | 'cargo' | 'pleated_skirt' | 'shorts';
export type ShoesStyleId = 'none' | 'sneakers' | 'loafers' | 'boots' | 'maryjane' | 'slippers';

export type AccessoryId =
  | 'glasses_round'
  | 'glasses_square'
  | 'blush'
  | 'ribbon'
  | 'cap'
  | 'necklace'
  | 'watch'
  | 'bag';

export interface CharacterOutfit {
  skinTone: string;
  faceShape: FaceShapeId;
  eyes: EyeStyleId;
  ears: EarStyleId;
  nose: NoseStyleId;
  mouth: MouthStyleId;
  hairStyle: HairStyleId;
  hairColor: string;
  hijabStyle: HijabStyleId;
  hijabColor: string;
  shirtStyle: ShirtStyleId;
  shirtColor: string;
  kemejaStyle: KemejaStyleId;
  kemejaColor: string;
  cardiganStyle: CardiganStyleId;
  cardiganColor: string;
  pantsStyle: PantsStyleId;
  pantsColor: string;
  shoesStyle: ShoesStyleId;
  shoesColor: string;
  accessories: AccessoryId[];
}

export interface CoupleOutfitsState {
  female: CharacterOutfit;
  male: CharacterOutfit;
}
