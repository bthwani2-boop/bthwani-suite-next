import {execFileSync} from "node:child_process";

const [kind, prNumber, candidateSha] = process.argv.slice(2);

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
if (!["rendered", "mobile"].includes(kind)) fail("kind must be rendered or mobile");

const repository = process.env.GITHUB_REPOSITORY;
if (!repository) fail("GITHUB_REPOSITORY is required");

const pr = JSON.parse(gh(["api", `/repos/${repository}/pulls/${prNumber}`]));
if (pr.state !== "open") fail("PR is not open");
if (pr.head?.sha !== candidateSha) fail("PR head moved");

const markers = {
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

if (kind === "rendered") {
  if (payload.schema !== "BTHWANI_RENDERED_WEB_EVIDENCE" || payload.version !== 1) fail("rendered schema/version mismatch");
  if (payload.producerIdentity?.kind !== "authorized-host-runner") fail("rendered evidence producer identity kind mismatch");
  if (payload.surface !== "control-panel") fail("rendered surface must be control-panel");
  if (!nonEmpty(payload.runner)) fail("rendered runner identity required");
  if (!Array.isArray(payload.scenarios) || payload.scenarios.length === 0 || payload.scenarios.some((x) => !nonEmpty(x))) fail("rendered evidence requires non-empty material scenarios");
  if (!nonEmpty(payload.evidenceIdentity)) fail("rendered evidence identity required");
  if (payload.accessibilityVerdict !== "PASS") fail("rendered accessibility verdict must be PASS");
  if (payload.rtlVerdict !== "PASS") fail("rendered RTL verdict must be PASS");
}

if (kind === "mobile") {
  if (payload.schema !== "BTHWANI_MOBILE_EVIDENCE" || payload.version !== 1) fail("mobile schema/version mismatch");
  if (payload.producerIdentity?.kind !== "external-device-runner") fail("mobile evidence producer identity kind mismatch");
  if (!["android", "ios"].includes(payload.platform)) fail("mobile platform mismatch");
  if (!nonEmpty(payload.runner)) fail("mobile runner identity required");
  if (!nonEmpty(payload.device?.model) || !nonEmpty(payload.device?.osVersion) || !nonEmpty(payload.device?.appBuild)) fail("mobile device model/osVersion/appBuild are required");
  if (!Array.isArray(payload.scenarios) || payload.scenarios.length === 0 || payload.scenarios.some((x) => !nonEmpty(x))) fail("mobile evidence requires non-empty scenarios");
  if (!nonEmpty(payload.evidenceIdentity)) fail("mobile evidence identity required");
}

process.stdout.write(`${kind} evidence PASS for ${candidateSha}\n`);
