import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../../..");
const source = readFileSync(
  resolve(repositoryRoot, "shared/ui-kit/src/web/control-surface.tsx"),
  "utf8",
);
const headerStart = source.indexOf("export type WebCompactSurfaceHeaderProps");
const headerEnd = source.indexOf("export type WebSystemSuggestionActionProps", headerStart);
const header = source.slice(headerStart, headerEnd);

test("compact web headers use description as their sole copy field", () => {
  assert.ok(headerStart >= 0 && headerEnd > headerStart, "compact header source block must exist");
  assert.match(header, /description\?: string/);
  assert.match(header, /export function WebCompactSurfaceHeader\(\{ title, description, onBack, metrics = \[\]\s*\}/);
  assert.doesNotMatch(header, /subtitle|resolvedDescription|deprecated.*description/i);
});
