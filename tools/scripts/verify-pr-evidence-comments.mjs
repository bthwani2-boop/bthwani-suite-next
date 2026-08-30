import { execFileSync } from "node:child_process";

const [kind, prNumber, candidateSha, expectedContextSha = "", expectedArtifactIdentity = "", expectedPackageIntegrity = "", expectedToolVersion = ""] = process.argv.slice(2);

const fail = (message) => {
  process.stderr.write(`evidence-comment: ${message}\n`);
  process.exit(1);
};

const gh = (args) => execFileSync("gh", args, {
  encoding: "utf8",
  stdio: ["ignore", "pipe", "pipe"],
  env: { ...process.env, GH_FORCE_TTY: "0", NO_COLOR: "1" },
});

if (!/^[1-9][0-9]*$/u.test(prNumber ?? "")) fail("positive PR number required");
if (!/^[0-9a-f]{40}$/iu.test(candidateSha ?? "")) fail("exact candidate SHA required");
if (!["semantic", "rendered", "mobile"].includes(kind)) fail("kind must be semantic, rendered, or mobile");

const repository = process.env.GITHUB_REPOSITORY;
if (!repository) fail("GITHUB_REPOSITORY is required");

const pr = JSON.parse(gh(["api", `/repos/${repository}/pulls/${prNumber}`]));
if (pr.state !== "open") fail("PR is not open");
if (pr.head?.sha !== candidateSha) fail("PR head moved");

const comments = JSON.parse(gh(["api", "--paginate", `/repos/${repository}/issues/${prNumber}/comments?per_page=100`]));
const markers = {
  semantic: "BTHWANI_SEMANTIC_REVIEW:v1",
  rendered: "BTHWANI_RENDERED_WEB_EVIDENCE:v1",
  mobile: "BTHWANI_MOBILE_EVIDENCE:v1",
};
const marker = markers[kind];
const matching = comments.filter((c) => String(c.body ?? "").startsWith(`${marker}\n`));
if (matching.length !== 1) fail(`${marker} requires exactly one live attestation, found ${matching.length}`);

const comment = matching[0];
if (comment.user?.login === pr.user?.login) fail("candidate author cannot self-attest this evidence");
if (!["OWNER", "MEMBER", "COLLABORATOR"].includes(String(comment.author_association ?? ""))) {
  fail(`comment author is not an authorized repository association: ${comment.author_association}`);
}

const lines = String(comment.body).split(/\r?\n/u);
if (lines.length !== 2 || lines[0] !== marker) fail("attestation must be exactly marker + one canonical JSON line");

let payload;
try {
  payload = JSON.parse(lines[1]);
} catch {
  fail("attestation JSON is malformed");
}

if (payload.candidateSha !== candidateSha) fail("attestation is stale or cross-SHA");
if (payload.verdict !== "PASS") fail("attestation verdict is not PASS");

if (kind === "semantic") {
  if (payload.schema !== "BTHWANI_SEMANTIC_REVIEW" || payload.version !== 1) fail("semantic schema/version mismatch");
  if (payload.reviewIdentity?.kind !== "external-authorized-host-agent") fail("semantic reviewer identity kind mismatch");

  for (const [name, value] of [
    ["expected context SHA-256", expectedContextSha],
    ["expected artifact identity", expectedArtifactIdentity],
    ["expected package integrity", expectedPackageIntegrity],
    ["expected tool version", expectedToolVersion],
  ]) {
    if (!String(value ?? "").trim()) fail(`${name} was not supplied by trusted OCR context`);
  }

  const p = payload.reviewProvenance ?? {};
  if (p.contextSha256 !== expectedContextSha) fail("semantic context SHA-256 does not match trusted OCR context");
  if (p.artifactIdentity !== expectedArtifactIdentity) fail("semantic artifact identity does not match trusted OCR context");
  if (p.packageIntegrity !== expectedPackageIntegrity) fail("semantic package integrity does not match trusted OCR context");
  if (p.toolVersion !== expectedToolVersion) fail("semantic tool version does not match trusted OCR context");
}

if (kind === "rendered") {
  if (payload.schema !== "BTHWANI_RENDERED_WEB_EVIDENCE" || payload.version !== 1) fail("rendered schema/version mismatch");
  if (payload.surface !== "control-panel") fail("rendered surface must be control-panel");
  if (!String(payload.runner ?? "").trim()) fail("rendered runner identity required");
  if (!Array.isArray(payload.scenarios) || payload.scenarios.length === 0 || payload.scenarios.some((s) => !String(s).trim())) {
    fail("rendered evidence requires non-empty material scenarios");
  }
  if (!String(payload.evidenceIdentity ?? "").trim()) fail("rendered evidence identity required");
  if (payload.accessibilityVerdict !== "PASS") fail("rendered accessibility verdict must be PASS");
  if (payload.rtlVerdict !== "PASS") fail("rendered RTL verdict must be PASS");
}

if (kind === "mobile") {
  if (payload.schema !== "BTHWANI_MOBILE_EVIDENCE" || payload.version !== 1) fail("mobile schema/version mismatch");
  if (!["android", "ios"].includes(payload.platform)) fail("mobile platform mismatch");
  if (!String(payload.runner ?? "").trim()) fail("mobile runner identity required");
  if (!Array.isArray(payload.scenarios) || payload.scenarios.length === 0 || payload.scenarios.some((s) => !String(s).trim())) {
    fail("mobile evidence requires non-empty scenarios");
  }
  if (!String(payload.evidenceIdentity ?? "").trim()) fail("mobile evidence identity required");
}

process.stdout.write(`${kind} evidence PASS for ${candidateSha}\n`);
