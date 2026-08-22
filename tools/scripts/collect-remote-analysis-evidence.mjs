#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const githubRepository = String(process.env.GITHUB_REPOSITORY || "").trim();
const githubToken = String(process.env.GH_TOKEN || process.env.GITHUB_TOKEN || "").trim();
const githubApiBase = String(process.env.GITHUB_API_URL || "https://api.github.com").replace(/\/$/, "");
const sonarToken = String(process.env.SONAR_TOKEN || "").trim();
const sonarHost = String(process.env.SONAR_HOST_URL || "https://sonarcloud.io").replace(/\/$/, "");
const targetSha = String(process.env.TARGET_SHA || "").trim();
const targetRef = String(process.env.TARGET_REF || "refs/heads/master").trim();
const targetEvent = String(process.env.TARGET_EVENT || "push").trim();
const sonarBranch = String(process.env.SONAR_BRANCH || "master").trim();
const evidenceRoot = path.resolve(process.env.EVIDENCE_ROOT || path.join(process.env.RUNNER_TEMP || ".", "remote-analysis-evidence"));
const waitSeconds = Number(process.env.WAIT_FOR_WORKFLOWS_SECONDS || "1800");
const pollSeconds = Number(process.env.WORKFLOW_POLL_SECONDS || "15");

const expectedCodeqlCategories = new Set([
  "/language:javascript-typescript",
  "/language:actions",
  "/language:go-dsh",
  "/language:go-wlt",
  "/language:go-identity",
  "/language:go-workforce",
  "/language:go-platform-control",
  "/language:go-providers",
]);

function fail(message) {
  throw new Error(`Remote analysis evidence: ${message}`);
}

function assertInputs() {
  if (!githubRepository) fail("GITHUB_REPOSITORY is required");
  if (!githubToken) fail("GH_TOKEN/GITHUB_TOKEN is required");
  if (!sonarToken) fail("SONAR_TOKEN is required");
  if (!/^[0-9a-f]{40}$/i.test(targetSha)) fail("TARGET_SHA must be a full 40-character commit SHA");
  if (targetRef !== "refs/heads/master") fail(`canonical evidence currently requires refs/heads/master; received ${targetRef}`);
  if (targetEvent !== "push") fail(`canonical evidence currently requires push evidence; received ${targetEvent}`);
  if (!Number.isFinite(waitSeconds) || waitSeconds < 0) fail("WAIT_FOR_WORKFLOWS_SECONDS must be a non-negative number");
  if (!Number.isFinite(pollSeconds) || pollSeconds <= 0) fail("WORKFLOW_POLL_SECONDS must be a positive number");
}

function ensureDirectories() {
  for (const relative of ["codeql", "sonar", "normalized"]) {
    fs.mkdirSync(path.join(evidenceRoot, relative), { recursive: true });
  }
}

function writeJson(relative, value) {
  const output = path.join(evidenceRoot, relative);
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function readSonarProperties() {
  const source = fs.readFileSync("sonar-project.properties", "utf8");
  const properties = new Map();
  for (const rawLine of source.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const separator = line.indexOf("=");
    if (separator < 1) continue;
    properties.set(line.slice(0, separator).trim(), line.slice(separator + 1).trim());
  }
  const projectKey = properties.get("sonar.projectKey");
  const organization = properties.get("sonar.organization");
  if (!projectKey) fail("sonar.projectKey is missing from sonar-project.properties");
  if (!organization) fail("sonar.organization is missing from sonar-project.properties");
  return { projectKey, organization };
}

async function httpJson(url, init = {}) {
  const response = await fetch(url, init);
  const text = await response.text();
  if (!response.ok) {
    fail(`${init.method || "GET"} ${url} -> ${response.status}: ${text.slice(0, 1000)}`);
  }
  if (!text) return null;
  return JSON.parse(text);
}

async function githubApi(pathname, init = {}) {
  return httpJson(`${githubApiBase}/repos/${githubRepository}${pathname}`, {
    ...init,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${githubToken}`,
      "X-GitHub-Api-Version": "2026-03-10",
      ...(init.headers || {}),
    },
  });
}

async function githubPaged(pathname, maxPages = 100) {
  const separator = pathname.includes("?") ? "&" : "?";
  const all = [];
  for (let page = 1; page <= maxPages; page += 1) {
    const batch = await githubApi(`${pathname}${separator}per_page=100&page=${page}`);
    if (!Array.isArray(batch)) fail(`expected GitHub array response from ${pathname}`);
    all.push(...batch);
    if (batch.length < 100) return all;
    if (page === maxPages) fail(`GitHub pagination exceeded ${maxPages} pages for ${pathname}`);
  }
  return all;
}

async function sonarApi(endpoint, params = {}) {
  const url = new URL(endpoint, `${sonarHost}/`);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && String(value) !== "") url.searchParams.set(key, String(value));
  }
  return httpJson(url.toString(), {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${sonarToken}`,
    },
  });
}

