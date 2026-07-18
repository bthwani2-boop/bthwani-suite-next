import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, "../..");
const contractPath = resolve(repoRoot, "services/dsh/contracts/dsh.catalog.openapi.yaml");
const outputPath = resolve(repoRoot, "services/dsh/clients/generated/dsh-catalog-api.ts");
const checkMode = process.argv.includes("--check");
const temporaryDirectory = checkMode
  ? mkdtempSync(join(tmpdir(), "bthwani-dsh-catalog-client-"))
  : null;
const generatedPath = checkMode
  ? join(temporaryDirectory, basename(outputPath))
  : outputPath;

try {
  if (!existsSync(contractPath)) {
    console.error(`[dsh-catalog-client] contract not found: ${contractPath}`);
    process.exitCode = 1;
  } else if (checkMode && !existsSync(outputPath)) {
    console.error(`[dsh-catalog-client] committed client not found: ${outputPath}`);
    process.exitCode = 1;
  } else {
    const pnpmCommand = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
    const result = spawnSync(
      pnpmCommand,
      ["exec", "openapi-typescript", contractPath, "--output", generatedPath],
      { cwd: repoRoot, encoding: "utf8", stdio: "pipe" },
    );

    if (result.status !== 0) {
      if (result.stdout) process.stdout.write(result.stdout);
      if (result.stderr) process.stderr.write(result.stderr);
      process.exitCode = result.status ?? 1;
    } else if (checkMode) {
      const committed = readFileSync(outputPath, "utf8").replaceAll("\r\n", "\n");
      const generated = readFileSync(generatedPath, "utf8").replaceAll("\r\n", "\n");
      if (committed !== generated) {
        console.error(
          "[dsh-catalog-client] generated client is stale; run pnpm run openapi:generate:dsh-catalog",
        );
        process.exitCode = 1;
      } else {
        console.log("[dsh-catalog-client] generated client matches the sovereign contract");
      }
    } else {
      console.log(`[dsh-catalog-client] generated ${outputPath}`);
    }
  }
} finally {
  if (temporaryDirectory) rmSync(temporaryDirectory, { recursive: true, force: true });
}
