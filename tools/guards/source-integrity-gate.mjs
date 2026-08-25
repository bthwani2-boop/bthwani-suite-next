import { execFileSync, spawnSync } from "node:child_process";

const TEXT_PATHS = [
  "*.cjs", "*.css", "*.go", "*.html", "*.js", "*.json", "*.jsx", "*.mjs",
  "*.ps1", "*.scss", "*.sh", "*.sql", "*.toml", "*.ts", "*.tsx", "*.yaml", "*.yml",
];
const CONFLICT_MARKER_PATTERN = "^(<<<<<<<|>>>>>>>)([[:space:]]|$)";

function runGit(args, options = {}) {
  return execFileSync("git", args, {
    cwd: options.cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function repositoryRoot() {
  try {
    return runGit(["rev-parse", "--show-toplevel"]).trim();
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(`Unable to resolve the Git repository root: ${detail}`);
  }
}

function assertIndexHasNoUnmergedEntries(root) {
  const unmerged = runGit(["ls-files", "-u"], { cwd: root }).trim();
  if (!unmerged) return;

  const paths = [...new Set(
    unmerged
      .split(/\r?\n/u)
      .map((line) => line.split("\t", 2)[1])
      .filter(Boolean),
  )];

  throw new Error(
    [
      "Git index contains unresolved merge entries.",
      ...paths.map((path) => `- ${path}`),
      "Resolve the merge before starting or verifying any BThwani runtime.",
    ].join("\n"),
  );
}

function assertTrackedSourcesHaveNoConflictMarkers(root) {
  // Git owns the tracked-file inventory and scans it natively in one process.
  // This preserves the original repository-wide invariant without stat/readFile
  // loops over every source file on every application startup.
  const result = spawnSync(
    "git",
    ["grep", "--no-color", "-n", "-I", "-E", CONFLICT_MARKER_PATTERN, "--", ...TEXT_PATHS],
    {
      cwd: root,
      encoding: "utf8",
      windowsHide: true,
      maxBuffer: 16 * 1024 * 1024,
    },
  );

  if (result.error) {
    throw new Error(`Unable to scan tracked source for conflict markers: ${result.error.message}`);
  }
  if (result.status === 1) return; // git grep: no matches
  if (result.status !== 0) {
    const detail = String(result.stderr || "").trim() || `exit ${String(result.status)}`;
    throw new Error(`Unable to scan tracked source for conflict markers: ${detail}`);
  }

  const findings = String(result.stdout || "").split(/\r?\n/u).map((line) => line.trim()).filter(Boolean);
  if (!findings.length) return;

  throw new Error(
    [
      "Tracked source contains unresolved Git conflict markers.",
      ...findings.map((finding) => `- ${finding}`),
      "Refusing to start or verify against ambiguous source. Resolve or restore the affected files first.",
    ].join("\n"),
  );
}

try {
  const root = repositoryRoot();
  assertIndexHasNoUnmergedEntries(root);
  assertTrackedSourcesHaveNoConflictMarkers(root);
  console.log("source-integrity: PASS");
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`source-integrity: FAIL\n${message}`);
  process.exitCode = 1;
}