async function sonarPaged(endpoint, params, property, pageSize = 500, maxPages = 20) {
  const all = [];
  let expectedTotal = null;
  for (let page = 1; page <= maxPages; page += 1) {
    const response = await sonarApi(endpoint, { ...params, p: page, ps: pageSize });
    const batch = response?.[property];
    if (!Array.isArray(batch)) fail(`expected Sonar array '${property}' from ${endpoint}`);
    all.push(...batch);
    expectedTotal = Number(response?.paging?.total ?? response?.total ?? all.length);
    if (all.length >= expectedTotal || batch.length < pageSize) {
      if (all.length < expectedTotal) fail(`Sonar pagination incomplete for ${endpoint}: retrieved=${all.length} expected=${expectedTotal}`);
      return all;
    }
    if (page === maxPages) fail(`Sonar pagination exceeded ${maxPages} pages for ${endpoint}; retrieved=${all.length} expected=${expectedTotal}`);
  }
  return all;
}

function expectedWorkflowNames() {
  const names = ["BThwani Contextual CI", "CodeQL", "SonarQube Cloud"];
  const securitySource = fs.readFileSync(".github/workflows/security-remote.yml", "utf8");
  if (/^\s{2}(?:pull_request|push):/m.test(securitySource)) names.push("Remote Security");
  return names;
}

async function exactShaWorkflowRuns() {
  const response = await githubApi(`/actions/runs?head_sha=${encodeURIComponent(targetSha)}&per_page=100`);
  if (!Array.isArray(response?.workflow_runs)) fail("GitHub workflow-runs response is missing workflow_runs");
  return response.workflow_runs.filter((run) => run.head_sha === targetSha && run.event === targetEvent);
}

function selectWorkflowRuns(runs, expectedNames) {
  const selected = {};
  for (const name of expectedNames) {
    const matches = runs
      .filter((run) => run.name === name)
      .sort((left, right) => String(right.created_at).localeCompare(String(left.created_at)));
    if (matches.length > 0) selected[name] = matches[0];
  }
  return selected;
}

async function waitForWorkflows() {
  const expectedNames = expectedWorkflowNames();
  const deadline = Date.now() + waitSeconds * 1000;
  while (true) {
    const runs = await exactShaWorkflowRuns();
    const selected = selectWorkflowRuns(runs, expectedNames);
    const missing = expectedNames.filter((name) => !selected[name]);
    const pending = expectedNames.filter((name) => selected[name] && selected[name].status !== "completed");
    if (missing.length === 0 && pending.length === 0) {
      const failed = expectedNames.filter((name) => selected[name].conclusion !== "success");
      writeJson("workflows.json", { targetSha, targetEvent, expectedNames, selected });
      if (failed.length > 0) fail(`exact-SHA workflows did not succeed: ${failed.map((name) => `${name}:${selected[name].conclusion}`).join(", ")}`);
      return { expectedNames, selected };
    }
    if (Date.now() >= deadline) {
      writeJson("workflows.json", { targetSha, targetEvent, expectedNames, selected, missing, pending });
      fail(`timed out waiting for exact-SHA workflows; missing=${missing.join(",") || "none"} pending=${pending.join(",") || "none"}`);
    }
    await new Promise((resolve) => setTimeout(resolve, pollSeconds * 1000));
  }
}

