import fs from "node:fs";
import path from "node:path";
import { fail, read, repoRoot } from "./_guard-utils.mjs";

const guardId = "dsh-service-activation";
const violations = [];

const requiredFiles = [
  "governance/13_DSH_SERVICE_ACTIVATION.md",
  "services/dsh/SERVICE_BLUEPRINT.md",
  "services/dsh/service.manifest.ts",
  "services/dsh/capability-map.ts",
  "services/dsh/surface-map.ts",
  "services/dsh/runtime-map.ts",
  "services/dsh/contracts/dsh.openapi.yaml"
];

for (const file of requiredFiles) {
  if (!fs.existsSync(path.join(repoRoot, file))) {
    violations.push({ file, message: "required DSH activation artifact is missing" });
  }
}

function requirePattern(file, pattern, message) {
  const full = path.join(repoRoot, file);
  if (!fs.existsSync(full)) return;

  const content = read(file);
  if (!pattern.test(content)) {
    violations.push({ file, message });
  }
}

requirePattern(
  "services/dsh/service.manifest.ts",
  /\bservice:\s*["']dsh["']/,
  "manifest must declare DSH as the service"
);
requirePattern(
  "services/dsh/service.manifest.ts",
  /\brealService:\s*true\b/,
  "manifest must declare a real service"
);
requirePattern(
  "services/dsh/service.manifest.ts",
  /\bactivatesService:\s*true\b/,
  "manifest must explicitly activate DSH"
);
const manifest = fs.existsSync(path.join(repoRoot, "services/dsh/service.manifest.ts"))
  ? read("services/dsh/service.manifest.ts")
  : "";
const capabilityMap = fs.existsSync(path.join(repoRoot, "services/dsh/capability-map.ts"))
  ? read("services/dsh/capability-map.ts")
  : "";
const runtimeMap = fs.existsSync(path.join(repoRoot, "services/dsh/runtime-map.ts"))
  ? read("services/dsh/runtime-map.ts")
  : "";
const verified = /closureState:\s*["']RUNTIME_VERIFIED["']/.test(manifest);

if (verified) {
  const evidenceDirectory = "services/dsh/evidence/DSH-001-store-discovery";
  const requiredEvidence = [
    "runtime-all.txt",
    "runtime-smoke.txt",
    "docker-inspect-dsh-api.txt",
    "foundation-gate.txt",
    "slice-gate.txt",
    "go-test.txt",
    "go-build.txt",
    "api-list-stores.json",
    "minio-media-assets.txt",
    "screenshot-app-client-store-discovery.png",
  ];
  for (const evidence of requiredEvidence) {
    if (!fs.existsSync(path.join(repoRoot, evidenceDirectory, evidence))) {
      violations.push({
        file: `${evidenceDirectory}/${evidence}`,
        message: "runtime-verified DSH-001 requires this evidence artifact",
      });
    }
  }
  for (const field of [
    "backendRuntimeReady",
    "generatedClientReady",
    "databaseReady",
    "screensReady",
  ]) {
    if (!new RegExp(`\\b${field}:\\s*true\\b`).test(manifest)) {
      violations.push({
        file: "services/dsh/service.manifest.ts",
        message: `${field} must be true for runtime verification`,
      });
    }
  }
  if (!/id:\s*["']dsh\.store\.discovery["'][\s\S]*runtimeBound:\s*true[\s\S]*closureState:\s*["']RUNTIME_VERIFIED["']/.test(capabilityMap)) {
    violations.push({
      file: "services/dsh/capability-map.ts",
      message: "Store Discovery must be runtime-bound and runtime-verified",
    });
  }
  if (!/capabilityId:\s*["']dsh\.store\.discovery["'][\s\S]*backendImplemented:\s*true[\s\S]*runtimeEvidence:\s*["']services\/dsh\/evidence\/DSH-001-store-discovery["'][\s\S]*state:\s*["']verified["']/.test(runtimeMap)) {
    violations.push({
      file: "services/dsh/runtime-map.ts",
      message: "Store Discovery runtime map must point to verified evidence",
    });
  }
} else {
  if (!/\bbackendRuntimeReady:\s*false\b/.test(manifest)) {
    violations.push({
      file: "services/dsh/service.manifest.ts",
      message: "backend readiness must remain false until DSH-001 is runtime-verified",
    });
  }
  if (!/\bclosureState:\s*["']NOT_APPROVED_YET["']/.test(manifest)) {
    violations.push({
      file: "services/dsh/service.manifest.ts",
      message: "DSH-001 must remain not approved before runtime verification",
    });
  }
}
requirePattern(
  "services/dsh/contracts/dsh.openapi.yaml",
  /operationId:\s*getDshHealth[\s\S]*operationId:\s*getDshReadiness/,
  "DSH activation contract must expose health and readiness operations"
);

const openapi = fs.existsSync(
  path.join(repoRoot, "services/dsh/contracts/dsh.openapi.yaml")
)
  ? read("services/dsh/contracts/dsh.openapi.yaml")
  : "";

if (/^\s*\/dsh\/stores(?:\/|:)/m.test(openapi)) {
  const dsh001Prerequisites = [
    "services/dsh/capabilities/store-discovery/evidence-plan.md",
    "services/dsh/backend/Dockerfile",
    "services/dsh/database/migrations/dsh-001_store_discovery.sql"
  ];
  const dsh001Active = dsh001Prerequisites.every(
    (f) => fs.existsSync(path.join(repoRoot, f))
  );
  if (!dsh001Active) {
    violations.push({
      file: "services/dsh/contracts/dsh.openapi.yaml",
      message: "Store Discovery endpoints require DSH-001 prerequisites: evidence-plan, Dockerfile, and migration must all exist"
    });
  }
}

fail(guardId, violations);
