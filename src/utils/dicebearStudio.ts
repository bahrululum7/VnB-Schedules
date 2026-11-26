import { createAvatar } from '@dicebear/core';
import {
  adventurer,
  avataaars,
  bigEars,
  lorelei,
  micah,
  openPeeps,
  personas,
  toonHead,
} from '@dicebear/collection';
import type {
  AvatarCollectionId,
  CharacterConfig,
  OutfitGender,
  StudioCategoryId,
} from '../types/outfit';

export interface OptionItem {
  id: string;
  label: string;
  isRemove?: boolean;
}

export interface CollectionMeta {
  id: AvatarCollectionId;
  name: string;
  badge: string;
  description: string;
  categories: StudioCategoryId[];
}

export const COLLECTION_LIST: CollectionMeta[] = [
  {
    id: 'avataaars',
    name: 'Avataaars',
    badge: 'Outfit & Hijab Lengkap',
    description: '35 rambut & hijab, 9 baju/blazer/hoodie, 10 motif kaos, kacamata & ekspresi.',
    categories: ['rambut', 'hijab', 'baju', 'motif', 'mata', 'alis', 'mulut', 'aksesoris', 'kumis', 'wajah'],
  },
  {
    id: 'lorelei',
    name: 'Lorelei',
    badge: '48 Rambut Anime',
    description: 'Ilustrasi garis halus dengan 48 model rambut, bunga rambut, anting, hidung & kacamata.',
    categories: ['rambut', 'mata', 'alis', 'hidung', 'mulut', 'aksesoris', 'telinga', 'wajah', 'kumis'],
  },
  {
    id: 'adventurer',
    name: 'Adventurer',
    badge: '45 Rambut & Ekspresi',
    description: '45 model rambut panjang/pendek, 26 mata, 30 mulut, anting, blush & kacamata.',
    categories: ['rambut', 'mata', 'alis', 'mulut', 'telinga', 'aksesoris', 'wajah'],
  },
  {
    id: 'toonHead',
    name: 'Toon Head',
    badge: 'Jaket & Rambut 2 Lapis',
    description: 'Kombinasikan rambut depan + belakang, jaket terbuka, dress, turtleneck & kemeja.',
    categories: ['rambut', 'poni', 'baju', 'mata', 'alis', 'mulut', 'kumis', 'wajah'],
  },
  {
    id: 'micah',
    name: 'Micah',
    badge: 'Telinga, Hidung & Kemeja',
    description: 'Karakter editorial dengan telinga, anting hoop/stud, hidung, kemeja berkerah & kacamata.',
    categories: ['rambut', 'baju', 'telinga', 'hidung', 'mata', 'alis', 'mulut', 'aksesoris', 'kumis', 'wajah'],
  },
  {
    id: 'openPeeps',
    name: 'Open Peeps',
    badge: '48 Kepala, Hijab & Topi',
    description: 'Sketsa tangan ekspresif dengan hijab, turban, beanie, topi, masker & 30 ekspresi.',
    categories: ['rambut', 'hijab', 'mulut', 'aksesoris', 'kumis', 'wajah'],
  },
  {
    id: 'personas',
    name: 'Personas',
    badge: 'Flat Modern',
    description: '20 gaya rambut & topi, 4 model baju termasuk kotak-kotak, hidung & ekspresi.',
    categories: ['rambut', 'baju', 'mata', 'hidung', 'mulut', 'kumis', 'wajah'],
  },
  {
    id: 'bigEars',
    name: 'Big Ears',
    badge: '40 Rambut & 8 Telinga',
    description: 'Gaya chibi dengan 40 rambut, 12 poni depan, 8 telinga, 32 mata, 38 mulut & blush.',
    categories: ['rambut', 'poni', 'telinga', 'wajah', 'mata', 'hidung', 'mulut'],
  },
];

export const CATEGORY_LABELS: Record<StudioCategoryId, string> = {
  rambut: 'Rambut',
  poni: 'Poni / Belakang',
  hijab: 'Hijab & Topi',
  wajah: 'Wajah & Kulit',
  mata: 'Mata',
  alis: 'Alis',
  hidung: 'Hidung',
  mulut: 'Mulut',
  telinga: 'Telinga & Anting',
  baju: 'Baju & Jaket',
  motif: 'Motif Kaos',
  aksesoris: 'Kacamata & Aksesoris',
  kumis: 'Kumis / Jenggot',
};

export const SKIN_PALETTE = [
  'ffdbb4',
  'f7d3b5',
  'edb98a',
  'd08b5b',
  'ae5d29',
  '694d3d',
  'fce7f3',
];

export const HAIR_PALETTE = [
  '1e1b22',
  '2c1b18',
  '4a312c',
  '724133',
  'a55728',
  'd6b370',
  'ecdcbf',
  'c93305',
  'f472b6',
  'a855f7',
  '60a5fa',
  'e8e1e1',
];

export const GARMENT_PALETTE = [
  'f8fafc',
  'fce7f3',
  'ffafb9',
  'f472b6',
  'ff488e',
  'ff5c5c',
  'a78bfa',
  '65c9ff',
  '5199e4',
  '25557c',
  '34d399',
  'fbbf24',
  '929598',
  '3c4f5c',
  '262e33',
];

export function stripHex(hex: string): string {
  return hex.replace('#', '').toLowerCase();
}

function makeRange(prefix: string, count: number, labelPrefix: string): OptionItem[] {
  const list: OptionItem[] = [];
  for (let i = 1; i <= count; i++) {
    const pad = String(i).padStart(2, '0');
    list.push({ id: `${prefix}${pad}`, label: `${labelPrefix} ${i}` });
  }
  return list;
}

// --- Option Catalogs per Collection ---

