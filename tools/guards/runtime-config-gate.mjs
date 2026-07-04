import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fail, lineNumber, listCodeFiles, listFiles, read, repoRoot, toPosix } from "./_guard-utils.mjs";

const guardId = "runtime-config-gate";
const violations = [];
const warnings = [];

const closureFixRequired = ["FIX", "REQUIRED"].join("_");

// --- 1. Canonical Host Ports Checks (Error) ---
const allowedInternalFiles = new Set([
  "infra/docker/compose.runtime.yml",
  "infra/docker/runtime-profiles/dsh.runtime-profile.json",
  "infra/docker/runtime-profiles/wlt.runtime-profile.json",
  "infra/docker/runtime-profiles/dsh-wlt-link.runtime-profile.json",
  "infra/docker/env/dsh.runtime.env.example",
  "infra/docker/env/wlt.runtime.env.example",
  "services/dsh/backend/Dockerfile",
  "services/wlt/backend/Dockerfile",
  "services/dsh/backend/cmd/dsh-api/main.go",
  "services/wlt/backend/cmd/wlt-api/main.go",
]);

const portFiles = [
  ...listCodeFiles(),
  "apps/control-panel/runtime/package.json",
  "services/dsh/docker/RUNTIME_CONTRACT.md",
  "services/wlt/docker/RUNTIME_CONTRACT.md",
].filter((file, index, all) => all.indexOf(file) === index);

for (const file of portFiles) {
  const rel = toPosix(file);
  if (allowedInternalFiles.has(rel) || rel.includes("/tests/")) continue;
  const full = path.join(repoRoot, file);
  if (!fs.existsSync(full)) continue;
  const source = fs.readFileSync(full, "utf8");
  for (const match of source.matchAll(/https?:\/\/(?:localhost|127\.0\.0\.1|\[::1\]):(8080|8083|3000)\b/g)) {
    violations.push({
      file: rel,
      message: `forbidden host runtime URL ${match[0]}; use DSH 58080, WLT 58083, or control-panel 13000`,
    });
  }
}

const cpPackagePath = path.join(repoRoot, "apps/control-panel/runtime/package.json");
if (fs.existsSync(cpPackagePath)) {
  const controlPanelPackage = JSON.parse(fs.readFileSync(cpPackagePath, "utf8"));
  if (!String(controlPanelPackage.scripts?.dev ?? "").includes("--port 13000")) {
    violations.push({
      file: "apps/control-panel/runtime/package.json",
      message: "control-panel dev script must pin --port 13000",
    });
  }
}

// --- 2. Docker Runtime Profiles Checks (Warning) ---
const requiredDockerFiles = [
  "infra/docker/compose.runtime.yml",
  "infra/docker/runtime-profiles/00_RUNTIME_PROFILE_INDEX.md",
  "infra/docker/runtime-profiles/identity.runtime-profile.json",
  "infra/docker/runtime-profiles/dsh.runtime-profile.json",
  "infra/docker/runtime-profiles/wlt.runtime-profile.json",
  "infra/docker/runtime-profiles/dsh-wlt-link.runtime-profile.json",
  "infra/docker/scripts/smoke-runtime.ps1",
  "services/dsh/docker/RUNTIME_CONTRACT.md",
  "services/wlt/docker/RUNTIME_CONTRACT.md",
  "infra/data-plane/postgres/init/001_create_runtime_databases.sh",
  "services/dsh/database/migrations/.gitkeep",
  "services/dsh/database/seeds/local/.gitkeep",
  "services/dsh/database/indexes/.gitkeep",
  "services/dsh/evidence/docker/.gitkeep",
  "services/wlt/database/migrations/.gitkeep",
  "services/wlt/database/seeds/local/.gitkeep",
  "services/wlt/database/indexes/.gitkeep",
  "services/wlt/evidence/docker/.gitkeep",
  "infra/docker/env/runtime.env.example",
  "infra/docker/env/dsh.runtime.env.example",
  "infra/docker/env/wlt.runtime.env.example",
  "infra/docker/env/identity.runtime.env.example",
  "infra/docker/scripts/assert-runtime-profile.ps1",
  "infra/docker/scripts/smoke-identity-runtime.ps1",
  "infra/docker/scripts/smoke-dsh-runtime.ps1",
  "infra/docker/scripts/smoke-wlt-runtime.ps1",
  "services/dsh/backend/DOCKERFILE_PENDING.md",
  "services/wlt/backend/DOCKERFILE_PENDING.md",
  "services/dsh/database/README.md",
  "services/wlt/database/README.md",
  "services/dsh/evidence/docker/README.md",
  "services/wlt/evidence/docker/README.md"
];

