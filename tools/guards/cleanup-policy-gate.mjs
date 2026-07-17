import fs from "node:fs";
import path from "node:path";
import { fail, lineNumber, listCodeFiles, read, repoRoot, toPosix } from "./_guard-utils.mjs";

const guardId = "cleanup-policy-gate";
const violations = [];

function readJson(relativePath) {
  const full = path.join(repoRoot, relativePath);
  if (!fs.existsSync(full)) return null;
  try {
    return JSON.parse(fs.readFileSync(full, "utf8"));
  } catch (error) {
    violations.push({ file: relativePath, line: 0, message: `INVALID_JSON ${error.message}` });
    return null;
  }
}

const authorityRegistry = readJson("governance/authority/authority-precedence.json");
const skillsRegistry = readJson("governance/skills/skills-registry.json");

const activeAuthorityFiles = new Set(
  (authorityRegistry?.documents ?? [])
    .filter((entry) => ["ROOT_AUTHORITY", "ACTIVE_CANONICAL", "CONDITIONAL_CANONICAL", "ADAPTER"].includes(entry.classification))
    .map((entry) => toPosix(entry.path)),
);

const governedSkillFiles = new Set(
  (skillsRegistry?.entries ?? [])
    .filter((entry) => entry.contract_level === "governed")
    .map((entry) => `${toPosix(entry.path)}/SKILL.md`),
);

const textualPolicyFiles = new Set([...activeAuthorityFiles, ...governedSkillFiles, "GEMINI.md"]);

const excludedDirs = new Set([
  ".git", "node_modules", ".pnpm-store", ".next", ".expo", ".turbo", ".nx", ".cache",
  "dist", "build", "out", "coverage", "tmp", "temp", "logs", "graphify-out", "evidence",
  "screenshots", "recordings", "visual-evidence", "generated", "__generated__", "android", "ios",
  "registry", "diagnostics", ".diagnostics",
]);
const excludedExtensions = new Set([
  "png", "jpg", "jpeg", "gif", "webp", "svg", "ico", "mp4", "mov", "avi", "pdf",
  "zip", "7z", "rar", "tar", "gz", "map", "log", "har", "sqlite", "db", "db-shm", "db-wal",
  "tsbuildinfo", "apk", "aab", "ipa",
]);

