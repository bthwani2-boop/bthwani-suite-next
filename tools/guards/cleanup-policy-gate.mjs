import fs from "node:fs";
import path from "node:path";
import { fail, lineNumber, listCodeFiles, read, repoRoot, toPosix } from "./_guard-utils.mjs";

const guardId = "cleanup-policy-gate";
const violations = [];

// 1. no-hardcoded-local-repo-root
const TARGETS = [
  "infra",
  "tools",
  ".github",
  "package.json",
  "docs/runtime",
  "services"
];

const EXCLUDED_DIRS = new Set([
  ".git",
  "node_modules",
  ".pnpm-store",
  ".next",
  ".expo",
  ".turbo",
  ".nx",
  ".cache",
  "dist",
  "build",
  "out",
  "coverage",
  "tmp",
  "temp",
  "logs",
  "graphify-out",
  "evidence",
  "screenshots",
  "recordings",
  "visual-evidence",
  "generated",
  "__generated__",
  "android",
  "ios",
  "registry"
]);

const EXCLUDED_EXTENSIONS = new Set([
  "png", "jpg", "jpeg", "gif", "webp", "svg", "ico",
  "mp4", "mov", "avi", "pdf",
  "zip", "7z", "rar", "tar", "gz",
  "map", "log", "har", "sqlite", "db", "db-shm", "db-wal",
  "tsbuildinfo", "apk", "aab", "ipa"
]);

function walk(targetPath, files = []) {
  if (!fs.existsSync(targetPath)) return files;
  const stat = fs.statSync(targetPath);
  if (stat.isFile()) {
    const rel = toPosix(path.relative(repoRoot, targetPath));
    const name = path.basename(targetPath);
    const ext = path.extname(name).toLowerCase().slice(1);
    if (!EXCLUDED_EXTENSIONS.has(ext)) {
      files.push({ full: targetPath, rel });
    }
    return files;
  }

  for (const entry of fs.readdirSync(targetPath, { withFileTypes: true })) {
    const full = path.join(targetPath, entry.name);
    const rel = toPosix(path.relative(repoRoot, full));
    const name = entry.name;

    if (entry.isDirectory()) {
      if (EXCLUDED_DIRS.has(name)) continue;
      walk(full, files);
    } else {
      const ext = path.extname(name).toLowerCase().slice(1);
      if (EXCLUDED_EXTENSIONS.has(ext)) continue;
      files.push({ full, rel });
    }
  }
  return files;
}

const allFiles = [];
for (const target of TARGETS) {
  walk(path.join(repoRoot, target), allFiles);
}

const hardcodedPathRegexes = [
  /c:\\bthwani-suite-next/i,
  /c:\/bthwani-suite-next/i,
  /\/home\/[^/]+\/bthwani-suite-next/i,
  /\\home\\[^\\]+\\bthwani-suite-next/i
];

const setLocationRegex = /Set-Location\s+([^\r\n#]+)/i;

for (const file of allFiles) {
  if (file.rel === "tools/guards/cleanup-policy-gate.mjs") continue;

  let content;
  try {
    content = fs.readFileSync(file.full, "utf8");
  } catch {
    continue;
  }

  if (content.includes("ALLOW_LOCAL_PATH_EXAMPLE")) {
    continue;
  }

  const lines = content.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    let matched = false;
    for (const regex of hardcodedPathRegexes) {
      if (regex.test(line)) {
        violations.push({
          file: file.rel,
          line: i + 1,
          message: `contains hardcoded local repository root path: "${line.trim()}"`
        });
        matched = true;
        break;
      }
    }
    if (matched) continue;

    const setLocMatch = setLocationRegex.exec(line);
    if (setLocMatch) {
      const arg = setLocMatch[1].trim();
      const looksLocalHardcoded = (
        /^[a-z]:/i.test(arg) ||
        arg.startsWith("/") ||
        arg.startsWith("\\") ||
        arg.includes("bthwani-suite-next") ||
        arg.includes("home") ||
        arg.includes("Users")
      ) && !arg.includes("$");

      if (looksLocalHardcoded) {
        violations.push({
          file: file.rel,
          line: i + 1,
          message: `contains hardcoded Set-Location destination: "${line.trim()}"`
        });
      }
    }
  }
}

// 2. no-preview-demo-mock-runtime
const runtimePrefixes = ["apps/", "services/", "core/"];
const excluded = ["/tests/", "/test/", ".test.", ".spec.", "tools/", "governance/", "/frontend/"];
const regexPreview = /\b(preview|demo|mock|fixture|fixtures|fakeActor|fakeUser|useFixtures|previewData|demoData)\b/gi;

for (const file of listCodeFiles()) {
  if (!runtimePrefixes.some((prefix) => file.startsWith(prefix))) continue;
  if (excluded.some((part) => file.includes(part))) continue;

  const content = read(file);
  let match;
  while ((match = regexPreview.exec(content))) {
    violations.push({
      file,
      line: lineNumber(content, match.index),
      message: `runtime preview/demo/mock marker is forbidden: ${match[0]}`
    });
  }
}

// 3. no-legacy-slice-labels
const regexLegacy = /(?<!\.)\b[Ss]lice\b|(?<!\.)\bSLICE\b|\bDSH-\d{2,3}\b|الشريحة|الشرائح/g;

const EXCLUDED_LEGACY_DIRS = new Set([
  ".git",
  "node_modules",
  ".pnpm-store",
  ".next",
  ".expo",
  ".turbo",
  ".nx",
  ".cache",
  "dist",
  "build",
  "out",
  "workspace",
  "coverage",
  "tmp",
  "temp",
  "logs",
  "evidence",
  "screenshots",
  "recordings",
  "visual-evidence",
  "generated",
  "__generated__",
  ".diagnostics",
  ".github",
  "graphify-out"
]);

function shouldScanLegacy(relPath, isDir, name) {
  if (isDir) {
    if (EXCLUDED_LEGACY_DIRS.has(name)) return false;
  }
  
  if (relPath.startsWith("tools/registry/runs")) return false;
  if (relPath.startsWith("services/dsh/database/migrations")) return false;
  if (relPath.startsWith("services/dsh/evidence")) return false;
  if (relPath.startsWith("tools/plan/command_old_new")) return false;
  if (relPath === "tools/guards/cleanup-policy-gate.mjs") return false;
  
  if (!isDir) {
    if (name === "pnpm-lock.yaml" || name === "package-lock.json" || name === "yarn.lock") return false;
    if (name === "package.json") return false;
    if (name === "guard-manifest.json") return false;
    
    const allowedExts = new Set([
      ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".yaml", ".yml", ".json", ".md", ".ps1", ".sql", ".go"
    ]);
    const ext = path.extname(name).toLowerCase();
    if (!allowedExts.has(ext)) return false;
  }
  return true;
}

function walkLegacy(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    const rel = toPosix(path.relative(repoRoot, full));
    
    if (!shouldScanLegacy(rel, entry.isDirectory(), entry.name)) continue;
    
    if (entry.isDirectory()) {
      walkLegacy(full, files);
    } else {
      files.push(rel);
    }
  }
  return files;
}

