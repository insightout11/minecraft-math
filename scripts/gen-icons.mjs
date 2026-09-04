// Generates original app icons with Node built-ins only (no deps).
// A chunky creeper-face homage on a night-sky tile with a grass base.
import { writeFileSync, mkdirSync } from "node:fs";
import { deflateSync } from "node:zlib";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const FACE = [
  "GgGGGGGG",
  "gGGGGGGg",
  "GKKGGKKG",
  "GKKGGKKG",
  "GGGKKGGG",
  "GGKKKKGG",
  "GGKKKKGG",
  "GGKG GKGG".replace(" ", "G")
];
const PAL = {
  G: [88, 183, 62],
  g: [142, 224, 111],
  K: [18, 24, 18],
  S: [11, 16, 32],   // night sky
  s: [17, 26, 50],   // night sky alt
  D: [93, 64, 55],   // dirt
  d: [74, 51, 44],   // dirt dark
  R: [255, 202, 40]  // gold trim
};

function crc32(buf) {
  let table = crc32.t;
  if (!table) {
    table = crc32.t = new Int32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      table[n] = c;
    }
  }
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.from(type, "ascii");
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([td, data])));
  return Buffer.concat([len, td, data, crc]);
}

function pngRGBA(w, h, px) {
  const raw = Buffer.alloc(h * (1 + w * 4));
  for (let y = 0; y < h; y++) {
    raw[y * (1 + w * 4)] = 0;
    for (let x = 0; x < w; x++) {
      const p = px[y * w + x];
      raw.set(p, y * (1 + w * 4) + 1 + x * 4);
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0))
  ]);
}

// 16x16 tile: sky checker, gold frame, 8x8 face centred, dirt base
function tile() {
  const N = 16;
  const px = [];
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const edge = x === 0 || y === 0 || x === N - 1 || y === N - 1;
      let c;
      if (edge) c = PAL.R;
      else if (y >= 12) c = (x + y) % 2 ? PAL.D : PAL.d;
      else if (x >= 4 && x < 12 && y >= 3 && y < 11) c = PAL[FACE[y - 3][x - 4]];
      else c = (x + y) % 2 ? PAL.S : PAL.s;
      px.push([...c, 255]);
    }
  }
  return { N, px };
}

function render(size, maskable) {
  const { N, px: t } = tile();
  const out = [];
  const pad = maskable ? 0 : 0;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const tx = Math.min(N - 1, Math.floor((x / size) * N));
      const ty = Math.min(N - 1, Math.floor((y / size) * N));
      out.push(t[ty * N + tx]);
    }
  }
  void pad;
  return pngRGBA(size, size, out);
}

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "public");
mkdirSync(join(root, "icons"), { recursive: true });
writeFileSync(join(root, "icons", "icon-192.png"), render(192, false));
writeFileSync(join(root, "icons", "icon-512.png"), render(512, false));
writeFileSync(join(root, "icons", "icon-maskable.png"), render(512, true));
writeFileSync(join(root, "apple-touch-icon.png"), render(180, false));
console.log("icons written");
