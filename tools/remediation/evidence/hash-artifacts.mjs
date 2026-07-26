// Recomputes sha256 for every file in an evidence directory and reports any mismatch
// against a previously recorded manifest.json — proves artifacts were not altered
// after being recorded.
import fs from "node:fs";
import path from "node:path";
import { repoRoot, sha256 } from "../_remediation-utils.mjs";

export function verifyArtifactHashes(manifest, evidenceDir) {
  const mismatches = [];
  for (const artifact of manifest.artifacts ?? []) {
    const full = path.join(evidenceDir, artifact.name);
    if (!fs.existsSync(full)) {
      mismatches.push({ name: artifact.name, reason: "MISSING" });
      continue;
    }
    const actual = sha256(fs.readFileSync(full));
    if (actual !== artifact.sha256) mismatches.push({ name: artifact.name, reason: "HASH_MISMATCH", expected: artifact.sha256, actual });
  }
  return mismatches;
}

function main() {
  const [evidenceDirArg] = process.argv.slice(2);
  if (!evidenceDirArg) {
    console.error("usage: hash-artifacts.mjs <evidence-dir>");
    process.exit(2);
  }
  const evidenceDir = path.resolve(repoRoot, evidenceDirArg);
  const manifestPath = path.join(evidenceDir, "manifest.json");
  if (!fs.existsSync(manifestPath)) {
    console.error("hash-artifacts: MANIFEST_MISSING");
    process.exit(1);
  }
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  const mismatches = verifyArtifactHashes(manifest, evidenceDir);
  if (mismatches.length) {
    console.error(`hash-artifacts: FAIL (${mismatches.length})`);
    for (const mismatch of mismatches) console.error(`- ${mismatch.name}: ${mismatch.reason}`);
    process.exit(1);
  }
  console.log("hash-artifacts: PASS");
}

if (process.argv[1]?.endsWith("hash-artifacts.mjs")) main();
