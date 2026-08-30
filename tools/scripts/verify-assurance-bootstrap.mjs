import { readFileSync } from "node:fs";

const required = [
  [".github/workflows/ci-check.yml", "authoritative definition must run from", "Required CI definition must be default-branch only"],
  [".github/workflows/ci-check.yml", "required CI status publication is forbidden outside", "Required CI status publication must be default-branch only"],
  [".github/workflows/ci-check.yml", "TRUSTED_WORKFLOW_SHA", "CI router must come from trusted workflow SHA"],
  [".github/workflows/ci-check.yml", "trusted_router", "CI router must not execute candidate router as authority"],
  [".github/workflows/ci-check.yml", "TRUSTED_ASSURANCE_AUTHORITY_DRIFT", "CI must enforce protected assurance-authority drift"],
  [".github/workflows/ci-check.yml", "TRUSTED_MIGRATION_MANIFEST_GUARD", "Migration history authority must come from trusted workflow SHA"],
  [".github/workflows/ci-check.yml", "TRUSTED_SONAR_OWNERSHIP_GUARD", "Sonar coverage ownership authority must come from trusted workflow SHA"],
  [".github/workflows/ci-check.yml", "fetch_trusted tools/verification/ownership.manifest.json", "Sonar ownership policy must come from trusted workflow SHA"],
  ["tools/scripts/verify-assurance-authority-drift.mjs", "ASSURANCE_AUTHORITY_CHANGE_REQUIRES_BOOTSTRAP", "Assurance authority changes must fail ordinary trusted CI and require bootstrap"],
  ["tools/scripts/verify-assurance-authority-drift.mjs", "authorityDiffSha256", "Assurance bootstrap must have a deterministic authority-diff fingerprint"],
  ["tools/scripts/verify-pr-evidence-comments.mjs", "BTHWANI_ASSURANCE_BOOTSTRAP:v1", "Canonical evidence validator must understand assurance bootstrap attestations"],
  [".github/workflows/ci-check.yml", "BTHWANI_ASSURANCE_BOOTSTRAP_MODE: solo-owner", "Solo-maintainer bootstrap mode must be explicit in the trusted workflow"],
  [".github/workflows/ci-check.yml", "BTHWANI_SOLO_MAINTAINER_LOGIN: bthwani2-boop", "Solo-maintainer identity must be explicit in the trusted workflow"],
  ["tools/scripts/verify-pr-evidence-comments.mjs", "solo-owner-maintainer", "Solo-owner bootstrap must have an explicit attestation identity"],
  ["tools/scripts/verify-pr-evidence-comments.mjs", "external-authorized-assurance-reviewer", "Independent bootstrap mode must remain supported"],
  ["tools/scripts/verify-pr-evidence-comments.mjs", "bootstrap authority diff SHA-256 does not match trusted evidence", "Bootstrap attestation must bind the exact authority diff"],
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
  [".github/workflows/semgrep.yml", "Load trusted Semgrep evidence classifier", "Semgrep disposition authority must come from trusted workflow SHA"],
  [".github/workflows/semgrep.yml", "TRUSTED_SEMGREP_CLASSIFIER", "Semgrep must execute the trusted evidence classifier"],
  [".github/workflows/semgrep.yml", "TRUSTED_BASELINE_COMPARATOR", "Semgrep baseline ratchet must execute the trusted comparator"],
  ["tools/scripts/compare-assurance-baseline.mjs", "baselineExecutionStatus", "Baseline comparison must separate scanner execution from findings"],
  [".github/workflows/codeql.yml", "TRUSTED_CODEQL_CLASSIFIER", "CodeQL must execute the trusted evidence classifier"],
  [".github/workflows/codeql.yml", "Consume exact CodeQL findings before trusted upload", "CodeQL findings must be consumed before SARIF upload"],
  ["tools/scripts/classify-codeql-evidence.mjs", "FINDINGS_OPEN", "CodeQL findings must remain explicit when present"],
  [".github/workflows/sonarqube.yml", "TRUSTED_SONAR_CLASSIFIER", "Sonar must execute the trusted evidence classifier"],
  ["tools/scripts/classify-sonar-evidence.mjs", "QUALITY_GATE_OPEN", "Sonar quality-gate and findings status must remain distinct"],
  [".github/workflows/sonarqube.yml", "-Dsonar.qualitygate.wait=true", "Sonar must wait for the remote quality gate result"],
  [".github/workflows/final-closure.yml", "TRUSTED_WORKFLOW_SHA", "Final Closure classifier must be trusted"],
  [".github/workflows/ci-check.yml", "BThwani / Change Verification", "Change Verification must have its own status context"],
  [".github/workflows/final-closure.yml", "BThwani / Change Closure", "Change Closure must have its own status context"],
  [".github/workflows/repository-baseline.yml", "BThwani / Static Repository Baseline", "Static Repository Baseline must have its own status context"],
  [".github/workflows/repository-baseline.yml", "BASELINE_OPEN", "Open baseline debt must remain explicit"],
  [".github/workflows/repository-baseline.yml", "uses: ./.github/workflows/codeql.yml", "Static Repository Baseline must include a full CodeQL baseline"],
  [".github/workflows/repository-baseline.yml", "uses: ./.github/workflows/sonarqube.yml", "Static Repository Baseline must include a full Sonar baseline"],
  ["tools/scripts/compare-assurance-baseline.mjs", "worsenedMaterial", "Baseline ratchet must detect severity regressions"],
  ["tools/scripts/run-deep-discovery.mjs", "evidenceLifecycle", "Discovery must emit an evidence lifecycle for agent consumption"],
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
]) if (pattern.test(ci)) failures.push(reason);

const security = readFileSync(".github/workflows/security-remote.yml", "utf8");
for (const [pattern, reason] of [
  [/run:\s*bash tools\/scripts\/install-oss-toolchain-binaries\.sh/u, "candidate toolchain installer must not establish remote analyzer authority"],
  [/osv-scanner\) node tools\/scripts\/run-osv-scanner\.mjs/u, "candidate OSV wrapper must not establish remote analyzer authority"],
  [/run:\s*node tools\/guards\/remote-analysis-authority-gate\.mjs/u, "candidate remote-analysis guard must not establish authority"],
]) if (pattern.test(security)) failures.push(reason);

const semgrep = readFileSync(".github/workflows/semgrep.yml", "utf8");
if (/node tools\/scripts\/classify-semgrep-evidence\.mjs/u.test(semgrep)) {
  failures.push("candidate Semgrep classifier must not establish evidence disposition authority");
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
console.log("Structural proof only. The candidate is not the new trust root until bootstrap attestation is accepted under the configured trusted mode and the candidate is promoted to protected master.");
