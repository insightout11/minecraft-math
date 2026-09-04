import { defaultCurriculum, SaveData } from "./types";
import { ITEMS, WORLDS, MOBS } from "./game-data";

const KEY = "minecraft-math-save-v1";
export const SAVE_VERSION = 3;
const IDB_DB = "minecraft-math";
const IDB_STORE = "kv";
const IDB_KEY = "save";

export function defaultSave(): SaveData {
  const now = Date.now();
  return {
    version: SAVE_VERSION,
    name: "Jackson",
    level: 1,
    xp: 0,
    coins: 0,
    gems: 0,
    diamonds: 0,
    streak: 0,
    bestStreak: 0,
    stars: 0,
    unlockedWorlds: ["green"],
    worldStars: {},
    inventory: ["wooden_sword"],
    equipped: { weapon: "wooden_sword", armor: null, pet: null, hat: null },
    mobDefeats: {},
    mobsUnlocked: ["chicken"],
    achievements: [],
    mastery: {},
    history: [],
    sessions: [],
    quests: [
      { id: "q_mult10", progress: 0, done: false },
      { id: "q_win3", progress: 0, done: false },
      { id: "q_combo5", progress: 0, done: false },
      { id: "q_beat_boss", progress: 0, done: false }
    ],
    settings: { sound: true, music: true },
    tutorialDone: false,
    createdAt: now,
    curriculum: defaultCurriculum(),
    consumables: { apples: 0, totem: false },
    celebrated: [],
    updatedAt: now
  };
}

const KNOWN_ITEMS = new Set(ITEMS.map(i => i.id));
const KNOWN_WORLDS = new Set(WORLDS.map(w => w.id));
const KNOWN_MOBS = new Set(MOBS.map(m => m.id));

/** Migrate ANY older save forward. Never deletes progress. */
export function migrate(raw: unknown): SaveData {
  const base = defaultSave();
  if (!raw || typeof raw !== "object") return base;
  const o = raw as Record<string, unknown>;
  const num = (v: unknown, fb: number) => (typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : fb);
  const strArr = (v: unknown) => (Array.isArray(v) ? v.filter(x => typeof x === "string") : []);
  const rec = (v: unknown) => (v && typeof v === "object" ? (v as Record<string, unknown>) : {});
  const inv = strArr(o.inventory).filter(id => KNOWN_ITEMS.has(id));
  if (!inv.includes("wooden_sword")) inv.unshift("wooden_sword");
  const eq = rec(o.equipped);
  const pickSlot = (v: unknown) => (typeof v === "string" && KNOWN_ITEMS.has(v) ? v : null);
  const quests = Array.isArray(o.quests) && (o.quests as unknown[]).length
    ? (o.quests as { id: string; progress: number; done: boolean }[]).map(q => ({
        id: String(q.id), progress: num(q.progress, 0), done: q.done === true
      }))
    : base.quests;
  const cur = rec(o.curriculum);
  const curOps = rec(cur.ops);
  const cons = rec(o.consumables);
  return {
    ...base,
    ...(typeof o.name === "string" ? { name: o.name.slice(0, 24) } : {}),
    level: Math.max(1, Math.min(99, num(o.level, 1))),
    xp: num(o.xp, 0),
    coins: num(o.coins, 0),
    gems: num(o.gems, 0),
    diamonds: num(o.diamonds, 0),
    streak: num(o.streak, 0),
    bestStreak: num(o.bestStreak, 0),
    stars: num(o.stars, 0),
    unlockedWorlds: [...new Set(["green", ...strArr(o.unlockedWorlds).filter(id => KNOWN_WORLDS.has(id))])],
    worldStars: Object.fromEntries(Object.entries(rec(o.worldStars)).filter(([k, v]) => KNOWN_WORLDS.has(k) && typeof v === "number")) as Record<string, number>,
    inventory: [...new Set(inv)],
    equipped: {
      weapon: pickSlot(eq.weapon) ?? "wooden_sword",
      armor: pickSlot(eq.armor),
      pet: pickSlot(eq.pet),
      hat: pickSlot(eq.hat)
    },
    mobDefeats: Object.fromEntries(Object.entries(rec(o.mobDefeats)).filter(([k, v]) => KNOWN_MOBS.has(k) && typeof v === "number")) as Record<string, number>,
    mobsUnlocked: [...new Set(["chicken", ...strArr(o.mobsUnlocked).filter(id => KNOWN_MOBS.has(id))])],
    achievements: strArr(o.achievements),
    mastery: rec(o.mastery) as SaveData["mastery"],
    history: Array.isArray(o.history) ? (o.history as SaveData["history"]).slice(-200) : [],
    sessions: Array.isArray(o.sessions) ? (o.sessions as SaveData["sessions"]).slice(-20) : [],
    quests,
    settings: { sound: rec(o.settings).sound !== false, music: rec(o.settings).music !== false },
    tutorialDone: o.tutorialDone === true,
    createdAt: num(o.createdAt, base.createdAt),
    curriculum: {
      ops: {
        add: curOps.add !== false,
        sub: curOps.sub !== false,
        mul: curOps.mul !== false,
        div: curOps.div === true
      },
      tables: Array.isArray(cur.tables) && (cur.tables as unknown[]).length
        ? [...new Set((cur.tables as unknown[]).filter(t => typeof t === "number" && t >= 1 && t <= 12))] as number[]
        : base.curriculum.tables,
      minN: Math.max(0, Math.min(20, num(cur.minN, 1))),
      maxN: Math.max(2, Math.min(50, num(cur.maxN, 12))),
      modes: {
        choice: rec(cur.modes).choice !== false,
        keypad: rec(cur.modes).keypad !== false,
        typed: rec(cur.modes).typed !== false
      },
      missing: cur.missing !== false,
      words: cur.words !== false,
      adaptive: cur.adaptive !== false
    },
    consumables: {
      apples: Math.max(0, Math.min(9, num(cons.apples, 0))),
      totem: cons.totem === true
    },
    celebrated: strArr(o.celebrated),
    updatedAt: num(o.updatedAt, 0),
    version: SAVE_VERSION
  };
}

