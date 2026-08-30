import { execFileSync } from "node:child_process";

const [kind, prNumber, candidateSha] = process.argv.slice(2);
const fail = (message) => {
  process.stderr.write(`evidence-comment: ${message}\n`);
  process.exit(1);
};
const gh = (args) => execFileSync("gh", args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });

if (!/^[1-9][0-9]*$/u.test(prNumber ?? "")) fail("positive PR number required");
if (!/^[0-9a-f]{40}$/iu.test(candidateSha ?? "")) fail("exact candidate SHA required");
if (!["semantic", "mobile"].includes(kind)) fail("kind must be semantic or mobile");

const repository = process.env.GITHUB_REPOSITORY;
if (!repository) fail("GITHUB_REPOSITORY is required");

const pr = JSON.parse(gh(["api", `/repos/${repository}/pulls/${prNumber}`]));
if (pr.state !== "open") fail("PR is not open");
if (pr.head?.sha !== candidateSha) fail("PR head moved");

const comments = JSON.parse(gh(["api", "--paginate", `/repos/${repository}/issues/${prNumber}/comments?per_page=100`]));
const marker = kind === "semantic" ? "BTHWANI_SEMANTIC_REVIEW:v1" : "BTHWANI_MOBILE_EVIDENCE:v1";
const matching = comments.filter((c) => String(c.body ?? "").startsWith(`${marker}\n`));
if (matching.length !== 1) fail(`${marker} requires exactly one live attestation, found ${matching.length}`);

const comment = matching[0];
if (comment.user?.login === pr.user?.login) fail("candidate author cannot self-attest this evidence");
if (!["OWNER","MEMBER","COLLABORATOR"].includes(String(comment.author_association ?? ""))) {
  fail(`comment author is not an authorized repository association: ${comment.author_association}`);
}
const lines = String(comment.body).split(/\r?\n/u);
if (lines.length !== 2 || lines[0] !== marker) fail("attestation must be exactly marker + one canonical JSON line");

let payload;
try { payload = JSON.parse(lines[1]); } catch { fail("attestation JSON is malformed"); }
if (payload.candidateSha !== candidateSha) fail("attestation is stale or cross-SHA");
if (payload.verdict !== "PASS") fail("attestation verdict is not PASS");

if (kind === "semantic") {
  if (payload.schema !== "BTHWANI_SEMANTIC_REVIEW" || payload.version !== 1) fail("semantic schema/version mismatch");
  if (payload.reviewIdentity?.kind !== "external-authorized-host-agent") fail("semantic reviewer identity kind mismatch");
  const p = payload.reviewProvenance ?? {};
  if (!String(p.artifactIdentity ?? "").trim()) fail("semantic artifact identity required");
  if (!/^[0-9a-f]{64}$/u.test(String(p.contextSha256 ?? ""))) fail("semantic context SHA-256 required");
  if (!String(p.packageIntegrity ?? "").trim()) fail("semantic package integrity required");
  if (!String(p.toolVersion ?? "").trim()) fail("semantic tool version required");
} else {
  if (payload.schema !== "BTHWANI_MOBILE_EVIDENCE" || payload.version !== 1) fail("mobile schema/version mismatch");
  if (!["android","ios"].includes(payload.platform)) fail("mobile platform mismatch");
  if (!String(payload.runner ?? "").trim()) fail("mobile runner identity required");
  if (!Array.isArray(payload.scenarios) || payload.scenarios.length === 0 || payload.scenarios.some((s) => !String(s).trim())) fail("mobile scenarios required");
  if (!String(payload.evidenceIdentity ?? "").trim()) fail("mobile evidence identity required");
}

process.stdout.write(`${kind} evidence PASS for ${candidateSha}\n`);
