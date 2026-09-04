// Hand-drawn pixel-art mob sprites (original fan-art homage for personal use).
// Each mob is a grid of characters; "." = transparent. Not Mojang texture files.
export interface PixelMobArt {
  w: number;
  rows: string[];
  pal: Record<string, string>;
  glow?: string[];
}

const ZOMBIE_ROWS = [
  "..TTTTTTTT..",
  "..TtTTTTtT..",
  "..TKTTTTKT..",
  "..TTTTTTTT..",
  "...TTTTTT...",
  "..BBBBBBBB..",
  "..BBBbBBBB..",
  "..BBBbBBBB..",
  "..BBBBBBBB..",
  "..PPPPPPPP..",
  "..PPP..PPP..",
  "..PPP..PPP..",
  "..DDD..DDD..",
  "..DDD..DDD.."
];

const SKELETON_ROWS = [
  "..WWWWWWWW..",
  "..WwWWWWwW..",
  "..WKWWWWKW..",
  "..WKWWWWKW..",
  "..WWWWWWWW..",
  "...WNWWNW...",
  "..GGGGGGGG..",
  "..GgGGGGgG..",
  "..GGGGGGGG..",
  "..GGGGGGGG..",
  "..GG....GG..",
  "..GG....GG..",
  "..GG....GG..",
  "..GG....GG.."
];

