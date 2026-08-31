import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
const read = (p) => readFileSync(p, "utf8");

test("Final Closure cannot publish success before manifest upload", () => {
  const f = read(".github/workflows/final-closure.yml");
  const upload = f.indexOf("Upload generated closure manifest");
  const success = f.indexOf("Publish Final Closure success only after manifest publication");
  assert.ok(upload >= 0 && success > upload);
  const beforeUpload = f.slice(0, upload);
  assert.doesNotMatch(beforeUpload, /-f state=success -f context='BThwani \/ Change Closure'/u);
});

test("CI control-plane technical controls are loaded from trusted workflow SHA", () => {
  const f = read(".github/workflows/ci-check.yml");
  assert.match(f, /authoritative definition must run from/u);
  assert.match(f, /required CI status publication is forbidden outside/u);
  assert.match(f, /Load trusted CI control-plane authorities/u);
  assert.match(f, /TRUSTED_WORKFLOW_SHA/u);
   assert.match(f, /check-ci-source-immutability\.mjs/u);
   assert.match(f, /migration-manifest-drift-gate\.mjs/u);
   assert.match(f, /sonar-coverage-ownership-gate\.mjs/u);
   const retiredAuthority = ["verify-assurance-", "authority-drift"].join("");
   const retiredBootstrap = ["ASSURANCE_", "BOOTSTRAP"].join("");
   const retiredSoloOwner = ["solo-", "owner"].join("");
   assert.doesNotMatch(f, new RegExp(retiredAuthority + "|" + retiredBootstrap + "|" + retiredSoloOwner, "iu"));
   assert.match(read("tools/scripts/check-ci-source-immutability.mjs"), /BTHWANI_TARGET_REPO/u);
});

test("Remote Security authority, wrappers, installer, and policy come from trusted workflow SHA", () => {
  const f = read(".github/workflows/security-remote.yml");
  assert.match(f, /Materialize trusted remote-analysis authority/u);
  assert.match(f, /Materialize trusted analyzer authority and policy/u);
  assert.match(f, /TRUSTED_WORKFLOW_SHA/u);
  assert.match(f, /git archive "\$\{TRUSTED_WORKFLOW_SHA\}"/u);
  assert.match(f, /TRUSTED_SECURITY_ROOT/u);
  assert.match(f, /BTHWANI_TRUSTED_POLICY_ROOT/u);
  assert.ok(f.includes("${TRUSTED_SECURITY_ROOT}/tools/scripts/install-oss-toolchain-binaries.sh"));
  assert.ok(f.includes("${TRUSTED_SECURITY_ROOT}/tools/guards/remote-analysis-authority-gate.mjs"));
  assert.ok(f.includes("${TRUSTED_SECURITY_ROOT}/tools/scripts/run-osv-scanner.mjs"));
  assert.ok(f.includes("${TRUSTED_SECURITY_ROOT}/.gitleaksignore"));
  assert.doesNotMatch(f, /run:\s*bash tools\/scripts\/install-oss-toolchain-binaries\.sh/u);
  assert.doesNotMatch(f, /osv-scanner\) node tools\/scripts\/run-osv-scanner\.mjs/u);
  assert.match(read("tools/scripts/run-pinact.mjs"), /BTHWANI_TARGET_REPO/u);
  assert.match(read("tools/scripts/run-osv-scanner.mjs"), /BTHWANI_TRUSTED_POLICY_ROOT/u);
  assert.match(read("tools/scripts/run-trivy.mjs"), /BTHWANI_TRUSTED_POLICY_ROOT/u);
  assert.match(read("tools/scripts/run-shellcheck.mjs"), /--norc/u);
  const externalRunner = read("tools/scripts/_external-tool-runner.mjs");
  assert.doesNotMatch(externalRunner, /execSync/u);
  assert.match(externalRunner, /shell:\s*false/u);
  assert.match(externalRunner, /makeArgs/u);
});

test("Semgrep evidence disposition is loaded from trusted workflow authority", () => {
  const f = read(".github/workflows/semgrep.yml");
  assert.match(f, /Load trusted Semgrep evidence classifier/u);
  assert.match(f, /TRUSTED_WORKFLOW_SHA/u);
  assert.match(f, /TRUSTED_SEMGREP_CLASSIFIER/u);
  assert.match(f, /contents\/tools\/scripts\/classify-semgrep-evidence\.mjs/u);
  assert.ok(f.includes('node "${TRUSTED_SEMGREP_CLASSIFIER}"'));
  assert.doesNotMatch(f, /node tools\/scripts\/classify-semgrep-evidence\.mjs/u);
});

test("CodeQL trusted upload consumes SARIF findings before publishing", () => {
  const f = read(".github/workflows/codeql.yml");
  assert.match(f, /Load trusted CodeQL evidence classifier/u);
  assert.match(f, /classify-codeql-evidence\.mjs/u);
  assert.match(f, /Consume CodeQL findings with explicit disposition/u);
  assert.match(f, /Upload CodeQL finding disposition evidence/u);
  assert.match(f, /CodeQL evidence is incomplete/u);
  assert.match(read("tools/scripts/classify-codeql-evidence.mjs"), /FINDINGS_OPEN/u);
});

