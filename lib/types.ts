export type Rarity = "Common" | "Uncommon" | "Rare" | "Epic" | "Legendary";
export type Op = "x" | "÷" | "+" | "-" | "missing" | "word" | "mixed2";
export type AnswerMode = "choice3" | "choice4" | "keypad" | "typed" | "mixed";

export interface MobDef {
  id: string;
  name: string;
  short: string;
  level: number;
  hp: number;
  difficulty: "EASY" | "MEDIUM" | "HARD" | "EXPERT";
  tables: string;
  colors: { body: string; dark: string; light: string; eye: string; accent: string };
  shape: "grub" | "zombie" | "skeleton" | "wither" | "spider" | "magma" | "chicken" | "slime" | "enderman" | "blaze" | "witch" | "dragon" | "warden" | "drowned";
  loot: string[];
  xp: number;
  coins: number;
  // combat personality: hearts of damage Jackson takes on a wrong answer
  attack: number;
  style: "bonk" | "arrow" | "boom" | "fast" | "splash" | "fire" | "teleport" | "sonic";
  blurb: string;
}

export interface WorldDef {
  id: string;
  num: number;
  name: string;
  tag: string;
  difficulty: "EASY" | "MEDIUM" | "HARD" | "EXPERT";
  range: string;
  grad: string;
  ground: string;
  sky: string;
  mobs: string[];
  boss: string;
  stars: number;
}

export type ItemEffect =
  | "sharp" | "fire"            // weapons: +2 dmg / 30% +3 burn
  | "protect" | "blast" | "projectile" | "thorns"  // armor
  | "PET_wolf" | "PET_slime" | "PET_axolotl" | "PET_dragon" | "PET_parrot" | "PET_fox";

export interface ItemDef {
  id: string;
  name: string;
  kind: "weapon" | "tool" | "armor" | "pet" | "trophy" | "gem" | "cosmetic" | "food";
  slot?: string;
  rarity: Rarity;
  power: number;
  icon: string;
  color: string;
  desc: string;
  defense?: number;   // armor: hearts blocked
  crit?: number;      // weapon: bonus crit chance 0..1
  effect?: ItemEffect;
  heal?: number;      // food: hearts restored
}

export interface Question {
  text: string;
  display: string;
  answer: number;
  choices?: number[];
  op: Op;
  table?: number;
  hint?: string;
  visual?: { groups: number; per: number };
  explanation: string;
  line?: { from: number; to: number; start: number; end: number };
}

export interface Curriculum {
  ops: { add: boolean; sub: boolean; mul: boolean; div: boolean };
  tables: number[];      // allowed multiplication tables
  minN: number;          // min operand / factor
  maxN: number;          // max operand / factor
  modes: { choice: boolean; keypad: boolean; typed: boolean };
  missing: boolean;      // missing-number equations
  words: boolean;        // word problems
  adaptive: boolean;
}

export function defaultCurriculum(): Curriculum {
  return {
    ops: { add: true, sub: true, mul: true, div: false },
    tables: [2, 3, 4, 5, 6, 7, 8, 9, 10],
    minN: 1,
    maxN: 12,
    modes: { choice: true, keypad: true, typed: true },
    missing: true,
    words: true,
    adaptive: true
  };
}

export interface SaveData {
  version: number;
  name: string;
  level: number;
  xp: number;
  coins: number;
  gems: number;
  diamonds: number;
  streak: number;
  bestStreak: number;
  stars: number;
  unlockedWorlds: string[];
  worldStars: Record<string, number>;
  inventory: string[];
  equipped: { weapon: string | null; armor: string | null; pet: string | null; hat: string | null };
  mobDefeats: Record<string, number>;
  mobsUnlocked: string[];
  achievements: string[];
  mastery: Record<string, { asked: number; correct: number; totalMs: number; score: number }>;
  history: { q: string; ok: boolean; ms: number; at: number }[];
  sessions: { at: number; answered: number; correct: number }[];
  quests: { id: string; progress: number; done: boolean }[];
  settings: { sound: boolean; music: boolean };
  tutorialDone: boolean;
  createdAt: number;
  curriculum: Curriculum;
  consumables: { apples: number; totem: boolean };
  celebrated: string[];
  updatedAt: number;
}
