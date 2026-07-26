// Lightweight orphan-file signal for the remediation cleanup track (spec §19.1,
// §10.2): flags tracked files under tools/scripts/** and tools/remediation/** with no
// static reference anywhere else in the tracked tree. This is a narrow proxy, not a
// substitute for the full knip-based dead-code diagnosis; it never deletes anything
// and a positive here routes to classify-cleanup-candidate.mjs for full review.
import fs from "node:fs";
import path from "node:path";
import { fail, repoRoot, listCodeFiles, read } from "./_guard-utils.mjs";

const guardId = "orphan-files-gate";
const violations = [];
const warnings = [];
const scannedRoots = ["tools/scripts", "tools/remediation"];

function collectCandidates(root) {
  const full = path.join(repoRoot, root);
  if (!fs.existsSync(full)) return [];
  const files = [];
  const stack = [full];
  while (stack.length) {
    const dir = stack.pop();
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const entryPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        stack.push(entryPath);
        continue;
      }
      if (entry.name.startsWith("_") || entry.name.endsWith(".test.mjs") || !entry.name.endsWith(".mjs")) continue;
      files.push(path.relative(repoRoot, entryPath).replaceAll("\\", "/"));
    }
  }
  return files;
}

function listWorkflowFiles() {
  const dir = path.join(repoRoot, ".github", "workflows");
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((name) => /\.ya?ml$/i.test(name))
    .map((name) => `.github/workflows/${name}`);
}

const allCode = listCodeFiles();
const workflowFiles = listWorkflowFiles();
const candidates = scannedRoots.flatMap(collectCandidates);
const packageScripts = JSON.stringify(JSON.parse(read("package.json")).scripts ?? {});

for (const candidate of candidates) {
  const baseName = path.basename(candidate, ".mjs");
  const referencedInScripts = packageScripts.includes(candidate) || packageScripts.includes(baseName);
  const referencedInCode = allCode.some((file) => {
    if (file === candidate) return false;
    const content = read(file);
    return content.includes(baseName) || content.includes(candidate);
  });
  const referencedInWorkflows = workflowFiles.some((file) => read(file).includes(candidate));
  if (!referencedInScripts && !referencedInCode && !referencedInWorkflows) {
    warnings.push({ file: candidate, message: "ORPHAN_CANDIDATE_NO_STATIC_REFERENCE" });
  }
}

if (warnings.length > 0) {
  console.log(`\n${guardId} WARNINGS (${warnings.length} candidates with no static reference found — route each to classify-cleanup-candidate.mjs, never delete on this signal alone):`);
  for (const warning of warnings) console.log(`  - ${warning.file} ${warning.message}`);
}

// violations stays reserved for real failures (e.g. read errors); orphan candidates
// are WARN-only by design, matching this guard's "warn" exit_level registration.
fail(guardId, violations);
