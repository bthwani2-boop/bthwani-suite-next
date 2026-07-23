import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");
const sourceRoot = path.join(root, "src");
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");

function resolveExport(fromFile, specifier) {
  const base = path.resolve(path.dirname(fromFile), specifier);
  for (const candidate of [base, `${base}.ts`, `${base}.tsx`, path.join(base, "index.ts"), path.join(base, "index.tsx")]) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return candidate;
  }
  return null;
}

test("app-shell public barrel resolves every owned contract", () => {
  const indexFile = path.join(sourceRoot, "index.ts");
  const source = fs.readFileSync(indexFile, "utf8");
  const exports = [...source.matchAll(/export\s+\*\s+from\s+["']([^"']+)["']/g)].map((match) => match[1]);
  assert.ok(exports.length >= 8, `expected governed shell exports, received ${exports.length}`);
  for (const specifier of exports) {
    const resolved = resolveExport(indexFile, specifier);
    assert.ok(resolved, `missing app-shell export target: ${specifier}`);
    assert.ok(resolved.startsWith(sourceRoot + path.sep), `export escapes app-shell source root: ${specifier}`);
  }
});

test("app-shell contracts contain no runtime truth or unresolved implementation markers", () => {
  const files = [];
  const stack = [sourceRoot];
  while (stack.length > 0) {
    const current = stack.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const child = path.join(current, entry.name);
      if (entry.isDirectory()) stack.push(child);
      else if (/\.tsx?$/.test(entry.name)) files.push(child);
    }
  }

  for (const file of files) {
    const source = fs.readFileSync(file, "utf8");
    assert.doesNotMatch(source, /\b(?:TODO|FIXME|HACK)\b/, path.relative(root, file));
    assert.doesNotMatch(source, /\b(?:fetch|axios)\s*[.(]/, path.relative(root, file));
    assert.doesNotMatch(source, /\bMath\.random\s*\(/, path.relative(root, file));
    assert.doesNotMatch(source, /\b(?:localStorage|sessionStorage)\b/, path.relative(root, file));
  }
});

test("package exposes the canonical source entry and is side-effect free", () => {
  const pkg = JSON.parse(read("package.json"));
  assert.equal(pkg.main, "src/index.ts");
  assert.equal(pkg.types, "src/index.ts");
  assert.equal(pkg.sideEffects, false);
});
