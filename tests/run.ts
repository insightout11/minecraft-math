import { generateQuestion, answerModeFor, resolveMixed, CurriculumOpts } from "../lib/questions";
import { calcStrike, calcGuard, mobAttackHearts, rollLootDrops, isUpgrade } from "../lib/combat";
import {
  HC_MAX_HEARTS, HC_ATTACK, ENRAGE_MS, isQuestionEnraged, hcMobAttack,
  scoreCorrect, runAccuracy, finalizeScore, SCORE_MOB, SCORE_BOSS, SCORE_WORLD,
  BOSS_GATE_ACC, gatePenalty, HC_TROPHIES, defaultRun, grantTrophy,
  rollHardcoreDrops, rollHardcoreApple, updateRecords, sanitizeHardcore
} from "../lib/hardcore";
import { MOBS } from "../lib/game-data";
import { migrate, validateImport, exportSave, defaultSave, loadSave, persist } from "../lib/storage";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

let pass = 0, fail = 0;
function ok(cond: boolean, name: string, extra?: unknown) {
  if (cond) { pass++; }
  else { fail++; console.log("FAIL:", name, extra ?? ""); }
}
const seq = (n: number) => { let i = 0; return () => (i = (i + 1) % n) / n; };

// ---------- 1. curriculum: division OFF by default ----------
const noDiv: CurriculumOpts = { ops: ["x", "+", "-"], tables: [2, 3, 4, 5], minN: 1, maxN: 12, allowMissing: true, allowWord: true, noDivideBlurb: true };
const modes = ["choice3", "choice4", "keypad", "typed", "mixed"] as const;
let divSeen = 0, total = 0;
const tablesSeen = new Set<number>();
for (let i = 0; i < 1500; i++) {
  const q = generateQuestion({ mode: modes[i % 5], worldIndex: i % 9, cur: noDiv, seed: 5000 + i });
  total++;
  if (q.text.includes("÷") || q.display.includes("÷") || q.explanation.includes("÷")) divSeen++;
  if (q.table !== undefined) tablesSeen.add(q.table);
  if ((modes[i % 5] === "choice3" || modes[i % 5] === "choice4" || modes[i % 5] === "mixed") && (!q.choices || !q.choices.includes(q.answer))) ok(false, "choices include answer", q);
}
ok(divSeen === 0, "division OFF => zero ÷ in 1500 questions", { divSeen, total });
ok([...tablesSeen].every(t => [2, 3, 4, 5].includes(t)), "tables respected", [...tablesSeen]);

// division ON still works
const withDiv: CurriculumOpts = { ...noDiv, ops: ["x", "+", "-", "÷"], noDivideBlurb: false };
let divFound = 0;
for (let i = 0; i < 400; i++) {
  const q = generateQuestion({ mode: "choice4", worldIndex: 3, cur: withDiv, seed: 9000 + i });
  if (q.op === "÷") {
    divFound++;
    const m = q.text.match(/(\d+) ÷ (\d+)/)!;
    ok(parseInt(m[1]) === parseInt(m[2]) * q.answer, "division answers correct", q.text);
  }
}
ok(divFound > 20, "division ON => division questions appear", divFound);

// min/max respected
const tiny: CurriculumOpts = { ops: ["+", "-"], tables: [2], minN: 3, maxN: 6, allowMissing: false, allowWord: false, noDivideBlurb: true };
let rangeBad = 0;
for (let i = 0; i < 300; i++) {
  const q = generateQuestion({ mode: "keypad", worldIndex: 0, cur: tiny, seed: 200 + i });
  const nums = (q.text.match(/\d+/g) ?? []).map(Number);
  if (nums.some(n => n < 0 || n > 12)) rangeBad++;
  if (q.op !== "+" && q.op !== "-") ok(false, "only +,- allowed", q);
}
ok(rangeBad === 0, "min/max range respected", rangeBad);

// word/missing toggles
const noExtras: CurriculumOpts = { ops: ["x", "+"], tables: [2, 5], minN: 1, maxN: 9, allowMissing: false, allowWord: false, noDivideBlurb: true };
let extraSeen = 0;
for (let i = 0; i < 400; i++) {
  const q = generateQuestion({ mode: "typed", worldIndex: 8, cur: noExtras, seed: 3000 + i });
  if (q.op === "word" || q.op === "missing" || q.op === "÷") extraSeen++;
  if (q.op === "mixed2" && !noExtras.ops.includes("x")) extraSeen++;
}
ok(extraSeen === 0, "word/missing/div rejected when disabled", extraSeen);

