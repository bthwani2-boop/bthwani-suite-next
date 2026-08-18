import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fail, lineNumber, listCodeFiles, read, repoRoot, toPosix } from "./_guard-utils.mjs";

const guardId = "cleanup-policy-gate";
const violations = [];

function option(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? String(process.argv[index + 1] ?? "").trim() : "";
}

const scope = option("--scope") || "full";
if (!new Set(["affected", "full"]).has(scope)) {
  violations.push({ file: "tools/guards/cleanup-policy-gate.mjs", line: 0, message: `INVALID_CLEANUP_SCOPE ${scope}` });
}

function resolveChangedFiles() {
  const base = option("--base") || String(process.env.NX_BASE ?? "").trim();
  const head = option("--head") || String(process.env.NX_HEAD ?? "").trim();
  if (!base || !head) {
    violations.push({ file: "tools/guards/cleanup-policy-gate.mjs", line: 0, message: "AFFECTED_CLEANUP_REQUIRES_EXPLICIT_BASE_AND_HEAD" });
    return [];
  }
  const result = spawnSync("git", ["diff", "--name-only", "--diff-filter=ACMRDTUXB", base, head, "--"], {
    cwd: repoRoot,
    encoding: "utf8",
    windowsHide: true,
  });
  if (result.error || result.status !== 0) {
    violations.push({ file: "tools/guards/cleanup-policy-gate.mjs", line: 0, message: `AFFECTED_CLEANUP_CHANGED_FILES_UNRESOLVED ${result.error?.message ?? result.status}` });
    return [];
  }
  return String(result.stdout ?? "").split(/\r?\n/).map(toPosix).map((file) => file.trim()).filter(Boolean);
}

const changedFiles = scope === "affected" ? resolveChangedFiles() : [];

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

const excludedDirs = new Set([
  ".git", "node_modules", ".pnpm-store", ".next", ".expo", ".turbo", ".nx", ".cache", "dist", "build", "out",
  "coverage", "tmp", "temp", "logs", "graphify-out", "evidence", "screenshots", "recordings", "visual-evidence",
  "generated", "__generated__", "android", "ios", "registry", "diagnostics", ".diagnostics",
]);
const excludedExtensions = new Set([
  "png", "jpg", "jpeg", "gif", "webp", "svg", "ico", "mp4", "mov", "avi", "pdf", "zip", "7z", "rar", "tar",
  "gz", "map", "log", "har", "sqlite", "db", "db-shm", "db-wal", "tsbuildinfo", "apk", "aab", "ipa",
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

// Executable repository files must not depend on one developer's checkout path.
const localPathScan = scope === "full"
  ? new Set([
    ...walk(path.join(repoRoot, "infra")),
    ...walk(path.join(repoRoot, "tools")),
    ...walk(path.join(repoRoot, ".github")),
    ...walk(path.join(repoRoot, "services")),
    ...walk(path.join(repoRoot, "core")),
    ...walk(path.join(repoRoot, "apps")),
    ...walk(path.join(repoRoot, "shared")),
    "package.json",
  ])
  : new Set(changedFiles);

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
    if (hardcodedPathRegexes.some((regex) => regex.test(line))) {
      violations.push({ file, line: index + 1, message: `HARDCODED_LOCAL_REPOSITORY_ROOT ${line.trim()}` });
      continue;
    }
    const match = setLocationRegex.exec(line);
    if (!match) continue;
    const argument = match[1].trim();
    const absoluteWithoutVariable = (/^[a-z]:/i.test(argument) || argument.startsWith("/") || argument.startsWith("\\")) && !argument.includes("$");
    if (absoluteWithoutVariable) violations.push({ file, line: index + 1, message: `HARDCODED_SET_LOCATION ${line.trim()}` });
  }
}

// Runtime/backend source must not present preview/demo/mock state as real execution truth.
const runtimePrefixes = ["apps/", "services/", "core/"];
const runtimeExclusions = [
  "/tests/", "/test/", ".test.", ".spec.", "/fixtures/", "/fixture/", "/seeds/", "/migrations/", "/generated/", "/frontend/",
];
const previewRegex = /\b(previewData|demoData|useFixtures|fakeActor|fakeUser)\b/g;
const runtimeFiles = scope === "full"
  ? listCodeFiles()
  : changedFiles
    .filter((file) => /\.(?:[cm]?js|jsx|ts|tsx|go|py|rb|java|kt|rs|swift|php)$/i.test(file))
    .filter((file) => fs.existsSync(path.join(repoRoot, file)));
for (const file of runtimeFiles) {
  if (!runtimePrefixes.some((prefix) => file.startsWith(prefix))) continue;
  if (runtimeExclusions.some((part) => file.includes(part))) continue;
  const content = read(file);
  for (const match of content.matchAll(previewRegex)) {
    violations.push({ file, line: lineNumber(content, match.index), message: `RUNTIME_FAKE_TRUTH_MARKER ${match[0]}` });
  }
}

// Disabled placeholder projects are forbidden. Git history is the archive.
const projectFiles = scope === "full"
  ? [
    ...walk(path.join(repoRoot, "apps")),
    ...walk(path.join(repoRoot, "services")),
    ...walk(path.join(repoRoot, "core")),
    ...walk(path.join(repoRoot, "shared")),
  ].filter((file) => file.endsWith("/project.json"))
  : changedFiles.filter((file) => file.endsWith("/project.json"));

for (const projectFile of projectFiles) {
  const project = readJson(projectFile);
  if (!project) continue;
  const projectRoot = toPosix(project.root ?? path.posix.dirname(projectFile));
  if (project.x_bthwani_nxDisabled === true) {
    violations.push({ file: projectFile, line: 0, message: `DISABLED_PLACEHOLDER_PROJECT_FORBIDDEN:${projectRoot}` });
  }
}

if (fs.existsSync(path.join(repoRoot, "project-graph.json"))) {
  violations.push({
    file: "project-graph.json",
    line: 0,
    message: "TRACKED_GENERATED_PROJECT_GRAPH_FORBIDDEN: query Nx at execution time instead of committing stale graph output",
  });
}

console.log(`cleanup-policy-scope: ${scope}`);
fail(guardId, violations);
