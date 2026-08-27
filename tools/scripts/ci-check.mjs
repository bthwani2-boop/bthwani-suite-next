import { execFileSync } from "node:child_process";

function run(command, args) {
  return execFileSync(command, args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
}

function fail(message) {
  process.stderr.write(`ci:check: ${message}\n`);
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
  if (prs.length > 1) fail(`multiple open PRs match ${branch} -> ${defaultBranch}`);

  const pr = prs[0];
  if (pr && pr.headRefOid !== headSha) fail(`local HEAD ${headSha} is not live PR HEAD ${pr.headRefOid}`);
  const args = ["workflow", "run", "ci-check.yml", "--repo", repository, "--ref", branch];
  if (pr) args.push("-f", `pr_number=${pr.number}`, "-f", `expected_head_sha=${headSha}`, "-f", `expected_base_sha=${pr.baseRefOid}`);
  const dispatch = run("gh", args);
  process.stdout.write(JSON.stringify({
    repository,
    workflow: "ci-check.yml",
    branch,
    headSha,
    prNumber: pr?.number ?? null,
    baseBranch: defaultBranch,
    baseSha: pr?.baseRefOid ?? null,
    dispatch: dispatch || "accepted",
  }, null, 2) + "\n");
}

main();
