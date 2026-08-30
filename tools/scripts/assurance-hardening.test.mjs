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

test("CI control-plane authorities are loaded from trusted workflow SHA", () => {
  const f = read(".github/workflows/ci-check.yml");
  assert.match(f, /authoritative definition must run from/u);
  assert.match(f, /required CI status publication is forbidden outside/u);
  assert.match(f, /Load trusted CI control-plane authorities/u);
  assert.match(f, /TRUSTED_WORKFLOW_SHA/u);
  assert.match(f, /verify-assurance-authority-drift\.mjs/u);
  assert.match(f, /TRUSTED_ASSURANCE_AUTHORITY_DRIFT/u);
  assert.match(f, /ASSURANCE_AUTHORITY/u);
  assert.match(f, /fetch_trusted tools\/scripts\/check-ci-source-immutability\.mjs/u);
  assert.match(f, /fetch_trusted tools\/guards\/migration-manifest-drift-gate\.mjs/u);
  assert.match(f, /fetch_trusted tools\/guards\/sonar-coverage-ownership-gate\.mjs/u);
  assert.match(f, /fetch_trusted tools\/verification\/ownership.manifest\.json/u);
  assert.match(f, /TRUSTED_MIGRATION_MANIFEST_GUARD/u);
  assert.match(f, /TRUSTED_SONAR_OWNERSHIP_GUARD/u);
  assert.doesNotMatch(f, /run:\s*node tools\/guards\/migration-manifest-drift-gate\.mjs/u);
  assert.doesNotMatch(f, /node --test tools\/guards\/sonar-coverage-ownership-gate\.test\.mjs/u);

  const drift = read("tools/scripts/verify-assurance-authority-drift.mjs");
  for (const protectedAuthority of [
    '".github/workflows"',
    '".github/actions"',
    '".opencodereview"',
    '"tools/guards"',
    '"tools/verification"',
    '"tools/scripts/invoke-runtime-phase.ps1"',
    '"tools/scripts/run-guard-suite.mjs"',
    '"infra/docker/scripts/runtime-dispatch.ps1"',
  ]) assert.ok(drift.includes(protectedAuthority), `missing drift authority ${protectedAuthority}`);
  assert.match(drift, /ASSURANCE_AUTHORITY_CHANGE_REQUIRES_BOOTSTRAP/u);
  assert.match(drift, /BTHWANI_ASSURANCE_AUTHORITY_DRIFT:v1/u);
  assert.match(drift, /authorityDiffSha256/u);
  assert.match(drift, /tools\/prompting\/bthwani-orchestrator/u);

  const verifier = read("tools/scripts/check-ci-source-immutability.mjs");
  assert.match(verifier, /BTHWANI_TARGET_REPO/u);
  assert.match(verifier, /targetRepoRoot/u);
  assert.match(read("tools/guards/migration-manifest-drift-gate.mjs"), /BTHWANI_TARGET_REPO/u);
  assert.match(read("tools/guards/_guard-utils.mjs"), /BTHWANI_TARGET_REPO/u);
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
  assert.match(f, /processing_status/u);
  assert.match(f, /code-scanning\/sarifs\/\$\{upload_id\}/u);
  assert.match(f, /analyses_url/u);
  assert.match(f, /did not bind exactly one analysis to candidate\/category/u);
  assert.match(f, /codeql-upload-readback\.json/u);
  assert.match(read("tools/scripts/classify-codeql-evidence.mjs"), /duplicateFindingsCorrelated/u);
  assert.match(f, /CodeQL evidence is incomplete/u);
  assert.match(read("tools/scripts/classify-codeql-evidence.mjs"), /FINDINGS_OPEN/u);
});