export const PIXEL_MOBS: Record<string, PixelMobArt> = {
  chicken: {
    w: 10,
    rows: [
      "...WWWW...",
      "..WWWWWW..",
      "..WKWWKW..",
      "..WWWWWW..",
      "...WBBW...",
      "...WRRW...",
      "..WWWWWW..",
      "..WWWWWW..",
      "...WWWW...",
      "...L..L...",
      "...L..L...",
      "..LL..LL.."
    ],
    pal: { W: "#fbfbfb", K: "#232323", B: "#f39c12", R: "#d63c2f", L: "#f39c12" }
  },
  grub: {
    w: 12,
    rows: [
      "..MMMMMMMM..",
      "..MmMMMMmM..",
      "..MMMMMMMM..",
      "..MMmMMmMM..",
      "..MKKMMKKM..",
      "..MKKMMKKM..",
      "..MMKKKKMM..",
      "...MKKKKM...",
      "...MKKKKM...",
      "...MKKKKM...",
      "..MMMMMMMM..",
      "..MmMMMMmM..",
      "..DDD..DDD..",
      "..DDD..DDD.."
    ],
    pal: { M: "#58b368", m: "#8ee08a", D: "#2f7a2e", K: "#161616" }
  },
  zombie: {
    w: 12,
    rows: ZOMBIE_ROWS,
    pal: { T: "#4e9a6f", t: "#7ccfa0", K: "#10231a", B: "#2f6fd0", b: "#2559a8", P: "#2b3a67", D: "#222222" }
  },
  drowned: {
    w: 12,
    rows: ZOMBIE_ROWS,
    pal: { T: "#55a097", t: "#8fd4c8", K: "#0c2b28", B: "#2a6b66", b: "#1f514d", P: "#24406b", D: "#1c1c1c" }
  },
  skeleton: {
    w: 12,
    rows: SKELETON_ROWS,
    pal: { W: "#ddd8c8", w: "#fbfaf4", K: "#141414", N: "#a8a49a", G: "#b0aca0", g: "#cfcabd" }
  },
  wither: {
    w: 12,
    rows: SKELETON_ROWS,
    pal: { W: "#333333", w: "#454545", K: "#050505", N: "#161616", G: "#262626", g: "#383838" }
  },
  spider: {
    w: 14,
    rows: [
      "..............",
      ".LL........LL.",
      "..LL..RR..LL..",
      "...LLRRRRLL...",
      "....BBBBBB....",
      "..LBBBBBBBBL..",
      ".LLBBBBBBBBLL.",
      "...BBBBBBBB...",
      "...BWWBBWWB...",
      "....DDDDDD...."
    ],
    pal: { B: "#3a2c20", L: "#1c130c", R: "#ff2d3f", W: "#e8e4d8", D: "#1c130c" },
    glow: ["R"]
  },
  slime: {
    w: 12,
    rows: [
      "............",
      "..LLLLLLLL..",
      ".LMMMMMMMML.",
      ".LMEEMMEEML.",
      ".LMMMMMMMML.",
      ".LMMDDDMMML.",
      ".LMMMMMMMML.",
      ".LMdMMMMdML.",
      "..LLLLLLLL..",
      "............"
    ],
    pal: { M: "#6abe30", L: "#a9e75f", E: "#0d3b28", D: "#0d3b28", d: "#3f8f22" }
  },
  enderman: {
    w: 12,
    rows: [
      "..KKKKKKKK..",
      "..KKKKKKKK..",
      "..KKKKKKKK..",
      "..KPPKKPPK..",
      "..KPPKKPPK..",
      "..KKKKKKKK..",
      "..KKKKKKKK..",
      ".KKKKKKKKKK.",
      ".KK.KKKK.KK.",
      ".KK.KKKK.KK.",
      ".KK.KKKK.KK.",
      ".KK.KKKK.KK.",
      "....KKKK....",
      "....KK.KK...",
      "....KK.KK...",
      "....KK.KK..."
    ],
    pal: { K: "#17171f", P: "#e879f9" },
    glow: ["P"]
  },
  blaze: {
    w: 12,
    rows: [
      "..YYYYYYYY..",
      ".YYYYYYYYYY.",
      ".YYKYYYYKYY.",
      ".YYKYYYYKYY.",
      ".YYYYYYYYYY.",
      ".YYYKKKKYYY.",
      ".YYYKKKKYYY.",
      "..YYYYYYYY..",
      "............",
      ".Y..Y..Y..Y.",
      ".Y..Y..Y..Y.",
      ".Y..Y..Y..Y.",
      ".Y..Y..Y..Y."
    ],
    pal: { Y: "#f5b81f", K: "#1c1c1c" }
  },
  witch: {
    w: 12,
    rows: [
      ".....HH.....",
      "....HHHH....",
      "....HHHH....",
      "...HHHHHH...",
      "..HHHHHHHH..",
      "..HHHHHHHH..",
      "..GGGGGGGG..",
      "..GKG..GKG..",
      "..GGGGGGGG..",
      "..GGGNNGGG..",
      "...GGNNGG...",
      "..PPPPPPPP..",
      "..PPpPPpPP..",
      "..PPPPPPPP.."
    ],
    pal: { H: "#241a35", G: "#62ac7c", K: "#14261a", N: "#2f7a4e", P: "#6a1b9a", p: "#42105e" }
  },
  warden: {
    w: 12,
    rows: [
      "..TTTTTTTT..",
      "..TtTTTTtT..",
      "..TCCTTCCT..",
      "..TTTTTTTT..",
      "..TCTTTTCT..",
      "..TTTTTTTT..",
      "..TCTTTTCT..",
      "..TTTTTTTT..",
      "..TT....TT..",
      "..TT....TT..",
      "..TT....TT..",
      "..TT....TT..",
      "..TT....TT..",
      "..TT....TT.."
    ],
    pal: { T: "#11414f", t: "#1c6a82", C: "#7df9ff" },
    glow: ["C"]
  },
  dragon: {
    w: 16,
    rows: [
      "WW............WW",
      "WWW..........WWW",
      ".WWW..GGGG..WWW.",
      "..WW.GGGGGG.WW..",
      "...W.GPGGPG.W...",
      "....GGGGGGGG....",
      "....GWWWWWWG....",
      "....GGGGGGGG....",
      ".....GGGGGG.....",
      ".....G....G.....",
      ".....G....G.....",
      "....DD....DD...."
    ],
    pal: { G: "#54545e", W: "#d5d5dc", P: "#e040fb", D: "#26262e" },
    glow: ["P"]
  }
};
