import { ItemDef, MobDef, WorldDef } from "./types";

export const RARITY_COLOR: Record<string, string> = {
  Common: "#9e9e9e",
  Uncommon: "#4caf50",
  Rare: "#2196f3",
  Epic: "#9c27b0",
  Legendary: "#ff9800"
};

export const MOBS: MobDef[] = [
  { id: "chicken", name: "Chicken", short: "Chicken", level: 1, hp: 20, difficulty: "EASY", tables: "TIMES 1–2", shape: "chicken", colors: { body: "#f5f5f5", dark: "#cfcfcf", light: "#ffffff", eye: "#222", accent: "#ff9800" }, loot: ["wooden_sword", "leather_tunic"], xp: 8, coins: 6, attack: 1, style: "bonk", blurb: "Peck!" },
  { id: "grub", name: "Creeper", short: "Creeper", level: 3, hp: 30, difficulty: "EASY", tables: "TIMES TABLES 1–5", shape: "grub", colors: { body: "#5ac73c", dark: "#35822a", light: "#8fe86f", eye: "#12330f", accent: "#1e5b1a" }, loot: ["wooden_sword", "creeper_card"], xp: 10, coins: 10, attack: 3, style: "boom", blurb: "Hiss… BOOM!" },
  { id: "zombie", name: "Zombie", short: "Zombie", level: 4, hp: 40, difficulty: "EASY", tables: "TIMES TABLES 2–6", shape: "zombie", colors: { body: "#4caf7d", dark: "#2e6b4e", light: "#7fe0a8", eye: "#10231a", accent: "#5d4037" }, loot: ["stone_sword", "zombie_card", "leather_tunic"], xp: 14, coins: 14, attack: 1, style: "bonk", blurb: "Zombie Claw!" },
  { id: "skeleton", name: "Skeleton", short: "Skeleton", level: 6, hp: 55, difficulty: "MEDIUM", tables: "TIMES TABLES 3–8", shape: "skeleton", colors: { body: "#e8e4d8", dark: "#a8a49a", light: "#ffffff", eye: "#222", accent: "#795548" }, loot: ["bow_basic", "iron_sword", "parrot_pet"], xp: 20, coins: 20, attack: 1, style: "arrow", blurb: "Bone Arrow!" },
  { id: "spider", name: "Spider", short: "Spider", level: 8, hp: 70, difficulty: "HARD", tables: "MULTI-STEP EQUATIONS", shape: "spider", colors: { body: "#33261c", dark: "#17100b", light: "#5d4a38", eye: "#ff1744", accent: "#000" }, loot: ["iron_pick", "spider_trophy", "fox_pet"], xp: 26, coins: 26, attack: 1, style: "fast", blurb: "Speedy Bite!" },
  { id: "slime", name: "Slime", short: "Slime", level: 5, hp: 45, difficulty: "EASY", tables: "ADD + SUB 1–20", shape: "slime", colors: { body: "#6abe30", dark: "#3d7a1e", light: "#a5e06a", eye: "#0b3d2e", accent: "#0b3d2e" }, loot: ["slime_pet", "stone_pick"], xp: 15, coins: 15, attack: 1, style: "bonk", blurb: "Squish Slam!" },
  { id: "wither", name: "Wither Skeleton", short: "Wither Skeleton", level: 7, hp: 60, difficulty: "MEDIUM", tables: "TIMES 4–9", shape: "wither", colors: { body: "#2b2b2b", dark: "#0d0d0d", light: "#555555", eye: "#e8e4d8", accent: "#000" }, loot: ["iron_sword", "wither_skull"], xp: 22, coins: 22, attack: 2, style: "bonk", blurb: "Dark Slash!" },
  { id: "drowned", name: "Drowned", short: "Drowned", level: 9, hp: 80, difficulty: "MEDIUM", tables: "DIVISION 2–10", shape: "drowned", colors: { body: "#4db6ac", dark: "#276b66", light: "#9df0e7", eye: "#0a2e2b", accent: "#01579b" }, loot: ["trident_tool", "axolotl_pet"], xp: 28, coins: 30, attack: 1, style: "bonk", blurb: "Trident Poke!" },
  { id: "enderman", name: "Enderman", short: "Enderman", level: 11, hp: 100, difficulty: "HARD", tables: "MISSING NUMBER", shape: "enderman", colors: { body: "#1a1a24", dark: "#000", light: "#3d3d5c", eye: "#e040fb", accent: "#e040fb" }, loot: ["diamond_sword", "ender_gem"], xp: 36, coins: 40, attack: 2, style: "teleport", blurb: "Teleport Strike!" },
  { id: "blaze", name: "Blaze", short: "Blaze", level: 15, hp: 120, difficulty: "EXPERT", tables: "MULTI-STEP WORD PROBLEMS", shape: "magma", colors: { body: "#3a3a3a", dark: "#141414", light: "#6d6d6d", eye: "#ffea00", accent: "#ff9800" }, loot: ["enchant_fire", "blaze_trophy"], xp: 50, coins: 60, attack: 2, style: "fire", blurb: "Fireball!" },
  { id: "witch", name: "Witch", short: "Witch", level: 12, hp: 105, difficulty: "HARD", tables: "WORD PROBLEMS", shape: "witch", colors: { body: "#6a1b9a", dark: "#3c0d5a", light: "#ab47bc", eye: "#76ff03", accent: "#212121" }, loot: ["witch_hat", "enchant_sharp"], xp: 40, coins: 45, attack: 2, style: "splash", blurb: "Splash Potion!" },
  { id: "warden", name: "Warden", short: "Warden", level: 18, hp: 160, difficulty: "EXPERT", tables: "MIXED MASTERY", shape: "warden", colors: { body: "#0d3b4f", dark: "#061e29", light: "#26a0be", eye: "#b2ff59", accent: "#002" }, loot: ["netherite_sword", "warden_heart"], xp: 65, coins: 80, attack: 3, style: "sonic", blurb: "SONIC BOOM!" },
  { id: "dragon", name: "Ender Dragon", short: "Ender Dragon", level: 20, hp: 220, difficulty: "EXPERT", tables: "BOSS: ALL SKILLS", shape: "dragon", colors: { body: "#3a2d5c", dark: "#1d1533", light: "#7c6bb0", eye: "#ffeb3b", accent: "#ce93d8" }, loot: ["dragon_sword", "dragon_egg", "dragon_pet"], xp: 120, coins: 150, attack: 2, style: "fire", blurb: "Dragon Fire!" }
];

