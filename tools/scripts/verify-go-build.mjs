import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "../..");
const [backendArgument] = process.argv.slice(2);

if (!backendArgument) {
  console.error("verify-go-build: backend directory argument is required");
  process.exit(2);
}

const backendDir = path.resolve(process.cwd(), backendArgument);
const repoPrefix = `${repoRoot}${path.sep}`;
if (backendDir !== repoRoot && !backendDir.startsWith(repoPrefix)) {
  console.error(`verify-go-build: backend path escapes repository root: ${backendDir}`);
  process.exit(2);
}

const goModPath = path.join(backendDir, "go.mod");
if (!fs.existsSync(goModPath)) {
  console.error(`verify-go-build: missing go.mod in ${backendDir}`);
  process.exit(2);
}

function findExecutables(rootDir) {
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

for (const executable of findExecutables(backendDir)) {
  fs.rmSync(executable, { force: true });
  console.log(`verify-go-build: removed stale artifact ${path.relative(repoRoot, executable)}`);
}

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "bthwani-go-build-"));
const outputDir = path.join(tempRoot, "bin");
fs.mkdirSync(outputDir, { recursive: true });

let status = 1;
try {
  const result = spawnSync("go", ["build", "-o", outputDir, "./..."], {
    cwd: backendDir,
    env: process.env,
    shell: false,
    stdio: "inherit",
  });

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
  for (const executable of leakedExecutables) {
    console.error(`verify-go-build: repository artifact leaked: ${path.relative(repoRoot, executable)}`);
  }
  process.exit(1);
}

if (status !== 0) {
  process.exit(status);
}

console.log(`verify-go-build: PASS backend=${path.relative(repoRoot, backendDir)}`);
