import assert from "node:assert/strict";
import test from "node:test";

const policyUrl = new URL(
  "../src/navigation/field-router-policy.ts",
  import.meta.url,
);

const {
  resolveFieldRouterBack,
  resolveFieldRouterNavigation,
  singleRouteParam,
} = await import(policyUrl.href);

test("field router parameter normalization is fail-closed and deterministic", () => {
  assert.equal(singleRouteParam(undefined), undefined);
  assert.equal(singleRouteParam("   "), undefined);
  assert.equal(singleRouteParam(" assignment-1 "), "assignment-1");
  assert.equal(singleRouteParam([" visit-1 ", "ignored"]), "visit-1");
});

test("field router navigation policy preserves canonical push and replace semantics", () => {
  assert.deepEqual(
    resolveFieldRouterNavigation("/work-queue"),
    { method: "push", href: "/work-queue" },
  );
  assert.deepEqual(
    resolveFieldRouterNavigation("/account/profile", "replace"),
    { method: "replace", href: "/account/profile" },
  );
  assert.throws(
    () => resolveFieldRouterNavigation("work-queue"),
    /FIELD_ROUTER_HREF_MUST_BE_ABSOLUTE/,
  );
});

test("field router back policy never invents a parallel navigation stack", () => {
  assert.deepEqual(resolveFieldRouterBack(true), { method: "back" });
  assert.deepEqual(resolveFieldRouterBack(false), { method: "replace", href: "/" });
});
