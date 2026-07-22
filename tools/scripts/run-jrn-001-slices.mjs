import fs from "node:fs";
import { spawnSync } from "node:child_process";

const registryPath = "services/dsh/contracts/jrn-001-slice-verification-registry.json";
const registry = JSON.parse(fs.readFileSync(registryPath, "utf8"));
const repository = process.env.GITHUB_REPOSITORY;
const commitSha = process.env.GITHUB_SHA;
const token = process.env.GH_TOKEN ?? process.env.GITHUB_TOKEN;
const targetUrl = process.env.TARGET_URL ?? "";
const resultsPath = process.env.JRN001_RESULTS_PATH ?? "/tmp/jrn-001-slice-results.json";
const summaryPath = process.env.GITHUB_STEP_SUMMARY;

if (!repository || !commitSha || !token) {
  throw new Error("GITHUB_REPOSITORY, GITHUB_SHA and GH_TOKEN are required");
}

async function publishStatus({ state, context, description }) {
  const response = await fetch(`https://api.github.com/repos/${repository}/statuses/${commitSha}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      state,
      context: context.slice(0, 100),
      description: description.slice(0, 140),
      target_url: targetUrl,
    }),
  });
  if (!response.ok) {
    throw new Error(`STATUS_PUBLISH_FAILED ${context} ${response.status} ${await response.text()}`);
  }
}

function execute(command) {
  console.log(`\n$ ${command}`);
  const startedAt = Date.now();
  const result = spawnSync(command, {
    shell: "/bin/bash",
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
    env: process.env,
  });
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  const output = `${result.stdout ?? ""}\n${result.stderr ?? ""}`.trim();
  return {
    command,
    exitCode: typeof result.status === "number" ? result.status : 1,
    signal: result.signal ?? null,
    durationMs: Date.now() - startedAt,
    error: result.error?.message ?? null,
    output,
  };
}

function failureDetail(commandResult) {
  const lines = commandResult.output.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const line = lines.find((candidate) => /[A-Z][A-Z0-9_]{5,}|AssertionError|ERR_|error TS[0-9]+|not ok|FAIL/i.test(candidate))
    ?? lines.at(-1)
    ?? commandResult.error
    ?? "command-failed";
  const code = line.match(/[A-Z][A-Z0-9_]{5,}/)?.[0]
    ?? line.match(/TS[0-9]+/)?.[0]
    ?? "COMMAND_FAILED";
  return {
    line: line.replace(/\s+/g, " ").slice(0, 120),
    token: code.replace(/[^A-Za-z0-9_-]/g, "-").slice(0, 48),
  };
}

const results = [];
for (const slice of registry.slices) {
  console.log(`\n========== ${slice.id} — ${slice.name} ==========`);
  const commandResults = [];
  let failedCommand = null;
  let failedCommandIndex = null;
  for (let commandIndex = 0; commandIndex < slice.commands.length; commandIndex += 1) {
    const command = slice.commands[commandIndex];
    const commandResult = execute(command);
    commandResults.push(commandResult);
    if (commandResult.exitCode !== 0) {
      failedCommand = commandResult;
      failedCommandIndex = commandIndex + 1;
      break;
    }
  }

  const passed = failedCommand === null;
  const detail = passed ? null : failureDetail(failedCommand);
  const result = {
    id: slice.id,
    name: slice.name,
    context: slice.context,
    state: passed ? "success" : "failure",
    failedCommandIndex,
    failureDetail: detail,
    commands: commandResults,
    evidence: slice.evidence,
  };
  results.push(result);

  if (!passed) {
    await publishStatus({
      state: "failure",
      context: `${slice.context}/cmd-${String(failedCommandIndex).padStart(2, "0")}/${detail.token}`,
      description: `${slice.id} command ${failedCommandIndex}: ${detail.line}`,
    });
  }

  const description = passed
    ? `${slice.id} ${slice.name} passed on final-head verification`
    : `${slice.id} failed at command ${failedCommandIndex}: ${detail.token}`;
  await publishStatus({ state: result.state, context: slice.context, description });
  console.log(`${slice.id}: ${passed ? "PASS" : `FAIL command ${failedCommandIndex} ${detail.token}`}`);
}

const failedSlices = results.filter((result) => result.state !== "success");
const aggregateState = failedSlices.length === 0 ? "success" : "failure";
await publishStatus({
  state: aggregateState,
  context: registry.aggregateContext,
  description: failedSlices.length === 0
    ? "FS-01 through FS-18 passed sequentially on one commit"
    : `Failed slices: ${failedSlices.map((slice) => `${slice.id}/cmd-${slice.failedCommandIndex}/${slice.failureDetail.token}`).join(", ")}`,
});

const output = {
  schemaVersion: 1,
  journeyId: registry.journeyId,
  commitSha,
  repository,
  aggregateState,
  passedSlices: results.filter((result) => result.state === "success").map((result) => result.id),
  failedSlices: failedSlices.map((result) => result.id),
  results,
};
fs.writeFileSync(resultsPath, `${JSON.stringify(output, null, 2)}\n`);

if (summaryPath) {
  const lines = [
    "## JRN-001 sequential slice verification",
    "",
    `Commit: \`${commitSha}\``,
    "",
    "| Slice | Result | Failed command | Detail |",
    "|---|---|---|---|",
    ...results.map((result) => `| ${result.id} | ${result.state === "success" ? "PASS" : "FAIL"} | ${result.failedCommandIndex ?? "—"} | ${result.failureDetail?.token ?? "—"} |`),
    "",
    `Aggregate: **${aggregateState === "success" ? "PASS" : "FAIL"}**`,
  ];
  fs.appendFileSync(summaryPath, `${lines.join("\n")}\n`);
}

if (failedSlices.length > 0) process.exit(1);
