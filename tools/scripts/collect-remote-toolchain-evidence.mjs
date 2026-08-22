#!/usr/bin/env node

import fs from "node:fs";

const repository = String(process.env.GITHUB_REPOSITORY || "").trim();
const token = String(process.env.GH_TOKEN || process.env.GITHUB_TOKEN || "").trim();
const githubApi = String(process.env.GITHUB_API_URL || "https://api.github.com").replace(/\/$/, "");
const targetSha = String(process.env.TARGET_SHA || "").trim();
const targetRef = String(process.env.TARGET_REF || "").trim();
const targetBranch = targetRef.startsWith("refs/heads/") ? targetRef.slice("refs/heads/".length) : "";
const baseSha = String(process.env.BASE_SHA || "").trim();
const sonarToken = String(process.env.SONAR_TOKEN || "").trim();
const sonarHost = String(process.env.SONAR_HOST_URL || "https://sonarcloud.io").replace(/\/$/, "");
const waitSeconds = Number(process.env.WAIT_FOR_WORKFLOWS_SECONDS || "1200");
const pollSeconds = Number(process.env.WORKFLOW_POLL_SECONDS || "10");

const expected = [
  ["BThwani Contextual CI", ".github/workflows/ci.yml"],
  ["CodeQL", ".github/workflows/codeql.yml"],
  ["CodeQL Metadata Hygiene", ".github/workflows/codeql-hygiene.yml"],
  ["SonarQube Cloud", ".github/workflows/sonarqube.yml"],
  ["Remote Security", ".github/workflows/security-remote.yml"],
  ["Dependency Review", ".github/workflows/dependency-review.yml"],
  ["BThwani Lockfile Integrity", ".github/workflows/lockfile-integrity.yml"],
  ["OpenCodeReview", ".github/workflows/open-code-review.yml"],
  ["Semgrep Code Remote", ".github/workflows/semgrep.yml"],
  ["Dependabot State Audit", ".github/workflows/dependabot-audit.yml"],
].map(([name, path]) => ({ name, path }));

const evidence = {
  schemaVersion: 3,
  repository,
  targetSha,
  targetRef,
  targetBranch,
  baseSha,
  generatedAtUtc: null,
  evidenceComplete: false,
  policyStatus: "BLOCKED",
  policyFailures: [],
  workflows: { expected, selected: {} },
  codeql: null,
  sonar: null,
  normalizedFindings: [],
  error: null,
};

function fail(message) { throw new Error(`Remote toolchain evidence: ${message}`); }
function emit(code) {
  evidence.generatedAtUtc = new Date().toISOString();
  process.stdout.write(`${JSON.stringify(evidence, null, 2)}\n`);
  process.exitCode = code;
}
function assertInputs() {
  if (!repository) fail("GITHUB_REPOSITORY is required");
  if (!token) fail("GH_TOKEN/GITHUB_TOKEN is required");
  if (!/^[0-9a-f]{40}$/i.test(targetSha)) fail("TARGET_SHA must be a full SHA");
  if (!targetBranch) fail("TARGET_REF must be refs/heads/*");
  if (baseSha && !/^[0-9a-f]{40}$/i.test(baseSha)) fail("BASE_SHA must be a full SHA when provided");
}
async function json(url, init = {}) {
  const response = await fetch(url, init);
  const text = await response.text();
  if (!response.ok) fail(`${init.method || "GET"} ${url} -> ${response.status}: ${text.slice(0, 600)}`);
  return text ? JSON.parse(text) : null;
}
async function gh(pathname) {
  return json(`${githubApi}/repos/${repository}${pathname}`, {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });
}
async function ghPaged(pathname, property = null, maxPages = 50) {
  const out = [];
  const sep = pathname.includes("?") ? "&" : "?";
  for (let page = 1; page <= maxPages; page += 1) {
    const body = await gh(`${pathname}${sep}per_page=100&page=${page}`);
    const batch = property ? body?.[property] : body;
    if (!Array.isArray(batch)) fail(`expected array from ${pathname}`);
    out.push(...batch);
    if (batch.length < 100) return out;
  }
  fail(`pagination limit exceeded for ${pathname}`);
}
async function sonar(endpoint, params = {}) {
  if (!sonarToken) fail("SONAR_TOKEN is required for Sonar read-back");
  const url = new URL(endpoint, `${sonarHost}/`);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value) !== "") url.searchParams.set(key, String(value));
  });
  return json(url.toString(), { headers: { Accept: "application/json", Authorization: `Bearer ${sonarToken}` } });
}
async function sonarPaged(endpoint, params, property, pageSize = 500, maxPages = 20) {
  const out = [];
  for (let page = 1; page <= maxPages; page += 1) {
    const body = await sonar(endpoint, { ...params, p: page, ps: pageSize });
    const batch = body?.[property];
    if (!Array.isArray(batch)) fail(`expected Sonar array ${property}`);
    out.push(...batch);
    const total = Number(body?.paging?.total ?? body?.total ?? out.length);
    if (out.length >= total || batch.length < pageSize) return out;
  }
  fail(`Sonar pagination limit exceeded for ${endpoint}`);
}
function readSonarProject() {
  const props = new Map();
  for (const raw of fs.readFileSync("sonar-project.properties", "utf8").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const i = line.indexOf("=");
    if (i > 0) props.set(line.slice(0, i).trim(), line.slice(i + 1).trim());
  }
  const projectKey = props.get("sonar.projectKey");
  const organization = props.get("sonar.organization");
  if (!projectKey || !organization) fail("Sonar project metadata missing");
  return { projectKey, organization };
}

