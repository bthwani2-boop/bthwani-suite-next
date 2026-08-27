import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../../..");
const source = readFileSync(
  resolve(repositoryRoot, "shared/ui-kit/src/web/root-layout.tsx"),
  "utf8",
);

test("web root baseline uses only canonical document roots", () => {
  assert.match(source, /html, #__next/);
  assert.doesNotMatch(source, /bth-web-root-body|ui-web-root-body|accept both old and new root class names/);
});
