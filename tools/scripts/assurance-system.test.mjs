import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
const read = (p) => readFileSync(p, "utf8");

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
  assert.match(d, /const candidateSha =/u);
  assert.match(d, /candidate-stability/u);
  assert.match(d, /shell: false/u);
  assert.doesNotMatch(d, /shell:\s*process\.platform/u);
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
