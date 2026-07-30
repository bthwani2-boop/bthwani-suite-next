import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { repoRoot } from "../guards/_guard-utils.mjs";

const uiRoot = path.join(repoRoot, "shared/ui-kit/src");
const outputRoot = path.join(repoRoot, ".diagnostics/ui-kit-catalog");
const entryPoints = [
  "index.ts",
  "components/index.ts",
  "primitives/index.ts",
  "patterns/index.ts",
  "tokens/index.ts",
];

function fail(message) {
  console.error(`ui-kit-catalog: FAIL: ${message}`);
  process.exit(1);
}

function toPosix(value) {
  return value.replaceAll(path.sep, "/");
}

function resolveModule(fromFile, specifier) {
  const target = path.resolve(path.dirname(fromFile), specifier);
  for (const candidate of [
    target,
    `${target}.ts`,
    `${target}.tsx`,
    path.join(target, "index.ts"),
    path.join(target, "index.tsx"),
  ]) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return candidate;
  }
  return null;
}

function namedExports(source) {
  const names = new Set();
  for (const match of source.matchAll(
    /\bexport\s+(?:declare\s+)?(?:abstract\s+)?(?:const|let|var|function|class|interface|type|enum)\s+([A-Za-z_$][\w$]*)/g,
  )) {
    names.add(match[1]);
  }
  for (const block of source.matchAll(/\bexport\s*\{([^}]+)\}/g)) {
    const remainder = source.slice((block.index ?? 0) + block[0].length);
    if (/^\s*from\b/.test(remainder)) continue;
    for (const raw of block[1].split(",")) {
      const cleaned = raw.trim().replace(/^type\s+/, "");
      if (!cleaned) continue;
      const alias = cleaned.match(/\bas\s+([A-Za-z_$][\w$]*)$/)?.[1];
      const original = cleaned.match(/^([A-Za-z_$][\w$]*)/)?.[1];
      if (alias ?? original) names.add(alias ?? original);
    }
  }
  if (/\bexport\s+default\b/.test(source)) names.add("default");
  return [...names].sort();
}

const visited = new Set();
const modules = [];
const symbolOwners = new Map();

function visit(file) {
  const normalized = path.resolve(file);
  if (visited.has(normalized)) return;
  visited.add(normalized);

  if (!normalized.startsWith(uiRoot + path.sep) && normalized !== path.join(uiRoot, "index.ts")) {
    fail(`export escapes ui-kit root: ${normalized}`);
  }

  const source = fs.readFileSync(normalized, "utf8");
  const relative = toPosix(path.relative(repoRoot, normalized));
  const exports = namedExports(source);
  for (const symbol of exports) {
    if (symbol === "default") continue;
    const owners = symbolOwners.get(symbol) ?? [];
    owners.push(relative);
    symbolOwners.set(symbol, owners);
  }

  modules.push({
    path: relative,
    exports,
    sha256: crypto.createHash("sha256").update(source).digest("hex"),
  });

  for (const match of source.matchAll(/\bexport\s+(?:\*|\{[^}]+\})\s+from\s+["']([^"']+)["']/g)) {
    const specifier = match[1];
    if (!specifier.startsWith(".") && !specifier.startsWith("/")) continue;
    const resolved = resolveModule(normalized, specifier);
    if (!resolved) fail(`${relative} exports missing module ${specifier}`);
    visit(resolved);
  }
}

for (const entry of entryPoints) {
  const absolute = path.join(uiRoot, entry);
  if (!fs.existsSync(absolute)) fail(`missing entry point shared/ui-kit/src/${entry}`);
  visit(absolute);
}

const duplicateSymbols = [...symbolOwners.entries()]
  .filter(([, owners]) => new Set(owners).size > 1)
  .map(([symbol, owners]) => ({ symbol, owners: [...new Set(owners)].sort() }));

const publicSymbols = [...symbolOwners.keys()].sort();
if (modules.length < 10) fail(`catalog resolved only ${modules.length} modules`);
if (publicSymbols.length < 20) fail(`catalog resolved only ${publicSymbols.length} public symbols`);

const manifest = {
  schemaVersion: 1,
  sourceRoot: "shared/ui-kit/src",
  generatedBy: "tools/scripts/build-ui-kit-catalog.mjs",
  moduleCount: modules.length,
  publicSymbolCount: publicSymbols.length,
  publicSymbols,
  duplicateSymbols,
  modules: modules.sort((a, b) => a.path.localeCompare(b.path)),
};
const canonical = JSON.stringify(manifest, null, 2) + "\n";
const manifestHash = crypto.createHash("sha256").update(canonical).digest("hex");

const rows = manifest.modules
  .map(
    (module) =>
      `<tr><td><code>${module.path}</code></td><td>${module.exports
        .map((name) => `<code>${name}</code>`)
        .join(" ")}</td><td><code>${module.sha256.slice(0, 12)}</code></td></tr>`,
  )
  .join("\n");
const html = `<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>BThwani UI Kit Catalog</title>
<style>
body{font-family:system-ui,sans-serif;margin:0;background:#f7f7f8;color:#18181b}main{max-width:1200px;margin:auto;padding:32px}h1{margin:0 0 8px}.meta{color:#52525b;margin-bottom:24px}table{width:100%;border-collapse:collapse;background:white;border:1px solid #d4d4d8}th,td{text-align:start;padding:12px;border-bottom:1px solid #e4e4e7;vertical-align:top}code{direction:ltr;unicode-bidi:isolate;background:#f4f4f5;padding:2px 5px;border-radius:4px;display:inline-block;margin:2px}caption{text-align:start;padding:12px;font-weight:700}
</style>
</head>
<body><main>
<h1>كتالوج BThwani UI Kit</h1>
<p class="meta">${manifest.moduleCount} modules · ${manifest.publicSymbolCount} public symbols · manifest ${manifestHash.slice(0, 16)}</p>
<table><caption>Public module inventory</caption><thead><tr><th>Module</th><th>Exports</th><th>Source hash</th></tr></thead><tbody>${rows}</tbody></table>
</main></body></html>\n`;

fs.rmSync(outputRoot, { recursive: true, force: true });
fs.mkdirSync(outputRoot, { recursive: true });
fs.writeFileSync(path.join(outputRoot, "manifest.json"), canonical, "utf8");
fs.writeFileSync(path.join(outputRoot, "index.html"), html, "utf8");
fs.writeFileSync(path.join(outputRoot, "manifest.sha256"), `${manifestHash}\n`, "utf8");
console.log(`ui-kit-catalog: PASS modules=${manifest.moduleCount} symbols=${manifest.publicSymbolCount} hash=${manifestHash}`);
