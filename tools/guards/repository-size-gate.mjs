/**
 * tools/guards/repository-size-gate.mjs
 *
 * BTHWANI_REPOSITORY_STRUCTURE_GOVERNANCE_GATE — Size & Forbidden Files Layer
 *
 * Rules:
 *   FAIL immediately: forbidden binary/temp extensions inside tracked source
 *   FAIL: any code file > 800 KB, any file > 25 MB
 *   WARN: any file > 5 MB, any code file > 300 KB
 *
 * Scope: apps/, services/, shared/, tools/, infra/, core/, docs/, contracts/
 * Excludes: node_modules, dist, build, generated, android, ios, .git, .next,
 *            .expo, .nx, .cache, coverage, graphify-out, .diagnostics,
 *            tools/registry/runs (large run artifacts)
 */

import fs from "node:fs";
import path from "node:path";
import { fail, repoRoot, toPosix } from "./_guard-utils.mjs";

const guardId = "repository-size-gate";
const violations = [];
const warnings = [];

// ── Thresholds ────────────────────────────────────────────────────────────────
const THRESHOLDS = {
  code: { warn: 300 * 1024, fail: 800 * 1024 },       // .ts .tsx .js .mjs .go
  markdown: { warn: 500 * 1024, fail: 1024 * 1024 },  // .md
  dataFile: { warn: 1024 * 1024, fail: 2 * 1024 * 1024 }, // .json .yaml .yml
  sql: { warn: 2 * 1024 * 1024, fail: 5 * 1024 * 1024 },  // .sql
  image: { warn: 500 * 1024, fail: 2 * 1024 * 1024 },     // .png .jpg etc inside src
  absolute: { warn: 5 * 1024 * 1024, fail: 25 * 1024 * 1024 }, // any file
};

// ── Forbidden extensions (binary/temp/sensitive — always FAIL if tracked) ────
const FORBIDDEN_EXTENSIONS = new Set([
  "log", "har", "zip", "rar", "7z", "tar", "gz", "bz2",
  "mp4", "mov", "avi", "mkv", "webm",
  "db", "sqlite", "sqlite3", "db-shm", "db-wal",
  "bak", "tmp", "old", "copy", "orig",
]);

// ── Allowlisted paths (allowed even if they match forbidden ext) ──────────────
const FORBIDDEN_ALLOWLIST = [
  // e.g. a .tar.gz inside infra/docker/fixtures if we ever add one
];

// ── Extension → threshold bucket ─────────────────────────────────────────────
function bucketFor(ext) {
  if (["ts", "tsx", "js", "jsx", "mjs", "cjs", "go", "ps1", "sh"].includes(ext)) return "code";
  if (["md", "mdx"].includes(ext)) return "markdown";
  if (["json", "yaml", "yml", "toml"].includes(ext)) return "dataFile";
  if (ext === "sql") return "sql";
  if (["png", "jpg", "jpeg", "gif", "webp", "svg", "ico"].includes(ext)) return "image";
  return "absolute";
}

// ── Scan roots ────────────────────────────────────────────────────────────────
const SCAN_ROOTS = ["apps", "services", "shared", "tools", "infra", "core", "docs", "contracts"];

const EXCLUDED_DIRS = new Set([
  ".git", "node_modules", ".pnpm-store", ".next", ".expo", ".turbo", ".nx",
  ".cache", "dist", "build", "out", "coverage", "android", "ios",
  "graphify-out", ".diagnostics", "__generated__",
]);

const EXCLUDED_PATH_PREFIXES = [
  "tools/registry/runs",
  "tools/diagnostics",   // generated outputs (Graphify graph.json etc.) — intentionally large
  "services/dsh/evidence",
  "services/wlt/evidence",
];

