import { execFileSync } from "node:child_process";

function run(command, args) {
  return execFileSync(command, args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env, GH_FORCE_TTY: "0", NO_COLOR: "1" },
  }).trim();
}

function tryRun(command, args) {
  try {
    return run(command, args);
  } catch {
    return "";
  }
}

function fail(message) {
  process.stderr.write(`ci:check: ${message}\n`);
  process.exit(1);
}

function requireCleanWorktree() {
  const status = run("git", ["status", "--porcelain=v1"]);
  if (status) fail("working tree is not clean; commit or discard local changes before dispatch");
}

function isAncestor(baseSha, headSha) {
  try {
    execFileSync("git", ["merge-base", "--is-ancestor", baseSha, headSha], {
      stdio: "ignore",
      env: process.env,
    });
    return true;
  } catch {
    return false;
  }
}

function hasSuccessfulCiStatus(repository, sha, context) {
  const raw = tryRun("gh", [
    "api",
    "-H", "X-GitHub-Api-Version: 2022-11-28",
    `/repos/${repository}/commits/${sha}/status`,
  ]);
  if (!raw) return false;
  try {
    const payload = JSON.parse(raw);
    return Array.isArray(payload.statuses)
      && payload.statuses.some((status) => status?.context === context && status?.state === "success");
  } catch {
    return false;
  }
}

function trustedWorkflowSupportsVerificationBase(repository, defaultBranch) {
  const raw = tryRun("gh", [
    "api",
    "-H", "X-GitHub-Api-Version: 2022-11-28",
    `/repos/${repository}/contents/.github/workflows/ci-check.yml?ref=${encodeURIComponent(defaultBranch)}`,
  ]);
  if (!raw) return false;
  try {
    const payload = JSON.parse(raw);
    const source = Buffer.from(String(payload.content ?? "").replace(/\s/gu, ""), "base64").toString("utf8");
    return /(^|\n)\s*verify_from_sha:\s*/u.test(source);
  } catch {
    return false;
  }
}

function resolveVerificationBase({ repository, pr, headSha }) {
  const parentSha = tryRun("git", ["rev-parse", `${headSha}^`]);
  if (!/^[0-9a-f]{40}$/iu.test(parentSha)) return null;

  const closureBase = pr?.baseRefOid ?? null;
  if (closureBase && (!isAncestor(closureBase, parentSha) || !isAncestor(parentSha, headSha))) {
    return null;
  }

  const statusContext = pr ? "BThwani CI / PR result" : "BThwani CI / check result";
  return hasSuccessfulCiStatus(repository, parentSha, statusContext) ? parentSha : null;
}

function main() {
  if (process.argv.length !== 2) fail("this command takes no arguments");
  requireCleanWorktree();
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

  const evidenceBaseSha = resolveVerificationBase({ repository, pr, headSha });
  const incrementalSupported = trustedWorkflowSupportsVerificationBase(repository, defaultBranch);
  const verifyFromSha = incrementalSupported ? evidenceBaseSha : null;

  // CI is an assurance authority, not candidate-owned product code. Run the
  // protected default-branch workflow definition and pass the development
  // candidate as immutable input. When the immediately preceding candidate has
  // exact successful CI evidence, it becomes the incremental verification base.
  // Otherwise the workflow falls back to the closure base and stays fail-safe.
  const args = ["workflow", "run", "ci-check.yml", "--repo", repository, "--ref", defaultBranch,
    "-f", `expected_head_sha=${headSha}`];
  if (pr) args.push("-f", `pr_number=${pr.number}`, "-f", `expected_base_sha=${pr.baseRefOid}`);
  if (verifyFromSha) args.push("-f", `verify_from_sha=${verifyFromSha}`);

  const dispatch = run("gh", args);
  process.stdout.write(JSON.stringify({
    repository,
    workflow: "ci-check.yml",
    workflowDefinitionRef: defaultBranch,
    branch,
    headSha,
    prNumber: pr?.number ?? null,
    baseBranch: defaultBranch,
    baseSha: pr?.baseRefOid ?? null,
    verifyFromSha,
    verificationMode: verifyFromSha
      ? "incremental-evidence-invalidation"
      : evidenceBaseSha && !incrementalSupported
        ? "conservative-until-trusted-promotion"
        : "conservative-closure-base",
    dispatch: dispatch || "accepted",
  }, null, 2) + "\n");
}

main();
