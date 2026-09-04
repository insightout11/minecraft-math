// Pixel-art swords for Jackson's hand (original art). One blade shape,
// recoloured per material. Handle end is at the bottom (the grip point).
export interface PixelWeaponArt {
  rows: string[];
  pal: Record<string, string>;
  glow?: string;
}

const SWORD_ROWS = [
  "..M..",
  ".LMM.",
  ".LMM.",
  ".LMM.",
  ".LMM.",
  ".LMM.",
  ".LMM.",
  ".LMM.",
  ".LMM.",
  "DDDDD",
  "..H..",
  "..H..",
  "..P..",
  "..P.."
];

function sword(blade: string, edge: string, guard: string, glow?: string): PixelWeaponArt {
  return {
    rows: SWORD_ROWS,
    pal: { M: blade, L: edge, D: guard, H: "#5d4037", P: "#3e2723" },
    glow
  };
}

export const PIXEL_WEAPONS: Record<string, PixelWeaponArt> = {
  wooden_sword: sword("#b08d57", "#d7b98a", "#6d4c41"),
  stone_sword: sword("#9e9e9e", "#e0e0e0", "#616161"),
  iron_sword: sword("#cfd8dc", "#ffffff", "#78909c"),
  diamond_sword: sword("#4dd0e1", "#d4f7fc", "#00838f", "#4dd0e1"),
  dragon_sword: sword("#ce93d8", "#f3e5f5", "#4a148c", "#e040fb"),
  enchant_fire: sword("#ff8a65", "#ffccbc", "#bf360c", "#ff5722"),
  enchant_sharp: sword("#fff176", "#fffde7", "#f9a825", "#ffeb3b"),
  netherite_sword: sword("#4a4a52", "#9e9e9e", "#1a1a1a", "#ff3d00")
};