// ── Walker ────────────────────────────────────────────────────────────────────
function walk(dir, results = []) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return results;
  }

  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    const rel = toPosix(path.relative(repoRoot, full));

    if (entry.isDirectory()) {
      if (EXCLUDED_DIRS.has(entry.name)) continue;
      if (EXCLUDED_PATH_PREFIXES.some((p) => rel.startsWith(p))) continue;
      walk(full, results);
    } else {
      if (EXCLUDED_PATH_PREFIXES.some((p) => rel.startsWith(p))) continue;
      // skip git-tracked metadata files
      if (entry.name === "pnpm-lock.yaml" || entry.name === "package-lock.json") continue;
      results.push({ full, rel, name: entry.name });
    }
  }
  return results;
}

// ── Main scan ─────────────────────────────────────────────────────────────────
const allFiles = [];
for (const root of SCAN_ROOTS) {
  walk(path.join(repoRoot, root), allFiles);
}

for (const { full, rel, name } of allFiles) {
  const ext = path.extname(name).toLowerCase().slice(1);

  // 1. Forbidden extension check
  if (FORBIDDEN_EXTENSIONS.has(ext)) {
    const allowed = FORBIDDEN_ALLOWLIST.some((p) => rel.startsWith(p));
    if (!allowed) {
      violations.push({
        file: rel,
        line: 0,
        message: `FORBIDDEN_FILE: '*.${ext}' files must not be tracked in Git. Move to .gitignore or remove.`,
      });
      continue;
    }
  }

  // 1b. Files with no recognized extension — likely drafts/temp files
  const RECOGNIZED_EXTS = new Set([
    "ts","tsx","js","jsx","mjs","cjs","go","ps1","sh","py",
    "md","mdx","json","yaml","yml","toml","sql","env","lock",
    "png","jpg","jpeg","gif","webp","svg","ico",
    "gitignore","gitattributes","editorconfig","prettierrc","eslintrc",
    "nvmrc","tool-versions","dockerignore",
    "mod","sum",         // Go modules
    "xml","html","css","scss",
    "map",               // source maps (*.js.map, *.d.ts.map)
    "example",           // env examples (*.env.example)
    "d",                 // TypeScript declaration files (.d.ts)
    "properties",        // sonar-project.properties, etc.
    "conf","config",     // config files
    "Dockerfile","dockerfile", // Docker
  ]);
  // Also allow files named exactly 'Dockerfile', 'Makefile', '.env.*'
  const isAllowedNoExt =
    name === "Dockerfile" ||
    name === "Makefile"   ||
    name.startsWith(".env");
  if (!isAllowedNoExt && (ext === "" || !RECOGNIZED_EXTS.has(ext))) {
    if (!name.startsWith(".") && !name.endsWith(".lock")) {
      warnings.push({
        file: rel,
        bytes: 0,
        message: `NO_EXTENSION: File '${name}' has no recognized extension. Likely a draft/temp file — add extension or remove.`,
      });
    }
  }

  // 2. Size check
  let stat;
  try {
    stat = fs.statSync(full);
  } catch {
    continue;
  }
  const bytes = stat.size;
  const bucket = bucketFor(ext);
  const limits = THRESHOLDS[bucket];

  if (bytes >= limits.fail) {
    violations.push({
      file: rel,
      line: 0,
      message: `FILE_TOO_LARGE: ${(bytes / 1024).toFixed(0)} KB exceeds ${(limits.fail / 1024).toFixed(0)} KB limit for '${bucket}' files.`,
    });
  } else if (bytes >= limits.warn) {
    warnings.push({
      file: rel,
      bytes,
      message: `FILE_SIZE_WARN: ${(bytes / 1024).toFixed(0)} KB — consider splitting or archiving (limit: ${(limits.fail / 1024).toFixed(0)} KB).`,
    });
  }
}

// ── Report ────────────────────────────────────────────────────────────────────
if (warnings.length > 0) {
  // Sort by size descending
  warnings.sort((a, b) => b.bytes - a.bytes);
  console.log(`\n${guardId} WARNINGS (${warnings.length} oversized files):`);
  for (const w of warnings) {
    console.log(`  ⚠  ${w.file} — ${w.message}`);
  }
}

fail(guardId, violations);