export const AVATAAARS_HAIR: OptionItem[] = [
  { id: 'none', label: 'Lepas / Botak', isRemove: true },
  { id: 'longButNotTooLong', label: 'Panjang Natural' },
  { id: 'straight01', label: 'Panjang Lurus 1' },
  { id: 'straight02', label: 'Panjang Lurus 2' },
  { id: 'straightAndStrand', label: 'Lurus Berponi' },
  { id: 'bob', label: 'Bob Pendek' },
  { id: 'miaWallace', label: 'Bob Poni Rata' },
  { id: 'curvy', label: 'Bergelombang' },
  { id: 'bigHair', label: 'Tebal Bervolume' },
  { id: 'bun', label: 'Cepol Atas' },
  { id: 'frida', label: 'Kepang Bunga' },
  { id: 'fro', label: 'Afro Mengembang' },
  { id: 'froBand', label: 'Afro + Bandana' },
  { id: 'curly', label: 'Ikal Panjang' },
  { id: 'shortCurly', label: 'Ikal Pendek' },
  { id: 'shortFlat', label: 'Pendek Rapi' },
  { id: 'shortRound', label: 'Pendek Bulat' },
  { id: 'shortWaved', label: 'Pendek Bergelombang' },
  { id: 'shaggy', label: 'Shaggy Santai' },
  { id: 'shaggyMullet', label: 'Mullet' },
  { id: 'theCaesar', label: 'Cepak Caesar' },
  { id: 'theCaesarAndSidePart', label: 'Belah Samping' },
  { id: 'shavedSides', label: 'Undercut Samping' },
  { id: 'frizzle', label: 'Keriting Mengembang' },
  { id: 'dreads', label: 'Gimbal Panjang' },
  { id: 'dreads01', label: 'Gimbal Sedang' },
  { id: 'dreads02', label: 'Gimbal Pendek' },
  { id: 'sides', label: 'Tipis Samping' },
];

export const AVATAAARS_HIJAB: OptionItem[] = [
  { id: 'none', label: 'Lepas Hijab / Topi', isRemove: true },
  { id: 'hijab', label: 'Hijab Pashmina' },
  { id: 'turban', label: 'Turban' },
  { id: 'hat', label: 'Topi Klasik' },
  { id: 'winterHat1', label: 'Beanie Polos' },
  { id: 'winterHat02', label: 'Beanie Pompom' },
  { id: 'winterHat03', label: 'Kupluk Rajut' },
  { id: 'winterHat04', label: 'Topi Bulu' },
];

export const AVATAAARS_CLOTHES: OptionItem[] = [
  { id: 'blazerAndShirt', label: 'Kemeja + Blazer' },
  { id: 'blazerAndSweater', label: 'Sweater + Blazer' },
  { id: 'collarAndSweater', label: 'Kemeja + Cardigan' },
  { id: 'hoodie', label: 'Hoodie' },
  { id: 'overall', label: 'Overall' },
  { id: 'graphicShirt', label: 'Kaos Motif' },
  { id: 'shirtCrewNeck', label: 'Kaos Polos' },
  { id: 'shirtScoopNeck', label: 'Blouse Leher Bulat' },
  { id: 'shirtVNeck', label: 'Kaos V-Neck' },
];

export const AVATAAARS_GRAPHICS: OptionItem[] = [
  { id: 'bear', label: 'Beruang' },
  { id: 'diamond', label: 'Berlian' },
  { id: 'pizza', label: 'Pizza' },
  { id: 'hola', label: 'Hola' },
  { id: 'deer', label: 'Rusa' },
  { id: 'cumbia', label: 'Cumbia' },
  { id: 'bat', label: 'Kelelawar' },
  { id: 'resist', label: 'Resist' },
  { id: 'skull', label: 'Tengkorak' },
  { id: 'skullOutline', label: 'Outline' },
];

export const AVATAAARS_EYES: OptionItem[] = [
  { id: 'default', label: 'Normal' },
  { id: 'happy', label: 'Senyum Ceria' },
  { id: 'hearts', label: 'Mata Cinta' },
  { id: 'wink', label: 'Kedip Manis' },
  { id: 'winkWacky', label: 'Kedip Lucu' },
  { id: 'surprised', label: 'Kaget Lebar' },
  { id: 'side', label: 'Melirik' },
  { id: 'squint', label: 'Menyipit' },
  { id: 'closed', label: 'Terpejam' },
  { id: 'eyeRoll', label: 'Memutar Mata' },
  { id: 'cry', label: 'Berkaca' },
  { id: 'xDizzy', label: 'Pusing Lucu' },
];

export const AVATAAARS_EYEBROWS: OptionItem[] = [
  { id: 'defaultNatural', label: 'Natural' },
  { id: 'flatNatural', label: 'Lurus Natural' },
  { id: 'raisedExcitedNatural', label: 'Terangkat Natural' },
  { id: 'frownNatural', label: 'Serius Natural' },
  { id: 'sadConcernedNatural', label: 'Lembut Natural' },
  { id: 'upDownNatural', label: 'Asimetris Natural' },
  { id: 'angryNatural', label: 'Tegas Natural' },
  { id: 'unibrowNatural', label: 'Menyatu' },
  { id: 'default', label: 'Tebal Normal' },
  { id: 'raisedExcited', label: 'Tebal Terangkat' },
  { id: 'sadConcerned', label: 'Tebal Lembut' },
  { id: 'upDown', label: 'Tebal Naik Turun' },
  { id: 'angry', label: 'Tebal Tegas' },
];

export const AVATAAARS_MOUTH: OptionItem[] = [
  { id: 'smile', label: 'Senyum Lebar' },
  { id: 'default', label: 'Senyum Kalem' },
  { id: 'twinkle', label: 'Senyum Manis' },
  { id: 'tongue', label: 'Melet Lucu' },
  { id: 'eating', label: 'Mengunyah' },
  { id: 'serious', label: 'Datar Tenang' },
  { id: 'concerned', label: 'Cemas' },
  { id: 'disbelief', label: 'Heran' },
  { id: 'grimace', label: 'Meringis' },
  { id: 'sad', label: 'Cemberut' },
  { id: 'screamOpen', label: 'Terkejut' },
  { id: 'vomit', label: 'Kocak' },
];

export const AVATAAARS_ACCESSORIES: OptionItem[] = [
  { id: 'none', label: 'Lepas Kacamata', isRemove: true },
  { id: 'round', label: 'Kacamata Bulat' },
  { id: 'prescription01', label: 'Kacamata Tipis' },
  { id: 'prescription02', label: 'Kacamata Tebal' },
  { id: 'wayfarers', label: 'Kacamata Hitam' },
  { id: 'sunglasses', label: 'Sunglasses Sport' },
  { id: 'kurt', label: 'Kacamata Retro' },
  { id: 'eyepatch', label: 'Penutup Mata' },
];

