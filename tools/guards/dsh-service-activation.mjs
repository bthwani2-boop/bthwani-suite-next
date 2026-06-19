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
requirePattern(
  "services/dsh/service.manifest.ts",
  /\bbackendRuntimeReady:\s*false\b/,
  "manifest must not claim backend runtime readiness before evidence exists"
);
requirePattern(
  "services/dsh/service.manifest.ts",
  /\bclosureState:\s*["']NOT_APPROVED_YET["']/,
  "DSH-001 must remain not approved until its full implementation chain exists"
);
requirePattern(
  "services/dsh/capability-map.ts",
  /id:\s*["']dsh\.system\.readiness["'][\s\S]*runtimeBound:\s*false/,
  "system readiness capability must remain runtime-blocked"
);
requirePattern(
  "services/dsh/capability-map.ts",
  /id:\s*["']dsh\.store\.discovery["'][\s\S]*closureState:\s*["']NOT_APPROVED_YET["']/,
  "Store Discovery must be declared without a false closure claim"
);
requirePattern(
  "services/dsh/runtime-map.ts",
  /\bbackendImplemented:\s*false\b/,
  "runtime map must not claim a backend implementation"
);
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
  violations.push({
    file: "services/dsh/contracts/dsh.openapi.yaml",
    message: "Phase 10A must not invent Store Discovery endpoints"
  });
}

fail(guardId, violations);
