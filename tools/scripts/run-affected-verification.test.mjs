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
    () => resolveAffectedPlan(["test"], { NX_BASE: "a".repeat(40), NX_HEAD: "a".repeat(40) }),
    /different revisions/,
  );
});

test("uses the bounded daily target set when no target is supplied", () => {
  const plan = resolveAffectedPlan([], { NX_BASE: "a".repeat(40), NX_HEAD: "b".repeat(40) });
  assert.deepEqual(plan.targets, ["typecheck", "lint", "test"]);
});

test("builds one deterministic fail-closed Nx command", () => {
  const plan = resolveAffectedPlan(
    ["typecheck", "lint", "typecheck", "test", "build"],
    { NX_BASE: "a".repeat(40), NX_HEAD: "b".repeat(40) },
  );
  assert.deepEqual(plan.targets, ["typecheck", "lint", "test", "build"]);
  assert.deepEqual(plan.args.slice(0, 5), [
    "exec",
    "nx",
    "affected",
    "-t",
    "typecheck,lint,test,build",
  ]);
  assert.ok(plan.args.includes("--base"));
  assert.ok(plan.args.includes("a".repeat(40)));
  assert.ok(plan.args.includes("--head"));
  assert.ok(plan.args.includes("b".repeat(40)));
});

test("rejects unsupported targets", () => {
  assert.throws(
    () => resolveAffectedPlan(["deploy"], { NX_BASE: "a".repeat(40), NX_HEAD: "b".repeat(40) }),
    /Unsupported affected target/,
  );
});

test("rejects symbolic or abbreviated revisions", () => {
  assert.throws(
    () => resolveAffectedPlan(["test"], { NX_BASE: "master", NX_HEAD: "HEAD" }),
    /full 40-character commit SHAs/,
  );
});
