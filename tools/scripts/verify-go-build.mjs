import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { writeToolEvidence } from "./capture-tool-evidence.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "../..");
const [argument] = process.argv.slice(2);
const repoPrefix = `${repoRoot}${path.sep}`;

function listBackendDirs() {
  const backends = [];
  for (const rootName of ["core", "services"]) {
    const rootDir = path.join(repoRoot, rootName);
    if (!fs.existsSync(rootDir)) continue;
    for (const entry of fs.readdirSync(rootDir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const backendDir = path.join(rootDir, entry.name, "backend");
      if (fs.existsSync(path.join(backendDir, "go.mod"))) {
        backends.push(backendDir);
      }
    }
  }
  return backends.sort();
}

function findExecutables(rootDir) {
  if (!fs.existsSync(rootDir)) return [];
  const matches = [];
  const stack = [rootDir];

  while (stack.length > 0) {
    const current = stack.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        if ([".git", "node_modules", "vendor"].includes(entry.name)) continue;
        stack.push(fullPath);
        continue;
      }
      if (entry.isFile() && entry.name.toLowerCase().endsWith(".exe")) {
        matches.push(fullPath);
      }
    }
  }

  return matches.sort();
}

function allBackendExecutables() {
  return listBackendDirs().flatMap((backendDir) => findExecutables(backendDir)).sort();
}

function printArtifacts(prefix, artifacts) {
  for (const executable of artifacts) {
    console.log(`${prefix}${path.relative(repoRoot, executable)}`);
  }
}

if (argument === "--cleanup-stale") {
  const staleExecutables = allBackendExecutables();
  for (const executable of staleExecutables) {
    fs.rmSync(executable, { force: true });
  }
  printArtifacts("verify-go-build: removed stale artifact ", staleExecutables);
  console.log(`verify-go-build: CLEAN artifacts=${staleExecutables.length}`);
  process.exit(0);
}

if (argument === "--assert-clean") {
  const leakedExecutables = allBackendExecutables();
  if (leakedExecutables.length > 0) {
    printArtifacts("verify-go-build: repository artifact leaked: ", leakedExecutables);
    process.exit(1);
  }
  console.log("verify-go-build: CLEAN artifacts=0");
  process.exit(0);
}

if (!argument) {
  console.error("verify-go-build: backend directory argument or cleanup mode is required");
  process.exit(2);
}

const backendDir = path.resolve(process.cwd(), argument);
if (backendDir !== repoRoot && !backendDir.startsWith(repoPrefix)) {
  console.error(`verify-go-build: backend path escapes repository root: ${backendDir}`);
  process.exit(2);
}

const goModPath = path.join(backendDir, "go.mod");
if (!fs.existsSync(goModPath)) {
  console.error(`verify-go-build: missing go.mod in ${backendDir}`);
  process.exit(2);
}

const staleExecutables = findExecutables(backendDir);
for (const executable of staleExecutables) {
  fs.rmSync(executable, { force: true });
}
printArtifacts("verify-go-build: removed stale artifact ", staleExecutables);

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "bthwani-go-build-"));
const outputDir = path.join(tempRoot, "bin");
fs.mkdirSync(outputDir, { recursive: true });

let status = 1;
try {
  const result = spawnSync("go", ["build", "-o", outputDir, "./..."], {
    cwd: backendDir,
    env: process.env,
    shell: false,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  const rawText = [result.stdout, result.stderr].filter(Boolean).join("\n");
  writeToolEvidence({
    toolId: "go-build-" + path.basename(path.dirname(backendDir)),
    status: result.error || result.status !== 0 ? "FAIL" : "PASS",
    exitCode: result.error ? 1 : result.status,
    rawText,
    rawPath: goModPath,
    claim: "Go backend build evidence",
    scope: path.relative(repoRoot, backendDir),
  });
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);

  if (result.error) {
    console.error(`verify-go-build: failed to start Go compiler: ${result.error.message}`);
    status = 1;
  } else {
    status = result.status ?? 1;
  }
} finally {
  fs.rmSync(tempRoot, { recursive: true, force: true });
}

const leakedExecutables = findExecutables(backendDir);
if (leakedExecutables.length > 0) {
  printArtifacts("verify-go-build: repository artifact leaked: ", leakedExecutables);
  process.exit(1);
}

if (status !== 0) {
  process.exit(status);
}

console.log(`verify-go-build: PASS backend=${path.relative(repoRoot, backendDir)}`);
