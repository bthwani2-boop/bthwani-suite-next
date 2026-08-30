import { readFileSync } from "node:fs";

const required = [
  [".github/workflows/ci-check.yml", "TRUSTED_WORKFLOW_SHA", "CI router must come from trusted workflow SHA"],
  [".github/workflows/ci-check.yml", "trusted_router", "CI router must not execute candidate router as authority"],
  [".github/workflows/ci-check.yml", "TRUSTED_MIGRATION_MANIFEST_GUARD", "Migration history authority must come from trusted workflow SHA"],
  [".github/workflows/ci-check.yml", "TRUSTED_SONAR_OWNERSHIP_GUARD", "Sonar coverage ownership authority must come from trusted workflow SHA"],
  [".github/workflows/ci-check.yml", "fetch_trusted tools/verification/ownership.manifest.json", "Sonar ownership policy must come from trusted workflow SHA"],
  ["tools/guards/migration-manifest-drift-gate.mjs", "BTHWANI_TARGET_REPO", "Trusted migration authority must evaluate an explicit candidate workspace"],
  ["tools/guards/_guard-utils.mjs", "BTHWANI_TARGET_REPO", "Trusted shared guard utilities must evaluate an explicit candidate workspace"],
  [".github/workflows/final-closure.yml", "TRUSTED_WORKFLOW_SHA", "Final Closure classifier must be trusted"],
  [".github/workflows/final-closure.yml", "trusted_router", "Final Closure router must be trusted"],
  [".github/workflows/final-closure.yml", "verify-pr-evidence-comments.mjs", "Final Closure must load trusted evidence validator"],
  [".github/workflows/final-closure.yml", "semantic-review:", "Semantic review must bind into closure"],
  [".github/workflows/final-closure.yml", "rendered-web-baseline:", "Rendered baseline must bind into closure"],
  [".github/workflows/final-closure.yml", "rendered-web-evidence:", "Rendered material evidence must bind into closure"],
  [".github/workflows/final-closure.yml", "mobile-evidence:", "Mobile material evidence must bind into closure"],
  [".github/workflows/final-closure.yml", "rendered-web:NOT_COVERED", "Missing rendered evidence must block closure"],
  [".github/workflows/final-closure.yml", "mobile-device:NOT_COVERED", "Missing mobile evidence must block closure"],
  [".github/workflows/open-code-review.yml", "opencodereview-delegation-${HEAD_SHA}-${context_sha256}", "OCR provenance must be deterministic"],
  [".github/workflows/rendered-web-evidence.yml", "Load trusted rendered verifier", "Rendered baseline verifier must be trusted"],
  ["tools/scripts/verify-pr-evidence-comments.mjs", "does not match trusted OCR context", "Semantic attestation must match trusted OCR provenance"],
  ["tools/prompting/bthwani-orchestrator/00-ORCHESTRATOR.md", "SEMANTIC_SELF_CERTIFICATION: FORBIDDEN", "Orchestrator must not self-certify"],
  ["AGENTS.md", "canonical repository execution/closure authority", "Agent layer must converge on orchestrator"],
];

const failures = [];
for (const [file, marker, reason] of required) {
  let text = "";
  try { text = readFileSync(file, "utf8"); }
  catch { failures.push(`${file}: missing — ${reason}`); continue; }
  if (!text.includes(marker)) failures.push(`${file}: missing marker '${marker}' — ${reason}`);
}

const ci = readFileSync(".github/workflows/ci-check.yml", "utf8");
for (const [pattern, reason] of [
  [/run:\s*node tools\/guards\/migration-manifest-drift-gate\.mjs/u, "candidate migration guard must not be the CI authority"],
  [/node --test tools\/guards\/sonar-coverage-ownership-gate\.test\.mjs/u, "candidate Sonar guard test must not establish CI authority"],
]) {
  if (pattern.test(ci)) failures.push(reason);
}

const final = readFileSync(".github/workflows/final-closure.yml", "utf8");
for (const requiredResult of ["SEMANTIC_REVIEW_RESULT", "RENDERED_WEB_REQUIRED", "MOBILE_EVIDENCE_REQUIRED"]) {
  if (!final.includes(requiredResult)) failures.push(`Final Closure missing ${requiredResult}`);
}
if (!final.includes("experienceEvidence:")) failures.push("closure manifest lacks experienceEvidence dispositions");

if (failures.length) {
  console.error("ASSURANCE_BOOTSTRAP_VERIFY: FAIL");
  failures.forEach((f) => console.error(`- ${f}`));
  process.exit(1);
}
console.log("ASSURANCE_BOOTSTRAP_VERIFY: PASS");
console.log("Structural proof only. The candidate is not the new trust root until independent review and promotion to protected master.");
