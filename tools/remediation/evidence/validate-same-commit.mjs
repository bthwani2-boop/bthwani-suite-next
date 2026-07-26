// Fails closed unless every evidence manifest's sourceSha equals the contract's
// frozen commit and the current HEAD (spec §2.5 / §20 "same-commit evidence").
import fs from "node:fs";
import path from "node:path";
import { repoRoot, gitHeadSha } from "../_remediation-utils.mjs";

export function validateSameCommit(manifest, contract, headSha) {
  const violations = [];
  const frozenCommit = contract?.source?.baseSha;
  if (frozenCommit && manifest.sourceSha !== frozenCommit && manifest.sourceSha !== headSha) {
    violations.push(`EVIDENCE_COMMIT_MISMATCH manifest=${manifest.sourceSha} frozen=${frozenCommit} head=${headSha}`);
  }
  if (manifest.sourceSha !== headSha) {
    violations.push(`EVIDENCE_NOT_ON_CURRENT_HEAD manifest=${manifest.sourceSha} head=${headSha}`);
  }
  return violations;
}

function main() {
  const [manifestPath, contractPath] = process.argv.slice(2);
  if (!manifestPath || !contractPath) {
    console.error("usage: validate-same-commit.mjs <manifest.json> <task-contract.json>");
    process.exit(2);
  }
  const manifest = JSON.parse(fs.readFileSync(path.resolve(repoRoot, manifestPath), "utf8"));
  const contract = JSON.parse(fs.readFileSync(path.resolve(repoRoot, contractPath), "utf8"));
  const violations = validateSameCommit(manifest, contract, gitHeadSha());
  if (violations.length) {
    console.error("validate-same-commit: FAIL");
    for (const violation of violations) console.error(`- ${violation}`);
    process.exit(1);
  }
  console.log("validate-same-commit: PASS");
}

if (process.argv[1]?.endsWith("validate-same-commit.mjs")) main();
