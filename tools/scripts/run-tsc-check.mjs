import { spawnSync } from "node:child_process";

function argument(name, fallback = "") {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] ?? fallback : fallback;
}

function statusDescription(value) {
  return value
    .replace(/\u001b\[[0-9;]*m/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 140);
}

async function publishStatus(state, description) {
  const token = process.env.BTHWANI_STATUS_TOKEN;
  const repository = process.env.GITHUB_REPOSITORY;
  const sha = process.env.GITHUB_SHA;
  if (!token || !repository || !sha) return;

  const apiUrl = process.env.GITHUB_API_URL || "https://api.github.com";
  const runUrl = process.env.GITHUB_RUN_ID
    ? `${process.env.GITHUB_SERVER_URL || "https://github.com"}/${repository}/actions/runs/${process.env.GITHUB_RUN_ID}`
    : undefined;
  const response = await fetch(`${apiUrl}/repos/${repository}/statuses/${sha}`, {
    method: "POST",
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      state,
      context: `bthwani/typecheck/${label}`,
      description: statusDescription(description),
      ...(runUrl ? { target_url: runUrl } : {}),
    }),
  });
  if (!response.ok) {
    console.error(`[typecheck:${label}] status publication failed: HTTP ${response.status}`);
  }
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
  const message = `launcher failed: ${result.error.message}`;
  console.error(`[typecheck:${label}] ${message}`);
  await publishStatus("error", message);
  process.exit(1);
}

if (result.status === 0) {
  console.log(`[typecheck:${label}] passed`);
  await publishStatus("success", `${label} TypeScript passed`);
  process.exit(0);
}

const lines = output.split("\n");
const errors = lines.filter((line) => /error TS\d+:/.test(line));
const selected = errors.length > 0 ? errors.slice(-120) : lines.slice(-120);
const firstError = errors[0] || selected[0] || `${label} TypeScript failed`;
console.error(`[typecheck:${label}] failed with exit ${result.status ?? 1}`);
for (const line of selected) console.error(line);
await publishStatus("failure", firstError);
process.exit(result.status ?? 1);
