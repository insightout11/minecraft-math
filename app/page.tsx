"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ACH_DEFS, MOBS, QUEST_DEFS, RARITY_COLOR, itemById, mobById, worldById, WORLDS } from "@/lib/game-data";
import { answerModeFor, generateQuestion, questionKey, resolveMixed, xpForLevel } from "@/lib/questions";
import { AnswerMode, Curriculum, Op, Question, SaveData } from "@/lib/types";
import { CurriculumOpts } from "@/lib/questions";
import { defaultSave, loadSave, loadSaveAsync, persist, resetSave, exportSave, validateImport, requestPersistence } from "@/lib/storage";
import { setAudioPrefs, sfx, startMusic, buzz } from "@/lib/audio";
import { calcStrike, calcGuard, mobAttackHearts, rollLootDrops, isUpgrade, armorLabel, JACKSON_MAX_HEARTS } from "@/lib/combat";
import {
  HC_MAX_HEARTS, isQuestionEnraged, hcMobAttack,
  scoreCorrect, runAccuracy, finalizeScore, SCORE_MOB, SCORE_BOSS, SCORE_WORLD,
  gatePenalty, HC_TROPHIES, defaultRun, stepLabel,
  rollHardcoreDrops, rollHardcoreApple, updateRecords
} from "@/lib/hardcore";
import type { HardcoreRun } from "@/lib/types";
import type { RunSummary } from "@/lib/hardcore";
import { BlockButton, HealthBar, JacksonHero, MobSprite, NumberLine } from "@/components/Voxel";

type Screen = "splash" | "home" | "map" | "missions" | "prebattle" | "battle" | "victory" | "chest" | "inventory" | "equipment" | "collection" | "achievements" | "mastery" | "parent" | "hardcore" | "runover" | "settings";

const ANSWER_COLORS = ["#2196f3", "#4caf50", "#ff9800", "#9c27b0"];

function useSave() {
  const [save, setSave] = useState<SaveData>(() => defaultSave());
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    setSave(loadSave());
    setHydrated(true);
    // Upgrade from durable IndexedDB copy if it is newer, then hold the wake lock on storage.
    loadSaveAsync().then(s => setSave(s)).catch(() => undefined);
    requestPersistence();
  }, []);
  useEffect(() => {
    if (hydrated) persist(save);
    setAudioPrefs(save.settings.sound, save.settings.music);
  }, [save, hydrated]);
  return { save, setSave, hydrated };
}

function Hearts({ hp, max = JACKSON_MAX_HEARTS, size = 20 }: { hp: number; max?: number; size?: number }) {
  return (
    <div className="flex flex-wrap items-center gap-0.5" style={{ fontSize: size, lineHeight: 1 }}>
      {Array.from({ length: max }).map((_, i) => (
        <span key={i} className={i < hp ? "" : "opacity-25 grayscale"}>❤️</span>
      ))}
    </div>
  );
}

/* ---------- small UI atoms ---------- */
function CurrencyBar({ save, onPlus }: { save: SaveData; onPlus?: () => void }) {
  const pills = [
    { icon: "🪙", v: save.coins.toLocaleString(), c: "#b8791a" },
    { icon: "💎", v: save.gems.toLocaleString(), c: "#0d7d8c" },
    { icon: "🔷", v: save.diamonds.toLocaleString(), c: "#274b9b" }
  ];
  return (
    <div className="panel-block flex items-center gap-2 bg-[#101828]/95 px-3 py-2">
      {pills.map((p, i) => (
        <div key={i} className="flex items-center gap-1.5 rounded-xl border-2 border-black/50 bg-black/50 px-3 py-1.5 text-lg font-black">
          <span>{p.icon}</span><span>{p.v}</span>
        </div>
      ))}
      <button onClick={onPlus} className="btn-block ml-auto grid h-9 w-9 place-items-center bg-[#4caf50] text-2xl font-black">+</button>
    </div>
  );
}

function ParentToggle({ label, sub, on, onFlip }: { label: string; sub?: string; on: boolean; onFlip: () => void }) {
  return (
    <button onClick={() => { sfx.click(); onFlip(); }} className="flex items-center justify-between gap-2 rounded-xl border-2 border-gray-300 bg-gray-50 px-3 py-2 text-left font-black text-gray-800">
      <span className="text-sm">{label}{sub && <span className="block text-xs font-bold text-gray-500">{sub}</span>}</span>
      <span className={`shrink-0 rounded-full px-3 py-1 text-sm text-white ${on ? "bg-green-600" : "bg-gray-400"}`}>{on ? "ON" : "OFF"}</span>
    </button>
  );
}

function TopTag({ n, label, color }: { n: string; label: string; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="grid h-9 w-9 place-items-center rounded-xl border-[3px] border-black/60 bg-[#ff9800] text-xl font-black" style={{ background: color }}>{n}</div>
      <div className="rounded-lg border-2 border-black/50 bg-black/60 px-2 py-0.5 text-sm font-black tracking-wider">{label}</div>
    </div>
  );
}