const forbiddenDockerFiles = [
  "infra/docker/compose.local.yml",
  "infra/docker/compose.full.yml",
  "infra/docker/compose.slice.yml",
  "services/dsh/docker-compose.yml",
  "services/wlt/docker-compose.yml"
];

const forbiddenDonorTerms = [
  "bthwani-suite-local",
  "bthwani-local",
  "bthwani-dsh-api-local",
  "bthwani-wlt-api-local",
  "bthwani-dsh-postgres-local",
  "bthwani-wlt-postgres-local",
  "bthwani-auth-service-local",
  "dsh-postgres-data",
  "wlt-postgres-data"
];

for (const file of requiredDockerFiles) {
  if (!fs.existsSync(path.join(repoRoot, file))) {
    warnings.push({ file, message: "missing required Docker runtime foundation file" });
  }
}

for (const file of forbiddenDockerFiles) {
  if (fs.existsSync(path.join(repoRoot, file))) {
    warnings.push({ file, message: "forbidden extra compose file; use infra/docker/compose.runtime.yml only" });
  }
}

const profiles = [
  ["identity", "infra/docker/runtime-profiles/identity.runtime-profile.json", "bthwani-identity-api-runtime", 58082],
  ["dsh", "infra/docker/runtime-profiles/dsh.runtime-profile.json", "bthwani-dsh-api-runtime", 58080],
  ["wlt", "infra/docker/runtime-profiles/wlt.runtime-profile.json", "bthwani-wlt-api-runtime", 58083]
];

const DSH_ACTIVE_PREREQUISITES = [
  "services/dsh/backend/Dockerfile",
  "services/dsh/database/migrations/dsh-001_store_discovery.sql",
  "services/dsh/database/seeds/local/dsh-001_store_discovery.local.sql",
];

for (const [profile, file, container, hostPort] of profiles) {
  if (!fs.existsSync(path.join(repoRoot, file))) continue;

  const raw = fs.readFileSync(path.join(repoRoot, file), "utf8");
  let json;
  try {
    json = JSON.parse(raw);
  } catch (error) {
    warnings.push({ file, message: `invalid JSON: ${error.message}` });
    continue;
  }

  if (json.profile !== profile) {
    warnings.push({ file, message: `expected profile=${profile}` });
  }

  const allowedActive = profile === "dsh" || profile === "identity";
  const isActive = json.state === "ACTIVE" || (profile === "identity" && json.state === "ACTIVE_DSH001_PREREQUISITE");

  if (isActive && !allowedActive) {
    warnings.push({ file, message: `profile ${profile} is not allowed to be ACTIVE yet` });
  } else if (isActive && profile === "dsh") {
    const compose = fs.existsSync(path.join(repoRoot, "infra/docker/compose.runtime.yml")) ? read("infra/docker/compose.runtime.yml") : "";
    if (!compose.includes("dsh-api")) {
      warnings.push({ file, message: "state=ACTIVE requires dsh-api service in compose.runtime.yml" });
    }
    for (const prereq of DSH_ACTIVE_PREREQUISITES) {
      if (!fs.existsSync(path.join(repoRoot, prereq))) {
        warnings.push({ file, message: `state=ACTIVE requires ${prereq} to exist` });
      }
    }
  } else if (!isActive && json.state !== "RESERVED_NOT_ACTIVE") {
    warnings.push({ file, message: "expected state=RESERVED_NOT_ACTIVE, ACTIVE, or ACTIVE_DSH001_PREREQUISITE (identity only)" });
  }

  if (json.container !== container) {
    warnings.push({ file, message: `expected container=${container}` });
  }

  if (json.hostPort !== hostPort) {
    warnings.push({ file, message: `expected hostPort=${hostPort}` });
  }

  if (json.composeFile !== "infra/docker/compose.runtime.yml") {
    warnings.push({ file, message: "composeFile must be infra/docker/compose.runtime.yml" });
  }
}

