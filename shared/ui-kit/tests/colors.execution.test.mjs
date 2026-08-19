import assert from "node:assert/strict";
import test from "node:test";

const { alpha, brandRoots, colorRoles } = await import(
  new URL("../src/tokens/colors.ts", import.meta.url).href
);

test("UI color alpha conversion preserves canonical brand channels", () => {
  assert.equal(alpha(brandRoots.brandAction, 0.25), "rgba(255, 80, 13, 0.25)");
  assert.equal(alpha("#abc", 0.5), "rgba(170, 187, 204, 0.5)");
  assert.equal(alpha("rgb(10, 20, 30)", 0.75), "rgba(10, 20, 30, 0.75)");
  assert.equal(alpha("", 0.1), "rgba(0, 0, 0, 0.1)");
  assert.equal(colorRoles.brandAction, "#FF500D");
});

test("UI color alpha conversion rejects malformed hex input", () => {
  assert.throws(() => alpha("#12", 0.5), /Invalid hex color/);
});
