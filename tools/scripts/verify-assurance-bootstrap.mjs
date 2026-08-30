import { readFileSync } from "node:fs";

const required = [
  [".github/workflows/ci-check.yml", "TRUSTED_WORKFLOW_SHA", "CI router must come from trusted workflow SHA"],
  [".github/workflows/ci-check.yml", "trusted_router", "CI router must not execute candidate router as authority"],
  [".github/workflows/ci-check.yml", "TRUSTED_MIGRATION_MANIFEST_GUARD", "Migration history authority must come from trusted workflow SHA"],
  [".github/workflows/ci-check.yml", "TRUSTED_SONAR_OWNERSHIP_GUARD", "Sonar coverage ownership authority must come from trusted workflow SHA"],
  [".github/workflows/ci-check.yml", "fetch_trusted tools/verification/ownership.manifest.json", "Sonar ownership policy must come from trusted workflow SHA"],
  ["tools/guards/migration-manifest-drift-gate.mjs", "BTHWANI_TARGET_REPO", "Trusted migration authority must evaluate an explicit candidate workspace"],
  ["tools/guards/_guard-utils.mjs", "BTHWANI_TARGET_REPO", "Trusted shared guard utilities must evaluate an explicit candidate workspace"],
  [".github/workflows/security-remote.yml", "Materialize trusted remote-analysis authority", "Remote security authority must come from trusted workflow SHA"],
  [".github/workflows/security-remote.yml", "Materialize trusted analyzer authority and policy", "Remote analyzer wrappers and policy must come from trusted workflow SHA"],
  [".github/workflows/security-remote.yml", "TRUSTED_SECURITY_ROOT", "Remote security must execute the isolated trusted authority tree"],
  [".github/workflows/security-remote.yml", "BTHWANI_TRUSTED_POLICY_ROOT", "Remote analyzer policy must be isolated from candidate policy files"],
  ["tools/scripts/run-pinact.mjs", "BTHWANI_TARGET_REPO", "Trusted pin verifier must evaluate candidate workflows"],
  ["tools/scripts/run-osv-scanner.mjs", "BTHWANI_TRUSTED_POLICY_ROOT", "OSV policy must be trusted"],
  ["tools/scripts/run-trivy.mjs", "BTHWANI_TRUSTED_POLICY_ROOT", "Trivy policy must be trusted"],
  ["tools/scripts/run-shellcheck.mjs", "--norc", "ShellCheck must not consume candidate rc policy"],
  ["tools/scripts/check-sonarqube-config.ps1", "BTHWANI_TARGET_REPO", "Trusted Sonar config verifier must evaluate candidate configuration"],
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

const security = readFileSync(".github/workflows/security-remote.yml", "utf8");
for (const [pattern, reason] of [
  [/run:\s*bash tools\/scripts\/install-oss-toolchain-binaries\.sh/u, "candidate toolchain installer must not establish remote analyzer authority"],
  [/osv-scanner\) node tools\/scripts\/run-osv-scanner\.mjs/u, "candidate OSV wrapper must not establish remote analyzer authority"],
  [/run:\s*node tools\/guards\/remote-analysis-authority-gate\.mjs/u, "candidate remote-analysis guard must not establish authority"],
]) {
  if (pattern.test(security)) failures.push(reason);
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