test("CodeQL trusted upload waits for processing and exact analysis binding", () => {
  const f = read(".github/workflows/codeql.yml");
  const validator = read("tools/scripts/validate-codeql-analysis-binding.mjs");
  assert.match(f, /processing_status/u);
  assert.match(f, /analyses_url/u);
  assert.match(f, /Load trusted CodeQL analysis binding validator/u);
  assert.match(f, /TRUSTED_CODEQL_ANALYSIS_VALIDATOR/u);
  assert.match(f, /validate-codeql-analysis-binding\.mjs/u);
  assert.match(f, /--candidate-sha "\$\{CANDIDATE_SHA\}"/u);
  assert.match(f, /--candidate-ref "\$\{CANDIDATE_REF\}"/u);
  assert.match(validator, /response root must be an array/u);
  assert.match(validator, /exactly one exact CodeQL analysis binding/u);
  assert.match(validator, /commit_sha/u);
  assert.match(validator, /candidateRef/u);
  assert.match(f, /codeql-upload-lifecycle-/u);
});

test("Sonar scan waits for the remote quality-gate result", () => {
  const f = read(".github/workflows/sonarqube.yml");
  assert.match(f, /-Dsonar\.qualitygate\.wait=true/u);
  assert.match(f, /-Dsonar\.qualitygate\.timeout=300/u);
});

test("Sonar evidence retrieval uses endpoint-specific identity and complete pagination", () => {
  const f = read(".github/workflows/sonarqube.yml");
  assert.match(f, /componentKeys=\$\{SONAR_PROJECT_KEY\}/u);
  assert.match(f, /component=\$\{SONAR_PROJECT_KEY\}/u);
  assert.match(f, /fetch_remaining_pages issues api\/issues\/search/u);
  assert.match(f, /fetch_remaining_pages hotspots api\/hotspots\/search/u);
  assert.match(f, /merge_paged_json issues/u);
  assert.match(f, /merge_paged_json hotspots/u);
});

test("Sonar raw API output is consumed as explicit evidence", () => {
  const f = read(".github/workflows/sonarqube.yml");
  const classifier = read("tools/scripts/classify-sonar-evidence.mjs");
  const evidenceBlock = f.slice(f.indexOf("  evidence:"), f.indexOf("  result:"));
  assert.match(f, /name: Consume Sonar evidence/u);
  assert.match(f, /api\/qualitygates\/project_status/u);
  assert.match(f, /api\/issues\/search/u);
  assert.match(f, /api\/hotspots\/search/u);
  assert.match(f, /api\/measures\/component/u);
  assert.match(f, /TRUSTED_SONAR_CLASSIFIER/u);
  assert.match(f, /Upload consumed Sonar evidence/u);
  assert.match(evidenceBlock, /if: \$\{\{ always\(\) && inputs\.trusted_scan/u);
  assert.doesNotMatch(evidenceBlock, /needs\.scan\.result == 'success'/u);
  assert.match(classifier, /evidenceComplete/u);
  assert.match(classifier, /QUALITY_GATE_OPEN/u);
});

test("experience evidence records are exact-candidate, provenance-bound, and producer-identified", () => {
  const v = read("tools/scripts/verify-pr-evidence-comments.mjs");
  assert.match(v, /OWNER association/u);
  assert.match(v, /evidenceSha256/u);
  assert.match(v, /capturedAt/u);
  assert.match(v, /authorized-host-runner/u);
  assert.match(v, /external-device-runner/u);
  assert.match(v, /producerIdentity/u);
  const retiredReviewer = ["external-authorized-", "assurance-reviewer"].join("");
  const retiredSoloOwner = ["solo-", "owner"].join("");
  assert.doesNotMatch(v, new RegExp("bootstrap|candidateAuthors|APPROVED PR review|reviewIdentity|reviewProvenance|semantic|" + retiredReviewer + "|" + retiredSoloOwner, "iu"));
});

test("OpenCodeReview trusted-source retrieval is authenticated in its reusable worker", () => {
  const o = read(".github/workflows/open-code-review.yml");
  assert.match(o, /GH_TOKEN: \$\{\{ github\.token \}\}/u);
  assert.match(o, /gh api --method GET/u);
  assert.match(o, /tools\/scripts\/invoke-open-code-review-toolchain\.ps1/u);
  assert.match(o, /tools\/scripts\/capture-tool-evidence\.mjs/u);
});


test("Node aggregate references a real typed-lint producer", () => {
  const f = read(".github/workflows/ci-node-verification.yml");
  assert.match(f, /id: typed_lint/u);
  assert.match(f, /run: pnpm run lint:typed/u);
  assert.match(f, /TYPED_LINT: \$\{\{ steps\.typed_lint\.outcome \}\}/u);
});
