import { ITEMS, itemById, WORLDS } from "./game-data";
import { HardcoreRecords, HardcoreRun, HardcoreTimerPressure, defaultHardcoreState } from "./types";

/* ================= Hardcore Mode rules (central config) ================= */

export const HC_MAX_HEARTS = 5;

/** Per-mob Hardcore damage in hearts (wrong answer). Tuned: fresh 5-heart
 *  run always survives a single early mistake. */
export const HC_ATTACK: Record<string, number> = {
  chicken: 1,
  grub: 2,
  zombie: 1,
  skeleton: 2,
  spider: 2,
  slime: 1,
  wither: 2,
  drowned: 2,
  enderman: 2,
  blaze: 3,
  witch: 2,
  warden: 3,
  dragon: 3
};

/** Enrage (question timer) thresholds in ms. No auto-fail, ever. */
export const ENRAGE_MS: Record<Exclude<HardcoreTimerPressure, "off">, number> = {
  normal: 8000,
  intense: 5000
};

export function isQuestionEnraged(elapsedMs: number, pressure: HardcoreTimerPressure): boolean {
  if (pressure === "off") return false;
  return elapsedMs >= ENRAGE_MS[pressure];
}

/** Hardcore incoming damage. Boss fights hit +1 (cap 4); enraged mobs +1 (cap 4);
 *  dragon final phase hits 4. Question-timer enrage adds +1 (cap 4). */
export function hcMobAttack(mobId: string, base: number, opts: {
  boss?: boolean; enraged?: boolean; dragonPhase?: number; questionEnraged?: boolean;
}): number {
  let atk = HC_ATTACK[mobId] ?? Math.min(3, Math.max(1, base));
  if (opts.boss) atk += 1;
  if (opts.enraged) atk += 1;
  if (opts.dragonPhase === 3) atk = Math.max(atk, 4);
  if (opts.questionEnraged) atk += 1;
  return Math.min(4, Math.max(1, atk));
}

/* ================= scoring (accuracy first, never speed) ================= */

export const SCORE_CORRECT = 100;
export const SCORE_STREAK_CAP = 100;
export const SCORE_MOB = 250;
export const SCORE_BOSS = 1000;
export const SCORE_WORLD = 1500;
export const SCORE_HEART_LEFT = 200; // completion bonus per remaining heart

/** Correct answer: 100 + streak bonus (no speed component on purpose). */
export function scoreCorrect(streakAfter: number): number {
  return SCORE_CORRECT + Math.min(SCORE_STREAK_CAP, Math.max(0, streakAfter - 1) * 10);
}

export function runAccuracy(run: { answered: number; correct: number }): number {
  if (run.answered <= 0) return 1;
  return run.correct / run.answered;
}

/** Final tally: accuracy multiplier rewards careful play, never speed. */
export function finalizeScore(base: number, accuracy: number, heartsLeft: number, completed: boolean): number {
  const hpBonus = completed ? heartsLeft * SCORE_HEART_LEFT : 0;
  return Math.round((base + hpBonus) * (0.5 + Math.max(0, Math.min(1, accuracy))));
}

/* ================= accuracy gates (soft, never run-ending) ================= */

export const BOSS_GATE_ACC = 0.85;
export const BOSS_GATE_WORLDS = ["deepdark", "end", "forest"];
export const BOSS_GATE_HP_MULT = 1.25;

/** Late-campaign bosses check run accuracy. Missing the gate only makes the
 *  boss tougher (+25% HP) — the run always continues. */
export function gatePenalty(worldId: string, accuracy: number, answered: number): { gated: boolean; hpMult: number; note: string | null } {
  if (!BOSS_GATE_WORLDS.includes(worldId) || answered < 5) return { gated: false, hpMult: 1, note: null };
  if (accuracy >= BOSS_GATE_ACC) return { gated: false, hpMult: 1, note: null };
  return {
    gated: true,
    hpMult: BOSS_GATE_HP_MULT,
    note: `Boss Gate: ${Math.round(BOSS_GATE_ACC * 100)}% accuracy needed — the boss smells fear and gains health!`
  };
}