const dshWltLinkProfilePath = "infra/docker/runtime-profiles/dsh-wlt-link.runtime-profile.json";
if (fs.existsSync(path.join(repoRoot, dshWltLinkProfilePath))) {
  const raw = fs.readFileSync(path.join(repoRoot, dshWltLinkProfilePath), "utf8");
  let linkProfile;
  try {
    linkProfile = JSON.parse(raw);
  } catch (e) {}

  if (linkProfile) {
    if (linkProfile.state !== "RESERVED_NOT_ACTIVE") {
      warnings.push({ file: dshWltLinkProfilePath, message: "expected RESERVED_NOT_ACTIVE" });
    }

    if (!String(linkProfile.rule ?? "").includes("WLT owns financial truth")) {
      warnings.push({ file: dshWltLinkProfilePath, message: "must preserve WLT financial truth rule" });
    }
  }
}

for (const file of requiredDockerFiles.filter((file) => fs.existsSync(path.join(repoRoot, file)))) {
  const content = read(file);
  for (const term of forbiddenDonorTerms) {
    if (content.includes(term)) {
      warnings.push({ file, message: `forbidden donor Docker term found: ${term}` });
    }
  }
}

if (fs.existsSync(path.join(repoRoot, "infra/docker/compose.runtime.yml"))) {
  const compose = read("infra/docker/compose.runtime.yml");

  if (!compose.includes("bthwani-postgres-runtime")) {
    warnings.push({ file: "infra/docker/compose.runtime.yml", message: "missing bthwani-postgres-runtime" });
  }

  if (!compose.includes("55432")) {
    warnings.push({ file: "infra/docker/compose.runtime.yml", message: "missing new runtime Postgres port 55432" });
  }

  if (compose.includes("minio/minio:latest")) {
    warnings.push({ file: "infra/docker/compose.runtime.yml", message: "forbidden minio/minio:latest; use BTHWANI_MINIO_IMAGE or pinned tag" });
  }

  if (!compose.includes("BTHWANI_MINIO_IMAGE")) {
    warnings.push({ file: "infra/docker/compose.runtime.yml", message: "missing BTHWANI_MINIO_IMAGE binding" });
  }

  if (!compose.includes("BTHWANI_POSTGRES_IMAGE")) {
    warnings.push({ file: "infra/docker/compose.runtime.yml", message: "missing BTHWANI_POSTGRES_IMAGE binding" });
  }
}

// --- 3. Go Backend Runtime Checks (Error) ---
const requiredGoFiles = [
  "services/dsh/backend/go.mod",
  "services/dsh/backend/cmd/dsh-api/main.go",
  "services/dsh/backend/Dockerfile",
  "infra/docker/compose.runtime.yml",
];

let hasGoPrereqs = true;
for (const file of requiredGoFiles) {
  if (!fs.existsSync(path.join(repoRoot, file))) {
    violations.push({ file, message: "required Go runtime artifact is missing" });
    hasGoPrereqs = false;
  }
}

