import fs from "node:fs";

const repository = String(process.env.GITHUB_REPOSITORY ?? "").trim();
const token = String(process.env.GH_TOKEN ?? process.env.GITHUB_TOKEN ?? "").trim();
const apiBase = String(process.env.GITHUB_API_URL ?? "https://api.github.com").replace(/\/$/, "");
const candidateSha = String(process.env.GITHUB_SHA ?? "").trim();
const candidateRef = String(process.env.GITHUB_REF ?? "").trim();
const masterRef = "refs/heads/master";
const workflowAnalysisPrefix = ".github/workflows/codeql.yml:";
const canonicalAnalysisKeys = new Set([
  ".github/workflows/codeql.yml:analyze-javascript-typescript",
  ".github/workflows/codeql.yml:analyze-go",
  ".github/workflows/codeql.yml:analyze-actions",
]);

function fail(message) {
  throw new Error(`CodeQL hygiene: ${message}`);
}

if (!repository || !token) fail("GITHUB_REPOSITORY and GH_TOKEN are required");
if (!/^[0-9a-f]{40}$/i.test(candidateSha)) fail("GITHUB_SHA must be a full commit SHA");
if (candidateRef !== masterRef) fail(`must run only on ${masterRef}; got ${candidateRef || "<empty>"}`);

const workflow = fs.readFileSync(".github/workflows/codeql.yml", "utf8");
for (const job of [
  "analyze-javascript-typescript:",
  "analyze-go:",
  "analyze-actions:",
]) {
  if (!workflow.includes(job)) fail(`canonical CodeQL job is missing: ${job}`);
}
if (/^  analyze:\s*$/m.test(workflow)) fail("obsolete generic analyze job unexpectedly exists");

async function request(pathname, init = {}) {
  const response = await fetch(`${apiBase}/repos/${repository}${pathname}`, {
    ...init,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      ...(init.headers ?? {}),
    },
  });
  if (!response.ok) {
    const body = await response.text();
    fail(`${init.method ?? "GET"} ${pathname} -> ${response.status}: ${body}`);
  }
  if (response.status === 204) return null;
  const body = await response.text();
  return body ? JSON.parse(body) : null;
}

async function page(pathname) {
  const separator = pathname.includes("?") ? "&" : "?";
  const items = [];
  for (let pageNumber = 1; pageNumber <= 100; pageNumber += 1) {
    const batch = await request(`${pathname}${separator}per_page=100&page=${pageNumber}`);
    if (!Array.isArray(batch)) fail(`expected an array from ${pathname}`);
    items.push(...batch);
    if (batch.length < 100) break;
  }
  return items;
}

async function assertLiveMaster() {
  const branch = await request("/branches/master");
  const liveSha = String(branch?.commit?.sha ?? "");
  if (liveSha !== candidateSha) {
    fail(`master moved during hygiene; candidate=${candidateSha} live=${liveSha || "<unknown>"}`);
  }
}

function isObsoleteAnalysis(analysis) {
  const key = String(analysis?.analysis_key ?? "");
  return key.startsWith(workflowAnalysisPrefix) && !canonicalAnalysisKeys.has(key);
}

function isObsoleteAlert(alert) {
  const key = String(alert?.most_recent_instance?.analysis_key ?? "");
  return key.startsWith(workflowAnalysisPrefix) && !canonicalAnalysisKeys.has(key);
}

async function listAnalyses() {
  return page(`/code-scanning/analyses?ref=${encodeURIComponent(masterRef)}&tool_name=CodeQL`);
}

async function listOpenAlerts() {
  return page(`/code-scanning/alerts?state=open&ref=${encodeURIComponent(masterRef)}&tool_name=CodeQL`);
}

await assertLiveMaster();
let deleted = 0;

for (let iteration = 0; iteration < 1000; iteration += 1) {
  await assertLiveMaster();
  const obsolete = (await listAnalyses()).filter(isObsoleteAnalysis);
  if (obsolete.length === 0) break;

  const deletable = obsolete
    .filter((analysis) => analysis?.deletable === true)
    .sort((left, right) => String(right.created_at).localeCompare(String(left.created_at)));

  if (deletable.length === 0) {
    fail(`obsolete analyses remain but none is deletable: ${JSON.stringify(obsolete.map((analysis) => ({
      id: analysis.id,
      analysis_key: analysis.analysis_key,
      category: analysis.category,
      commit_sha: analysis.commit_sha,
      deletable: analysis.deletable,
    })))}`);
  }

  const target = deletable[0];
  await assertLiveMaster();
  await request(`/code-scanning/analyses/${target.id}?confirm_delete=true`, { method: "DELETE" });
  deleted += 1;
}

await assertLiveMaster();
const remainingObsoleteAnalyses = (await listAnalyses()).filter(isObsoleteAnalysis);
if (remainingObsoleteAnalyses.length > 0) {
  fail(`obsolete analyses remain after cleanup: ${remainingObsoleteAnalyses.length}`);
}

let remainingObsoleteAlerts = [];
for (let attempt = 1; attempt <= 12; attempt += 1) {
  await assertLiveMaster();
  remainingObsoleteAlerts = (await listOpenAlerts()).filter(isObsoleteAlert);
  if (remainingObsoleteAlerts.length === 0) break;
  if (attempt < 12) await new Promise((resolve) => setTimeout(resolve, 5000));
}
if (remainingObsoleteAlerts.length > 0) {
  fail(`open alerts from obsolete CodeQL analysis keys remain: ${remainingObsoleteAlerts.map((alert) => alert.number).join(",")}`);
}

console.log(JSON.stringify({
  status: "PASS",
  ref: masterRef,
  candidateSha,
  deletedObsoleteAnalyses: deleted,
  remainingObsoleteAnalyses: 0,
  remainingObsoleteAlerts: 0,
  canonicalAnalysisKeys: [...canonicalAnalysisKeys],
}, null, 2));
