import { execFileSync } from "node:child_process";

function run(command, args) {
  return execFileSync(command, args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env, GH_FORCE_TTY: "0", NO_COLOR: "1" },
  }).trim();
}

function fail(message) {
  process.stderr.write(`ci:close: ${message}\n`);
  process.exit(1);
}

function main() {
  if (process.argv.length !== 2) fail("this command takes no arguments");
  if (run("git", ["status", "--porcelain=v1"])) fail("working tree is not clean");

  const repository = run("gh", ["repo", "view", "--json", "nameWithOwner", "--jq", ".nameWithOwner"]);
  const branch = run("git", ["branch", "--show-current"]);
  if (branch !== "h") fail(`authorized branch is h only; got ${branch || "detached"}`);

  const headSha = run("git", ["rev-parse", "HEAD"]);
  const baseSha = run("git", ["rev-parse", `${headSha}^`]);
  const remoteLine = run("git", ["ls-remote", "origin", "refs/heads/h"]);
  const remoteSha = remoteLine.split(/\s+/u)[0] ?? "";
  if (remoteSha !== headSha) fail(`local h HEAD ${headSha} does not equal remote h ${remoteSha || "missing"}`);

  const dispatch = run("gh", [
    "workflow", "run", "final-closure.yml",
    "--repo", repository,
    "--ref", "h",
    "-f", `expected_head_sha=${headSha}`,
    "-f", `expected_base_sha=${baseSha}`,
  ]);

  process.stdout.write(JSON.stringify({
    repository,
    workflow: "final-closure.yml",
    workflowDefinitionRef: "h",
    branch: "h",
    headSha,
    baseSha,
    dispatch: dispatch || "accepted",
  }, null, 2) + "\n");
}

main();