/* ---------- localStorage (instant boot + fallback) ---------- */
function readLS(): SaveData | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    return migrate(JSON.parse(raw));
  } catch {
    return null;
  }
}

/** Synchronous boot read. Always safe, never throws. */
export function loadSave(): SaveData {
  return readLS() ?? defaultSave();
}

/* ---------- IndexedDB (durable primary) ---------- */
function idb(): Promise<IDBDatabase | null> {
  return new Promise(resolve => {
    try {
      if (typeof indexedDB === "undefined") return resolve(null);
      const req = indexedDB.open(IDB_DB, 1);
      req.onupgradeneeded = () => {
        try { req.result.createObjectStore(IDB_STORE); } catch { /* exists */ }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function readIDB(): Promise<SaveData | null> {
  try {
    const db = await idb();
    if (!db) return null;
    const val: SaveData | null = await new Promise(resolve => {
      try {
        const tx = db.transaction(IDB_STORE, "readonly");
        const rq = tx.objectStore(IDB_STORE).get(IDB_KEY);
        rq.onsuccess = () => resolve(rq.result ? migrate(rq.result) : null);
        rq.onerror = () => resolve(null);
      } catch {
        resolve(null);
      }
    });
    try { db.close(); } catch { /* noop */ }
    return val;
  } catch {
    return null;
  }
}

async function writeIDB(save: SaveData): Promise<void> {
  try {
    const db = await idb();
    if (!db) return;
    await new Promise<void>(resolve => {
      try {
        const tx = db.transaction(IDB_STORE, "readwrite");
        tx.objectStore(IDB_STORE).put(save, IDB_KEY);
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
    try { db.close(); } catch { /* noop */ }
  } catch { /* ignore */ }
}

/**
 * Full load: IndexedDB wins if it has newer data, else localStorage.
 * Old saves migrate forward — progress is never wiped.
 */
export async function loadSaveAsync(): Promise<SaveData> {
  const [fromIDB, fromLS] = await Promise.all([readIDB(), Promise.resolve(readLS())]);
  if (fromIDB && fromLS) return fromIDB.updatedAt >= fromLS.updatedAt ? fromIDB : fromLS;
  return fromIDB ?? fromLS ?? defaultSave();
}

export function persist(save: SaveData) {
  const stamped = { ...save, updatedAt: Date.now(), version: SAVE_VERSION };
  try {
    localStorage.setItem(KEY, JSON.stringify(stamped));
  } catch { /* ignore */ }
  void writeIDB(stamped);
  void requestPersistence();
}

export function requestPersistence(): void {
  try {
    const nav = navigator as Navigator & { storage?: { persist?: () => Promise<boolean> } };
    if (nav.storage?.persist) void nav.storage.persist().catch(() => undefined);
  } catch { /* ignore */ }
}

export function resetSave(): SaveData {
  const d = defaultSave();
  persist(d);
  return d;
}

/* ---------- backup: export / import ---------- */
export function exportSave(save: SaveData): string {
  return JSON.stringify({ ...save, version: SAVE_VERSION, updatedAt: Date.now() }, null, 2);
}

export function validateImport(text: string): { ok: true; save: SaveData } | { ok: false; error: string } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, error: "That file is not valid JSON." };
  }
  if (!parsed || typeof parsed !== "object") return { ok: false, error: "That file is not a Minecraft Math save." };
  const o = parsed as Record<string, unknown>;
  if (typeof o.level !== "number" || typeof o.xp !== "number" || !Array.isArray(o.inventory) || typeof o.equipped !== "object") {
    return { ok: false, error: "That file is missing save data. Current progress was kept." };
  }
  if (typeof o.version === "number" && o.version > SAVE_VERSION) {
    return { ok: false, error: "That save is from a newer game version. Current progress was kept." };
  }
  try {
    return { ok: true, save: migrate(parsed) };
  } catch {
    return { ok: false, error: "Could not read that save. Current progress was kept." };
  }
}
