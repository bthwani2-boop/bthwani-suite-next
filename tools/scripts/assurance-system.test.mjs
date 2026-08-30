import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import YAML from "yaml";
const read = (p) => readFileSync(p, "utf8");

test("assurance workflow YAML remains parseable", () => {
  for (const workflow of [".github/workflows/final-closure.yml", ".github/workflows/security-remote.yml"]) {
    assert.equal(typeof YAML.parse(read(workflow)), "object");
  }
});

test("agent layer converges on one canonical orchestrator", () => {
  assert.match(read("AGENTS.md"), /canonical repository execution\/closure authority/u);
  assert.match(read(".agents/skills/bthwani-orchestrator/SKILL.md"), /CANONICAL_AGENT_ENTRYPOINT/u);
  for (const p of [
    ".agents/skills/bthwani-universal-task-router/SKILL.md",
    ".agents/skills/bthwani-evidence-gate-router/SKILL.md",
    ".agents/skills/bthwani-final-journey-closure-judge/SKILL.md",
  ]) assert.match(read(p), /COMPATIBILITY_REDIRECT/u);
});

test("independent failures aggregate and blocked descendants are explicit", () => {
  assert.match(read(".github/workflows/ci-node-diagnostics.yml"), /Enforce complete contract diagnostic collection/u);
  assert.match(read(".github/workflows/ci-node-diagnostics.yml"), /BLOCKED_BY materialize/u);
  assert.match(read(".github/workflows/ci-runtime.yml"), /Enforce complete runtime evidence collection/u);
  assert.match(read(".github/workflows/ci-runtime.yml"), /BLOCKED_BY bootstrap/u);
});

test("NOT_COVERED remains explicit closure-blocking evidence", () => {
  const v = read("tools/prompting/bthwani-orchestrator/04-VERIFY-REDIAGNOSE-CLOSE.md");
  assert.match(v, /NOT_COVERED/u);
  assert.match(v, /closure is forbidden/u);
  const final = read(".github/workflows/final-closure.yml");
  assert.match(final, /rendered-web:NOT_COVERED/u);
  assert.match(final, /mobile-device:NOT_COVERED/u);
});

test("full Node final verification is fresh", () => {
  assert.match(read(".github/workflows/ci-node-verification.yml"), /--skip-nx-cache/u);
});

test("discovery is candidate-pinned and Windows shell-safe", () => {
  const d = read("tools/scripts/run-deep-discovery.mjs");
  assert.match(d, /const candidate = captureCandidate\(\)/u);
  assert.match(d, /candidateIdentity/u);
  assert.match(d, /candidateWorktreeSha/u);
  assert.match(d, /candidate-stability/u);
  assert.match(d, /shell: false/u);
  assert.doesNotMatch(d, /shell:\s*process\.platform/u);
  assert.match(d, /evidenceLifecycle/u);
  assert.match(d, /ROOT_MAPPING_REQUIRED/u);
  assert.doesNotMatch(d, /disposition:\s*"UNPROCESSED"/u);
  assert.match(d, /closureClaim: false/u);
});

test("static repository baseline is a separate exact-SHA signal", () => {
  const workflow = read(".github/workflows/repository-baseline.yml");
  assert.match(workflow, /BThwani \/ Static Repository Baseline/u);
  assert.match(workflow, /BASELINE_OPEN/u);
  assert.match(workflow, /statuses\/\$\{HEAD_SHA\}/u);
  assert.doesNotMatch(workflow, /BThwani \/ Change Closure/u);
  assert.doesNotMatch(workflow, /BThwani \/ Change Verification/u);
});

test("normal product work freezes assurance control-plane maintenance and routine dependency PRs", () => {
  const scope = read("tools/prompting/bthwani-orchestrator/01-SCOPE-AUTHORITY-RULES.md");
  assert.match(scope, /HUMAN_ONLY/u);
  assert.match(scope, /ASSURANCE_CONTROL_PLANE/u);
  assert.match(scope, /FROZEN_FOR_NORMAL_PRODUCT_WORK/u);
  assert.match(scope, /NO ASSURANCE RECURSION WITHOUT A UNIQUE MATERIAL CLAIM/u);
  const dependabot = read(".github/dependabot.yml");
  assert.doesNotMatch(dependabot, /open-pull-requests-limit:\s*[1-9]/u);
});

test("baseline ratchet distinguishes inherited findings from regressions", () => {
  const evaluator = read("tools/scripts/compare-assurance-baseline.mjs");
  assert.match(evaluator, /newMaterial/u);
  assert.match(evaluator, /worsenedMaterial/u);
  assert.match(evaluator, /BASELINE_OPEN/u);
  assert.match(evaluator, /repositoryClosure/u);
});

test("CodeQL output is a consumed evidence input, not upload-only activity", () => {
  const workflow = read(".github/workflows/codeql.yml");
  assert.match(workflow, /Consume CodeQL findings with explicit disposition/u);
  assert.match(workflow, /Upload CodeQL finding disposition evidence/u);
  assert.match(workflow, /DISPOSITION_STATUS/u);
  assert.match(read("tools/scripts/classify-codeql-evidence.mjs"), /relatedLocations/u);
  assert.match(read("tools/scripts/classify-codeql-evidence.mjs"), /closureClaim: false/u);
});

