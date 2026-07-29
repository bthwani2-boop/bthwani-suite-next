import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const failures = [];

function fail(message) {
  failures.push(message);
}

function readText(relativePath) {
  const fullPath = path.join(repoRoot, relativePath);
  if (!fs.existsSync(fullPath)) {
    fail(`Missing readiness dependency: ${relativePath}`);
    return null;
  }
  return fs.readFileSync(fullPath, "utf8");
}

function readJson(relativePath) {
  const content = readText(relativePath);
  if (content === null) return null;
  try {
    return JSON.parse(content);
  } catch (error) {
    fail(`Invalid JSON in ${relativePath}: ${error.message}`);
    return null;
  }
}

function expectEqual(actual, expected, label) {
  if (actual !== expected) {
    fail(`${label} drift: expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}`);
  }
}

function expectNonEmpty(value, label) {
  if (typeof value !== "string" || value.trim() === "") {
    fail(`${label} must be a non-empty string`);
  }
}

function validateVerificationRoute(route, packageScripts, label) {
  expectNonEmpty(route, label);
  if (typeof route !== "string" || route.trim() === "") return;
  if (route.startsWith(".github/")) {
    if (!fs.existsSync(path.join(repoRoot, route))) {
      fail(`${label} references missing workflow path ${route}`);
    }
    return;
  }
  for (const match of route.matchAll(/\bpnpm\s+([A-Za-z0-9:_-]+)/g)) {
    const scriptName = match[1];
    if (["exec", "--dir"].includes(scriptName)) continue;
    if (!packageScripts?.[scriptName]) {
      fail(`${label} references missing package script ${scriptName}`);
    }
  }
  const nodeMatches = [...route.matchAll(/\bnode\s+([^\s&|]+)/g)];
  for (const match of nodeMatches) {
    const relativePath = match[1];
    if (!fs.existsSync(path.join(repoRoot, relativePath))) {
      fail(`${label} references missing Node entrypoint ${relativePath}`);
    }
  }
}

const policy = readJson("governance/refoundation/foundation-protection.policy.json");
const controlPlane = readJson("governance/refoundation/foundation-control-plane.json");
const readiness = readJson("governance/refoundation/foundation-readiness.json");
const packageJson = readJson("package.json");

if (policy && controlPlane && readiness) {
  expectEqual(readiness.schemaVersion, 1, "readiness schemaVersion");
  expectEqual(readiness.phase, policy.phase, "readiness phase");
  expectEqual(readiness.phase, controlPlane.phase, "readiness/control-plane phase");
  expectEqual(readiness.branch, policy.branch, "readiness branch");
  expectEqual(readiness.sourceBranch, policy.sourceBranch, "readiness sourceBranch");
  expectEqual(readiness.sourceCommit, policy.sourceCommit, "readiness sourceCommit");
  expectEqual(readiness.journeysStarted, false, "readiness journeysStarted");
  expectEqual(policy.journeysAllowed, false, "policy journeysAllowed");
  expectEqual(readiness.overallDecision, "NEEDS_EVIDENCE", "readiness overallDecision");

  if (readiness.candidateCommit !== null) {
    if (!/^[0-9a-f]{40}$/.test(readiness.candidateCommit ?? "")) {
      fail("readiness candidateCommit must be null or an exact 40-character commit SHA");
    }
    fail("candidateCommit must remain null until exact-commit execution evidence is attached");
  }

  for (const [claimName, expected] of Object.entries({
    implementationIsNotExecutionEvidence: true,
    staticPassIsNotRuntimeProof: true,
    remoteBuildRequiresRemoteEvidence: true,
    ciRequiresExactCommitEvidence: true,
    finalClosureForbiddenInFoundationPhase: true,
  })) {
    expectEqual(readiness.claimPolicy?.[claimName], expected, `readiness claimPolicy.${claimName}`);
  }

  const requiredDomainIds = new Set([
    "scope-and-authority",
    "toolchain-and-workspace",
    "mobile-expo-eas",
    "docker-and-data-plane",
    "contracts-and-openapi",
    "governance-skills-and-guards",
    "security-and-secrets",
    "github-actions",
    "journey-freeze",
  ]);
  const observedDomainIds = new Set();
  for (const domain of readiness.domains ?? []) {
    expectNonEmpty(domain?.id, "readiness domain id");
    if (!domain?.id) continue;
    if (observedDomainIds.has(domain.id)) fail(`Duplicate readiness domain: ${domain.id}`);
    observedDomainIds.add(domain.id);
    expectEqual(domain.implementationStatus, "IMPLEMENTED", `${domain.id} implementationStatus`);
    expectEqual(domain.evidenceStatus, "NEEDS_EVIDENCE", `${domain.id} evidenceStatus`);
    expectEqual(domain.decision, "NEEDS_EVIDENCE", `${domain.id} decision`);
    expectNonEmpty(domain.evidenceRequired, `${domain.id} evidenceRequired`);
    expectNonEmpty(domain.claimLimit, `${domain.id} claimLimit`);
    validateVerificationRoute(
      domain.verificationRoute,
      packageJson?.scripts ?? {},
      `${domain.id} verificationRoute`,
    );
  }
  for (const requiredId of requiredDomainIds) {
    if (!observedDomainIds.has(requiredId)) {
      fail(`Readiness ledger is missing required domain: ${requiredId}`);
    }
  }
  for (const observedId of observedDomainIds) {
    if (!requiredDomainIds.has(observedId)) {
      fail(`Readiness ledger contains unregistered domain: ${observedId}`);
    }
  }

  if ((readiness.exitBlockedBy ?? []).length < 6) {
    fail("Readiness ledger must retain all unresolved exit blockers");
  }
  for (const blocker of readiness.exitBlockedBy ?? []) {
    expectNonEmpty(blocker, "readiness exit blocker");
  }

  const serialized = JSON.stringify(readiness);
  for (const forbiddenDecision of ["CLOSED_WITH_EVIDENCE", "READY_FOR_RELEASE", "DEPLOYMENT_APPROVED"]) {
    if (serialized.includes(forbiddenDecision)) {
      fail(`Readiness ledger must not claim ${forbiddenDecision} during FOUNDATION_ONLY`);
    }
  }
}

if (failures.length > 0) {
  console.error("Refoundation readiness check failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(
  `Refoundation readiness check passed: decision=${readiness.overallDecision}, domains=${readiness.domains.length}, candidateCommit=${readiness.candidateCommit ?? "unrecorded"}.`,
);
