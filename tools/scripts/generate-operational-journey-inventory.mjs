import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { repoRoot, isExcluded, toPosix } from "../guards/_guard-utils.mjs";

const outDir = path.join(repoRoot, ".diagnostics", "operational-journey-factory");
fs.mkdirSync(outDir, { recursive: true });

function headSha() {
  try {
    return execSync("git rev-parse HEAD", { cwd: repoRoot, encoding: "utf8" }).trim();
  } catch {
    return "HEAD_UNAVAILABLE";
  }
}

function exists(rel) {
  return fs.existsSync(path.join(repoRoot, rel));
}

function listFiles(relRoot, matcher, files = []) {
  const absRoot = path.join(repoRoot, relRoot);
  if (!fs.existsSync(absRoot)) return files;
  for (const entry of fs.readdirSync(absRoot, { withFileTypes: true })) {
    const full = path.join(absRoot, entry.name);
    const rel = toPosix(path.relative(repoRoot, full));
    if (isExcluded(rel, entry.isDirectory(), entry.name)) continue;
    if (entry.isDirectory()) {
      listFiles(rel, matcher, files);
      continue;
    }
    if (matcher(rel)) files.push(rel);
  }
  return files;
}

function listFilesNoGeneratedExclusion(relRoot, matcher, files = []) {
  const absRoot = path.join(repoRoot, relRoot);
  if (!fs.existsSync(absRoot)) return files;
  for (const entry of fs.readdirSync(absRoot, { withFileTypes: true })) {
    const full = path.join(absRoot, entry.name);
    const rel = toPosix(path.relative(repoRoot, full));
    if (entry.isDirectory()) {
      if ([".git", "node_modules", ".pnpm-store", ".next", ".expo", ".turbo", ".nx", ".cache", "dist", "build", "out", "coverage"].includes(entry.name)) continue;
      listFilesNoGeneratedExclusion(rel, matcher, files);
      continue;
    }
    if (matcher(rel)) files.push(rel);
  }
  return files;
}

