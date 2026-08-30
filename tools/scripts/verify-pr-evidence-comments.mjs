import { execFileSync } from "node:child_process";

const [kind, prNumber, candidateSha, expectedPrimary = "", expectedSecondary = "", expectedTertiary = "", expectedQuaternary = ""] = process.argv.slice(2);

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
const exactSha = (value) => /^[0-9a-f]{40}$/iu.test(nonEmpty(value));
const validInstant = (value) => Number.isFinite(Date.parse(nonEmpty(value)));

if (!/^[1-9][0-9]*$/u.test(prNumber ?? "")) fail("positive PR number required");
if (!exactSha(candidateSha)) fail("exact candidate SHA required");
if (!["semantic", "rendered", "mobile", "bootstrap"].includes(kind)) fail("kind must be semantic, rendered, mobile, or bootstrap");

const repository = process.env.GITHUB_REPOSITORY;
if (!repository) fail("GITHUB_REPOSITORY is required");

const bootstrapMode = nonEmpty(process.env.BTHWANI_ASSURANCE_BOOTSTRAP_MODE).toLowerCase();
const soloMaintainerLogin = nonEmpty(process.env.BTHWANI_SOLO_MAINTAINER_LOGIN).toLowerCase();
const repositoryOwner = nonEmpty(repository.split("/")[0]).toLowerCase();
const soloOwnerBootstrap = kind === "bootstrap" && bootstrapMode === "solo-owner";

if (soloOwnerBootstrap) {
  if (!soloMaintainerLogin) fail("BTHWANI_SOLO_MAINTAINER_LOGIN is required in solo-owner bootstrap mode");
  if (soloMaintainerLogin !== repositoryOwner) fail("solo-owner bootstrap login must be the repository owner");
}

const pr = JSON.parse(gh(["api", `/repos/${repository}/pulls/${prNumber}`]));
if (pr.state !== "open") fail("PR is not open");
if (pr.head?.sha !== candidateSha) fail("PR head moved");

const comments = kind === "bootstrap" && !soloOwnerBootstrap
  ? []
  : pagedArray(`/repos/${repository}/issues/${prNumber}/comments?per_page=100`);
const reviews = kind === "bootstrap" && !soloOwnerBootstrap
  ? pagedArray(`/repos/${repository}/pulls/${prNumber}/reviews?per_page=100`)
  : [];
const commits = pagedArray(`/repos/${repository}/pulls/${prNumber}/commits?per_page=100`);
const candidateAuthors = new Set(
  commits.flatMap((c) => [c.author?.login, c.committer?.login]).filter(Boolean).map((x) => String(x).toLowerCase())
);
if (pr.user?.login) candidateAuthors.add(String(pr.user.login).toLowerCase());

const markers = {
  semantic: "BTHWANI_SEMANTIC_REVIEW:v1",
  rendered: "BTHWANI_RENDERED_WEB_EVIDENCE:v1",
  mobile: "BTHWANI_MOBILE_EVIDENCE:v1",
  bootstrap: "BTHWANI_ASSURANCE_BOOTSTRAP:v1",
};
const marker = markers[kind];
const attestations = kind === "bootstrap"
  ? (soloOwnerBootstrap ? comments : reviews)
  : comments;
const matching = attestations.filter((c) => String(c.body ?? "").startsWith(`${marker}\n`));
if (matching.length !== 1) fail(`${marker} requires exactly one live attestation, found ${matching.length}`);

const attestation = matching[0];
const reviewerLogin = String(attestation.user?.login ?? "").toLowerCase();
if (!reviewerLogin) fail("attestation author login missing");

if (soloOwnerBootstrap) {
  if (reviewerLogin !== soloMaintainerLogin) {
    fail(`solo-owner bootstrap attestation must be authored by ${soloMaintainerLogin}`);
  }
  if (String(attestation.author_association ?? "") !== "OWNER") {
    fail(`solo-owner bootstrap requires OWNER association, got ${attestation.author_association}`);
  }
} else {
  if (candidateAuthors.has(reviewerLogin)) {
    fail("candidate author cannot self-attest: candidate author/committer/PR creator cannot attest this evidence");
  }
  if (!["OWNER", "MEMBER", "COLLABORATOR"].includes(String(attestation.author_association ?? ""))) {
    fail(`attestation author is not an authorized repository association: ${attestation.author_association}`);
  }
}