function runPreference(run) {
  const eventRank = { workflow_dispatch: 3, pull_request: 2, push: 1, schedule: 0 }[run.event] ?? -1;
  return [eventRank, String(run.created_at || "")];
}
function newerPreferred(a, b) {
  const [ar, at] = runPreference(a);
  const [br, bt] = runPreference(b);
  return ar !== br ? br - ar : bt.localeCompare(at);
}

async function waitForExactRuns() {
  const deadline = Date.now() + waitSeconds * 1000;
  while (true) {
    const body = await gh(`/actions/runs?head_sha=${encodeURIComponent(targetSha)}&branch=${encodeURIComponent(targetBranch)}&per_page=100`);
    const runs = Array.isArray(body?.workflow_runs)
      ? body.workflow_runs.filter((run) => run.head_sha === targetSha && run.head_branch === targetBranch)
      : [];
    const missing = [];
    const pending = [];
    for (const spec of expected) {
      const matches = runs.filter((run) => run.name === spec.name && run.path === spec.path).sort(newerPreferred);
      const selected = matches[0];
      if (!selected) missing.push(spec.name);
      else if (selected.status !== "completed") pending.push(spec.name);
      else evidence.workflows.selected[spec.name] = selected;
    }
    if (!missing.length && !pending.length) break;
    if (Date.now() >= deadline) {
      evidence.workflows.missing = missing;
      evidence.workflows.pending = pending;
      fail(`timed out waiting for exact-SHA workflows; missing=${missing.join(",") || "none"}; pending=${pending.join(",") || "none"}`);
    }
    await new Promise((resolve) => setTimeout(resolve, pollSeconds * 1000));
  }

  for (const [name, run] of Object.entries(evidence.workflows.selected)) {
    run.jobs = await ghPaged(`/actions/runs/${run.id}/jobs`, "jobs");
    run.artifacts = await ghPaged(`/actions/runs/${run.id}/artifacts`, "artifacts");
    run.jobs = run.jobs.map((job) => ({
      id: job.id,
      name: job.name,
      status: job.status,
      conclusion: job.conclusion,
      started_at: job.started_at,
      completed_at: job.completed_at,
      steps: Array.isArray(job.steps) ? job.steps.map((step) => ({ number: step.number, name: step.name, status: step.status, conclusion: step.conclusion })) : [],
    }));
    run.artifacts = run.artifacts.map((a) => ({ id: a.id, name: a.name, size_in_bytes: a.size_in_bytes, expired: a.expired, created_at: a.created_at, expires_at: a.expires_at }));
    if (run.conclusion !== "success") evidence.policyFailures.push(`workflow:${name}:${run.conclusion || "unknown"}`);
  }
}

