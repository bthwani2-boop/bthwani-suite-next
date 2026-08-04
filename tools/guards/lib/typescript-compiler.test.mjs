import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { scriptKindForFile, ts } from "./typescript-compiler.mjs";

const guardsRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

test("shared loader exposes the Compiler API that AST guards depend on", () => {
  assert.strictEqual(typeof ts.createSourceFile, "function");
  assert.strictEqual(typeof ts.createProgram, "function");
  assert.strictEqual(typeof ts.forEachChild, "function");
  assert.strictEqual(typeof ts.SyntaxKind, "object");
  assert.strictEqual(typeof ts.ScriptTarget, "object");
  assert.strictEqual(typeof ts.ScriptKind, "object");
});

test("the loader can actually parse a source file into a walkable AST", () => {
  const sourceFile = ts.createSourceFile(
    "sample.ts",
    "export const value = 1;",
    ts.ScriptTarget.Latest,
    true,
    scriptKindForFile("sample.ts"),
  );

  const kinds = [];
  ts.forEachChild(sourceFile, (node) => kinds.push(node.kind));
  assert.ok(kinds.includes(ts.SyntaxKind.VariableStatement));
});

test("scriptKindForFile maps each supported extension", () => {
  assert.strictEqual(scriptKindForFile("a.tsx"), ts.ScriptKind.TSX);
  assert.strictEqual(scriptKindForFile("a.jsx"), ts.ScriptKind.JSX);
  assert.strictEqual(scriptKindForFile("a.js"), ts.ScriptKind.JS);
  assert.strictEqual(scriptKindForFile("a.mjs"), ts.ScriptKind.JS);
  assert.strictEqual(scriptKindForFile("a.cjs"), ts.ScriptKind.JS);
  assert.strictEqual(scriptKindForFile("a.ts"), ts.ScriptKind.TS);
});

// Root-cause regression test. The `typescript` package (7.x) resolves and imports
// cleanly but exposes no Compiler API, so a guard importing it fails only later,
// mid-AST-walk, with `Cannot read properties of undefined`. Every guard must take
// the Compiler API from the shared loader instead.
test("no guard imports the Compiler API outside the shared loader", () => {
  const offenders = [];

  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === "node_modules") continue;
        walk(full);
        continue;
      }
      if (!entry.name.endsWith(".mjs") && !entry.name.endsWith(".js")) continue;
      if (full === fileURLToPath(new URL("typescript-compiler.mjs", import.meta.url))) continue;

      const content = fs.readFileSync(full, "utf8");
      if (/\bfrom\s+["'](typescript|@typescript\/typescript6)["']/.test(content)) {
        offenders.push(path.relative(guardsRoot, full).split(path.sep).join("/"));
      }
    }
  };

  walk(guardsRoot);

  assert.deepStrictEqual(
    offenders,
    [],
    `These guards must import { ts } from the shared loader (tools/guards/lib/typescript-compiler.mjs) ` +
      `instead of a compiler package directly: ${offenders.join(", ")}`,
  );
});
