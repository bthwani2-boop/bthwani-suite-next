import { execFileSync } from "node:child_process";

const usage = `Usage: pnpm ci:request --affected|--full|--runtime|--journey <name>`;

function run(command, args) {
  return execFileSync(command, args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
}

function fail(message) {
  process.stderr.write(`ci:request: ${message}\n${usage}\n`);
  process.exit(1);
}

function parseArgs(argv) {
  if (argv.length === 0) fail("a verification mode is required");
  const modeArg = argv[0];
  const modes = new Map([
    ["--affected", { mode: "affected", runtimeProof: "false" }],
    ["--full", { mode: "full", runtimeProof: "false" }],
    ["--runtime", { mode: "affected", runtimeProof: "true" }],
  ]);
  if (modeArg === "--journey") {
    const journey = argv[1]?.trim();
    if (!journey) fail("--journey requires a capability name");
    return { mode: "affected", runtimeProof: "false", journey };
  }
  const parsed = modes.get(modeArg);
  if (!parsed || argv.length !== 1) fail("unsupported arguments");
  return parsed;
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const repository = run("gh", ["repo", "view", "--json", "nameWithOwner", "--jq", ".nameWithOwner"]);
  const defaultBranch = run("gh", ["repo", "view", "--json", "defaultBranchRef", "--jq", ".defaultBranchRef.name"]);
  const branch = run("git", ["branch", "--show-current"]) || run("git", ["symbolic-ref", "--short", "HEAD"]);
  const headSha = run("git", ["rev-parse", "HEAD"]);
  const prs = JSON.parse(run("gh", [
    "pr", "list", "--repo", repository, "--state", "open", "--head", branch,
    "--base", defaultBranch, "--json", "number,headRefOid,baseRefOid,isDraft,headRefName,baseRefName",
  ]) || "[]");
  if (prs.length > 1) fail(`multiple open PRs match ${branch} -> ${defaultBranch}`);

  const pr = prs[0];
  if (pr && pr.headRefOid !== headSha) fail(`local HEAD ${headSha} is not the current PR HEAD ${pr.headRefOid}`);
  if (pr?.isDraft && options.mode === "full") {
    process.stderr.write("ci:request: full verification is allowed during development, but final closure requires a non-draft PR.\n");
  }

  const fields = [
    "--ref", defaultBranch,
    "-f", `mode=${options.mode}`,
    "-f", `runtime_proof=${options.runtimeProof}`,
    "-f", `target_kind=${pr ? "pull_request" : "branch"}`,
    "-f", `expected_head_sha=${headSha}`,
  ];
  if (options.journey) fields.push("-f", `journey=${options.journey}`);
  if (pr) {
    fields.push("-f", `pr_number=${pr.number}`, "-f", `expected_base_sha=${pr.baseRefOid}`);
  }

  const output = run("gh", ["workflow", "run", "ci.yml", "--repo", repository, ...fields]);
  process.stdout.write(JSON.stringify({
    repository,
    workflow: "ci.yml",
    mode: options.mode,
    journey: options.journey ?? null,
    branch,
    headSha,
    prNumber: pr?.number ?? null,
    baseBranch: defaultBranch,
    baseSha: pr?.baseRefOid ?? null,
    dispatch: output || "accepted",
  }, null, 2) + "\n");
}

main();