export const AVATAAARS_FACIAL_HAIR: OptionItem[] = [
  { id: 'none', label: 'Bersih / Lepas', isRemove: true },
  { id: 'beardLight', label: 'Jenggot Tipis' },
  { id: 'beardMedium', label: 'Jenggot Sedang' },
  { id: 'beardMajestic', label: 'Jenggot Tebal' },
  { id: 'moustacheFancy', label: 'Kumis Rapi' },
  { id: 'moustacheMagnum', label: 'Kumis Tebal' },
];

// Lorelei
export const LORELEI_HAIR: OptionItem[] = [
  ...makeRange('variant', 48, 'Gaya Rambut'),
];
export const LORELEI_HEAD: OptionItem[] = makeRange('variant', 4, 'Bentuk Wajah');
export const LORELEI_EYES: OptionItem[] = makeRange('variant', 24, 'Mata');
export const LORELEI_EYEBROWS: OptionItem[] = makeRange('variant', 13, 'Alis');
export const LORELEI_NOSES: OptionItem[] = makeRange('variant', 6, 'Hidung');
export const LORELEI_MOUTHS: OptionItem[] = [
  ...makeRange('happy', 18, 'Senyum'),
  ...makeRange('sad', 9, 'Kalem/Sedih'),
];
export const LORELEI_GLASSES: OptionItem[] = [
  { id: 'none', label: 'Lepas Kacamata', isRemove: true },
  ...makeRange('variant', 5, 'Kacamata'),
];
export const LORELEI_EARRINGS: OptionItem[] = [
  { id: 'none', label: 'Lepas Anting', isRemove: true },
  ...makeRange('variant', 3, 'Anting'),
];
export const LORELEI_FACIAL: OptionItem[] = [
  { id: 'none', label: 'Bersih / Lepas', isRemove: true },
  { id: 'variant01', label: 'Jenggot 1' },
  { id: 'variant02', label: 'Jenggot 2' },
];

// Adventurer
export const ADVENTURER_HAIR: OptionItem[] = [
  { id: 'none', label: 'Lepas Rambut', isRemove: true },
  ...makeRange('long', 26, 'Panjang'),
  ...makeRange('short', 19, 'Pendek'),
];
export const ADVENTURER_EYES: OptionItem[] = makeRange('variant', 26, 'Mata');
export const ADVENTURER_EYEBROWS: OptionItem[] = makeRange('variant', 15, 'Alis');
export const ADVENTURER_MOUTHS: OptionItem[] = makeRange('variant', 30, 'Mulut');
export const ADVENTURER_GLASSES: OptionItem[] = [
  { id: 'none', label: 'Lepas Kacamata', isRemove: true },
  ...makeRange('variant', 5, 'Kacamata'),
];
export const ADVENTURER_EARRINGS: OptionItem[] = [
  { id: 'none', label: 'Lepas Anting', isRemove: true },
  ...makeRange('variant', 6, 'Anting'),
];
export const ADVENTURER_FEATURES: OptionItem[] = [
  { id: 'none', label: 'Polos', isRemove: true },
  { id: 'blush', label: 'Blush Pipi' },
  { id: 'freckles', label: 'Bintik Wajah' },
  { id: 'birthmark', label: 'Tahi Lalat' },
  { id: 'mustache', label: 'Kumis Lucu' },
];

// Toon Head
export const TOON_HAIR: OptionItem[] = [
  { id: 'none', label: 'Lepas Depan', isRemove: true },
  { id: 'bun', label: 'Cepol + Poni' },
  { id: 'sideComed', label: 'Belah Samping' },
  { id: 'undercut', label: 'Undercut' },
  { id: 'spiky', label: 'Spiky' },
];
export const TOON_REAR_HAIR: OptionItem[] = [
  { id: 'none', label: 'Pendek / Lepas', isRemove: true },
  { id: 'longStraight', label: 'Panjang Lurus' },
  { id: 'longWavy', label: 'Panjang Gelombang' },
  { id: 'shoulderHigh', label: 'Sebahu' },
  { id: 'neckHigh', label: 'Bob Leher' },
];
export const TOON_CLOTHES: OptionItem[] = [
  { id: 'tShirt', label: 'Kaos Polos' },
  { id: 'shirt', label: 'Kemeja' },
  { id: 'turtleNeck', label: 'Turtleneck' },
  { id: 'openJacket', label: 'Jaket Terbuka' },
  { id: 'dress', label: 'Dress' },
];
export const TOON_EYES: OptionItem[] = [
  { id: 'happy', label: 'Ceria' },
  { id: 'wide', label: 'Lebar' },
  { id: 'bow', label: 'Lengkung' },
  { id: 'humble', label: 'Lembut' },
  { id: 'wink', label: 'Kedip' },
];
export const TOON_EYEBROWS: OptionItem[] = [
  { id: 'happy', label: 'Ceria' },
  { id: 'neutral', label: 'Netral' },
  { id: 'raised', label: 'Terangkat' },
  { id: 'sad', label: 'Sendu' },
  { id: 'angry', label: 'Tegas' },
];
export const TOON_MOUTHS: OptionItem[] = [
  { id: 'smile', label: 'Senyum' },
  { id: 'laugh', label: 'Tertawa' },
  { id: 'agape', label: 'Kaget' },
  { id: 'sad', label: 'Murung' },
  { id: 'angry', label: 'Cemberut' },
];
export const TOON_BEARD: OptionItem[] = [
  { id: 'none', label: 'Bersih / Lepas', isRemove: true },
  { id: 'chin', label: 'Jenggot Dagu' },
  { id: 'chinMoustache', label: 'Kumis + Dagu' },
  { id: 'fullBeard', label: 'Jenggot Penuh' },
  { id: 'longBeard', label: 'Jenggot Panjang' },
  { id: 'moustacheTwirl', label: 'Kumis Melengkung' },
];

