import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  findBoundaryViolations,
  resolveRepositoryRoot,
} from "./workforce-hr-boundary-gate.mjs";

test("rejects HR as a service permission authority", () => {
  assert.equal(
    findBoundaryViolations(
      'hasServiceControlPanelPermission(identity, "hr", "provider:create")',
      "x.tsx",
    ).length,
    1,
  );
});

test("rejects package Workforce backend reach-through", () => {
  assert.equal(
    findBoundaryViolations(
      'import x from "@bthwani/core-workforce/backend";',
      "x.tsx",
    ).length,
    1,
  );
});

test("rejects nested package Workforce database reach-through", () => {
  assert.equal(
    findBoundaryViolations(
      'import x from "@bthwani/core-workforce/database/internal";',
      "x.tsx",
    ).length,
    1,
  );
});

test("rejects relative Workforce backend reach-through", () => {
  assert.equal(
    findBoundaryViolations(
      'import x from "../../../../core/workforce/backend";',
      "x.tsx",
    ).length,
    1,
  );
});

test("rejects Windows-escaped Workforce database reach-through", () => {
  assert.equal(
    findBoundaryViolations(
      'const x = require("..\\\\..\\\\core\\\\workforce\\\\database");',
      "x.tsx",
    ).length,
    1,
  );
});

test("rejects bare core/workforce internal reach-through", () => {
  assert.equal(
    findBoundaryViolations(
      'const x = "core/workforce/backend/internal";',
      "x.tsx",
    ).length,
    1,
  );
});

test("rejects direct fetch in HR surface", () => {
  assert.equal(
    findBoundaryViolations(
      'await fetch("/workforce/providers")',
      "x.tsx",
    ).length,
    1,
  );
});

test("accepts Workforce permission projection", () => {
  assert.deepEqual(
    findBoundaryViolations(
      'hasServiceControlPanelPermission(identity, "workforce", "provider:create")',
      "x.tsx",
    ),
    [],
  );
});

test("accepts canonical Workforce public package boundary", () => {
  assert.deepEqual(
    findBoundaryViolations(
      'import { createWorkforceClient } from "@bthwani/core-workforce";',
      "x.tsx",
    ),
    [],
  );
});

test("repository root derives from guard location, not cwd", () => {
  const expected = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "..",
    "..",
  );
  assert.equal(resolveRepositoryRoot(), expected);
});
