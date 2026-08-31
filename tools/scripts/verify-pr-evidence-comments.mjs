import {execFileSync} from "node:child_process";

const [kind, prNumber, candidateSha, expectedPrimary = "", expectedSecondary = "", expectedTertiary = "", expectedQuaternary = ""] = process.argv.slice(2);

const fail = (message) => {
  process.stderr.write(`evidence-comment: ${message}\n`);
  process.exit(1);
};

const gh = (args) => execFileSync("gh", args, {
  encoding: "utf8",
  stdio: ["ignore", "pipe", "pipe"],
  env: {...process.env, GH_FORCE_TTY: "0", NO_COLOR: "1"},
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
if (!["semantic", "rendered", "mobile"].includes(kind)) fail("kind must be semantic, rendered, or mobile");

const repository = process.env.GITHUB_REPOSITORY;
if (!repository) fail("GITHUB_REPOSITORY is required");

const pr = JSON.parse(gh(["api", `/repos/${repository}/pulls/${prNumber}`]));
if (pr.state !== "open") fail("PR is not open");
if (pr.head?.sha !== candidateSha) fail("PR head moved");

const markers = {
  semantic: "BTHWANI_SEMANTIC_REVIEW:v1",
  rendered: "BTHWANI_RENDERED_WEB_EVIDENCE:v1",
  mobile: "BTHWANI_MOBILE_EVIDENCE:v1",
};
const marker = markers[kind];

const comments = pagedArray(`/repos/${repository}/issues/${prNumber}/comments?per_page=100`);
const matching = comments.filter((comment) => String(comment.body ?? "").startsWith(`${marker}\n`));
if (matching.length !== 1) fail(`${marker} requires exactly one live evidence record, found ${matching.length}`);

const record = matching[0];
if (String(record.author_association ?? "") !== "OWNER") {
  fail(`evidence author must have OWNER association, got ${record.author_association}`);
}

const lines = String(record.body).split(/\r?\n/u);
if (lines.length !== 2 || lines[0] !== marker) fail("evidence record must be exactly marker + one canonical JSON line");

let payload;
try { payload = JSON.parse(lines[1]); }
catch { fail("evidence JSON is malformed"); }

if (payload.candidateSha !== candidateSha) fail("evidence is stale or cross-SHA");
if (payload.verdict !== "PASS") fail("evidence verdict is not PASS");
if (!validInstant(payload.capturedAt)) fail("capturedAt must be an ISO-compatible timestamp");
if (!sha256(payload.evidenceSha256)) fail("evidenceSha256 must be a 64-hex SHA-256 digest");

if (kind === "semantic") {
  if (payload.schema !== "BTHWANI_SEMANTIC_REVIEW" || payload.version !== 1) fail("semantic schema/version mismatch");
  if (payload.reviewIdentity?.kind !== "external-authorized-host-agent") fail("semantic reviewer identity kind mismatch");
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
  if (!["android", "ios"].includes(payload.platform)) fail("mobile platform mismatch");
  if (!nonEmpty(payload.runner)) fail("mobile runner identity required");
  if (!nonEmpty(payload.device?.model) || !nonEmpty(payload.device?.osVersion) || !nonEmpty(payload.device?.appBuild)) fail("mobile device model/osVersion/appBuild are required");
  if (!Array.isArray(payload.scenarios) || payload.scenarios.length === 0 || payload.scenarios.some((x) => !nonEmpty(x))) fail("mobile evidence requires non-empty scenarios");
  if (!nonEmpty(payload.evidenceIdentity)) fail("mobile evidence identity required");
}

process.stdout.write(`${kind} evidence PASS for ${candidateSha}\n`);
