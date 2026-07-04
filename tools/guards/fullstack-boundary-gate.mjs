import fs from "node:fs";
import path from "node:path";
import { fail, findImportSpecifiers, lineNumber, listCodeFiles, read, repoRoot, toPosix } from "./_guard-utils.mjs";

const guardId = "fullstack-boundary-gate";
const violations = [];
const warnings = [];

const FRONTEND = path.join(repoRoot, "services/dsh/frontend");
const SHARED_DIR = path.join(FRONTEND, "shared");
const SURFACE_DIRS = [
  "control-panel",
  "app-client",
  "app-partner",
  "app-field",
  "app-captain",
];
const WLT_SURFACES = [
  "services/wlt/frontend/control-panel",
  "services/wlt/frontend/app-partner",
  "services/wlt/frontend/app-field",
  "services/wlt/frontend/app-client",
  "services/wlt/frontend/app-captain",
];
const closureFixRequired = ["FIX", "REQUIRED"].join("_");

// --- 1. DSH Frontend Shared Ownership Checks ---
const surfaceFiles = listCodeFiles().filter(f => SURFACE_DIRS.some(s => f.startsWith("services/dsh/frontend/" + s)));
const dshFrontendFiles = listCodeFiles().filter(f => f.startsWith("services/dsh/frontend/"));

