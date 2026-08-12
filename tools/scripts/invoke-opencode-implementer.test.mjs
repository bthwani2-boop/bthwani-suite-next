import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  WORKERS,
  acquireLockAt,
  buildInlineConfig,
  durationMs,
  findDirtyScopeConflicts,
  normalizeRelativePrefix,
  parseArgs,
  pathsOverlap,
  scopeViolations,
  validatePinnedState,
} from "./invoke-opencode-implementer.mjs";

test("worker map is fixed to the three approved NVIDIA models", () => {
  assert.deepEqual(WORKERS, {
    "bthwani-agent-6": "nvidia/nvidia/nemotron-3-ultra-550b-a55b",
    "bthwani-agent-7": "nvidia/z-ai/glm-5.2",
    "bthwani-agent-8": "nvidia/nvidia/nemotron-3-super-120b-a12b",
  });
});

test("parseArgs accepts bounded contract and rejects model override", () => {
  const args = parseArgs([
    "--orchestrator", "codex",
    "--worker", "bthwani-agent-8",
    "--work-unit", "WU-1",
    "--brief", "brief.md",
    "--expected-branch", "BB",
    "--expected-head", "a".repeat(40),
    "--allow-read", "services/dsh",
    "--allow-write", "services/dsh/backend",
    "--forbid-write", "governance",
  ]);
  assert.equal(args.worker, "bthwani-agent-8");
  assert.throws(
    () => parseArgs(["--model", "nvidia/other"]),
    /Unknown argument: --model/,
  );
});

test("duration parser is strict", () => {
  assert.equal(durationMs("45m"), 2_700_000);
  assert.equal(durationMs("1h15m"), 4_500_000);
  assert.throws(() => durationMs("45"), /Invalid timeout/);
});

test("wrong branch or head fails closed", () => {
  assert.throws(
    () => validatePinnedState({
      expectedBranch: "BB",
      expectedHead: "a".repeat(40),
      actualBranch: "master",
      actualHead: "a".repeat(40),
    }),
    /Branch mismatch/,
  );
  assert.throws(
    () => validatePinnedState({
      expectedBranch: "BB",
      expectedHead: "a".repeat(40),
      actualBranch: "BB",
      actualHead: "b".repeat(40),
    }),
    /HEAD mismatch/,
  );
});

test("dirty declared scope conflicts while unrelated dirty paths are ignored", () => {
  const declared = [
    normalizeRelativePrefix("services/dsh/backend", "test"),
  ];
  const conflicts = findDirtyScopeConflicts(
    [
      "README.md",
      "services/dsh/backend/internal/cart/cart.go",
    ],
    declared,
  );
  assert.deepEqual(conflicts, [
    "services/dsh/backend/internal/cart/cart.go",
  ]);
});

test("forbidden and out-of-scope writes are rejected", () => {
  const allowed = [
    normalizeRelativePrefix("services/dsh/backend", "test"),
  ];
  const forbidden = [
    normalizeRelativePrefix("governance", "test"),
  ];
  assert.deepEqual(
    scopeViolations(
      [
        "services/dsh/backend/internal/cart/cart.go",
        "services/wlt/backend/internal/cod/cod.go",
        "governance/GOVERNANCE.md",
      ],
      allowed,
      forbidden,
    ).map((entry) => entry.reason),
    [
      "OUTSIDE_ALLOWED_WRITE_SCOPE",
      "FORBIDDEN_PATH",
    ],
  );
});

test("overlap detection catches broad write scopes covering protected paths", () => {
  const tools = normalizeRelativePrefix("tools", "test");
  const protectedScript = normalizeRelativePrefix(
    "tools/scripts/invoke-opencode-implementer.mjs",
    "test",
  );
  assert.equal(pathsOverlap(tools, protectedScript), true);
});

test("generated OpenCode config hard-denies shell, web, task, external access and defaults edit to deny", () => {
  const allowRead = [
    normalizeRelativePrefix("services/dsh/backend", "test"),
  ];
  const allowWrite = [
    normalizeRelativePrefix("services/dsh/backend/internal/cart", "test"),
  ];
  const config = buildInlineConfig({
    worker: "bthwani-agent-8",
    model: WORKERS["bthwani-agent-8"],
    allowRead,
    allowWrite,
    prompt: "bounded",
  });
  const permission = config.agent["bthwani-agent-8"].permission;
  assert.equal(permission.bash, "deny");
  assert.equal(permission.task, "deny");
  assert.equal(permission.webfetch, "deny");
  assert.equal(permission.websearch, "deny");
  assert.equal(permission.external_directory, "deny");
  assert.equal(permission.edit["*"], "deny");
  assert.equal(
    permission.edit["services/dsh/backend/internal/cart/**"],
    "allow",
  );
  assert.equal(config.permission["*"], "deny");
  assert.equal(config.enabled_providers[0], "nvidia");
  assert.equal(config.share, "disabled");
});

test("single delegation lock rejects a second active run", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "bthwani-opencode-lock-test-"));
  try {
    const lock = acquireLockAt(root);
    assert.ok(fs.existsSync(lock));
    assert.throws(
      () => acquireLockAt(root),
      /Delegation lock already exists/,
    );
    fs.unlinkSync(lock);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