const legacyFiles = walkLegacy(repoRoot);

for (const file of legacyFiles) {
  const content = fs.readFileSync(path.join(repoRoot, file), "utf8");
  let match;
  while ((match = regexLegacy.exec(content))) {
    const lineNum = lineNumber(content, match.index);
    const lineContent = content.split(/\r?\n/)[lineNum - 1];
    
    if (lineContent.includes("no-legacy-slice-labels-ignore") || lineContent.includes("@ignore-legacy-slice-labels")) {
      continue;
    }
    
    const isMigrationOrEvidence = /\/evidence\/|\/migrations\/|\/seeds\/|dsh-\d{3}_|\bDSH-\d{3}-/.test(file);
    if (isMigrationOrEvidence) {
      continue;
    }

    violations.push({
      file,
      line: lineNum,
      message: `forbidden legacy slice label or term found: "${match[0]}"`
    });
  }
}

// 4. no-old-guards-in-runtime
const oldGuards = [
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
  "wlt-dsh-frontend-shared-ownership-gate"
];

const EXCLUDED_CLEANUP_DIRS = new Set([
  ".git",
  "node_modules",
  ".pnpm-store",
  ".next",
  ".expo",
  ".turbo",
  ".nx",
  ".cache",
  "dist",
  "build",
  "out",
  "coverage",
  "tmp",
  "temp",
  "logs",
  "evidence",
  "screenshots",
  "recordings",
  "visual-evidence",
  "generated",
  "__generated__",
  ".diagnostics",
  "graphify-out"
]);

function shouldScanForOldGuards(relPath, isDir, name) {
  if (isDir) {
    if (EXCLUDED_CLEANUP_DIRS.has(name)) return false;
  }
  if (relPath.startsWith("tools/registry/runs")) return false;
  if (relPath.startsWith("docs/")) return false;
  if (relPath.startsWith("governance/")) return false;
  if (relPath.startsWith("graphify-out/")) return false;
  if (relPath.includes("evidence/")) return false;
  if (relPath === "tools/guards/cleanup-policy-gate.mjs") return false;
  
  if (!isDir) {
    const ext = path.extname(name).toLowerCase();
    const allowed = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".yaml", ".yml", ".json", ".ps1", ".sh"]);
    if (!allowed.has(ext)) return false;
  }
  return true;
}

function walkCleanup(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    const rel = toPosix(path.relative(repoRoot, full));
    if (!shouldScanForOldGuards(rel, entry.isDirectory(), entry.name)) continue;
    if (entry.isDirectory()) {
      walkCleanup(full, files);
    } else {
      files.push(rel);
    }
  }
  return files;
}

const cleanupScanFiles = walkCleanup(repoRoot);
for (const file of cleanupScanFiles) {
  let content;
  try {
    content = fs.readFileSync(path.join(repoRoot, file), "utf8");
  } catch {
    continue;
  }
  
  for (const oldGuard of oldGuards) {
    if (content.includes(oldGuard)) {
      const lineNum = lineNumber(content, content.indexOf(oldGuard));
      violations.push({
        file,
        line: lineNum,
        message: `FORBIDDEN: reference to deprecated guard name found: "${oldGuard}"`
      });
    }
  }
}

fail(guardId, violations);
