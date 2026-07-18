import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, "../..");
const contractPath = resolve(repoRoot, "services/dsh/contracts/dsh.catalog.openapi.yaml");
const outputPath = resolve(repoRoot, "services/dsh/clients/generated/dsh-catalog-api.ts");
const checkMode = process.argv.includes("--check");
const generatedPath = checkMode ? `${outputPath}.check.tmp` : outputPath;

if (!existsSync(contractPath)) {
  console.error(`[dsh-catalog-client] contract not found: ${contractPath}`);
  process.exit(1);
}

mkdirSync(dirname(outputPath), { recursive: true });
const pnpmCommand = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const result = spawnSync(
  pnpmCommand,
  ["exec", "openapi-typescript", contractPath, "--output", generatedPath],
  { cwd: repoRoot, encoding: "utf8", stdio: "pipe" },
);

if (result.status !== 0) {
  if (checkMode) rmSync(generatedPath, { force: true });
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  process.exit(result.status ?? 1);
}

if (checkMode) {
  const committed = readFileSync(outputPath, "utf8").replaceAll("\r\n", "\n");
  const generated = readFileSync(generatedPath, "utf8").replaceAll("\r\n", "\n");
  rmSync(generatedPath, { force: true });
  if (committed !== generated) {
    console.error("[dsh-catalog-client] generated client is stale; run openapi:generate:dsh:catalog");
    process.exit(1);
  }
  console.log("[dsh-catalog-client] generated client matches the sovereign contract");
} else {
  console.log(`[dsh-catalog-client] generated ${outputPath}`);
}
