import { spawnSync } from "node:child_process";

function argument(name, fallback = "") {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] ?? fallback : fallback;
}

const project = argument("project");
const label = argument("label", project || "typescript");
if (!project) {
  console.error("run-tsc-check: --project is required");
  process.exit(2);
}

const result = spawnSync(
  "pnpm",
  ["exec", "tsc", "--noEmit", "-p", project, "--pretty", "false"],
  {
    cwd: process.cwd(),
    encoding: "utf8",
    env: process.env,
    maxBuffer: 32 * 1024 * 1024,
    shell: process.platform === "win32",
  },
);

const output = `${result.stdout ?? ""}${result.stderr ?? ""}`.replace(/\r\n/g, "\n").trim();
if (result.error) {
  console.error(`[typecheck:${label}] launcher failed: ${result.error.message}`);
  process.exit(1);
}

if (result.status === 0) {
  console.log(`[typecheck:${label}] passed`);
  process.exit(0);
}

const lines = output.split("\n");
const errors = lines.filter((line) => /error TS\d+:/.test(line));
const selected = errors.length > 0 ? errors.slice(-120) : lines.slice(-120);
console.error(`[typecheck:${label}] failed with exit ${result.status ?? 1}`);
for (const line of selected) console.error(line);
process.exit(result.status ?? 1);