function operationRecords(file) {
  if (!exists(file)) return [];
  const records = [];
  const lines = fs.readFileSync(path.join(repoRoot, file), "utf8").split(/\r?\n/);
  let currentPath = "";
  let currentMethod = "";
  let currentTag = "";
  for (const line of lines) {
    const trimmed = line.trim();
    const pathMatch = trimmed.match(/^(\/[^:]+):$/);
    if (pathMatch) {
      currentPath = pathMatch[1];
      currentMethod = "";
      currentTag = "";
      continue;
    }
    const methodMatch = trimmed.match(/^(get|post|put|patch|delete|options|head):$/);
    if (methodMatch) {
      currentMethod = methodMatch[1].toUpperCase();
      currentTag = "";
      continue;
    }
    const inlineTagMatch = trimmed.match(/^tags:\s*\[?([A-Za-z0-9_-]+)/);
    if (inlineTagMatch) {
      currentTag = inlineTagMatch[1];
      continue;
    }
    const listTagMatch = trimmed.match(/^-\s*([A-Za-z0-9_-]+)$/);
    if (!currentTag && listTagMatch && currentMethod) {
      currentTag = listTagMatch[1];
      continue;
    }
    const operationMatch = trimmed.match(/^operationId:\s*([A-Za-z0-9_]+)/);
    if (operationMatch) {
      const service = file.split("/")[1] || file.split("/")[0] || "repo";
      const root = currentPath.split("/").filter(Boolean)[0] || "root";
      records.push({
        operation_id: operationMatch[1],
        source_path: file,
        service,
        path: currentPath,
        method: currentMethod,
        tag: currentTag || root,
        journey_group_key: `${service}:${currentTag || root}`
      });
    }
  }
  return records;
}

const sourceFiles = {
  service_blueprint: "services/dsh/SERVICE_BLUEPRINT.md",
  service_manifest: "services/dsh/service.manifest.ts",
  runtime_map: "services/dsh/runtime-map.ts",
  capability_map: "services/dsh/capability-map.ts",
  dsh_operational_registry: "services/dsh/frontend/shared/operations/dsh-operational-registry.ts",
  cross_surface_closure_map: "services/dsh/frontend/shared/runtime/dsh-cross-surface-closure-map.ts",
  dsh_openapi: "services/dsh/contracts/dsh.openapi.yaml",
  wlt_openapi: "services/wlt/contracts/wlt.openapi.yaml",
  identity_openapi: "core/identity/contracts/auth.openapi.yaml"
};

const openapiFiles = listFiles(".", (rel) => rel.endsWith(".openapi.yaml"));
const generatedClients = listFilesNoGeneratedExclusion(".", (rel) => /\/clients\/generated\/.*\.(ts|tsx)$/.test(rel));
const backendRoutes = listFiles("services", (rel) => /\.(go|ts|js)$/.test(rel) && /backend/.test(rel) && /(route|router|server|http|handler)/i.test(rel));
const frontendSurfaces = listFiles("services", (rel) => /frontend\/.*\.(tsx|ts|jsx|js)$/.test(rel) && /(Screen|page|Route|Navigator|Tab|Section|Panel)/.test(rel));

const proposedJourneys = [];
const operationGroups = new Map();
for (const file of openapiFiles) {
  for (const record of operationRecords(file)) {
    proposedJourneys.push({
      journey_id: `api:${record.operation_id}`,
      source_path: file,
      status: "PROPOSED_UNFILLED",
      required_action: "classify_multi_surface_bindings",
      operation_id: record.operation_id,
      method: record.method,
      path: record.path,
      journey_group_key: record.journey_group_key
    });
    const group = operationGroups.get(record.journey_group_key) || {
      journey_group_id: `journey:${record.journey_group_key}`,
      source: "OpenAPI operation grouping",
      status: "PROPOSED_UNFILLED",
      segmentation_rule: "business_outcome_fullstack_multi_surface",
      required_action: "expand_group_to_all_affected_surfaces_tabs_backend_api_database_runtime_ci_and_cleanup_decisions",
      service: record.service,
      tag_or_root: record.tag,
      operations: [],
      required_surface_policy: "no_single_surface_journey_without_verified_exclusion"
    };
    group.operations.push({
      operation_id: record.operation_id,
      method: record.method,
      path: record.path,
      source_path: record.source_path
    });
    operationGroups.set(record.journey_group_key, group);
  }
}

const inventory = {
  head_sha: headSha(),
  status: "DISCOVERY_ONLY",
  source_files: Object.fromEntries(Object.entries(sourceFiles).map(([key, rel]) => [key, { path: rel, exists: exists(rel) }])),
  openapi_files: openapiFiles,
  generated_clients: generatedClients,
  backend_routes: backendRoutes,
  frontend_surfaces: frontendSurfaces,
  package_scripts_source: "package.json",
  smart_segmentation_policy: {
    unit: "business_outcome_fullstack_multi_surface",
    split_when: ["different business outcome", "different state machine", "different owner boundary", "different WLT financial truth boundary", "different runtime or CI proof path"],
    merge_when: ["same user/system outcome", "same state chain", "same backend/API/database truth", "same affected surface set"],
    single_surface_allowed: "only_with_verified_exclusion"
  },
  proposed_journey_groups: Array.from(operationGroups.values()),
  proposed_journeys: proposedJourneys
};

fs.writeFileSync(path.join(outDir, "journey-inventory.json"), JSON.stringify(inventory, null, 2), "utf8");

const lines = [];
lines.push("# Operational Journey Inventory");
lines.push("");
lines.push(`head_sha: \`${inventory.head_sha}\``);
lines.push("status: `DISCOVERY_ONLY`");
lines.push("");
lines.push("## Source Files");
for (const [key, value] of Object.entries(inventory.source_files)) {
  lines.push(`- ${key}: \`${value.path}\` exists=${value.exists}`);
}
lines.push("");
lines.push("## Counts");
lines.push(`- OpenAPI files: ${openapiFiles.length}`);
lines.push(`- generated clients: ${generatedClients.length}`);
lines.push(`- backend route candidates: ${backendRoutes.length}`);
lines.push(`- frontend surface candidates: ${frontendSurfaces.length}`);
lines.push(`- proposed smart journey groups: ${inventory.proposed_journey_groups.length}`);
lines.push(`- proposed unfilled journeys: ${proposedJourneys.length}`);
lines.push("");
lines.push("## Smart Segmentation Policy");
lines.push("- Unit: business outcome across full-stack multi-surface scope.");
lines.push("- Single-surface journey is allowed only with verified exclusion evidence.");
lines.push("- Groups are proposals only and do not declare readiness.");

fs.writeFileSync(path.join(outDir, "journey-inventory.md"), lines.join("\n"), "utf8");
console.log("Operational journey inventory written to .diagnostics/operational-journey-factory");