/* ================= trophies ================= */

export interface HcTrophy { id: string; name: string; desc: string; icon: string }

export const HC_TROPHIES: HcTrophy[] = [
  { id: "hc_first_blood", name: "First Blood", desc: "Defeat your first Hardcore mob.", icon: "🩸" },
  { id: "hc_survivor", name: "Survivor", desc: "Reach World 3 in one run.", icon: "🎒" },
  { id: "hc_deep_diver", name: "Deep Diver", desc: "Reach the Deep Dark.", icon: "🌊" },
  { id: "hc_warden_slayer", name: "Warden Slayer", desc: "Defeat the Warden in Hardcore.", icon: "🔔" },
  { id: "hc_dragon_slayer", name: "Dragon Slayer", desc: "Defeat the Ender Dragon in Hardcore.", icon: "🐉" },
  { id: "hc_sharpshooter", name: "Sharpshooter", desc: "Finish a world at 95%+ accuracy.", icon: "🎯" },
  { id: "hc_untouchable", name: "Untouchable", desc: "Defeat a boss without taking damage.", icon: "✨" },
  { id: "hc_perfect_world", name: "Perfect World", desc: "Complete an entire world with no wrong answers.", icon: "💎" },
  { id: "hc_champion", name: "Hardcore Champion", desc: "Complete the full Hardcore campaign.", icon: "👑" }
];

/* ================= run lifecycle (pure helpers) ================= */

export function defaultRun(): HardcoreRun {
  return {
    startedAt: Date.now(),
    playMs: 0,
    worldIdx: 0,
    step: 0,
    hearts: HC_MAX_HEARTS,
    score: 0,
    answered: 0,
    correct: 0,
    wrong: 0,
    streak: 0,
    bestStreak: 0,
    bosses: 0,
    bossesDefeated: [],
    mobsWon: 0,
    inventory: ["wooden_sword"],
    equipped: { weapon: "wooden_sword", armor: null, pet: null, hat: null },
    apples: 1, // one apple so the first run teaches healing kindly
    totem: false,
    trophiesEarned: [],
    worldsCompleted: [],
    worldAnswered: 0,
    worldCorrect: 0,
    worldWrong: 0,
    bossDamageTaken: 0,
    battle: null
  };
}

export function grantTrophy(run: HardcoreRun, id: string): boolean {
  if (run.trophiesEarned.includes(id)) return false;
  run.trophiesEarned.push(id);
  return true;
}

/** Campaign step order: each world = steps 0..2 (missions) then 3 (boss). */
export function stepCount(): number {
  return WORLDS.length * 4;
}

export function stepLabel(worldIdx: number, step: number): string {
  const w = WORLDS[Math.min(worldIdx, WORLDS.length - 1)];
  return step >= 3 ? `${w.tag} — BOSS` : `${w.tag} — Battle ${step + 1}`;
}

/* ================= hardcore loot (scarcer, run-owned) ================= */

const HC_NORMAL_W = { Common: 55, Uncommon: 27, Rare: 13, Epic: 4, Legendary: 1 } as const;
const HC_BOSS_W = { Common: 10, Uncommon: 25, Rare: 33, Epic: 22, Legendary: 10 } as const;
type Rar = keyof typeof HC_NORMAL_W;
const RAR_ORDER: Rar[] = ["Common", "Uncommon", "Rare", "Epic", "Legendary"];

function weightedRarity(table: Record<Rar, number>, roll: () => number): Rar {
  const total = RAR_ORDER.reduce((a, r) => a + table[r], 0);
  let x = roll() * total;
  for (const r of RAR_ORDER) {
    x -= table[r];
    if (x <= 0) return r;
  }
  return "Common";
}

