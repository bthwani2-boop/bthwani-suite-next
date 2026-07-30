import assert from "node:assert/strict";
import test from "node:test";
import { resolveAffectedPlan } from "./run-affected-verification.mjs";

test("requires exact base and head revisions", () => {
  assert.throws(
    () => resolveAffectedPlan(["typecheck"], {}),
    /NX_BASE and NX_HEAD are required/,
  );
});

test("rejects identical revisions", () => {
  assert.throws(
    () => resolveAffectedPlan(["test"], { NX_BASE: "abc", NX_HEAD: "abc" }),
    /different revisions/,
  );
});

test("builds deterministic fail-closed Nx commands", () => {
  const plan = resolveAffectedPlan(
    ["typecheck", "lint", "typecheck", "test", "build"],
    { NX_BASE: "base-sha", NX_HEAD: "head-sha" },
  );
  assert.deepEqual(plan.map(({ target }) => target), ["typecheck", "lint", "test", "build"]);
  for (const { args } of plan) {
    assert.deepEqual(args.slice(0, 3), ["exec", "nx", "affected"]);
    assert.ok(args.includes("--base"));
    assert.ok(args.includes("base-sha"));
    assert.ok(args.includes("--head"));
    assert.ok(args.includes("head-sha"));
  }
});

test("rejects unsupported targets", () => {
  assert.throws(
    () => resolveAffectedPlan(["deploy"], { NX_BASE: "a", NX_HEAD: "b" }),
    /Unsupported affected target/,
  );
});
