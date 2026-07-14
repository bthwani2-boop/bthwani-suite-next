#!/usr/bin/env node
/**
 * generate-seed-images.mjs
 * Generates valid 64x64 PNG placeholder images for all catalog seed media.
 * Uses no external dependencies — pure Node.js Buffer + zlib.
 */
import { createWriteStream, existsSync } from "fs";
import { createDeflate } from "zlib";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const MEDIA_DIR = join(__dirname, "../../services/dsh/database/seeds/local/media");

// CRC32 table
const CRC_TABLE = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = (c & 1) ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  CRC_TABLE[n] = c;
}
function crc32(buf, start = 0, end = buf.length) {
  let c = 0xffffffff;
  for (let i = start; i < end; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function uint32BE(n) {
  const b = Buffer.allocUnsafe(4);
  b.writeUInt32BE(n, 0);
  return b;
}

function pngChunk(type, data) {
  const len = uint32BE(data.length);
  const typeBytes = Buffer.from(type, "ascii");
  const payload = Buffer.concat([typeBytes, data]);
  const crc = uint32BE(crc32(payload));
  return Buffer.concat([len, payload, crc]);
}

function buildPng(r, g, b) {
  const W = 64, H = 64;

  // Raw scanlines: filter byte 0x00 then RGB pixels
  const raw = Buffer.allocUnsafe(H * (1 + W * 3));
  for (let y = 0; y < H; y++) {
    const base = y * (1 + W * 3);
    raw[base] = 0; // filter type None
    for (let x = 0; x < W; x++) {
      const px = base + 1 + x * 3;
      // slight gradient to make it visually obvious
      raw[px]     = Math.min(255, r + Math.floor(x * 0.5));
      raw[px + 1] = Math.min(255, g + Math.floor(y * 0.5));
      raw[px + 2] = b;
    }
  }

  return new Promise((resolve, reject) => {
    const chunks = [];
    const deflate = createDeflate({ level: 6 });
    deflate.on("data", (d) => chunks.push(d));
    deflate.on("end", () => {
      const idat = Buffer.concat(chunks);
      const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
      const ihdr = Buffer.allocUnsafe(13);
      ihdr.writeUInt32BE(W, 0);
      ihdr.writeUInt32BE(H, 4);
      ihdr[8] = 8;  // bit depth
      ihdr[9] = 2;  // color type: RGB
      ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
      const png = Buffer.concat([
        sig,
        pngChunk("IHDR", ihdr),
        pngChunk("IDAT", idat),
        pngChunk("IEND", Buffer.alloc(0)),
      ]);
      resolve(png);
    });
    deflate.on("error", reject);
    deflate.write(raw);
    deflate.end();
  });
}

async function writePng(filename, r, g, b) {
  const path = join(MEDIA_DIR, filename);
  // Only overwrite files that are corrupt/tiny (< 500 bytes)
  if (existsSync(path)) {
    const { statSync } = await import("fs");
    const size = statSync(path).size;
    if (size > 500) {
      console.log(`  skip (already valid): ${filename} (${size} bytes)`);
      return;
    }
  }
  const data = await buildPng(r, g, b);
  const ws = createWriteStream(path);
  await new Promise((res, rej) => { ws.write(data, (e) => e ? rej(e) : res()); ws.end(); });
  console.log(`  generated: ${filename} (${data.length} bytes)`);
}

// Colour palette per category type
const PALETTE = {
  product:  { r: 59,  g: 130, b: 246 },  // blue
  node:     { r: 16,  g: 185, b: 129 },  // green
  store_h:  { r: 245, g: 158, b: 11  },  // amber
  store_l:  { r: 99,  g: 102, b: 241 },  // indigo
  banner:   { r: 239, g: 68,  b: 68  },  // red
  promo:    { r: 168, g: 85,  b: 247 },  // purple
};

const FILES = [
  // Products
  ["product-aptamil-1.png",          PALETTE.product],
  ["product-canned-tuna.png",        { r: 52,  g: 211, b: 153 }],
  ["product-cheese-kraft.png",       { r: 251, g: 191, b: 36  }],
  ["product-chocolate-box.png",      { r: 120, g: 53,  b: 15  }],
  ["product-galaxy-s24.png",         { r: 99,  g: 102, b: 241 }],
  ["product-imported-banana.png",    { r: 234, g: 179, b: 8   }],
  ["product-local-tomato.png",       { r: 239, g: 68,  b: 68  }],
  ["product-panadol-advance.png",    { r: 16,  g: 185, b: 129 }],
  ["product-solpadeine-soluble.png", { r: 59,  g: 130, b: 246 }],
  // Nodes
  ["node-dairy-cheese.png",          PALETTE.node],
  ["node-canned-food.png",           { r: 14,  g: 165, b: 233 }],
  ["node-local-vegetables.png",      { r: 34,  g: 197, b: 94  }],
  ["node-imported-fruits.png",       { r: 251, g: 146, b: 60  }],
  ["node-sweets-cake.png",           { r: 244, g: 114, b: 182 }],
  ["node-sweets-chocolate.png",      { r: 120, g: 53,  b: 15  }],
  ["node-phones-tablets.png",        { r: 99,  g: 102, b: 241 }],
  ["node-smartphones.png",           { r: 79,  g: 70,  b: 229 }],
  ["node-android-phones.png",        { r: 34,  g: 197, b: 94  }],
  ["node-ios-phones.png",            { r: 59,  g: 130, b: 246 }],
  ["node-medications.png",           { r: 239, g: 68,  b: 68  }],
  ["node-baby-care.png",             { r: 244, g: 114, b: 182 }],
  ["node-pain-relief.png",           { r: 251, g: 146, b: 60  }],
  ["node-baby-milk.png",             { r: 147, g: 197, b: 253 }],
  ["node-headache-migraine.png",     { r: 196, g: 181, b: 253 }],
  ["node-infant-formula.png",        { r: 253, g: 224, b: 132 }],
  // Stores
  ["store-1001-hero.png",  { r: 245, g: 158, b: 11  }],
  ["store-1001-logo.png",  { r: 251, g: 191, b: 36  }],
  ["store-1002-hero.png",  { r: 59,  g: 130, b: 246 }],
  ["store-1002-logo.png",  { r: 147, g: 197, b: 253 }],
  ["store-1003-hero.png",  { r: 16,  g: 185, b: 129 }],
  ["store-1003-logo.png",  { r: 52,  g: 211, b: 153 }],
  ["store-1004-hero.png",  { r: 239, g: 68,  b: 68  }],
  ["store-1004-logo.png",  { r: 252, g: 165, b: 165 }],
  ["store-1005-logo.png",  { r: 168, g: 85,  b: 247 }],
  ["store-1006-hero.png",  { r: 99,  g: 102, b: 241 }],
  ["store-1006-logo.png",  { r: 196, g: 181, b: 253 }],
  // Banners & promos
  ["banner-001.png",  PALETTE.banner],
  ["banner-002.png",  { r: 245, g: 158, b: 11 }],
  ["promo-001.png",   PALETTE.promo],
  // Test store
  ["store-test-grocery-hero.png", { r: 34,  g: 197, b: 94  }],
  ["store-test-grocery-logo.png", { r: 21,  g: 128, b: 61  }],
];

console.log(`Generating seed images in: ${MEDIA_DIR}`);
for (const [filename, { r, g, b }] of FILES) {
  await writePng(filename, r, g, b);
}
console.log("Done.");
