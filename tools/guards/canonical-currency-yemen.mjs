import fs from "node:fs";
import path from "node:path";
import { fail, repoRoot, toPosix } from "./_guard-utils.mjs";

const TARGET_DIRS = [
  "services/wlt",
  "services/dsh",
  "apps",
  "infra",
  "tools/scripts",
  "contracts",
  "docs/runtime"
];

const EXCLUDED_DIRS = new Set([
  ".git",
  "node_modules",
  ".pnpm-store",
  ".next",
  ".expo",
  ".turbo",
  ".nx",
  ".cache",
  "dist",
  "build",
  "out",
  "coverage",
  "tmp",
  "temp",
  "logs",
  "graphify-out",
  "evidence",
  "screenshots",
  "recordings",
  "visual-evidence",
  "generated",
  "__generated__",
  "android",
  "ios"
]);

const EXCLUDED_EXTENSIONS = new Set([
  "png", "jpg", "jpeg", "gif", "webp", "svg", "ico",
  "mp4", "mov", "avi", "pdf",
  "zip", "7z", "rar", "tar", "gz",
  "map", "log", "har", "sqlite", "db", "db-shm", "db-wal",
  "tsbuildinfo", "apk", "aab", "ipa"
]);

function walk(dir, files = []) {
  if (!fs.existsSync(dir)) return files;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    const rel = toPosix(path.relative(repoRoot, full));
    const name = entry.name;

    if (entry.isDirectory()) {
      if (EXCLUDED_DIRS.has(name)) continue;
      walk(full, files);
    } else {
      const ext = path.extname(name).toLowerCase().slice(1);
      if (EXCLUDED_EXTENSIONS.has(ext)) continue;
      files.push({ full, rel });
    }
  }
  return files;
}

const allFiles = [];
for (const target of TARGET_DIRS) {
  walk(path.join(repoRoot, target), allFiles);
}

const violations = [];

const sarRegex = /\bSAR\b/;
const saudiRegex = /Saudi/i;
const riyalsRegex = /ريال\s+سعودي/;

for (const file of allFiles) {
  if (file.rel === "tools/guards/canonical-currency-yemen.mjs") continue;
  
  // Skip binary/non-utf8 files safely
  let content;
  try {
    content = fs.readFileSync(file.full, "utf8");
  } catch {
    continue;
  }
  
  const lines = content.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes("ALLOW_FOREIGN_CURRENCY_EXAMPLE") || line.includes("MULTI_CURRENCY_FUTURE_ONLY")) {
      continue;
    }
    
    if (sarRegex.test(line) || saudiRegex.test(line) || riyalsRegex.test(line)) {
      violations.push({
        file: file.rel,
        line: i + 1,
        message: `contains forbidden currency token. Use YER (Yemeni Rial) instead.`
      });
    }
  }
}

fail("canonical-currency-yemen", violations);
