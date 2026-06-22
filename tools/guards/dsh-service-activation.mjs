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
const experienceFixRequired = /closureState:\s*["']FIX_REQUIRED["']/.test(manifest);

if (verified || experienceFixRequired) {
  const evidenceDirectory =
    "services/dsh/evidence/DSH-001-store-discovery-fullstack-multi-surface";
  const requiredEvidence = [
    "runtime-all.txt",
    "runtime-status.txt",
    "foundation-gate.txt",
    "slice-gate.txt",
    "dsh-test.txt",
    "go-test.txt",
    "go-build.txt",
    "api-health.txt",
    "api-readiness.txt",
    "api-stores.txt",
    "app-client-reverify.txt",
    "git-diff-check.txt",
    "screenshots/app-client-store-discovery-reverify.png",
    "screenshots/control-panel-stores-admin-success.png",
    "screenshots/control-panel-store-detail-panel.png",
    "screenshots/control-panel-error-or-service-unavailable.png",
    "screenshots/app-partner-store-context.png",
    "screenshots/app-field-store-verification.png",
    "screenshots/app-captain-store-pickup-context.png",
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
  ]) {
    if (!new RegExp(`\\b${field}:\\s*true\\b`).test(manifest)) {
      violations.push({
        file: "services/dsh/service.manifest.ts",
        message: `${field} must be true for runtime verification`,
      });
    }
  }
  const expectedClosureState = verified ? "RUNTIME_VERIFIED" : "FIX_REQUIRED";
  if (!new RegExp(`id:\\s*["']dsh\\.store\\.discovery["'][\\s\\S]*runtimeBound:\\s*true[\\s\\S]*closureState:\\s*["']${expectedClosureState}["']`).test(capabilityMap)) {
    violations.push({
      file: "services/dsh/capability-map.ts",
      message: `Store Discovery must be runtime-bound with closureState ${expectedClosureState}`,
    });
  }
  const expectedRuntimeState = verified ? "verified" : "experience-fix-required";
  if (!new RegExp(`capabilityId:\\s*["']dsh\\.store\\.discovery["'][\\s\\S]*backendImplemented:\\s*true[\\s\\S]*runtimeEvidence:\\s*["']services\\/dsh\\/evidence\\/DSH-001-store-discovery-fullstack-multi-surface["'][\\s\\S]*state:\\s*["']${expectedRuntimeState}["']`).test(runtimeMap)) {
    violations.push({
      file: "services/dsh/runtime-map.ts",
      message: `Store Discovery runtime map must point to evidence with state ${expectedRuntimeState}`,
    });
  }
  if (experienceFixRequired && !/\bscreensReady:\s*false\b/.test(manifest)) {
    violations.push({
      file: "services/dsh/service.manifest.ts",
      message: "screensReady must remain false while DSH-001 is FIX_REQUIRED",
    });
  }
  const crossSurfaceMap =
    "machine-readable/dsh-wlt/dsh_001_cross_surface_dependency_map.json";
  if (!fs.existsSync(path.join(repoRoot, crossSurfaceMap))) {
    violations.push({
      file: crossSurfaceMap,
      message: "DSH-001 runtime verification requires cross-surface dependency documentation",
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

// Consistency check: no runtime-verified capability consumed by a planned surface
if (capabilityMap) {
  const capBlocks = [];
  const capRegex = /\{\s*id:\s*["']([^"']+)["'][\s\S]*?status:\s*["']([^"']+)["'][\s\S]*?surfaces:\s*\[([^\]]*)\][\s\S]*?\}/g;
  let match;
  while ((match = capRegex.exec(capabilityMap)) !== null) {
    const id = match[1];
    const status = match[2];
    const surfaces = match[3].split(",").map(s => s.trim().replace(/["']/g, "")).filter(Boolean);
    capBlocks.push({ id, status, surfaces });
  }

  const surfaceMapText = fs.existsSync(path.join(repoRoot, "services/dsh/surface-map.ts"))
    ? read("services/dsh/surface-map.ts")
    : "";
  const surfBlocks = [];
  const surfRegex = /\{\s*surface:\s*["']([^"']+)["'][\s\S]*?capabilityIds:\s*\[([^\]]*)\][\s\S]*?implementationState:\s*["']([^"']+)["'][\s\S]*?\}/g;
  while ((match = surfRegex.exec(surfaceMapText)) !== null) {
    const surface = match[1];
    const capabilityIds = match[2].split(",").map(s => s.trim().replace(/["']/g, "")).filter(Boolean);
    const implementationState = match[3];
    surfBlocks.push({ surface, capabilityIds, implementationState });
  }

  for (const cap of capBlocks) {
    if (cap.status === "runtime-verified") {
      const consumingSurfaces = new Set([
        ...cap.surfaces,
        ...surfBlocks.filter(s => s.capabilityIds.includes(cap.id)).map(s => s.surface)
      ]);

      for (const surfaceName of consumingSurfaces) {
        const surfBlock = surfBlocks.find(s => s.surface === surfaceName);
        if (surfBlock && surfBlock.implementationState === "planned") {
          violations.push({
            file: "services/dsh/surface-map.ts",
            message: `Surface '${surfaceName}' consumes runtime-verified capability '${cap.id}' but its implementationState is still 'planned'`
          });
        }
      }
    }
  }
}

fail(guardId, violations);
