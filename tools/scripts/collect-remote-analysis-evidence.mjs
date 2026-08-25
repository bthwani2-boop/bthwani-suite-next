#!/usr/bin/env node

import fs from "node:fs";

const repository = String(process.env.GITHUB_REPOSITORY || "").trim();
const githubToken = String(process.env.GH_TOKEN || process.env.GITHUB_TOKEN || "").trim();
const githubApi = String(process.env.GITHUB_API_URL || "https://api.github.com").replace(/\/$/, "");
const sonarToken = String(process.env.SONAR_TOKEN || "").trim();
const sonarHost = String(process.env.SONAR_HOST_URL || "https://sonarcloud.io").replace(/\/$/, "");
const targetSha = String(process.env.TARGET_SHA || "").trim();
const targetRef = String(process.env.TARGET_REF || "").trim();
const targetEvent = String(process.env.TARGET_EVENT || "push").trim();
const defaultBranch = String(process.env.DEFAULT_BRANCH || "").trim();
const targetBranch = targetRef.startsWith("refs/heads/") ? targetRef.slice("refs/heads/".length) : "";
const sonarBranch = String(process.env.SONAR_BRANCH || targetBranch).trim();
const waitSeconds = Number(process.env.WAIT_FOR_WORKFLOWS_SECONDS || "1800");
const pollSeconds = Number(process.env.WORKFLOW_POLL_SECONDS || "15");

const expectedCodeqlCategories = [
  "/language:javascript-typescript",
  "/language:actions",
  "/language:go-dsh",
  "/language:go-wlt",
  "/language:go-identity",
  "/language:go-workforce",
  "/language:go-platform-control",
  "/language:go-providers",
];

const evidence = {
  schemaVersion: 2,
  repository,
  targetSha,
  targetRef,
  targetEvent,
  generatedAtUtc: null,
  evidenceComplete: false,
  policyStatus: "BLOCKED",
  policyFailures: [],
  workflows: null,
  codeql: null,
  sonar: null,
  normalizedFindings: [],
  error: null,
};

function fail(message) {
  throw new Error(`Remote analysis evidence: ${message}`);
}

function emit(exitCode) {
  evidence.generatedAtUtc = new Date().toISOString();
  process.stdout.write(`${JSON.stringify(evidence, null, 2)}\n`);
  process.exitCode = exitCode;
}

function assertInputs() {
  if (!repository) fail("GITHUB_REPOSITORY is required");
  if (!defaultBranch) fail("DEFAULT_BRANCH is required and must come from live repository context");
  if (!githubToken) fail("GH_TOKEN/GITHUB_TOKEN is required");
  if (!sonarToken) fail("SONAR_TOKEN is required");
  if (!/^[0-9a-f]{40}$/i.test(targetSha)) fail("TARGET_SHA must be a full 40-character commit SHA");
  if (!/^refs\/heads\/.+/.test(targetRef)) fail(`TARGET_REF must be an exact refs/heads/* ref; received ${targetRef}`);
  if (!targetBranch) fail("target branch could not be derived from TARGET_REF");
  if (!sonarBranch || sonarBranch !== targetBranch) fail(`SONAR_BRANCH must match target branch ${targetBranch}; received ${sonarBranch}`);
  if (targetEvent !== "push") fail(`canonical branch evidence requires push evidence; received ${targetEvent}`);
  if (!Number.isFinite(waitSeconds) || waitSeconds < 0) fail("WAIT_FOR_WORKFLOWS_SECONDS must be non-negative");
  if (!Number.isFinite(pollSeconds) || pollSeconds <= 0) fail("WORKFLOW_POLL_SECONDS must be positive");
}

function readSonarProject() {
  const properties = new Map();
  for (const raw of fs.readFileSync("sonar-project.properties", "utf8").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const separator = line.indexOf("=");
    if (separator > 0) properties.set(line.slice(0, separator).trim(), line.slice(separator + 1).trim());
  }
  const projectKey = properties.get("sonar.projectKey");
  const organization = properties.get("sonar.organization");
  if (!projectKey || !organization) fail("canonical Sonar project key/organization are missing");
  return { projectKey, organization };
}

