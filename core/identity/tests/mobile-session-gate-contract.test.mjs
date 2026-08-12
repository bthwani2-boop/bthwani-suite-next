import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const repoRoot = path.resolve(import.meta.dirname, "../../..");

function sourceFiles(relative) {
  const root = path.join(repoRoot, relative);
  if (!fs.existsSync(root)) return [];
  const files = [];
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const absolute = path.join(root, entry.name);
    const child = path.relative(repoRoot, absolute).replaceAll(path.sep, "/");
    if (entry.isDirectory()) files.push(...sourceFiles(child));
    else if (/\.(tsx|jsx)$/.test(entry.name)) files.push(child);
  }
  return files;
}

test("every IdentitySessionGate consumer declares the exact governed surface", () => {
  const gateSource = fs.readFileSync(
    path.join(repoRoot, "services/dsh/frontend/shared/session/IdentitySessionGate.tsx"),
    "utf8",
  );
  assert.match(gateSource, /identitySessionAuthorizesSurface/);

  let consumers = 0;
  for (const file of [
    ...sourceFiles("apps"),
    ...sourceFiles("services/dsh/frontend"),
  ]) {
    if (file.endsWith("services/dsh/frontend/shared/session/IdentitySessionGate.tsx")) continue;
    const source = fs.readFileSync(path.join(repoRoot, file), "utf8");
    const matches = source.matchAll(/<IdentitySessionGate\b([\s\S]*?)>/g);
    for (const match of matches) {
      consumers += 1;
      const props = match[1];
      assert.match(props, /requiredRole\s*=/, `${file} gate is missing requiredRole`);
      assert.match(props, /requiredSurface\s*=/, `${file} gate is missing requiredSurface`);
    }
  }

  assert.ok(consumers >= 4, `expected the four mobile surfaces to be governed; found ${consumers}`);
});