// Micah
export const MICAH_HAIR: OptionItem[] = [
  { id: 'none', label: 'Lepas / Botak', isRemove: true },
  { id: 'full', label: 'Panjang Bervolume' },
  { id: 'pixie', label: 'Pixie Pendek' },
  { id: 'dannyPhantom', label: 'Jambul Modern' },
  { id: 'fonze', label: 'Klasik Tebal' },
  { id: 'dougFunny', label: 'Pendek Tipis' },
  { id: 'mrT', label: 'Mohawk' },
  { id: 'mrClean', label: 'Licin' },
  { id: 'turban', label: 'Turban' },
];
export const MICAH_SHIRT: OptionItem[] = [
  { id: 'collared', label: 'Kemeja Berkerah' },
  { id: 'crew', label: 'Kaos Crew' },
  { id: 'open', label: 'Kerah Terbuka' },
];
export const MICAH_EARS: OptionItem[] = [
  { id: 'attached', label: 'Telinga Menempel' },
  { id: 'detached', label: 'Telinga Lebar' },
];
export const MICAH_EARRINGS: OptionItem[] = [
  { id: 'none', label: 'Lepas Anting', isRemove: true },
  { id: 'hoop', label: 'Anting Bulat' },
  { id: 'stud', label: 'Anting Stud' },
];
export const MICAH_NOSE: OptionItem[] = [
  { id: 'curve', label: 'Lengkung' },
  { id: 'pointed', label: 'Mancung' },
  { id: 'tound', label: 'Bulat' },
];
export const MICAH_EYES: OptionItem[] = [
  { id: 'smiling', label: 'Senyum' },
  { id: 'smilingShadow', label: 'Senyum + Eyeshadow' },
  { id: 'eyes', label: 'Normal' },
  { id: 'eyesShadow', label: 'Normal + Eyeshadow' },
  { id: 'round', label: 'Bulat' },
];
export const MICAH_EYEBROWS: OptionItem[] = [
  { id: 'eyelashesUp', label: 'Bulu Mata Lentik' },
  { id: 'eyelashesDown', label: 'Bulu Mata Kalem' },
  { id: 'up', label: 'Tegas Naik' },
  { id: 'down', label: 'Tegas Turun' },
];
export const MICAH_MOUTH: OptionItem[] = [
  { id: 'smile', label: 'Senyum' },
  { id: 'laughing', label: 'Tertawa' },
  { id: 'smirk', label: 'Smirk' },
  { id: 'surprised', label: 'Kaget' },
  { id: 'pucker', label: 'Manis' },
  { id: 'nervous', label: 'Gugup' },
  { id: 'sad', label: 'Sedih' },
  { id: 'frown', label: 'Cemberut' },
];
export const MICAH_GLASSES: OptionItem[] = [
  { id: 'none', label: 'Lepas Kacamata', isRemove: true },
  { id: 'round', label: 'Kacamata Bulat' },
  { id: 'square', label: 'Kacamata Kotak' },
];
export const MICAH_FACIAL: OptionItem[] = [
  { id: 'none', label: 'Bersih / Lepas', isRemove: true },
  { id: 'scruff', label: 'Brewok Tipis' },
  { id: 'beard', label: 'Jenggot Tebal' },
];

// Open Peeps
export const OPENPEEPS_HAIR: OptionItem[] = [
  { id: 'long', label: 'Panjang Lurus' },
  { id: 'longBangs', label: 'Panjang Berponi' },
  { id: 'longCurly', label: 'Panjang Ikal' },
  { id: 'longAfro', label: 'Afro Panjang' },
  { id: 'buns', label: 'Cepol Dua' },
  { id: 'bun', label: 'Cepol Atas' },
  { id: 'bun2', label: 'Cepol Belakang' },
  { id: 'bangs', label: 'Bob Poni 1' },
  { id: 'bangs2', label: 'Bob Poni 2' },
  { id: 'mediumStraight', label: 'Sebahu Lurus' },
  { id: 'mediumBangs', label: 'Sebahu Poni 1' },
  { id: 'mediumBangs2', label: 'Sebahu Poni 2' },
  { id: 'mediumBangs3', label: 'Sebahu Poni 3' },
  { id: 'medium1', label: 'Medium 1' },
  { id: 'medium2', label: 'Medium 2' },
  { id: 'medium3', label: 'Medium 3' },
  { id: 'short1', label: 'Pendek 1' },
  { id: 'short2', label: 'Pendek 2' },
  { id: 'short3', label: 'Pendek 3' },
  { id: 'short4', label: 'Pendek 4' },
  { id: 'short5', label: 'Pendek 5' },
  { id: 'pomp', label: 'Pompadour' },
  { id: 'flatTop', label: 'Flat Top' },
  { id: 'flatTopLong', label: 'Flat Top Panjang' },
  { id: 'afro', label: 'Afro' },
  { id: 'cornrows', label: 'Kepang 1' },
  { id: 'cornrows2', label: 'Kepang 2' },
  { id: 'dreads1', label: 'Gimbal 1' },
  { id: 'dreads2', label: 'Gimbal 2' },
  { id: 'twists', label: 'Twists 1' },
  { id: 'twists2', label: 'Twists 2' },
  { id: 'mohawk', label: 'Mohawk 1' },
  { id: 'mohawk2', label: 'Mohawk 2' },
  { id: 'shaved1', label: 'Botak 1' },
  { id: 'shaved2', label: 'Botak 2' },
  { id: 'shaved3', label: 'Botak 3' },
  { id: 'noHair1', label: 'Licin 1' },
  { id: 'noHair2', label: 'Licin 2' },
  { id: 'noHair3', label: 'Licin 3' },
];
export const OPENPEEPS_HIJAB: OptionItem[] = [
  { id: 'none', label: 'Lepas Hijab / Topi', isRemove: true },
  { id: 'hijab', label: 'Hijab' },
  { id: 'turban', label: 'Turban' },
  { id: 'hatBeanie', label: 'Beanie' },
  { id: 'hatHip', label: 'Topi Santai' },
  { id: 'bear', label: 'Topi Beruang' },
];
export const OPENPEEPS_FACES: OptionItem[] = [
  { id: 'smile', label: 'Senyum' },
  { id: 'smileBig', label: 'Senyum Lebar' },
  { id: 'smileLOL', label: 'Tertawa Lepas' },
  { id: 'lovingGrin1', label: 'Mata Cinta 1' },
  { id: 'lovingGrin2', label: 'Mata Cinta 2' },
  { id: 'cute', label: 'Imut' },
  { id: 'calm', label: 'Tenang' },
  { id: 'cheeky', label: 'Jahil Manis' },
  { id: 'eatingHappy', label: 'Puas' },
  { id: 'explaining', label: 'Bicara' },
  { id: 'awe', label: 'Kagum' },
  { id: 'driven', label: 'Bersemangat' },
  { id: 'serious', label: 'Serius' },
  { id: 'solemn', label: 'Khidmat' },
  { id: 'eyesClosed', label: 'Terpejam' },
  { id: 'blank', label: 'Datar' },
  { id: 'concerned', label: 'Khawatir' },
  { id: 'suspicious', label: 'Curiga' },
  { id: 'tired', label: 'Lelah' },
  { id: 'smileTeethGap', label: 'Gigi Renggang' },
  { id: 'contempt', label: 'Cuek' },
  { id: 'hectic', label: 'Panik' },
  { id: 'angryWithFang', label: 'Taring Imut' },
];
export const OPENPEEPS_ACCESSORIES: OptionItem[] = [
  { id: 'none', label: 'Lepas Aksesoris', isRemove: true },
  { id: 'glasses', label: 'Kacamata 1' },
  { id: 'glasses2', label: 'Kacamata 2' },
  { id: 'glasses3', label: 'Kacamata 3' },
  { id: 'glasses4', label: 'Kacamata 4' },
  { id: 'glasses5', label: 'Kacamata 5' },
  { id: 'sunglasses', label: 'Kacamata Hitam 1' },
  { id: 'sunglasses2', label: 'Kacamata Hitam 2' },
  { id: 'eyepatch', label: 'Penutup Mata' },
];
export const OPENPEEPS_FACIAL: OptionItem[] = [
  { id: 'none', label: 'Bersih / Lepas', isRemove: true },
  { id: 'chin', label: 'Jenggot Dagu' },
  { id: 'full', label: 'Jenggot Penuh 1' },
  { id: 'full2', label: 'Jenggot Penuh 2' },
  { id: 'full3', label: 'Jenggot Penuh 3' },
  { id: 'goatee1', label: 'Goatee 1' },
  { id: 'goatee2', label: 'Goatee 2' },
  { id: 'moustache1', label: 'Kumis 1' },
  { id: 'moustache2', label: 'Kumis 2' },
  { id: 'moustache3', label: 'Kumis 3' },
  { id: 'moustache4', label: 'Kumis 4' },
];