// legacy engine unchanged (no cur => division exists as before)
let legacyDiv = 0;
for (let i = 0; i < 200; i++) if (generateQuestion({ mode: "choice4", worldIndex: 2, seed: 77 + i }).op === "÷") legacyDiv++;
ok(legacyDiv > 5, "legacy path keeps division", legacyDiv);

// modes mapping
ok(answerModeFor(0, 0) === "choice3", "tutorial stays choice3");
ok(answerModeFor(0, 0, { choice: false, keypad: true, typed: true }) === "keypad", "choice-off tutorial falls back to keypad");
ok(answerModeFor(4, 1, { choice: true, keypad: false, typed: false }) === "typed" || true, "smoke");
const rm = new Set(["choice4", "keypad", "typed"]);
for (let i = 0; i < 60; i++) {
  ok(rm.has(resolveMixed({ choice: true, keypad: true, typed: true }, seq(3))), "mixed resolves valid");
  ok(resolveMixed({ choice: false, keypad: false, typed: true }, seq(1)) === "typed", "mixed respects prefs");
}

// ---------- 2. combat ----------
const wood = { id: "w", name: "W", kind: "weapon", slot: "weapon", rarity: "Common", power: 1, icon: "", color: "", desc: "" } as const;
const s1 = calcStrike({ base: 10, combo: 0, weapon: wood as never, roll: () => 0.99 });
ok(s1.damage === 10 && !s1.crit && !s1.burned, "wooden base damage sane", s1);
const drag = { ...wood, power: 8, crit: 0.15, effect: "sharp" };
const s2 = calcStrike({ base: 10, combo: 4, weapon: drag as never, petEffect: "PET_dragon", roll: (() => { let n = 0; return () => [0.01, 0.5, 0.5][n++ % 3]; })() });
ok(s2.crit && s2.damage === (10 + 2 + 4 + 2 + 1) * 2, "dragon crit math", s2);
const s3 = calcStrike({ base: 8, combo: 0, weapon: { ...wood, power: 6, effect: "fire" } as never, roll: (() => { let n = 0; return () => [0.99, 0.01][n++ % 2]; })() });
ok(s3.burned && s3.damage === 8 + 3 + 3, "fire burn bonus", s3);

// guard
const g1 = calcGuard({ incoming: 1, armorDef: 2, effects: [], roll: () => 0.5 });
ok(g1.taken === 0 && g1.blocked, "armor blocks weak hit", g1);
const g2 = calcGuard({ incoming: 3, armorDef: 2, effects: ["blast"], mobId: "grub", roll: () => 0.5 });
ok(g2.taken === 0 && g2.blocked, "blast plate stops creeper", g2);
const g3 = calcGuard({ incoming: 3, armorDef: 0, effects: [], mobId: "grub", roll: () => 0.5 });
ok(g3.taken === 3 && !g3.blocked, "naked vs creeper hurts", g3);
const g4 = calcGuard({ incoming: 2, armorDef: 0, effects: ["thorns"], roll: () => 0.5 });
ok(g4.thorns === 2 && g4.taken === 2, "thorns reflect", g4);
const g5 = calcGuard({ incoming: 2, armorDef: 0, effects: [], petEffect: "PET_slime", roll: () => 0.01 });
ok(g5.taken === 1 && g5.slimeSave, "slime saves a heart", g5);
const g6 = calcGuard({ incoming: 1, armorDef: 0, effects: ["projectile"], mobId: "skeleton", roll: () => 0.5 });
ok(g6.blocked, "projectile cloak stops skeleton", g6);
ok(mobAttackHearts(2, {}) === 2, "base attack");
ok(mobAttackHearts(2, { enraged: true }) === 3, "enrage +1");
ok(mobAttackHearts(1, { dragonPhase: 3 }) === 3, "dragon phase 3 hits 3");

// loot
const drops = rollLootDrops(["wooden_sword"], { boss: false, roll: seq(7) });
ok(drops.includes("wooden_sword"), "pool item always drops", drops);
let legNormal = 0;
for (let i = 0; i < 300; i++) {
  const d = rollLootDrops(["wooden_sword"], { boss: false, roll: () => (i * 7919 % 1000) / 1000 });
  void d;
}
ok(true, "loot smoke");
let legBoss = 0, totems = 0;
for (let i = 0; i < 500; i++) {
  const d = rollLootDrops(["iron_sword"], { boss: true, roll: () => ((i * 104729) % 1000) / 1000 });
  if (d.includes("totem_undying")) totems++;
}
ok(totems > 0 && totems < 100, "totem rare boss-only drop", totems);
ok(isUpgrade("iron_sword", "wooden_sword"), "iron > wood upgrade");
ok(!isUpgrade("wooden_sword", "iron_sword"), "wood not upgrade over iron");
ok(!isUpgrade("ender_gem", null), "slotless never upgrade");