test("all assurance outputs converge through one evidence contract and Root Graph", () => {
  const discovery = read("tools/scripts/run-deep-discovery.mjs");
  const security = read(".github/workflows/security-remote.yml");
  const final = read(".github/workflows/final-closure.yml");
  const envelope = read("tools/scripts/lib/evidence-envelope.mjs");
  const campaign = read("tools/scripts/run-root-closure-campaign.mjs");
  assert.match(discovery, /buildEvidenceEnvelope/u);
  assert.doesNotMatch(discovery, /CHECK_OR_TOOL_EXECUTION_FAILURE/u);
  assert.match(security, /capture-tool-evidence\.mjs/u);
  assert.match(final, /Collect every available analyzer artifact and completed job log/u);
  assert.match(final, /Consume all tool evidence into one exact-candidate Root Graph/u);
  assert.match(final, /--required-tools 'codeql,sonar,semgrep,gitleaks,osv-scanner,trivy,actionlint,zizmor,pinact,shellcheck,hadolint,yamllint'/u);
  assert.match(final, /conclusion.*skipped/u);
  assert.match(final, /outcome='NOT_APPLICABLE'/u);
  assert.match(final, /evidenceConsumption: \$evidenceConsumption\[0\]/u);
  assert.match(final, /rootGraph: \$rootGraph\[0\]/u);
  assert.match(envelope, /bthwani-evidence-envelope\/1/u);
  assert.match(envelope, /bthwani-root-graph\/1/u);
  assert.match(envelope, /unparsedMaterialOutput/u);
  assert.match(envelope, /unmappedMaterialFindings/u);
  assert.match(envelope, /sourceOfFixUnresolved/u);
  assert.match(campaign, /buildUnifiedRootGraph/u);
  assert.match(campaign, /evidence-envelopes\.json/u);
  assert.match(campaign, /closureClaim: false/u);
});

test("machine router exposes rendered and mobile materiality", () => {
  const r = read("tools/scripts/detect-ci-context.mjs");
  assert.match(r, /rendered_web_required/u);
  assert.match(r, /mobile_evidence_required/u);
  assert.match(r, /isRenderedWebExperiencePath/u);
  assert.match(r, /isMobileExperiencePath/u);
});

test("rendered baseline is exact-candidate and trusted-verifier based", () => {
  const w = read(".github/workflows/rendered-web-evidence.yml");
  assert.match(w, /Load trusted rendered verifier/u);
  const s = read("tools/scripts/run-rendered-control-panel-proof.mjs");
  assert.match(s, /candidateSha/u);
  assert.match(s, /shell: false/u);
  assert.match(s, /serverChunks/u);
});

test("material rendered and mobile evidence are closure inputs", () => {
  const f = read(".github/workflows/final-closure.yml");
  assert.match(f, /rendered-web-baseline:/u);
  assert.match(f, /rendered-web-evidence:/u);
  assert.match(f, /mobile-evidence:/u);
  assert.match(f, /RENDERED_WEB_REQUIRED/u);
  assert.match(f, /MOBILE_EVIDENCE_REQUIRED/u);
  assert.match(f, /experienceEvidence:/u);
});

test("semantic review is bound to deterministic trusted OCR provenance", () => {
  const f = read(".github/workflows/final-closure.yml");
  assert.match(f, /semantic-review:/u);
  assert.match(f, /SEMANTIC_REVIEW_RESULT/u);
  assert.match(f, /verify-pr-evidence-comments\.mjs/u);
  const o = read(".github/workflows/open-code-review.yml");
  assert.match(o, /opencodereview-delegation-\$\{HEAD_SHA\}-\$\{context_sha256\}/u);
  const v = read("tools/scripts/verify-pr-evidence-comments.mjs");
  assert.match(v, /does not match trusted OCR context/u);
  assert.match(v, /attestation is stale or cross-SHA/u);
  assert.match(v, /candidate author cannot self-attest/u);
});

test("assurance-critical routers and validators are loaded from trusted workflow authority", () => {
  const ci = read(".github/workflows/ci-check.yml");
  const final = read(".github/workflows/final-closure.yml");
  assert.match(ci, /TRUSTED_WORKFLOW_SHA/u);
  assert.match(ci, /trusted_router/u);
  assert.match(final, /TRUSTED_WORKFLOW_SHA/u);
  assert.match(final, /trusted_router/u);
  assert.match(final, /verify-pr-evidence-comments\.mjs/u);
});

test("self qualification never claims semantic self-certification", () => {
  assert.match(read("tools/prompting/bthwani-orchestrator/00-ORCHESTRATOR.md"), /SEMANTIC_SELF_CERTIFICATION: FORBIDDEN/u);
  assert.match(read("tools/scripts/verify-assurance-bootstrap.mjs"), /Structural proof only/u);
});
