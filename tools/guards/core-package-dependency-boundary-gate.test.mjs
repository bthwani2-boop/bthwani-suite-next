import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  analyzeReactBoundary,
  manifestDeclaresReact,
  resolveRepositoryRoot,
  sourceUsesReact,
} from "./core-package-dependency-boundary-gate.mjs";

test("detects React runtime imports", () => {
  assert.equal(sourceUsesReact('import { useState } from "react";'), true);
  assert.equal(sourceUsesReact('export const value = 1;'), false);
});

test("detects manifest React declarations", () => {
  assert.equal(
    manifestDeclaresReact({ peerDependencies: { react: "19" } }),
    true,
  );
  assert.equal(
    manifestDeclaresReact({ devDependencies: { typescript: "6" } }),
    false,
  );
});

test("fails stale React dependency", () => {
  const result = analyzeReactBoundary({
    packageName: "workforce",
    manifest: {
      peerDependencies: { react: "19" },
      devDependencies: { "@types/react": "19" },
    },
    sourceTexts: ["export type X = string;"],
  });
  assert.equal(result.violations.length, 1);
});

test("accepts React dependency when source requires it", () => {
  const result = analyzeReactBoundary({
    packageName: "identity",
    manifest: { peerDependencies: { react: "19" } },
    sourceTexts: ['import { useEffect } from "react";'],
  });
  assert.deepEqual(result.violations, []);
});

test("repository root derives from guard location, not cwd", () => {
  const expected = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "..",
    "..",
  );
  assert.equal(resolveRepositoryRoot(), expected);
});