export const WORLDS: WorldDef[] = [
  { id: "green", num: 1, name: "1. GREEN FIELDS", tag: "Grasslands", difficulty: "EASY", range: "1–3", grad: "linear-gradient(180deg,#3fa7f5 0%,#7ed957 55%,#3d9b3d 100%)", ground: "#5ac73c", sky: "#3fa7f5", mobs: ["chicken", "grub", "zombie"], boss: "zombie", stars: 9 },
  { id: "sandy", num: 2, name: "2. SANDY DUNES", tag: "Desert", difficulty: "EASY", range: "1–3", grad: "linear-gradient(180deg,#4aa8f0 0%,#ffe082 55%,#e6a94e 100%)", ground: "#e6c25a", sky: "#4aa8f0", mobs: ["zombie", "skeleton", "wither"], boss: "wither", stars: 9 },
  { id: "frost", num: 3, name: "3. FROST PEAKS", tag: "Frozen", difficulty: "MEDIUM", range: "4–6", grad: "linear-gradient(180deg,#2b6cb0 0%,#bee3f8 60%,#e2e8f0 100%)", ground: "#dfeefc", sky: "#2b6cb0", mobs: ["skeleton", "slime", "drowned"], boss: "drowned", stars: 9 },
  { id: "caves", num: 4, name: "4. DARK CAVES", tag: "Cave", difficulty: "HARD", range: "7–9", grad: "linear-gradient(180deg,#1a1033 0%,#4a2b7a 55%,#12071f 100%)", ground: "#4a2b7a", sky: "#1a1033", mobs: ["spider", "wither", "enderman"], boss: "enderman", stars: 9 },
  { id: "volcano", num: 5, name: "5. VOLCANIC DEPTHS", tag: "Nether lava", difficulty: "EXPERT", range: "10+", grad: "linear-gradient(180deg,#1a0a0a 0%,#7a1e0e 50%,#ff5722 90%)", ground: "#3d1a12", sky: "#1a0a0a", mobs: ["blaze", "witch", "enderman"], boss: "blaze", stars: 9 },
  { id: "ocean", num: 6, name: "6. KELP OCEAN", tag: "Ocean", difficulty: "MEDIUM", range: "4–6", grad: "linear-gradient(180deg,#0288d1 0%,#26c6da 60%,#004d40 100%)", ground: "#00796b", sky: "#0288d1", mobs: ["drowned", "slime", "spider"], boss: "drowned", stars: 9 },
  { id: "deepdark", num: 7, name: "7. DEEP DARK", tag: "Deep Dark", difficulty: "EXPERT", range: "10+", grad: "linear-gradient(180deg,#020617 0%,#0d3b4f 60%,#000 100%)", ground: "#0d3b4f", sky: "#020617", mobs: ["warden", "enderman", "witch"], boss: "warden", stars: 9 },
  { id: "end", num: 8, name: "8. ENDER ISLES", tag: "End", difficulty: "EXPERT", range: "10+", grad: "linear-gradient(180deg,#12071f 0%,#e1bee7 60%,#4a2b7a 100%)", ground: "#e8e0a0", sky: "#12071f", mobs: ["enderman", "dragon", "witch"], boss: "dragon", stars: 9 },
  { id: "forest", num: 9, name: "9. DRAGON'S END", tag: "Final Boss", difficulty: "EXPERT", range: "10+", grad: "linear-gradient(180deg,#000 0%,#4a148c 55%,#ff6f00 100%)", ground: "#2b2b2b", sky: "#000", mobs: ["dragon", "warden", "blaze"], boss: "dragon", stars: 9 }
];