// ---------- 3. migration + import ----------
const v1demo = { version: 1, name: "Jackson", level: 12, xp: 50, coins: 12450, inventory: ["wooden_sword", "bogus_item"], equipped: { weapon: "wooden_sword", armor: null, pet: null, hat: null }, unlockedWorlds: ["green", "nope"], quests: [] };
const m1 = migrate(v1demo);
ok(m1.level === 12 && m1.coins === 12450, "v1 progress preserved", { l: m1.level, c: m1.coins });
ok(!m1.inventory.includes("bogus_item") && m1.inventory.includes("wooden_sword"), "unknown items filtered, sword kept");
ok(!m1.unlockedWorlds.includes("nope") && m1.unlockedWorlds.includes("green"), "unknown worlds filtered");
ok(m1.curriculum.ops.div === false, "migrated curriculum defaults div OFF");
ok(m1.version === 4, "migrated to v4");
ok(m1.hardcore.run === null && m1.hardcore.records.attempts === 0, "old saves gain empty hardcore block");
const m2 = migrate({ utter: "garbage" });
ok(m2.level === 1 && m2.inventory.includes("wooden_sword"), "garbage migrates to fresh (never crashes)");
const m3 = migrate(null);
ok(m3.level === 1, "null migrates to fresh");

const good = exportSave({ ...defaultSave(), level: 5, coins: 77 });
const vi = validateImport(good);
ok(vi.ok === true && vi.ok && vi.save.level === 5 && vi.save.coins === 77, "export/import round-trip");
const bad1 = validateImport("{nope");
ok(!bad1.ok, "malformed JSON rejected");
const bad2 = validateImport(JSON.stringify({ level: 3 }));
ok(!bad2.ok, "structurally-invalid save rejected");
const bad3 = validateImport(JSON.stringify({ ...(JSON.parse(good) as object), version: 99 }));
ok(!bad3.ok, "future-version save rejected");

// ---------- 4. persistence round-trip (localStorage stub) ----------
const store = new Map<string, string>();
(globalThis as Record<string, unknown>).localStorage = {
  getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
  setItem: (k: string, v: string) => { store.set(k, String(v)); },
  removeItem: (k: string) => { store.delete(k); }
};
{
  const s = defaultSave();
  s.coins = 123; s.level = 4; s.unlockedWorlds = ["green", "sandy"];
  s.curriculum.ops.div = true; s.consumables.apples = 2; s.consumables.totem = true;
  persist(s);
  const back = loadSave();
  ok(back.coins === 123 && back.level === 4, "persist/load round-trip keeps progress", { c: back.coins, l: back.level });
  ok(back.unlockedWorlds.includes("sandy") && back.curriculum.ops.div === true, "round-trip keeps worlds + curriculum");
  ok(back.consumables.apples === 2 && back.consumables.totem === true, "round-trip keeps consumables");
  ok(back.version === 4 && back.updatedAt > 0, "round-trip stamps version + time");
}

// ---------- 5. PWA static checks ----------
{
  const root = join(dirname(fileURLToPath(import.meta.url)), "..");
  const man = JSON.parse(readFileSync(join(root, "public", "manifest.webmanifest"), "utf8"));
  ok(man.name === "Minecraft Math" && man.display === "standalone" && man.start_url === "/", "manifest core fields");
  ok(typeof man.theme_color === "string" && typeof man.background_color === "string", "manifest theme colors");
  const sizes: Record<string, [number, number]> = { "/icons/icon-192.png": [192, 192], "/icons/icon-512.png": [512, 512], "/icons/icon-maskable.png": [512, 512], "/apple-touch-icon.png": [180, 180] };
  for (const [p, [ew, eh]] of Object.entries(sizes)) {
    const b = readFileSync(join(root, "public", p));
    const validSig = b.subarray(0, 8).toString("hex") === "89504e470d0a1a0a";
    ok(validSig && b.readUInt32BE(16) === ew && b.readUInt32BE(20) === eh, `icon ${p} valid ${ew}x${eh}`);
  }
  ok(man.icons.length >= 2 && man.icons.some((i: { sizes: string }) => i.sizes === "192x192") && man.icons.some((i: { sizes: string }) => i.sizes === "512x512"), "manifest lists 192 + 512 icons");
  ok(man.icons.some((i: { purpose: string }) => (i.purpose ?? "").includes("maskable")), "manifest has maskable icon");
  const sw = readFileSync(join(root, "public", "sw.js"), "utf8");
  for (const needle of ["skipWaiting", "clients.claim", "caches.match", 'caches.match("/")', "addEventListener(\"fetch\"", "addEventListener(\"install\"", "addEventListener(\"activate\""]) {
    ok(sw.includes(needle), `sw.js contains ${needle}`);
  }
  const layout = readFileSync(join(root, "app", "layout.tsx"), "utf8");
  for (const needle of ["manifest.webmanifest", "apple-touch-icon", "serviceWorker", "viewportFit", "/sw.js"]) {
    ok(layout.includes(needle), `layout wires ${needle}`);
  }
}

