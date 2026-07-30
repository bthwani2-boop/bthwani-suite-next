/**
 * tools/scripts/generate-repository-structure-report.mjs
 *
 * BTHWANI_REPOSITORY_STRUCTURE_GOVERNANCE_GATE — Diagnostic Report Generator
 *
 * Generates .diagnostics/repository-structure/structure-report.md with:
 *   - Top 50 largest files
 *   - Code files with > 500 lines
 *   - Folders with depth > 7
 *   - Naming anomalies (non-standard casing)
 *   - Risk summary (P0/P1/P2)
 */

import fs from "node:fs";
import path from "node:path";
import { repoRoot, toPosix } from "../guards/_guard-utils.mjs";

const OUT_DIR  = path.join(repoRoot, ".diagnostics", "repository-structure");
const OUT_FILE = path.join(OUT_DIR, "structure-report.md");

fs.mkdirSync(OUT_DIR, { recursive: true });

// ── Config ────────────────────────────────────────────────────────────────────
const EXCLUDED_DIRS = new Set([
  ".git", "node_modules", ".pnpm-store", ".next", ".expo", ".turbo", ".nx",
  ".cache", "dist", "build", "out", "coverage", "android", "ios",
  "graphify-out", ".diagnostics", "__generated__", "generated",
  "tools/registry",
]);

const CODE_EXTS    = new Set(["ts", "tsx", "js", "jsx", "mjs", "cjs", "go", "ps1"]);
const SCAN_ROOTS   = ["apps", "services", "shared", "tools", "infra", "core", "contracts", "docs"];

// ── Walker ────────────────────────────────────────────────────────────────────
const allFiles = [];

function walk(dir, depth = 0) {
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); }
  catch { return; }

  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    const rel  = toPosix(path.relative(repoRoot, full));

    if (entry.isDirectory()) {
      if (EXCLUDED_DIRS.has(entry.name)) continue;
      if (EXCLUDED_DIRS.has(rel))        continue;
      walk(full, depth + 1);
    } else {
      let size = 0;
      try { size = fs.statSync(full).size; } catch { continue; }
      const ext = path.extname(entry.name).toLowerCase().slice(1);
      allFiles.push({ rel, full, name: entry.name, size, ext, depth });
    }
  }
}

for (const root of SCAN_ROOTS) {
  walk(path.join(repoRoot, root));
}

// ── Analysis ──────────────────────────────────────────────────────────────────

// Top 50 by size
const top50 = [...allFiles].sort((a, b) => b.size - a.size).slice(0, 50);

// Long code files (> 500 lines)
const longCodeFiles = [];
for (const f of allFiles) {
  if (!CODE_EXTS.has(f.ext)) continue;
  if (f.size < 10_000) continue; // skip tiny files fast
  try {
    const content = fs.readFileSync(f.full, "utf8");
    const lines   = content.split(/\r?\n/).length;
    if (lines > 500) {
      longCodeFiles.push({ ...f, lines });
    }
  } catch { /* skip */ }
}
longCodeFiles.sort((a, b) => b.lines - a.lines);

// Deep folders (> 7 levels)
const deepFolders = new Map();
for (const f of allFiles) {
  const parts = f.rel.split("/");
  const depth = parts.length - 1; // file is last segment
  if (depth > 7) {
    const folderPath = parts.slice(0, -1).join("/");
    if (!deepFolders.has(folderPath)) {
      deepFolders.set(folderPath, depth);
    }
  }
}
const deepFolderList = [...deepFolders.entries()]
  .sort((a, b) => b[1] - a[1])
  .slice(0, 20);

// Naming anomalies — files with spaces, Arabic chars, or uppercase in wrong places
const namingIssues = allFiles.filter(({ name, rel }) => {
  if (/\s/.test(name))            return true; // spaces in filename
  if (/[\u0600-\u06FF]/.test(name)) return true; // Arabic characters
  if (/[^a-zA-Z0-9._\-]/.test(name)) return true; // special characters
  return false;
});

// P0/P1/P2 classification
const p0Files = allFiles.filter((f) => {
  const ext = f.ext;
  const forbidden = ["log","zip","rar","7z","mp4","mov","db","sqlite","bak","tmp","har"];
  return forbidden.includes(ext);
});
const p1Files = allFiles.filter((f) => f.size > 5 * 1024 * 1024);
const p2Files = longCodeFiles.filter((f) => f.lines > 1000);

