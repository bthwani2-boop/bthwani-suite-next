import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, fileURLToPath } from "node:path";
import { join } from "node:path";
import test from "node:test";

const guardPath = join(dirname(fileURLToPath(import.meta.url)), "source-integrity-gate.mjs");

function git(cwd, args, input) {
  return execFileSync("git", args, {
    cwd,
    encoding: "utf8",
    input,
    stdio: [input === undefined ? "ignore" : "pipe", "pipe", "pipe"],
  }).trim();
}

function createRepository() {
  const root = mkdtempSync(join(tmpdir(), "bthwani-source-integrity-"));
  git(root, ["init", "-q"]);
  git(root, ["config", "user.email", "source-integrity@example.invalid"]);
  git(root, ["config", "user.name", "BThwani Source Integrity Test"]);
  mkdirSync(join(root, "src"), { recursive: true });
  writeFileSync(join(root, "src", "app.ts"), "export const value = 1;\n", "utf8");
  git(root, ["add", "src/app.ts"]);
  git(root, ["commit", "-qm", "seed"]);
  return root;
}

function runGuard(cwd) {
  return spawnSync(process.execPath, [guardPath], {
    cwd,
    encoding: "utf8",
  });
}

test("passes for a clean tracked source tree", () => {
  const root = createRepository();
  try {
    const result = runGuard(root);
    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
    assert.match(result.stdout, /source-integrity: PASS/u);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("fails when tracked source contains conflict markers", () => {
  const root = createRepository();
  try {
    writeFileSync(
      join(root, "src", "app.ts"),
      "<<<<<<< HEAD\nexport const value = 1;\n=======\nexport const value = 2;\n>>>>>>> incoming\n",
      "utf8",
    );
    const result = runGuard(root);
    assert.equal(result.status, 1, `${result.stdout}\n${result.stderr}`);
    assert.match(result.stderr, /Tracked source contains unresolved Git conflict markers/u);
    assert.match(result.stderr, /src\/app\.ts:1/u);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("fails when the Git index contains unmerged entries even without worktree markers", () => {
  const root = createRepository();
  try {
    const base = git(root, ["rev-parse", "HEAD:src/app.ts"]);
    writeFileSync(join(root, "ours.ts"), "export const value = 2;\n", "utf8");
    writeFileSync(join(root, "theirs.ts"), "export const value = 3;\n", "utf8");
    const ours = git(root, ["hash-object", "-w", "ours.ts"]);
    const theirs = git(root, ["hash-object", "-w", "theirs.ts"]);
    git(root, ["rm", "--cached", "-q", "src/app.ts"]);
    git(
      root,
      ["update-index", "--index-info"],
      [
        `100644 ${base} 1\tsrc/app.ts`,
        `100644 ${ours} 2\tsrc/app.ts`,
        `100644 ${theirs} 3\tsrc/app.ts`,
        "",
      ].join("\n"),
    );

    const result = runGuard(root);
    assert.equal(result.status, 1, `${result.stdout}\n${result.stderr}`);
    assert.match(result.stderr, /Git index contains unresolved merge entries/u);
    assert.match(result.stderr, /src\/app\.ts/u);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