/** Run loot: pool pick + smaller bonus chance than normal. Pure + testable. */
export function rollHardcoreDrops(pool: string[], opts: { boss: boolean; foxLuck?: boolean; roll?: () => number }): string[] {
  const roll = opts.roll ?? Math.random;
  const got: string[] = [pool[Math.floor(roll() * pool.length)]];
  const bonusChance = (opts.boss ? 1 : 0.3) + (opts.foxLuck ? 0.1 : 0);
  if (roll() < bonusChance) {
    const table = opts.boss ? HC_BOSS_W : HC_NORMAL_W;
    const want = weightedRarity(table, roll);
    const candidates = ITEMS.filter(i => (i.rarity as Rar) === want && !got.includes(i.id));
    const pickFrom = candidates.length ? candidates : ITEMS.filter(i => !got.includes(i.id));
    if (pickFrom.length) got.push(pickFrom[Math.floor(roll() * pickFrom.length)].id);
  }
  if (opts.boss && roll() < 0.05 && !got.includes("totem_undying")) got.push("totem_undying");
  return [...new Set(got)].slice(0, 3);
}

/** Golden apples stay scarce: normal wins sometimes, bosses more often. */
export function rollHardcoreApple(opts: { boss: boolean; applesOwned: number; roll?: () => number }): boolean {
  const roll = opts.roll ?? Math.random;
  if (opts.applesOwned >= 3) return false;
  return roll() < (opts.boss ? 0.35 : 0.12);
}

/* ================= records ================= */

export interface RunSummary {
  completed: boolean;
  worldIdx: number; // furthest world reached
  bosses: number;
  score: number; // already finalized
  answered: number;
  correct: number;
  bestStreak: number;
  playMs: number;
  trophiesEarned: string[];
}

export function updateRecords(records: HardcoreRecords, s: RunSummary): { records: HardcoreRecords; newBests: string[] } {
  const r: HardcoreRecords = {
    ...records,
    trophies: [...new Set([...records.trophies, ...s.trophiesEarned])]
  };
  const newBests: string[] = [];
  const acc = s.answered > 0 ? s.correct / s.answered : 0;
  if (s.worldIdx > r.bestWorldIdx) { r.bestWorldIdx = s.worldIdx; newBests.push(`🌍 Reached ${WORLDS[Math.min(s.worldIdx, WORLDS.length - 1)].tag}!`); }
  if (s.bosses > r.mostBosses) { r.mostBosses = s.bosses; newBests.push(`👑 ${s.bosses} bosses in one run!`); }
  if (s.score > r.bestScore) { r.bestScore = s.score; newBests.push(`🏆 New best score: ${s.score.toLocaleString()}!`); }
  if (s.answered >= 10 && acc > r.bestAccuracy) { r.bestAccuracy = acc; r.bestAccuracyN = s.answered; newBests.push(`🎯 New best accuracy: ${Math.round(acc * 100)}%!`); }
  if (s.bestStreak > r.longestStreak) { r.longestStreak = s.bestStreak; newBests.push(`🔥 Longest streak: ${s.bestStreak}!`); }
  if (s.completed) {
    r.completions += 1;
    if (r.fastestMs === null || s.playMs < r.fastestMs) {
      r.fastestMs = s.playMs;
      newBests.push("⏱️ Fastest completion!");
    }
  }
  return { records: r, newBests };
}