test("Sonar scan waits for the remote quality-gate result", () => {
  const f = read(".github/workflows/sonarqube.yml");
  assert.match(f, /-Dsonar\.qualitygate\.wait=true/u);
  assert.match(f, /-Dsonar\.qualitygate\.timeout=300/u);
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
  assert.match(f, /componentKeys=\$\{SONAR_PROJECT_KEY\}/u);
  assert.match(f, /component=\$\{SONAR_PROJECT_KEY\}/u);
  assert.match(f, /fetch_paged_json/u);
  assert.match(f, /paging\.total/u);
  assert.match(f, /TRUSTED_SONAR_CLASSIFIER/u);
  assert.match(f, /Upload consumed Sonar evidence/u);
  assert.match(evidenceBlock, /if: \$\{\{ always\(\) && inputs\.trusted_scan/u);
  assert.doesNotMatch(evidenceBlock, /needs\.scan\.result == 'success'/u);
  assert.match(classifier, /evidenceComplete/u);
  assert.match(classifier, /measuresCoverage/u);
  assert.match(classifier, /QUALITY_GATE_OPEN/u);
});

test("routine Dependabot version-update PRs are disabled during healing", () => {
  const dependabot = read(".github/dependabot.yml");
  assert.equal((dependabot.match(/open-pull-requests-limit: 0/g) ?? []).length, 8);
  assert.doesNotMatch(dependabot, /open-pull-requests-limit: [1-9]/u);
});

test("normal product mode freezes assurance control-plane mutation", () => {
  const orchestrator = read("tools/prompting/bthwani-orchestrator/00-ORCHESTRATOR.md");
  assert.match(orchestrator, /NORMAL_MODE_MUTATION = FORBIDDEN/u);
  assert.match(orchestrator, /CONTROL_PLANE_MAINTENANCE/u);
  assert.match(orchestrator, /TOOLCHAIN_OR_PLATFORM_MUTATION -> prove necessity -> HUMAN_ACTION_REQUIRED/u);
  assert.match(orchestrator, /NO ASSURANCE RECURSION/u);
});

test("external security-tool wrappers pass argument arrays without a shell", () => {
  const runner = read("tools/scripts/_external-tool-runner.mjs");
  assert.match(runner, /execFileSync\(binary, selectedArgs/u);
  assert.match(runner, /shell: false/u);
  assert.match(runner, /must be an array of strings/u);
  assert.doesNotMatch(runner, /execSync\(cmd/u);
  for (const script of ["run-trivy.mjs", "run-hadolint.mjs", "run-shellcheck.mjs", "run-yamllint.mjs"]) {
    assert.match(read(`tools/scripts/${script}`), /args|makeArgs/u, script);
    assert.doesNotMatch(read(`tools/scripts/${script}`), /makeCommand/u, script);
  }
});

test("candidate analysis never uses the checkout action with an untrusted ref", () => {
  for (const workflow of [
    ".github/workflows/ci-check.yml",
    ".github/workflows/final-closure.yml",
    ".github/workflows/rendered-web-evidence.yml",
    ".github/workflows/sonarqube.yml",
  ]) {
    const source = read(workflow);
    assert.doesNotMatch(source, /ref:\s*\$\{\{\s*(?:inputs\.(?:head_sha|head_ref)|needs\.[^}]*head_sha|steps\.[^}]*head_sha|env\.HEAD_SHA)\s*\}\}/u, workflow);
    assert.match(source, /Materialize exact .*candidate without untrusted checkout action/u, workflow);
    assert.match(source, /git fetch --no-tags origin/u, workflow);
    assert.match(source, /git checkout --detach/u, workflow);
  }
});

test("foreground location storage has an encrypted browser path and secure native wiring", () => {
  const storage = read("services/dsh/frontend/shared/dispatch/secure-location-storage.ts");
  assert.match(storage, /indexedDB/u);
  assert.match(storage, /AES-GCM/u);
  assert.match(storage, /subtle\.encrypt/u);
  assert.match(storage, /subtle\.decrypt/u);
  assert.match(storage, /extractable.*false|false,\s*\["encrypt",\s*"decrypt"\]/u);
  assert.doesNotMatch(storage, /localStorage\.setItem|sessionStorage\.setItem/u);
  assert.match(storage, /migrateLegacyBrowserEntries/u);

  const location = read("services/dsh/frontend/shared/dispatch/dispatch-location.api.ts");
  assert.doesNotMatch(location, /bthwaniDurableStorage/u);
  assert.match(location, /resolveDshCaptainLocationStorage/u);

  const captain = read("apps/app-captain/runtime/src/App.tsx");
  assert.match(captain, /configureNativeCaptainLocationStorage/u);
  assert.match(captain, /SecureStore\.setItemAsync/u);
  assert.match(captain, /SecureStore\.deleteItemAsync/u);
});

test("evidence attestation rejects candidate-linked reviewers and binds assurance bootstrap exactly", () => {
  const v = read("tools/scripts/verify-pr-evidence-comments.mjs");
  assert.match(v, /candidateAuthors/u);
  assert.match(v, /candidate author\/committer\/PR creator cannot attest/u);
  assert.match(v, /evidenceSha256/u);
  assert.match(v, /capturedAt/u);
  assert.match(v, /external-device-runner/u);
  assert.match(v, /device\?\.appBuild/u);
  assert.match(v, /BTHWANI_ASSURANCE_BOOTSTRAP:v1/u);
  assert.match(v, /external-authorized-assurance-reviewer/u);
  assert.match(v, /bootstrap authority diff SHA-256 does not match trusted evidence/u);
  assert.match(v, /bootstrap protected changed-count does not match trusted evidence/u);
  assert.match(v, /assurance-authority-only/u);
});