// Personas
export const PERSONAS_HAIR: OptionItem[] = [
  { id: 'long', label: 'Panjang' },
  { id: 'extraLong', label: 'Sangat Panjang' },
  { id: 'bobCut', label: 'Bob Pendek' },
  { id: 'bobBangs', label: 'Bob Poni' },
  { id: 'pigtails', label: 'Kuncir Dua' },
  { id: 'curlyBun', label: 'Cepol Ikal' },
  { id: 'straightBun', label: 'Cepol Rapi' },
  { id: 'bunUndercut', label: 'Top Knot' },
  { id: 'curly', label: 'Ikal' },
  { id: 'shortCombover', label: 'Sisir Samping' },
  { id: 'shortComboverChops', label: 'Samping + Jambang' },
  { id: 'fade', label: 'Fade Rapi' },
  { id: 'buzzcut', label: 'Cepak' },
  { id: 'sideShave', label: 'Side Shave' },
  { id: 'curlyHighTop', label: 'High Top' },
  { id: 'mohawk', label: 'Mohawk' },
  { id: 'cap', label: 'Topi' },
  { id: 'beanie', label: 'Beanie' },
  { id: 'bald', label: 'Botak', isRemove: true },
];
export const PERSONAS_BODY: OptionItem[] = [
  { id: 'squared', label: 'Kemeja Kotak' },
  { id: 'rounded', label: 'Kaos Bulat' },
  { id: 'small', label: 'Kerah Kecil' },
  { id: 'checkered', label: 'Flanel Kotak-Kotak' },
];
export const PERSONAS_EYES: OptionItem[] = [
  { id: 'happy', label: 'Ceria' },
  { id: 'open', label: 'Terbuka' },
  { id: 'wink', label: 'Kedip' },
  { id: 'sleep', label: 'Mengantuk' },
  { id: 'glasses', label: 'Berkacamata' },
  { id: 'sunglasses', label: 'Kacamata Hitam' },
];
export const PERSONAS_NOSES: OptionItem[] = [
  { id: 'smallRound', label: 'Kecil Bulat' },
  { id: 'mediumRound', label: 'Sedang' },
  { id: 'wrinkles', label: 'Tegas' },
];
export const PERSONAS_MOUTHS: OptionItem[] = [
  { id: 'smile', label: 'Senyum' },
  { id: 'bigSmile', label: 'Senyum Lebar' },
  { id: 'smirk', label: 'Smirk' },
  { id: 'surprise', label: 'Kaget' },
  { id: 'lips', label: 'Bibir Manis' },
  { id: 'frown', label: 'Cemberut' },
  { id: 'pacifier', label: 'Empeng Lucu' },
];
export const PERSONAS_FACIAL: OptionItem[] = [
  { id: 'none', label: 'Bersih / Lepas', isRemove: true },
  { id: 'shadow', label: 'Bayangan Tipis' },
  { id: 'goatee', label: 'Goatee' },
  { id: 'beardMustache', label: 'Jenggot + Kumis' },
  { id: 'pyramid', label: 'Jenggot Piramida' },
  { id: 'walrus', label: 'Kumis Tebal' },
  { id: 'soulPatch', label: 'Soul Patch' },
];

// Big Ears
export const BIGEARS_HAIR: OptionItem[] = [
  ...makeRange('long', 20, 'Panjang'),
  ...makeRange('short', 20, 'Pendek'),
];
export const BIGEARS_FRONT_HAIR: OptionItem[] = makeRange('variant', 12, 'Poni');
export const BIGEARS_FACES: OptionItem[] = makeRange('variant', 10, 'Wajah');
export const BIGEARS_EARS: OptionItem[] = makeRange('variant', 8, 'Telinga');
export const BIGEARS_EYES: OptionItem[] = makeRange('variant', 32, 'Mata');
export const BIGEARS_NOSES: OptionItem[] = makeRange('variant', 12, 'Hidung');
export const BIGEARS_MOUTHS: OptionItem[] = [
  'variant0101', 'variant0102', 'variant0103', 'variant0104', 'variant0105',
  'variant0201', 'variant0202', 'variant0203', 'variant0204', 'variant0205',
  'variant0301', 'variant0302', 'variant0303', 'variant0304', 'variant0305',
  'variant0401', 'variant0402', 'variant0403', 'variant0404', 'variant0405',
  'variant0501', 'variant0502', 'variant0503', 'variant0504', 'variant0505',
  'variant0601', 'variant0602', 'variant0603', 'variant0604', 'variant0605',
  'variant0701', 'variant0702', 'variant0703', 'variant0704', 'variant0705',
  'variant0706', 'variant0707', 'variant0708',
].map((id, idx) => ({ id, label: `Mulut ${idx + 1}` }));
export const BIGEARS_CHEEKS: OptionItem[] = [
  { id: 'none', label: 'Polos', isRemove: true },
  ...makeRange('variant', 6, 'Blush'),
];

