import fs from "node:fs";
import path from "node:path";import { fileURLToPath } from "node:url";

const repoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

const requiredFiles = [
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

const forbiddenFiles = [
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

const violations = [];

function exists(rel) {
  return fs.existsSync(path.join(repoRoot, rel));
}

function read(rel) {
  return fs.readFileSync(path.join(repoRoot, rel), "utf8");
}

function parseJson(rel) {
  try {
    return JSON.parse(read(rel));
  } catch (error) {
    violations.push(`${rel}: invalid JSON: ${error.message}`);
    return null;
  }
}

for (const file of requiredFiles) {
  if (!exists(file)) {
    violations.push(`${file}: missing required Docker runtime foundation file`);
  }
}

for (const file of forbiddenFiles) {
  if (exists(file)) {
    violations.push(`${file}: forbidden extra compose file; use infra/docker/compose.runtime.yml only`);
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
  if (!exists(file)) continue;

  const json = parseJson(file);
  if (!json) continue;

  if (json.profile !== profile) {
    violations.push(`${file}: expected profile=${profile}`);
  }

  const allowedActive = profile === "dsh" || profile === "identity";
  // identity uses ACTIVE_DSH001_PREREQUISITE to signal it's active as a Store Discovery auth prerequisite
  const isActive = json.state === "ACTIVE" || (profile === "identity" && json.state === "ACTIVE_DSH001_PREREQUISITE");

  if (isActive && !allowedActive) {
    violations.push(`${file}: profile ${profile} is not allowed to be ACTIVE yet`);
  } else if (isActive && profile === "dsh") {
    const compose = exists("infra/docker/compose.runtime.yml") ? read("infra/docker/compose.runtime.yml") : "";
    if (!compose.includes("dsh-api")) {
      violations.push(`${file}: state=ACTIVE requires dsh-api service in compose.runtime.yml`);
    }
    for (const prereq of DSH_ACTIVE_PREREQUISITES) {
      if (!exists(prereq)) {
        violations.push(`${file}: state=ACTIVE requires ${prereq} to exist`);
      }
    }
  } else if (!isActive && json.state !== "RESERVED_NOT_ACTIVE") {
    violations.push(`${file}: expected state=RESERVED_NOT_ACTIVE, ACTIVE, or ACTIVE_DSH001_PREREQUISITE (identity only)`);
  }

  if (json.container !== container) {
    violations.push(`${file}: expected container=${container}`);
  }

  if (json.hostPort !== hostPort) {
    violations.push(`${file}: expected hostPort=${hostPort}`);
  }

  if (json.composeFile !== "infra/docker/compose.runtime.yml") {
    violations.push(`${file}: composeFile must be infra/docker/compose.runtime.yml`);
  }
}

const linkProfile = exists("infra/docker/runtime-profiles/dsh-wlt-link.runtime-profile.json")
  ? parseJson("infra/docker/runtime-profiles/dsh-wlt-link.runtime-profile.json")
  : null;

if (linkProfile) {
  if (linkProfile.state !== "RESERVED_NOT_ACTIVE") {
    violations.push("infra/docker/runtime-profiles/dsh-wlt-link.runtime-profile.json: expected RESERVED_NOT_ACTIVE");
  }

  if (!String(linkProfile.rule ?? "").includes("WLT owns financial truth")) {
    violations.push("infra/docker/runtime-profiles/dsh-wlt-link.runtime-profile.json: must preserve WLT financial truth rule");
  }
}

for (const file of requiredFiles.filter((file) => exists(file))) {
  const content = read(file);

  for (const term of forbiddenDonorTerms) {
    if (content.includes(term)) {
      violations.push(`${file}: forbidden donor Docker term found: ${term}`);
    }
  }
}

if (exists("infra/docker/compose.runtime.yml")) {
  const compose = read("infra/docker/compose.runtime.yml");

  if (!compose.includes("bthwani-postgres-runtime")) {
    violations.push("infra/docker/compose.runtime.yml: missing bthwani-postgres-runtime");
  }

  if (!compose.includes("55432")) {
    violations.push("infra/docker/compose.runtime.yml: missing new runtime Postgres port 55432");
  }

  if (compose.includes("minio/minio:latest")) {
    violations.push("infra/docker/compose.runtime.yml: forbidden minio/minio:latest; use BTHWANI_MINIO_IMAGE or pinned tag");
  }

  if (!compose.includes("BTHWANI_MINIO_IMAGE")) {
    violations.push("infra/docker/compose.runtime.yml: missing BTHWANI_MINIO_IMAGE binding");
  }

  if (!compose.includes("BTHWANI_POSTGRES_IMAGE")) {
    violations.push("infra/docker/compose.runtime.yml: missing BTHWANI_POSTGRES_IMAGE binding");
  }
}

if (violations.length > 0) {
  console.error("docker-runtime-profiles: FAIL");
  for (const violation of violations) {
    console.error(`- ${violation}`);
  }
  process.exit(1);
}

console.log("docker-runtime-profiles: PASS");
