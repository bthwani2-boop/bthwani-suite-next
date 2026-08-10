// Executable regression gate for the governed image-size parser patch.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import test from "node:test";

const require = createRequire(import.meta.url);
const virtualStore = path.resolve(import.meta.dirname, "../../node_modules/.pnpm");
const packageRoots = fs.readdirSync(virtualStore)
  .filter((entry) => entry.startsWith("image-size@1.2.1"))
  .map((entry) => path.join(virtualStore, entry, "node_modules/image-size"))
  .filter((entry) => fs.existsSync(path.join(entry, "dist/types/utils.js")));

const packageRoot = packageRoots.find((root) => {
  const { findBox } = require(path.join(root, "dist/types/utils.js"));
  const input = new Uint8Array(8);
  input.set(Buffer.from("jxlp"), 4);
  return findBox(input, "jxlp", 0) === undefined;
});
assert.ok(packageRoot, "installed image-size 1.2.1 includes the governed parser hardening patch");

test("image-size rejects zero-sized ISO BMFF boxes", () => {
  const { findBox } = require(path.join(packageRoot, "dist/types/utils.js"));
  const input = new Uint8Array(8);
  input.set(Buffer.from("jxlp"), 4);
  assert.equal(findBox(input, "jxlp", 0), undefined);
});

test("image-size rejects zero-length ICNS entries without hanging", () => {
  const modulePath = path.join(packageRoot, "dist/types/icns.js");
  const script = `
    const { ICNS } = require(${JSON.stringify(modulePath)});
    const input = new Uint8Array(16);
    input.set(Buffer.from("icns"), 0);
    input.set([0, 0, 0, 16], 4);
    input.set(Buffer.from("ic07"), 8);
    try {
      ICNS.calculate(input);
      process.exit(2);
    } catch (error) {
      process.exit(error instanceof TypeError ? 0 : 3);
    }
  `;
  const result = spawnSync(process.execPath, ["-e", script], { timeout: 1_000 });
  assert.equal(result.error?.code, undefined, "parser timed out instead of rejecting malformed ICNS");
  assert.equal(result.status, 0, result.stderr?.toString());
});
