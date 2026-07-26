// Enforces spec §19.7 (move-before-archive) and the retention policy's document
// canonicalization rule: a retired/superseded document must not remain outside
// governance/archive/ once it declares a retired status marker, and no two tracked
// documents may declare themselves canonical for the exact same title.
import fs from "node:fs";
import path from "node:path";
import { fail, repoRoot } from "./_guard-utils.mjs";

const guardId = "canonical-paths-gate";
const violations = [];

function readJson(relative) {
  const full = path.join(repoRoot, relative);
  if (!fs.existsSync(full)) return undefined;
  try {
    return JSON.parse(fs.readFileSync(full, "utf8"));
  } catch (error) {
    violations.push({ file: relative, line: 0, message: `INVALID_JSON ${error.message}` });
    return undefined;
  }
}

const retention = readJson("governance/cleanup/repository-retention-policy.json");
const retiredMarkers = (retention?.documents?.retiredMarkers ?? []).map((marker) => marker.toLowerCase());
const archiveRoot = retention?.documents?.archiveRoot ?? "governance/archive/";
const roots = retention?.documents?.roots ?? ["docs/", "governance/"];

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, files);
      continue;
    }
    if (entry.name.endsWith(".md")) files.push(full);
  }
  return files;
}

const titleOwners = new Map();

for (const root of roots) {
  const full = path.join(repoRoot, root);
  if (!fs.existsSync(full)) continue;
  for (const filePath of walk(full)) {
    const relative = path.relative(repoRoot, filePath).replaceAll("\\", "/");
    if (relative.startsWith(archiveRoot) || relative.includes("/archive/") || relative.includes("_noncanonical/")) continue;
    const content = fs.readFileSync(filePath, "utf8").toLowerCase();

    if (retiredMarkers.some((marker) => content.includes(marker))) {
      violations.push({ file: relative, line: 0, message: `RETIRED_DOCUMENT_NOT_ARCHIVED expected_under=${archiveRoot}` });
    }

    const titleMatch = content.match(/^#\s+(.+)$/m);
    if (titleMatch) {
      const title = titleMatch[1].trim();
      if (content.includes("status: canonical") || content.includes("status: active_canonical")) {
        if (titleOwners.has(title) && titleOwners.get(title) !== relative) {
          violations.push({ file: relative, line: 0, message: `DUPLICATE_CANONICAL_TITLE "${title}" also claimed by ${titleOwners.get(title)}` });
        } else {
          titleOwners.set(title, relative);
        }
      }
    }
  }
}

fail(guardId, violations);