/** Migrate/validate a stored hardcore block. Never throws, never resets records. */
export function sanitizeHardcore(raw: unknown): import("./types").HardcoreState {
  const base = defaultHardcoreState();
  if (!raw || typeof raw !== "object") return base;
  const o = raw as Record<string, unknown>;
  const rec = (v: unknown) => (v && typeof v === "object" ? (v as Record<string, unknown>) : {});
  const r = rec(o.records);
  const num = (v: unknown, fb: number) => (typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : fb);
  const strArr = (v: unknown) => (Array.isArray(v) ? v.filter(x => typeof x === "string") : []);
  const tp = o.timerPressure;
  // Validate a stored run carefully; a corrupt run is dropped (records always kept).
  let run = null;
  const rr = rec(o.run);
  if (rr && typeof rr.worldIdx === "number" && typeof rr.hearts === "number" && rr.hearts > 0) {
    const wi = Math.max(0, Math.min(WORLDS.length - 1, Math.floor(rr.worldIdx)));
    const d = defaultRun();
    const inv = strArr(rr.inventory).filter(id => itemById(id));
    if (!inv.includes("wooden_sword")) inv.unshift("wooden_sword");
    const eq = rec(rr.equipped);
    const pick = (v: unknown) => (typeof v === "string" && itemById(v) ? v : null);
    const snap = rec(rr.battle);
    run = {
      ...d,
      startedAt: num(rr.startedAt, Date.now()),
      playMs: num(rr.playMs, 0),
      worldIdx: wi,
      step: typeof rr.step === "number" ? Math.max(0, Math.min(3, Math.floor(rr.step))) : 0,
      hearts: Math.max(1, Math.min(HC_MAX_HEARTS, Math.floor(rr.hearts as number))),
      score: num(rr.score, 0),
      answered: num(rr.answered, 0),
      correct: num(rr.correct, 0),
      wrong: num(rr.wrong, 0),
      streak: num(rr.streak, 0),
      bestStreak: num(rr.bestStreak, 0),
      bosses: num(rr.bosses, 0),
      bossesDefeated: strArr(rr.bossesDefeated),
      mobsWon: num(rr.mobsWon, 0),
      inventory: [...new Set(inv)],
      equipped: {
        weapon: pick(eq.weapon) ?? "wooden_sword",
        armor: pick(eq.armor),
        pet: pick(eq.pet),
        hat: pick(eq.hat)
      },
      apples: Math.max(0, Math.min(5, num(rr.apples, 0))),
      totem: rr.totem === true,
      trophiesEarned: strArr(rr.trophiesEarned),
      worldsCompleted: strArr(rr.worldsCompleted),
      worldAnswered: num(rr.worldAnswered, 0),
      worldCorrect: num(rr.worldCorrect, 0),
      worldWrong: num(rr.worldWrong, 0),
      bossDamageTaken: num(rr.bossDamageTaken, 0),
      battle: (snap && typeof snap.worldIdx === "number" && typeof snap.hearts === "number" && (snap.hearts as number) > 0)
        ? {
            worldIdx: Math.max(0, Math.min(WORLDS.length - 1, Math.floor(snap.worldIdx as number))),
            step: typeof snap.step === "number" ? Math.max(0, Math.min(3, Math.floor(snap.step as number))) : 0,
            mobHp: Math.max(1, num(snap.mobHp, 10)),
            mobMax: Math.max(1, num(snap.mobMax, 10)),
            hearts: Math.max(1, Math.min(HC_MAX_HEARTS, Math.floor(snap.hearts as number))),
            qNum: Math.max(1, num(snap.qNum, 1)),
            qTotal: Math.max(1, num(snap.qTotal, 3))
          }
        : null
    };
  }
  return {
    run,
    records: {
      attempts: num(r.attempts, 0),
      completions: num(r.completions, 0),
      bestWorldIdx: typeof r.bestWorldIdx === "number" ? Math.max(-1, Math.min(WORLDS.length - 1, Math.floor(r.bestWorldIdx))) : -1,
      mostBosses: num(r.mostBosses, 0),
      bestScore: num(r.bestScore, 0),
      bestAccuracy: Math.max(0, Math.min(1, typeof r.bestAccuracy === "number" ? r.bestAccuracy : 0)),
      bestAccuracyN: num(r.bestAccuracyN, 0),
      longestStreak: num(r.longestStreak, 0),
      fastestMs: typeof r.fastestMs === "number" && r.fastestMs >= 0 ? r.fastestMs : null,
      trophies: [...new Set(strArr(r.trophies))]
    },
    timerPressure: tp === "off" || tp === "intense" ? tp : "normal"
  };
}