export function createDefaultCharacter(gender: OutfitGender, styleId: AvatarCollectionId = 'avataaars'): CharacterConfig {
  const isFemale = gender === 'female';
  const base: CharacterConfig = {
    styleId,
    seed: isFemale ? 'vnb-female' : 'vnb-male',
    skinColor: isFemale ? 'ffdbb4' : 'edb98a',
    hairColor: '2c1b18',
    clothesColor: isFemale ? 'ffafb9' : '262e33',
    hatColor: isFemale ? 'f472b6' : '3c4f5c',
    accessoriesColor: '262e33',
    headShape: 'variant01',
    hair: isFemale ? 'longButNotTooLong' : 'shortFlat',
    rearHair: 'longWavy',
    hijabOrHat: 'none',
    eyes: 'happy',
    eyebrows: 'defaultNatural',
    nose: 'variant01',
    mouth: 'smile',
    ears: 'attached',
    clothing: isFemale ? 'collarAndSweater' : 'blazerAndShirt',
    clothingGraphic: 'bear',
    accessories: isFemale ? 'none' : 'wayfarers',
    earrings: 'none',
    hairAccessories: 'none',
    facialHair: 'none',
    cheekFeature: 'none',
    mask: 'none',
  };

  return normalizeConfigForStyle(base, styleId, gender);
}

export function normalizeConfigForStyle(
  cfg: CharacterConfig,
  nextStyle: AvatarCollectionId,
  gender: OutfitGender
): CharacterConfig {
  const isFemale = gender === 'female';
  const next: CharacterConfig = { ...cfg, styleId: nextStyle };

  if (nextStyle === 'avataaars') {
    if (!AVATAAARS_HAIR.some((o) => o.id === next.hair)) next.hair = isFemale ? 'longButNotTooLong' : 'shortFlat';
    if (!AVATAAARS_HIJAB.some((o) => o.id === next.hijabOrHat)) next.hijabOrHat = 'none';
    if (!AVATAAARS_EYES.some((o) => o.id === next.eyes)) next.eyes = 'happy';
    if (!AVATAAARS_EYEBROWS.some((o) => o.id === next.eyebrows)) next.eyebrows = 'defaultNatural';
    if (!AVATAAARS_MOUTH.some((o) => o.id === next.mouth)) next.mouth = 'smile';
    if (!AVATAAARS_CLOTHES.some((o) => o.id === next.clothing)) next.clothing = isFemale ? 'collarAndSweater' : 'blazerAndShirt';
    if (!AVATAAARS_ACCESSORIES.some((o) => o.id === next.accessories)) next.accessories = 'none';
    if (!AVATAAARS_FACIAL_HAIR.some((o) => o.id === next.facialHair)) next.facialHair = 'none';
    return next;
  }

  if (nextStyle === 'lorelei') {
    if (!LORELEI_HEAD.some((o) => o.id === next.headShape)) next.headShape = 'variant01';
    if (!LORELEI_HAIR.some((o) => o.id === next.hair)) next.hair = isFemale ? 'variant18' : 'variant05';
    if (!LORELEI_EYES.some((o) => o.id === next.eyes)) next.eyes = 'variant04';
    if (!LORELEI_EYEBROWS.some((o) => o.id === next.eyebrows)) next.eyebrows = 'variant02';
    if (!LORELEI_NOSES.some((o) => o.id === next.nose)) next.nose = 'variant01';
    if (!LORELEI_MOUTHS.some((o) => o.id === next.mouth)) next.mouth = 'happy02';
    if (!LORELEI_GLASSES.some((o) => o.id === next.accessories)) next.accessories = 'none';
    if (!LORELEI_EARRINGS.some((o) => o.id === next.earrings)) next.earrings = isFemale ? 'variant01' : 'none';
    if (!LORELEI_FACIAL.some((o) => o.id === next.facialHair)) next.facialHair = 'none';
    return next;
  }

  if (nextStyle === 'adventurer') {
    if (!ADVENTURER_HAIR.some((o) => o.id === next.hair)) next.hair = isFemale ? 'long04' : 'short05';
    if (!ADVENTURER_EYES.some((o) => o.id === next.eyes)) next.eyes = 'variant01';
    if (!ADVENTURER_EYEBROWS.some((o) => o.id === next.eyebrows)) next.eyebrows = 'variant01';
    if (!ADVENTURER_MOUTHS.some((o) => o.id === next.mouth)) next.mouth = 'variant01';
    if (!ADVENTURER_GLASSES.some((o) => o.id === next.accessories)) next.accessories = 'none';
    if (!ADVENTURER_EARRINGS.some((o) => o.id === next.earrings)) next.earrings = 'none';
    if (!ADVENTURER_FEATURES.some((o) => o.id === next.cheekFeature)) next.cheekFeature = isFemale ? 'blush' : 'none';
    return next;
  }

  if (nextStyle === 'toonHead') {
    if (!TOON_HAIR.some((o) => o.id === next.hair)) next.hair = isFemale ? 'bun' : 'sideComed';
    if (!TOON_REAR_HAIR.some((o) => o.id === next.rearHair)) next.rearHair = isFemale ? 'longWavy' : 'none';
    if (!TOON_CLOTHES.some((o) => o.id === next.clothing)) next.clothing = isFemale ? 'openJacket' : 'shirt';
    if (!TOON_EYES.some((o) => o.id === next.eyes)) next.eyes = 'happy';
    if (!TOON_EYEBROWS.some((o) => o.id === next.eyebrows)) next.eyebrows = 'happy';
    if (!TOON_MOUTHS.some((o) => o.id === next.mouth)) next.mouth = 'smile';
    if (!TOON_BEARD.some((o) => o.id === next.facialHair)) next.facialHair = 'none';
    return next;
  }

  if (nextStyle === 'micah') {
    if (!MICAH_HAIR.some((o) => o.id === next.hair)) next.hair = isFemale ? 'full' : 'dannyPhantom';
    if (!MICAH_SHIRT.some((o) => o.id === next.clothing)) next.clothing = 'collared';
    if (!MICAH_EARS.some((o) => o.id === next.ears)) next.ears = 'attached';
    if (!MICAH_EARRINGS.some((o) => o.id === next.earrings)) next.earrings = isFemale ? 'hoop' : 'none';
    if (!MICAH_NOSE.some((o) => o.id === next.nose)) next.nose = 'curve';
    if (!MICAH_EYES.some((o) => o.id === next.eyes)) next.eyes = isFemale ? 'smilingShadow' : 'smiling';
    if (!MICAH_EYEBROWS.some((o) => o.id === next.eyebrows)) next.eyebrows = isFemale ? 'eyelashesUp' : 'up';
    if (!MICAH_MOUTH.some((o) => o.id === next.mouth)) next.mouth = 'smile';
    if (!MICAH_GLASSES.some((o) => o.id === next.accessories)) next.accessories = 'none';
    if (!MICAH_FACIAL.some((o) => o.id === next.facialHair)) next.facialHair = 'none';
    return next;
  }

  if (nextStyle === 'openPeeps') {
    if (!OPENPEEPS_HAIR.some((o) => o.id === next.hair)) next.hair = isFemale ? 'longBangs' : 'pomp';
    if (!OPENPEEPS_HIJAB.some((o) => o.id === next.hijabOrHat)) next.hijabOrHat = 'none';
    if (!OPENPEEPS_FACES.some((o) => o.id === next.mouth)) next.mouth = 'smile';
    if (!OPENPEEPS_ACCESSORIES.some((o) => o.id === next.accessories)) next.accessories = 'none';
    if (!OPENPEEPS_FACIAL.some((o) => o.id === next.facialHair)) next.facialHair = 'none';
    return next;
  }

  if (nextStyle === 'personas') {
    if (!PERSONAS_HAIR.some((o) => o.id === next.hair)) next.hair = isFemale ? 'long' : 'shortCombover';
    if (!PERSONAS_BODY.some((o) => o.id === next.clothing)) next.clothing = isFemale ? 'rounded' : 'checkered';
    if (!PERSONAS_EYES.some((o) => o.id === next.eyes)) next.eyes = 'happy';
    if (!PERSONAS_NOSES.some((o) => o.id === next.nose)) next.nose = 'smallRound';
    if (!PERSONAS_MOUTHS.some((o) => o.id === next.mouth)) next.mouth = 'smile';
    if (!PERSONAS_FACIAL.some((o) => o.id === next.facialHair)) next.facialHair = 'none';
    return next;
  }

  // bigEars
  if (!BIGEARS_HAIR.some((o) => o.id === next.hair)) next.hair = isFemale ? 'long05' : 'short05';
  if (!BIGEARS_FRONT_HAIR.some((o) => o.id === next.rearHair)) next.rearHair = 'variant01';
  if (!BIGEARS_FACES.some((o) => o.id === next.headShape)) next.headShape = 'variant01';
  if (!BIGEARS_EARS.some((o) => o.id === next.ears)) next.ears = 'variant01';
  if (!BIGEARS_EYES.some((o) => o.id === next.eyes)) next.eyes = 'variant01';
  if (!BIGEARS_NOSES.some((o) => o.id === next.nose)) next.nose = 'variant01';
  if (!BIGEARS_MOUTHS.some((o) => o.id === next.mouth)) next.mouth = 'variant0101';
  if (!BIGEARS_CHEEKS.some((o) => o.id === next.cheekFeature)) next.cheekFeature = isFemale ? 'variant01' : 'none';
  return next;
}

