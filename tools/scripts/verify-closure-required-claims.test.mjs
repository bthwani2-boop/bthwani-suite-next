import assert from "node:assert/strict";
import test from "node:test";

import {
  requiredToolsForClaims,
  verifyClosureClaims,
} from "./verify-closure-required-claims.mjs";

test("required security and static-analysis claims resolve to their exact sensor set", () => {
  const tools = requiredToolsForClaims([
    "change:verification",
    "analysis:codeql",
    "analysis:sonar",
    "analysis:semgrep",
    "security:remote",
  ]);
  assert.deepEqual(tools, [
    "actionlint",
    "codeql",
    "gitleaks",
    "hadolint",
    "osv-scanner",
    "pinact",
    "semgrep",
    "shellcheck",
    "sonar",
    "trivy",
    "yamllint",
    "zizmor",
  ]);
});

test("conditional non-tool claims do not manufacture global tool requirements", () => {
  assert.deepEqual(requiredToolsForClaims([
    "experience:mobile-device",
    "dependency:review",
    "docker:policy",
  ]), []);
});

test("unknown required closure claims fail closed", () => {
  assert.throws(
    () => requiredToolsForClaims(["analysis:unknown"]),
    /UNKNOWN_REQUIRED_CLOSURE_CLAIM:analysis:unknown/u,
  );
});

test("claim result verifier fails on missing or non-success evidence", () => {
  const result = verifyClosureClaims(
    ["change:verification", "analysis:codeql"],
    {"change:verification": "success"},
  );
  assert.equal(result.ok, false);
  assert.deepEqual(result.failures, ["analysis:codeql:MISSING_RESULT"]);
});

test("claim result verifier accepts exactly successful required claims", () => {
  const result = verifyClosureClaims(
    ["change:verification", "analysis:codeql"],
    {"change:verification": "success", "analysis:codeql": "success"},
  );
  assert.equal(result.ok, true);
  assert.deepEqual(result.failures, []);
});