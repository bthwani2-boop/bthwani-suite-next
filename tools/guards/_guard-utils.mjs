import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const moduleRepoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
export const repoRoot = path.resolve(process.env.BTHWANI_TARGET_REPO || moduleRepoRoot);

const EXCLUDED_DIRS = new Set([
  ".git", ".diagnostics", "node_modules", ".pnpm-store", ".next", ".expo", ".turbo", ".nx", ".cache",
  "dist", "build", "out", "coverage", "tmp", "temp", "logs", "graphify-out", "evidence", "screenshots",
  "recordings", "visual-evidence", "generated", "__generated__", "android", "ios"
]);
const EXCLUDED_EXTENSIONS = new Set([
  "png", "jpg", "jpeg", "gif", "webp", "svg", "ico", "mp4", "mov", "avi", "pdf", "zip", "7z", "rar",
  "tar", "gz", "map", "log", "har", "sqlite", "db", "db-shm", "db-wal", "tsbuildinfo", "apk", "aab", "ipa"
]);
const TEXT_EXTENSIONS = new Set([".js", ".jsx", ".mjs", ".cjs", ".ts", ".tsx", ".json", ".yaml", ".yml"]);
const CODE_EXTENSIONS = new Set([".js", ".jsx", ".mjs", ".cjs", ".ts", ".tsx"]);
const STYLE_EXTENSIONS = new Set([".css", ".scss"]);

let repositoryFileCache;
const readCache = new Map();
let tsconfigAliasCache;

export function toPosix(filePath) {
  return filePath.replaceAll(path.sep, "/");
}

export function isInside(filePath, prefix) {
  return toPosix(filePath).startsWith(prefix);
}

export function isExcluded(relPath, isDir, name) {
  if (isDir) {
    if (EXCLUDED_DIRS.has(name)) return true;
    if (relPath === "tools/diagnostics") return true;
    if (name === "_donor" || name === ".graphify") return true;
  }
  if (relPath.startsWith("tools/registry/runs")) {
    const parts = relPath.split("/");
    if (parts[0] === "tools" && parts[1] === "registry" && parts[2] === "runs") return true;
  }
  if (!isDir) {
    const ext = path.extname(name).toLowerCase();
    const cleanExt = ext.startsWith(".") ? ext.slice(1) : ext;
    if (EXCLUDED_EXTENSIONS.has(cleanExt) || name.endsWith(".min.js")) return true;
    const isLockfile = name === "pnpm-lock.yaml" || name === "package-lock.json" || name === "yarn.lock";
    if (isLockfile && !process.env.KEEP_LOCKFILES_FOR_DEP_TASKS) return true;
  }
  return false;
}

function hasExcludedDirectory(relPath) {
  const parts = relPath.split("/");
  for (const name of parts.slice(0, -1)) {
    if (EXCLUDED_DIRS.has(name) || name === "_donor" || name === ".graphify") return true;
  }
  return relPath.startsWith("tools/diagnostics/") || relPath.startsWith("tools/registry/runs/");
}

function repositoryFiles() {
  if (repositoryFileCache) return repositoryFileCache;
  const result = spawnSync(
    "git",
    ["ls-files", "-z", "--cached", "--others", "--exclude-standard"],
    {
      cwd: repoRoot,
      encoding: "utf8",
      windowsHide: true,
      maxBuffer: 64 * 1024 * 1024,
    },
  );
  if (result.error || result.status !== 0) {
    throw new Error(`Unable to inventory repository files with git ls-files: ${result.stderr || result.error?.message || result.status}`);
  }

  repositoryFileCache = [...new Set(String(result.stdout || "")
    .split("\0")
    .map((file) => toPosix(file.trim()))
    .filter(Boolean))]
    .filter((rel) => !hasExcludedDirectory(rel))
    .filter((rel) => !isExcluded(rel, false, path.posix.basename(rel)))
    .filter((rel) => fs.existsSync(path.join(repoRoot, rel)))
    .sort();
  return repositoryFileCache;
}

function normalizeDirectoryPrefix(dir) {
  const absolute = path.isAbsolute(dir) ? path.resolve(dir) : path.resolve(repoRoot, dir);
  const relative = toPosix(path.relative(repoRoot, absolute));
  if (!relative || relative === ".") return "";
  if (relative === ".." || relative.startsWith("../")) return null;
  return relative.replace(/\/+$/, "");
}

function filesUnder(dir) {
  const prefix = normalizeDirectoryPrefix(dir);
  if (prefix === null) return [];
  if (!prefix) return repositoryFiles();
  return repositoryFiles().filter((file) => file === prefix || file.startsWith(`${prefix}/`));
}

export function listFiles(dir = repoRoot, files = []) {
  for (const rel of filesUnder(dir)) {
    if (TEXT_EXTENSIONS.has(path.posix.extname(rel))) files.push(rel);
  }
  return files;
}

export function listCodeFiles() {
  return repositoryFiles().filter((file) => CODE_EXTENSIONS.has(path.posix.extname(file)));
}

export function listStyleFiles(dir = repoRoot, files = []) {
  for (const rel of filesUnder(dir)) {
    if (STYLE_EXTENSIONS.has(path.posix.extname(rel))) files.push(rel);
  }
  return files;
}

export function read(file) {
  if (!readCache.has(file)) readCache.set(file, fs.readFileSync(path.join(repoRoot, file), "utf8"));
  return readCache.get(file);
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

function blankTemplateLiteral(match) {
  return match.replace(/[^\r\n]/g, " ");
}

export function findImportSpecifiers(content) {
  const specs = [];
  const scanContent = content.replace(/`(?:\\[\s\S]|[^`\\])*`/g, blankTemplateLiteral);
  const importRegex = /\bimport\s+(?:[^'"`]*?\s+from\s+)?["']([^"']+)["']/g;
  const exportRegex = /\bexport\s+[^'"`]*?\s+from\s+["']([^"']+)["']/g;
  const requireRegex = /\brequire\(\s*["']([^"']+)["']\s*\)/g;
  for (const regex of [importRegex, exportRegex, requireRegex]) {
    let match;
    while ((match = regex.exec(scanContent))) specs.push({ specifier: match[1], index: match.index });
  }
  return specs;
}

export function existsResolved(baseFile, specifier) {
  const baseDir = path.dirname(path.join(repoRoot, baseFile));
  const target = path.resolve(baseDir, specifier);
  const candidates = [
    target, `${target}.ts`, `${target}.tsx`, `${target}.js`, `${target}.jsx`, `${target}.mjs`, `${target}.json`,
    path.join(target, "index.ts"), path.join(target, "index.tsx"), path.join(target, "index.js"),
    path.join(target, "index.jsx"), path.join(target, "index.mjs")
  ];
  if (specifier.endsWith(".js")) {
    const tsBase = target.slice(0, -3);
    candidates.push(`${tsBase}.ts`, `${tsBase}.tsx`);
  }
  return candidates.some((candidate) => fs.existsSync(candidate));
}

export function loadTsconfigAliases() {
  if (tsconfigAliasCache) return new Map(tsconfigAliasCache);
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
  tsconfigAliasCache = aliases;
  return new Map(aliases);
}

export function assertActiveOrWarn(toolId, binaryName) {
  console.log(`\n[${toolId.toUpperCase()} SKIP] optional binary '${binaryName}' is not installed.\n`);
  process.exit(0);
}