function walk(targetPath, files = []) {
  if (!fs.existsSync(targetPath)) return files;
  const stat = fs.statSync(targetPath);
  if (stat.isFile()) {
    const rel = toPosix(path.relative(repoRoot, targetPath));
    const ext = path.extname(targetPath).toLowerCase().slice(1);
    if (!excludedExtensions.has(ext)) files.push(rel);
    return files;
  }
  for (const entry of fs.readdirSync(targetPath, { withFileTypes: true })) {
    if (entry.isDirectory() && excludedDirs.has(entry.name)) continue;
    const full = path.join(targetPath, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else {
      const ext = path.extname(entry.name).toLowerCase().slice(1);
      if (!excludedExtensions.has(ext)) files.push(toPosix(path.relative(repoRoot, full)));
    }
  }
  return files;
}

// 1. Active policy and executable repository files must not depend on a developer-specific repository root.
const localPathScan = new Set([
  ...walk(path.join(repoRoot, "infra")),
  ...walk(path.join(repoRoot, "tools")),
  ...walk(path.join(repoRoot, ".github")),
  ...walk(path.join(repoRoot, "services")),
  ...walk(path.join(repoRoot, "core")),
  ...walk(path.join(repoRoot, "apps")),
  "package.json",
  ...textualPolicyFiles,
]);

const hardcodedPathRegexes = [
  /c:\\bthwani-suite-next/i,
  /c:\/bthwani-suite-next/i,
  /\/home\/[^/]+\/bthwani-suite-next/i,
  /\\home\\[^\\]+\\bthwani-suite-next/i,
];
const setLocationRegex = /Set-Location\s+([^\r\n#]+)/i;

for (const file of [...localPathScan].sort()) {
  if (!file || file === "tools/guards/cleanup-policy-gate.mjs") continue;
  const full = path.join(repoRoot, file);
  if (!fs.existsSync(full) || fs.statSync(full).isDirectory()) continue;
  let content;
  try { content = fs.readFileSync(full, "utf8"); } catch { continue; }
  if (content.includes("ALLOW_LOCAL_PATH_EXAMPLE")) continue;

  for (const [index, line] of content.split(/\r?\n/).entries()) {
    const hardcoded = hardcodedPathRegexes.find((regex) => regex.test(line));
    if (hardcoded) {
      violations.push({ file, line: index + 1, message: `HARDCODED_LOCAL_REPOSITORY_ROOT ${line.trim()}` });
      continue;
    }
    const match = setLocationRegex.exec(line);
    if (!match) continue;
    const argument = match[1].trim();
    const absoluteWithoutVariable = (/^[a-z]:/i.test(argument) || argument.startsWith("/") || argument.startsWith("\\")) && !argument.includes("$");
    if (absoluteWithoutVariable) {
      violations.push({ file, line: index + 1, message: `HARDCODED_SET_LOCATION ${line.trim()}` });
    }
  }
}

// 2. Backend/runtime source must not present preview/demo/mock state as real execution truth.
const runtimePrefixes = ["apps/", "services/", "core/"];
const runtimeExclusions = [
  "/tests/", "/test/", ".test.", ".spec.", "/fixtures/", "/fixture/", "/seeds/", "/migrations/",
  "/generated/", "tools/", "governance/", "/frontend/",
];
const previewRegex = /\b(previewData|demoData|useFixtures|fakeActor|fakeUser)\b/g;
for (const file of listCodeFiles()) {
  if (!runtimePrefixes.some((prefix) => file.startsWith(prefix))) continue;
  if (runtimeExclusions.some((part) => file.includes(part))) continue;
  const content = read(file);
  for (const match of content.matchAll(previewRegex)) {
    violations.push({ file, line: lineNumber(content, match.index), message: `RUNTIME_FAKE_TRUTH_MARKER ${match[0]}` });
  }
}

// 3. Only active authority and governed skill contracts are prohibited from using retired numbered-slice labels.
// Historical and derived documents remain readable evidence and are not rewritten by this guard.
const retiredStageLabelRegex = /\b(?:SLICE|Slice)\s*[-:#]?\s*\d+\b|\bDSH-\d{2,3}\b|الشريحة\s*\d+|الشرائح\s*\d+/g;
for (const file of [...textualPolicyFiles].sort()) {
  const full = path.join(repoRoot, file);
  if (!fs.existsSync(full) || fs.statSync(full).isDirectory()) continue;
  const content = fs.readFileSync(full, "utf8");
  for (const match of content.matchAll(retiredStageLabelRegex)) {
    violations.push({ file, line: lineNumber(content, match.index), message: `RETIRED_STAGE_LABEL ${match[0]}` });
  }
}

// 4. Runtime, scripts, workflows, and package configuration must not call deprecated guard names.
const deprecatedGuards = [
  "app-shell-control-panel-contract-gate",
  "control-panel-design-gate",
  "canonical-currency-yemen",
  "canonical-host-ports",
  "docker-runtime-profiles",
  "dsh-cart-serviceability-gate",
  "dsh-catalog-ownership-gate",
  "dsh-frontend-shared-boundary-imports-gate",
  "dsh-frontend-shared-ownership-gate",
  "dsh-platform-geo-provider-governance-gate",
  "dsh-service-activation",
  "dsh-store-role-boundary-gate",
  "guard-automated-execution-policy",
  "guard-go-backend-runtime",
  "guard-journey-operating-model",
  "no-direct-fetch-in-screen",
  "no-hardcoded-local-repo-root",
  "no-legacy-slice-labels",
  "no-memory-repo-in-journey-runtime",
  "no-preview-demo-mock-runtime",
  "performance-runtime-baseline",
  "service-fullstack-linkage",
  "unified-fullstack-brain-gate",
  "wlt-dsh-frontend-shared-ownership-gate",
];

const deprecatedReferenceFiles = new Set([
  ...walk(path.join(repoRoot, "tools")),
  ...walk(path.join(repoRoot, ".github")),
  ...walk(path.join(repoRoot, "services")),
  ...walk(path.join(repoRoot, "core")),
  ...walk(path.join(repoRoot, "apps")),
  "package.json",
]);
for (const file of [...deprecatedReferenceFiles].sort()) {
  if (!file || file === "tools/guards/cleanup-policy-gate.mjs") continue;
  const full = path.join(repoRoot, file);
  if (!fs.existsSync(full) || fs.statSync(full).isDirectory()) continue;
  let content;
  try { content = fs.readFileSync(full, "utf8"); } catch { continue; }
  for (const deprecated of deprecatedGuards) {
    const index = content.indexOf(deprecated);
    if (index >= 0) {
      violations.push({ file, line: lineNumber(content, index), message: `DEPRECATED_GUARD_REFERENCE ${deprecated}` });
    }
  }
}

fail(guardId, violations);