async function collectCodeql() {
  const analyses = await githubPaged(`/code-scanning/analyses?ref=${encodeURIComponent(targetRef)}&tool_name=CodeQL`);
  const exactAnalyses = analyses.filter((analysis) => analysis?.commit_sha === targetSha);
  writeJson("codeql/analyses.json", exactAnalyses);

  const observedCategories = [...new Set(exactAnalyses.map((analysis) => analysis?.category).filter(Boolean))].sort();
  const missingCategories = [...expectedCodeqlCategories].filter((category) =>
    !observedCategories.some((observed) => observed === category || observed.endsWith(category)),
  );
  if (missingCategories.length > 0) {
    fail(`CodeQL exact-SHA analyses are incomplete; missing categories: ${missingCategories.join(", ")}`);
  }

  const alertsByState = {};
  const allAlertsByNumber = new Map();
  for (const state of ["open", "dismissed", "fixed", "closed"]) {
    const alerts = await githubPaged(`/code-scanning/alerts?state=${state}&ref=${encodeURIComponent(targetRef)}&tool_name=CodeQL`);
    alertsByState[state] = alerts;
    for (const alert of alerts) allAlertsByNumber.set(alert.number, alert);
  }
  writeJson("codeql/alerts.json", alertsByState);

  const openAlerts = alertsByState.open || [];
  const instances = [];
  for (const alert of openAlerts) {
    const alertInstances = await githubPaged(`/code-scanning/alerts/${alert.number}/instances?ref=${encodeURIComponent(targetRef)}`);
    instances.push({ alertNumber: alert.number, instances: alertInstances });
  }
  writeJson("codeql/open-alert-instances.json", instances);

  return {
    exactAnalyses,
    observedCategories,
    missingCategories,
    openAlerts,
    allAlerts: [...allAlertsByNumber.values()],
    instances,
  };
}

function sonarIssueIsMaterial(issue) {
  if (String(issue?.type || "").toUpperCase() === "VULNERABILITY") return true;
  if (["BLOCKER", "CRITICAL"].includes(String(issue?.severity || "").toUpperCase())) return true;
  return Array.isArray(issue?.impacts) && issue.impacts.some((impact) =>
    ["BLOCKER", "HIGH"].includes(String(impact?.severity || "").toUpperCase()),
  );
}

async function collectSonar(projectKey) {
  const analyses = await sonarPaged(
    "/api/project_analyses/search",
    { project: projectKey, branch: sonarBranch },
    "analyses",
    100,
    20,
  );
  const exactAnalyses = analyses.filter((analysis) => analysis?.revision === targetSha);
  const latestExactAnalysis = exactAnalyses.sort((a, b) => String(b.date).localeCompare(String(a.date)))[0] || null;
  writeJson("sonar/analysis.json", { targetSha, exactAnalyses, latestExactAnalysis });
  if (!latestExactAnalysis) fail(`Sonar latest analysis revision does not include exact target SHA ${targetSha}`);

  const qualityGate = await sonarApi("/api/qualitygates/project_status", { projectKey, branch: sonarBranch });
  writeJson("sonar/quality-gate.json", qualityGate);
  const qualityGateStatus = String(qualityGate?.projectStatus?.status || "UNKNOWN");

  const issues = await sonarPaged(
    "/api/issues/search",
    { componentKeys: projectKey, branch: sonarBranch, resolved: "false" },
    "issues",
  );
  writeJson("sonar/issues.json", issues);

  const hotspots = await sonarPaged(
    "/api/hotspots/search",
    { projectKey, branch: sonarBranch },
    "hotspots",
  );
  writeJson("sonar/hotspots.json", hotspots);

  const measures = await sonarApi("/api/measures/component", {
    component: projectKey,
    branch: sonarBranch,
    metricKeys: [
      "ncloc",
      "coverage",
      "duplicated_lines_density",
      "bugs",
      "vulnerabilities",
      "code_smells",
      "security_hotspots",
      "reliability_rating",
      "security_rating",
      "sqale_rating",
    ].join(","),
  });
  writeJson("sonar/measures.json", measures);

  const materialIssues = issues.filter(sonarIssueIsMaterial);
  const unreviewedHotspots = hotspots.filter((hotspot) => String(hotspot?.status || "").toUpperCase() !== "REVIEWED");
  return {
    latestExactAnalysis,
    qualityGate,
    qualityGateStatus,
    issues,
    materialIssues,
    hotspots,
    unreviewedHotspots,
    measures,
  };
}

