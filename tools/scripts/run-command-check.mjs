import { spawnSync } from "node:child_process";

function argument(name, fallback = "") {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] ?? fallback : fallback;
}

function stripAnsi(value) {
  return String(value ?? "").replace(/\u001b\[[0-9;]*m/g, "");
}

function statusText(value, limit = 140) {
  const normalized = stripAnsi(value)
    .replace(/\s+/g, " ")
    .trim();
  return normalized.slice(0, limit) || "command failed";
}

function failureLocation(lines) {
  const failingTestsIndex = lines.findLastIndex((line) => /failing tests:/i.test(stripAnsi(line)));
  const candidates = failingTestsIndex >= 0 ? lines.slice(failingTestsIndex + 1) : lines;
  const locationLine = candidates.find((line) => /^\s*test at .+\.(?:test|spec)\.(?:mjs|cjs|js|ts|tsx):\d+:\d+\s*$/i.test(stripAnsi(line)));
  const match = stripAnsi(locationLine).match(/^\s*test at (.+\.(?:test|spec)\.(?:mjs|cjs|js|ts|tsx)):(\d+):\d+\s*$/i);
  if (!match) return "";
  const pathSegments = match[1].replaceAll("\\", "/").split("/");
  return `${pathSegments.slice(-2).join("/")}:${match[2]}`;
}

function warningDiagnostic(lines) {
  return lines.find((line) =>
    /MaxListenersExceededWarning|DeprecationWarning|ExperimentalWarning|Node \d+ is being deprecated/i.test(stripAnsi(line)),
  );
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
const childEnvironment = { ...process.env };
if (!/(?:^|\s)--trace-warnings(?:\s|$)/.test(childEnvironment.NODE_OPTIONS ?? "")) {
  childEnvironment.NODE_OPTIONS = `${childEnvironment.NODE_OPTIONS ?? ""} --trace-warnings`.trim();
}
const result = spawnSync(executable, commandArgs, {
  cwd: process.cwd(),
  encoding: "utf8",
  env: childEnvironment,
  maxBuffer: 32 * 1024 * 1024,
  shell: process.platform === "win32" && rawCommand !== "node",
});
const output = `${result.stdout ?? ""}${result.stderr ?? ""}`.replace(/\r\n/g, "\n").trim();
const lines = output.split("\n").filter(Boolean);

if (result.error) {
  const message = `launcher failed: ${result.error.message}`;
  console.error(`[check:${label}] ${message}`);
  await publishStatus("error", message, "launcher");
  process.exit(1);
}

const warning = warningDiagnostic(lines);
if (result.status === 0 && !warning) {
  if (output) console.log(output);
  console.log(`[check:${label}] passed`);
  await publishStatus("success", `${label} passed`);
  process.exit(0);
}

const failingTestsIndex = lines.findLastIndex((line) => /failing tests:/i.test(stripAnsi(line)));
const diagnosticLines = failingTestsIndex >= 0 ? lines.slice(failingTestsIndex + 1) : lines;
const diagnostic = warning
  ?? diagnosticLines.find((line) => /FAIL:|not ok|AssertionError|Error:|error /i.test(stripAnsi(line)))
  ?? lines.at(-1)
  ?? `${label} failed`;
const location = failureLocation(lines);
const conciseOutput = lines.slice(-160).join("\n");
console.error(conciseOutput || `[check:${label}] failed`);
const description = location ? `${location}: ${statusText(diagnostic, 100)}` : diagnostic;
await publishStatus("failure", description, location || statusText(diagnostic, 48));
process.exit(result.status && result.status !== 0 ? result.status : 1);
