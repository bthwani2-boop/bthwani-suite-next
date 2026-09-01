import assert from "node:assert/strict";
import {execFileSync} from "node:child_process";
import path from "node:path";
import {fileURLToPath} from "node:url";
import test from "node:test";

import {resolveCandidateFromEnvironment} from "./capture-tool-evidence.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const actualHead = execFileSync("git", ["rev-parse", "--verify", "HEAD"], {
  cwd: root,
  encoding: "utf8",
  windowsHide: true,
}).trim().toLowerCase();
const wrongHead = actualHead === "f".repeat(40) ? "e".repeat(40) : "f".repeat(40);

test("tool evidence ignores trusted-workflow GITHUB_SHA as candidate source identity", () => {
  const candidate = resolveCandidateFromEnvironment({GITHUB_SHA: wrongHead});
  assert.deepEqual(candidate, {headSha: actualHead, baseSha: "", identity: actualHead});
});

test("explicit candidate SHA is an assertion against the checked-out HEAD", () => {
  const candidate = resolveCandidateFromEnvironment({CANDIDATE_SHA: actualHead, GITHUB_SHA: wrongHead});
  assert.equal(candidate.headSha, actualHead);
  assert.throws(
    () => resolveCandidateFromEnvironment({CANDIDATE_SHA: wrongHead, GITHUB_SHA: actualHead}),
    /candidate provenance mismatch/u,
  );
});

test("conflicting HEAD_SHA cannot create a parallel candidate truth", () => {
  assert.throws(
    () => resolveCandidateFromEnvironment({CANDIDATE_SHA: actualHead, HEAD_SHA: wrongHead}),
    /candidate provenance mismatch/u,
  );
});
