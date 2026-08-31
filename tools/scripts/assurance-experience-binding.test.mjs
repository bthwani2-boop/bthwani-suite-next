import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (p) => readFileSync(p, "utf8");

test("router exposes explicit rendered and mobile materiality", () => {
  const router = read("tools/scripts/detect-ci-context.mjs");
  assert.match(router, /rendered_web_required/u);
  assert.match(router, /mobile_evidence_required/u);
  assert.match(router, /isRenderedWebExperiencePath/u);
  assert.match(router, /isMobileExperiencePath/u);
});

test("Final Closure requires rendered and mobile proof only when material", () => {
  const final = read(".github/workflows/final-closure.yml");
  assert.match(final, /rendered-web-baseline:/u);
  assert.match(final, /rendered-web-evidence:/u);
  assert.match(final, /mobile-evidence:/u);
  assert.match(final, /RENDERED_WEB_REQUIRED/u);
  assert.match(final, /MOBILE_EVIDENCE_REQUIRED/u);
  assert.match(final, /rendered-web:NOT_COVERED/u);
  assert.match(final, /mobile-device:NOT_COVERED/u);
});

test("Final Closure has no second-person attestation gate around OpenCodeReview", () => {
  const final = read(".github/workflows/final-closure.yml");
  const validator = read("tools/scripts/verify-pr-evidence-comments.mjs");
  assert.match(final, /opencodereview:/u);
  assert.doesNotMatch(final, /semantic-context|semantic-review|SEMANTIC_REVIEW/iu);
  assert.doesNotMatch(validator, /semantic|reviewIdentity|reviewProvenance|reviewer/iu);
  assert.match(validator, /producerIdentity/u);
});

test("rendered baseline is candidate-bound and Windows-safe", () => {
  const script = read("tools/scripts/run-rendered-control-panel-proof.mjs");
  assert.match(script, /candidateSha/u);
  assert.match(script, /shell: false/u);
  assert.match(script, /serverChunks/u);
  assert.doesNotMatch(script, /spawn\(\s*pnpm,/u);
});

test("closure manifest exposes material human-experience dispositions", () => {
  const final = read(".github/workflows/final-closure.yml");
  assert.match(final, /experienceEvidence:/u);
  assert.match(final, /NOT_APPLICABLE/u);
  assert.match(final, /NOT_COVERED/u);
});
