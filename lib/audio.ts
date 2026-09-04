// Synthesized WebAudio SFX + tiny music loop. No external assets.
let ctx: AudioContext | null = null;
let musicNodes: { osc: OscillatorNode[]; gain: GainNode | null } = { osc: [], gain: null };
let musicOn = true;
let soundOn = true;

function ac(): AudioContext | null {
  try {
    if (!ctx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      ctx = new AC();
    }
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch { return null; }
}

export function setAudioPrefs(sound: boolean, music: boolean) {
  soundOn = sound; musicOn = music;
  if (!music) stopMusic(); else startMusic(currentMood ?? "adventure");
}

function tone(freq: number, dur = 0.15, type: OscillatorType = "square", vol = 0.12, when = 0, slideTo?: number) {
  if (!soundOn) return;
  const c = ac(); if (!c) return;
  const t = c.currentTime + when;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g); g.connect(c.destination);
  o.start(t); o.stop(t + dur + 0.02);
}

/** Gentle vibration on supported tablets. Never required, always guarded. */
export function buzz(pattern: number | number[]) {
  try {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(pattern);
  } catch { /* ignore */ }
}

function noiseBurst(dur = 0.3, filterFreq = 800, vol = 0.2, when = 0) {
  if (!soundOn) return;
  const c = ac(); if (!c) return;
  try {
    const t = c.currentTime + when;
    const len = Math.floor(c.sampleRate * dur);
    const buf = c.createBuffer(1, len, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = c.createBufferSource(); src.buffer = buf;
    const f = c.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = filterFreq;
    const g = c.createGain(); g.gain.value = vol;
    src.connect(f); f.connect(g); g.connect(c.destination);
    src.start(t);
  } catch { /* ignore */ }
}

export const sfx = {
  click() { tone(600, 0.07, "square", 0.08); },
  correct() { tone(523, 0.1, "square", 0.12); tone(659, 0.1, "square", 0.12, 0.09); tone(784, 0.18, "square", 0.14, 0.18); },
  wrong() { tone(220, 0.2, "sawtooth", 0.08, 0, 160); },
  swing() { tone(300, 0.12, "sawtooth", 0.1, 0, 900); },
  hit() { tone(180, 0.15, "sawtooth", 0.16, 0, 60); tone(90, 0.2, "triangle", 0.18); },
  defeat() { tone(392, 0.12, "square", 0.12); tone(523, 0.12, "square", 0.12, 0.1); tone(659, 0.12, "square", 0.12, 0.2); tone(1046, 0.3, "square", 0.14, 0.3); },
  chest() { tone(330, 0.1, "triangle", 0.12); tone(440, 0.12, "triangle", 0.12, 0.1); tone(880, 0.25, "triangle", 0.12, 0.22); },
  rare() { [523, 659, 784, 1046, 1318].forEach((f, i) => tone(f, 0.2, "triangle", 0.12, i * 0.09)); },
  levelup() { [392, 523, 659, 784, 1046, 1318].forEach((f, i) => tone(f, 0.18, "square", 0.11, i * 0.08)); },
  boss() { tone(110, 0.5, "sawtooth", 0.16, 0, 55); tone(165, 0.5, "sawtooth", 0.12, 0.15, 82); },
  coin() { tone(988, 0.08, "square", 0.1); tone(1319, 0.2, "square", 0.1, 0.07); },
  hurt() { tone(330, 0.18, "sawtooth", 0.12, 0, 180); },
  block() { tone(1200, 0.06, "square", 0.1); tone(900, 0.08, "square", 0.1, 0.06); },
  munch() { tone(220, 0.09, "square", 0.12); tone(180, 0.09, "square", 0.12, 0.1); tone(260, 0.12, "square", 0.12, 0.2); },
  crit() { tone(660, 0.08, "square", 0.13); tone(880, 0.08, "square", 0.13, 0.07); tone(1320, 0.22, "square", 0.14, 0.14); },
  boom() { noiseBurst(0.45, 500, 0.28); tone(120, 0.4, "sawtooth", 0.16, 0, 40); },
  arrow() { tone(900, 0.1, "sawtooth", 0.09, 0, 300); tone(500, 0.12, "triangle", 0.1, 0.08); },
  splash() { tone(500, 0.12, "sine", 0.12, 0, 900); tone(700, 0.14, "sine", 0.1, 0.1, 350); },
  totem() { [392, 523, 659, 784, 1046, 1318, 1568].forEach((f, i) => tone(f, 0.2, "triangle", 0.12, i * 0.08)); }
};

// ---------- background music: tiny step-sequenced chiptune ----------
export type MusicMood = "adventure" | "boss" | "victory";
let musicTimer: number | null = null;
let currentMood: MusicMood | null = null;
let musicBus: GainNode | null = null;
let seqStep = 0;
let nextNoteTime = 0;

// 16-step loops, MIDI notes (0 = rest)
const LEAD: Record<MusicMood, number[]> = {
  adventure: [72, 76, 79, 76, 81, 79, 76, 0, 72, 76, 79, 81, 79, 76, 74, 0],
  boss: [64, 0, 64, 64, 0, 63, 0, 62, 64, 0, 64, 64, 0, 67, 0, 66],
  victory: [72, 76, 79, 84, 79, 76, 77, 81, 79, 76, 74, 76, 72, 0, 67, 0]
};
const BASS: Record<MusicMood, number[]> = {
  adventure: [48, 0, 0, 0, 53, 0, 0, 0, 45, 0, 0, 0, 43, 0, 55, 0],
  boss: [40, 40, 40, 40, 48, 48, 48, 48, 50, 50, 50, 50, 47, 47, 47, 47],
  victory: [48, 0, 0, 0, 53, 0, 0, 0, 55, 0, 0, 0, 48, 0, 43, 0]
};
const TEMPO: Record<MusicMood, number> = { adventure: 132, boss: 152, victory: 120 };

function midi(m: number): number {
  return 440 * Math.pow(2, (m - 69) / 12);
}

function musicNote(freq: number, t: number, dur: number, type: OscillatorType, vol: number) {
  const c = ctx; if (!c || !musicBus) return;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(musicBus);
  o.start(t); o.stop(t + dur + 0.05);
}

function musicHat(t: number) {
  const c = ctx; if (!c || !musicBus) return;
  const len = Math.floor(c.sampleRate * 0.04);
  const buf = c.createBuffer(1, len, c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = c.createBufferSource(); src.buffer = buf;
  const f = c.createBiquadFilter(); f.type = "highpass"; f.frequency.value = 6000;
  const g = c.createGain(); g.gain.value = 0.12;
  src.connect(f); f.connect(g); g.connect(musicBus);
  src.start(t);
}

function scheduleStep(mood: MusicMood, s: number, t: number) {
  const stepDur = 60 / TEMPO[mood] / 4;
  const lead = LEAD[mood][s % 16];
  const bass = BASS[mood][s % 16];
  if (lead) musicNote(midi(lead), t, stepDur * 1.8, "square", 0.32);
  if (bass) musicNote(midi(bass), t, stepDur * 3.2, "triangle", 0.5);
  if (s % 2 === 1) musicHat(t);
}

export function startMusic(mood: MusicMood = "adventure") {
  if (!musicOn) { currentMood = mood; return; }
  const c = ac(); if (!c) return;
  try {
    if (!musicBus) {
      musicBus = c.createGain();
      musicBus.gain.value = 0.055;
      musicBus.connect(c.destination);
    }
    if (musicTimer !== null && currentMood === mood) return; // already playing this theme
    stopMusicTimer();
    currentMood = mood;
    seqStep = 0;
    nextNoteTime = c.currentTime + 0.08;
    musicTimer = window.setInterval(() => {
      if (!ctx) return;
      while (nextNoteTime < ctx.currentTime + 0.3) {
        scheduleStep(mood, seqStep, nextNoteTime);
        nextNoteTime += 60 / TEMPO[mood] / 4;
        seqStep = (seqStep + 1) % 64; // 4 bars then loop
      }
    }, 80);
  } catch { /* ignore */ }
}

function stopMusicTimer() {
  if (musicTimer !== null) { clearInterval(musicTimer); musicTimer = null; }
}

export function stopMusic() {
  stopMusicTimer();
  currentMood = null;
}
