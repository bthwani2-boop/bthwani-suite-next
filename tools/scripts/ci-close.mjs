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
  const repository = run("gh", ["repo", "view", "--json", "nameWithOwner", "--jq", ".nameWithOwner"]);
  const defaultBranch = run("gh", ["repo", "view", "--json", "defaultBranchRef", "--jq", ".defaultBranchRef.name"]);
  const branch = run("git", ["branch", "--show-current"]);
  if (!branch) fail("detached HEAD is not an authorized candidate");
  const headSha = run("git", ["rev-parse", "HEAD"]);
  const prs = JSON.parse(run("gh", [
    "pr", "list", "--repo", repository, "--state", "open", "--head", branch,
    "--base", defaultBranch, "--json", "number,headRefOid,baseRefOid,isDraft,headRefName,baseRefName",
  ]) || "[]");
  if (prs.length !== 1) fail(`exactly one open PR is required for final closure; found ${prs.length}`);
  const pr = prs[0];
  if (pr.isDraft) fail("final closure requires a non-draft PR");
  if (pr.headRefOid !== headSha) fail(`local HEAD ${headSha} is not live PR HEAD ${pr.headRefOid}`);
  const dispatch = run("gh", [
    "workflow", "run", "final-closure.yml", "--repo", repository, "--ref", branch,
    "-f", `pr_number=${pr.number}`,
    "-f", `expected_head_sha=${headSha}`,
    "-f", `expected_base_sha=${pr.baseRefOid}`,
  ]);
  process.stdout.write(JSON.stringify({
    repository,
    workflow: "final-closure.yml",
    branch,
    headSha,
    prNumber: pr.number,
    baseBranch: defaultBranch,
    baseSha: pr.baseRefOid,
    dispatch: dispatch || "accepted",
  }, null, 2) + "\n");
}

main();
