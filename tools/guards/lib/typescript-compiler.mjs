/**
 * typescript-compiler.mjs
 *
 * Single owner of the TypeScript Compiler API for every guard under tools/guards.
 *
 * The repository depends on two compiler packages for different purposes:
 *   - `typescript` (7.x) is the type checker used by builds and editors. Its npm
 *     package intentionally exposes no JavaScript Compiler API: `createProgram`,
 *     `createSourceFile`, `SyntaxKind` and `ScriptTarget` are all `undefined`.
 *   - `@typescript/typescript6` (6.x) is the package that still ships the full
 *     JavaScript Compiler API, and is the only supported source for AST guards.
 *
 * Importing `typescript` from a guard therefore does not fail at import time; it
 * fails later with `Cannot read properties of undefined`, deep inside an AST walk.
 * Centralizing the import here makes the supported package the only reachable one
 * and turns a missing API into an explicit, immediate error.
 */

import * as typescriptNamespace from "@typescript/typescript6";

// @typescript/typescript6 is published through a CommonJS-compatible export.
// Node ESM may expose that compiler API under `default` rather than as synthetic
// named exports, so normalize the module shape before reading ScriptTarget,
// ScriptKind, SyntaxKind, or factory helpers.
const compiler = typescriptNamespace.default ?? typescriptNamespace;

const requiredApi = [
  ["createSourceFile", "function"],
  ["createProgram", "function"],
  ["forEachChild", "function"],
  ["SyntaxKind", "object"],
  ["ScriptTarget", "object"],
  ["ScriptKind", "object"],
];

const missingApi = requiredApi
  .filter(([name, kind]) => typeof compiler?.[name] !== kind)
  .map(([name]) => name);

if (missingApi.length > 0) {
  throw new Error(
    `TYPESCRIPT_COMPILER_API_UNAVAILABLE missing=${missingApi.join(",")} ` +
      `version=${compiler?.version ?? "unknown"}. ` +
      "AST guards require @typescript/typescript6; the `typescript` package does not expose the Compiler API.",
  );
}

export const ts = compiler;
export default compiler;

/** Resolve the ScriptKind for a file path so guards parse TSX and JSX correctly. */
export function scriptKindForFile(file) {
  if (file.endsWith(".tsx")) return compiler.ScriptKind.TSX;
  if (file.endsWith(".jsx")) return compiler.ScriptKind.JSX;
  if (file.endsWith(".js") || file.endsWith(".mjs") || file.endsWith(".cjs")) return compiler.ScriptKind.JS;
  return compiler.ScriptKind.TS;
}