export const ITEMS: ItemDef[] = [
  { id: "wooden_sword", name: "Wooden Sword", kind: "weapon", slot: "weapon", rarity: "Common", power: 1, icon: "🗡️", color: "#8d6e63", desc: "Jackson's first blade" },
  { id: "stone_sword", name: "Stone Sword", kind: "weapon", slot: "weapon", rarity: "Uncommon", power: 2, icon: "🗡️", color: "#9e9e9e", desc: "Sharper and tougher" },
  { id: "iron_sword", name: "Iron Sword", kind: "weapon", slot: "weapon", rarity: "Rare", power: 3, icon: "🗡️", color: "#b0bec5", desc: "A hero's sword" },
  { id: "diamond_sword", name: "Diamond Sword", kind: "weapon", slot: "weapon", rarity: "Epic", power: 5, icon: "💎", color: "#4dd0e1", desc: "Sparkles with power. Sometimes crits!", crit: 0.05 },
  { id: "dragon_sword", name: "Dragon Slayer", kind: "weapon", slot: "weapon", rarity: "Legendary", power: 8, icon: "🐉", color: "#ce93d8", desc: "Forged from dragon fire. Sharp + often crits!", crit: 0.15, effect: "sharp" },
  { id: "enchant_fire", name: "Fire Aspect Blade", kind: "weapon", slot: "weapon", rarity: "Epic", power: 6, icon: "🔥", color: "#ff5722", desc: "Burning blade. Sometimes burns!", effect: "fire" },
  { id: "enchant_sharp", name: "Sharpness Blade", kind: "weapon", slot: "weapon", rarity: "Rare", power: 4, icon: "⚡", color: "#ffeb3b", desc: "Extra sharp. +2 damage!", effect: "sharp" },
  { id: "netherite_sword", name: "Netherite Sword", kind: "weapon", slot: "weapon", rarity: "Legendary", power: 9, icon: "⚔️", color: "#212121", desc: "Darkest steel. Sharp + crits!", crit: 0.1, effect: "sharp" },
  { id: "stone_pick", name: "Stone Pickaxe", kind: "tool", rarity: "Common", power: 1, icon: "⛏️", color: "#9e9e9e", desc: "For digging" },
  { id: "iron_pick", name: "Iron Pickaxe", kind: "tool", rarity: "Rare", power: 3, icon: "⛏️", color: "#b0bec5", desc: "Strong pick" },
  { id: "bow_basic", name: "Bow", kind: "tool", rarity: "Uncommon", power: 2, icon: "🏹", color: "#8d6e63", desc: "Shoot far" },
  { id: "trident_tool", name: "Trident", kind: "tool", rarity: "Epic", power: 5, icon: "🔱", color: "#26c6da", desc: "Power of the sea" },
  { id: "leather_tunic", name: "Leather Tunic", kind: "armor", slot: "armor", rarity: "Common", power: 0, icon: "🦺", color: "#8d6e63", desc: "Blocks 1 heart. Every hero starts somewhere!", defense: 1 },
  { id: "iron_helm", name: "Iron Helmet", kind: "armor", slot: "armor", rarity: "Uncommon", power: 0, icon: "🪖", color: "#b0bec5", desc: "Blocks 2 hearts of damage!", defense: 2 },
  { id: "diamond_chest", name: "Diamond Chestplate", kind: "armor", slot: "armor", rarity: "Epic", power: 0, icon: "🦺", color: "#4dd0e1", desc: "Great Defense! Blocks 5, plus Protection!", defense: 5, effect: "protect" },
  { id: "proj_cloak", name: "Scout Cloak", kind: "armor", slot: "armor", rarity: "Rare", power: 0, icon: "🧥", color: "#5c9ded", desc: "Blocks 2. Extra strong vs Skeletons!", defense: 2, effect: "projectile" },
  { id: "blast_plate", name: "Blast Plate", kind: "armor", slot: "armor", rarity: "Rare", power: 0, icon: "🛡️", color: "#ff8a65", desc: "Blocks 2. Extra strong vs Creepers!", defense: 2, effect: "blast" },
  { id: "thornmail", name: "Thornmail", kind: "armor", slot: "armor", rarity: "Epic", power: 0, icon: "🌵", color: "#7cb342", desc: "Blocks 3 and hurts attackers back!", defense: 3, effect: "thorns" },
  { id: "witch_hat", name: "Witch Hat", kind: "armor", slot: "hat", rarity: "Epic", power: 0, icon: "🎩", color: "#6a1b9a", desc: "Magic hat. Blocks 1 heart!", defense: 1 },
  { id: "golden_apple", name: "Golden Apple", kind: "food", rarity: "Uncommon", power: 0, icon: "🍎", color: "#ffca28", desc: "Eat in battle to heal 4 hearts!", heal: 4 },
  { id: "totem_undying", name: "Totem of Undying", kind: "trophy", rarity: "Legendary", power: 0, icon: "🗿", color: "#ffd54f", desc: "Very rare! Saves Jackson from defeat once!" },
  { id: "slime_pet", name: "Mini Slime", kind: "pet", slot: "pet", rarity: "Uncommon", power: 1, icon: "🟢", color: "#5df2b8", desc: "Sometimes squishes in front of attacks!", effect: "PET_slime" },
  { id: "wolf_pet", name: "Wolf Pup", kind: "pet", slot: "pet", rarity: "Rare", power: 2, icon: "🐺", color: "#8d6e63", desc: "Sometimes bites the mob for you!", effect: "PET_wolf" },
  { id: "axolotl_pet", name: "Axolotl", kind: "pet", slot: "pet", rarity: "Epic", power: 3, icon: "🦎", color: "#f48fb1", desc: "Sometimes heals 1 heart after a hit!", effect: "PET_axolotl" },
  { id: "dragon_pet", name: "Baby Ender Dragon", kind: "pet", slot: "pet", rarity: "Legendary", power: 5, icon: "🐲", color: "#ce93d8", desc: "Hits harder AND protects Jackson!", effect: "PET_dragon" },
  { id: "parrot_pet", name: "Parrot", kind: "pet", slot: "pet", rarity: "Uncommon", power: 1, icon: "🦜", color: "#26c6da", desc: "Squawks whether the answer is even or odd!", effect: "PET_parrot" },
  { id: "fox_pet", name: "Fox", kind: "pet", slot: "pet", rarity: "Uncommon", power: 1, icon: "🦊", color: "#ef6c00", desc: "Sneaky! Better loot from chests!", effect: "PET_fox" },
  { id: "zombie_card", name: "Zombie Head", kind: "trophy", slot: "hat", rarity: "Common", power: 0, icon: "🧟", color: "#4caf7d", desc: "Wearable mob head!" },
  { id: "creeper_card", name: "Creeper Head", kind: "trophy", slot: "hat", rarity: "Rare", power: 0, icon: "🟩", color: "#5ac73c", desc: "Creepers think you're family. Blast-proof!", effect: "blast" },
  { id: "wither_skull", name: "Wither Skull", kind: "trophy", slot: "hat", rarity: "Rare", power: 0, icon: "💀", color: "#212121", desc: "Spooky wearable skull" },
  { id: "spider_trophy", name: "Spider Eye", kind: "trophy", rarity: "Rare", power: 0, icon: "👁️", color: "#6b4fa0", desc: "Cave trophy" },
  { id: "blaze_trophy", name: "Blaze Rod", kind: "trophy", rarity: "Epic", power: 0, icon: "🔥", color: "#ff5722", desc: "Hot trophy" },
  { id: "ender_gem", name: "Ender Pearl", kind: "gem", rarity: "Epic", power: 0, icon: "🔮", color: "#e040fb", desc: "Teleports!" },
  { id: "warden_heart", name: "Echo Shard", kind: "gem", rarity: "Legendary", power: 0, icon: "💙", color: "#26a0be", desc: "Hums with power" },
  { id: "dragon_egg", name: "Dragon Egg", kind: "trophy", rarity: "Legendary", power: 0, icon: "🥚", color: "#4a148c", desc: "Ultimate treasure" }
];

