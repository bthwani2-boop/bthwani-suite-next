// Legacy local-catalog reference scan (central catalog corrective closure).
//
// Walks the whole repository (not just changed files) for every retired
// local-catalog identifier and classifies each hit:
//   HISTORICAL_MIGRATION_ONLY        — ordered SQL history; must stay intact.
//   ARCHIVE_ONLY                     — archive/governance/diagnostic records.
//   CENTRAL_RUNTIME                  — central-catalog runtime, or guards that
//                                      assert the legacy shape is absent.
//   INVALID_LOCAL_RUNTIME_REFERENCE  — live code still depending on the
//                                      retired local catalog. Must be 0.
//
// Exit code is non-zero when any INVALID_LOCAL_RUNTIME_REFERENCE exists, so
// CI can gate on it.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const repoRoot = process.cwd();

const patterns = [
  /\bdsh_catalog_categories\b/,
  /\bdsh_catalog_products\b/,
  /\bdsh_catalog_media\b/,
  /\bdsh_catalog_audit\b/,
  /\bdsh_catalog_revisions\b/,
  /\bdsh_categories\b/,
  /\bcategory_id\b/,
  /\bstore\.category\b/,
  /\bInventoryCatalogScreen\b/,
  /\b(create|update|delete)PartnerCatalog(Product|Category)\b/,
];

const skipDirs = new Set([
  ".git",
  "node_modules",
  "dist",
  "build",
  ".next",
  ".expo",
  ".nx",
  "coverage",
  ".pnpm-store",
  // Generated, git-ignored analysis caches — never runtime truth.
  ".graphify",
]);

const skipExtensions = new Set([
  ".png", ".jpg", ".jpeg", ".gif", ".webp", ".ico", ".svg",
  ".woff", ".woff2", ".ttf", ".eot", ".zip", ".pdf", ".lock",
]);

const toPosix = (p) => p.split(path.sep).join("/");

function classify(relPath) {
  const p = toPosix(relPath);

  // Ordered SQL history: legacy shapes are created and retired here by design.
  if (/^services\/[^/]+\/database\/migrations\//.test(p)) {
    return "HISTORICAL_MIGRATION_ONLY";
  }

  // Central-catalog runtime guards and verification: these reference legacy
  // identifiers only to assert their absence or to prove the projection.
  const centralRuntimeFiles = new Set([
    "services/dsh/database/seeds/local/verify-central-catalog-seed.sql",
    "services/dsh/tests/central-catalog-closure.test.mjs",
    "tools/scripts/scan-legacy-catalog-references.mjs",
    "tools/scripts/test-central-catalog-migration.ps1",
    ".github/workflows/central-catalog-closure.yml",
  ]);
  if (centralRuntimeFiles.has(p)) return "CENTRAL_RUNTIME";

  // Documentation, governance records, checklists, diagnostics snapshots and
  // agent instructions are records of the past, never runtime truth.
  if (
    /^(governance|docs|\.agents|\.claude|\.diagnostics|tools\/checklist|tools\/diagnostics|machine-readable)\//.test(p) ||
    /^services\/[^/]+\/evidence\//.test(p) ||
    p.endsWith(".md")
  ) {
    return "ARCHIVE_ONLY";
  }

  return "INVALID_LOCAL_RUNTIME_REFERENCE";
}

function* walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (skipDirs.has(entry.name)) continue;
      yield* walk(path.join(dir, entry.name));
    } else if (entry.isFile()) {
      if (skipExtensions.has(path.extname(entry.name).toLowerCase())) continue;
      yield path.join(dir, entry.name);
    }
  }
}

const hits = [];
for (const file of walk(repoRoot)) {
  const rel = path.relative(repoRoot, file);
  let content;
  try {
    content = fs.readFileSync(file, "utf8");
  } catch {
    continue;
  }
  const lines = content.split(/\r?\n/);
  lines.forEach((line, i) => {
    for (const pattern of patterns) {
      if (pattern.test(line)) {
        hits.push({
          file: toPosix(rel),
          line: i + 1,
          pattern: String(pattern),
          classification: classify(rel),
          excerpt: line.trim().slice(0, 160),
        });
        break;
      }
    }
  });
}

const counts = {
  HISTORICAL_MIGRATION_ONLY: 0,
  ARCHIVE_ONLY: 0,
  CENTRAL_RUNTIME: 0,
  INVALID_LOCAL_RUNTIME_REFERENCE: 0,
};
for (const hit of hits) counts[hit.classification]++;

console.log("=== legacy local-catalog reference scan ===");
console.log(JSON.stringify(counts, null, 2));

const invalid = hits.filter(
  (h) => h.classification === "INVALID_LOCAL_RUNTIME_REFERENCE",
);
if (invalid.length > 0) {
  console.error("\nINVALID_LOCAL_RUNTIME_REFERENCE hits:");
  for (const hit of invalid) {
    console.error(`  ${hit.file}:${hit.line} [${hit.pattern}] ${hit.excerpt}`);
  }
  console.error(
    `\nFAIL: ${invalid.length} live reference(s) to the retired local catalog.`,
  );
  process.exit(1);
}

console.log(
  `\nPASS: 0 live local-catalog references (${hits.length} classified hits total).`,
);
