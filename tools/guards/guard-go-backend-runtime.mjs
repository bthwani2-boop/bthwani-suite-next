import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fail, read, repoRoot } from "./_guard-utils.mjs";

const guardId = "go-backend-runtime";
const violations = [];

const requiredFiles = [
  "services/dsh/backend/go.mod",
  "services/dsh/backend/cmd/dsh-api/main.go",
  "services/dsh/backend/Dockerfile",
  "infra/docker/compose.runtime.yml",
];

for (const file of requiredFiles) {
  if (!fs.existsSync(path.join(repoRoot, file))) {
    violations.push({ file, message: "required Go runtime artifact is missing" });
  }
}

if (violations.length === 0) {
  const dockerfile = read("services/dsh/backend/Dockerfile");
  const compose = read("infra/docker/compose.runtime.yml");

  if (!/\bgo build\b/.test(dockerfile)) {
    violations.push({
      file: "services/dsh/backend/Dockerfile",
      message: "Dockerfile must build the DSH Go binary",
    });
  }
  if (!/CMD\s*\[\s*["']\/app\/dsh-api["']\s*\]/.test(dockerfile)) {
    violations.push({
      file: "services/dsh/backend/Dockerfile",
      message: "Dockerfile must run /app/dsh-api",
    });
  }
  if (!/dsh-api:[\s\S]*dockerfile:\s*services\/dsh\/backend\/Dockerfile/.test(compose)) {
    violations.push({
      file: "infra/docker/compose.runtime.yml",
      message: "dsh-api must build from the service Go Dockerfile",
    });
  }

  for (const packageFile of ["package.json", "services/dsh/package.json"]) {
    const packageJson = JSON.parse(read(packageFile));
    for (const [name, command] of Object.entries(packageJson.scripts ?? {})) {
      const script = String(command);
      if (
        /(backend|dsh-api)/i.test(`${name} ${script}`) &&
        /\b(node|tsx|ts-node|nodemon)\b/i.test(script)
      ) {
        violations.push({
          file: packageFile,
          message: `script '${name}' attempts to run the DSH backend with Node/TypeScript`,
        });
      }
    }
  }

  const backendDirectory = path.join(repoRoot, "services/dsh/backend");
  for (const args of [["test", "./..."], ["build", "./..."]]) {
    const result = spawnSync("go", args, {
      cwd: backendDirectory,
      encoding: "utf8",
      shell: process.platform === "win32",
      env: process.env,
    });
    if (result.status !== 0) {
      violations.push({
        file: "services/dsh/backend",
        message: `go ${args.join(" ")} failed: ${(result.stderr || result.stdout).trim()}`,
      });
    }
  }
}

fail(guardId, violations);
