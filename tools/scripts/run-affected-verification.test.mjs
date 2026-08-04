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

test("builds one deterministic fail-closed Nx command", () => {
  const plan = resolveAffectedPlan(
    ["typecheck", "lint", "typecheck", "test", "build"],
    { NX_BASE: "base-sha", NX_HEAD: "head-sha" },
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
  assert.ok(plan.args.includes("base-sha"));
  assert.ok(plan.args.includes("--head"));
  assert.ok(plan.args.includes("head-sha"));
});

test("rejects unsupported targets", () => {
  assert.throws(
    () => resolveAffectedPlan(["deploy"], { NX_BASE: "a", NX_HEAD: "b" }),
    /Unsupported affected target/,
  );
});
