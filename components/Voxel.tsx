"use client";
import { motion } from "framer-motion";
import { MobDef } from "@/lib/types";
import { PIXEL_MOBS } from "./pixel-mobs";
import { PIXEL_WEAPONS } from "./pixel-weapons";

/* ---------- Jackson hero: friendly blocky kid, original art ---------- */
export function JacksonHero({ size = 200, weapon = "🗡️", weaponId, armorGlint = false, mood = "happy", pet, hat, attacking = false }: { size?: number; weapon?: string; weaponId?: string | null; armorGlint?: boolean; mood?: "happy" | "hurt" | "win"; pet?: string | null; hat?: string | null; attacking?: boolean }) {
  const s = size / 200;
  const swordArt = weaponId ? PIXEL_WEAPONS[weaponId] : undefined;
  const swpx = 9 * s;
  return (
    <div className="relative" style={{ width: size, height: size * 1.18 }}>
      {/* shadow */}
      <div className="absolute bottom-1 left-1/2 -translate-x-1/2 rounded-[50%] bg-black/40" style={{ width: size * 0.6, height: 18 * s, filter: "blur(4px)" }} />
      <div className="absolute inset-0 anim-idle">
        {/* legs */}
        <div className="absolute flex gap-1" style={{ bottom: 14 * s, left: "50%", transform: "translateX(-50%)" }}>
          {[0, 1].map(i => (
            <div key={i} style={{ width: 34 * s, height: 52 * s, background: "linear-gradient(180deg,#2e4a8a,#1b2c5e)", border: "3px solid rgba(0,0,0,0.55)", borderRadius: 6 * s, boxShadow: "inset 3px 0 0 rgba(255,255,255,0.25)" }} />
          ))}
        </div>
        {/* boots */}
        <div className="absolute flex gap-1" style={{ bottom: 2 * s, left: "50%", transform: "translateX(-50%)" }}>
          {[0, 1].map(i => (
            <div key={i} style={{ width: 38 * s, height: 20 * s, background: "linear-gradient(180deg,#7a5230,#4a2f18)", border: "3px solid rgba(0,0,0,0.55)", borderRadius: 5 * s }} />
          ))}
        </div>
        {/* torso - teal shirt */}
        <div className="absolute" style={{ bottom: 62 * s, left: "50%", transform: "translateX(-50%)", width: 96 * s, height: 72 * s, background: "linear-gradient(180deg,#2fb3c7 0%,#1d7f93 60%,#14606f 100%)", border: "3px solid rgba(0,0,0,0.55)", borderRadius: 8 * s, boxShadow: "inset 4px 0 0 rgba(255,255,255,0.3), inset -4px 0 0 rgba(0,0,0,0.2)" }}>
          {/* belt + strap */}
          <div className="absolute" style={{ bottom: 8 * s, left: 0, right: 0, height: 12 * s, background: "#5d4037", borderTop: "2px solid rgba(0,0,0,0.5)" }}>
            <div className="absolute left-1/2 -translate-x-1/2" style={{ top: 1 * s, width: 14 * s, height: 9 * s, background: "#ffca28", border: "2px solid #5d4037", borderRadius: 2 }} />
          </div>
          <div className="absolute" style={{ top: -2 * s, width: 16 * s, height: 66 * s, left: 30 * s, background: "linear-gradient(180deg,#6d4c41,#4e342e)", transform: "rotate(18deg)", border: "2px solid rgba(0,0,0,0.5)", borderRadius: 4 }} />
          {armorGlint && <div className="absolute inset-0 rounded" style={{ background: "linear-gradient(115deg,transparent 30%,rgba(150,230,255,0.55) 45%,transparent 60%)" }} />}
        </div>
        {/* arms */}
        <div className="absolute" style={{ bottom: 66 * s, left: `calc(50% - ${66 * s}px)`, width: 28 * s, height: 56 * s, background: "linear-gradient(180deg,#f0b98a,#d99a68)", border: "3px solid rgba(0,0,0,0.55)", borderRadius: 6 * s }}>
          <div style={{ height: 22 * s, background: "#27a0b3", borderBottom: "3px solid rgba(0,0,0,0.5)", borderRadius: `6px 6px 0 0` }} />
        </div>
        <div className="absolute" style={{ bottom: 66 * s, left: `calc(50% + ${38 * s}px)`, width: 28 * s, height: 56 * s, background: "linear-gradient(180deg,#f0b98a,#d99a68)", border: "3px solid rgba(0,0,0,0.55)", borderRadius: 6 * s }}>
          <div style={{ height: 22 * s, background: "#27a0b3", borderBottom: "3px solid rgba(0,0,0,0.5)", borderRadius: `6px 6px 0 0` }} />
        </div>
        {/* sword gripped in right hand */}
        <div className="absolute" style={{ bottom: 62 * s, left: `calc(50% + ${32 * s}px)`, transform: "rotate(-28deg)", transformOrigin: "50% 88%", animation: attacking ? "swing-sword 0.45s ease" : undefined, filter: swordArt?.glow ? `drop-shadow(0 0 ${8 * s}px ${swordArt.glow}) drop-shadow(2px 2px 0 rgba(0,0,0,0.4))` : "drop-shadow(3px 3px 0 rgba(0,0,0,0.4))" }}>
          {swordArt ? (
            <div style={{ display: "grid", gridTemplateColumns: `repeat(5, ${swpx}px)`, imageRendering: "pixelated" }}>
              {swordArt.rows.flatMap((row, y) =>
                row.split("").map((ch, x) => {
                  if (ch === ".") return <div key={`${x}-${y}`} style={{ width: swpx, height: swpx }} />;
                  return <div key={`${x}-${y}`} style={{ width: swpx, height: swpx, background: swordArt.pal[ch] ?? "#ff00ff" }} />;
                })
              )}
            </div>
          ) : (
            <div style={{ fontSize: 44 * s }}>{weapon}</div>
          )}
        </div>
        {/* head */}
        <div className="absolute" style={{ bottom: 130 * s, left: "50%", transform: "translateX(-50%)", width: 92 * s, height: 84 * s, background: "linear-gradient(180deg,#ffcf9e 0%,#f0b98a 55%,#df9f6d 100%)", border: "3px solid rgba(0,0,0,0.55)", borderRadius: 10 * s, boxShadow: "inset 4px 0 0 rgba(255,255,255,0.35)" }}>
          {/* hair */}
          <div className="absolute" style={{ top: -6 * s, left: -4 * s, right: -4 * s, height: 34 * s, background: "linear-gradient(180deg,#6d4c41,#4e2f1d)", border: "3px solid rgba(0,0,0,0.55)", borderRadius: 10 * s }}>
            <div className="absolute flex gap-1" style={{ bottom: -6 * s, left: 8 * s }}>
              {[0, 1, 2, 3].map(i => <div key={i} style={{ width: 12 * s, height: 12 * s, background: "#4e2f1d", borderRadius: 2 }} />)}
            </div>
          </div>
          {/* eyes */}
          <div className="absolute flex" style={{ top: 40 * s, left: 0, right: 0, justifyContent: "center", gap: 14 * s }}>
            {[0, 1].map(i => (
              <div key={i} className="relative" style={{ width: 18 * s, height: 20 * s, background: "#fff", border: "2px solid rgba(0,0,0,0.6)", borderRadius: 3 }}>
                <div className="absolute" style={{ width: 10 * s, height: 13 * s, background: "#1a56db", left: 2 * s, top: 2 * s, borderRadius: 2 }}>
                  <div className="absolute bg-white rounded-full" style={{ width: 4 * s, height: 4 * s, left: 1 * s, top: 1 * s }} />
                  <div className="absolute bg-black rounded-full" style={{ width: 5 * s, height: 7 * s, left: 2 * s, top: 4 * s }} />
                </div>
              </div>
            ))}
          </div>
          {/* cheeks + smile */}
          <div className="absolute rounded-full" style={{ left: 8 * s, top: 58 * s, width: 12 * s, height: 8 * s, background: "rgba(255,120,120,0.55)" }} />
          <div className="absolute rounded-full" style={{ right: 8 * s, top: 58 * s, width: 12 * s, height: 8 * s, background: "rgba(255,120,120,0.55)" }} />
          <div className="absolute" style={{ left: "50%", transform: "translateX(-50%)", top: 62 * s, width: mood === "hurt" ? 14 * s : 30 * s, height: mood === "hurt" ? 8 * s : 14 * s, background: mood === "win" ? "#7a2d12" : "#8d3b1c", borderRadius: mood === "hurt" ? 99 : "0 0 99px 99px", border: "2px solid rgba(0,0,0,0.4)" }}>
            {mood !== "hurt" && <div className="mx-auto bg-white" style={{ width: 22 * s, height: 5 * s, borderRadius: 99, marginTop: 1 }} />}
          </div>
        </div>
        {/* wearable hat / mob head */}
        {hat && (
          <div className="absolute" style={{ bottom: 192 * s, left: 0, right: 0, textAlign: "center", fontSize: 46 * s, filter: "drop-shadow(3px 3px 0 rgba(0,0,0,0.4))", pointerEvents: "none" }}>
            <span className="anim-floaty" style={{ display: "inline-block", transform: "rotate(-8deg)" }}>{hat}</span>
          </div>
        )}
      </div>
      {pet && (
        <div className="absolute anim-floaty" style={{ right: -14 * s, bottom: 0, fontSize: 40 * s, filter: "drop-shadow(2px 3px 0 rgba(0,0,0,0.4))" }}>{pet}</div>
      )}
    </div>
  );
}