export function mobById(id: string): MobDef {
  return MOBS.find(m => m.id === id) ?? MOBS[1];
}
export function itemById(id: string | null | undefined): ItemDef | undefined {
  if (!id) return undefined;
  return ITEMS.find(i => i.id === id);
}
export function worldById(id: string): WorldDef {
  return WORLDS.find(w => w.id === id) ?? WORLDS[0];
}

export const QUEST_DEFS = [
  { id: "q_mult10", name: "Answer 10 multiplication questions correctly", target: 10 },
  { id: "q_win3", name: "Win 3 battles", target: 3 },
  { id: "q_combo5", name: "Reach a x5 combo", target: 1 },
  { id: "q_beat_boss", name: "Defeat a boss mob", target: 1 }
];

export const ACH_DEFS = [
  { id: "a_first_blood", name: "First Victory", desc: "Win your first battle", icon: "⚔️" },
  { id: "a_zombie25", name: "Zombie Hunter", desc: "Defeat 5 zombies", icon: "🧟" },
  { id: "a_streak10", name: "Super Streak", desc: "Reach x7 combo", icon: "🔥" },
  { id: "a_rich", name: "Treasure Hunter", desc: "Hold 200 coins", icon: "💰" },
  { id: "a_collector", name: "Collector", desc: "Own 8 items", icon: "🎒" },
  { id: "a_boss", name: "Boss Slayer", desc: "Defeat any boss", icon: "👑" },
  { id: "a_dragon", name: "Dragon Slayer", desc: "Defeat the Ender Dragon", icon: "🐉" },
  { id: "a_scholar", name: "Math Scholar", desc: "Answer 50 questions correctly", icon: "📚" }
];