async function json(url, init = {}) {
  const response = await fetch(url, init);
  const body = await response.text();
  if (!response.ok) fail(`${init.method || "GET"} ${url} -> ${response.status}: ${body.slice(0, 800)}`);
  return body ? JSON.parse(body) : null;
}

async function gh(pathname) {
  return json(`${githubApi}/repos/${repository}${pathname}`, {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${githubToken}`,
      "X-GitHub-Api-Version": "2026-03-10",
    },
  });
}

async function ghPaged(pathname, maxPages = 100) {
  const all = [];
  const separator = pathname.includes("?") ? "&" : "?";
  for (let page = 1; page <= maxPages; page += 1) {
    const batch = await gh(`${pathname}${separator}per_page=100&page=${page}`);
    if (!Array.isArray(batch)) fail(`expected GitHub array from ${pathname}`);
    all.push(...batch);
    if (batch.length < 100) return all;
  }
  fail(`GitHub pagination exceeded ${maxPages} pages for ${pathname}`);
}

async function sonar(endpoint, params = {}) {
  const url = new URL(endpoint, `${sonarHost}/`);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && String(value) !== "") url.searchParams.set(key, String(value));
  }
  return json(url.toString(), {
    headers: { Accept: "application/json", Authorization: `Bearer ${sonarToken}` },
  });
}

async function sonarPaged(endpoint, params, property, pageSize = 500, maxPages = 20) {
  const all = [];
  for (let page = 1; page <= maxPages; page += 1) {
    const response = await sonar(endpoint, { ...params, p: page, ps: pageSize });
    const batch = response?.[property];
    if (!Array.isArray(batch)) fail(`expected Sonar array '${property}' from ${endpoint}`);
    all.push(...batch);
    const total = Number(response?.paging?.total ?? response?.total ?? all.length);
    if (all.length >= total || batch.length < pageSize) {
      if (all.length < total) fail(`Sonar pagination incomplete for ${endpoint}: ${all.length}/${total}`);
      return all;
    }
  }
  fail(`Sonar pagination exceeded ${maxPages} pages for ${endpoint}`);
}

function expectedWorkflows() {
  return [
    { name: "BThwani Contextual CI", path: ".github/workflows/ci.yml" },
    { name: "CodeQL", path: ".github/workflows/codeql.yml" },
    { name: "SonarQube Cloud", path: ".github/workflows/sonarqube.yml" },
    { name: "Remote Security", path: ".github/workflows/security-remote.yml" },
  ];
}

async function waitForExactWorkflows() {
  const workflows = expectedWorkflows();
  const deadline = Date.now() + waitSeconds * 1000;
  while (true) {
    const response = await gh(
      `/actions/runs?head_sha=${encodeURIComponent(targetSha)}` +
      `&branch=${encodeURIComponent(targetBranch)}` +
      `&event=${encodeURIComponent(targetEvent)}` +
      "&per_page=100",
    );
    const runs = Array.isArray(response?.workflow_runs)
      ? response.workflow_runs.filter((run) =>
          run.head_sha === targetSha &&
          run.head_branch === targetBranch &&
          run.event === targetEvent,
        )
      : [];
    const selected = {};
    for (const workflow of workflows) {
      const matches = runs
        .filter((run) => run.name === workflow.name && run.path === workflow.path)
        .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
      if (matches[0]) selected[workflow.name] = matches[0];
    }
    const missing = workflows.filter((workflow) => !selected[workflow.name]);
    const pending = workflows.filter((workflow) => selected[workflow.name] && selected[workflow.name].status !== "completed");
    if (!missing.length && !pending.length) {
      evidence.workflows = { expected: workflows, selected };
      return;
    }
    if (Date.now() >= deadline) {
      evidence.workflows = {
        expected: workflows,
        selected,
        missing: missing.map((workflow) => workflow.name),
        pending: pending.map((workflow) => workflow.name),
      };
      fail(
        `timed out waiting for exact-SHA workflows; missing=${missing.map((workflow) => workflow.name).join(",") || "none"}; ` +
        `pending=${pending.map((workflow) => workflow.name).join(",") || "none"}`,
      );
    }
    await new Promise((resolve) => setTimeout(resolve, pollSeconds * 1000));
  }
}

async function collectCodeql() {
  const analyses = await ghPaged(`/code-scanning/analyses?ref=${encodeURIComponent(targetRef)}&tool_name=CodeQL`);
  const exactAnalyses = analyses.filter((analysis) => analysis?.commit_sha === targetSha);
  const categories = [...new Set(exactAnalyses.map((analysis) => analysis?.category).filter(Boolean))].sort();
  const requiredCategories = targetBranch === defaultBranch ? expectedCodeqlCategories : [];
  const missing = requiredCategories.filter((expected) =>
    !categories.some((observed) => observed === expected || observed.endsWith(expected)),
  );
  if (missing.length) fail(`CodeQL exact-SHA analyses are incomplete on default branch: ${missing.join(", ")}`);

  const alerts = {};
  for (const state of ["open", "closed", "dismissed", "fixed"]) {
    alerts[state] = await ghPaged(`/code-scanning/alerts?state=${state}&ref=${encodeURIComponent(targetRef)}&tool_name=CodeQL`);
  }
  const openInstances = [];
  for (const alert of alerts.open) {
    openInstances.push({
      alertNumber: alert.number,
      instances: await ghPaged(`/code-scanning/alerts/${alert.number}/instances?ref=${encodeURIComponent(targetRef)}`),
    });
  }

  evidence.codeql = {
    expectedCategories: requiredCategories,
    observedCategories: categories,
    exactAnalyses,
    alerts,
    openInstances,
  };
}

function sonarIssueIsMaterial(issue) {
  if (String(issue?.type || "").toUpperCase() === "VULNERABILITY") return true;
  if (["BLOCKER", "CRITICAL"].includes(String(issue?.severity || "").toUpperCase())) return true;
  return Array.isArray(issue?.impacts) && issue.impacts.some((impact) =>
    ["BLOCKER", "HIGH"].includes(String(impact?.severity || "").toUpperCase()),
  );
}

async function collectSonar(project) {
  const analyses = (await sonarPaged("/api/project_analyses/search", { project: project.projectKey, branch: sonarBranch }, "analyses", 100))
    .sort((a, b) => String(b.date).localeCompare(String(a.date)));
  const latestAnalysis = analyses[0] || null;
  if (!latestAnalysis) fail(`Sonar has no analysis for branch ${sonarBranch}`);
  if (latestAnalysis?.revision !== targetSha) {
    fail(`Sonar latest branch analysis drift: expected=${targetSha} latest=${latestAnalysis?.revision || "missing"}`);
  }
  const exactAnalyses = analyses.filter((analysis) => analysis?.revision === targetSha);
  if (!exactAnalyses[0]) fail(`Sonar analysis revision does not match ${targetSha}`);

  const qualityGate = await sonar("/api/qualitygates/project_status", { projectKey: project.projectKey, branch: sonarBranch });
  const issues = await sonarPaged("/api/issues/search", { componentKeys: project.projectKey, branch: sonarBranch, resolved: "false" }, "issues");
  const hotspots = await sonarPaged("/api/hotspots/search", { projectKey: project.projectKey, branch: sonarBranch }, "hotspots");
  const measures = await sonar("/api/measures/component", {
    component: project.projectKey,
    branch: sonarBranch,
    metricKeys: "ncloc,coverage,duplicated_lines_density,bugs,vulnerabilities,code_smells,security_hotspots,reliability_rating,security_rating,sqale_rating",
  });

  evidence.sonar = {
    organization: project.organization,
    projectKey: project.projectKey,
    latestAnalysis,
    exactAnalyses,
    qualityGate,
    issues,
    hotspots,
    measures,
  };
}

function finalizePolicy() {
  const openAlerts = evidence.codeql?.alerts?.open || [];
  const sonarIssues = evidence.sonar?.issues || [];
  const materialIssues = sonarIssues.filter(sonarIssueIsMaterial);
  const hotspots = evidence.sonar?.hotspots || [];
  const unreviewedHotspots = hotspots.filter((hotspot) => String(hotspot?.status || "").toUpperCase() !== "REVIEWED");
  const qualityGate = String(evidence.sonar?.qualityGate?.projectStatus?.status || "UNKNOWN");

  evidence.normalizedFindings = [
    ...openAlerts.map((alert) => ({
      source: "codeql", id: String(alert.number), state: alert.state,
      rule: alert?.rule?.id || "", severity: alert?.rule?.security_severity_level || alert?.rule?.severity || "",
      path: alert?.most_recent_instance?.location?.path || "", line: alert?.most_recent_instance?.location?.start_line ?? null,
      commitSha: alert?.most_recent_instance?.commit_sha || "", message: alert?.rule?.description || "", url: alert?.html_url || "",
      material: true,
    })),
    ...sonarIssues.map((issue) => ({
      source: "sonar", id: issue?.key || "", state: issue?.status || "", rule: issue?.rule || "",
      severity: issue?.severity || "", path: issue?.component || "", line: issue?.line ?? null,
      commitSha: targetSha, message: issue?.message || "", material: sonarIssueIsMaterial(issue),
    })),
    ...unreviewedHotspots.map((hotspot) => ({
      source: "sonar-hotspot", id: hotspot?.key || "", state: hotspot?.status || "", rule: hotspot?.ruleKey || "",
      severity: hotspot?.vulnerabilityProbability || "", path: hotspot?.component || "", line: hotspot?.line ?? null,
      commitSha: targetSha, message: hotspot?.message || "", material: true,
    })),
  ];

  const selectedWorkflows = evidence.workflows?.selected || {};
  const workflowConclusions = Object.fromEntries(
    Object.entries(selectedWorkflows).map(([name, run]) => [name, run?.conclusion || "unknown"]),
  );

  for (const name of ["BThwani Contextual CI", "CodeQL", "Remote Security"]) {
    if (workflowConclusions[name] !== "success") {
      evidence.policyFailures.push(
        `workflow_${name.replace(/[^A-Za-z0-9]+/g, "_").toLowerCase()}=${workflowConclusions[name] || "missing"}`,
      );
    }
  }

  if (workflowConclusions["SonarQube Cloud"] !== "success" && qualityGate === "OK") {
    evidence.policyFailures.push(`workflow_sonarqube_cloud=${workflowConclusions["SonarQube Cloud"] || "missing"}`);
  }

  if (openAlerts.length) evidence.policyFailures.push(`codeql_open_alerts=${openAlerts.length}`);
  if (qualityGate !== "OK") evidence.policyFailures.push(`sonar_quality_gate=${qualityGate}`);
  if (materialIssues.length) evidence.policyFailures.push(`sonar_material_issues=${materialIssues.length}`);
  if (unreviewedHotspots.length) evidence.policyFailures.push(`sonar_unreviewed_hotspots=${unreviewedHotspots.length}`);

  evidence.summary = {
    targetSha,
    targetRef,
    targetBranch,
    defaultBranch,
    evidenceComplete: true,
    workflows: workflowConclusions,
    policyStatus: evidence.policyFailures.length ? "FAIL" : "PASS",
    policyFailures: evidence.policyFailures,
    codeql: {
      exactAnalysisCount: evidence.codeql.exactAnalyses.length,
      openAlerts: openAlerts.length,
      totalAlertRecords: Object.values(evidence.codeql.alerts).reduce((count, rows) => count + rows.length, 0),
    },
    sonar: {
      revision: evidence.sonar.exactAnalyses[0]?.revision || null,
      qualityGate,
      unresolvedIssues: sonarIssues.length,
      materialIssues: materialIssues.length,
      hotspots: hotspots.length,
      unreviewedHotspots: unreviewedHotspots.length,
    },
  };
  evidence.evidenceComplete = true;
  evidence.policyStatus = evidence.summary.policyStatus;
}

async function main() {
  assertInputs();
  const project = readSonarProject();
  await waitForExactWorkflows();
  await collectCodeql();
  await collectSonar(project);
  finalizePolicy();
  emit(evidence.policyFailures.length ? 1 : 0);
}

main().catch((error) => {
  evidence.error = error instanceof Error ? error.message : String(error);
  emit(1);
});