function normalizeFindings(codeql, sonar) {
  const findings = [];
  for (const alert of codeql.openAlerts) {
    findings.push({
      source: "codeql",
      id: String(alert.number),
      state: alert.state,
      rule: alert?.rule?.id || "",
      severity: alert?.rule?.security_severity_level || alert?.rule?.severity || "",
      path: alert?.most_recent_instance?.location?.path || "",
      line: alert?.most_recent_instance?.location?.start_line ?? null,
      commitSha: alert?.most_recent_instance?.commit_sha || "",
      message: alert?.rule?.description || "",
      url: alert?.html_url || "",
    });
  }
  for (const issue of sonar.issues) {
    findings.push({
      source: "sonar",
      id: issue?.key || "",
      state: issue?.status || "",
      rule: issue?.rule || "",
      severity: issue?.severity || "",
      path: issue?.component || "",
      line: issue?.line ?? null,
      commitSha: targetSha,
      message: issue?.message || "",
      material: sonarIssueIsMaterial(issue),
    });
  }
  for (const hotspot of sonar.unreviewedHotspots) {
    findings.push({
      source: "sonar-hotspot",
      id: hotspot?.key || "",
      state: hotspot?.status || "",
      rule: hotspot?.ruleKey || "",
      severity: hotspot?.vulnerabilityProbability || "",
      path: hotspot?.component || "",
      line: hotspot?.line ?? null,
      commitSha: targetSha,
      message: hotspot?.message || "",
      material: true,
    });
  }
  return findings;
}

async function main() {
  assertInputs();
  ensureDirectories();
  const startedAtUtc = new Date().toISOString();
  const sonarProperties = readSonarProperties();

  const workflows = await waitForWorkflows();
  const codeql = await collectCodeql();
  const sonar = await collectSonar(sonarProperties.projectKey);
  const findings = normalizeFindings(codeql, sonar);
  writeJson("normalized/findings.json", findings);

  const policyFailures = [];
  if (codeql.openAlerts.length > 0) policyFailures.push(`codeql_open_alerts=${codeql.openAlerts.length}`);
  if (sonar.qualityGateStatus !== "OK") policyFailures.push(`sonar_quality_gate=${sonar.qualityGateStatus}`);
  if (sonar.materialIssues.length > 0) policyFailures.push(`sonar_material_issues=${sonar.materialIssues.length}`);
  if (sonar.unreviewedHotspots.length > 0) policyFailures.push(`sonar_unreviewed_hotspots=${sonar.unreviewedHotspots.length}`);

  const summary = {
    schemaVersion: 1,
    repository: githubRepository,
    targetSha,
    targetRef,
    targetEvent,
    generatedAtUtc: new Date().toISOString(),
    evidenceComplete: true,
    policyStatus: policyFailures.length === 0 ? "PASS" : "FAIL",
    policyFailures,
    workflows: Object.fromEntries(Object.entries(workflows.selected).map(([name, run]) => [name, {
      id: run.id,
      status: run.status,
      conclusion: run.conclusion,
      event: run.event,
      headSha: run.head_sha,
      url: run.html_url,
    }])),
    codeql: {
      exactAnalysisCount: codeql.exactAnalyses.length,
      expectedCategories: [...expectedCodeqlCategories].sort(),
      observedCategories: codeql.observedCategories,
      openAlerts: codeql.openAlerts.length,
      totalAlertRecords: codeql.allAlerts.length,
    },
    sonar: {
      organization: sonarProperties.organization,
      projectKey: sonarProperties.projectKey,
      revision: sonar.latestExactAnalysis?.revision || null,
      qualityGate: sonar.qualityGateStatus,
      unresolvedIssues: sonar.issues.length,
      materialIssues: sonar.materialIssues.length,
      hotspots: sonar.hotspots.length,
      unreviewedHotspots: sonar.unreviewedHotspots.length,
    },
    startedAtUtc,
  };

  writeJson("normalized/summary.json", summary);
  writeJson("manifest.json", summary);

  process.stdout.write("REMOTE_ANALYSIS_EVIDENCE_BEGIN\n");
  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
  process.stdout.write("REMOTE_ANALYSIS_EVIDENCE_END\n");

  if (policyFailures.length > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  ensureDirectories();
  const failure = {
    schemaVersion: 1,
    repository: githubRepository,
    targetSha,
    targetRef,
    generatedAtUtc: new Date().toISOString(),
    evidenceComplete: false,
    policyStatus: "BLOCKED",
    error: error instanceof Error ? error.message : String(error),
  };
  writeJson("manifest.json", failure);
  writeJson("normalized/summary.json", failure);
  console.error(error);
  process.exitCode = 1;
});
