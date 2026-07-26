// Applies the spec S19.2/S10.2 classification vocabulary to one
// inventory-cleanup-candidates.mjs result. Never deletes; only assigns a class from
// governance/remediation/cleanup-classification.json for a human/agent to act on.
import fs from "node:fs";
import { readJson } from "../_remediation-utils.mjs";

export function classifyCandidate(candidate, { protectedPatterns = [] } = {}) {
  if (!candidate.exists) return { class: "UNKNOWN_USAGE", reason: "File does not exist; classification requires an existing file." };
  if (protectedPatterns.some((pattern) => new RegExp(pattern).test(candidate.path))) {
    return { class: "PROTECTED", reason: "Path matches a forbidden-automatic-deletion class." };
  }
  if (candidate.generatedOutputRoot) return { class: "SAFE_DELETE", reason: `Tracked generated output under ${candidate.generatedOutputRoot}.` };
  if (candidate.referenceCount === 0 && !candidate.isTest) return { class: "REVIEWED_DELETE", reason: "No static reference found; requires manual review before any action (spec S19.5)." };
  if (candidate.referenceCount === 0 && candidate.isTest) return { class: "UNKNOWN_USAGE", reason: "Test file with no static reference; may be runtime- or CI-only." };
  return { class: "KEEP_CANONICAL", reason: "File is referenced and not generated output." };
}

function main() {
  const [candidatePath] = process.argv.slice(2);
  if (!candidatePath) {
    console.error("usage: classify-cleanup-candidate.mjs <candidate.json>");
    process.exit(2);
  }
  const candidate = JSON.parse(fs.readFileSync(candidatePath, "utf8"));
  readJson("governance/remediation/cleanup-classification.json"); // asserts the classification vocabulary is present
  const protectedPatterns = ["migrations?/", String.raw`contracts?/.*\.openapi\.ya?ml$`, "(^|/)audit(/|$)"];
  console.log(JSON.stringify(classifyCandidate(candidate, { protectedPatterns }), null, 2));
}

if (process.argv[1]?.endsWith("classify-cleanup-candidate.mjs")) main();