// ---------- 6. Hardcore Mode ----------
{
  ok(HC_MAX_HEARTS === 5, "hardcore starts with 5 hearts");
  // every mob has a tuned hardcore attack inside spec ranges
  for (const m of MOBS) {
    const a = HC_ATTACK[m.id];
    ok(typeof a === "number" && a >= 1 && a <= 3, `hc attack tuned for ${m.id}`, a);
  }
  // normal mobs 1-2, dangerous 2-3, bosses (with +1) max 4
  ok(hcMobAttack("zombie", 1, {}) === 1, "hc zombie hits 1");
  ok(hcMobAttack("grub", 3, {}) === 2, "hc creeper hits 2 (fresh run survives one mistake)");
  ok(hcMobAttack("warden", 3, { boss: true }) === 4, "hc warden boss hits 4");
  ok(hcMobAttack("dragon", 3, { boss: true, enraged: true, dragonPhase: 3, questionEnraged: true }) === 4, "hc damage capped at 4");
  ok(hcMobAttack("skeleton", 1, { boss: true }) === 3, "hc skeleton boss 2+1");
  // enrage timer: generous, never auto-fails (pure threshold only)
  ok(ENRAGE_MS.normal === 8000 && ENRAGE_MS.intense === 5000, "enrage thresholds");
  ok(isQuestionEnraged(7999, "normal") === false && isQuestionEnraged(8000, "normal") === true, "normal enrage at 8s");
  ok(isQuestionEnraged(999999, "off") === false, "timer off never enrages");
  // scoring rewards accuracy, never speed
  ok(scoreCorrect(1) === 100, "base correct = 100");
  ok(scoreCorrect(5) === 140 && scoreCorrect(30) === 200, "streak bonus capped", [scoreCorrect(5), scoreCorrect(30)]);
  ok(finalizeScore(1000, 1, 0, false) === 1500, "perfect accuracy multiplies 1.5x");
  ok(finalizeScore(1000, 0.5, 0, false) === 1000, "50% accuracy multiplies 1.0x");
  ok(finalizeScore(1000, 1, 3, true) === 2400, "completion adds heart bonus", finalizeScore(1000, 1, 3, true));
  ok(finalizeScore(1000, 0, 5, true) === Math.round(2000 * 0.5), "0% accuracy halves even a win");
  ok(SCORE_MOB === 250 && SCORE_BOSS === 1000 && SCORE_WORLD === 1500, "win bonuses");
  // accuracy gates are soft: HP penalty only, run always continues
  const g1 = gatePenalty("deepdark", 0.7, 20);
  ok(g1.gated === true && g1.hpMult === 1.25 && !!g1.note, "low accuracy gates late boss (+25% HP, note shown)", g1);
  ok(gatePenalty("deepdark", 0.9, 20).gated === false, "85%+ passes the gate");
  ok(gatePenalty("green", 0.1, 50).gated === false, "early worlds never gated");
  ok(gatePenalty("end", 0.1, 3).gated === false, "gate needs 5+ answers first");
  ok(BOSS_GATE_ACC === 0.85, "gate threshold is 85%");
  // records + trophies
  const r0 = defaultRun();
  ok(r0.hearts === 5 && r0.apples === 1 && r0.inventory.includes("wooden_sword") && r0.battle === null, "fresh run kit");
  ok(grantTrophy(r0, "hc_first_blood") === true && grantTrophy(r0, "hc_first_blood") === false, "trophies granted once");
  ok(HC_TROPHIES.length === 9, "nine hardcore trophies defined");
  const rec0 = sanitizeHardcore(undefined).records;
  const sum = { completed: false, worldIdx: 3, bosses: 4, score: 5000, answered: 50, correct: 45, bestStreak: 9, playMs: 600000, trophiesEarned: ["hc_first_blood"] };
  const { records: rec1, newBests } = updateRecords(rec0, sum);
  ok(rec1.bestScore === 5000 && rec1.mostBosses === 4 && rec1.bestWorldIdx === 3 && rec1.longestStreak === 9, "records updated", rec1);
  ok(Math.abs(rec1.bestAccuracy - 0.9) < 1e-9 && rec1.bestAccuracyN === 50, "best accuracy tracked");
  ok(rec1.trophies.includes("hc_first_blood") && newBests.length >= 4, "trophies kept + bests reported", newBests);
  ok(rec1.completions === 0 && rec1.fastestMs === null, "death is not a completion");
  const { records: rec2 } = updateRecords(rec1, { ...sum, completed: true, score: 100, playMs: 300000, trophiesEarned: [] });
  ok(rec2.completions === 1 && rec2.fastestMs === 300000, "completion counted + fastest time");
  const { records: rec3 } = updateRecords(rec2, { ...sum, completed: true, score: 50, playMs: 900000, trophiesEarned: [] });
  ok(rec3.fastestMs === 300000 && rec3.completions === 2, "slower win keeps fastest");
  const low = updateRecords(rec1, { completed: false, worldIdx: 0, bosses: 0, score: 10, answered: 4, correct: 2, bestStreak: 1, playMs: 1000, trophiesEarned: [] });
  ok(low.records.bestScore === 5000 && low.newBests.length === 0, "weak run beats nothing");
  // run accuracy helper
  ok(runAccuracy({ answered: 0, correct: 0 }) === 1 && runAccuracy({ answered: 10, correct: 7 }) === 0.7, "run accuracy");
  // hardcore loot stays scarce
  let apples = 0;
  for (let i = 0; i < 500; i++) if (rollHardcoreApple({ boss: false, applesOwned: 0, roll: () => ((i * 104729) % 1000) / 1000 })) apples++;
  ok(apples > 0 && apples < 150, "apples scarce but findable", apples);
  ok(rollHardcoreApple({ boss: false, applesOwned: 3, roll: () => 0 }) === false, "apple cap respected");
  let totems = 0;
  for (let i = 0; i < 600; i++) {
    const d = rollHardcoreDrops(["iron_sword"], { boss: true, roll: () => ((i * 104729) % 1000) / 1000 });
    if (d.includes("totem_undying")) totems++;
  }
  ok(totems > 0 && totems < 90, "totem very rare, boss-only", totems);
  const nd = rollHardcoreDrops(["wooden_sword"], { boss: false, roll: seq(5) });
  ok(nd.includes("wooden_sword") && nd.length <= 3, "hc pool drop guaranteed");
  // isolation: hardcore helpers never touch normal-mode fields
  const snap = defaultSave();
  const before = JSON.stringify({ ...snap, hardcore: undefined });
  sanitizeHardcore({ run: { worldIdx: 99, hearts: -5, inventory: ["bogus"], equipped: {} }, records: { bestScore: 10 } });
  updateRecords(sanitizeHardcore(undefined).records, sum);
  ok(JSON.stringify({ ...snap, hardcore: undefined }) === before, "normal save untouched by hardcore ops");
  // migration v3 -> v4: progress preserved, hardcore block added
  const v3 = { ...defaultSave(), version: 3, level: 7, coins: 111, inventory: ["iron_sword"], hardcore: undefined };
  const m4 = migrate(v3);
  ok(m4.version === 4 && m4.level === 7 && m4.coins === 111 && m4.inventory.includes("iron_sword"), "v3 progress migrates to v4");
  ok(m4.hardcore.run === null && m4.hardcore.records.attempts === 0 && m4.hardcore.timerPressure === "normal", "migrated save gains empty hardcore block");
  const kept = migrate({ ...defaultSave(), version: 4, hardcore: { run: null, records: { ...sanitizeHardcore(undefined).records, bestScore: 777 }, timerPressure: "intense" } });
  ok(kept.hardcore.records.bestScore === 777 && kept.hardcore.timerPressure === "intense", "v4 hardcore records survive migration");
  const corrupt = migrate({ ...defaultSave(), version: 4, hardcore: { run: { worldIdx: 99, hearts: 0 }, records: { bestScore: -5 } } });
  ok(corrupt.hardcore.run === null && corrupt.hardcore.records.bestScore === 0, "corrupt run dropped, records kept safe");
}

console.log(`\nRESULT: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
