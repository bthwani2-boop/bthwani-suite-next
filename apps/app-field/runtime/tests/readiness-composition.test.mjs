import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../../../../", import.meta.url);
const read = (relative) => readFile(new URL(relative, root), "utf8");

test("DSH field readiness boundary fails closed when readiness is loading or unavailable", async () => {
  const [application, boundary] = await Promise.all([
    read("services/dsh/frontend/app-field/DshFieldApplication.tsx"),
    read("services/dsh/frontend/shared/readiness/DshOperationalReadinessBoundary.tsx"),
  ]);

  assert.match(application, /fetchFieldOperationalReadiness/);
  assert.match(application, /<DshOperationalReadinessBoundary/);
  assert.doesNotMatch(application, /fetchWorkforceReadiness/);
  assert.doesNotMatch(boundary, /return null;/);
  assert.match(boundary, /<ActivityIndicator/);
  assert.match(boundary, /setState\(\{ kind: "loading" \}\)/);
  assert.match(boundary, /let active = true/);
  assert.match(boundary, /if \(active\) setState\(\{ kind: "decision", readiness \}\)/);
  assert.match(boundary, /if \(active\) setState\(\{ kind: "unavailable" \}\)/);
  assert.match(boundary, /refreshToken/);
  assert.match(boundary, /if \(state\.kind === "unavailable"\)/);
  assert.match(boundary, /if \(!state\.readiness\.ready\)/);
  assert.match(boundary, /return <>\{children\}<\/>;/);
  assert.match(boundary, /\.catch\(\(\) =>/);
});