// ── Report builder ────────────────────────────────────────────────────────────
function kb(bytes) {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / 1024).toFixed(0)} KB`;
}

const now = new Date().toISOString();
const lines = [];

lines.push(`# Repository Structure Health Report`);
lines.push(`\n*Generated: ${now}*`);
lines.push(`*Total scanned files: ${allFiles.length}*`);

// Risk Summary
lines.push(`\n---\n\n## Risk Summary\n`);
lines.push(`| Priority | Count | Category |`);
lines.push(`|---|---|---|`);
lines.push(`| **P0** | ${p0Files.length} | Forbidden file types tracked in Git |`);
lines.push(`| **P1** | ${p1Files.length} | Files > 5 MB |`);
lines.push(`| **P2** | ${p2Files.length} | Code files > 1000 lines |`);

if (p0Files.length > 0) {
  lines.push(`\n### ❌ P0 — Forbidden File Types\n`);
  lines.push(`> These files must not be tracked in Git.\n`);
  lines.push(`| File | Size | Extension |`);
  lines.push(`|---|---|---|`);
  for (const f of p0Files) {
    lines.push(`| \`${f.rel}\` | ${kb(f.size)} | .${f.ext} |`);
  }
}

// Top 50 largest files
lines.push(`\n---\n\n## Top 50 Largest Files\n`);
lines.push(`| # | File | Size |`);
lines.push(`|---|---|---|`);
for (let i = 0; i < top50.length; i++) {
  const f = top50[i];
  lines.push(`| ${i + 1} | \`${f.rel}\` | ${kb(f.size)} |`);
}

// Long code files
lines.push(`\n---\n\n## Code Files with > 500 Lines\n`);
if (longCodeFiles.length === 0) {
  lines.push(`*No code files exceed 500 lines in the scanned directories.*`);
} else {
  lines.push(`| File | Lines | Size |`);
  lines.push(`|---|---|---|`);
  for (const f of longCodeFiles.slice(0, 50)) {
    const badge = f.lines > 1500 ? " ❌" : f.lines > 1000 ? " ⚠️" : "";
    lines.push(`| \`${f.rel}\`${badge} | ${f.lines} | ${kb(f.size)} |`);
  }
}

// Deep folders
lines.push(`\n---\n\n## Deep Folder Paths (> 7 levels)\n`);
if (deepFolderList.length === 0) {
  lines.push(`*No folder paths exceed 7 levels.*`);
} else {
  lines.push(`| Folder Path | Depth |`);
  lines.push(`|---|---|`);
  for (const [fp, d] of deepFolderList) {
    const badge = d > 10 ? " ❌" : " ⚠️";
    lines.push(`| \`${fp}\`${badge} | ${d} |`);
  }
}

// Naming anomalies
lines.push(`\n---\n\n## Naming Anomalies\n`);
if (namingIssues.length === 0) {
  lines.push(`*No naming anomalies detected.*`);
} else {
  lines.push(`| File | Issue |`);
  lines.push(`|---|---|`);
  for (const f of namingIssues.slice(0, 30)) {
    const issue = /\s/.test(f.name) ? "spaces in filename"
      : /[\u0600-\u06FF]/.test(f.name) ? "Arabic characters in filename"
      : "special characters";
    lines.push(`| \`${f.rel}\` | ${issue} |`);
  }
}

// P2 tasks
if (p2Files.length > 0) {
  lines.push(`\n---\n\n## P2 — Large Code Files to Refactor\n`);
  lines.push(`> Files with > 1000 lines. Consider splitting into smaller modules.\n`);
  lines.push(`| File | Lines |`);
  lines.push(`|---|---|`);
  for (const f of p2Files) {
    lines.push(`| \`${f.rel}\` | ${f.lines} |`);
  }
}

lines.push(`\n---\n\n*Run \`pnpm run diagnostics:repo-structure\` to regenerate.*\n`);

// ── Write ─────────────────────────────────────────────────────────────────────
fs.writeFileSync(OUT_FILE, lines.join("\n"), "utf8");

console.log(`\n  Report written to ${path.relative(repoRoot, OUT_FILE).replace(/\\/g, "/")}`);
console.log(`\n--- REPOSITORY STRUCTURE REPORT COMPLETE ---`);
console.log(`  Total Files Scanned:  ${allFiles.length}`);
console.log(`  P0 Forbidden Types:   ${p0Files.length}`);
console.log(`  P1 Oversized (>5MB):  ${p1Files.length}`);
console.log(`  P2 Long Code (>1000L):${p2Files.length}`);
console.log(`  Deep Folders (>7):    ${deepFolderList.length}`);
console.log(`  Naming Anomalies:     ${namingIssues.length}`);
console.log(`---------------------------------------------`);
