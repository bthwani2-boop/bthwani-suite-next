import { execFileSync } from "node:child_process";
import { readFileSync, statSync } from "node:fs";
import { extname, resolve } from "node:path";

const TEXT_EXTENSIONS = new Set([
  ".cjs",
  ".css",
  ".go",
  ".html",
  ".js",
  ".json",
  ".jsx",
  ".mjs",
  ".ps1",
  ".scss",
  ".sh",
  ".sql",
  ".toml",
  ".ts",
  ".tsx",
  ".yaml",
  ".yml",
]);

function runGit(args, options = {}) {
  return execFileSync("git", args, {
    cwd: options.cwd,
    encoding: options.encoding ?? "utf8",
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

function trackedTextFiles(root) {
  const output = runGit(["ls-files", "-z"], { cwd: root, encoding: "buffer" });
  return output
    .toString("utf8")
    .split("\0")
    .filter(Boolean)
    .filter((path) => TEXT_EXTENSIONS.has(extname(path).toLowerCase()));
}

function conflictMarkers(content) {
  const findings = [];
  const lines = content.split(/\r?\n/u);
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (/^(?:<<<<<<<|>>>>>>>)(?:\s|$)/u.test(line)) {
      findings.push({ line: index + 1, text: line.trim() });
    }
  }
  return findings;
}

function assertTrackedSourcesHaveNoConflictMarkers(root) {
  const findings = [];

  for (const relativePath of trackedTextFiles(root)) {
    const absolutePath = resolve(root, relativePath);
    let size;
    try {
      size = statSync(absolutePath).size;
    } catch {
      continue;
    }
    if (size > 5 * 1024 * 1024) continue;

    let content;
    try {
      content = readFileSync(absolutePath, "utf8");
    } catch {
      continue;
    }

    for (const marker of conflictMarkers(content)) {
      findings.push(`${relativePath}:${marker.line}: ${marker.text}`);
    }
  }

  if (findings.length === 0) return;

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