function ParticleBurst({ show, color = "#ffeb3b" }: { show: boolean; color?: string }) {
  if (!show) return null;
  return (
    <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center">
      {Array.from({ length: 18 }).map((_, i) => {
        const a = (i / 18) * Math.PI * 2;
        return (
          <motion.div key={i} initial={{ x: 0, y: 0, scale: 1, opacity: 1 }}
            animate={{ x: Math.cos(a) * (90 + (i % 4) * 22), y: Math.sin(a) * (90 + (i % 3) * 20), scale: 0, opacity: 0 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            className="absolute rounded-sm"
            style={{ width: 12, height: 12, background: i % 3 ? color : "#fff", boxShadow: `0 0 10px ${color}` }} />
        );
      })}
    </div>
  );
}

function BlockyScenery({ worldId }: { worldId: string }) {
  // trees / cacti / ice spikes / lava rocks per world — pure CSS blocks
  const w = worldById(worldId);
  const items = useMemo(() => {
    if (w.id === "sandy") return Array.from({ length: 7 }).map((_, i) => ({ x: 4 + i * 14, kind: "cactus" as const }));
    if (w.id === "frost") return Array.from({ length: 7 }).map((_, i) => ({ x: 4 + i * 14, kind: "ice" as const }));
    if (w.id === "volcano" || w.id === "deepdark") return Array.from({ length: 7 }).map((_, i) => ({ x: 4 + i * 14, kind: "rock" as const }));
    if (w.id === "end") return Array.from({ length: 6 }).map((_, i) => ({ x: 6 + i * 16, kind: "pillar" as const }));
    return Array.from({ length: 8 }).map((_, i) => ({ x: 2 + i * 12.5, kind: "tree" as const }));
  }, [w.id]);
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-[26%] flex items-end justify-around opacity-95">
      {items.map((t, i) => (
        <div key={i} style={{ marginLeft: 4 }}>
          {t.kind === "tree" && (
            <div className="flex flex-col items-center">
              <div className="rounded-sm border-2 border-black/50" style={{ width: 34, height: 30, background: "linear-gradient(180deg,#8fe86f,#3d9b3d)" }} />
              <div className="rounded-sm border-2 border-black/50" style={{ width: 46, height: 26, background: "linear-gradient(180deg,#5ac73c,#2e7d32)", marginTop: -6 }} />
              <div style={{ width: 12, height: 26, background: "#5d4037", border: "2px solid rgba(0,0,0,0.5)" }} />
            </div>
          )}
          {t.kind === "cactus" && <div className="rounded-md border-2 border-black/50" style={{ width: 22, height: 64 + (i % 3) * 14, background: "linear-gradient(180deg,#7bcf5f,#2e7d32)" }} />}
          {t.kind === "ice" && <div style={{ width: 30, height: 70 + (i % 3) * 16, background: "linear-gradient(180deg,#fff,#90caf9)", clipPath: "polygon(50% 0, 100% 100%, 0 100%)", border: "2px solid rgba(0,0,0,0.3)" }} />}
          {t.kind === "rock" && <div className="rounded-md border-2 border-black/60" style={{ width: 40, height: 34 + (i % 3) * 12, background: "linear-gradient(180deg,#4e342e,#1a0f0f)", boxShadow: "0 0 14px rgba(255,87,34,0.5)" }} />}
          {t.kind === "pillar" && <div className="rounded-sm border-2 border-black/50" style={{ width: 26, height: 80 + (i % 2) * 30, background: "linear-gradient(180deg,#f5efc0,#b8a86a)" }} />}
        </div>
      ))}
    </div>
  );
}

function ArrayVisual({ groups, per }: { groups: number; per: number }) {
  const g = Math.min(groups, 6), p = Math.min(per, 10);
  return (
    <div className="mx-auto flex flex-col items-center gap-1 rounded-2xl border-[3px] border-black/40 bg-black/30 p-3">
      <div className="text-xs font-black tracking-widest text-white/80">COUNT THE BLOCKS</div>
      <div className="flex gap-1.5">
        {Array.from({ length: g }).map((_, gi) => (
          <div key={gi} className="flex flex-col gap-1 rounded-lg bg-white/10 p-1.5">
            {Array.from({ length: p }).map((_, pi) => (
              <div key={pi} className="rounded-[4px] border border-black/40" style={{ width: 18, height: 18, background: gi % 2 ? "#4caf50" : "#2196f3" }} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ================= MAIN GAME ================= */
export default function Game() {
  const { save, setSave, hydrated } = useSave();
  const [screen, setScreen] = useState<Screen>("splash");
  const [worldId, setWorldId] = useState("green");
  const [missionIdx, setMissionIdx] = useState(0);
  const [isBoss, setIsBoss] = useState(false);
  const [tab, setTab] = useState("inventory");

  // battle state
  const [mobHp, setMobHp] = useState(30);
  const [mobMax, setMobMax] = useState(30);
  const [q, setQ] = useState<Question | null>(null);
  const [mode, setMode] = useState<AnswerMode>("choice4");
  const [qMode, setQMode] = useState<AnswerMode>("choice4");
  const [combo, setCombo] = useState(0);
  const [qNum, setQNum] = useState(1);
  const [qTotal, setQTotal] = useState(4);
  const [phase, setPhase] = useState<"ask" | "correct" | "wrong" | "done">("ask");
  const [typed, setTyped] = useState("");
  const [feedback, setFeedback] = useState("");
  const [dmg, setDmg] = useState<{ id: number; v: number }[]>([]);
  const [burst, setBurst] = useState(0);
  const [mobHurt, setMobHurt] = useState(false);
  const [mobAtk, setMobAtk] = useState(false);
  const [heroAtk, setHeroAtk] = useState(false);
  const [heroMood, setHeroMood] = useState<"happy" | "hurt" | "win">("happy");
  const [qStart, setQStart] = useState(Date.now());
  const [recent, setRecent] = useState<string[]>([]);
  const [earned, setEarned] = useState({ xp: 0, coins: 0, gems: 0 });
  const [chestOpen, setChestOpen] = useState(false);
  const [revealed, setRevealed] = useState(0);
  const [loot, setLoot] = useState<string[]>([]);
  const [showTutorial, setShowTutorial] = useState(false);
  const [parentUnlocked, setParentUnlocked] = useState(false);
  const [parentAns, setParentAns] = useState("");
  const [levelAtStart, setLevelAtStart] = useState(3);
  const [toast, setToast] = useState("");
  const timers = useRef<number[]>([]);
  // Jackson's survivability (hearts persist only for the current battle)
  const [hearts, setHearts] = useState(JACKSON_MAX_HEARTS);
  const heartsRef = useRef(JACKSON_MAX_HEARTS);
  const [heroDmg, setHeroDmg] = useState<{ id: number; v: string }[]>([]);
  const [ko, setKo] = useState(false);
  const [enraged, setEnraged] = useState(false);
  const [importError, setImportError] = useState("");
  const battleSeq = useRef(0);
  const counterRef = useRef<number | null>(null);
  const fileInput = useRef<HTMLInputElement | null>(null);
  // ---- Hardcore Mode (fully isolated run state inside save.hardcore) ----
  const [hc, setHc] = useState(false); // this battle is a hardcore battle
  const [qEnraged, setQEnraged] = useState(false); // question-timer enrage visual
  const [abandonAsk, setAbandonAsk] = useState(false);
  const [hcNext, setHcNext] = useState<{ wId: string; step: number; boss: boolean } | null>(null);
  const [runSummary, setRunSummary] = useState<(RunSummary & { trophies: string[] }) | null>(null);
  const [lastNewBests, setLastNewBests] = useState<string[]>([]);
  const [runCompleted, setRunCompleted] = useState(false);
  const [hcGained, setHcGained] = useState(0);
  const qStartRef = useRef(0);

  const world = worldById(worldId);
  const worldIndex = WORLDS.findIndex(w => w.id === worldId);
  const mob = useMemo(() => {
    if (isBoss) return mobById(world.boss);
    return mobById(world.mobs[missionIdx % world.mobs.length]);
  }, [world, missionIdx, isBoss]);

  const needXp = xpForLevel(save.level);
  const xpPct = Math.min(100, (save.xp / needXp) * 100);
  const activeQuest = save.quests.find(x => !x.done) ?? save.quests[0];
  const questDef = QUEST_DEFS.find(d => d.id === activeQuest?.id);
  const petIcon = save.equipped.pet ? itemById(save.equipped.pet)?.icon ?? null : null;
  const hatIcon = save.equipped.hat ? itemById(save.equipped.hat)?.icon ?? null : null;

  const masteryWeights = useMemo(() => {
    const w: Record<string, number> = {};
    Object.entries(save.mastery).forEach(([k, v]) => { w[k] = v.score; });
    return w;
  }, [save.mastery]);

  // Parent curriculum → engine options. Division stays OFF unless a parent enables it.
  const curOpts = useMemo<CurriculumOpts>(() => {
    const c = save.curriculum;
    const ops: Op[] = [];
    if (c.ops.add) ops.push("+");
    if (c.ops.sub) ops.push("-");
    if (c.ops.mul) ops.push("x");
    if (c.ops.div) ops.push("÷");
    return {
      ops: ops.length ? ops : ["x", "+"],
      tables: c.tables.length ? c.tables : [2, 3, 4, 5],
      minN: c.minN,
      maxN: c.maxN,
      allowMissing: c.missing,
      allowWord: c.words,
      noDivideBlurb: !c.ops.div
    };
  }, [save.curriculum]);
  const adaptiveWeights = save.curriculum.adaptive ? masteryWeights : {};
  const equippedWeapon = itemById(save.equipped.weapon);
  const equippedArmor = itemById(save.equipped.armor);
  const equippedHat = itemById(save.equipped.hat);
  const equippedPet = itemById(save.equipped.pet);
  const armorDef = (equippedArmor?.defense ?? 0) + (equippedHat?.defense ?? 0);
  const gearEffects = [equippedArmor?.effect, equippedHat?.effect];

  const setHeartsBoth = (v: number, max: number = JACKSON_MAX_HEARTS) => {
    const cl = Math.max(0, Math.min(max, v));
    heartsRef.current = cl;
    setHearts(cl);
  };

  /* ---------- Hardcore Mode: isolated run state, shared battle engine ---------- */
  const hcRun: HardcoreRun | null = hc ? save.hardcore.run : null;

  const patchRun = (fn: (r: HardcoreRun) => void) => {
    setSave(s => {
      if (!s.hardcore.run) return s;
      const copy: HardcoreRun = { ...s.hardcore.run, equipped: { ...s.hardcore.run.equipped } };
      fn(copy);
      return { ...s, hardcore: { ...s.hardcore, run: copy } };
    });
  };

  // Battle gear: run gear in hardcore, normal gear otherwise.
  const bWeaponId = hcRun ? hcRun.equipped.weapon : save.equipped.weapon;
  const bArmor = hcRun ? itemById(hcRun.equipped.armor) : equippedArmor;
  const bHat = hcRun ? itemById(hcRun.equipped.hat) : equippedHat;
  const bPetFx = hcRun ? (itemById(hcRun.equipped.pet)?.effect ?? null) : (equippedPet?.effect ?? null);
  const bPetIcon = hcRun ? (itemById(hcRun.equipped.pet)?.icon ?? null) : petIcon;
  const bHatIcon = hcRun ? (itemById(hcRun.equipped.hat)?.icon ?? null) : hatIcon;
  const bArmorGlint = hcRun ? !!hcRun.equipped.armor : !!save.equipped.armor;
  const bArmorDef = (bArmor?.defense ?? 0) + (bHat?.defense ?? 0);
  const bGearFx = [bArmor?.effect, bHat?.effect];
  const bApples = hcRun ? hcRun.apples : save.consumables.apples;
  const bTotem = hcRun ? hcRun.totem : save.consumables.totem;
  const bHeartsMax = hc ? HC_MAX_HEARTS : JACKSON_MAX_HEARTS;

  useEffect(() => {
    const t = window.setTimeout(() => setScreen("home"), 2000);
    return () => window.clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!save.settings.music) return;
    if (screen === "victory" || screen === "chest" || (screen === "runover" && runCompleted)) startMusic("victory");
    else if ((screen === "battle" || screen === "prebattle") && isBoss) startMusic("boss");
    else startMusic("adventure");
  }, [save.settings.music, screen, isBoss, runCompleted]);

  // Hardcore question enrage timer: generous window, visual only, never auto-fails.
  useEffect(() => {
    if (screen !== "battle" || !hc || !q || phase !== "ask") return;
    if (save.hardcore.timerPressure === "off") { setQEnraged(false); return; }
    const iv = window.setInterval(() => {
      setQEnraged(isQuestionEnraged(Date.now() - qStartRef.current, save.hardcore.timerPressure));
    }, 500);
    return () => window.clearInterval(iv);
  });

  const toastMsg = (m: string) => { setToast(m); window.setTimeout(() => setToast(""), 2200); };

  const setCur = (patch: Partial<Curriculum>) => {
    setSave(s => ({ ...s, curriculum: { ...s.curriculum, ...patch } }));
  };

  const doExport = () => {
    try {
      const blob = new Blob([exportSave(save)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "minecraft-math-jackson-save.json";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 2000);
      toastMsg("💾 Save exported!");
      sfx.coin();
    } catch {
      toastMsg("Export failed on this device.");
    }
  };

  const doImportFile = async (f: File | undefined) => {
    if (!f) return;
    try {
      const text = await f.text();
      const res = validateImport(text);
      if (!res.ok) {
        setImportError(res.error);
        toastMsg("⛔ Bad save file — progress kept!");
        sfx.wrong();
        return;
      }
      setImportError("");
      setSave(res.save);
      toastMsg("📥 Save imported! Welcome back, Jackson!");
      sfx.levelup();
    } catch {
      setImportError("Could not read that file. Progress kept.");
    }
  };

  const nextQuestion = useCallback((m: AnswerMode, wi: number, rec: string[]) => {
    const eff: AnswerMode = m === "mixed" ? resolveMixed(save.curriculum.modes) : m;
    setQMode(eff);
    let nq: Question | null = null;
    for (let i = 0; i < 8; i++) {
      const cand = generateQuestion({ mode: eff, worldIndex: wi, weights: adaptiveWeights, cur: curOpts, seed: (Math.random() * 1e9) | 0 });
      if (!rec.includes(questionKey({ op: cand.op, table: cand.table, text: cand.text }))) { nq = cand; break; }
      nq = cand;
    }
    if (nq) {
      setQ(nq);
      setRecent(r => [...r.slice(-6), questionKey({ op: nq!.op, table: nq!.table, text: nq!.text })]);
      setQStart(Date.now());
      qStartRef.current = Date.now();
      setQEnraged(false);
      setTyped("");
    }
  }, [adaptiveWeights, curOpts, save.curriculum.modes]);

  const startBattle = (wId: string, mIdx: number, boss: boolean, hcMode = false) => {
    const w = worldById(wId);
    const wi = WORLDS.findIndex(x => x.id === wId);
    const m = boss ? mobById(w.boss) : mobById(w.mobs[mIdx % w.mobs.length]);
    const md = answerModeFor(wi, mIdx, save.curriculum.modes);
    const total = boss ? 8 : 3 + Math.min(2, wi);
    battleSeq.current += 1;
    setHc(hcMode);
    setQEnraged(false);
    setAbandonAsk(false);
    // Hardcore accuracy gate: late bosses smell fear and gain health (run continues regardless).
    let hpMult = 1;
    let gateNote: string | null = null;
    const hcHearts = hcMode && save.hardcore.run ? save.hardcore.run.hearts : JACKSON_MAX_HEARTS;
    if (hcMode && boss && save.hardcore.run) {
      const g = gatePenalty(wId, runAccuracy(save.hardcore.run), save.hardcore.run.answered);
      hpMult = g.hpMult;
      gateNote = g.note;
    }
    const maxHp = Math.max(1, Math.round(m.hp * hpMult));
    setLevelAtStart(save.level);
    setWorldId(wId); setMissionIdx(mIdx); setIsBoss(boss);
    setMode(md); setMobMax(maxHp); setMobHp(maxHp);
    setQNum(1); setQTotal(total); setCombo(0); setPhase("ask");
    setHcGained(0);
    setHeartsBoth(hcMode ? hcHearts : JACKSON_MAX_HEARTS, hcMode ? HC_MAX_HEARTS : JACKSON_MAX_HEARTS);
    setHeroDmg([]); setKo(false); setEnraged(false);
    setEarned({ xp: 0, coins: 0, gems: 0 }); setDmg([]); setHeroMood("happy");
    if (hcMode) {
      // Checkpoint immediately so an interrupted run resumes safely (never a death).
      patchRun(r => {
        r.worldIdx = wi;
        r.step = boss ? 3 : mIdx;
        r.hearts = Math.max(1, Math.min(HC_MAX_HEARTS, hcHearts));
        r.bossDamageTaken = 0;
        r.battle = { worldIdx: wi, step: boss ? 3 : mIdx, mobHp: maxHp, mobMax: maxHp, hearts: Math.max(1, Math.min(HC_MAX_HEARTS, hcHearts)), qNum: 1, qTotal: total };
      });
    }
    setScreen("prebattle");
    if (boss) sfx.boss(); else sfx.click();
    const seq = battleSeq.current;
    window.setTimeout(() => {
      if (battleSeq.current !== seq) return;
      setScreen("battle");
      if (gateNote) toastMsg(gateNote);
      // Scripted first question so Jackson's very first battle feels perfect: 2 × 5 = ?
      if (!save.tutorialDone && wId === "green" && mIdx === 0 && !hcMode) {
        const first: Question = {
          text: "2 × 5 = ?", display: "2 × 5 = ?", answer: 10, op: "x", table: 2,
          choices: save.curriculum.modes.choice ? [7, 10, 12] : undefined, hint: "2 groups of 5",
          explanation: "2 groups of 5 = 10!", visual: { groups: 2, per: 5 }
        };
        setQMode(save.curriculum.modes.choice ? "choice3" : "keypad");
        setQ(first); setQStart(Date.now()); qStartRef.current = Date.now(); setQEnraged(false); setTyped("");
      } else {
        nextQuestion(md, wi, []);
      }
      if (!save.tutorialDone && wId === "green" && mIdx === 0 && !hcMode) setShowTutorial(true);
    }, 1400);
  };

  const applyCorrect = (ms: number) => {
    if (!q || phase !== "ask" || ko) return;
    const seq = battleSeq.current;
    const baseDmg = Math.ceil(mobMax / qTotal);
    const strike = calcStrike({
      base: baseDmg,
      combo,
      weapon: hc ? itemById(bWeaponId) : equippedWeapon,
      petEffect: hc ? bPetFx : (equippedPet?.effect ?? null),
      roll: Math.random
    });
    const dealt = strike.damage;
    const id = Date.now() + Math.random();
    setDmg(d => [...d, { id, v: dealt }]);
    window.setTimeout(() => setDmg(d => d.filter(x => x.id !== id)), 1100);
    setBurst(b => b + 1); setMobHurt(true); setHeroAtk(true);
    if (strike.crit) { sfx.crit(); buzz(80); } else { sfx.swing(); buzz(30); }
    window.setTimeout(() => sfx.hit(), 180); window.setTimeout(() => sfx.correct(), 320);
    window.setTimeout(() => { setMobHurt(false); setHeroAtk(false); }, 500);

    const speedBonus = ms < 4000 ? 4 : ms < 8000 ? 2 : 0;
    const xpGain = mob.xp + speedBonus + (combo >= 4 ? 5 : 0);
    const coinGain = Math.ceil(mob.coins / qTotal);
    const newCombo = combo + 1;
    setCombo(newCombo);
    setEarned(e => ({ xp: e.xp + xpGain, coins: e.coins + coinGain, gems: e.gems }));
    const newHp = Math.max(0, mobHp - dealt);
    setMobHp(newHp);
    if (isBoss && newHp <= mobMax / 2 && !enraged) {
      setEnraged(true);
      toastMsg(`😡 The ${mob.name} is ENRAGED!`);
    }
    setPhase("correct");
    setFeedback(strike.crit ? "CRITICAL HIT!" : strike.burned ? "🔥 BURN!" : newCombo >= 3 ? `COMBO x${newCombo}!` : "CORRECT!");

    // mastery + history update (defer heavy save merge to timeout)
    const key = q.table !== undefined && (q.op === "x" || q.op === "missing") ? `t${q.table}:${q.op}` : `${q.op}:${q.text.slice(0, 12)}`;
    const prev = save.mastery[key] ?? { asked: 0, correct: 0, totalMs: 0, score: 0.5 };
    const asked = prev.asked + 1, correct = prev.correct + 1;
    const totalMs = prev.totalMs + ms;
    const avg = totalMs / asked;
    const score = Math.max(0.05, Math.min(1, (correct / asked) * (avg < 5000 ? 1 : avg < 10000 ? 0.85 : 0.65)));
    const tId = window.setTimeout(() => {
      if (battleSeq.current !== seq) return;
      if (hc) {
        // Hardcore: score + run progress only. Normal XP/mastery/quests untouched.
        const pts = scoreCorrect(newCombo);
        setHcGained(pts);
        patchRun(r => {
          r.playMs += ms;
          r.answered += 1; r.correct += 1; r.worldAnswered += 1; r.worldCorrect += 1;
          r.streak = newCombo; r.bestStreak = Math.max(r.bestStreak, newCombo);
          r.score += pts;
          r.battle = { worldIdx: worldIndex, step: isBoss ? 3 : missionIdx, mobHp: newHp, mobMax, hearts: heartsRef.current, qNum, qTotal };
        });
        return;
      }
      setSave(s => {
        const mastery = { ...s.mastery, [key]: { asked, correct, totalMs, score } };
        // Mastery celebration: first time a table hits 3 stars, Jackson gets gems!
        let celebrated = s.celebrated;
        let gemBonus = 0;
        if (q.table !== undefined) {
          const entries = Object.entries(mastery).filter(([k]) => k === `t${q.table}:x` || k === `t${q.table}:missing`);
          const avg = entries.length ? entries.reduce((a, [, v]) => a + v.score, 0) / entries.length : 0;
          const tag = `table-${q.table}`;
          if (avg >= 0.85 && !s.celebrated.includes(tag)) {
            celebrated = [...s.celebrated, tag];
            gemBonus = 5;
            window.setTimeout(() => { toastMsg(`⭐ ${q.table}× TABLE MASTERED! +5💎`); sfx.rare(); buzz([60, 40, 60]); }, 1400);
          }
        }
        return {
          ...s,
          mastery,
          celebrated,
          gems: s.gems + gemBonus,
          history: [...s.history.slice(-200), { q: q.text, ok: true, ms, at: Date.now() }],
        quests: s.quests.map(x => {
          if (x.done) return x;
          if (x.id === "q_mult10" && (q.op === "x" || q.op === "missing" || q.op === "mixed2")) return { ...x, progress: x.progress + 1, done: x.progress + 1 >= 10 };
          if (x.id === "q_combo5" && newCombo >= 5) return { ...x, progress: 1, done: true };
          return x;
        }),
        bestStreak: Math.max(s.bestStreak, newCombo),
        streak: newCombo
        };
      });
    }, 10);
    timers.current.push(tId);

    const done = newHp <= 0 || qNum >= qTotal && newHp <= dealt + 4;
    const t2 = window.setTimeout(() => {
      if (battleSeq.current !== seq) return;
      if (newHp <= 0 || qNum >= qTotal) {
        // ensure kill on final question for kid-friendly pacing
        setMobHp(0);
        winBattle(xpGain, coinGain, newCombo);
      } else {
        setQNum(n => n + 1);
        setPhase("ask");
        nextQuestion(mode, worldIndex, recent);
      }
    }, 1250);
    timers.current.push(t2);
  };

  const applyWrong = () => {
    if (!q || phase !== "ask" || ko) return;
    const msW = Date.now() - qStart;
    sfx.wrong(); buzz(50);
    setMobAtk(true); setHeroMood("hurt");
    window.setTimeout(() => { setMobAtk(false); setHeroMood("happy"); }, 600);
    setCombo(0);
    setPhase("wrong");
    setFeedback("Good try! Look...");
    if (hc) {
      // Hardcore: run accuracy only. Normal mastery/history untouched.
      patchRun(r => {
        r.playMs += msW;
        r.answered += 1; r.wrong += 1; r.worldAnswered += 1; r.worldWrong += 1;
        r.streak = 0;
      });
    } else {
    const key = q.table !== undefined ? `t${q.table}:${q.op}` : `${q.op}:${q.text.slice(0, 12)}`;
    const prev = save.mastery[key] ?? { asked: 0, correct: 0, totalMs: 0, score: 0.5 };
    setSave(s => ({
      ...s,
      mastery: { ...s.mastery, [key]: { asked: prev.asked + 1, correct: prev.correct, totalMs: prev.totalMs + 9000, score: Math.max(0.05, (prev.correct / (prev.asked + 1)) * 0.7) } },
      history: [...s.history.slice(-200), { q: q.text, ok: false, ms: 9000, at: Date.now() }],
      streak: 0
    }));
    }
    // The mob seizes its chance! (still kind: Jackson keeps everything he earned)
    // Single-slot: a new mistake replaces any not-yet-landed counterattack.
    const seq = battleSeq.current;
    if (counterRef.current) window.clearTimeout(counterRef.current);
    counterRef.current = window.setTimeout(() => {
      counterRef.current = null;
      if (battleSeq.current !== seq) return;
      mobCounterAttack();
    }, 1000);
  };

  const showHeroFloat = (v: string) => {
    const id = Date.now() + Math.random();
    setHeroDmg(d => [...d, { id, v }]);
    window.setTimeout(() => setHeroDmg(d => d.filter(x => x.id !== id)), 1300);
  };

  const dragonPhaseNow = (): number | undefined => {
    if (!isBoss || mob.id !== "dragon") return undefined;
    return qNum >= 6 ? 3 : qNum >= 3 ? 2 : 1;
  };

  const mobCounterAttack = () => {
    if (ko) return;
    const rage = isBoss && mobHp <= mobMax / 2;
    const raw = hc
      ? hcMobAttack(mob.id, mob.attack, { boss: isBoss, enraged: rage, dragonPhase: dragonPhaseNow(), questionEnraged: qEnraged })
      : mobAttackHearts(mob.attack, { enraged: rage, dragonPhase: dragonPhaseNow() });
    const guard = calcGuard({
      incoming: raw,
      armorDef: hc ? bArmorDef : armorDef,
      effects: hc ? bGearFx : gearEffects,
      mobId: mob.id,
      petEffect: hc ? bPetFx : (equippedPet?.effect ?? null),
      roll: Math.random
    });
    setMobAtk(true);
    window.setTimeout(() => setMobAtk(false), 550);
    if (mob.style === "boom") { sfx.boom(); buzz([80, 40, 120]); }
    else if (mob.style === "arrow") { sfx.arrow(); buzz(50); }
    else if (mob.style === "splash") { sfx.splash(); buzz(50); }
    else { sfx.hurt(); buzz(60); }
    setHeroMood("hurt");
    window.setTimeout(() => setHeroMood("happy"), 700);

    if (guard.blocked) {
      showHeroFloat("🛡 BLOCKED!");
      sfx.block();
      toastMsg(`🛡 ${bArmor ? bArmor.name : "Jackson"} blocked it!`);
    } else if (guard.taken > 0) {
      showHeroFloat(`-${guard.taken}❤️`);
      if (guard.slimeSave) window.setTimeout(() => { showHeroFloat("🟢 Slime saved 1❤️!"); }, 500);
      if (hc && isBoss) patchRun(r => { r.bossDamageTaken += guard.taken; });
    }

    // Thorns bites back!
    if (guard.thorns > 0) {
      const id = Date.now() + Math.random();
      setDmg(d => [...d, { id, v: guard.thorns }]);
      window.setTimeout(() => setDmg(d => d.filter(x => x.id !== id)), 1100);
      const after = Math.max(0, mobHp - guard.thorns);
      setMobHp(after);
      window.setTimeout(() => showHeroFloat("🌵 Thorns!"), 400);
      if (after <= 0) {
        window.setTimeout(() => winBattle(0, 0, combo), 700);
        setHeartsBoth(heartsRef.current - guard.taken, bHeartsMax);
        if (hc) patchRun(r => {
          r.hearts = Math.max(0, Math.min(HC_MAX_HEARTS, heartsRef.current));
          if (r.battle) { r.battle.hearts = r.hearts; r.battle.mobHp = after; }
        });
        return;
      }
    }

    const remaining = heartsRef.current - guard.taken;

    // Axolotl patch-up
    if (guard.taken > 0 && bPetFx === "PET_axolotl" && Math.random() < 0.3 && remaining > 0) {
      window.setTimeout(() => {
        setHeartsBoth(Math.min(bHeartsMax, heartsRef.current + 1), bHeartsMax);
        showHeroFloat("🦎 +1❤️");
        sfx.munch();
      }, 900);
    }

    if (remaining <= 0) {
      if (hc) {
        // Hardcore Totem: dramatic clutch save, restores a little, run continues.
        if (hcRun?.totem) {
          patchRun(r => {
            r.totem = false;
            r.hearts = 2;
            if (r.battle) r.battle.hearts = 2;
          });
          setHeartsBoth(2, HC_MAX_HEARTS);
          showHeroFloat("🗿 SAVED!");
          toastMsg("🗿 The Totem of Undying saves Jackson! Only 2 hearts — be careful!");
          sfx.totem(); buzz([100, 60, 100, 60, 150]);
          return;
        }
        hcDeath();
        return;
      }
      // Totem of Undying saves the day (once)!
      if (save.consumables.totem) {
        setSave(s => ({ ...s, consumables: { ...s.consumables, totem: false } }));
        setHeartsBoth(5);
        showHeroFloat("🗿 SAVED!");
        toastMsg("🗿 The Totem of Undying saves Jackson!");
        sfx.totem(); buzz([100, 60, 100, 60, 150]);
        return;
      }
      // Playful defeat: knocked back to camp, keeps everything earned so far.
      setHeartsBoth(0);
      setSave(s => ({ ...s, coins: s.coins + earned.coins, gems: s.gems + earned.gems, xp: s.xp + earned.xp }));
      setKo(true);
      sfx.defeat(); buzz([120, 80, 120]);
      return;
    }
    setHeartsBoth(remaining, bHeartsMax);
    if (hc) patchRun(r => {
      r.hearts = Math.max(0, Math.min(HC_MAX_HEARTS, remaining));
      if (r.battle) r.battle.hearts = r.hearts;
    });
    if (hc && remaining >= 1 && remaining <= 2) {
      window.setTimeout(() => {
        toastMsg(remaining === 1 ? "❤️ LAST HEART! Eat an apple or block with armor!" : "❤️ Only 2 hearts left! Be careful, hero!");
        sfx.hurt();
      }, 650);
    }
  };

  /** Hardcore death: run ends permanently, records + trophies kept, normal game untouched. */
  const hcDeath = () => {
    const run = save.hardcore.run;
    if (!run) { setHc(false); setScreen("home"); return; }
    const acc = runAccuracy(run);
    const final = finalizeScore(run.score, acc, 0, false);
    const summary: RunSummary = {
      completed: false, worldIdx: run.worldIdx, bosses: run.bosses, score: final,
      answered: run.answered, correct: run.correct, bestStreak: run.bestStreak,
      playMs: run.playMs, trophiesEarned: [...run.trophiesEarned]
    };
    const { records, newBests } = updateRecords(save.hardcore.records, summary);
    setSave(s => ({ ...s, hardcore: { ...s.hardcore, records, run: null } }));
    setRunSummary({ ...summary, trophies: [...run.trophiesEarned] });
    setLastNewBests(newBests);
    setRunCompleted(false);
    setHc(false);
    battleSeq.current += 1;
    if (counterRef.current) { window.clearTimeout(counterRef.current); counterRef.current = null; }
    sfx.defeat(); buzz([120, 80, 120]);
    setScreen("runover");
  };

  const eatApple = () => {
    if (ko) return;
    if (hc) {
      const r = save.hardcore.run;
      if (!r || r.apples <= 0 || heartsRef.current >= HC_MAX_HEARTS) return;
      patchRun(rr => { rr.apples = Math.max(0, rr.apples - 1); });
      setHeartsBoth(Math.min(HC_MAX_HEARTS, heartsRef.current + 4), HC_MAX_HEARTS);
      patchRun(rr => { rr.hearts = heartsRef.current; if (rr.battle) rr.battle.hearts = rr.hearts; });
      showHeroFloat("🍎 +4❤️");
      sfx.munch(); buzz(30);
      return;
    }
    if (save.consumables.apples <= 0 || heartsRef.current >= JACKSON_MAX_HEARTS) return;
    setSave(s => ({ ...s, consumables: { ...s.consumables, apples: Math.max(0, s.consumables.apples - 1) } }));
    setHeartsBoth(heartsRef.current + 4);
    showHeroFloat("🍎 +4❤️");
    sfx.munch(); buzz(30);
  };

  const submitTyped = () => {
    if (!q) return;
    const ms = Date.now() - qStart;
    if (parseInt(typed, 10) === q.answer) { applyCorrect(ms); }
    else applyWrong();
  };

  const chooseAnswer = (v: number) => {
    if (!q || phase !== "ask") return;
    const ms = Date.now() - qStart;
    if (v === q.answer) applyCorrect(ms);
    else applyWrong();
  };

  // Keyboard shortcuts: 1–4 answer multiple choice on desktop
  useEffect(() => {
    if (screen !== "battle" || !q || phase !== "ask") return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === "INPUT") return;
      if (qMode === "choice3" || qMode === "choice4") {
        const idx = ["1", "2", "3", "4"].indexOf(e.key);
        const ch = q.choices ?? [];
        if (idx >= 0 && idx < ch.length) chooseAnswer(ch[idx]);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const winBattle = (lastXp: number, lastCoin: number, finalCombo: number) => {
    setPhase("done"); setHeroMood("win");
    battleSeq.current += 1; // invalidate any straggler timers
    if (counterRef.current) { window.clearTimeout(counterRef.current); counterRef.current = null; }
    sfx.defeat(); buzz([60, 40, 100]);
    window.setTimeout(() => sfx.coin(), 500);
    if (hc) { hcWin(); return; }
    const bossWin = isBoss;
    const drops = rollLootDrops(mob.loot, { boss: bossWin, foxLuck: equippedPet?.effect === "PET_fox" });
    const gemBonus = bossWin ? 3 : (Math.random() < 0.25 ? 1 : 0);
    const appleBonus = !save.tutorialDone ? 1 : Math.random() < 0.3 ? 1 : 0;
    if (appleBonus) window.setTimeout(() => toastMsg("🍎 Found a Golden Apple!"), 2000);
    setLoot(drops);
    const totalXp = earned.xp + lastXp;
    const totalCoins = earned.coins + lastCoin;
    const seq = battleSeq.current;
    const t = window.setTimeout(() => {
      if (battleSeq.current !== seq) return;
      setSave(s => {
        let level = s.level, xp = s.xp + totalXp;
        let leveled = false;
        while (xp >= xpForLevel(level)) { xp -= xpForLevel(level); level++; leveled = true; }
        if (leveled) window.setTimeout(() => sfx.levelup(), 600);
        const fresh = drops.filter(id => !s.inventory.includes(id));
        const dupeCoins = (drops.length - fresh.length) * 20;
        if (dupeCoins > 0) window.setTimeout(() => toastMsg(`♻ Duplicates turned into +${dupeCoins} coins!`), 2600);
        const inv = [...s.inventory, ...fresh];
        const defeats = { ...s.mobDefeats, [mob.id]: (s.mobDefeats[mob.id] ?? 0) + 1 };
        const mobsUnlocked = [...new Set([...s.mobsUnlocked, mob.id])];
        const stars = s.stars + (bossWin ? 3 : 1);
        const worldStars = { ...s.worldStars, [worldId]: Math.min(9, (s.worldStars[worldId] ?? 0) + (bossWin ? 3 : 1)) };
        const wi = WORLDS.findIndex(w => w.id === worldId);
        const next = WORLDS[wi + 1];
        const unlockedWorlds = next && (worldStars[worldId] ?? 0) >= 2 ? [...new Set([...s.unlockedWorlds, next.id])] : s.unlockedWorlds;
        const quests = s.quests.map(x => {
          if (x.done) return x;
          if (x.id === "q_win3") return { ...x, progress: x.progress + 1, done: x.progress + 1 >= 3 };
          if (x.id === "q_beat_boss" && bossWin) return { ...x, progress: 1, done: true };
          return x;
        });
        const ach = new Set(s.achievements);
        if (!ach.has("a_first_blood")) ach.add("a_first_blood");
        if ((defeats["zombie"] ?? 0) >= 5) ach.add("a_zombie25");
        if (finalCombo >= 7) ach.add("a_streak10");
        if (s.coins + totalCoins >= 200) ach.add("a_rich");
        if (inv.length >= 8) ach.add("a_collector");
        if (bossWin) ach.add("a_boss");
        if (mob.id === "dragon") ach.add("a_dragon");
        if (s.history.filter(h => h.ok).length + qTotal >= 50) ach.add("a_scholar");
        return {
          ...s, level, xp, coins: s.coins + totalCoins + dupeCoins, gems: s.gems + gemBonus,
          diamonds: s.diamonds + (mob.id === "dragon" ? 5 : bossWin ? 2 : 0),
          consumables: { apples: Math.min(9, s.consumables.apples + appleBonus), totem: s.consumables.totem || drops.includes("totem_undying") },
          inventory: inv, mobDefeats: defeats, mobsUnlocked, stars, worldStars, unlockedWorlds, quests,
          achievements: [...ach].filter(a => ACH_DEFS.some(d => d.id === a)),
          sessions: [...s.sessions.slice(-20), { at: Date.now(), answered: qTotal, correct: qTotal }],
          tutorialDone: true
        };
      });
      setEarned(e => ({ ...e, gems: e.gems + gemBonus }));
      setRevealed(0); setChestOpen(false);
      setScreen("victory");
    }, 1200);
    timers.current.push(t);
  };

  /* ================= HARDCORE run flow (normal progress never touched) ================= */

  const startHcRun = () => {
    const run = defaultRun();
    setSave(s => ({
      ...s,
      hardcore: { ...s.hardcore, records: { ...s.hardcore.records, attempts: s.hardcore.records.attempts + 1 }, run }
    }));
    sfx.boss(); buzz([80, 60, 120]);
    toastMsg("☠ Hardcore run started! 5 hearts — make them count!");
    startBattle(WORLDS[0].id, 0, false, true);
  };

  const abandonHcRun = () => {
    battleSeq.current += 1;
    if (counterRef.current) { window.clearTimeout(counterRef.current); counterRef.current = null; }
    setSave(s => ({ ...s, hardcore: { ...s.hardcore, run: null } }));
    setHc(false); setAbandonAsk(false); setKo(false);
    sfx.click();
    toastMsg("Hardcore run ended. Normal game is safe! 💛");
    setScreen("home");
  };

  const resumeHcRun = () => {
    const run = save.hardcore.run;
    if (!run) { setScreen("home"); return; }
    if (run.battle) {
      const snap = run.battle;
      const w = WORLDS[snap.worldIdx];
      const bossB = snap.step >= 3;
      battleSeq.current += 1;
      setHc(true); setQEnraged(false); setAbandonAsk(false);
      setWorldId(w.id); setMissionIdx(bossB ? 0 : snap.step); setIsBoss(bossB);
      const md = answerModeFor(snap.worldIdx, 0, save.curriculum.modes);
      setMode(md); setMobMax(snap.mobMax); setMobHp(snap.mobHp);
      setQNum(snap.qNum); setQTotal(snap.qTotal); setCombo(0); setPhase("ask");
      setHeartsBoth(snap.hearts, HC_MAX_HEARTS);
      setHeroDmg([]); setKo(false);
      setEnraged(bossB && snap.mobHp <= snap.mobMax / 2);
      setEarned({ xp: 0, coins: 0, gems: 0 }); setDmg([]); setHeroMood("happy");
      setScreen("battle");
      nextQuestion(md, snap.worldIdx, []);
      toastMsg("🔥 Hardcore run resumed — same battle, same hearts!");
    } else {
      const w = WORLDS[run.worldIdx];
      startBattle(w.id, run.step >= 3 ? 0 : run.step, run.step >= 3, true);
    }
  };

  /** Continue a hardcore run after victory/chest using the stored next pointer. */
  const hcNextBattle = () => {
    if (!hcNext) { setScreen("hardcore"); return; }
    sfx.click();
    startBattle(hcNext.wId, hcNext.step >= 3 ? 0 : hcNext.step, hcNext.boss, true);
  };

  const equipHcItem = (id: string) => {
    const it = itemById(id); if (!it) return;
    if (!it.slot) { sfx.coin(); toastMsg(`${it.name} is a run treasure! ⭐`); return; }
    sfx.click();
    setSave(s => {
      const r = s.hardcore.run; if (!r) return s;
      return {
        ...s,
        hardcore: {
          ...s.hardcore,
          run: {
            ...r,
            equipped: {
              ...r.equipped,
              weapon: it.slot === "weapon" ? id : r.equipped.weapon,
              armor: it.slot === "armor" ? id : r.equipped.armor,
              hat: it.slot === "hat" ? id : r.equipped.hat,
              pet: it.slot === "pet" ? id : r.equipped.pet
            }
          }
        }
      };
    });
    toastMsg(`${it.name} equipped for this run!`);
  };

  /** Hardcore victory: run loot + score + trophies + campaign advance. No normal writes. */
  const hcWin = () => {
    const run = save.hardcore.run;
    if (!run) { setHc(false); setScreen("home"); return; }
    const bossWin = isBoss;
    const w = world;
    const drops = rollHardcoreDrops(mob.loot, { boss: bossWin, foxLuck: bPetFx === "PET_fox" });
    const gotApple = rollHardcoreApple({ boss: bossWin, applesOwned: run.apples });
    if (gotApple) window.setTimeout(() => toastMsg("🍎 Found a Golden Apple! Save it for danger!"), 2000);
    setLoot(drops);
    const gained = bossWin ? SCORE_BOSS : SCORE_MOB;
    // trophies earned by this win
    const trophiesNow: string[] = [];
    const give = (id: string) => { if (!run.trophiesEarned.includes(id) && !trophiesNow.includes(id)) trophiesNow.push(id); };
    if (!bossWin && run.bosses === 0 && run.worldsCompleted.length === 0 && run.mobsWon === 0) give("hc_first_blood");
    if (bossWin) {
      if (mob.id === "warden") give("hc_warden_slayer");
      if (mob.id === "dragon") give("hc_dragon_slayer");
      if (run.bossDamageTaken <= 0) give("hc_untouchable");
    }
    // world completion?
    let worldBonus = 0;
    const worldsDone = [...run.worldsCompleted];
    let newWorldIdx = run.worldIdx;
    let worldTrophies: string[] = [];
    if (bossWin) {
      worldBonus = SCORE_WORLD;
      if (!worldsDone.includes(w.id)) worldsDone.push(w.id);
      const wAcc = run.worldAnswered > 0 ? run.worldCorrect / run.worldAnswered : 1;
      if (run.worldWrong === 0 && run.worldAnswered > 0) worldTrophies.push("hc_perfect_world");
      if (run.worldAnswered > 0 && wAcc >= 0.95) worldTrophies.push("hc_sharpshooter");
      if (run.worldIdx + 1 < WORLDS.length) {
        newWorldIdx = run.worldIdx + 1;
        if (newWorldIdx === 2) worldTrophies.push("hc_survivor");
        if (WORLDS[newWorldIdx].id === "deepdark") worldTrophies.push("hc_deep_diver");
      }
      for (const t of worldTrophies) give(t);
    }
    const isCompletion = bossWin && mob.id === "dragon" && run.worldIdx === WORLDS.length - 1;
    // next battle pointer
    let next: { wId: string; step: number; boss: boolean };
    if (isCompletion) {
      next = { wId: w.id, step: 3, boss: true };
    } else if (bossWin) {
      const nw = WORLDS[newWorldIdx];
      next = { wId: nw.id, step: 0, boss: false };
    } else if (missionIdx + 1 > 2) {
      next = { wId: w.id, step: 3, boss: true };
    } else {
      next = { wId: w.id, step: missionIdx + 1, boss: false };
    }
    const seq = battleSeq.current;
    window.setTimeout(() => {
      if (battleSeq.current !== seq) return;
      if (isCompletion) {
        // ---- HARDCORE COMPLETE: archive run into records ----
        const acc = runAccuracy(run);
        const baseScore = run.score + gained + worldBonus;
        const final = finalizeScore(baseScore, acc, run.hearts, true);
        const trophiesAll = [...new Set([...run.trophiesEarned, ...trophiesNow, "hc_champion"])];
        const summary: RunSummary = {
          completed: true, worldIdx: run.worldIdx, bosses: run.bosses + 1, score: final,
          answered: run.answered, correct: run.correct, bestStreak: run.bestStreak,
          playMs: run.playMs, trophiesEarned: trophiesAll
        };
        const { records, newBests } = updateRecords(save.hardcore.records, summary);
        setSave(s => ({ ...s, hardcore: { ...s.hardcore, records, run: null } }));
        setLoot(drops);
        setRunSummary({ ...summary, trophies: trophiesAll });
        setLastNewBests(newBests);
        setRunCompleted(true);
        setHc(false);
        sfx.levelup(); buzz([80, 60, 80, 60, 160]);
        setScreen("runover");
        return;
      }
      setSave(s => {
        const r = s.hardcore.run;
        if (!r) return s;
        const fresh = drops.filter(id => !r.inventory.includes(id));
        return {
          ...s,
          hardcore: {
            ...s.hardcore,
            run: {
              ...r,
              score: r.score + gained + worldBonus,
              mobsWon: r.mobsWon + (bossWin ? 0 : 1),
              bosses: r.bosses + (bossWin ? 1 : 0),
              bossesDefeated: bossWin ? [...r.bossesDefeated, mob.id] : r.bossesDefeated,
              worldsCompleted: worldsDone,
              worldIdx: newWorldIdx,
              step: bossWin ? 0 : next.step,
              worldAnswered: bossWin ? 0 : r.worldAnswered,
              worldCorrect: bossWin ? 0 : r.worldCorrect,
              worldWrong: bossWin ? 0 : r.worldWrong,
              bossDamageTaken: 0,
              inventory: [...r.inventory, ...fresh],
              apples: Math.min(5, r.apples + (gotApple ? 1 : 0)),
              totem: r.totem || drops.includes("totem_undying"),
              trophiesEarned: [...r.trophiesEarned, ...trophiesNow],
              battle: null
            }
          }
        };
      });
      const newT = trophiesNow.map(t => HC_TROPHIES.find(x => x.id === t)).filter(Boolean) as { name: string }[];
      if (newT.length) window.setTimeout(() => { toastMsg(`🏆 ${newT.map(t => t.name).join(", ")}!`); sfx.rare(); }, 900);
      setHcGained(gained + worldBonus);
      setHcNext(next);
      setEarned({ xp: 0, coins: 0, gems: 0 });
      setRevealed(0); setChestOpen(false);
      setScreen("victory");
    }, 1200);
  };

  const openChestFlow = () => { setScreen("chest"); sfx.chest(); };
  const equipItem = (id: string) => {
    const it = itemById(id); if (!it) return;
    if (!it.slot) { sfx.coin(); toastMsg(`${it.name} is a treasure for your collection! ⭐`); return; }
    sfx.click();
    setSave(s => ({
      ...s,
      equipped: {
        ...s.equipped,
        weapon: it.slot === "weapon" ? id : s.equipped.weapon,
        armor: it.slot === "armor" ? id : s.equipped.armor,
        hat: it.slot === "hat" ? id : s.equipped.hat,
        pet: it.slot === "pet" ? id : s.equipped.pet
      }
    }));
    toastMsg(`${it.name} equipped!`);
  };

  /* ---------- next objective for Jackson ---------- */
  const objective = useMemo(() => {
    const lockedIdx = WORLDS.findIndex(w => !save.unlockedWorlds.includes(w.id));
    if (lockedIdx === -1) return "👑 Final quest: defeat the Ender Dragon in Dragon's End!";
    const prev = WORLDS[lockedIdx - 1];
    const need = Math.max(0, 2 - (save.worldStars[prev?.id ?? ""] ?? 0));
    return `➡ Next: earn ${need}⭐ in ${prev?.tag ?? "?"} to unlock ${WORLDS[lockedIdx].tag}!`;
  }, [save.unlockedWorlds, save.worldStars]);

  /* ---------- derived stats for parent ---------- */
  const stats = useMemo(() => {
    const h = save.history.slice(-100);
    const ok = h.filter(x => x.ok).length;
    const acc = h.length ? Math.round((ok / h.length) * 100) : 0;
    const avg = h.length ? Math.round(h.reduce((a, b) => a + b.ms, 0) / h.length / 100) / 10 : 0;
    const byTable = Object.entries(save.mastery).sort((a, b) => b[1].score - a[1].score);
    return { acc, avg, total: save.history.length, strong: byTable.slice(0, 3), weak: byTable.slice(-3).reverse() };
  }, [save]);

  if (!hydrated) return <div className="grid min-h-screen place-items-center bg-[#0b1020] text-2xl font-black">Loading…</div>;

  return (
    <div className="min-h-screen bg-[#0b1020] text-white" style={{ fontFamily: "'Trebuchet MS','Comic Sans MS',system-ui,sans-serif" }}>
      {/* ======= SPLASH ======= */}
      <AnimatePresence>
        {screen === "splash" && (
          <motion.div key="splash" exit={{ opacity: 0, scale: 1.1 }} className="fixed inset-0 z-50 grid place-items-center overflow-hidden" style={{ background: "linear-gradient(180deg,#2b9df4 0%,#7ed957 60%,#2e7d32 100%)" }}>
            <div className="voxel-ground absolute inset-x-0 bottom-0 h-40 opacity-60" style={{ backgroundColor: "#3d9b3d" }} />
            <motion.div initial={{ scale: 0.6, y: 40, opacity: 0 }} animate={{ scale: 1, y: 0, opacity: 1 }} className="text-center">
              <div className="text-6xl font-black text-outline md:text-7xl" style={{ textShadow: "0 6px 0 #3e2723, 0 10px 24px rgba(0,0,0,0.5)" }}>
                <span className="text-white">MINECRAFT</span><br />
                <span className="text-[#ffca28]">MATH</span> <span className="text-[#7CFC00]">GAME</span>
              </div>
              <div className="mx-auto mt-4 h-6 w-64 overflow-hidden rounded-full border-[3px] border-black/60 bg-black/50">
                <motion.div className="h-full rounded-full bg-gradient-to-r from-green-400 to-yellow-300" initial={{ width: "5%" }} animate={{ width: "100%" }} transition={{ duration: 1.6 }} />
              </div>
              <div className="mt-2 font-black tracking-widest text-white/90">LOADING JACKSON'S WORLD…</div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* toast */}
      <AnimatePresence>{toast && <motion.div initial={{ y: -60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -60, opacity: 0 }} className="fixed left-1/2 top-4 z-[80] -translate-x-1/2 rounded-2xl border-[3px] border-black/60 bg-[#ffca28] px-5 py-2 text-lg font-black text-black shadow-block">{toast}</motion.div>}</AnimatePresence>

      {screen !== "splash" && (
        <div className="safe-bottom safe-top mx-auto max-w-7xl px-3 pt-3 md:px-6">
          {/* ======= HOME ======= */}
          {screen === "home" && (
            <motion.div key="home" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="overflow-hidden rounded-3xl border-4 border-black/60 shadow-block" style={{ background: "linear-gradient(180deg,#2b9df4 0%,#7ec8f7 30%,#7ed957 62%,#3d9b3d 100%)" }}>
              <div className="flex items-center justify-between p-3">
                <TopTag n="1" label="HOME SCREEN" color="#ff9800" />
                <div className="flex items-center gap-2">
                  <button onClick={() => { sfx.click(); setScreen("settings"); }} className="btn-block grid h-11 w-11 place-items-center bg-[#78909c] text-2xl">⚙️</button>
                  <div className="panel-block flex items-center gap-2 bg-black/60 px-3 py-1.5">
                    <span className="text-2xl">🧒</span>
                    <div className="leading-tight"><div className="font-black">Jackson</div><div className="text-xs font-bold text-yellow-300">Lv. {save.level}</div></div>
                  </div>
                </div>
              </div>
              <div className="grid gap-3 p-3 md:grid-cols-[280px_1fr_300px]">
                {/* left menu like reference */}
                <div className="flex flex-col items-center">
                  <div className="text-center text-5xl font-black leading-none text-outline">MINECRAFT<br /><span className="text-[#ffca28]">MATH</span> <span className="text-[#7CFC00]">GAME</span></div>
                  <div className="mt-4 flex w-full max-w-[240px] flex-col gap-2.5">
                    <BlockButton big color="#43a047" onClick={() => { sfx.click(); const w = WORLDS.find(x => save.unlockedWorlds.includes(x.id) && (save.worldStars[x.id] ?? 0) < 9) ?? worldById(save.unlockedWorlds[save.unlockedWorlds.length - 1]); setWorldId(w.id); setScreen("map"); }}>▶&nbsp;&nbsp;PLAY</BlockButton>
                    <BlockButton color="#1e88e5" onClick={() => { sfx.click(); setScreen("map"); }}>⚔&nbsp;&nbsp;ADVENTURE</BlockButton>
                    <BlockButton color="#8e24aa" onClick={() => { sfx.click(); setWorldId("green"); setScreen("missions"); }}>📖&nbsp;&nbsp;PRACTICE</BlockButton>
                    <BlockButton color="#ef6c00" onClick={() => { sfx.click(); setScreen("inventory"); }}>🧰&nbsp;&nbsp;REWARDS</BlockButton>
                    <BlockButton color="#7f1d1d" onClick={() => { sfx.click(); setScreen("hardcore"); }}>☠&nbsp;&nbsp;HARDCORE</BlockButton>
                  </div>
                  {save.hardcore.run && (
                    <button onClick={() => { sfx.click(); setScreen("hardcore"); }} className="panel-block mt-2 w-full max-w-[240px] bg-red-950/80 p-2 text-center anim-floaty" style={{ borderColor: "#ef4444" }}>
                      <div className="text-sm font-black text-red-200">🔥 HARDCORE RUN IN PROGRESS</div>
                      <div className="text-xs font-bold text-white/80">{stepLabel(save.hardcore.run.worldIdx, save.hardcore.run.step)} • ❤️{save.hardcore.run.hearts}/{HC_MAX_HEARTS} • 🏆{save.hardcore.run.score.toLocaleString()}</div>
                      <div className="text-xs font-black text-yellow-300">TAP TO CONTINUE ➜</div>
                    </button>
                  )}
                  <div className="mt-3 hidden gap-2 md:flex">
                    {[["🗺️", "Map", "map"], ["🎒", "Items", "inventory"], ["🏆", "Goals", "achievements"], ["👪", "Grown-ups", "parent"]].map(([ic, lb, sc]) => (
                      <button key={lb} onClick={() => { sfx.click(); setScreen(sc as Screen); }} className="panel-block flex flex-col items-center bg-black/55 px-3 py-2 text-xs font-black"><span className="text-2xl">{ic}</span>{lb}</button>
                    ))}
                  </div>
                </div>
                {/* center hero on grass block */}
                <div className="relative flex flex-col items-center justify-end overflow-hidden rounded-3xl border-4 border-black/50 bg-black/20 p-2" style={{ minHeight: 380 }}>
                  <BlockyScenery worldId="green" />
                  {[...Array(6)].map((_, i) => <span key={i} className="absolute text-yellow-200 anim-floaty" style={{ left: `${10 + i * 15}%`, top: `${8 + (i % 3) * 12}%`, animationDelay: `${i * 0.3}s` }}>✦</span>)}
                  <JacksonHero size={210} weaponId={save.equipped.weapon} pet={petIcon} hat={hatIcon} armorGlint={!!save.equipped.armor} />
                  <div className="z-10 -mt-2 mb-1 flex h-16 w-52 items-end justify-center" style={{ background: "linear-gradient(180deg,#6fbf4a 0 22%,#5d4037 22% 100%)", border: "4px solid rgba(0,0,0,0.55)", borderRadius: 12 }}>
                    <div className="mb-1 grid h-10 w-44 place-items-center rounded-lg bg-[#1e88e5] text-xl font-black text-outline-sm" style={{ clipPath: "polygon(8% 0, 92% 0, 100% 100%, 0 100%)" }}>JACKSON</div>
                  </div>
                  <div className="-mt-3 rounded-b-xl bg-[#0d47a1] px-6 pb-1 text-sm font-black tracking-widest">MATH HERO</div>
                  <div className="z-10 mt-2 flex w-full max-w-[330px] items-center gap-2 rounded-2xl border-[3px] border-black/50 bg-black/55 px-3 py-2">
                    <span className="font-black text-yellow-300">Lv.{save.level}</span>
                    <div className="h-4 flex-1 overflow-hidden rounded-full bg-black/60"><motion.div className="h-full rounded-full bg-gradient-to-r from-yellow-300 to-green-400" animate={{ width: `${xpPct}%` }} /></div>
                    <span className="text-xs font-bold">{save.xp}/{needXp} XP</span>
                  </div>
                  <div className="z-10 mt-2 flex gap-2 text-sm font-black">
                    <span className="rounded-xl bg-black/55 px-3 py-1">⚔ {itemById(save.equipped.weapon)?.name ?? "Fists"}</span>
                    <span className="rounded-xl bg-black/55 px-3 py-1">🔥 x{save.streak}</span>
                  </div>
                </div>
                {/* right column: quest + progress like reference */}
                <div className="flex flex-col gap-3">
                  <div className="panel-block bg-black/55 p-3">
                    <div className="text-sm font-black tracking-widest text-yellow-300">⭐ CURRENT QUEST</div>
                    <div className="mt-1 font-bold">{questDef?.name}</div>
                    <div className="mt-2 h-4 overflow-hidden rounded-full bg-black/60"><div className="h-full rounded-full bg-gradient-to-r from-green-400 to-yellow-300" style={{ width: `${Math.min(100, (activeQuest.progress / (questDef?.target ?? 1)) * 100)}%` }} /></div>
                    <div className="mt-1 text-xs font-black text-white/80">{activeQuest.progress}/{questDef?.target}</div>
                    <div className="mt-2 rounded-xl bg-blue-900/60 px-2 py-1 text-xs font-black text-blue-100">{objective}</div>
                  </div>
                  <div className="panel-block bg-black/55 p-3 text-sm">
                    <div className="font-black tracking-widest text-green-300">📈 PROGRESS</div>
                    <div className="mt-2 grid grid-cols-3 gap-2 text-center">
                      <div className="rounded-xl bg-black/40 p-2"><div className="text-2xl">🔥</div><div className="text-xl font-black">{save.streak}</div><div className="text-[11px]">STREAK</div></div>
                      <div className="rounded-xl bg-black/40 p-2"><div className="text-2xl">⭐</div><div className="text-xl font-black">{save.stars}</div><div className="text-[11px]">STARS</div></div>
                      <div className="rounded-xl bg-black/40 p-2"><div className="text-2xl">👾</div><div className="text-xl font-black">{save.mobsUnlocked.length}/{MOBS.length}</div><div className="text-[11px]">MOBS</div></div>
                    </div>
                    <div className="mt-2 flex gap-2">
                      <BlockButton color="#1e88e5" onClick={() => { sfx.click(); setScreen("mastery"); }}>★ Mastery</BlockButton>
                      <BlockButton color="#6a1b9a" onClick={() => { sfx.click(); setScreen("collection"); }}>👾 Mobs</BlockButton>
                    </div>
                  </div>
                  <CurrencyBar save={save} onPlus={() => toastMsg("Earn coins in battle, hero!")} />
                </div>
              </div>
              {/* bottom mobs strip like reference */}
              <div className="m-3 rounded-2xl border-4 border-black/50 bg-[#0d1526]/95 p-3">
                <div className="text-center font-black tracking-widest">MOBS & MATH CHALLENGES</div>
                <div className="scroll-thin mt-2 flex gap-3 overflow-x-auto pb-1">
                  {MOBS.slice(1, 6).map(m => (
                    <button key={m.id} onClick={() => { sfx.click(); const wi = WORLDS.findIndex(w => w.mobs.includes(m.id)); const w = WORLDS[Math.max(0, wi)]; setWorldId(save.unlockedWorlds.includes(w.id) ? w.id : "green"); setScreen("map"); }} className="panel-block min-w-[150px] bg-[#1a2340] p-2 text-center">
                      <div className="text-xs font-black">{m.name.toUpperCase()}</div>
                      <div className="mx-auto text-5xl">{m.shape === "grub" ? "🟩" : m.shape === "zombie" ? "🧟" : m.shape === "skeleton" || m.shape === "wither" ? "💀" : m.shape === "spider" ? "🕷️" : m.shape === "slime" ? "🟢" : "🔥"}</div>
                      <div className="text-[11px] font-black" style={{ color: m.difficulty === "EASY" ? "#7CFC00" : m.difficulty === "MEDIUM" ? "#4fc3f7" : "#ff8a65" }}>{m.difficulty}</div>
                      <div className="text-[10px] font-bold text-white/70">{m.tables}</div>
                    </button>
                  ))}
                  <div className="min-w-[170px] rounded-2xl border-[3px] border-black/50 bg-black/40 p-3 text-sm font-bold">
                    <div>✅ ANSWER CORRECTLY</div><div>⚔️ DEFEAT MOBS</div><div>💰 EARN REWARDS</div><div>⬆️ LEVEL UP & UNLOCK</div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* ======= WORLD MAP ======= */}
          {screen === "map" && (
            <motion.div key="map" initial={{ opacity: 0, x: 60 }} animate={{ opacity: 1, x: 0 }} className="panel-block overflow-hidden bg-gradient-to-b from-[#274b9b] to-[#0b1020] p-3">
              <div className="flex items-center justify-between">
                <button onClick={() => { sfx.click(); setScreen("home"); }} className="btn-block bg-[#78909c] px-4 py-2 font-black">‹ HOME</button>
                <TopTag n="2" label="WORLD MAP / LEVEL SELECT" color="#1e88e5" />
                <CurrencyBar save={save} />
              </div>
              <div className="mt-1 text-center text-2xl font-black tracking-widest text-outline">CHOOSE YOUR ADVENTURE!</div>
              <div className="scroll-thin mt-2 grid gap-3 pb-2 md:grid-cols-3 lg:grid-cols-5">
                {WORLDS.slice(0, 5).map(w => {
                  const locked = !save.unlockedWorlds.includes(w.id);
                  return (
                    <button key={w.id} disabled={locked} onClick={() => { sfx.click(); setWorldId(w.id); setScreen("missions"); }}
                      className="panel-block relative overflow-hidden p-0 text-left" style={{ background: w.grad, minHeight: 250 }}>
                      <div className="flex items-center gap-1 p-2">
                        <span className="grid h-7 w-7 place-items-center rounded-full border-2 border-black/60 bg-yellow-400 font-black text-black">{w.num}</span>
                        <span className="rounded-lg bg-black/60 px-2 py-0.5 text-xs font-black">{w.name}</span>
                      </div>
                      <div className="mx-3 h-28 rounded-xl border-[3px] border-black/40 bg-black/25" style={{ backgroundImage: "radial-gradient(circle at 30% 30%, rgba(255,255,255,0.35), transparent 60%)" }}>
                        <div className="flex h-full items-end justify-center gap-0 pb-0">
                          {w.mobs.slice(0, 3).map(id => { const mm = mobById(id); return <span key={id} className="-mx-1"><MobSprite mob={mm} size={64} /></span>; })}
                        </div>
                      </div>
                      <div className="flex items-center justify-center gap-1 p-2 text-lg">
                        {[0, 1, 2].map(i => <span key={i} className={i < Math.min(3, save.worldStars[w.id] ?? 0) ? "" : "opacity-30"}>⭐</span>)}
                      </div>
                      {locked && <div className="absolute inset-0 grid place-items-center bg-black/60 text-5xl">🔒</div>}
                    </button>
                  );
                })}
              </div>
              <div className="scroll-thin flex gap-3 overflow-x-auto pb-1">
                {WORLDS.slice(5).map(w => {
                  const locked = !save.unlockedWorlds.includes(w.id);
                  return (
                    <button key={w.id} disabled={locked} onClick={() => { sfx.click(); setWorldId(w.id); setScreen("missions"); }} className="panel-block min-w-[190px] p-2 text-left" style={{ background: w.grad }}>
                      <div className="text-xs font-black">{w.num}. {w.tag.toUpperCase()}</div>
                      <div className="text-3xl">{locked ? "🔒" : "🗺️"}</div>
                      <div className="text-[11px] font-bold">{locked ? "Win stars to unlock" : w.name}</div>
                    </button>
                  );
                })}
              </div>
              <div className="mt-2 grid grid-cols-4 gap-2 text-center text-sm font-black">
                {[["EASY", "1–3", "#2e7d32"], ["MEDIUM", "4–6", "#1565c0"], ["HARD", "7–9", "#6a1b9a"], ["EXPERT", "10+", "#b71c1c"]].map(([t, r, c]) => (
                  <div key={t} className="panel-block flex items-center justify-center gap-2 bg-black/50 p-2"><span className="rounded-md px-2 py-0.5" style={{ background: c }}>🛡 {t}</span><span>{r}</span></div>
                ))}
              </div>
            </motion.div>
          )}

          {/* ======= MISSION SELECT ======= */}
          {screen === "missions" && (
            <motion.div key="missions" initial={{ opacity: 0, x: 60 }} animate={{ opacity: 1, x: 0 }} className="panel-block p-4" style={{ background: world.grad }}>
              <div className="flex items-center justify-between">
                <button onClick={() => { sfx.click(); setScreen("map"); }} className="btn-block bg-[#78909c] px-4 py-2 font-black">‹ MAP</button>
                <div className="text-2xl font-black text-outline">{world.name}</div>
                <div className="w-24" />
              </div>
              <div className="mt-3 grid gap-3 md:grid-cols-4">
                {world.mobs.map((id, i) => {
                  const m = mobById(id);
                  return (
                    <motion.button whileHover={{ scale: 1.03, y: -4 }} key={id + i} onClick={() => startBattle(world.id, i, false)} className="panel-block bg-[#101828]/95 p-3 text-left">
                      <div className="text-xs font-black tracking-widest text-white/70">MISSION {i + 1}</div>
                      <div className="mx-auto text-6xl"><MobSprite mob={m} size={110} /></div>
                      <div className="text-center font-black">{m.name}</div>
                      <div className="text-center text-xs font-bold text-white/70">Lv.{m.level} • {m.hp} HP • {3 + Math.min(2, worldIndex)} questions</div>
                      <div className="mt-1.5 flex items-center justify-center gap-1.5">
                        {m.loot.slice(0, 2).map(lid => {
                          const li = itemById(lid)!;
                          const owned = save.inventory.includes(lid);
                          return <span key={lid} title={owned ? li.name : "Mystery loot — win to reveal!"} className="grid h-9 w-9 place-items-center rounded-lg border-2 text-xl" style={owned ? { borderColor: RARITY_COLOR[li.rarity] } : { borderColor: "#ffca28", background: "rgba(0,0,0,0.6)", boxShadow: "0 0 10px rgba(255,210,63,0.6)" }}>{owned ? li.icon : "❔"}</span>;
                        })}
                        <span className="text-[10px] font-bold text-white/60">loot</span>
                      </div>
                      <div className="mt-2 grid place-items-center rounded-xl bg-[#43a047] py-2 font-black">⚔ FIGHT!</div>
                    </motion.button>
                  );
                })}
                <motion.button whileHover={{ scale: 1.03 }} onClick={() => startBattle(world.id, 0, true)} className="panel-block border-yellow-300 bg-[#2b0a0a] p-3 text-left" style={{ borderWidth: 4, boxShadow: "0 0 24px rgba(255,60,60,0.6)" }}>
                  <div className="text-xs font-black tracking-widest text-red-300">👑 BOSS BATTLE</div>
                  <div className="mx-auto"><MobSprite mob={mobById(world.boss)} size={120} /></div>
                  <div className="text-center font-black text-yellow-200">{mobById(world.boss).name}</div>
                  <div className="text-center text-xs font-bold text-red-200">8 questions • 3⭐ • Rare loot</div>
                  <div className="mt-1.5 flex items-center justify-center gap-1.5">
                    {mobById(world.boss).loot.slice(0, 3).map(lid => {
                      const li = itemById(lid)!;
                      const owned = save.inventory.includes(lid);
                      const legendary = li.rarity === "Legendary" || li.rarity === "Epic";
                      return <span key={lid} title={owned ? li.name : `Mystery ${li.rarity} loot!`} className="grid h-9 w-9 place-items-center rounded-lg border-2 text-xl" style={owned ? { borderColor: RARITY_COLOR[li.rarity] } : { borderColor: legendary ? "#ff9800" : "#9c27b0", background: "rgba(0,0,0,0.6)", boxShadow: `0 0 12px ${legendary ? "rgba(255,152,0,0.8)" : "rgba(156,39,176,0.8)"}` }}>{owned ? li.icon : "❔"}</span>;
                    })}
                  </div>
                  {mobById(world.boss).loot.some(lid => { const li = itemById(lid); return li && (li.rarity === "Legendary" || li.rarity === "Epic"); }) && (
                    <div className="mt-1 text-center text-xs font-black text-orange-300 anim-floaty">✨ Possible LEGENDARY drop! ✨</div>
                  )}
                  <div className="mt-2 grid place-items-center rounded-xl bg-gradient-to-r from-red-600 to-orange-500 py-2 font-black">🔥 BOSS FIGHT!</div>
                </motion.button>
              </div>
            </motion.div>
          )}

          {/* ======= PRE-BATTLE ======= */}
          {screen === "prebattle" && (
            <motion.div key="pre" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="panel-block relative overflow-hidden p-6 text-center" style={{ background: world.grad, minHeight: 480, borderColor: isBoss ? "#ff3d00" : undefined, boxShadow: isBoss ? "0 0 40px rgba(255,61,0,0.7)" : undefined }}>
              <BlockyScenery worldId={worldId} />
              {isBoss && <motion.div animate={{ opacity: [0.25, 0.6, 0.25] }} transition={{ repeat: Infinity, duration: 1.1 }} className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(circle at 50% 40%, transparent 40%, rgba(255,30,0,0.45) 100%)" }} />}
              <motion.div initial={{ scale: 0, rotate: -10 }} animate={isBoss ? { scale: [0, 1.15, 1], rotate: [0, -2, 2, 0] } : { scale: 1, rotate: 0 }} transition={isBoss ? { duration: 0.9 } : {}} className="text-4xl font-black text-outline">
                {isBoss ? "👑 FINAL WARNING 👑" : `A WILD ${mob.name.toUpperCase()} APPEARS!`}
              </motion.div>
              {isBoss && <div className="mt-1 text-2xl font-black text-red-200 text-outline">THE {mob.name.toUpperCase()} WANTS TO BATTLE!</div>}
              <div className="mx-auto mt-4 w-fit"><MobSprite mob={mob} size={isBoss ? 220 : 180} /></div>
              <div className="mx-auto mt-2 w-fit rounded-2xl border-[3px] border-black/60 bg-black/60 px-5 py-2 font-black">❤ {mob.hp} HP • Lv.{mob.level} • {mob.tables}</div>
              {hc && <div className="mx-auto mt-2 w-fit rounded-2xl border-[3px] px-5 py-1.5 font-black" style={{ borderColor: "#ef4444", background: "rgba(127,29,29,0.7)" }}>☠ HARDCORE — wrong answers hurt {hcMobAttack(mob.id, mob.attack, { boss: isBoss })}❤️! Run ends at 0!</div>}
              <div className="mt-3 font-black text-yellow-200 anim-floaty">{isBoss ? "8 questions stand between you and glory! 🔥" : "Get ready, Jackson! ⚔"}</div>
            </motion.div>
          )}

          {/* ======= BATTLE (MC + typed + boss) ======= */}
          {screen === "battle" && q && (
            <motion.div key="battle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={`panel-block relative overflow-hidden ${hc ? "hc-frame" : ""}`} style={{ background: world.grad, minHeight: 560, borderColor: isBoss ? "#ff3d00" : undefined }}>
              {isBoss && <motion.div animate={{ opacity: [0.2, 0.45, 0.2] }} transition={{ repeat: Infinity, duration: 1.6 }} className="pointer-events-none absolute inset-0 z-20" style={{ background: "radial-gradient(circle at 50% 50%, transparent 55%, rgba(255,30,0,0.4) 100%)" }} />}
              {hc && hearts <= 2 && hearts > 0 && <div className="anim-hc-vignette pointer-events-none absolute inset-0 z-20" style={{ background: "radial-gradient(circle at 50% 55%, transparent 50%, rgba(220,20,20,0.55) 100%)" }} />}
              {/* top HUD */}
              <div className="flex items-start justify-between gap-2 p-3">
                <div className="panel-block w-56 bg-black/65 p-2">
                  <TopTag n={hc ? "☠" : isBoss ? "👑" : "⚔"} label={hc ? (isBoss ? "HARDCORE BOSS" : "HARDCORE BATTLE") : isBoss ? "BOSS BATTLE" : `BATTLE – Q${qNum}/${qTotal}`} color={hc ? "#7f1d1d" : isBoss ? "#b71c1c" : "#43a047"} />
                  <div className="mt-1 text-sm font-black">{isBoss ? "👑 " : ""}{mob.name} Lv.{mob.level}</div>
                  <HealthBar hp={mobHp} max={mobMax} color={isBoss ? "#ab0000" : "#e53935"} h={16} />
                  <div className="text-right text-xs font-black">❤ {mobHp} / {mobMax}</div>
                  {enraged && <div className="mt-0.5 rounded-lg bg-red-700 px-2 py-0.5 text-center text-xs font-black anim-floaty">😡 ENRAGED! Hits harder!</div>}
                  {hc && qEnraged && <div className="mt-0.5 rounded-lg bg-orange-700 px-2 py-0.5 text-center text-xs font-black anim-enrage-flash">🔥 ENRAGED! Wrong answers hurt +1!</div>}
                  <div className="mt-0.5 text-center text-[11px] font-bold text-white/70">{hc ? `☠ ${mob.blurb} (${hcMobAttack(mob.id, mob.attack, { boss: isBoss })}❤️)` : `${mob.blurb} (${mob.attack}❤️${isBoss && enraged ? "+1" : ""})`}</div>
                </div>
                <div className="panel-block w-60 bg-black/65 p-2">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">🧒</span>
                    {hc && hcRun ? (
                      <div className="leading-tight"><div className="text-sm font-black">Jackson ☠</div><div className="text-xs font-bold text-yellow-300">🏆 {hcRun.score.toLocaleString()} • 🎯 {Math.round(runAccuracy(hcRun) * 100)}%</div></div>
                    ) : (
                      <div className="leading-tight"><div className="text-sm font-black">Jackson</div><div className="text-xs font-bold text-green-300">{save.xp}/{needXp} XP</div></div>
                    )}
                    {bArmorDef > 0 && <span className="ml-auto rounded-lg bg-blue-900/80 px-2 py-0.5 text-xs font-black" title={bArmor ? armorLabel(bArmor) : "Protected!"}>🛡{bArmorDef}</span>}
                    {bTotem && <span className="rounded-lg bg-yellow-900/80 px-2 py-0.5 text-xs font-black" title="Totem of Undying: saves Jackson once!">🗿</span>}
                  </div>
                  <div className={`mt-1 ${hc && hearts <= 2 && hearts > 0 ? "anim-lowhp rounded-lg" : ""}`}><Hearts hp={hearts} max={bHeartsMax} size={17} /></div>
                  {bApples > 0 && (
                    <button onClick={eatApple} disabled={hearts >= bHeartsMax || ko} className="btn-block mt-1.5 w-full bg-[#e65100] py-1 text-sm font-black">
                      🍎 EAT APPLE ×{bApples}
                    </button>
                  )}
                </div>
              </div>
              {isBoss && <div className="mx-3 -mt-1 rounded-xl border-2 border-red-400/60 bg-red-950/60 px-3 py-1 text-center text-xs font-black tracking-widest text-red-200">⚠ {mob.name.toUpperCase()} — PHASE {qNum <= 3 ? "1" : qNum <= 6 ? "2 🔥" : "3 💥 FINAL"} ⚠</div>}

              <BlockyScenery worldId={worldId} />
              <div className="voxel-ground absolute inset-x-0 bottom-0 h-[26%] opacity-50" style={{ backgroundColor: "rgba(0,0,0,0.35)" }} />

              {/* actors */}
              <div className="relative flex items-end justify-between px-4 pt-2 md:px-14" style={{ minHeight: 250 }}>
                <motion.div animate={heroAtk ? { x: [0, 90, 0], rotate: [0, -8, 0] } : {}} transition={{ duration: 0.45 }}>
                  <div style={{ transform: heroAtk ? "scaleX(1)" : "scaleX(-1)" }}><JacksonHero size={isBoss ? 150 : 175} weaponId={bWeaponId} pet={bPetIcon} hat={bHatIcon} mood={heroMood} attacking={heroAtk} armorGlint={bArmorGlint} /></div>
                  {heroAtk && <motion.div initial={{ opacity: 0, scale: 0.5, rotate: -30 }} animate={{ opacity: [0, 1, 0], scale: 1.4, rotate: 30 }} className="absolute left-24 top-10 text-6xl">💥</motion.div>}
                  <AnimatePresence>{heroDmg.map(d => <motion.div key={d.id} initial={{ y: 0, opacity: 1, scale: 0.6 }} animate={{ y: -80, opacity: 0, scale: 1.3 }} exit={{ opacity: 0 }} className="absolute left-10 top-0 z-40 text-3xl font-black text-red-300 text-outline">{d.v}</motion.div>)}</AnimatePresence>
                </motion.div>
                <div className="relative">
                  <MobSprite mob={mob} size={isBoss ? 210 : 175} hurt={mobHurt} attacking={mobAtk} />
                  <ParticleBurst show={burst > 0} key={burst} color={isBoss ? "#ff5722" : "#ffeb3b"} />
                  <AnimatePresence>{dmg.map(d => <motion.div key={d.id} initial={{ y: 0, opacity: 1, scale: 0.6 }} animate={{ y: -90, opacity: 0, scale: 1.4 }} exit={{ opacity: 0 }} className="absolute left-1/2 top-0 z-40 -translate-x-1/2 text-4xl font-black text-yellow-300 text-outline">-{d.v}</motion.div>)}</AnimatePresence>
                </div>
              </div>

              {/* question panel */}
              <div className="relative z-10 mx-3 mb-3 grid gap-3 md:mx-6 md:grid-cols-[1fr_340px]">
                <div className="panel-block bg-[#0d1526]/95 p-3 text-center">
                  <AnimatePresence mode="wait">
                    <motion.div key={q.text + qNum} initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -20, opacity: 0 }}>
                      <div className="text-4xl font-black tracking-wide md:text-5xl">{q.display}</div>
                      {(qMode === "choice3" || qMode === "keypad") && q.visual && <div className="mt-2"><ArrayVisual groups={q.visual.groups} per={q.visual.per} /></div>}
                      {(q.line && (qMode === "choice3" || qMode === "choice4")) && <div className="mt-2"><NumberLine from={q.line.from} to={q.line.to} start={q.line.start} end={q.line.end} /></div>}
                      {phase === "correct" && <motion.div initial={{ scale: 0.5 }} animate={{ scale: [0.5, 1.25, 1] }} className="mt-1 text-3xl font-black text-green-400 text-outline">✅ {feedback} <span className="text-yellow-300">{hc ? `+${scoreCorrect(combo)}` : `+${mob.xp} XP`}</span></motion.div>}
                      {phase === "wrong" && !ko && (
                        <motion.div initial={{ x: 0 }} animate={{ x: [0, -8, 8, 0] }} className="mx-auto mt-2 max-w-md rounded-2xl border-[3px] border-amber-300 bg-amber-950/80 p-2">
                          <div className="font-black text-amber-200">💛 Good try, hero!</div>
                          <div className="text-sm font-bold">{q.explanation}</div>
                          <div className="text-lg font-black text-white">Answer: {q.answer} — tap to try the next one!</div>
                          <button onClick={() => { sfx.click(); setQNum(n => n); setPhase("ask"); nextQuestion(mode, worldIndex, recent); }} className="btn-block mt-2 bg-[#43a047] px-6 py-2 font-black">NEXT ➜</button>
                        </motion.div>
                      )}
                      {phase === "ask" && showTutorial && (                        <div className="mx-auto mt-2 max-w-md rounded-2xl border-[3px] border-yellow-300 bg-black/70 p-2 text-sm font-black">
                          👆 Tap the right answer to attack the {mob.name}! <button className="ml-2 rounded-lg bg-green-600 px-2" onClick={() => setShowTutorial(false)}>OK!</button>
                          <div className="animate-bounce text-3xl">⬇️</div>
                        </div>
                      )}
                      {phase === "ask" && hc && hcRun && hcRun.answered === 0 && (
                        <div className="mx-auto mt-2 max-w-md rounded-2xl border-[3px] bg-black/70 p-2 text-sm font-black" style={{ borderColor: "#ef4444" }}>
                          ☠ This is HARDCORE — a wrong answer hurts <b>YOU</b> now! Think carefully, hero! 🛡🍎
                        </div>
                      )}
                    </motion.div>
                  </AnimatePresence>
                  {/* progress dots */}
                  <div className="mt-2 flex items-center justify-center gap-1.5">
                    {Array.from({ length: qTotal }).map((_, i) => <div key={i} className="h-3 w-8 rounded-full border border-black/50" style={{ background: i < qNum - 1 || (phase === "correct") && i === qNum - 1 ? "#7CFC00" : i === qNum - 1 ? "#ffca28" : "rgba(255,255,255,0.2)" }} />)}
                  </div>
                  {combo >= 2 && <div className="mx-auto mt-1 w-fit rounded-full bg-orange-600 px-4 py-0.5 font-black anim-floaty">🔥 STREAK x{combo}! <span className="text-yellow-200">+{combo * 2} XP</span></div>}
                  {phase === "ask" && bPetFx === "PET_parrot" && q && (
                    <div className="mx-auto mt-1 w-fit rounded-full bg-cyan-800 px-4 py-0.5 text-sm font-black anim-floaty">🦜 Squawk! The answer is {q.answer % 2 === 0 ? "EVEN" : "ODD"}!</div>
                  )}
                </div>

                <div className="panel-block bg-[#0d1526]/95 p-3">
                  {(qMode === "choice3" || qMode === "choice4") && (
                    <div className={`grid gap-2.5 ${qMode === "choice3" && (q.choices?.length ?? 3) <= 3 ? "grid-cols-3" : "grid-cols-2"}`}>
                      {(q.choices ?? []).map((c, i) => {
                        const isRight = phase === "wrong" && c === q.answer;
                        return (
                          <motion.button whileTap={phase === "ask" ? { scale: 0.9 } : {}} key={c + "-" + i} onClick={() => chooseAnswer(c)} disabled={phase !== "ask"}
                            animate={isRight ? { scale: [1, 1.12, 1] } : {}}
                            transition={isRight ? { repeat: Infinity, duration: 0.9 } : {}}
                            className="btn-block py-4 text-3xl font-black"
                            style={{
                              background: isRight ? "linear-gradient(180deg,#66bb6a,#2e7d32)" : `linear-gradient(180deg, ${ANSWER_COLORS[i % 4]}, ${ANSWER_COLORS[i % 4]}cc)`,
                              opacity: phase === "wrong" && !isRight ? 0.45 : 1,
                              boxShadow: isRight ? "0 0 22px rgba(124,252,0,0.9), 0 6px 0 rgba(0,0,0,0.45)" : undefined
                            }}>{c}</motion.button>
                        );
                      })}
                    </div>
                  )}
                  {(qMode === "keypad" || qMode === "typed") && phase !== "wrong" && (
                    <div>
                      <>
                        <div className="text-center text-xs font-black tracking-widest text-white/70">{qMode === "typed" || worldIndex > 4 ? "TYPE YOUR ANSWER" : "TAP THE NUMBERS"}</div>
                        <div className="mx-auto mt-1 grid h-16 w-40 place-items-center rounded-2xl border-4 border-cyan-300/70 bg-black/70 text-4xl font-black text-green-400">{typed || "?"}</div>
                        <div className="mx-auto mt-2 grid max-w-[240px] grid-cols-3 gap-2">
                          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => <button key={n} onClick={() => { sfx.click(); setTyped(t => (t + n).slice(0, 4)); }} className="btn-block min-h-[56px] bg-[#37474f] py-2 text-2xl font-black">{n}</button>)}
                          <button onClick={() => setTyped(t => t.slice(0, -1))} className="btn-block min-h-[56px] bg-[#b71c1c] py-2 text-xl font-black">⌫</button>
                          <button onClick={() => { sfx.click(); setTyped(t => (t + "0").slice(0, 4)); }} className="btn-block min-h-[56px] bg-[#37474f] py-2 text-2xl font-black">0</button>
                          <button onClick={submitTyped} className="btn-block min-h-[56px] bg-[#43a047] py-2 text-xl font-black">GO</button>
                        </div>
                        <input value={typed} onChange={e => setTyped(e.target.value.replace(/\D/g, "").slice(0, 4))} onKeyDown={e => { if (e.key === "Enter") submitTyped(); }}
                          className="mx-auto mt-2 block w-40 rounded-xl border-2 border-white/30 bg-white/10 px-3 py-1 text-center font-black" placeholder="keyboard…" />
                        <button onClick={submitTyped} className="btn-block mt-2 w-full bg-[#43a047] py-2.5 font-black">SUBMIT</button>
                      </>
                    </div>
                  )}
                  {hc ? (
                    !abandonAsk ? (
                      <button onClick={() => { sfx.click(); setAbandonAsk(true); }} className="mt-2 w-full rounded-xl bg-white/10 py-1 text-xs font-black text-white/60">🏳️ End this run?</button>
                    ) : (
                      <div className="mt-2 rounded-xl border-2 border-red-400 bg-red-950/70 p-2 text-center">
                        <div className="text-xs font-black text-red-100">End this run? Normal game stays safe.</div>
                        <div className="mt-1 flex gap-2">
                          <button onClick={() => { sfx.click(); setAbandonAsk(false); }} className="btn-block flex-1 bg-[#43a047] py-1.5 text-sm font-black">KEEP PLAYING</button>
                          <button onClick={abandonHcRun} className="btn-block flex-1 bg-[#b71c1c] py-1.5 text-sm font-black">END RUN</button>
                        </div>
                      </div>
                    )
                  ) : (
                    <button onClick={() => { sfx.click(); battleSeq.current++; setScreen("map"); }} className="mt-2 w-full rounded-xl bg-white/10 py-1 text-xs font-black text-white/60">🏳️ Run away (map)</button>
                  )}
                </div>
              </div>
              {/* playful defeat overlay — Jackson keeps everything, just tries again */}
              {ko && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 z-40 grid place-items-center bg-black/70 p-4">
                  <div className="panel-block max-w-md bg-[#2b1a12] p-6 text-center">
                    <motion.div initial={{ scale: 0, rotate: -20 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring" }} className="text-6xl">😵</motion.div>
                    <div className="mt-2 text-3xl font-black text-outline">The {mob.name} got you!</div>
                    <div className="mt-2 font-bold text-white/85">Ouch! That tickled! But look — you kept <span className="text-yellow-300">+{earned.xp} XP</span> and <span className="text-yellow-300">+{earned.coins} coins</span>!</div>
                    <div className="mt-1 text-sm font-bold text-white/70">💛 Your sword and armor are safe. Ready to try again, hero?</div>
                    <div className="mt-4 flex justify-center gap-3">
                      <BlockButton big color="#43a047" onClick={() => { sfx.click(); startBattle(worldId, missionIdx, isBoss); }}>⚔ TRY AGAIN!</BlockButton>
                      <BlockButton color="#1e88e5" onClick={() => { sfx.click(); battleSeq.current++; setScreen("map"); }}>MAP</BlockButton>
                    </div>
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}

          {/* ======= VICTORY ======= */}
          {screen === "victory" && (
            <motion.div key="vic" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className={`panel-block relative overflow-hidden p-6 text-center ${hc ? "hc-frame bg-gradient-to-b from-[#3f0d0d] to-[#0b1020]" : "bg-gradient-to-b from-[#1b5e20] to-[#0b1020]"}`}>
              {[...Array(14)].map((_, i) => <span key={i} className="absolute text-yellow-200 anim-floaty" style={{ left: `${5 + i * 7}%`, top: `${5 + (i % 4) * 20}%`, animationDelay: `${i * 0.2}s` }}>✦</span>)}
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring" }} className="text-5xl font-black text-yellow-300 text-outline">{hc ? "☠ VICTORY!" : "🎉 VICTORY! 🎉"}</motion.div>
              <div className="font-black text-white/80">{mob.name} defeated! Jackson the hero wins!</div>
              {hc && hcRun ? (
                <div className="mx-auto mt-3 grid max-w-md gap-2">
                  <div className="panel-block bg-black/55 p-2 font-black">+{hcGained} pts &nbsp; 🏆 {hcRun.score.toLocaleString()} &nbsp; 🎯 {Math.round(runAccuracy(hcRun) * 100)}%</div>
                  <div className="panel-block bg-black/55 p-2 text-sm font-black">❤️ {hcRun.hearts}/{HC_MAX_HEARTS} &nbsp; 🍎 ×{hcRun.apples} {hcRun.totem ? "🗿" : ""} &nbsp; {stepLabel(hcRun.worldIdx, hcRun.step)}</div>
                </div>
              ) : (
                <>
                  {save.level > levelAtStart && (
                    <motion.div initial={{ scale: 0, y: 20 }} animate={{ scale: 1, y: 0 }} transition={{ type: "spring", delay: 0.5 }} className="panel-block mx-auto mt-2 w-fit bg-gradient-to-r from-yellow-500 to-orange-500 px-6 py-2 text-2xl font-black text-black anim-floaty">
                      ⬆️ LEVEL UP! Now Level {save.level}! 🎊
                    </motion.div>
                  )}
                  <div className="mx-auto mt-3 grid max-w-md gap-2">
                    <div className="panel-block bg-black/55 p-2 font-black">⭐ +{earned.xp} XP &nbsp; 🪙 +{earned.coins} &nbsp; 💎 +{earned.gems}</div>
                    <div className="panel-block bg-black/55 p-2"><div className="text-xs font-black">LEVEL {save.level} — {save.xp}/{needXp} XP</div><div className="mt-1 h-4 overflow-hidden rounded-full bg-black/60"><motion.div className="h-full bg-gradient-to-r from-yellow-300 to-green-400" initial={{ width: "10%" }} animate={{ width: `${xpPct}%` }} transition={{ duration: 1 }} /></div></div>
                  </div>
                </>
              )}
              <div className="mx-auto mt-2 w-fit"><JacksonHero size={150} weaponId={hc ? bWeaponId : save.equipped.weapon} pet={hc ? bPetIcon : petIcon} hat={hc ? bHatIcon : hatIcon} mood="win" /></div>
              <div className="mt-4 flex justify-center gap-3">
                <BlockButton color="#ef6c00" big onClick={openChestFlow}>🎁 OPEN CHEST!</BlockButton>
                {hc
                  ? <BlockButton color="#43a047" big onClick={hcNextBattle}>CONTINUE ➜</BlockButton>
                  : <BlockButton color="#1e88e5" onClick={() => { sfx.click(); setScreen("map"); }}>MAP</BlockButton>}
              </div>
            </motion.div>
          )}

          {/* ======= CHEST + REWARD REVEAL ======= */}
          {screen === "chest" && (
            <motion.div key="chest" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="panel-block bg-gradient-to-b from-[#4a148c] to-[#0b1020] p-6 text-center" style={{ minHeight: 480 }}>
              <TopTag n="🎁" label="TREASURE CHEST" color="#8e24aa" />
              {!chestOpen ? (
                <div>
                  <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.94 }} onClick={() => { setChestOpen(true); sfx.chest(); window.setTimeout(() => sfx.rare(), 700); }} className="mx-auto mt-6 text-[120px] anim-floaty" style={{ filter: "drop-shadow(0 10px 20px rgba(0,0,0,0.6))" }}>🎁</motion.button>
                  <div className="font-black text-yellow-200 anim-floaty">Tap the chest, Jackson!</div>
                </div>
              ) : (
                <div>
                  <motion.div initial={{ scale: 0.6, rotate: -8 }} animate={{ scale: 1, rotate: 0 }} className="mx-auto mt-2 text-[110px]">📭</motion.div>
                  <ParticleBurst show key="open" color="#ffca28" />
                  <div className="mx-auto mt-2 grid max-w-lg gap-2">
                    {loot.map((id, i) => {
                      const it = itemById(id)!;
                      const vis = i < revealed || revealed >= loot.length;
                      return (
                        <motion.div key={id} initial={{ opacity: 0, y: 30, scale: 0.8 }} animate={vis ? { opacity: 1, y: 0, scale: 1 } : {}} className="panel-block flex items-center gap-3 bg-black/60 p-3 text-left" style={{ borderColor: RARITY_COLOR[it.rarity] }}>
                          <div className="grid h-14 w-14 place-items-center rounded-xl text-3xl" style={{ background: it.color + "44", border: `3px solid ${RARITY_COLOR[it.rarity]}` }}>{it.icon}</div>
                          <div><div className="font-black">{vis ? it.name.toUpperCase() : "???"} {vis && it.slot && isUpgrade(id, (hc && hcRun ? hcRun.equipped : save.equipped)[it.slot as keyof typeof save.equipped]) && <span className="ml-1 rounded-md bg-green-500 px-1.5 text-xs text-black">↑ BETTER! EQUIP NOW!</span>}</div><div className="rounded-md px-2 text-xs font-black" style={{ background: RARITY_COLOR[it.rarity] }}>{vis ? it.rarity : "???"}</div></div>
                          {vis && <button onClick={() => (hc ? equipHcItem : equipItem)(id)} className="btn-block ml-auto bg-[#43a047] px-4 py-1.5 text-sm font-black">EQUIP</button>}
                        </motion.div>
                      );
                    })}
                  </div>
                  {revealed < loot.length ? (
                    <BlockButton big color="#ff9800" onClick={() => { sfx.coin(); setRevealed(r => r + 1); }} >✨ REVEAL ({revealed + 1}/{loot.length})</BlockButton>
                  ) : (
                    <div className="mt-3 flex justify-center gap-3">
                      {hc
                        ? <BlockButton color="#7f1d1d" big onClick={hcNextBattle}>☠ NEXT BATTLE ➜</BlockButton>
                        : <BlockButton color="#43a047" big onClick={() => { const w = WORLDS[Math.min(WORLDS.length - 1, worldIndex + 0)]; startBattle(w.id, missionIdx + 1, false); }}>NEXT MISSION ➜</BlockButton>}
                      <BlockButton color="#1e88e5" onClick={() => { sfx.click(); setScreen("map"); }}>MAP</BlockButton>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          )}

          {/* ======= INVENTORY / REWARDS ======= */}
          {(screen === "inventory" || screen === "equipment") && (
            <motion.div key="inv" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="panel-block bg-[#141b33] p-3">
              <div className="flex flex-wrap items-center gap-2">
                <button onClick={() => { sfx.click(); setScreen("home"); }} className="btn-block bg-[#78909c] px-4 py-2 font-black">‹ HOME</button>
                <TopTag n="🎒" label={screen === "inventory" ? "REWARDS / INVENTORY" : "CHARACTER EQUIPMENT"} color="#8e24aa" />
                <div className="ml-auto"><CurrencyBar save={save} /></div>
              </div>
              <div className="mt-2 flex gap-2 overflow-x-auto">
                {[["inventory", "🎒 Inventory"], ["equipment", "⚔ Equipment"], ["collection", "👾 Mobs"], ["achievements", "🏆 Badges"], ["mastery", "⭐ Mastery"]].map(([id, lb]) => (
                  <button key={id} onClick={() => { sfx.click(); setScreen(id as Screen); }} className={`rounded-xl border-[3px] border-black/50 px-4 py-2 font-black ${screen === id ? "bg-[#1e88e5]" : "bg-black/40"}`}>{lb}</button>
                ))}
              </div>
              {screen === "inventory" && (
                <div>
                  {(save.consumables.apples > 0 || save.consumables.totem) && (
                    <div className="mt-2 flex flex-wrap gap-2 text-sm font-black">
                      {save.consumables.apples > 0 && <span className="rounded-xl bg-black/40 px-3 py-1">🍎 Golden Apple ×{save.consumables.apples} (eat in battle!)</span>}
                      {save.consumables.totem && <span className="rounded-xl bg-black/40 px-3 py-1">🗿 Totem of Undying (saves you once!)</span>}
                    </div>
                  )}
                  <div className="mt-2 flex gap-2">
                    {["inventory", "weapon", "tool", "armor", "pet", "trophy"].map(t => (
                      <button key={t} onClick={() => { sfx.click(); setTab(t); }} className={`rounded-xl px-3 py-1.5 text-sm font-black ${tab === t ? "bg-yellow-500 text-black" : "bg-black/40"}`}>{t.toUpperCase()}</button>
                    ))}
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2 md:grid-cols-4">
                    {save.inventory.filter(id => tab === "inventory" ? true : itemById(id)?.kind === tab || (tab === "weapon" && itemById(id)?.kind === "weapon")).map(id => {
                      const it = itemById(id)!;
                      const eq = Object.values(save.equipped).includes(id);
                      return (
                        <div key={id} className="panel-block bg-black/50 p-2 text-center" style={{ borderColor: RARITY_COLOR[it.rarity] }}>
                          <div className="text-5xl">{it.icon}</div>
                          <div className="font-black">{it.name}</div>
                          <div className="mx-auto w-fit rounded-md px-2 text-xs font-black" style={{ background: RARITY_COLOR[it.rarity] }}>{it.rarity}</div>
                          <div className="mt-1 text-[11px] text-white/60">{it.desc}</div>
                          <button onClick={() => equipItem(id)} className={`btn-block mt-2 w-full py-1.5 text-sm font-black ${eq ? "bg-[#2e7d32]" : "bg-[#1e88e5]"}`}>{eq ? "✓ EQUIPPED" : it.slot ? "EQUIP" : "⭐ TREASURE"}</button>
                        </div>
                      );
                    })}
                    {save.inventory.length === 0 && <div className="col-span-full p-6 text-center font-black text-white/60">No items yet — win battles to earn loot! 🎁</div>}
                  </div>
                  <div className="mt-3 grid gap-2 md:grid-cols-2">
                    <div className="panel-block bg-black/40 p-3"><div className="font-black">🧰 TREASURE CHESTS</div><div className="mt-1 flex gap-2 text-4xl"><span>🎁</span><span>🎁</span><span>🎁</span><span>💜</span></div><div className="text-xs text-white/60">Win boss battles for epic chests.</div></div>
                    <div className="panel-block bg-black/40 p-3"><div className="font-black">🏅 BADGES ({save.achievements.length}/{ACH_DEFS.length})</div><div className="mt-1 flex gap-2 text-3xl">{ACH_DEFS.slice(0, 5).map(a => <span key={a.id} className={save.achievements.includes(a.id) ? "" : "opacity-25 grayscale"}>{a.icon}</span>)}</div></div>
                  </div>
                </div>
              )}
              {screen === "equipment" && (
                <div className="mt-3 grid gap-3 md:grid-cols-[300px_1fr]">
                  <div className="panel-block grid place-items-center bg-gradient-to-b from-[#2b4a7a] to-black/60 p-4">
                    <JacksonHero size={190} weaponId={save.equipped.weapon} pet={petIcon} hat={hatIcon} armorGlint={!!save.equipped.armor} />
                    <div className="font-black">JACKSON — Lv.{save.level} MATH HERO</div>
                  </div>
                  <div className="grid gap-2">
                    {[["weapon", "🗡️ WEAPON", save.equipped.weapon], ["armor", "🦺 ARMOR", save.equipped.armor], ["hat", "🎩 HAT", save.equipped.hat], ["pet", "🐾 PET", save.equipped.pet]].map(([slot, lb, cur]) => {
                      const curIt = typeof cur === "string" ? itemById(cur) : undefined;
                      const sub = slot === "armor" && curIt ? armorLabel(curIt)
                        : slot === "weapon" && curIt ? `⚔ Power ${curIt.power}${curIt.crit ? " • crits!" : ""}${curIt.effect === "fire" ? " • burns!" : ""}${curIt.effect === "sharp" ? " • +2 sharp!" : ""}`
                        : slot === "pet" && curIt ? curIt.desc : "";
                      return (
                      <div key={slot as string} className="panel-block bg-black/50 p-2">
                        <div className="text-sm font-black">{lb}{sub ? <span className="ml-2 text-xs font-bold text-yellow-200">{sub}</span> : null}</div>
                        <div className="mt-1 flex gap-2 overflow-x-auto">
                          {save.inventory.filter(id => itemById(id)?.slot === slot).map(id => {
                            const it = itemById(id)!;
                            return <button key={id} onClick={() => equipItem(id)} className={`min-w-[86px] rounded-xl border-[3px] p-2 text-center ${cur === id ? "border-green-400 bg-green-900/60" : "border-black/50 bg-black/40"}`}><div className="text-3xl">{it.icon}</div><div className="text-[11px] font-black">{it.name}</div></button>;
                          })}
                          {save.inventory.filter(id => itemById(id)?.slot === slot).length === 0 && <div className="p-2 text-xs font-bold text-white/50">Empty — find loot in {slot} battles!</div>}
                        </div>
                      </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* ======= MOB COLLECTION ======= */}
          {screen === "collection" && (
            <motion.div key="col" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="panel-block bg-[#141b33] p-4">
              <div className="flex items-center gap-2"><button onClick={() => { sfx.click(); setScreen("home"); }} className="btn-block bg-[#78909c] px-4 py-2 font-black">‹ HOME</button><TopTag n="👾" label="MOB COLLECTION" color="#43a047" /></div>
              <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-4">
                {MOBS.map(m => {
                  const got = save.mobsUnlocked.includes(m.id);
                  const kills = save.mobDefeats[m.id] ?? 0;
                  return (
                    <div key={m.id} className={`panel-block p-2 text-center ${got ? "bg-[#1a2340]" : "bg-black/60 opacity-60"}`}>
                      {got ? <div className="mx-auto w-fit"><MobSprite mob={m} size={100} /></div> : <div className="grid h-[100px] place-items-center text-5xl">❓</div>}
                      <div className="font-black">{got ? m.name : "???"}</div>
                      <div className="text-xs font-bold" style={{ color: m.difficulty === "EASY" ? "#7CFC00" : "#4fc3f7" }}>{m.difficulty} • {m.tables}</div>
                      <div className="text-xs font-black text-white/60">Defeated: {kills} • {kills >= 1 ? "🏆" : "—"}</div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* ======= ACHIEVEMENTS ======= */}
          {screen === "achievements" && (
            <motion.div key="ach" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="panel-block bg-[#141b33] p-4">
              <div className="flex items-center gap-2"><button onClick={() => { sfx.click(); setScreen("home"); }} className="btn-block bg-[#78909c] px-4 py-2 font-black">‹ HOME</button><TopTag n="🏆" label="ACHIEVEMENTS" color="#ff9800" /></div>
              <div className="mt-3 grid gap-2 md:grid-cols-2">
                {ACH_DEFS.map(a => {
                  const got = save.achievements.includes(a.id);
                  return <div key={a.id} className={`panel-block flex items-center gap-3 p-3 ${got ? "bg-gradient-to-r from-yellow-900/60 to-black/50" : "bg-black/50 opacity-60"}`}><div className="text-4xl">{got ? a.icon : "🔒"}</div><div><div className="font-black">{a.name}</div><div className="text-sm text-white/70">{a.desc}</div></div>{got && <span className="ml-auto font-black text-green-400">✓</span>}</div>;
                })}
              </div>
            </motion.div>
          )}

          {/* ======= MASTERY ======= */}
          {screen === "mastery" && (
            <motion.div key="mas" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="panel-block bg-[#141b33] p-4">
              <div className="flex items-center gap-2"><button onClick={() => { sfx.click(); setScreen("home"); }} className="btn-block bg-[#78909c] px-4 py-2 font-black">‹ HOME</button><TopTag n="⭐" label="SKILL MASTERY" color="#ffca28" /></div>
              <div className="mt-3 grid gap-2 md:grid-cols-3">
                {Array.from({ length: 10 }).map((_, i) => {
                  const t = i + 2;
                  const entries = Object.entries(save.mastery).filter(([k]) => k.startsWith(`t${t}:`));
                  const score = entries.length ? entries.reduce((a, [, v]) => a + v.score, 0) / entries.length : (t <= 3 ? 0.7 : 0);
                  const stars = score >= 0.85 ? 3 : score >= 0.6 ? 2 : score >= 0.3 ? 1 : 0;
                  return (
                    <div key={t} className="panel-block bg-black/50 p-3 text-center">
                      <div className="font-black">{t} Times Table</div>
                      <div className="text-2xl">{"★".repeat(stars)}<span className="opacity-30">{"★".repeat(3 - stars)}</span></div>
                      <div className="mx-auto mt-1 h-3 w-3/4 overflow-hidden rounded-full bg-black/60"><div className="h-full rounded-full bg-gradient-to-r from-yellow-300 to-green-400" style={{ width: `${Math.round(score * 100)}%` }} /></div>
                      <div className="text-xs font-bold text-white/60">{Math.round(score * 100)}% • {entries.reduce((a, [, v]) => a + v.asked, 0)} asked</div>
                    </div>
                  );
                })}
              </div>
              <div className="panel-block mt-3 bg-black/40 p-3 text-sm font-bold">💡 Tip for Jackson: tables with fewer stars appear more often in battle — that's how heroes train!</div>
            </motion.div>
          )}

          {/* ======= PARENT DASHBOARD (gated) ======= */}
          {screen === "parent" && (
            <motion.div key="par" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="panel-block bg-[#f5f5f5] p-4 text-gray-900">
              <div className="flex items-center gap-2"><button onClick={() => { sfx.click(); setScreen("home"); }} className="btn-block bg-[#78909c] px-4 py-2 font-black text-white">‹ HOME</button><TopTag n="👪" label="PARENT DASHBOARD" color="#37474f" /></div>
              {!parentUnlocked ? (
                <div className="mx-auto mt-4 max-w-sm rounded-2xl border-4 border-gray-300 bg-white p-4 text-center shadow">
                  <div className="font-black">Grown-ups only 🔒</div>
                  <div className="text-sm">To enter, solve: <b>7 + 8 = ?</b></div>
                  <input value={parentAns} onChange={e => setParentAns(e.target.value)} className="mx-auto mt-2 block w-32 rounded-xl border-2 border-gray-300 p-2 text-center text-2xl font-black" placeholder="?" />
                  <button onClick={() => { if (parentAns.trim() === "15") { setParentUnlocked(true); sfx.correct(); } else { sfx.wrong(); toastMsg("Try again, grown-up!"); } }} className="btn-block mt-2 bg-[#43a047] px-6 py-2 font-black text-white">ENTER</button>
                </div>
              ) : (
                <div className="mt-3 grid gap-3 text-sm md:grid-cols-3">
                  <div className="rounded-2xl border bg-white p-3 shadow"><div className="font-black">📊 Overview</div><div>Accuracy: <b>{stats.acc}%</b></div><div>Avg time: <b>{stats.avg}s</b></div><div>Questions: <b>{stats.total}</b></div><div>Sessions: <b>{save.sessions.length}</b></div><div>Streak best: <b>{save.bestStreak}</b></div></div>
                  <div className="rounded-2xl border bg-white p-3 shadow"><div className="font-black">💪 Strongest</div>{stats.strong.map(([k, v]) => <div key={k}>{k} — {Math.round(v.score * 100)}%</div>)}<div className="mt-2 font-black">🎯 Needs practice</div>{stats.weak.map(([k, v]) => <div key={k}>{k} — {Math.round(v.score * 100)}%</div>)}</div>
                  <div className="rounded-2xl border bg-white p-3 shadow"><div className="font-black">🕘 Recent sessions</div>{save.sessions.slice(-5).reverse().map((s, i) => <div key={i}>{new Date(s.at).toLocaleString()} — {s.correct}/{s.answered}</div>)}<div className="mt-2 font-black">➡ Suggested next</div><div>{stats.weak[0] ? `Practise ${stats.weak[0][0]}` : "Keep playing mixed battles!"}</div></div>
                  <div className="rounded-2xl border bg-white p-3 shadow md:col-span-3"><div className="font-black">📚 Mastery by table</div><div className="mt-1 flex flex-wrap gap-2">{Object.entries(save.mastery).slice(0, 20).map(([k, v]) => <span key={k} className="rounded-lg bg-gray-100 px-2 py-1 font-bold">{k}: {Math.round(v.score * 100)}%</span>)}</div></div>
                  {/* ---- parent-controlled maths curriculum ---- */}
                  <div className="rounded-2xl border bg-white p-3 shadow md:col-span-3">
                    <div className="font-black">📐 Maths Curriculum <span className="text-xs font-bold text-gray-500">(Jackson's battles adapt instantly)</span></div>
                    <div className="mt-1 text-xs font-bold text-gray-500">Operations — division stays OFF until Jackson learns it:</div>
                    <div className="mt-1 grid grid-cols-2 gap-2 md:grid-cols-4">
                      <ParentToggle label="➕ Addition" on={save.curriculum.ops.add} onFlip={() => setCur({ ops: { ...save.curriculum.ops, add: !save.curriculum.ops.add } })} />
                      <ParentToggle label="➖ Subtraction" on={save.curriculum.ops.sub} onFlip={() => setCur({ ops: { ...save.curriculum.ops, sub: !save.curriculum.ops.sub } })} />
                      <ParentToggle label="✖️ Multiplication" on={save.curriculum.ops.mul} onFlip={() => setCur({ ops: { ...save.curriculum.ops, mul: !save.curriculum.ops.mul } })} />
                      <ParentToggle label="➗ Division" sub="Jackson hasn't learned this yet" on={save.curriculum.ops.div} onFlip={() => setCur({ ops: { ...save.curriculum.ops, div: !save.curriculum.ops.div } })} />
                    </div>
                    <div className="mt-2 text-xs font-bold text-gray-500">Times tables to practise:</div>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {Array.from({ length: 12 }).map((_, i) => {
                        const t = i + 1;
                        const on = save.curriculum.tables.includes(t);
                        return <button key={t} onClick={() => { sfx.click(); const ts = on ? save.curriculum.tables.filter(x => x !== t) : [...save.curriculum.tables, t]; setCur({ tables: ts.length ? ts : [t] }); }} className={`h-12 w-12 rounded-xl border-2 font-black ${on ? "border-green-600 bg-green-500 text-white" : "border-gray-300 bg-gray-100 text-gray-400"}`}>{t}</button>;
                      })}
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <div className="rounded-xl border-2 border-gray-300 bg-gray-50 px-3 py-2 text-center font-black text-gray-800">
                        <div className="text-xs text-gray-500">SMALLEST NUMBER</div>
                        <div className="flex items-center justify-center gap-3 text-2xl">
                          <button className="h-10 w-10 rounded-lg bg-gray-200" onClick={() => { sfx.click(); setCur({ minN: Math.max(0, Math.min(20, save.curriculum.minN - 1)) }); }}>−</button>
                          {save.curriculum.minN}
                          <button className="h-10 w-10 rounded-lg bg-gray-200" onClick={() => { sfx.click(); setCur({ minN: Math.max(0, Math.min(20, save.curriculum.minN + 1)) }); }}>+</button>
                        </div>
                      </div>
                      <div className="rounded-xl border-2 border-gray-300 bg-gray-50 px-3 py-2 text-center font-black text-gray-800">
                        <div className="text-xs text-gray-500">BIGGEST NUMBER</div>
                        <div className="flex items-center justify-center gap-3 text-2xl">
                          <button className="h-10 w-10 rounded-lg bg-gray-200" onClick={() => { sfx.click(); setCur({ maxN: Math.max(2, Math.min(50, save.curriculum.maxN - 1)) }); }}>−</button>
                          {save.curriculum.maxN}
                          <button className="h-10 w-10 rounded-lg bg-gray-200" onClick={() => { sfx.click(); setCur({ maxN: Math.max(2, Math.min(50, save.curriculum.maxN + 1)) }); }}>+</button>
                        </div>
                      </div>
                    </div>
                    <div className="mt-2 text-xs font-bold text-gray-500">Question styles & extras:</div>
                    <div className="mt-1 grid grid-cols-2 gap-2 md:grid-cols-3">
                      <ParentToggle label="🔘 Multiple choice" on={save.curriculum.modes.choice} onFlip={() => setCur({ modes: { ...save.curriculum.modes, choice: !save.curriculum.modes.choice } })} />
                      <ParentToggle label="🔢 Number pad" on={save.curriculum.modes.keypad} onFlip={() => setCur({ modes: { ...save.curriculum.modes, keypad: !save.curriculum.modes.keypad } })} />
                      <ParentToggle label="⌨️ Typing" on={save.curriculum.modes.typed} onFlip={() => setCur({ modes: { ...save.curriculum.modes, typed: !save.curriculum.modes.typed } })} />
                      <ParentToggle label="❓ Missing number" sub="? × 5 = 30" on={save.curriculum.missing} onFlip={() => setCur({ missing: !save.curriculum.missing })} />
                      <ParentToggle label="📖 Word problems" on={save.curriculum.words} onFlip={() => setCur({ words: !save.curriculum.words })} />
                      <ParentToggle label="🧠 Adaptive difficulty" sub="repeats tricky facts" on={save.curriculum.adaptive} onFlip={() => setCur({ adaptive: !save.curriculum.adaptive })} />
                    </div>
                  </div>
                  {/* ---- save danger zone (parent-gated) ---- */}
                  <div className="rounded-2xl border-2 border-red-200 bg-white p-3 shadow md:col-span-3">
                    <div className="font-black">💾 Jackson's Save <span className="text-xs font-bold text-gray-500">(keep it safe!)</span></div>
                    {importError && <div className="mt-1 rounded-xl bg-red-100 px-3 py-2 text-sm font-black text-red-700">⛔ {importError}</div>}
                    <div className="mt-2 flex flex-wrap gap-2">
                      <button onClick={doExport} className="btn-block bg-[#1e88e5] px-4 py-2 font-black text-white">📤 EXPORT SAVE</button>
                      <button onClick={() => fileInput.current?.click()} className="btn-block bg-[#6a1b9a] px-4 py-2 font-black text-white">📥 IMPORT SAVE</button>
                      <input ref={fileInput} type="file" accept="application/json,.json" className="hidden" onChange={e => { void doImportFile(e.target.files?.[0]); e.target.value = ""; }} />
                      <button onClick={() => { if (window.confirm("Start over for Jackson? This erases ALL progress.")) { setSave(resetSave()); setScreen("home"); toastMsg("Fresh adventure started!"); } }} className="btn-block bg-[#b71c1c] px-4 py-2 font-black text-white">🗑 RESET ADVENTURE</button>
                    </div>
                    <div className="mt-1 text-xs font-bold text-gray-500">Export downloads a backup file. Import checks the file first and never erases progress on a bad file.</div>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* ======= HARDCORE HUB (rules + Hall of Fame) ======= */}
          {screen === "hardcore" && (
            <motion.div key="hardcore" initial={{ opacity: 0, x: 60 }} animate={{ opacity: 1, x: 0 }} className="panel-block hc-frame overflow-hidden bg-gradient-to-b from-[#2a0d0d] to-[#0b1020] p-4" style={{ minHeight: 480 }}>
              <div className="flex items-center justify-between">
                <button onClick={() => { sfx.click(); setScreen("home"); }} className="btn-block bg-[#78909c] px-4 py-2 font-black">‹ HOME</button>
                <TopTag n="☠" label="HARDCORE MODE" color="#7f1d1d" />
                <div className="w-24 text-right text-xs font-black text-white/60">normal game<br />always safe 💛</div>
              </div>
              {save.hardcore.run ? (
                <div className="mx-auto mt-3 max-w-lg text-center">
                  <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="panel-block bg-red-950/60 p-4" style={{ borderColor: "#ef4444" }}>
                    <div className="text-2xl font-black text-red-200 text-outline">🔥 RUN IN PROGRESS</div>
                    <div className="mt-1 font-black">{stepLabel(save.hardcore.run.worldIdx, save.hardcore.run.step)}</div>
                    <div className="mx-auto mt-2 w-fit"><Hearts hp={save.hardcore.run.hearts} max={HC_MAX_HEARTS} size={22} /></div>
                    <div className="mt-2 font-black text-yellow-300">🏆 {save.hardcore.run.score.toLocaleString()} pts • 🎯 {Math.round(runAccuracy(save.hardcore.run) * 100)}% • 👑 {save.hardcore.run.bosses} bosses</div>
                    <BlockButton big color="#7f1d1d" onClick={resumeHcRun}>⚔ CONTINUE THE RUN!</BlockButton>
                    <div className="mt-2 text-xs font-bold text-white/60">Closing the game never ends a run — it waits for you here.</div>
                    {!abandonAsk ? (
                      <button onClick={() => { sfx.click(); setAbandonAsk(true); }} className="mt-1 text-xs font-black text-white/40">End this run instead?</button>
                    ) : (
                      <div className="mx-auto mt-1 max-w-xs rounded-xl border-2 border-red-400 bg-red-950/70 p-2">
                        <div className="text-xs font-black text-red-100">End this run? Normal game stays safe.</div>
                        <div className="mt-1 flex gap-2">
                          <button onClick={() => { sfx.click(); setAbandonAsk(false); }} className="btn-block flex-1 bg-[#43a047] py-1 text-xs font-black">KEEP IT</button>
                          <button onClick={abandonHcRun} className="btn-block flex-1 bg-[#b71c1c] py-1 text-xs font-black">END RUN</button>
                        </div>
                      </div>
                    )}
                  </motion.div>
                  <div className="panel-block mt-3 bg-black/50 p-3 text-left">
                    <div className="text-sm font-black tracking-widest text-orange-300">⏱ TIMER PRESSURE</div>
                    <div className="mt-1 grid grid-cols-3 gap-2">
                      {(["off", "normal", "intense"] as const).map(p => (
                        <button key={p} onClick={() => { sfx.click(); setSave(s => ({ ...s, hardcore: { ...s.hardcore, timerPressure: p } })); }} className={`rounded-xl border-[3px] px-2 py-2 text-sm font-black ${save.hardcore.timerPressure === p ? "border-orange-400 bg-orange-700" : "border-black/50 bg-black/40"}`}>
                          {p === "off" ? "😌 OFF" : p === "normal" ? "🔥 NORMAL" : "🌋 INTENSE"}
                          <span className="block text-[10px] font-bold text-white/60">{p === "off" ? "no pressure" : p === "normal" ? "enrage after 8s" : "enrage after 5s"}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mx-auto mt-3 grid max-w-2xl gap-3">
                  <div className="panel-block bg-black/55 p-4 text-center" style={{ borderColor: "#ef4444" }}>
                    <div className="text-3xl font-black text-red-200 text-outline">☠ ONE LIFE • STRONGER ENEMIES</div>
                    <div className="mt-1 font-black text-white/85">🎯 ACCURACY MATTERS • 🏆 BEAT YOUR BEST RUN</div>
                    <div className="mx-auto mt-3 grid max-w-md gap-1.5 text-left text-sm font-bold">
                      <div className="rounded-xl bg-black/40 px-3 py-1.5">❤️ You have <b>5 hearts</b> (not 10).</div>
                      <div className="rounded-xl bg-black/40 px-3 py-1.5">💥 Wrong answers <b>hurt more</b> — Creepers hit 2, Wardens 3!</div>
                      <div className="rounded-xl bg-black/40 px-3 py-1.5">🛡 Armor, 🍎 apples and 🗿 totems can <b>save your run</b>.</div>
                      <div className="rounded-xl bg-black/40 px-3 py-1.5">💀 If you fall, the run ends — but your <b>normal game is always safe</b>.</div>
                      <div className="rounded-xl bg-black/40 px-3 py-1.5">🏆 Every run is remembered. Try to beat your best!</div>
                    </div>
                    <div className="mt-3"><BlockButton big color="#7f1d1d" onClick={startHcRun}>☠ START HARDCORE RUN</BlockButton></div>
                  </div>
                  <div className="panel-block bg-black/50 p-3">
                    <div className="text-sm font-black tracking-widest text-orange-300">⏱ TIMER PRESSURE</div>
                    <div className="mt-1 grid grid-cols-3 gap-2">
                      {(["off", "normal", "intense"] as const).map(p => (
                        <button key={p} onClick={() => { sfx.click(); setSave(s => ({ ...s, hardcore: { ...s.hardcore, timerPressure: p } })); }} className={`rounded-xl border-[3px] px-2 py-2 text-sm font-black ${save.hardcore.timerPressure === p ? "border-orange-400 bg-orange-700" : "border-black/50 bg-black/40"}`}>
                          {p === "off" ? "😌 OFF" : p === "normal" ? "🔥 NORMAL" : "🌋 INTENSE"}
                          <span className="block text-[10px] font-bold text-white/60">{p === "off" ? "no pressure" : p === "normal" ? "enrage after 8s" : "enrage after 5s"}</span>
                        </button>
                      ))}
                    </div>
                    <div className="mt-1 text-[11px] font-bold text-white/60">Slow enraged enemies hit +1 heart if you then answer wrong. Thinking slowly is never punished — only wrong answers hurt.</div>
                  </div>
                </div>
              )}
              {/* HALL OF FAME */}
              <div className="mx-auto mt-3 max-w-2xl rounded-3xl border-4 border-yellow-600/70 bg-gradient-to-b from-[#2b230d] to-[#0b1020] p-4">
                <div className="text-center text-2xl font-black text-yellow-300 text-outline">🏛 HARDCORE HALL OF FAME</div>
                {save.hardcore.records.attempts === 0 && <div className="mt-1 text-center text-sm font-bold text-white/60">No runs yet — your legend starts with the first one!</div>}
                <div className="mt-2 grid grid-cols-2 gap-2 text-center md:grid-cols-4">
                  {[
                    ["🏆", String(save.hardcore.records.bestScore.toLocaleString()), "Best score"],
                    ["🌍", save.hardcore.records.bestWorldIdx >= 0 ? WORLDS[save.hardcore.records.bestWorldIdx].tag : "—", "Best world"],
                    ["👑", String(save.hardcore.records.mostBosses), "Most bosses"],
                    ["🎯", save.hardcore.records.bestAccuracyN > 0 ? `${Math.round(save.hardcore.records.bestAccuracy * 100)}%` : "—", "Best accuracy"],
                    ["🔥", String(save.hardcore.records.longestStreak), "Longest streak"],
                    ["⏱️", save.hardcore.records.fastestMs !== null ? `${Math.round(save.hardcore.records.fastestMs / 1000)}s win` : "—", "Fastest win"],
                    ["🏁", String(save.hardcore.records.completions), "Wins"],
                    ["⚔", String(save.hardcore.records.attempts), "Attempts"]
                  ].map(([ic, v, lb]) => (
                    <div key={lb} className="rounded-2xl border-2 border-yellow-700/60 bg-black/50 p-2"><div className="text-2xl">{ic}</div><div className="font-black">{v}</div><div className="text-[11px] font-bold text-white/60">{lb}</div></div>
                  ))}
                </div>
                <div className="mt-2 text-center text-sm font-black tracking-widest text-yellow-200">🏆 TROPHIES ({save.hardcore.records.trophies.length}/{HC_TROPHIES.length})</div>
                <div className="mt-1 grid grid-cols-3 gap-2 md:grid-cols-3">
                  {HC_TROPHIES.map(t => {
                    const got = save.hardcore.records.trophies.includes(t.id);
                    return <div key={t.id} title={t.desc} className={`rounded-xl border-2 p-2 text-center ${got ? "border-yellow-400 bg-yellow-900/40" : "border-black/50 bg-black/40 opacity-50"}`}><div className="text-3xl">{got ? t.icon : "🔒"}</div><div className="text-xs font-black">{got ? t.name : "???"}</div></div>;
                  })}
                </div>
              </div>
            </motion.div>
          )}

          {/* ======= HARDCORE RUN OVER / COMPLETE ======= */}
          {screen === "runover" && runSummary && (
            <motion.div key="runover" initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="panel-block hc-frame relative overflow-hidden bg-gradient-to-b from-[#2a0d0d] to-[#0b1020] p-6 text-center" style={{ minHeight: 480 }}>
              {[...Array(12)].map((_, i) => <span key={i} className="absolute text-red-300/70 anim-floaty" style={{ left: `${6 + i * 8}%`, top: `${6 + (i % 4) * 22}%`, animationDelay: `${i * 0.25}s` }}>✦</span>)}
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring" }} className="text-4xl font-black text-outline md:text-5xl" style={{ color: runCompleted ? "#ffd54f" : "#fca5a5" }}>
                {runCompleted ? "👑 HARDCORE COMPLETE!" : "☠ HARDCORE RUN OVER"}
              </motion.div>
              <div className="mt-1 font-black text-white/80">
                {runCompleted
                  ? "JACKSON BEAT THE ENTIRE CAMPAIGN! The Ender Dragon has fallen! What an awesome run!"
                  : "That was an awesome run, hero! Your normal game is totally safe. Want another try?"}
              </div>
              {lastNewBests.length > 0 && (
                <div className="mx-auto mt-2 grid w-fit gap-1">
                  {lastNewBests.map((b, i) => <motion.div key={i} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.4 + i * 0.3, type: "spring" }} className="rounded-2xl border-[3px] border-yellow-300 bg-yellow-500 px-4 py-1 font-black text-black">🎉 NEW PERSONAL BEST! {b}</motion.div>)}
                </div>
              )}
              <div className="mx-auto mt-3 grid max-w-lg grid-cols-2 gap-2 md:grid-cols-3">
                {[
                  ["🌍", WORLDS[Math.min(runSummary.worldIdx, WORLDS.length - 1)].tag, "Reached"],
                  ["👑", String(runSummary.bosses), "Bosses beaten"],
                  ["❓", String(runSummary.answered), "Questions"],
                  ["🎯", `${Math.round((runSummary.answered ? runSummary.correct / runSummary.answered : 1) * 100)}%`, "Accuracy"],
                  ["🔥", String(runSummary.bestStreak), "Best streak"],
                  ["🏆", runSummary.score.toLocaleString(), "Score"]
                ].map(([ic, v, lb]) => (
                  <div key={lb} className="panel-block bg-black/55 p-2"><div className="text-2xl">{ic}</div><div className="text-xl font-black">{v}</div><div className="text-[11px] font-bold text-white/60">{lb}</div></div>
                ))}
              </div>
              {runSummary.trophies.length > 0 && (
                <div className="mx-auto mt-2 flex max-w-lg flex-wrap justify-center gap-1.5">
                  {runSummary.trophies.map(id => {
                    const t = HC_TROPHIES.find(x => x.id === id);
                    return t ? <span key={id} title={t.desc} className="rounded-xl border-2 border-yellow-400 bg-yellow-900/50 px-2 py-1 text-sm font-black">{t.icon} {t.name}</span> : null;
                  })}
                </div>
              )}
              {runCompleted && loot.length > 0 && (
                <div className="mx-auto mt-2 max-w-lg">
                  <div className="text-sm font-black tracking-widest text-purple-300">🐉 THE DRAGON'S HOARD — claimed for the Hall of Fame!</div>
                  <div className="mt-1 flex justify-center gap-2">
                    {loot.map(id => {
                      const it = itemById(id);
                      return it ? <span key={id} title={it.name} className="grid h-14 w-14 place-items-center rounded-xl border-[3px] text-3xl anim-floaty" style={{ borderColor: RARITY_COLOR[it.rarity], background: "rgba(0,0,0,0.5)" }}>{it.icon}</span> : null;
                    })}
                  </div>
                </div>
              )}
              <div className="mt-4 flex justify-center gap-3">
                <BlockButton big color="#7f1d1d" onClick={startHcRun}>☠ TRY AGAIN!</BlockButton>
                <BlockButton color="#43a047" onClick={() => { sfx.click(); setScreen("home"); }}>🏠 NORMAL MODE</BlockButton>
              </div>
            </motion.div>
          )}

          {/* ======= SETTINGS ======= */}
          {screen === "settings" && (
            <motion.div key="set" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="panel-block mx-auto max-w-lg bg-[#141b33] p-5">
              <div className="flex items-center gap-2"><button onClick={() => { sfx.click(); setScreen("home"); }} className="btn-block bg-[#78909c] px-4 py-2 font-black">‹ HOME</button><TopTag n="⚙" label="SETTINGS" color="#78909c" /></div>
              <div className="mt-4 grid gap-2">
                {(["sound", "music"] as const).map(k => (
                  <button key={k} onClick={() => { sfx.click(); setSave(s => ({ ...s, settings: { ...s.settings, [k]: !s.settings[k] } })); }} className="panel-block flex items-center justify-between bg-black/50 p-3 font-black">
                    <span>{k === "sound" ? "🔊 Sound effects" : "🎵 Music"}</span><span className={`rounded-full px-4 py-1 ${save.settings[k] ? "bg-green-600" : "bg-gray-600"}`}>{save.settings[k] ? "ON" : "OFF"}</span>
                  </button>
                ))}
                <button onClick={() => { sfx.click(); setScreen("parent"); }} className="panel-block bg-red-900/60 p-3 font-black">👪 Grown-up area: reset, backup & maths settings</button>
                <div className="rounded-2xl bg-black/40 p-3 text-xs text-white/60">Minecraft Math is an original block-adventure inspired by voxel games. Not affiliated with Mojang/Microsoft. All art is original CSS/SVG. Progress saves on this device.</div>
              </div>
            </motion.div>
          )}

          {/* bottom nav for kids */}
          {!["battle", "prebattle", "splash"].includes(screen) && (
            <div className="mx-auto mt-3 grid max-w-3xl grid-cols-5 gap-2">
              {[["home", "🏠", "Home"], ["map", "🗺️", "Play"], ["inventory", "🎒", "Loot"], ["collection", "👾", "Mobs"], ["settings", "⚙️", "Gear"]].map(([id, ic, lb]) => (
                <button key={id} onClick={() => { sfx.click(); setScreen(id as Screen); }} className={`panel-block py-2 text-center font-black ${screen === id ? "bg-[#1e88e5]" : "bg-black/55"}`}><div className="text-2xl">{ic}</div><div className="text-xs">{lb}</div></button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