export function buildRawSvg(config: CharacterConfig, overrides?: Partial<CharacterConfig>): string {
  const c = overrides ? { ...config, ...overrides } : config;
  const skin = stripHex(c.skinColor);
  const hairCol = stripHex(c.hairColor);
  const clothCol = stripHex(c.clothesColor);
  const hatCol = stripHex(c.hatColor);
  const accCol = stripHex(c.accessoriesColor);

  switch (c.styleId) {
    case 'avataaars': {
      const activeTop = c.hijabOrHat !== 'none' ? c.hijabOrHat : c.hair;
      const hasTop = activeTop !== 'none';
      const hasAcc = c.accessories !== 'none';
      const hasBeard = c.facialHair !== 'none';
      return createAvatar(avataaars, {
        seed: c.seed,
        style: ['default'],
        backgroundColor: ['transparent'],
        skinColor: [skin],
        hairColor: [hairCol],
        hatColor: [hatCol],
        clothesColor: [clothCol],
        accessoriesColor: [accCol],
        facialHairColor: [hairCol],
        top: hasTop ? ([activeTop] as never) : undefined,
        topProbability: hasTop ? 100 : 0,
        eyes: [c.eyes as never],
        eyebrows: [c.eyebrows as never],
        mouth: [c.mouth as never],
        clothing: [c.clothing as never],
        clothingGraphic: [c.clothingGraphic as never],
        accessories: hasAcc ? ([c.accessories] as never) : undefined,
        accessoriesProbability: hasAcc ? 100 : 0,
        facialHair: hasBeard ? ([c.facialHair] as never) : undefined,
        facialHairProbability: hasBeard ? 100 : 0,
      }).toString();
    }

    case 'lorelei': {
      const hasGlasses = c.accessories !== 'none';
      const hasEarrings = c.earrings !== 'none';
      const hasFlowers = c.hairAccessories !== 'none';
      const hasBeard = c.facialHair !== 'none';
      const hasFreckles = c.cheekFeature === 'freckles';
      return createAvatar(lorelei, {
        seed: c.seed,
        backgroundColor: ['transparent'],
        skinColor: [skin],
        hairColor: [hairCol],
        eyebrowsColor: [hairCol],
        eyesColor: ['181822'],
        mouthColor: ['be185d'],
        noseColor: ['9f5842'],
        glassesColor: [accCol],
        earringsColor: [hatCol],
        hairAccessoriesColor: [hatCol],
        head: [c.headShape as never],
        hair: [c.hair as never],
        eyes: [c.eyes as never],
        eyebrows: [c.eyebrows as never],
        nose: [c.nose as never],
        mouth: [c.mouth as never],
        glasses: hasGlasses ? ([c.accessories] as never) : undefined,
        glassesProbability: hasGlasses ? 100 : 0,
        earrings: hasEarrings ? ([c.earrings] as never) : undefined,
        earringsProbability: hasEarrings ? 100 : 0,
        hairAccessories: hasFlowers ? ['flowers'] : undefined,
        hairAccessoriesProbability: hasFlowers ? 100 : 0,
        beard: hasBeard ? ([c.facialHair] as never) : undefined,
        beardProbability: hasBeard ? 100 : 0,
        freckles: hasFreckles ? ['variant01'] : undefined,
        frecklesProbability: hasFreckles ? 100 : 0,
      }).toString();
    }

    case 'adventurer': {
      const hasHair = c.hair !== 'none';
      const hasGlasses = c.accessories !== 'none';
      const hasEarrings = c.earrings !== 'none';
      const hasFeature = c.cheekFeature !== 'none';
      return createAvatar(adventurer, {
        seed: c.seed,
        backgroundColor: ['transparent'],
        skinColor: [skin],
        hairColor: [hairCol],
        hair: hasHair ? ([c.hair] as never) : undefined,
        hairProbability: hasHair ? 100 : 0,
        eyes: [c.eyes as never],
        eyebrows: [c.eyebrows as never],
        mouth: [c.mouth as never],
        glasses: hasGlasses ? ([c.accessories] as never) : undefined,
        glassesProbability: hasGlasses ? 100 : 0,
        earrings: hasEarrings ? ([c.earrings] as never) : undefined,
        earringsProbability: hasEarrings ? 100 : 0,
        features: hasFeature ? ([c.cheekFeature] as never) : undefined,
        featuresProbability: hasFeature ? 100 : 0,
      }).toString();
    }

    case 'toonHead': {
      const hasFront = c.hair !== 'none';
      const hasRear = c.rearHair !== 'none';
      const hasBeard = c.facialHair !== 'none';
      return createAvatar(toonHead, {
        seed: c.seed,
        backgroundColor: ['transparent'],
        skinColor: [skin],
        hairColor: [hairCol],
        clothesColor: [clothCol],
        hair: hasFront ? ([c.hair] as never) : undefined,
        hairProbability: hasFront ? 100 : 0,
        rearHair: hasRear ? ([c.rearHair] as never) : undefined,
        rearHairProbability: hasRear ? 100 : 0,
        clothes: [c.clothing as never],
        eyes: [c.eyes as never],
        eyebrows: [c.eyebrows as never],
        mouth: [c.mouth as never],
        beard: hasBeard ? ([c.facialHair] as never) : undefined,
        beardProbability: hasBeard ? 100 : 0,
      }).toString();
    }

    case 'micah': {
      const hasHair = c.hair !== 'none';
      const hasGlasses = c.accessories !== 'none';
      const hasEarrings = c.earrings !== 'none';
      const hasBeard = c.facialHair !== 'none';
      return createAvatar(micah, {
        seed: c.seed,
        backgroundColor: ['transparent'],
        baseColor: [skin],
        hairColor: [hairCol],
        shirtColor: [clothCol],
        glassesColor: [accCol],
        earringColor: [hatCol],
        hair: hasHair ? ([c.hair] as never) : undefined,
        hairProbability: hasHair ? 100 : 0,
        ears: [c.ears as never],
        earrings: hasEarrings ? ([c.earrings] as never) : undefined,
        earringsProbability: hasEarrings ? 100 : 0,
        nose: [c.nose as never],
        eyes: [c.eyes as never],
        eyebrows: [c.eyebrows as never],
        mouth: [c.mouth as never],
        shirt: [c.clothing as never],
        glasses: hasGlasses ? ([c.accessories] as never) : undefined,
        glassesProbability: hasGlasses ? 100 : 0,
        facialHair: hasBeard ? ([c.facialHair] as never) : undefined,
        facialHairProbability: hasBeard ? 100 : 0,
      }).toString();
    }

    case 'openPeeps': {
      const activeHead = c.hijabOrHat !== 'none' ? c.hijabOrHat : c.hair;
      const hasAcc = c.accessories !== 'none';
      const hasBeard = c.facialHair !== 'none';
      const hasMask = c.mask !== 'none';
      return createAvatar(openPeeps, {
        seed: c.seed,
        backgroundColor: ['transparent'],
        skinColor: [skin],
        headContrastColor: [c.hijabOrHat !== 'none' ? hatCol : hairCol],
        clothingColor: [clothCol],
        head: [activeHead as never],
        face: [c.mouth as never],
        accessories: hasAcc ? ([c.accessories] as never) : undefined,
        accessoriesProbability: hasAcc ? 100 : 0,
        facialHair: hasBeard ? ([c.facialHair] as never) : undefined,
        facialHairProbability: hasBeard ? 100 : 0,
        mask: hasMask ? ([c.mask] as never) : undefined,
        maskProbability: hasMask ? 100 : 0,
      }).toString();
    }

    case 'personas': {
      const hasBeard = c.facialHair !== 'none';
      return createAvatar(personas, {
        seed: c.seed,
        backgroundColor: ['transparent'],
        skinColor: [skin],
        hairColor: [hairCol],
        clothingColor: [clothCol],
        hair: [c.hair as never],
        body: [c.clothing as never],
        eyes: [c.eyes as never],
        nose: [c.nose as never],
        mouth: [c.mouth as never],
        facialHair: hasBeard ? ([c.facialHair] as never) : undefined,
        facialHairProbability: hasBeard ? 100 : 0,
      }).toString();
    }

    case 'bigEars': {
      const hasCheek = c.cheekFeature !== 'none';
      return createAvatar(bigEars, {
        seed: c.seed,
        backgroundColor: ['transparent'],
        skinColor: [skin],
        hairColor: [hairCol],
        face: [c.headShape as never],
        ear: [c.ears as never],
        hair: [c.hair as never],
        frontHair: [c.rearHair as never],
        eyes: [c.eyes as never],
        nose: [c.nose as never],
        mouth: [c.mouth as never],
        cheek: hasCheek ? ([c.cheekFeature] as never) : undefined,
        cheekProbability: hasCheek ? 100 : 0,
      }).toString();
    }
  }
}

export function svgToDataUrl(svg: string): string {
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