if (hasGoPrereqs) {
  const dockerfile = read("services/dsh/backend/Dockerfile");
  const compose = read("infra/docker/compose.runtime.yml");

  if (!/\bgo build\b/.test(dockerfile)) {
    violations.push({
      file: "services/dsh/backend/Dockerfile",
      message: "Dockerfile must build the DSH Go binary",
    });
  }
  if (!/CMD\s*\[\s*["']\/app\/dsh-api["']\s*\]/.test(dockerfile)) {
    violations.push({
      file: "services/dsh/backend/Dockerfile",
      message: "Dockerfile must run /app/dsh-api",
    });
  }
  if (!/dsh-api:[\s\S]*dockerfile:\s*services\/dsh\/backend\/Dockerfile/.test(compose)) {
    violations.push({
      file: "infra/docker/compose.runtime.yml",
      message: "dsh-api must build from the service Go Dockerfile",
    });
  }

  for (const packageFile of ["package.json", "services/dsh/package.json"]) {
    if (fs.existsSync(path.join(repoRoot, packageFile))) {
      const packageJson = JSON.parse(read(packageFile));
      for (const [name, command] of Object.entries(packageJson.scripts ?? {})) {
        const script = String(command);
        if (
          /(backend|dsh-api)/i.test(`${name} ${script}`) &&
          /\b(node|tsx|ts-node|nodemon)\b/i.test(script)
        ) {
          violations.push({
            file: packageFile,
            message: `script '${name}' attempts to run the DSH backend with Node/TypeScript`,
          });
        }
      }
    }
  }

  const backendDirectory = path.join(repoRoot, "services/dsh/backend");
  for (const args of [["test", "./..."], ["build", "./..."]]) {
    const result = spawnSync("go", args, {
      cwd: backendDirectory,
      encoding: "utf8",
      shell: process.platform === "win32",
      env: process.env,
    });
    if (result.status !== 0) {
      violations.push({
        file: "services/dsh/backend",
        message: `go ${args.join(" ")} failed: ${(result.stderr || result.stdout).trim()}`,
      });
    }
  }
}

// --- 4. Performance Runtime Baseline Checks (Error) ---
const DSH_OPENAPI = 'services/dsh/contracts/dsh.openapi.yaml';
if (!fs.existsSync(path.join(repoRoot, DSH_OPENAPI))) {
  violations.push({ file: DSH_OPENAPI, message: "DSH OpenAPI contract missing" });
} else {
  const spec = read(DSH_OPENAPI);
  if (!/getDshHealth|\/health/.test(spec)) {
    violations.push({ file: DSH_OPENAPI, message: "DSH OpenAPI must expose a health endpoint (getDshHealth or /health)" });
  }
  if (!/getDshReadiness|\/readiness/.test(spec)) {
    violations.push({ file: DSH_OPENAPI, message: "DSH OpenAPI must expose a readiness endpoint (getDshReadiness or /readiness)" });
  }
}

const DSH_MANIFEST_BASE = 'services/dsh/service.manifest.ts';
if (!fs.existsSync(path.join(repoRoot, DSH_MANIFEST_BASE))) {
  violations.push({ file: DSH_MANIFEST_BASE, message: "DSH service manifest missing" });
} else {
  const manifest = read(DSH_MANIFEST_BASE);
  if (!/backendRuntimeReady/.test(manifest)) {
    console.warn("WARN: DSH service manifest missing backendRuntimeReady field");
  }
}

// --- 5. Service Fullstack Linkage Checks (Error) ---
const ACTIVE_SERVICES = ["dsh", "wlt"];
const RESERVED_SERVICES = ["knz", "arb", "amn", "esf", "mrf", "snd", "kwd"];

function requiredActivationFiles(serviceId) {
  return [
    `services/${serviceId}/SERVICE_BLUEPRINT.md`,
    `services/${serviceId}/service.manifest.ts`,
    `services/${serviceId}/contracts/${serviceId}.openapi.yaml`,
  ];
}

function validateActiveManifest(serviceId, manifestPath) {
  const content = read(manifestPath);

  if (!content.includes(`service: "${serviceId}"`) && !content.includes(`service: '${serviceId}'`)) {
    violations.push({ file: manifestPath, message: `active service manifest must declare service: "${serviceId}"` });
  }

  if (!content.includes("realService: true")) {
    violations.push({ file: manifestPath, message: "active service manifest must declare realService: true" });
  }

  if (!content.includes("activatesService: true")) {
    violations.push({ file: manifestPath, message: "active service manifest must declare activatesService: true" });
  }
}

for (const serviceId of ACTIVE_SERVICES) {
  for (const relPath of requiredActivationFiles(serviceId)) {
    if (!fs.existsSync(path.join(repoRoot, relPath))) {
      violations.push({ file: relPath, message: `active service ${serviceId} is missing ${path.basename(relPath)}` });
    }
  }

  const manifestPath = `services/${serviceId}/service.manifest.ts`;
  if (fs.existsSync(path.join(repoRoot, manifestPath))) {
    validateActiveManifest(serviceId, manifestPath);
  }
}

for (const serviceId of RESERVED_SERVICES) {
  const serviceRoot = `services/${serviceId}`;

  if (!fs.existsSync(path.join(repoRoot, serviceRoot))) {
    continue;
  }

  const activationFiles = requiredActivationFiles(serviceId);
  const present = activationFiles.filter(f => fs.existsSync(path.join(repoRoot, f)));

  if (present.length > 0 && present.length < activationFiles.length) {
    violations.push({
      file: serviceRoot,
      message: `is RESERVED but partially activated. Present: ${present.join(", ")}. Either complete activation intentionally or remove partial activation files.`
    });
  }

  if (present.length === activationFiles.length) {
    const manifestPath = `services/${serviceId}/service.manifest.ts`;
    const content = read(manifestPath);
    const activates = content.includes("activatesService: true") || content.includes("realService: true");

    if (activates) {
      violations.push({
        file: serviceRoot,
        message: "is RESERVED but declares active-service markers. Move it to ACTIVE_SERVICES intentionally before activation."
      });
    }
  }
}

// --- 6. DSH Service Activation Checks (Warning) ---
const requiredActivationFilesDsh = [
  "governance/13_DSH_SERVICE_ACTIVATION.md",
  "services/dsh/SERVICE_BLUEPRINT.md",
  "services/dsh/service.manifest.ts",
  "services/dsh/capability-map.ts",
  "services/dsh/surface-map.ts",
  "services/dsh/runtime-map.ts",
  "services/dsh/contracts/dsh.openapi.yaml"
];

for (const file of requiredActivationFilesDsh) {
  if (!fs.existsSync(path.join(repoRoot, file))) {
    warnings.push({ file, message: "required DSH activation artifact is missing" });
  }
}

function requirePattern(file, pattern, message) {
  const full = path.join(repoRoot, file);
  if (!fs.existsSync(full)) return;

  const content = read(file);
  if (!pattern.test(content)) {
    warnings.push({ file, message });
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

const dshManifest = fs.existsSync(path.join(repoRoot, "services/dsh/service.manifest.ts"))
  ? read("services/dsh/service.manifest.ts")
  : "";
const dshCapabilityMap = fs.existsSync(path.join(repoRoot, "services/dsh/capability-map.ts"))
  ? read("services/dsh/capability-map.ts")
  : "";
const dshRuntimeMap = fs.existsSync(path.join(repoRoot, "services/dsh/runtime-map.ts"))
  ? read("services/dsh/runtime-map.ts")
  : "";

const verified = /closureState:\s*["']RUNTIME_VERIFIED["']/.test(dshManifest);
const experienceFixRequired = new RegExp(`closureState:\\s*["']${closureFixRequired}["']`).test(dshManifest);

if (verified || experienceFixRequired) {
  for (const field of [
    "backendRuntimeReady",
    "generatedClientReady",
    "databaseReady",
  ]) {
    if (!new RegExp(`\\b${field}:\\s*true\\b`).test(dshManifest)) {
      warnings.push({
        file: "services/dsh/service.manifest.ts",
        message: `${field} must be true for runtime verification`,
      });
    }
  }
  const expectedClosureState = verified ? "RUNTIME_VERIFIED" : closureFixRequired;
  if (!new RegExp(`id:\\s*["']dsh\\.store\\.discovery["'][\\s\\S]*runtimeBound:\\s*true[\\s\\S]*closureState:\\s*["']${expectedClosureState}["']`).test(dshCapabilityMap)) {
    warnings.push({
      file: "services/dsh/capability-map.ts",
      message: `Store Discovery must be runtime-bound with closureState ${expectedClosureState}`,
    });
  }
  const expectedRuntimeState = verified ? "verified" : "experience-fix-required";
  if (!new RegExp(`capabilityId:\\s*["']dsh\\.store\\.discovery["'][\\s\\S]*backendImplemented:\\s*true[\\s\\S]*runtimeEvidence:\\s*["']services\\/dsh\\/evidence\\/Store Discovery-store-discovery-fullstack-multi-surface["'][\\s\\S]*state:\\s*["']${expectedRuntimeState}["']`).test(dshRuntimeMap)) {
    warnings.push({
      file: "services/dsh/runtime-map.ts",
      message: `Store Discovery runtime map must point to evidence with state ${expectedRuntimeState}`,
    });
  }
  if (experienceFixRequired && !/\bscreensReady:\s*false\b/.test(dshManifest)) {
    warnings.push({
      file: "services/dsh/service.manifest.ts",
      message: `screensReady must remain false while Store Discovery is ${closureFixRequired}`,
    });
  }
} else {
  if (!/\bbackendRuntimeReady:\s*false\b/.test(dshManifest)) {
    warnings.push({
      file: "services/dsh/service.manifest.ts",
      message: "backend readiness must remain false until Store Discovery is runtime-verified",
    });
  }
  if (!/\bclosureState:\s*["']NOT_APPROVED_YET["']/.test(dshManifest)) {
    warnings.push({
      file: "services/dsh/service.manifest.ts",
      message: "Store Discovery must remain not approved before runtime verification",
    });
  }
}

requirePattern(
  "services/dsh/contracts/dsh.openapi.yaml",
  /operationId:\s*getDshHealth[\s\S]*operationId:\s*getDshReadiness/,
  "DSH activation contract must expose health and readiness operations"
);

const openapiContent = fs.existsSync(path.join(repoRoot, "services/dsh/contracts/dsh.openapi.yaml"))
  ? read("services/dsh/contracts/dsh.openapi.yaml")
  : "";

if (/^\s*\/dsh\/stores(?:\/|:)/m.test(openapiContent)) {
  const dsh001Prerequisites = [
    "services/dsh/capabilities/store-discovery/evidence-plan.md",
    "services/dsh/backend/Dockerfile",
    "services/dsh/database/migrations/dsh-001_store_discovery.sql"
  ];
  const dsh001Active = dsh001Prerequisites.every((f) => fs.existsSync(path.join(repoRoot, f)));
  if (!dsh001Active) {
    warnings.push({
      file: "services/dsh/contracts/dsh.openapi.yaml",
      message: "Store Discovery endpoints require Store Discovery prerequisites: evidence-plan, Dockerfile, and migration must all exist"
    });
  }
}

if (dshCapabilityMap) {
  const capBlocks = [];
  const capRegex = /\{\s*id:\s*["']([^"']+)["'][\s\S]*?status:\s*["']([^"']+)["'][\s\S]*?surfaces:\s*\[([^\]]*)\][\s\S]*?\}/g;
  let match;
  while ((match = capRegex.exec(dshCapabilityMap)) !== null) {
    const id = match[1];
    const status = match[2];
    const surfaces = match[3].split(",").map(s => s.trim().replace(/["']/g, "")).filter(Boolean);
    capBlocks.push({ id, status, surfaces });
  }

  const surfaceMapText = fs.existsSync(path.join(repoRoot, "services/dsh/surface-map.ts")) ? read("services/dsh/surface-map.ts") : "";
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
          warnings.push({
            file: "services/dsh/surface-map.ts",
            message: `Surface '${surfaceName}' consumes runtime-verified capability '${cap.id}' but its implementationState is still 'planned'`
          });
        }
      }
    }
  }
}

// --- 7. No Memory Repo in Journey Runtime Checks (Error) ---
const memoryRegex = /\b(InMemory|MemoryRepository|memoryRepository|memoryRepo|new\s+Map\s*\(|memory\s+repo)\b/g;

for (const file of listCodeFiles()) {
  if (!file.startsWith("services/") && !file.startsWith("apps/")) continue;
  if (file.includes("/tests/") || file.includes("/test/") || file.includes(".test.") || file.includes(".spec.")) continue;

  const content = read(file);
  let match;
  while ((match = memoryRegex.exec(content))) {
    violations.push({
      file,
      line: lineNumber(content, match.index),
      message: `memory repository/runtime state is forbidden in journey runtime: ${match[0]}`
    });
  }
}

if (warnings.length > 0) {
  console.warn(`\nruntime-config-gate: ${warnings.length} WARNING(S)`);
  for (const warning of warnings) {
    console.warn(`- ${warning.file}${warning.line ? `:${warning.line}` : ""} ${warning.message}`);
  }
}

fail(guardId, violations);