for (const file of surfaceFiles) {
  const src = read(file);
  if (/\bfetch\(/.test(src)) {
    violations.push({ file, message: "direct fetch() call in surface — move to shared API adapter" });
  }
  if (/\baxios\b/.test(src)) {
    violations.push({ file, message: "axios import in surface — move to shared API adapter" });
  }
}

for (const file of surfaceFiles) {
  if (path.basename(file) === "index.ts") continue;
  const src = read(file);
  if (/from\s+["'][^"']*\.api["']/.test(src)) {
    violations.push({ file, message: "imports *.api directly — surface screens must use controllers (use-*-controller)" });
  }
}

const IMPORT_RE = /^(?:import|export)\s.*from\s+["']([^"']+)["']/gm;
const sharedFiles = listCodeFiles().filter(f => f.startsWith("services/dsh/frontend/shared/"));
for (const file of sharedFiles) {
  const src = read(file);
  for (const [, specifier] of src.matchAll(IMPORT_RE)) {
    for (const surface of SURFACE_DIRS) {
      if (specifier.includes(`/${surface}/`) || specifier === surface || specifier.startsWith(`${surface}/`)) {
        violations.push({ file, message: `shared imports from surface '${surface}' (specifier: ${specifier}) — forbidden` });
      }
    }
    if (specifier.includes("/apps/") || specifier.startsWith("apps/")) {
      violations.push({ file, message: `shared imports from apps/ runtime (specifier: ${specifier}) — forbidden` });
    }
  }
}

const DSH_ENV_RE = /process\.env(?:\.(?:NEXT_PUBLIC_DSH_API_BASE_URL|EXPO_PUBLIC_DSH_API_BASE_URL)|\s*\[\s*["'](?:NEXT_PUBLIC_DSH_API_BASE_URL|EXPO_PUBLIC_DSH_API_BASE_URL)["']\s*\])/;
for (const file of dshFrontendFiles) {
  if (file.includes("shared/_kernel")) continue;
  const src = read(file);
  if (DSH_ENV_RE.test(src)) {
    violations.push({ file, message: "direct DSH env var access outside shared/_kernel" });
  }
}

const STORE_TYPE_RE = /^(?:export\s+)?(?:type|interface)\s+([Ss]tore\w*)\s*[={<]/gm;
for (const file of surfaceFiles) {
  const src = read(file);
  for (const [, typeName] of src.matchAll(STORE_TYPE_RE)) {
    if (typeName.endsWith("Props") || typeName.endsWith("Ref")) continue;
    violations.push({ file, message: `domain Store type '${typeName}' defined in surface — move to shared/store` });
  }
}

for (const file of surfaceFiles) {
  const src = read(file);
  if (/from\s+["'][^"']*shared\/store\/[^"']+["']/.test(src)) {
    violations.push({ file, message: "deep import from shared/store — consume the public shared/store barrel" });
  }
}

const REQUIRED_SURFACE_BINDINGS = [
  {
    file: "services/dsh/frontend/app-client/store/StoreDiscoveryScreen.tsx",
    pattern: /\buseStoreDiscoveryController\b/,
    message: "StoreDiscoveryScreen must consume useStoreDiscoveryController",
  },
  {
    file: "services/dsh/frontend/control-panel/partners/stores/StoreManagementScreen.tsx",
    pattern: /\buseStoreAdminController\b/,
    message: "StoreManagementScreen must consume useStoreAdminController",
  },
  {
    file: "services/dsh/frontend/app-client/home-discovery/HomeDiscoveryScreen.tsx",
    pattern: /\buseHomeDiscoveryController\b/,
    message: "HomeDiscoveryScreen must consume useHomeDiscoveryController",
  },
  {
    file: "services/dsh/frontend/app-partner/store/PartnerStoreScreen.tsx",
    pattern: /\buseStoreRoleContextController\b/,
    message: "PartnerStoreScreen must consume useStoreRoleContextController",
  },
  {
    file: "services/dsh/frontend/app-field/stores/FieldStoreVerificationScreen.tsx",
    pattern: /\buseStoreRoleContextController\b/,
    message: "FieldStoreVerificationScreen must consume useStoreRoleContextController",
  },
  {
    file: "services/dsh/frontend/app-captain/store/CaptainStorePickupContextScreen.tsx",
    pattern: /\buseStoreRoleContextController\b/,
    message: "CaptainStorePickupContextScreen must consume useStoreRoleContextController",
  },
];

for (const binding of REQUIRED_SURFACE_BINDINGS) {
  const fullPath = path.join(repoRoot, binding.file);
  if (!fs.existsSync(fullPath)) {
    violations.push({ file: binding.file, message: "required surface screen is missing" });
  } else {
    const src = read(binding.file);
    if (!binding.pattern.test(src)) {
      violations.push({ file: binding.file, message: binding.message });
    }
  }
}

const REQUIRED_ROUTE_BINDINGS = [
  {
    file: "services/dsh/frontend/app-partner/DshPartnerRouteRenderer.tsx",
    pattern: /\bPartnerStoreScreen\b/,
    message: "DshPartnerRouteRenderer must route-bind PartnerStoreScreen",
  },
  {
    file: "services/dsh/frontend/app-partner/DshPartnerRouteRenderer.tsx",
    pattern: /\bPartnerCatalogManagementScreen\b/,
    message: "DshPartnerRouteRenderer must route-bind PartnerCatalogManagementScreen",
  },
  {
    file: "services/dsh/frontend/app-field/DshFieldRouteRenderer.tsx",
    pattern: /\bFieldStoreVerificationScreen\b/,
    message: "DshFieldRouteRenderer must route-bind FieldStoreVerificationScreen",
  },
  {
    file: "services/dsh/frontend/app-captain/DshCaptainRouteRenderer.tsx",
    pattern: /\bCaptainStorePickupContextScreen\b/,
    message: "DshCaptainRouteRenderer must route-bind CaptainStorePickupContextScreen",
  },
];

for (const binding of REQUIRED_ROUTE_BINDINGS) {
  const fullPath = path.join(repoRoot, binding.file);
  if (!fs.existsSync(fullPath)) {
    violations.push({ file: binding.file, message: "required route renderer is missing" });
  } else {
    const src = read(binding.file);
    if (!binding.pattern.test(src)) {
      violations.push({ file: binding.file, message: binding.message });
    }
  }
}

const controllerPath = "services/dsh/frontend/shared/store/use-store-role-context-controller.tsx";
if (fs.existsSync(path.join(repoRoot, controllerPath))) {
  const controllerSrc = read(controllerPath);
  if (!/dev\/read-only fallback/i.test(controllerSrc)) {
    violations.push({ file: controllerPath, message: "useStoreRoleContextController must document dev/read-only fallback comment" });
  }
} else {
  violations.push({ file: controllerPath, message: "required controller file is missing" });
}

for (const file of dshFrontendFiles) {
  if (/\bStoreCardPremiumItem\b/.test(read(file))) {
    violations.push({ file, message: "StoreCardPremiumItem duplicates DshStoreCardViewModel" });
  }
}

const RETIRED_PATHS = [
  "services/dsh/frontend/app-client/store-discovery",
  "services/dsh/frontend/shared/store-discovery",
  "services/dsh/frontend/control-panel/_skeleton-proof",
];
for (const retiredPath of RETIRED_PATHS) {
  const list = listCodeFiles().filter(f => f.startsWith(retiredPath + "/"));
  if (list.length > 0) {
    violations.push({ file: retiredPath, message: "retired DSH frontend path still contains source files" });
  }
}

const OLD_PORT_RE = /:(8080|8081|8082|8083|8084|3000)\b/;
for (const file of dshFrontendFiles) {
  const src = read(file);
  const match = OLD_PORT_RE.exec(src);
  if (match) {
    violations.push({ file, message: `hardcoded old port :${match[1]} — DSH API canonical port is 58080` });
  }
}

const RAW_HTML_RE = /<(?:button|input|select|table)\b/;
const cpFiles = surfaceFiles.filter(f => f.startsWith("services/dsh/frontend/control-panel/") && f.endsWith(".tsx"));
for (const file of cpFiles) {
  const src = read(file);
  if (RAW_HTML_RE.test(src)) {
    warnings.push({ file, message: "raw HTML interactive element in control-panel surface — prefer @bthwani/app-shell components" });
  }
}

// --- 2. DSH Frontend Shared Boundary Imports ---
const ALLOWED_EXCEPTIONS = new Set([
  "shouldShowCaptainAssignmentInCP",
  "updateLiveOrderDecision",
  "opsTheme",
  "getLiveOrderDecisions",
  "applyDiscoveryFilter",
  "fieldUploadDocument",
  "uploadFieldMedia",
  "mapPublishStageToPartnerActivationStatus",
  "dshPromotionCandidates",
  "defaultServiceModes",
  "shouldShowDshPartnerOrderConversation",
  "createDshOrderLifecycleHttpClient",
  "fetchDshRuntimeOrders",
  "mapRuntimeRowToPartnerOrderItem",
  "storeScopeOptions",
  "shouldEnterDispatchQueueForMode",
  "findDshControlPanelGovernanceSectionByFlowId",
  "mapOperationsDecisionToLifecycle"
]);

const tsconfigPath = path.join(repoRoot, "tsconfig.base.json");
const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, "utf8"));
const aliases = tsconfig?.compilerOptions?.paths ?? {};

function resolveSpecifier(file, specifier) {
  for (const [alias, targets] of Object.entries(aliases)) {
    const target = targets[0];
    if (!target) continue;
    if (specifier === alias) {
      return target;
    }
    if (alias.endsWith("/*") && specifier.startsWith(alias.slice(0, -2))) {
      const sub = specifier.slice(alias.length - 2);
      return target.replace(/\/\*$/, sub);
    }
  }

  if (specifier.startsWith(".") || specifier.startsWith("..")) {
    const baseDir = path.dirname(file);
    const resolved = path.resolve(repoRoot, baseDir, specifier);
    return toPosix(path.relative(repoRoot, resolved));
  }

  return specifier;
}

function getNamedImports(content, importIndex) {
  const stmt = content.slice(importIndex, importIndex + 800);
  const match = stmt.match(/^import\s+{([\s\S]*?)}\s+from/);
  if (!match) return [];

  const braceContent = match[1];
  return braceContent
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => {
      let name = s;
      if (name.startsWith("type ")) {
        name = name.slice(5).trim();
      }
      const parts = name.split(/\s+as\s+/);
      return parts[0].trim();
    });
}

const forbiddenVerbs = [
  "fetch", "submit", "create", "update", "mutate", "govern", "post",
  "put", "patch", "delete", "confirm", "finalize", "settle", "payout", "refund"
];

for (const file of listCodeFiles()) {
  const isShared = file.startsWith("services/dsh/frontend/shared/");
  let currentSurface = null;
  for (const s of SURFACE_DIRS) {
    if (file.startsWith(`services/dsh/frontend/${s}/`)) {
      currentSurface = s;
      break;
    }
  }

  if (!isShared && !currentSurface) continue;

  const content = read(file);
  const specs = findImportSpecifiers(content);

  for (const { specifier, index } of specs) {
    const resolved = resolveSpecifier(file, specifier);
    if (resolved.includes("node_modules/")) continue;

    if (currentSurface) {
      for (const other of SURFACE_DIRS) {
        if (other === currentSurface) continue;
        if (resolved.startsWith(`services/dsh/frontend/${other}/`)) {
          violations.push({
            file,
            line: lineNumber(content, index),
            message: `FORBIDDEN: importing from other surface '${other}' (resolved: ${resolved})`
          });
        }
      }

      if (
        resolved.startsWith("services/dsh/backend/") ||
        resolved.startsWith("services/dsh/clients/") ||
        resolved.startsWith("services/dsh/generated/") ||
        resolved.startsWith("services/wlt/backend/") ||
        resolved.startsWith("services/wlt/clients/") ||
        resolved.startsWith("services/wlt/generated/") ||
        resolved.endsWith(".api") ||
        resolved.includes(".api.") ||
        resolved.includes(".api/") ||
        resolved.endsWith(".controller-core") ||
        resolved.includes(".controller-core.") ||
        resolved.includes(".controller-core/")
      ) {
        violations.push({
          file,
          line: lineNumber(content, index),
          message: `FORBIDDEN: importing backend/client/generated/api/controller-core directly (resolved: ${resolved})`
        });
      }

      if (resolved.startsWith("services/dsh/frontend/shared/") || resolved.startsWith("services/wlt/frontend/shared/dsh/")) {
        const symbols = getNamedImports(content, index);
        for (const sym of symbols) {
          if (ALLOWED_EXCEPTIONS.has(sym)) continue;

          if (forbiddenVerbs.some((verb) => sym.startsWith(verb))) {
            violations.push({
              file,
              line: lineNumber(content, index),
              message: `FORBIDDEN: importing execution function '${sym}' from shared/boundary brain (resolved: ${resolved})`
            });
          }

          const firstChar = sym.charAt(0);
          const isLowercase = firstChar === firstChar.toLowerCase() && firstChar !== firstChar.toUpperCase();
          if (isLowercase) {
            const isAllowedPrefix =
              sym.startsWith("use") ||
              sym.startsWith("to") ||
              sym.startsWith("format") ||
              sym.startsWith("resolve") ||
              sym.startsWith("build") ||
              sym.startsWith("get") ||
              sym.startsWith("filter") ||
              sym.startsWith("is") ||
              sym.startsWith("next") ||
              sym.startsWith("translate") ||
              sym.startsWith("wlt");
            if (!isAllowedPrefix) {
              violations.push({
                file,
                line: lineNumber(content, index),
                message: `FORBIDDEN: importing non-controller/non-view-model camelCase symbol '${sym}' from shared/boundary brain (resolved: ${resolved})`
              });
            }
          }
        }
      }

      if (currentSurface === "app-field" && resolved.startsWith("services/wlt/")) {
        const isAllowedWltImport =
          resolved.startsWith("services/wlt/frontend/shared/dsh/") &&
          (
            resolved === "services/wlt/frontend/shared/dsh/index" ||
            resolved === "services/wlt/frontend/shared/dsh/index.ts" ||
            resolved.endsWith(".types") ||
            resolved.endsWith(".types.ts") ||
            resolved.endsWith(".states") ||
            resolved.endsWith(".states.ts") ||
            resolved.endsWith(".view-model") ||
            resolved.endsWith(".view-model.ts") ||
            resolved.endsWith(".contract") ||
            resolved.endsWith(".contract.ts") ||
            (resolved.includes("use-") && (resolved.endsWith("-controller") || resolved.endsWith("-controller.tsx")))
          );
        if (!isAllowedWltImport) {
          violations.push({
            file,
            line: lineNumber(content, index),
            message: `FORBIDDEN: app-field is only allowed to consume read-only references from whitelisted files in services/wlt/frontend/shared/dsh/ (resolved: ${resolved})`
          });
        }
      }
    }

    if (isShared) {
      for (const s of SURFACE_DIRS) {
        if (resolved.startsWith(`services/dsh/frontend/${s}/`)) {
          violations.push({
            file,
            line: lineNumber(content, index),
            message: `FORBIDDEN: shared brain importing from surface '${s}'`
          });
        }
      }
      if (resolved.startsWith("apps/")) {
        violations.push({
          file,
          line: lineNumber(content, index),
          message: `FORBIDDEN: shared brain importing from apps runtime (resolved: ${resolved})`
        });
      }
    }
  }
}

// --- 3. WLT DSH Frontend Shared Ownership ---
const REQUIRED_BOUNDARY_FILES = [
  "services/wlt/frontend/shared/dsh/index.ts",
  "services/wlt/frontend/shared/dsh/wlt-dsh-boundary.types.ts",
  "services/wlt/frontend/shared/dsh/wlt-dsh-reference.view-model.ts",
  "services/wlt/frontend/shared/dsh/wlt-dsh-reference.states.ts",
  "services/wlt/frontend/shared/dsh/wlt-dsh-api-base-url.ts",
  "services/wlt/frontend/shared/dsh/wlt-dsh-reference.api.ts",
  "services/wlt/frontend/shared/dsh/use-wlt-dsh-reference-controller.tsx",
  "services/wlt/frontend/shared/dsh/wlt-dsh-field-commission.types.ts",
  "services/wlt/frontend/shared/dsh/wlt-dsh-field-commission.states.ts",
  "services/wlt/frontend/shared/dsh/wlt-dsh-field-commission.view-model.ts",
  "services/wlt/frontend/shared/dsh/use-wlt-dsh-field-commission-reference-controller.tsx",
];

for (const rel of REQUIRED_BOUNDARY_FILES) {
  if (!fs.existsSync(path.join(repoRoot, rel))) {
    violations.push({ file: rel, message: "MISSING required WLT-for-DSH boundary file" });
  }
}

const wltManifest = "services/wlt/service.manifest.ts";
const WLT_000_EVIDENCE_DIR = "services/wlt/evidence/WLT Foundation-runtime-foundation";
const WLT_000_SLICE_GATE = path.join(repoRoot, WLT_000_EVIDENCE_DIR, "journey-gate.txt");
const WLT_000_API_HEALTH = path.join(repoRoot, WLT_000_EVIDENCE_DIR, "api-health.txt");

if (fs.existsSync(path.join(repoRoot, wltManifest))) {
  const content = read(wltManifest);
  if (content.includes("sliceRuntimeVerified: true")) {
    const evidenceExists =
      fs.existsSync(path.join(repoRoot, WLT_000_EVIDENCE_DIR)) &&
      fs.existsSync(WLT_000_SLICE_GATE) &&
      fs.existsSync(WLT_000_API_HEALTH);
    if (!evidenceExists) {
      violations.push({
        file: wltManifest,
        message: `FORBIDDEN: sliceRuntimeVerified: true requires evidence at ${WLT_000_EVIDENCE_DIR} (journey-gate.txt + api-health.txt). Evidence is missing.`,
      });
    }
  }
}

const wltIndexPath = "services/wlt/frontend/shared/dsh/index.ts";
if (fs.existsSync(path.join(repoRoot, wltIndexPath))) {
  const content = read(wltIndexPath);
  const specs = findImportSpecifiers(content);
  for (const { specifier } of specs) {
    if (!existsResolved(wltIndexPath, specifier)) {
      violations.push({
        file: wltIndexPath,
        message: `BROKEN EXPORT: file does not exist for specifier '${specifier}'`
      });
    }
  }
}

function existsResolved(baseFile, specifier) {
  const baseDir = path.dirname(path.join(repoRoot, baseFile));
  const target = path.resolve(baseDir, specifier);
  const candidates = [
    target,
    `${target}.ts`,
    `${target}.tsx`,
    `${target}.js`,
    `${target}.jsx`,
    `${target}.mjs`,
    `${target}.json`,
    path.join(target, "index.ts"),
    path.join(target, "index.tsx"),
    path.join(target, "index.js"),
    path.join(target, "index.jsx"),
    path.join(target, "index.mjs")
  ];

  if (specifier.endsWith(".js")) {
    const tsBase = target.slice(0, -3);
    candidates.push(`${tsBase}.ts`, `${tsBase}.tsx`);
  }

  return candidates.some((candidate) => fs.existsSync(candidate));
}

const wltSharedDshPath = "services/wlt/frontend/shared/dsh/";
const approvalPath = path.join(repoRoot, wltSharedDshPath, ".wlt-mutation-approved");
const mutationApproved = fs.existsSync(approvalPath);

for (const file of listCodeFiles()) {
  if (!file.startsWith(wltSharedDshPath)) continue;

  const content = read(file);

  if (!mutationApproved) {
    const httpMutationRegex = /\bmethod\s*:\s*["'](?:POST|PUT|PATCH|DELETE)["']/i;
    if (httpMutationRegex.test(content)) {
      violations.push({ file, message: "FORBIDDEN: mutation HTTP method in read-only boundary file" });
    }
  }

  const mutationFuncRegexes = [
    /\b(?:export\s+)?(?:async\s+)?function\s+((?:create|update|mutate|confirm|finalize|settle|post|refund|payout)\w*)\b/g,
    /\b(?:export\s+)?const\s+((?:create|update|mutate|confirm|finalize|settle|post|refund|payout)\w*)\s*=\s*(?:async\s*)?(?:\([^)]*\)|[a-zA-Z_]\w*)\s*=>/g,
    /\b(?:export\s+)?const\s+((?:create|update|mutate|confirm|finalize|settle|post|refund|payout)\w*)\s*=\s*(?:async\s*)?function\b/g
  ];

  for (const regex of mutationFuncRegexes) {
    let match;
    while ((match = regex.exec(content))) {
      violations.push({ file, message: `FORBIDDEN: mutation function declaration '${match[1]}' in read-only boundary` });
    }
  }

  const ledgerMutationRegex = /\b(?:ledger_mutation|ledgermutation|ledgerMutation)\b/gi;
  if (ledgerMutationRegex.test(content)) {
    violations.push({ file, message: "FORBIDDEN: ledger mutation reference in read-only boundary" });
  }

  const localhostRegex = /\bhttp:\/\/(?:localhost|127\.0\.0\.1)\b/i;
  if (localhostRegex.test(content)) {
    violations.push({ file, message: "FORBIDDEN: hardcoded localhost fallback is not allowed inside shared WLT boundary" });
  }
}

const DSH_SURFACE_SCOPES = [
  "services/dsh/frontend/control-panel/",
  "services/dsh/frontend/app-client/",
  "services/dsh/frontend/app-partner/",
  "services/dsh/frontend/app-field/",
  "services/dsh/frontend/app-captain/",
];

for (const file of listCodeFiles()) {
  const posix = toPosix(file);
  const matchedSurface = DSH_SURFACE_SCOPES.find((s) => posix.startsWith(s));
  if (!matchedSurface) continue;

  const content = read(file);
  const specs = findImportSpecifiers(content);

  for (const { specifier } of specs) {
    const resolved = resolveSpecifier(file, specifier);

    if (resolved.startsWith("services/wlt/")) {
      if (
        resolved.startsWith("services/wlt/backend/") ||
        resolved.startsWith("services/wlt/clients/") ||
        resolved.startsWith("services/wlt/generated/")
      ) {
        violations.push({ file, message: `FORBIDDEN: DSH surface importing WLT backend/clients/generated directly (resolved: ${resolved})` });
      }

      if (
        resolved.endsWith(".api") ||
        resolved.includes(".api.") ||
        resolved.includes(".api/") ||
        resolved.endsWith(".controller-core") ||
        resolved.includes(".controller-core.") ||
        resolved.includes(".controller-core/")
      ) {
        violations.push({ file, message: `FORBIDDEN: DSH surface importing WLT API/controller-core directly (resolved: ${resolved})` });
      }

      if (posix.startsWith("services/dsh/frontend/app-field/")) {
        const isAllowedWltImport =
          resolved.startsWith("services/wlt/frontend/shared/dsh/") &&
          (
            resolved === "services/wlt/frontend/shared/dsh/index" ||
            resolved === "services/wlt/frontend/shared/dsh/index.ts" ||
            resolved.endsWith(".types") ||
            resolved.endsWith(".types.ts") ||
            resolved.endsWith(".states") ||
            resolved.endsWith(".states.ts") ||
            resolved.endsWith(".view-model") ||
            resolved.endsWith(".view-model.ts") ||
            resolved.endsWith(".contract") ||
            resolved.endsWith(".contract.ts") ||
            (resolved.includes("use-") && (resolved.endsWith("-controller") || resolved.endsWith("-controller.tsx")))
          );
        if (!isAllowedWltImport) {
          violations.push({ file: message, message: `FORBIDDEN: app-field is only allowed to consume read-only references from whitelisted files in services/wlt/frontend/shared/dsh/ (resolved: ${resolved})` });
        }
      }
    }
  }
}

const WLT_DSH_SURFACE_SCOPES = [
  "services/wlt/frontend/app-client/",
  "services/wlt/frontend/control-panel/",
  "services/wlt/frontend/app-partner/",
  "services/wlt/frontend/app-field/",
  "services/wlt/frontend/app-captain/",
];

const FINANCIAL_MUTATION_PATTERNS = [
  /wallet_balance_mutation/,
  /payment_confirmation/,
  /refund_finalization/,
  /settlement_posting/,
  /ledger_entry_mutation/,
  /payout_decision_mutation/,
  /commission_finalization/,
  /\bmutateWallet\b/,
  /\bconfirmPayment\b/,
  /\bfinalizeRefund\b/,
  /\bpostSettlement\b/,
];

for (const file of listCodeFiles()) {
  const posix = toPosix(file);
  if (!WLT_DSH_SURFACE_SCOPES.some((s) => posix.startsWith(s))) continue;

  const content = read(file);
  for (const pattern of FINANCIAL_MUTATION_PATTERNS) {
    if (pattern.test(content)) {
      violations.push({ file, message: `FORBIDDEN: financial mutation pattern '${pattern.source}' in WLT-for-DSH surface — surfaces are read-only references` });
    }
  }
}

const DSH_SCOPES = [
  "services/dsh/frontend/",
  "apps/app-client/runtime/",
  "apps/control-panel/runtime/",
  "apps/app-partner/runtime/",
  "apps/app-field/runtime/",
  "apps/app-captain/runtime/",
];

const DSH_FINANCIAL_MUTATION_PATTERNS = [
  /wallet_balance_mutation/,
  /payment_confirmation/,
  /refund_finalization/,
  /settlement_posting/,
  /ledger_entry_mutation/,
  /\bmutateWallet\b/,
  /\bconfirmPayment\b/,
  /\bfinalizeRefund\b/,
];

for (const file of listCodeFiles()) {
  const posix = toPosix(file);
  if (!DSH_SCOPES.some((s) => posix.startsWith(s))) continue;

  const content = read(file);
  for (const pattern of DSH_FINANCIAL_MUTATION_PATTERNS) {
    if (pattern.test(content)) {
      violations.push({ file, message: `FORBIDDEN: DSH surface contains financial mutation '${pattern.source}' — only WLT owns financial mutations` });
    }
  }
}

// --- 4. Unified Fullstack Brain Checks ---
const DSH_SHARED_ABS = path.join(repoRoot, "services/dsh/frontend/shared");
const WLT_DSH_SHARED_ABS = path.join(repoRoot, "services/wlt/frontend/shared/dsh");

if (!fs.existsSync(DSH_SHARED_ABS)) violations.push({ file: "services/dsh/frontend/shared", message: "CRITICAL: DSH brain missing" });
if (!fs.existsSync(WLT_DSH_SHARED_ABS)) violations.push({ file: "services/wlt/frontend/shared/dsh", message: "CRITICAL: WLT-for-DSH brain missing" });

const APP_RUNTIME_BOOTSTRAPS = [
  "apps/control-panel/runtime",
  "apps/app-partner/runtime",
  "apps/app-field/runtime",
  "apps/app-client/runtime",
  "apps/app-captain/runtime",
];
for (const runtimePath of APP_RUNTIME_BOOTSTRAPS) {
  if (!fs.existsSync(path.join(repoRoot, runtimePath))) {
    violations.push({ file: runtimePath, message: "CRITICAL: app runtime bootstrap missing" });
  }
}

const FORBIDDEN_LOGIC_FILE_PATTERNS = [
  { re: /\.api\.(ts|tsx)$/, label: 'API adapter' },
  { re: /\.adapter\.(ts|tsx)$/, label: 'adapter' },
  { re: /\.repository\.(ts|tsx)$/, label: 'repository' },
  { re: /\.repo\.(ts|tsx)$/, label: 'repository' },
  { re: /\.controller\.(ts|tsx)$/, label: 'controller' },
  { re: /\.controller-core\.(ts|tsx)$/, label: 'controller-core' },
  { re: /\.state-machine\.(ts|tsx)$/, label: 'state machine' },
  { re: /\.states\.(ts|tsx)$/, label: 'state contract' },
  { re: /\.view-model\.(ts|tsx)$/, label: 'view-model' },
  { re: /\.validation\.(ts|tsx)$/, label: 'validation' },
  { re: /\.permission\.(ts|tsx)$/, label: 'permission' },
  { re: /\.permissions\.(ts|tsx)$/, label: 'permissions' },
  { re: /\.lifecycle\.(ts|tsx)$/, label: 'lifecycle' },
  { re: /\.contract\.(ts|tsx)$/, label: 'contract' },
  { re: /\.policy\.(ts|tsx)$/, label: 'policy' },
  { re: /\.rules\.(ts|tsx)$/, label: 'rules' },
  { re: /\.mapper\.(ts|tsx)$/, label: 'mapper' },
  { re: /\.normalizer\.(ts|tsx)$/, label: 'normalizer' },
];

const allSurfaces = [
  ...SURFACE_DIRS.map(s => "services/dsh/frontend/" + s),
  ...WLT_SURFACES
];

for (const file of listCodeFiles()) {
  const matchedSurface = allSurfaces.find(s => file.startsWith(s + "/"));
  if (!matchedSurface) continue;

  const name = path.basename(file);
  for (const { re, label } of FORBIDDEN_LOGIC_FILE_PATTERNS) {
    if (re.test(name)) {
      violations.push({ file, message: `${label} file '${name}' in surface — move to sovereign shared brain` });
    }
  }
}

const FORBIDDEN_DEFINITION_PATTERNS = [
  { re: /\bfetch\(/, label: 'direct fetch()' },
  { re: /\baxios\b/, label: 'axios' },
  { re: /\bprocess\.env\b/, label: 'process.env' },
  { re: /new URL\(/, label: 'URL construction (new URL)' },
  { re: /\blocalStorage\b/, label: 'localStorage' },
  { re: /\bsessionStorage\b/, label: 'sessionStorage' },
  { re: /\bAsyncStorage\b/, label: 'AsyncStorage' },
  { re: /\buseReducer\(/, label: 'useReducer (state machine in surface)' },
  { re: /\bcreateContext\(/, label: 'createContext (context ownership in surface)' },
  { re: /\bstatusMap\b/, label: 'statusMap (domain mapping in surface)' },
  { re: /\bstateMap\b/, label: 'stateMap (domain mapping in surface)' },
  { re: /\btransitionMap\b/, label: 'transitionMap (lifecycle in surface)' },
  { re: /\bcanActivate\b/, label: 'canActivate (permission decision in surface)' },
  { re: /\bcanApprove\b/, label: 'canApprove (permission decision in surface)' },
  { re: /\bcanReject\b/, label: 'canReject (permission decision in surface)' },
  { re: /\bcanCancel\b/, label: 'canCancel (permission decision in surface)' },
  { re: /\bcanSettle\b/, label: 'canSettle (permission decision in surface)' },
  { re: /\bcanRefund\b/, label: 'canRefund (permission decision in surface)' },
  { re: /\bcanPayout\b/, label: 'canPayout (permission decision in surface)' },
  { re: /\bisTransitionAllowed\b/, label: 'isTransitionAllowed (lifecycle decision in surface)' },
  { re: /\btoViewModel\b/, label: 'toViewModel (view-model derivation in surface)' },
  { re: /\bmapResponse\b/, label: 'mapResponse (API mapping in surface)' },
  { re: /\bderiveStatus\b/, label: 'deriveStatus (domain logic in surface)' },
  { re: /\bderivePermission\b/, label: 'derivePermission (permission logic in surface)' },
  { re: /\brolePolicy\b/, label: 'rolePolicy (policy ownership in surface)' },
  { re: /\bviewPolicy\b/, label: 'viewPolicy (policy ownership in surface)' },
];

const IMPORT_LINE_RE = /^\s*(?:import|export)\s+/;
function isLocalDefinition(src, matchIndex) {
  const lineStart = src.lastIndexOf('\n', matchIndex) + 1;
  const lineEnd = src.indexOf('\n', matchIndex);
  const line = src.slice(lineStart, lineEnd === -1 ? undefined : lineEnd);
  return !IMPORT_LINE_RE.test(line);
}

const dshSurfaceRoots = SURFACE_DIRS.map(s => "services/dsh/frontend/" + s);
for (const file of listCodeFiles()) {
  if (!dshSurfaceRoots.some(r => file.startsWith(r + "/"))) continue;

  const src = read(file);
  for (const { re, label } of FORBIDDEN_DEFINITION_PATTERNS) {
    const match = re.exec(src);
    if (match && isLocalDefinition(src, match.index)) {
      violations.push({ file, line: lineNumber(src, match.index), message: `FORBIDDEN definition: ${label} in surface` });
    }
  }
}

for (const file of listCodeFiles()) {
  if (!dshSurfaceRoots.some(r => file.startsWith(r + "/"))) continue;
  const src = read(file);
  if (/from\s+[''][^'"]*services\/wlt\/frontend\/shared/.test(src)) {
    violations.push({ file, message: "DSH surface imports WLT shared/dsh directly — route through DSH shared brain" });
  }
}

const DSH_SHARED_PREFIX = "services/dsh/frontend/shared/";
const WLT_DSH_SHARED_PREFIX = "services/wlt/frontend/shared/dsh/";

for (const file of listCodeFiles()) {
  if (!file.startsWith(DSH_SHARED_PREFIX) && !file.startsWith(WLT_DSH_SHARED_PREFIX)) continue;

  const src = read(file);
  for (const surfaceName of SURFACE_DIRS) {
    if (new RegExp(`from\\s+[''][^'"]*/${surfaceName}['"/]`).test(src)) {
      violations.push({ file, message: `Shared brain imports surface '${surfaceName}'` });
    }
  }
  if (/from\s+['"][^'"]*\/apps\//.test(src)) {
    violations.push({ file, message: "Shared brain imports from apps/ runtime" });
  }
}

const GAP_MARKERS = new RegExp(`\\b(${['FIX', 'REQUIRED'].join('_')}|TODO|${['UN', 'PROVEN'].join('')}|${['NOT', 'BOUND'].join('_')}|scaffold)\\b`, 'i');
for (const file of listCodeFiles()) {
  if (!dshSurfaceRoots.some(r => file.startsWith(r + "/"))) continue;
  const src = read(file);
  if (GAP_MARKERS.test(src)) {
    violations.push({ file, message: "contains closure gap marker (FIX_REQUIRED, TODO, etc.)" });
  }
}

const controllerMap = new Map();
const vmMap = new Map();
const dshSharedFiles = listCodeFiles().filter(f => f.startsWith("services/dsh/frontend/shared/"));
for (const file of dshSharedFiles) {
  const name = path.basename(file);
  if (/use-.*-controller\.(ts|tsx)$/.test(name)) {
    const key = name.replace(/\.(ts|tsx)$/, '');
    if (controllerMap.has(key)) {
      violations.push({ file, message: `Duplicate controller '${key}' found at ${file} and ${controllerMap.get(key)}` });
    } else {
      controllerMap.set(key, file);
    }
  }
  if (/\.view-model\.(ts|tsx)$/.test(name)) {
    const key = name.replace(/\.(ts|tsx)$/, '');
    if (vmMap.has(key)) {
      violations.push({ file, message: `Duplicate view-model '${key}' found at ${file} and ${vmMap.get(key)}` });
    } else {
      vmMap.set(key, file);
    }
  }
}

const CONTROLLER_BINDING_CHECKS = [
  {
    file: 'services/dsh/frontend/app-client/store/StoreDiscoveryScreen.tsx',
    pattern: /\buseStoreDiscoveryController\b/,
    label: 'StoreDiscoveryScreen must consume useStoreDiscoveryController',
  },
  {
    file: 'services/dsh/frontend/control-panel/partners/stores/StoreManagementScreen.tsx',
    pattern: /\buseStoreAdminController\b/,
    label: 'StoreManagementScreen must consume useStoreAdminController',
  },
  {
    file: 'services/dsh/frontend/app-partner/store/PartnerStoreScreen.tsx',
    pattern: /\buseStoreRoleContextController\b/,
    label: 'PartnerStoreScreen must consume useStoreRoleContextController',
  },
  {
    file: 'services/dsh/frontend/app-field/stores/FieldStoreVerificationScreen.tsx',
    pattern: /\buseStoreRoleContextController\b/,
    label: 'FieldStoreVerificationScreen must consume useStoreRoleContextController',
  },
  {
    file: 'services/dsh/frontend/app-field/store/FieldStoreVerificationScreen.tsx',
    pattern: /\buseStoreRoleContextController\b/,
    label: 'FieldStoreVerificationScreen compatibility path must consume useStoreRoleContextController',
  },
  {
    file: 'services/dsh/frontend/app-captain/store/CaptainStorePickupContextScreen.tsx',
    pattern: /\buseStoreRoleContextController\b/,
    label: 'CaptainStorePickupContextScreen must consume useStoreRoleContextController',
  },
];

for (const check of CONTROLLER_BINDING_CHECKS) {
  const absPath = path.join(repoRoot, check.file);
  if (!fs.existsSync(absPath)) {
    violations.push({ file: check.file, message: `MISSING Screen: ${check.label}` });
  } else {
    const src = read(check.file);
    if (!check.pattern.test(src)) {
      violations.push({ file: check.file, message: `UNBOUND: ${check.label}` });
    }
  }
}

const wltSurfaceRoots = WLT_SURFACES;
for (const file of listCodeFiles()) {
  if (!wltSurfaceRoots.some(r => file.startsWith(r + "/"))) continue;
  const src = read(file);
  if (/from\s+[''][^'"]*services\/dsh\/backend/.test(src) ||
      /from\s+['"][^'"]*services\/dsh\/generated/.test(src)) {
    violations.push({ file, message: "WLT surface imports DSH backend/generated directly" });
  }
}

// --- 5. DSH Store Role Boundary Checks (Warning) ---
const CAPABILITY_MAP_PATH = "services/dsh/capability-map.ts";
const SURFACE_MAP_PATH = "services/dsh/surface-map.ts";
const SERVICE_MANIFEST_PATH = "services/dsh/service.manifest.ts";

if (fs.existsSync(path.join(repoRoot, CAPABILITY_MAP_PATH))) {
  const capabilityMapText = read(CAPABILITY_MAP_PATH);
  const storeBlock = new RegExp(`id:\\s*["']dsh\\.store\\.discovery["'][\\s\\S]*?closureState:\\s*["'](?:RUNTIME_VERIFIED|${closureFixRequired})["']`).exec(capabilityMapText)?.[0] ?? "";
  for (const surface of SURFACE_DIRS) {
    if (!new RegExp(`["']${surface}["']`).test(storeBlock)) {
      warnings.push({ file: CAPABILITY_MAP_PATH, message: `dsh.store.discovery must include ${surface}` });
    }
  }
  if (!/id:\s*["']dsh\\.store\\.discovery["'][\s\S]*?closureState:\s*["']RUNTIME_VERIFIED["']/.test(capabilityMapText)) {
    warnings.push({ file: CAPABILITY_MAP_PATH, message: "dsh.store.discovery closureState must be RUNTIME_VERIFIED" });
  }
}

if (fs.existsSync(path.join(repoRoot, SURFACE_MAP_PATH))) {
  const surfaceMapText = read(SURFACE_MAP_PATH);
  for (const surface of SURFACE_DIRS) {
    const block = new RegExp(`surface:\\s*["']${surface}["'][\\s\\S]*?implementationState:\\s*["']runtime-verified["']`).exec(surfaceMapText)?.[0] ?? "";
    if (!/dsh\\.store\\.discovery/.test(block)) {
      warnings.push({ file: SURFACE_MAP_PATH, message: `${surface} must be runtime-verified and consume dsh.store.discovery` });
    }
  }
}

if (fs.existsSync(path.join(repoRoot, SERVICE_MANIFEST_PATH))) {
  const manifestSrc = read(SERVICE_MANIFEST_PATH);
  if (!/closureState:\s*["']RUNTIME_VERIFIED["']/.test(manifestSrc)) {
    warnings.push({ file: SERVICE_MANIFEST_PATH, message: "service.manifest closureState must be RUNTIME_VERIFIED" });
  }
  if (/screensReady:\s*false/.test(manifestSrc)) {
    warnings.push({ file: SERVICE_MANIFEST_PATH, message: "service.manifest screensReady must be true" });
  }
  if (/realExperienceReady:\s*false/.test(manifestSrc)) {
    warnings.push({ file: SERVICE_MANIFEST_PATH, message: "service.manifest realExperienceReady must be true" });
  }
}

// --- 6. DSH Catalog Ownership Checks ---
for (const file of listCodeFiles()) {
  if (file.startsWith("services/wlt/") && !file.startsWith("services/wlt/frontend/shared/dsh/")) {
    const source = read(file);
    if (/\b(?:create|update|delete|approve|reject)(?:Catalog|Product|Category|Media)\b/i.test(source)) {
      violations.push({ file, message: "WLT must not own catalog/product/category/media mutations" });
    }
  }
}

const REQUIRED_CATALOG_FILES = [
  "services/dsh/frontend/shared/catalog/catalog.api.ts",
  "services/dsh/frontend/shared/catalog/use-catalog-controller.tsx",
  "services/dsh/frontend/app-client/catalog/PublishedCatalogScreen.tsx",
  "services/dsh/frontend/app-partner/Catalog/PartnerCatalogManagementScreen.tsx",
  "services/dsh/frontend/control-panel/catalogs/CatalogApprovalScreen.tsx",
  "services/wlt/frontend/shared/dsh/wlt-dsh-checkout-handoff.contract.ts",
];
for (const file of REQUIRED_CATALOG_FILES) {
  if (!fs.existsSync(path.join(repoRoot, file))) {
    violations.push({ file, message: "required sovereign shared/UI catalog binding is missing" });
  }
}

// --- 7. DSH Cart Serviceability Checks ---
const REQUIRED_CART_SHARED = [
  "services/dsh/frontend/shared/cart/cart.api.ts",
  "services/dsh/frontend/shared/cart/cart.types.ts",
  "services/dsh/frontend/shared/cart/use-cart-controller.tsx",
  "services/dsh/frontend/shared/cart/cart.controller-core.ts",
  "services/dsh/frontend/shared/cart/cart.states.ts",
  "services/dsh/frontend/shared/cart/cart.view-model.ts",
  "services/dsh/frontend/shared/cart/index.ts",
];
for (const required of REQUIRED_CART_SHARED) {
  if (!fs.existsSync(path.join(repoRoot, required))) {
    violations.push({ file: required, message: "required Cart & Serviceability shared cart brain file is missing" });
  }
}

const REQUIRED_CART_SURFACE = [
  "services/dsh/frontend/app-client/cart/CartScreen.tsx",
  "services/dsh/frontend/control-panel/operations/CartActivityScreen.tsx",
];
for (const required of REQUIRED_CART_SURFACE) {
  if (!fs.existsSync(path.join(repoRoot, required))) {
    violations.push({ file: required, message: "required Cart & Serviceability surface screen is missing" });
  }
}

const generatedClientPath = "services/dsh/clients/generated/dsh-api.ts";
if (!fs.existsSync(path.join(repoRoot, generatedClientPath))) {
  violations.push({ file: generatedClientPath, message: "DSH generated client is missing" });
} else {
  const source = read(generatedClientPath);
  const requiredOps = [
    "getDshClientCart",
    "upsertDshCartItem",
    "removeDshCartItem",
    "checkDshCartServiceability",
    "listOperatorCarts",
  ];
  for (const op of requiredOps) {
    if (!source.includes(op)) {
      violations.push({ file: generatedClientPath, message: `generated client missing cart operation: ${op}` });
    }
  }
}

for (const screenPath of REQUIRED_CART_SURFACE) {
  if (!fs.existsSync(path.join(repoRoot, screenPath))) continue;
  const source = read(screenPath);

  if (!/from\s+["'][^"']*shared\/cart/.test(source) && !/from\s+["'][^"']*\.\.\/shared\/cart/.test(source)) {
    violations.push({
      file: screenPath,
      message: "Cart & Serviceability surface screen must import controller from shared/cart, not own local fetch",
    });
  }
  if (/\bfetch\s*\(/.test(source)) {
    violations.push({
      file: screenPath,
      message: "Cart & Serviceability surface screen must not call fetch directly; use shared cart controller",
    });
  }
}

const cartSharedDir = "services/dsh/frontend/shared/cart";
const cartFinancialMutationPattern = /\b(ledger|walletBalance|paymentCapture|capturePayment|refund|settlement|commission|payout|chargeWallet|debitWallet)\b/i;

for (const file of listCodeFiles()) {
  if (!file.startsWith(cartSharedDir)) continue;
  const source = read(file);
  if (cartFinancialMutationPattern.test(source)) {
    violations.push({
      file,
      message: "Cart & Serviceability shared cart must not contain financial mutations (WLT boundary violation)",
    });
  }
}

// --- 8. Screen Direct Fetch Checks ---
function isScreen(file) {
  const lower = file.toLowerCase();
  return (
    lower.includes("/screens/") ||
    lower.includes("/screen/") ||
    lower.endsWith("screen.tsx") ||
    lower.endsWith("screen.ts")
  );
}

for (const file of listCodeFiles()) {
  if (!isScreen(file)) continue;

  const content = read(file);
  const regex = /\bfetch\s*\(/g;
  let match;
  while ((match = regex.exec(content))) {
    violations.push({
      file,
      line: lineNumber(content, match.index),
      message: "direct fetch inside screen is forbidden; use generated service client and adapter"
    });
  }
}

if (warnings.length > 0) {
  console.warn(`\nfullstack-boundary-gate: ${warnings.length} WARNING(S)`);
  for (const warning of warnings) {
    console.warn(`- ${warning.file}${warning.line ? `:${warning.line}` : ""} ${warning.message}`);
  }
}

fail(guardId, violations);
