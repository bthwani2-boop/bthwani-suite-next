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

const pagedArray = (endpoint) => {
  const pages = JSON.parse(gh(["api", "--paginate", "--slurp", endpoint]));
  return Array.isArray(pages) ? pages.flat() : [];
};
const nonEmpty = (value) => String(value ?? "").trim();
const sha256 = (value) => /^[0-9a-f]{64}$/iu.test(nonEmpty(value));
const validInstant = (value) => Number.isFinite(Date.parse(nonEmpty(value)));

if (!/^[1-9][0-9]*$/u.test(prNumber ?? "")) fail("positive PR number required");
if (!/^[0-9a-f]{40}$/iu.test(candidateSha ?? "")) fail("exact candidate SHA required");
if (!["semantic", "rendered", "mobile"].includes(kind)) fail("kind must be semantic, rendered, or mobile");

const repository = process.env.GITHUB_REPOSITORY;
if (!repository) fail("GITHUB_REPOSITORY is required");

const pr = JSON.parse(gh(["api", `/repos/${repository}/pulls/${prNumber}`]));
if (pr.state !== "open") fail("PR is not open");
if (pr.head?.sha !== candidateSha) fail("PR head moved");

const comments = pagedArray(`/repos/${repository}/issues/${prNumber}/comments?per_page=100`);
const commits = pagedArray(`/repos/${repository}/pulls/${prNumber}/commits?per_page=100`);
const candidateAuthors = new Set(
  commits.flatMap((c) => [c.author?.login, c.committer?.login]).filter(Boolean).map((x) => String(x).toLowerCase())
);
if (pr.user?.login) candidateAuthors.add(String(pr.user.login).toLowerCase());

const markers = {
  semantic: "BTHWANI_SEMANTIC_REVIEW:v1",
  rendered: "BTHWANI_RENDERED_WEB_EVIDENCE:v1",
  mobile: "BTHWANI_MOBILE_EVIDENCE:v1",
};
const marker = markers[kind];
const matching = comments.filter((c) => String(c.body ?? "").startsWith(`${marker}\n`));
if (matching.length !== 1) fail(`${marker} requires exactly one live attestation, found ${matching.length}`);

const comment = matching[0];
const reviewerLogin = String(comment.user?.login ?? "").toLowerCase();
if (!reviewerLogin) fail("attestation author login missing");
if (candidateAuthors.has(reviewerLogin)) fail("candidate author cannot self-attest: candidate author/committer/PR creator cannot attest this evidence");
if (!["OWNER", "MEMBER", "COLLABORATOR"].includes(String(comment.author_association ?? ""))) {
  fail(`comment author is not an authorized repository association: ${comment.author_association}`);
}

const lines = String(comment.body).split(/\r?\n/u);
if (lines.length !== 2 || lines[0] !== marker) fail("attestation must be exactly marker + one canonical JSON line");

let payload;
try { payload = JSON.parse(lines[1]); }
catch { fail("attestation JSON is malformed"); }

if (payload.candidateSha !== candidateSha) fail("attestation is stale or cross-SHA");
if (payload.verdict !== "PASS") fail("attestation verdict is not PASS");
if (!validInstant(payload.capturedAt)) fail("capturedAt must be an ISO-compatible timestamp");
if (!sha256(payload.evidenceSha256)) fail("evidenceSha256 must be a 64-hex SHA-256 digest");

if (kind === "semantic") {
  if (payload.schema !== "BTHWANI_SEMANTIC_REVIEW" || payload.version !== 1) fail("semantic schema/version mismatch");
  if (payload.reviewIdentity?.kind !== "external-authorized-host-agent") fail("semantic reviewer identity kind mismatch");
  if (nonEmpty(payload.reviewIdentity?.login).toLowerCase() !== reviewerLogin) fail("semantic reviewIdentity.login must match comment author");

  for (const [name, value] of [
    ["expected context SHA-256", expectedContextSha],
    ["expected artifact identity", expectedArtifactIdentity],
    ["expected package integrity", expectedPackageIntegrity],
    ["expected tool version", expectedToolVersion],
  ]) if (!nonEmpty(value)) fail(`${name} was not supplied by trusted OCR context`);

  const provenance = payload.reviewProvenance ?? {};
  if (provenance.contextSha256 !== expectedContextSha) fail("semantic context SHA-256 does not match trusted OCR context");
  if (provenance.artifactIdentity !== expectedArtifactIdentity) fail("semantic artifact identity does not match trusted OCR context");
  if (provenance.packageIntegrity !== expectedPackageIntegrity) fail("semantic package integrity does not match trusted OCR context");
  if (provenance.toolVersion !== expectedToolVersion) fail("semantic tool version does not match trusted OCR context");
}

if (kind === "rendered") {
  if (payload.schema !== "BTHWANI_RENDERED_WEB_EVIDENCE" || payload.version !== 1) fail("rendered schema/version mismatch");
  if (payload.reviewIdentity?.kind !== "external-authorized-host-agent") fail("rendered reviewer identity kind mismatch");
  if (nonEmpty(payload.reviewIdentity?.login).toLowerCase() !== reviewerLogin) fail("rendered reviewIdentity.login must match comment author");
  if (payload.surface !== "control-panel") fail("rendered surface must be control-panel");
  if (!nonEmpty(payload.runner)) fail("rendered runner identity required");
  if (!Array.isArray(payload.scenarios) || payload.scenarios.length === 0 || payload.scenarios.some((x) => !nonEmpty(x))) fail("rendered evidence requires non-empty material scenarios");
  if (!nonEmpty(payload.evidenceIdentity)) fail("rendered evidence identity required");
  if (payload.accessibilityVerdict !== "PASS") fail("rendered accessibility verdict must be PASS");
  if (payload.rtlVerdict !== "PASS") fail("rendered RTL verdict must be PASS");
}

if (kind === "mobile") {
  if (payload.schema !== "BTHWANI_MOBILE_EVIDENCE" || payload.version !== 1) fail("mobile schema/version mismatch");
  if (payload.reviewIdentity?.kind !== "external-device-runner") fail("mobile reviewer identity kind mismatch");
  if (nonEmpty(payload.reviewIdentity?.login).toLowerCase() !== reviewerLogin) fail("mobile reviewIdentity.login must match comment author");
  if (!["android", "ios"].includes(payload.platform)) fail("mobile platform mismatch");
  if (!nonEmpty(payload.runner)) fail("mobile runner identity required");
  if (!nonEmpty(payload.device?.model) || !nonEmpty(payload.device?.osVersion) || !nonEmpty(payload.device?.appBuild)) fail("mobile device model/osVersion/appBuild are required");
  if (!Array.isArray(payload.scenarios) || payload.scenarios.length === 0 || payload.scenarios.some((x) => !nonEmpty(x))) fail("mobile evidence requires non-empty scenarios");
  if (!nonEmpty(payload.evidenceIdentity)) fail("mobile evidence identity required");
}

process.stdout.write(`${kind} evidence PASS for ${candidateSha} by independent reviewer ${reviewerLogin}\n`);