if (kind === "bootstrap" && !soloOwnerBootstrap) {
  if (attestation.state !== "APPROVED") fail("bootstrap attestation must be an APPROVED PR review");
  if (attestation.commit_id !== candidateSha) fail("bootstrap approval must be bound to the exact candidate SHA");
}

const lines = String(attestation.body).split(/\r?\n/u);
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
    ["expected context SHA-256", expectedPrimary],
    ["expected artifact identity", expectedSecondary],
    ["expected package integrity", expectedTertiary],
    ["expected tool version", expectedQuaternary],
  ]) if (!nonEmpty(value)) fail(`${name} was not supplied by trusted OCR context`);

  const provenance = payload.reviewProvenance ?? {};
  if (provenance.contextSha256 !== expectedPrimary) fail("semantic context SHA-256 does not match trusted OCR context");
  if (provenance.artifactIdentity !== expectedSecondary) fail("semantic artifact identity does not match trusted OCR context");
  if (provenance.packageIntegrity !== expectedTertiary) fail("semantic package integrity does not match trusted OCR context");
  if (provenance.toolVersion !== expectedQuaternary) fail("semantic tool version does not match trusted OCR context");
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

if (kind === "bootstrap") {
  if (payload.schema !== "BTHWANI_ASSURANCE_BOOTSTRAP" || payload.version !== 1) fail("bootstrap schema/version mismatch");
  const expectedReviewerKind = soloOwnerBootstrap
    ? "solo-owner-maintainer"
    : "external-authorized-assurance-reviewer";
  if (payload.reviewIdentity?.kind !== expectedReviewerKind) fail("bootstrap reviewer identity kind mismatch");
  if (nonEmpty(payload.reviewIdentity?.login).toLowerCase() !== reviewerLogin) fail("bootstrap reviewIdentity.login must match attestation author");

  const expectedAuthorityDiffSha256 = nonEmpty(expectedPrimary).toLowerCase();
  const expectedTrustedSha = nonEmpty(expectedSecondary).toLowerCase();
  const expectedChangedCount = Number.parseInt(nonEmpty(expectedTertiary), 10);
  if (!sha256(expectedAuthorityDiffSha256)) fail("trusted authorityDiffSha256 was not supplied");
  if (!exactSha(expectedTrustedSha)) fail("trusted bootstrap base SHA was not supplied");
  if (!Number.isSafeInteger(expectedChangedCount) || expectedChangedCount < 1) fail("trusted protected changed-count must be a positive integer");

  const provenance = payload.authorityProvenance ?? {};
  if (nonEmpty(provenance.trustedSha).toLowerCase() !== expectedTrustedSha) fail("bootstrap trusted SHA does not match authority evidence");
  if (nonEmpty(provenance.authorityDiffSha256).toLowerCase() !== expectedAuthorityDiffSha256) fail("bootstrap authority diff SHA-256 does not match trusted evidence");
  if (Number(provenance.changedCount) !== expectedChangedCount) fail("bootstrap protected changed-count does not match trusted evidence");
  if (provenance.reviewScope !== "assurance-authority-only") fail("bootstrap reviewScope must be assurance-authority-only");
  if (soloOwnerBootstrap && provenance.reviewMode !== "solo-owner") fail("bootstrap reviewMode must be solo-owner");
  if (!soloOwnerBootstrap && provenance.reviewMode === "solo-owner") fail("solo-owner provenance is forbidden outside trusted solo-owner mode");
  if (nonEmpty(payload.evidenceSha256).toLowerCase() !== expectedAuthorityDiffSha256) fail("bootstrap evidenceSha256 must bind directly to the authority diff SHA-256");
}

const attestationAuthority = soloOwnerBootstrap ? "solo owner maintainer" : "independent reviewer";
process.stdout.write(`${kind} evidence PASS for ${candidateSha} by ${attestationAuthority} ${reviewerLogin}\n`);
