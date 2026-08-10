import fs from "node:fs";
import path from "node:path";
import { fail, repoRoot } from "./_guard-utils.mjs";

const guardId = "canonical-paths-gate";
const violations = [];
const retentionPath = "governance/policies/repository-retention-policy.json";
const fullRetentionPath = path.join(repoRoot, retentionPath);

if (!fs.existsSync(fullRetentionPath)) {
  violations.push({ file: retentionPath, line: 0, message: "MISSING_RETENTION_POLICY" });
  fail(guardId, violations);
}

let retention;
try {
  retention = JSON.parse(fs.readFileSync(fullRetentionPath, "utf8"));
} catch (error) {
  violations.push({ file: retentionPath, line: 0, message: `INVALID_RETENTION_POLICY ${error.message}` });
  fail(guardId, violations);
}

const roots = retention.documents?.roots ?? [];
const archiveRoot = retention.documents?.archiveRoot ?? null;
const retiredMarkers = (retention.documents?.retiredMarkers ?? []).map((marker) => marker.toLowerCase());

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else if (entry.name.endsWith(".md")) files.push(full);
  }
  return files;
}

const titleOwners = new Map();
for (const root of roots) {
  const fullRoot = path.join(repoRoot, root);
  if (!fs.existsSync(fullRoot)) continue;
  for (const filePath of walk(fullRoot)) {
    const relative = path.relative(repoRoot, filePath).replaceAll("\\", "/");
    const content = fs.readFileSync(filePath, "utf8");
    const lower = content.toLowerCase();
    const isExplicitArchive = Boolean(archiveRoot) && relative.startsWith(archiveRoot);

    if (!isExplicitArchive && retiredMarkers.some((marker) => lower.includes(marker))) {
      violations.push({
        file: relative,
        line: 0,
        message: "RETIRED_OR_SUPERSEDED_DOCUMENT_STILL_TRACKED — remove/merge it or retain it only under an explicitly authorized archive class",
      });
    }

    const titleMatch = content.match(/^#\s+(.+)$/m);
    const claimsCanonical = /^Status:\s*(?:ACTIVE_CANONICAL|CANONICAL)\s*$/mi.test(content);
    if (titleMatch && claimsCanonical) {
      const title = titleMatch[1].trim().toLowerCase();
      const prior = titleOwners.get(title);
      if (prior && prior !== relative) {
        violations.push({ file: relative, line: 0, message: `DUPLICATE_CANONICAL_TITLE "${titleMatch[1].trim()}" also claimed by ${prior}` });
      } else {
        titleOwners.set(title, relative);
      }
    }
  }
}

fail(guardId, violations);
