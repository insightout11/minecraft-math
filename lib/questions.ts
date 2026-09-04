import { AnswerMode, Op, Question } from "./types";

// Deterministic-seeded RNG (mulberry32)
export function rng(seed: number) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface CurriculumOpts {
  ops: Op[];             // allowed base ops subset of x ÷ + -
  tables: number[];      // allowed multiplication tables
  minN: number;
  maxN: number;
  allowMissing: boolean;
  allowWord: boolean;
  noDivideBlurb: boolean; // division disabled: explain missing-number without ÷
}

export interface QOpts {
  mode: AnswerMode;
  worldIndex: number; // 0..8 difficulty ramp
  recentKeys?: string[];
  weights?: Record<string, number>; // mastery: lower score => higher weight key `table:n`
  seed?: number;
  cur?: CurriculumOpts;
}

function pick<T>(r: () => number, arr: T[]): T {
  return arr[Math.floor(r() * arr.length)];
}

function makeChoices(r: () => number, answer: number, n: number): number[] {
  const set = new Set<number>([answer]);
  let guard = 0;
  while (set.size < n && guard++ < 200) {
    const delta = Math.floor(r() * 5) + 1;
    const sign = r() < 0.5 ? -1 : 1;
    let c = answer + sign * delta;
    if (answer > 20 && r() < 0.4) c = answer + sign * 10;
    if (c < 0) c = answer + delta;
    if (c === answer) continue;
    set.add(c);
  }
  const arr = Array.from(set);
  // shuffle
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function questionKey(q: { op: Op; table?: number; text: string }): string {
  if (q.table !== undefined) return `t${q.table}:${q.op}`;
  return `${q.op}:${q.text}`;
}

export function generateQuestion(opts: QOpts): Question {
  const r = rng(opts.seed ?? ((Math.random() * 1e9) | 0));
  const w = opts.worldIndex;
  const cur = opts.cur;
  const lo0 = cur ? cur.minN : 1;
  const hi0 = cur ? cur.maxN : 12;
  const lo = Math.max(0, Math.min(lo0, hi0));
  const hi = Math.max(lo + 1, hi0);
  const ri = (a: number, b: number) => a + Math.floor(r() * (b - a + 1));
  const tables = cur && cur.tables.length ? [...cur.tables].sort((x, y) => x - y) : undefined;
  const pickTable = () => tables ? tables[Math.floor(r() * tables.length)] : 1 + Math.floor(r() * Math.min(12, 2 + w + 2));

  // Decide op by world difficulty + curriculum + adaptive weights
  let opPool: Op[] = ["x"];
  if (cur) {
    opPool = [];
    if (cur.ops.includes("+")) opPool.push("+");
    if (cur.ops.includes("-")) opPool.push("-");
    if (cur.ops.includes("x")) opPool.push("x", "x");
    if (cur.ops.includes("÷")) opPool.push("÷");
    if (cur.allowMissing && cur.ops.includes("x")) opPool.push("missing");
    if (cur.allowWord) opPool.push("word");
    if (w >= 6 && cur.ops.includes("x")) opPool.push("mixed2");
    if (!opPool.length) opPool = ["x", "+"];
  } else {
    if (w <= 0) opPool = ["x", "x", "+", "-"];
    else if (w <= 1) opPool = ["x", "x", "÷", "+", "-"];
    else if (w <= 3) opPool = ["x", "÷", "+", "-", "missing"];
    else if (w <= 5) opPool = ["x", "÷", "missing", "word", "+"];
    else opPool = ["x", "÷", "missing", "word", "mixed2", "+", "-"];
  }

  let op: Op = pick(r, opPool);

  // Adaptive: if weights suggest weak tables, bias to x with that table
  if (opts.weights && (!cur || true)) {
    const entries = Object.entries(opts.weights).sort((a, b) => a[1] - b[1]);
    if (entries.length && r() < 0.45 && entries[0][1] < 0.75) {
      const m = entries[0][0].match(/t(\d+)/);
      const weakTable = m ? parseInt(m[1], 10) : 0;
      const allowed = !tables || tables.includes(weakTable);
      if (m && allowed && (!cur || cur.ops.includes("x"))) {
        op = "x";
        return multQuestion(r, weakTable, opts.mode);
      }
    }
  }

  const table = pickTable();

  switch (op) {
    case "x": return multQuestion(r, table, opts.mode);
    case "÷": {
      const b = Math.max(2, ri(2, Math.min(10, hi)));
      const ans = Math.max(1, ri(Math.max(1, lo), Math.max(lo + 1, Math.min(10, hi))));
      const a = b * ans;
      return finalize(`${a} ÷ ${b} = ?`, `${a} ÷ ${b} = ?`, ans, "÷", opts.mode, r, `Think: ${b} × ? = ${a}`, table);
    }
    case "+": {
      const a = cur ? ri(lo, hi) : Math.floor(r() * (10 + w * 10));
      const b = cur ? ri(lo, hi) : Math.floor(r() * (10 + w * 10));
      const qq = finalize(`${a} + ${b} = ?`, `${a} + ${b} = ?`, a + b, "+", opts.mode, r, `${a} plus ${b}`, undefined);
      qq.line = { from: Math.max(0, a - 2), to: a + b + 2, start: a, end: a + b };
      return qq;
    }
    case "-": {
      const a = cur ? ri(lo, hi) : Math.floor(r() * (10 + w * 10)) + 5;
      const b = cur ? ri(lo, Math.max(lo, a)) : Math.floor(r() * a);
      const qq = finalize(`${a} − ${b} = ?`, `${a} − ${b} = ?`, a - b, "-", opts.mode, r, `Count back from ${a}`, undefined);
      qq.line = { from: Math.max(0, a - b - 3), to: a + 2, start: a, end: a - b };
      return qq;
    }
    case "missing": {
      const b = tables ? tables[Math.floor(r() * tables.length)] : 2 + Math.floor(r() * 9);
      const ans = cur ? ri(Math.max(1, lo), Math.max(2, Math.min(9, hi))) : 2 + Math.floor(r() * 9);
      const expl = cur?.noDivideBlurb
        ? `Count up by ${b}s to ${b * ans}: how many ${b}s?`
        : `${b} × ? = ${b * ans}. Think ${b * ans} ÷ ${b}`;
      return finalize(`? × ${b} = ${b * ans}`, `? × ${b} = ${b * ans}`, ans, "missing", opts.mode, r, expl, b);
    }
    case "word": {
      // word kinds need: 0->x, 1->÷, 2->+. Filter by curriculum.
      const kinds: number[] = [];
      if (!cur || cur.ops.includes("x")) kinds.push(0);
      if (!cur || cur.ops.includes("÷")) kinds.push(1);
      if (!cur || cur.ops.includes("+")) kinds.push(2);
      const kind = kinds.length ? kinds[Math.floor(r() * kinds.length)] : 0;
      const ta = () => (tables ? tables[Math.floor(r() * tables.length)] : 2 + Math.floor(r() * 8));
      const ra = () => (cur ? ri(lo, hi) : 2 + Math.floor(r() * 8));
      if (kind === 1) {
        const a = ta(), b = Math.max(1, ra());
        return finalize(`A mob has ${a * b} HP. Jackson hits for ${a}. How many hits?`, `${a * b} ÷ ${a} = ?`, b, "word", opts.mode, r, `Split ${a * b} into ${a}s`, a);
      }
      if (kind === 2) {
        const a = ra(), b = Math.max(1, ra());
        return finalize(`Jackson has ${a} coins and finds ${b * 2} more. Total?`, `${a} + ${b * 2} = ?`, a + b * 2, "word", opts.mode, r, `Add them together`, undefined);
      }
      const a = ta(), b = Math.max(1, ra());
      return finalize(`Jackson finds ${a} chests with ${b} gems each. How many gems?`, `${a} × ${b} = ?`, a * b, "word", opts.mode, r, `${a} groups of ${b}`, a);
    }
    case "mixed2": {
      const a = tables ? tables[Math.floor(r() * tables.length)] : 2 + Math.floor(r() * 8);
      const b = cur ? ri(Math.max(1, lo), Math.max(2, hi)) : 2 + Math.floor(r() * 8);
      const c = cur ? ri(lo, hi) : 1 + Math.floor(r() * 9);
      return finalize(`${a} × ${b} + ${c} = ?`, `${a} × ${b} + ${c} = ?`, a * b + c, "mixed2", opts.mode, r, `First ${a}×${b}=${a * b}, then +${c}`, a);
    }
  }
}

function multQuestion(r: () => number, table: number, mode: AnswerMode): Question {
  const other = 1 + Math.floor(r() * 12);
  const a = table, b = other;
  const ans = a * b;
  const small = ans <= 30;
  return finalize(`${a} × ${b} = ?`, `${a} × ${b} = ?`, ans, "x", mode, r, `${a} groups of ${b}`, a, small ? { groups: a, per: b } : undefined);
}

function finalize(text: string, display: string, answer: number, op: Op, mode: AnswerMode, r: () => number, explanation: string, table?: number, visual?: { groups: number; per: number }): Question {
  const n = mode === "choice3" ? 3 : 4;
  const wantChoices = mode === "choice3" || mode === "choice4" || mode === "mixed";
  return {
    text, display, answer, op, table, hint: explanation, explanation,
    visual,
    choices: wantChoices ? makeChoices(r, answer, mode === "choice3" ? 3 : 4) : undefined
  };
}

export function xpForLevel(level: number): number {
  return 100 + (level - 1) * 75;
}

export type ModePrefs = { choice: boolean; keypad: boolean; typed: boolean };

export function answerModeFor(worldIndex: number, battleNum: number, prefs?: ModePrefs): AnswerMode {
  const p = prefs ?? { choice: true, keypad: true, typed: true };
  const entry = (worldIndex <= 3 || battleNum % 2 === 0) ? "choice4" : "keypad";
  if (!p.choice) {
    if (p.keypad && (worldIndex <= 4 || !p.typed)) return "keypad";
    if (p.typed) return "typed";
    return "keypad";
  }
  if (worldIndex <= 0) return battleNum === 0 ? "choice3" : "choice4";
  if (worldIndex === 1) return "choice4";
  if (worldIndex <= 3) {
    if (battleNum % 2 === 0) return "choice4";
    return p.keypad ? "keypad" : "choice4";
  }
  if (worldIndex <= 5) {
    if (battleNum % 2 === 0) return p.keypad ? "keypad" : "choice4";
    return p.typed ? "typed" : p.keypad ? "keypad" : "choice4";
  }
  if (entry === "choice4") return "mixed";
  return p.keypad || p.typed ? "mixed" : "choice4";
}

/** Resolve a "mixed" battle into one concrete child-friendly mode per question. */
export function resolveMixed(prefs?: ModePrefs, roll?: () => number): AnswerMode {
  const r = roll ?? Math.random;
  const p = prefs ?? { choice: true, keypad: true, typed: true };
  const pool: AnswerMode[] = [];
  if (p.choice) pool.push("choice4");
  if (p.keypad) pool.push("keypad");
  if (p.typed) pool.push("typed");
  if (!pool.length) pool.push("choice4");
  return pool[Math.floor(r() * pool.length)];
}
