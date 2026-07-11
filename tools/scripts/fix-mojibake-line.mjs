import fs from "node:fs";

const filePath = process.argv[2];
if (!filePath) {
  console.error("usage: node fix-mojibake-line.mjs <file>");
  process.exit(1);
}

// CP1252 codepoints in the 0x80-0x9F range that differ from Latin-1 (which
// leaves that range as C1 control codes). Needed to reverse a UTF-8 file
// that got mis-decoded as Windows-1252 (one or more times) and re-saved as
// UTF-8 each time.
const CP1252_HIGH = {
  0x20ac: 0x80, 0x201a: 0x82, 0x0192: 0x83, 0x201e: 0x84, 0x2026: 0x85,
  0x2020: 0x86, 0x2021: 0x87, 0x02c6: 0x88, 0x2030: 0x89, 0x0160: 0x8a,
  0x2039: 0x8b, 0x0152: 0x8c, 0x017d: 0x8e, 0x2018: 0x91, 0x2019: 0x92,
  0x201c: 0x93, 0x201d: 0x94, 0x2022: 0x95, 0x2013: 0x96, 0x2014: 0x97,
  0x02dc: 0x98, 0x2122: 0x99, 0x0161: 0x9a, 0x203a: 0x9b, 0x0153: 0x9c,
  0x017e: 0x9e, 0x0178: 0x9f,
};

function decodeOneRound(input) {
  const bytes = [];
  for (const ch of input) {
    const code = ch.codePointAt(0);
    if (code <= 0xff) {
      bytes.push(code);
    } else if (CP1252_HIGH[code] !== undefined) {
      bytes.push(CP1252_HIGH[code]);
    } else {
      return null; // not CP1252-mojibake-shaped; bail
    }
  }
  return Buffer.from(bytes).toString("utf8");
}

function countArabic(s) {
  let n = 0;
  for (const ch of s) {
    const c = ch.codePointAt(0);
    if (c >= 0x0600 && c <= 0x06ff) n += 1;
  }
  return n;
}

function looksLikeMojibake(s) {
  return /[ÃÂ]|â€/.test(s);
}

// Tries 0..3 decode rounds and keeps whichever round yields the most Arabic
// characters with zero replacement characters and no leftover raw mojibake
// lead bytes — i.e. the most fully "unwound" clean result.
function bestDecoding(line) {
  let candidate = line;
  let best = { text: line, arabic: countArabic(line), rounds: 0 };
  for (let round = 1; round <= 3; round += 1) {
    const attempt = decodeOneRound(candidate);
    if (attempt === null || attempt.includes("�")) break;
    candidate = attempt;
    const arabic = countArabic(candidate);
    if (arabic > best.arabic || (arabic === best.arabic && !looksLikeMojibake(candidate))) {
      best = { text: candidate, arabic, rounds: round };
    }
  }
  return best;
}

const raw = fs.readFileSync(filePath);
const hasBom = raw.length >= 3 && raw[0] === 0xef && raw[1] === 0xbb && raw[2] === 0xbf;
const text = (hasBom ? raw.subarray(3) : raw).toString("utf8");
const lines = text.split("\n");

let changed = 0;
const fixedLines = lines.map((line) => {
  // eslint-disable-next-line no-control-regex
  if (!/[^\x00-\x7f]/.test(line)) return line; // pure ASCII, nothing to do
  const best = bestDecoding(line);
  if (best.rounds === 0 || best.text === line) return line;
  changed += 1;
  return best.text;
});

fs.writeFileSync(filePath, fixedLines.join("\n"), "utf8");
console.log(`${filePath}: fixed ${changed} line(s), BOM removed: ${hasBom}`);