async function collectCodeql() {
  const analyses = await ghPaged(`/code-scanning/analyses?ref=${encodeURIComponent(targetRef)}&tool_name=CodeQL`);
  const exact = analyses.filter((a) => a?.commit_sha === targetSha);
  const alerts = await ghPaged(`/code-scanning/alerts?state=open&ref=${encodeURIComponent(targetRef)}&tool_name=CodeQL`);
  evidence.codeql = { exactAnalyses: exact, openAlerts: alerts };
  for (const alert of alerts) {
    const finding = {
      source: "codeql",
      id: String(alert.number),
      severity: alert?.rule?.security_severity_level || alert?.rule?.severity || "",
      path: alert?.most_recent_instance?.location?.path || "",
      line: alert?.most_recent_instance?.location?.start_line ?? null,
      message: alert?.rule?.description || alert?.rule?.name || "",
      url: alert?.html_url || "",
      commitSha: alert?.most_recent_instance?.commit_sha || "",
      material: true,
    };
    evidence.normalizedFindings.push(finding);
  }
  if (!exact.length) evidence.policyFailures.push("codeql:missing-exact-sha-analysis");
  if (alerts.length) evidence.policyFailures.push(`codeql:open-alerts:${alerts.length}`);
}

function sonarMaterial(issue) {
  if (String(issue?.type || "").toUpperCase() === "VULNERABILITY") return true;
  if (["BLOCKER", "CRITICAL"].includes(String(issue?.severity || "").toUpperCase())) return true;
  return Array.isArray(issue?.impacts) && issue.impacts.some((i) => ["BLOCKER", "HIGH"].includes(String(i?.severity || "").toUpperCase()));
}
async function collectSonar() {
  const project = readSonarProject();
  const analyses = (await sonarPaged("/api/project_analyses/search", { project: project.projectKey, branch: targetBranch }, "analyses", 100))
    .sort((a, b) => String(b.date).localeCompare(String(a.date)));
  const latest = analyses[0] || null;
  if (!latest || latest.revision !== targetSha) evidence.policyFailures.push(`sonar:latest-revision:${latest?.revision || "missing"}`);
  const qualityGate = await sonar("/api/qualitygates/project_status", { projectKey: project.projectKey, branch: targetBranch });
  const issues = await sonarPaged("/api/issues/search", { componentKeys: project.projectKey, branch: targetBranch, resolved: "false" }, "issues");
  const hotspots = await sonarPaged("/api/hotspots/search", { projectKey: project.projectKey, branch: targetBranch }, "hotspots");
  const measures = await sonar("/api/measures/component", {
    component: project.projectKey,
    branch: targetBranch,
    metricKeys: "ncloc,coverage,duplicated_lines_density,bugs,vulnerabilities,code_smells,security_hotspots,reliability_rating,security_rating,sqale_rating",
  });
  evidence.sonar = { ...project, latestAnalysis: latest, qualityGate, issues, hotspots, measures };
  const qg = String(qualityGate?.projectStatus?.status || "UNKNOWN");
  if (qg !== "OK") evidence.policyFailures.push(`sonar:quality-gate:${qg}`);
  for (const issue of issues) {
    const material = sonarMaterial(issue);
    evidence.normalizedFindings.push({
      source: "sonar",
      id: issue?.key || "",
      severity: issue?.severity || "",
      path: issue?.component || "",
      line: issue?.line ?? null,
      message: issue?.message || "",
      commitSha: targetSha,
      material,
    });
  }
  const unreviewed = hotspots.filter((h) => String(h?.status || "").toUpperCase() !== "REVIEWED");
  for (const h of unreviewed) {
    evidence.normalizedFindings.push({
      source: "sonar-hotspot",
      id: h?.key || "",
      severity: h?.vulnerabilityProbability || "",
      path: h?.component || "",
      line: h?.line ?? null,
      message: h?.message || "",
      commitSha: targetSha,
      material: true,
    });
  }
  const materialIssues = issues.filter(sonarMaterial).length;
  if (materialIssues) evidence.policyFailures.push(`sonar:material-issues:${materialIssues}`);
  if (unreviewed.length) evidence.policyFailures.push(`sonar:unreviewed-hotspots:${unreviewed.length}`);
}

async function main() {
  assertInputs();
  await waitForExactRuns();
  await collectCodeql();
  await collectSonar();
  evidence.evidenceComplete = true;
  evidence.policyStatus = evidence.policyFailures.length ? "BLOCKED" : "PASS";
  emit(evidence.policyFailures.length ? 1 : 0);
}

main().catch((error) => {
  evidence.error = error instanceof Error ? error.message : String(error);
  evidence.policyFailures.push(evidence.error);
  evidence.policyStatus = "BLOCKED";
  emit(1);
});
