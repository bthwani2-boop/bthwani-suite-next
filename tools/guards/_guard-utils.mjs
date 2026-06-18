import fs from "node:fs";
import path from "node:path";

export const repoRoot = process.cwd();

const EXCLUDED_DIRS = new Set([
  ".git",
  "node_modules",
  ".next",
  ".expo",
  "dist",
  "build",
  "coverage",
  "android",
  "ios"
]);

const TEXT_EXTENSIONS = new Set([
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".ts",
  ".tsx",
  ".json",
  ".yaml",
  ".yml"
]);

const CODE_EXTENSIONS = new Set([
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".ts",
  ".tsx"
]);

export function toPosix(filePath) {
  return filePath.replaceAll(path.sep, "/");
}

export function isInside(filePath, prefix) {
  return toPosix(filePath).startsWith(prefix);
}

export function listFiles(dir = repoRoot, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (EXCLUDED_DIRS.has(entry.name)) continue;

    const full = path.join(dir, entry.name);
    const rel = toPosix(path.relative(repoRoot, full));

    if (rel.startsWith("tools/registry/runs/")) continue;

    if (entry.isDirectory()) {
      listFiles(full, files);
      continue;
    }

    const ext = path.extname(entry.name);
    if (TEXT_EXTENSIONS.has(ext)) {
      files.push(rel);
    }
  }

  return files;
}

export function listCodeFiles() {
  return listFiles().filter((file) => CODE_EXTENSIONS.has(path.extname(file)));
}

export function read(file) {
  return fs.readFileSync(path.join(repoRoot, file), "utf8");
}

export function fail(guardId, violations) {
  if (violations.length === 0) {
    console.log(`${guardId}: PASS`);
    process.exit(0);
  }

  console.error(`${guardId}: FAIL`);
  for (const violation of violations) {
    console.error(`- ${violation.file}${violation.line ? `:${violation.line}` : ""} ${violation.message}`);
  }
  process.exit(1);
}

export function lineNumber(content, index) {
  return content.slice(0, index).split(/\r?\n/).length;
}

export function findImportSpecifiers(content) {
  const specs = [];
  const importRegex = /\bimport\s+(?:[^'"`]*?\s+from\s+)?["']([^"']+)["']/g;
  const exportRegex = /\bexport\s+[^'"`]*?\s+from\s+["']([^"']+)["']/g;
  const requireRegex = /\brequire\(\s*["']([^"']+)["']\s*\)/g;

  for (const regex of [importRegex, exportRegex, requireRegex]) {
    let match;
    while ((match = regex.exec(content))) {
      specs.push({ specifier: match[1], index: match.index });
    }
  }

  return specs;
}

export function existsResolved(baseFile, specifier) {
  const baseDir = path.dirname(path.join(repoRoot, baseFile));
  const target = path.resolve(baseDir, specifier);
  const candidates = [
    target,
    `${target}.ts`,
    `${target}.tsx`,
    `${target}.js`,
    `${target}.jsx`,
    `${target}.mjs`,
    `${target}.json`,
    path.join(target, "index.ts"),
    path.join(target, "index.tsx"),
    path.join(target, "index.js"),
    path.join(target, "index.jsx"),
    path.join(target, "index.mjs")
  ];

  return candidates.some((candidate) => fs.existsSync(candidate));
}

export function loadTsconfigAliases() {
  const tsconfigPath = path.join(repoRoot, "tsconfig.base.json");
  if (!fs.existsSync(tsconfigPath)) return new Map();

  const raw = fs.readFileSync(tsconfigPath, "utf8");
  const json = JSON.parse(raw);
  const paths = json?.compilerOptions?.paths ?? {};
  const aliases = new Map();

  for (const [alias, targets] of Object.entries(paths)) {
    const first = Array.isArray(targets) ? targets[0] : undefined;
    if (first) aliases.set(alias, first);
  }

  return aliases;
}