/* ---------- Faithful pixel-art mobs (hand-drawn homage) ---------- */
export function MobSprite({ mob, size = 170, hurt = false, attacking = false }: { mob: MobDef; size?: number; hurt?: boolean; attacking?: boolean }) {
  const c = mob.colors;
  const art = PIXEL_MOBS[mob.id];
  const s = size / 170;
  const flash = hurt ? "brightness(2.2) saturate(0.3)" : "none";
  const px = art ? size / art.w : 8;
  return (
    <motion.div
      animate={attacking ? { x: [-0, -26 * s, 10, 0], rotate: [0, -6, 4, 0] } : hurt ? { x: [0, 18 * s, -8, 0], rotate: [0, 8, -4, 0] } : { y: [0, -8 * s, 0] }}
      transition={attacking || hurt ? { duration: 0.45 } : { duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
      className="relative flex flex-col items-center justify-end"
      style={{ width: size, height: size * 1.05, filter: flash }}
    >
      {art ? (
        <div className="relative" style={{ marginBottom: 10 * s }}>
          <div style={{ display: "grid", gridTemplateColumns: `repeat(${art.w}, ${px}px)`, imageRendering: "pixelated", filter: "drop-shadow(3px 0 0 rgba(0,0,0,0.5)) drop-shadow(-3px 0 0 rgba(0,0,0,0.5)) drop-shadow(0 3px 0 rgba(0,0,0,0.5)) drop-shadow(0 -3px 0 rgba(0,0,0,0.5))" }}>
            {art.rows.flatMap((row, y) =>
              row.split("").map((ch, x) => {
                if (ch === ".") return <div key={`${x}-${y}`} style={{ width: px, height: px }} />;
                const col = art.pal[ch] ?? "#ff00ff";
                const gl = art.glow?.includes(ch);
                return <div key={`${x}-${y}`} style={{ width: px, height: px, background: col, boxShadow: gl ? `0 0 ${Math.max(5, px)}px ${col}` : undefined }} />;
              })
            )}
          </div>
          <div className="mx-auto rounded-[50%] bg-black/45" style={{ width: size * 0.62, height: 14 * s, filter: "blur(5px)", marginTop: 6 * s }} />
        </div>
      ) : (
        <div className="absolute bottom-1 left-1/2 -translate-x-1/2 rounded-[50%] bg-black/45" style={{ width: size * 0.62, height: 16 * s, filter: "blur(5px)" }} />
      )}
      {/* classic CSS bodies below are fallback only (every mob has pixel art) */}
      {art ? null : mob.shape === "grub" ? (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2" style={{ width: 110 * s, height: 130 * s, background: `linear-gradient(180deg,${c.light},${c.body} 45%,${c.dark})`, border: "4px solid rgba(0,0,0,0.55)", borderRadius: 14 * s, boxShadow: "inset 5px 0 0 rgba(255,255,255,0.25)" }}>
          <div className="absolute grid grid-cols-4 gap-1" style={{ top: 34 * s, left: 14 * s, right: 14 * s }}>
            <div style={{ gridColumn: "1/3", height: 26 * s, background: "#0e2410", borderRadius: 4, border: "2px solid rgba(0,0,0,0.5)" }} />
            <div style={{ gridColumn: "3/5", height: 26 * s, background: "#0e2410", borderRadius: 4, border: "2px solid rgba(0,0,0,0.5)" }} />
            <div style={{ gridColumn: "2/4", height: 22 * s, background: "#0e2410", borderRadius: 4, marginTop: 4 }} />
          </div>
          {/* pixel spots */}
          {[0, 1, 2].map(i => <div key={i} className="absolute" style={{ width: 16 * s, height: 16 * s, background: c.dark, opacity: 0.7, borderRadius: 3, left: (12 + i * 34) * s, bottom: (10 + (i % 2) * 22) * s }} />)}
          <div className="absolute flex gap-2" style={{ bottom: -12 * s, left: 12 * s, right: 12 * s }}>
            {[0, 1].map(i => <div key={i} style={{ flex: 1, height: 18 * s, background: c.dark, border: "3px solid rgba(0,0,0,0.55)", borderRadius: 5 }} />)}
          </div>
        </div>
      ) : mob.shape === "zombie" ? (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
          <div style={{ width: 96 * s, height: 70 * s, margin: "0 auto", background: `linear-gradient(180deg,${c.light},${c.body} 60%,${c.dark})`, border: "4px solid rgba(0,0,0,0.55)", borderRadius: 12 * s }}>
            <div className="flex justify-center gap-4" style={{ marginTop: 18 * s }}>
              <div style={{ width: 20 * s, height: 22 * s, background: "#0d1f16", borderRadius: 4 }}><div style={{ width: 8 * s, height: 8 * s, background: "#7CFC00", margin: "4px auto", borderRadius: 99 }} /></div>
              <div style={{ width: 20 * s, height: 22 * s, background: "#0d1f16", borderRadius: 4 }}><div style={{ width: 8 * s, height: 8 * s, background: "#7CFC00", margin: "4px auto", borderRadius: 99 }} /></div>
            </div>
            <div style={{ width: 34 * s, height: 10 * s, background: "#0d1f16", margin: "8px auto", borderRadius: 4 }} />
          </div>
          <div style={{ width: 110 * s, height: 60 * s, margin: "4px auto", background: "linear-gradient(180deg,#3a6fd8,#1e3f8f)", border: "4px solid rgba(0,0,0,0.55)", borderRadius: 10 * s }} />
        </div>
      ) : mob.shape === "skeleton" || mob.shape === "wither" ? (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
          <div style={{ width: 90 * s, height: 84 * s, margin: "0 auto", background: `linear-gradient(180deg,${c.light},${c.body})`, border: "4px solid rgba(0,0,0,0.55)", borderRadius: 12 * s }}>
            <div className="flex justify-center gap-5" style={{ marginTop: 22 * s }}>
              {[0, 1].map(i => <div key={i} style={{ width: 20 * s, height: 24 * s, background: "#111", borderRadius: 6 }} />)}
            </div>
            <div className="flex justify-center gap-1" style={{ marginTop: 8 * s }}>
              {[0, 1, 2, 3].map(i => <div key={i} style={{ width: 10 * s, height: 12 * s, background: "#fff", border: "2px solid #111", borderRadius: 2 }} />)}
            </div>
          </div>
          <div style={{ width: 34 * s, height: 50 * s, margin: "2px auto", background: c.body, border: "4px solid rgba(0,0,0,0.55)", borderRadius: 6 }} />
        </div>
      ) : mob.shape === "spider" ? (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2">
          <div className="flex justify-center gap-1" style={{ marginBottom: -8 * s }}>
            {[0, 1, 2].map(i => <div key={i} style={{ width: 16 * s, height: 16 * s, background: c.eye, borderRadius: 99, border: "2px solid #000" }} />)}
          </div>
          <div style={{ width: 130 * s, height: 80 * s, background: `radial-gradient(circle at 50% 30%,${c.light},${c.body} 55%,${c.dark})`, border: "4px solid rgba(0,0,0,0.6)", borderRadius: 99 }}>
            <div className="flex justify-center gap-2" style={{ marginTop: 26 * s }}>
              {[0, 1].map(i => <div key={i} style={{ width: 22 * s, height: 26 * s, background: c.eye, borderRadius: 99, border: "3px solid #000" }} />)}
            </div>
          </div>
          <div className="flex justify-between" style={{ marginTop: -30 * s }}>
            {[0, 1].map(side => (
              <div key={side} className="flex gap-1">
                {[0, 1, 2].map(i => <div key={i} style={{ width: 10 * s, height: 44 * s, background: c.dark, border: "2px solid #000", borderRadius: 6, transform: `rotate(${side ? 24 : -24}deg)` }} />)}
              </div>
            ))}
          </div>
        </div>
      ) : mob.shape === "magma" ? (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
          <div style={{ width: 140 * s, height: 130 * s, background: `linear-gradient(180deg,${c.light} 0%,${c.body} 40%,${c.dark} 100%)`, border: "4px solid rgba(0,0,0,0.6)", borderRadius: 18 * s, boxShadow: "0 0 30px rgba(255,87,34,0.6)" }}>
            <div className="flex justify-center gap-6" style={{ marginTop: 30 * s }}>
              {[0, 1].map(i => <div key={i} style={{ width: 24 * s, height: 20 * s, background: c.eye, borderRadius: 4, boxShadow: "0 0 12px #ffea00", border: "2px solid #000" }} />)}
            </div>
            <div style={{ width: 60 * s, height: 26 * s, margin: "10px auto", background: "linear-gradient(180deg,#ffea00,#ff5722)", borderRadius: 8, border: "3px solid #000", boxShadow: "0 0 16px #ff5722" }} />
            {/* lava cracks */}
            <div className="absolute" style={{ inset: 8 * s, background: "repeating-linear-gradient(115deg,transparent 0 14px,rgba(255,150,50,0.35) 14px 16px)", borderRadius: 14 * s }} />
          </div>
        </div>
      ) : mob.shape === "chicken" ? (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2" style={{ width: 96 * s, height: 104 * s, background: "linear-gradient(180deg,#fff,#cfcfcf)", border: "4px solid rgba(0,0,0,0.55)", borderRadius: 14 * s }}>
          <div style={{ width: 34 * s, height: 18 * s, background: "#ff1744", margin: "2px auto", borderRadius: 6, border: "2px solid rgba(0,0,0,0.4)" }} />
          <div className="flex justify-center gap-3" style={{ marginTop: 8 * s }}>
            {[0, 1].map(i => <div key={i} style={{ width: 16 * s, height: 18 * s, background: "#222", borderRadius: 4 }} />)}
          </div>
          <div style={{ width: 0, height: 0, margin: "4px auto", borderLeft: `${12 * s}px solid transparent`, borderRight: `${12 * s}px solid transparent`, borderTop: `${14 * s}px solid #ff9800` }} />
        </div>
      ) : mob.shape === "slime" ? (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2" style={{ width: 130 * s, height: 100 * s, background: `linear-gradient(180deg,${c.light},${c.body})`, opacity: 0.95, border: "4px solid rgba(0,0,0,0.4)", borderRadius: "40px 40px 18px 18px", boxShadow: "inset 0 -14px 0 rgba(0,0,0,0.12)" }}>
          <div className="flex justify-center gap-8" style={{ marginTop: 30 * s }}>
            {[0, 1].map(i => <div key={i} style={{ width: 20 * s, height: 28 * s, background: "#0b3d2e", borderRadius: 8 }} />)}
          </div>
          <div style={{ width: 30 * s, height: 12 * s, background: "#0b3d2e", margin: "6px auto", borderRadius: 99 }} />
        </div>
      ) : mob.shape === "dragon" ? (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2" style={{ width: 170 * s, height: 140 * s }}>
          <div style={{ width: 120 * s, height: 100 * s, margin: "0 auto", background: `linear-gradient(180deg,${c.light},${c.body} 60%,${c.dark})`, border: "4px solid rgba(0,0,0,0.6)", borderRadius: 18 * s }}>
            <div className="flex justify-center gap-4" style={{ marginTop: 26 * s }}>
              {[0, 1].map(i => <div key={i} style={{ width: 24 * s, height: 22 * s, background: c.eye, borderRadius: 6, border: "2px solid #000", boxShadow: "0 0 10px #ffeb3b" }} />)}
            </div>
            <div className="flex justify-center gap-1" style={{ marginTop: 8 * s }}>
              {[0, 1, 2, 3, 4].map(i => <div key={i} style={{ width: 0, height: 0, borderLeft: `${7 * s}px solid transparent`, borderRight: `${7 * s}px solid transparent`, borderBottom: `${12 * s}px solid #fff` }} />)}
            </div>
          </div>
          <div className="flex justify-between" style={{ marginTop: -70 * s }}>
            {[0, 1].map(k => <div key={k} style={{ width: 50 * s, height: 70 * s, background: c.dark, clipPath: "polygon(100% 0, 0 40%, 80% 100%)", opacity: 0.95, transform: k ? "scaleX(-1)" : "none" }} />)}
          </div>
        </div>
      ) : (
        /* generic humanoid (enderman/witch/warden/drowned/blaze) */
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
          <div style={{ width: 100 * s, height: 84 * s, margin: "0 auto", background: `linear-gradient(180deg,${c.light},${c.body} 55%,${c.dark})`, border: "4px solid rgba(0,0,0,0.6)", borderRadius: 12 * s }}>
            <div className="flex justify-center gap-5" style={{ marginTop: 26 * s }}>
              {[0, 1].map(i => <div key={i} style={{ width: 22 * s, height: 14 * s, background: c.eye, borderRadius: 4, boxShadow: `0 0 10px ${c.eye}`, border: "2px solid #000" }} />)}
            </div>
            {(mob.shape === "witch") && <div style={{ width: 70 * s, height: 34 * s, margin: "-64px auto 0", background: "#212121", clipPath: "polygon(50% 0, 100% 100%, 0 100%)", border: "2px solid #000" }} />}
          </div>
          <div style={{ width: 70 * s, height: 56 * s, margin: "4px auto", background: `linear-gradient(180deg,${c.body},${c.dark})`, border: "4px solid rgba(0,0,0,0.6)", borderRadius: 8 * s }} />
        </div>
      )}
      {/* level badge glow when boss */}
      {mob.hp >= 100 && <div className="absolute -top-2 left-1/2 -translate-x-1/2 text-2xl anim-floaty">👑</div>}
    </motion.div>
  );
}

export function HealthBar({ hp, max, color = "#e53935", h = 14 }: { hp: number; max: number; color?: string; h?: number }) {
  const pct = Math.max(0, Math.min(100, (hp / max) * 100));
  return (
    <div className="relative w-full overflow-hidden rounded-full border-2 border-black/60 bg-black/60" style={{ height: h }}>
      <motion.div className="h-full rounded-full" animate={{ width: `${pct}%` }} transition={{ type: "spring", stiffness: 120, damping: 20 }}
        style={{ background: `linear-gradient(180deg, ${color} 0%, ${color} 55%, rgba(0,0,0,0.4) 100%)`, boxShadow: "inset 0 2px 0 rgba(255,255,255,0.5)" }} />
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="h-full w-1/3 bg-white/30" style={{ animation: "bar-shine 2.2s linear infinite" }} />
      </div>
    </div>
  );
}

export function NumberLine({ from, to, start, end }: { from: number; to: number; start: number; end: number }) {
  const ticks = [];
  for (let v = from; v <= to && ticks.length < 16; v++) ticks.push(v);
  const span = Math.max(1, to - from);
  const pct = (v: number) => `${((v - from) / span) * 100}%`;
  return (
    <div className="mx-auto mt-2 max-w-md rounded-2xl border-[3px] border-black/40 bg-black/30 p-3">
      <div className="text-xs font-black tracking-widest text-white/80">HOP ALONG THE NUMBER LINE</div>
      <div className="relative mt-4 px-2 pb-6">
        <div className="absolute left-2 right-2 top-1/2 h-2 -translate-y-1/2 rounded-full bg-white/25" />
        <div className="absolute top-1/2 h-2 -translate-y-1/2 rounded-full bg-green-400" style={{ left: pct(Math.min(start, end)), right: `calc(100% - ${pct(Math.max(start, end))})` }} />
        {ticks.map(v => (
          <div key={v} className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 text-center" style={{ left: pct(v) }}>
            <div className={`mx-auto rounded-full border-2 border-black/50 ${v === start || v === end ? "h-5 w-5 bg-yellow-300" : "h-3.5 w-3.5 bg-white/70"}`} />
            <div className="mt-4 text-[11px] font-black">{v}</div>
          </div>
        ))}
        <div className="absolute -top-5 rounded-lg bg-yellow-400 px-2 text-xs font-black text-black" style={{ left: pct(start), transform: "translateX(-50%)" }}>START {start}</div>
      </div>
    </div>
  );
}

export function BlockButton({ children, onClick, color, big, disabled }: { children: React.ReactNode; onClick?: () => void; color: string; big?: boolean; disabled?: boolean }) {
  return (
    <button disabled={disabled} onClick={onClick} className="btn-block font-black text-white text-outline-sm"
      style={{ background: `linear-gradient(180deg, ${color} 0%, ${color} 55%, rgba(0,0,0,0.35) 130%)`, fontSize: big ? 26 : 20, padding: big ? "14px 28px" : "10px 18px", minHeight: 56, letterSpacing: 0.5 }}>
      {children}
    </button>
  );
}
