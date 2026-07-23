import { spawnSync } from "node:child_process";

function argument(name, fallback = "") {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] ?? fallback : fallback;
}

function statusText(value, limit = 140) {
  const normalized = String(value ?? "")
    .replace(/\u001b\[[0-9;]*m/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return normalized.slice(0, limit) || "command failed";
}

async function publishStatus(state, description, suffix = "") {
  const token = process.env.BTHWANI_STATUS_TOKEN;
  const repository = process.env.GITHUB_REPOSITORY;
  const sha = process.env.GITHUB_SHA;
  if (!token || !repository || !sha) return;

  const apiUrl = process.env.GITHUB_API_URL || "https://api.github.com";
  const serverUrl = process.env.GITHUB_SERVER_URL || "https://github.com";
  const targetUrl = process.env.GITHUB_RUN_ID
    ? `${serverUrl}/${repository}/actions/runs/${process.env.GITHUB_RUN_ID}`
    : undefined;
  const cleanSuffix = statusText(suffix, 48).replace(/[^A-Za-z0-9_.-]/g, "-");
  const context = `bthwani/check/${label}${cleanSuffix ? `/${cleanSuffix}` : ""}`.slice(0, 100);

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
      context,
      description: statusText(description),
      ...(targetUrl ? { target_url: targetUrl } : {}),
    }),
  });
  if (!response.ok) {
    console.error(`[check:${label}] status publication failed: HTTP ${response.status}`);
  }
}

const label = argument("label", "command");
const separator = process.argv.indexOf("--");
if (separator < 0 || separator === process.argv.length - 1) {
  console.error("run-command-check: command arguments are required after --");
  process.exit(2);
}

const [rawCommand, ...commandArgs] = process.argv.slice(separator + 1);
const executable = rawCommand === "node" ? process.execPath : rawCommand;
const result = spawnSync(executable, commandArgs, {
  cwd: process.cwd(),
  encoding: "utf8",
  env: process.env,
  maxBuffer: 32 * 1024 * 1024,
  shell: process.platform === "win32" && rawCommand !== "node",
});
const output = `${result.stdout ?? ""}${result.stderr ?? ""}`.replace(/\r\n/g, "\n").trim();

if (result.error) {
  const message = `launcher failed: ${result.error.message}`;
  console.error(`[check:${label}] ${message}`);
  await publishStatus("error", message, "launcher");
  process.exit(1);
}

if (result.status === 0) {
  if (output) console.log(output);
  console.log(`[check:${label}] passed`);
  await publishStatus("success", `${label} passed`);
  process.exit(0);
}

const lines = output.split("\n").filter(Boolean);
const diagnostic = lines.find((line) => /FAIL:|not ok|AssertionError|Error:|error /i.test(line))
  ?? lines.at(-1)
  ?? `${label} failed`;
console.error(output || `[check:${label}] failed`);
await publishStatus("failure", diagnostic, statusText(diagnostic, 48));
process.exit(result.status ?? 1);
