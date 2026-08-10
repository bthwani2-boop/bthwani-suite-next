import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Anchor root to this file's location (tools/guards/ → repo root) so guards work
// correctly whether invoked from the repo root or from a package subdirectory.
export const repoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

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

export function listFiles(dir = repoRoot, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    const rel = toPosix(path.relative(repoRoot, full));
    if (isExcluded(rel, entry.isDirectory(), entry.name)) continue;
    if (entry.isDirectory()) {
      listFiles(full, files);
      continue;
    }
    if (TEXT_EXTENSIONS.has(path.extname(entry.name))) files.push(rel);
  }
  return files;
}

export function listCodeFiles() {
  return listFiles().filter((file) => CODE_EXTENSIONS.has(path.extname(file)));
}

export function listStyleFiles(dir = repoRoot, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    const rel = toPosix(path.relative(repoRoot, full));
    if (isExcluded(rel, entry.isDirectory(), entry.name)) continue;
    if (entry.isDirectory()) {
      listStyleFiles(full, files);
      continue;
    }
    if (STYLE_EXTENSIONS.has(path.extname(entry.name))) files.push(rel);
  }
  return files;
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
  // Guards report through their process exit code. CI/workflow orchestration owns
  // repository-platform status/check publication; guards never publish hidden
  // commit statuses or mutate GitHub state directly.
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

function readActivationPolicy() {
  const relative = "tools/toolchain/tool-activation-policy.json";
  const file = path.join(repoRoot, relative);
  if (!fs.existsSync(file)) {
    console.error(`\n[TOOLCHAIN ERROR] Missing ${relative}. Activation checks fail closed.\n`);
    process.exit(1);
  }
  let document;
  try {
    document = JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (error) {
    console.error(`\n[TOOLCHAIN ERROR] Invalid ${relative}: ${error.message}. Activation checks fail closed.\n`);
    process.exit(1);
  }
  if (document.schemaVersion !== 1 || document.policyId !== "TOOL_ACTIVATION_POLICY" || typeof document.activations !== "object" || document.activations === null) {
    console.error(`\n[TOOLCHAIN ERROR] Malformed ${relative}. Activation checks fail closed.\n`);
    process.exit(1);
  }
  return document.activations;
}

export function assertActiveOrWarn(toolId, binaryName) {
  const activation = readActivationPolicy()[toolId];
  if (!["active", "partial", "optional", "missing", "disabled"].includes(activation)) {
    console.error(`\n[TOOLCHAIN ERROR] Missing or invalid activation for '${toolId}'. decision=FIX_REQUIRED\n`);
    process.exit(1);
  }
  if (activation === "active") {
    console.error(`\n[${toolId.toUpperCase()} ERROR] Required active toolchain binary '${binaryName}' is not installed.`);
    console.error("Active checks must fail closed.\n");
    process.exit(1);
  }
  if (activation === "partial") {
    console.warn(`\n[${toolId.toUpperCase()} WARN] Partial toolchain binary '${binaryName}' is not installed.`);
    console.warn("Partial checks are warn-only until their declared activation policy is raised.\n");
    process.exit(0);
  }
  if (activation === "disabled") {
    console.log(`\n[${toolId.toUpperCase()} SKIP] '${binaryName}' is disabled by tool activation policy.\n`);
    process.exit(0);
  }
  console.log(`\n[${toolId.toUpperCase()} SKIP] '${binaryName}' binary not installed. activation=${activation}.\n`);
  process.exit(0);
}
