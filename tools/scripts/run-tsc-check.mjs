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

function diagnosticSubject(value) {
  const exportedMember = value.match(/has no exported member ['"]([^'"]+)['"]/)?.[1];
  if (exportedMember) return exportedMember;
  const missingModule = value.match(/Cannot find module ['"]([^'"]+)['"]/)?.[1];
  if (missingModule) return missingModule.split("/").filter(Boolean).slice(-1)[0];
  const missingName = value.match(/Cannot find name ['"]([^'"]+)['"]/)?.[1];
  if (missingName) return missingName;
  const missingProperty = value.match(/Property ['"]([^'"]+)['"] does not exist/)?.[1];
  if (missingProperty) return missingProperty;
  const expectedArgs = value.match(/Expected (\d+(?:-\d+)?) arguments?/)?.[1];
  return expectedArgs ? `args-${expectedArgs}` : "";
}

function diagnosticContext(value) {
  const normalized = value.replace(/\\/g, "/");
  const location = normalized.match(/([^\s()]+)\((\d+),(\d+)\): error (TS\d+):/);
  if (location) {
    const fileParts = location[1].split("/").filter(Boolean);
    const file = fileParts.slice(-2).join("/");
    const subject = diagnosticSubject(normalized).replace(/[^A-Za-z0-9_.-]/g, "-");
    const code = subject ? `${location[4]}-${subject}` : location[4];
    return `${code}@${file}:${location[2]}`.slice(0, 72);
  }
  const code = normalized.match(/error (TS\d+):/)?.[1];
  return code || "failed";
}

async function publishStatus(state, description, contextSuffix = "") {
  const token = process.env.BTHWANI_STATUS_TOKEN;
  const repository = process.env.GITHUB_REPOSITORY;
  const sha = process.env.GITHUB_SHA;
  if (!token || !repository || !sha) return;

  const apiUrl = process.env.GITHUB_API_URL || "https://api.github.com";
  const runUrl = process.env.GITHUB_RUN_ID
    ? `${process.env.GITHUB_SERVER_URL || "https://github.com"}/${repository}/actions/runs/${process.env.GITHUB_RUN_ID}`
    : undefined;
  const context = `bthwani/typecheck/${label}${contextSuffix ? `/${contextSuffix}` : ""}`.slice(0, 100);
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
  await publishStatus("error", message, "launcher");
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
const uniqueDiagnostics = [...new Map(errors.map((line) => [diagnosticContext(line), line])).entries()].slice(0, 8);
const firstError = errors[0] || selected[0] || `${label} TypeScript failed`;
console.error(`[typecheck:${label}] failed with exit ${result.status ?? 1}`);
for (const line of selected) console.error(line);
await publishStatus("failure", `${errors.length || selected.length} TypeScript diagnostics`, "failed");
for (const [context, line] of uniqueDiagnostics) {
  await publishStatus("failure", line, context);
}
if (uniqueDiagnostics.length === 0) {
  await publishStatus("failure", firstError, diagnosticContext(firstError));
}
process.exit(result.status ?? 1);
