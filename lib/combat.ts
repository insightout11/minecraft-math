import { ItemDef, Rarity } from "./types";
import { ITEMS, itemById } from "./game-data";

export const JACKSON_MAX_HEARTS = 10;

export interface StrikeResult {
  damage: number;
  crit: boolean;
  burned: boolean;
  wolfBonus: number;
}

/** Jackson's attack. Pure + testable. roll() must return [0,1). */
export function calcStrike(opts: {
  base: number;
  combo: number;
  weapon?: ItemDef | null;
  petEffect?: string | null;
  roll?: () => number;
}): StrikeResult {
  const roll = opts.roll ?? Math.random;
  const sharp = opts.weapon?.effect === "sharp" ? 2 : 0;
  const dragon = opts.petEffect === "PET_dragon" ? 1 : 0;
  const critChance = 0.05 + (opts.weapon?.crit ?? 0);
  const crit = roll() < critChance;
  const wolfBonus = opts.petEffect === "PET_wolf" && roll() < 0.25 ? 2 : 0;
  const burned = opts.weapon?.effect === "fire" && roll() < 0.3;
  let damage = opts.base + Math.min(3, Math.floor(opts.combo / 2)) + Math.floor((opts.weapon?.power ?? 1) / 2) + sharp + dragon + wolfBonus + (burned ? 3 : 0);
  if (crit) damage *= 2;
  return { damage, crit, burned, wolfBonus };
}

export interface GuardResult {
  taken: number;
  blocked: boolean;
  thorns: number;
  slimeSave: boolean;
}

/** Incoming mob damage after armor/pets. Pure + testable. */
export function calcGuard(opts: {
  incoming: number;
  armorDef?: number;
  effects?: (string | undefined)[];
  mobId?: string;
  petEffect?: string | null;
  roll?: () => number;
}): GuardResult {
  const roll = opts.roll ?? Math.random;
  const fx = (opts.effects ?? []).filter(Boolean) as string[];
  let reduction = opts.armorDef ?? 0;
  if (fx.includes("protect")) reduction += 1;
  if (fx.includes("projectile") && opts.mobId === "skeleton") reduction += 2;
  if (fx.includes("blast") && (opts.mobId === "grub")) reduction += 2;
  if (opts.petEffect === "PET_dragon") reduction += 1;
  let taken = Math.max(0, opts.incoming - reduction);
  let slimeSave = false;
  if (taken > 0 && opts.petEffect === "PET_slime" && roll() < 0.25) {
    taken = Math.max(0, taken - 1);
    slimeSave = true;
  }
  const thorns = opts.incoming > 0 && taken > 0 && fx.includes("thorns") ? 2 : 0;
  return { taken, blocked: opts.incoming > 0 && taken === 0, thorns, slimeSave };
}

/** Mob attack in hearts, including boss enrage + dragon final phase. Pure. */
export function mobAttackHearts(base: number, opts: { enraged?: boolean; dragonPhase?: number }): number {
  let atk = base + (opts.enraged ? 1 : 0);
  if (opts.dragonPhase === 3) atk = Math.max(atk, 3);
  return atk;
}

const RARITY_ORDER: Rarity[] = ["Common", "Uncommon", "Rare", "Epic", "Legendary"];
const NORMAL_W: Record<Rarity, number> = { Common: 50, Uncommon: 28, Rare: 15, Epic: 6, Legendary: 1 };
const BOSS_W: Record<Rarity, number> = { Common: 5, Uncommon: 20, Rare: 35, Epic: 28, Legendary: 12 };

export function rarityRank(r: Rarity): number {
  return RARITY_ORDER.indexOf(r);
}

function weightedRarity(table: Record<Rarity, number>, roll: () => number): Rarity {
  const total = RARITY_ORDER.reduce((a, r) => a + table[r], 0);
  let x = roll() * total;
  for (const r of RARITY_ORDER) {
    x -= table[r];
    if (x <= 0) return r;
  }
  return "Common";
}

/** Loot drops for a win. Pure + testable. */
export function rollLootDrops(pool: string[], opts: { boss: boolean; foxLuck?: boolean; roll?: () => number }): string[] {
  const roll = opts.roll ?? Math.random;
  const got: string[] = [pool[Math.floor(roll() * pool.length)]];
  const bonusChance = (opts.boss ? 1 : 0.45) + (opts.foxLuck ? 0.15 : 0);
  if (roll() < bonusChance) {
    const table = opts.boss ? BOSS_W : NORMAL_W;
    const want = weightedRarity(table, roll);
    const candidates = ITEMS.filter(i => i.rarity === want && !got.includes(i.id));
    const pickFrom = candidates.length ? candidates : ITEMS.filter(i => !got.includes(i.id));
    if (pickFrom.length) got.push(pickFrom[Math.floor(roll() * pickFrom.length)].id);
  }
  if (opts.boss && roll() < 0.08 && !got.includes("totem_undying")) got.push("totem_undying");
  return [...new Set(got)].slice(0, 3);
}

/** Is `candidate` better than currently equipped same-slot item? Shows "↑ BETTER". */
export function isUpgrade(candidateId: string, equippedId: string | null): boolean {
  const cand = itemById(candidateId);
  if (!cand || !cand.slot) return false;
  if (!equippedId) return true;
  const cur = itemById(equippedId);
  if (!cur) return true;
  const score = (i: ItemDef) => (i.power ?? 0) * 2 + (i.defense ?? 0) * 2 + rarityRank(i.rarity) * 0.5;
  return score(cand) > score(cur);
}

/** Kid-friendly armor label, no spreadsheets. */
export function armorLabel(def: ItemDef): string {
  const d = def.defense ?? 0;
  if (d >= 5) return "🛡 Great Defense!";
  if (d >= 3) return "🛡 Good Defense!";
  if (d >= 1) return "🛡 Some Defense";
  return def.effect === "blast" || def.effect === "projectile" ? "🛡 Special Defense!" : "✨ Magical!";
}
