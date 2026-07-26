import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { recordedChangedPaths } from "./recorded-changed-paths.mjs";

function makeRepoWithIterations(taskId, records) {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "recorded-changed-paths-"));
  const dir = path.join(repoRoot, "governance", "remediation", "iterations", taskId);
  fs.mkdirSync(dir, { recursive: true });
  records.forEach((record, index) => {
    fs.writeFileSync(path.join(dir, `0${index + 1}.json`), JSON.stringify(record));
  });
  return repoRoot;
}

test("returns an empty array when no iteration directory exists for the task", () => {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "recorded-changed-paths-"));
  assert.deepEqual(recordedChangedPaths(repoRoot, "GAP-9999"), []);
});

test("returns an empty array when taskId is missing", () => {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "recorded-changed-paths-"));
  assert.deepEqual(recordedChangedPaths(repoRoot, undefined), []);
});

test("unions and dedupes changedPaths across every iteration record, sorted", () => {
  const repoRoot = makeRepoWithIterations("GAP-0100", [
    { execution: { changedPaths: ["b/two.mjs", "a/one.mjs"] } },
    { execution: { changedPaths: ["a/one.mjs", "c/three.mjs"] } },
  ]);
  assert.deepEqual(recordedChangedPaths(repoRoot, "GAP-0100"), ["a/one.mjs", "b/two.mjs", "c/three.mjs"]);
});

test("ignores a malformed iteration file instead of throwing", () => {
  const repoRoot = makeRepoWithIterations("GAP-0101", [{ execution: { changedPaths: ["a/one.mjs"] } }]);
  fs.writeFileSync(
    path.join(repoRoot, "governance", "remediation", "iterations", "GAP-0101", "02.json"),
    "{ not valid json",
  );
  assert.deepEqual(recordedChangedPaths(repoRoot, "GAP-0101"), ["a/one.mjs"]);
});

test("treats a record with no execution.changedPaths as contributing nothing", () => {
  const repoRoot = makeRepoWithIterations("GAP-0102", [{ execution: {} }, { execution: { changedPaths: ["x.mjs"] } }]);
  assert.deepEqual(recordedChangedPaths(repoRoot, "GAP-0102"), ["x.mjs"]);
});
