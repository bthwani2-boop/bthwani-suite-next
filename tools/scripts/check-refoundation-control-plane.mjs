import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "../..");
const failures = [];

function fail(message) {
  failures.push(message);
}

function exists(relativePath) {
  return fs.existsSync(path.join(repoRoot, relativePath));
}

function readText(relativePath) {
  const fullPath = path.join(repoRoot, relativePath);
  if (!fs.existsSync(fullPath)) {
    fail(`Missing required control-plane path: ${relativePath}`);
    return null;
  }
  return fs.readFileSync(fullPath, "utf8");
}

function readJson(relativePath) {
  const text = readText(relativePath);
  if (text === null) return null;
  try {
    return JSON.parse(text);
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

function indexById(entries, label) {
  const result = new Map();
  for (const entry of entries ?? []) {
    if (!entry?.id) {
      fail(`${label} contains an entry without id`);
      continue;
    }
    if (result.has(entry.id)) fail(`${label} contains duplicate id: ${entry.id}`);
    result.set(entry.id, entry);
  }
  return result;
}

const controlPlane = readJson(
  "governance/refoundation/foundation-control-plane.json",
);
const policy = readJson(
  "governance/refoundation/foundation-protection.policy.json",
);
const skillsRegistry = readJson("governance/skills/skills-registry.json");
const guardRegistry = readJson("governance/guards/guard-registry.json");
const authorityRegistry = readJson(
  "governance/authority/authority-precedence.json",
);
const packageJson = readJson("package.json");
const decisionIndex = readText("governance/00_DECISION_INDEX.md");

if (controlPlane && policy) {
  expectEqual(controlPlane.schemaVersion, 1, "control-plane schemaVersion");
  expectEqual(controlPlane.phase, policy.phase, "control-plane phase");
  expectEqual(controlPlane.branch, policy.branch, "control-plane branch");
  expectEqual(
    controlPlane.journeysAllowed,
    policy.journeysAllowed,
    "control-plane journeysAllowed",
  );

  for (const authorityPath of Object.values(controlPlane.authority ?? {})) {
    if (typeof authorityPath !== "string" || authorityPath.trim() === "") {
      fail("control-plane authority paths must be non-empty strings");
      continue;
    }
    if (!exists(authorityPath)) fail(`Missing authority path: ${authorityPath}`);
  }

  const humanPolicy = readText(controlPlane.authority?.humanPolicy ?? "");
  if (humanPolicy && !/^Status:\s*ACTIVE_CANONICAL\s*$/m.test(humanPolicy)) {
    fail("Foundation human policy must declare Status: ACTIVE_CANONICAL");
  }
}

const authorityDocuments = authorityRegistry?.documents ?? [];
const authorityByPath = new Map(
  authorityDocuments.map((entry) => [entry.path, entry]),
);
for (const [requiredPath, expectedClassification] of [
  ["governance/refoundation/FOUNDATION_ONLY_EXECUTION.md", "ACTIVE_CANONICAL"],
  ["governance/refoundation", "ACTIVE_CANONICAL"],
]) {
  const entry = authorityByPath.get(requiredPath);
  if (!entry) {
    fail(`Authority registry is missing refoundation path: ${requiredPath}`);
    continue;
  }
  expectEqual(
    entry.classification,
    expectedClassification,
    `authority classification ${requiredPath}`,
  );
  if (!decisionIndex?.includes(requiredPath)) {
    fail(`Decision index is missing refoundation path: ${requiredPath}`);
  }
}

const skillsById = indexById(skillsRegistry?.entries, "skills registry");
for (const requirement of controlPlane?.requiredSkills ?? []) {
  const skill = skillsById.get(requirement.id);
  if (!skill) {
    fail(`Required foundation skill is not registered: ${requirement.id}`);
    continue;
  }
  if (!(requirement.allowedStatus ?? []).includes(skill.status)) {
    fail(
      `Required foundation skill ${requirement.id} has disallowed status ${skill.status}`,
    );
  }
  expectEqual(
    skill.contract_level,
    "governed",
    `required foundation skill ${requirement.id} contract_level`,
  );
  if (!exists(`${skill.path}/SKILL.md`)) {
    fail(`Required foundation skill contract is missing: ${skill.path}/SKILL.md`);
  }
  for (const dependencyId of skill.depends_on ?? []) {
    const dependency = skillsById.get(dependencyId);
    if (!dependency) {
      fail(`Skill ${skill.id} depends on unknown skill ${dependencyId}`);
    } else if (dependency.status === "retired") {
      fail(`Skill ${skill.id} depends on retired skill ${dependencyId}`);
    }
  }
}

const guardsById = indexById(guardRegistry?.entries, "guard registry");
for (const requirement of controlPlane?.requiredGuards ?? []) {
  const guard = guardsById.get(requirement.id);
  if (!guard) {
    fail(`Required foundation guard is not registered: ${requirement.id}`);
    continue;
  }
  expectEqual(
    guard.exit_level,
    requirement.exitLevel,
    `required foundation guard ${requirement.id} exit_level`,
  );
  if (guard.source_file && !exists(guard.source_file)) {
    fail(`Required foundation guard source is missing: ${guard.source_file}`);
  }
  if (guard.script && !packageJson?.scripts?.[guard.script]) {
    fail(`Required foundation guard script is missing: ${guard.script}`);
  }
}

for (const [routeId, command] of Object.entries(
  controlPlane?.verificationRoutes ?? {},
)) {
  if (typeof command !== "string" || command.trim() === "") {
    fail(`Verification route ${routeId} must be a non-empty string`);
    continue;
  }
  if (routeId === "remoteCi") {
    if (!exists(command)) fail(`Remote CI route is missing: ${command}`);
    continue;
  }
  for (const match of command.matchAll(/\bpnpm\s+([a-zA-Z0-9:_-]+)/g)) {
    const scriptName = match[1];
    if (scriptName === "exec" || scriptName === "--dir") continue;
    if (!packageJson?.scripts?.[scriptName]) {
      fail(`Verification route ${routeId} references missing package script ${scriptName}`);
    }
  }
}

const readinessIds = new Set();
for (const domain of controlPlane?.readinessDomains ?? []) {
  if (!domain?.id) {
    fail("Readiness domain is missing id");
    continue;
  }
  if (readinessIds.has(domain.id)) fail(`Duplicate readiness domain: ${domain.id}`);
  readinessIds.add(domain.id);
  if (!skillsById.has(domain.owner)) {
    fail(`Readiness domain ${domain.id} references unknown owner skill ${domain.owner}`);
  }
  for (const requiredPath of domain.requiredPaths ?? []) {
    if (!exists(requiredPath)) {
      fail(`Readiness domain ${domain.id} is missing path ${requiredPath}`);
    }
  }
  for (const routeId of domain.requiredChecks ?? []) {
    if (!controlPlane?.verificationRoutes?.[routeId]) {
      fail(`Readiness domain ${domain.id} references unknown check ${routeId}`);
    }
  }
}

if ((controlPlane?.exitRequirements ?? []).length < 10) {
  fail("Foundation control plane must retain all ten exit requirements");
}

if (failures.length > 0) {
  console.error("Refoundation control-plane check failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(
  `Refoundation control-plane check passed: skills=${controlPlane.requiredSkills.length}, guards=${controlPlane.requiredGuards.length}, readinessDomains=${controlPlane.readinessDomains.length}.`,
);
