import { fail, listCodeFiles, read, toPosix, findImportSpecifiers, repoRoot } from "./_guard-utils.mjs";
import path from "node:path";
import fs from "node:fs";

const guardId = "dsh-frontend-shared-boundary-imports";
const violations = [];

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

const SURFACE_DIRS = [
  "control-panel",
  "app-client",
  "app-partner",
  "app-field",
  "app-captain",
];

// Load tsconfig aliases
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

    // --- Rules for UI Surfaces ---
    if (currentSurface) {
      // 1. Prevent imports between DSH surfaces
      for (const other of SURFACE_DIRS) {
        if (other === currentSurface) continue;
        if (resolved.startsWith(`services/dsh/frontend/${other}/`)) {
          violations.push({
            file,
            message: `FORBIDDEN: importing from other surface '${other}' (resolved: ${resolved})`
          });
        }
      }

      // 2. Prevent importing backend, clients, generated, *.api, *.controller-core
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
          message: `FORBIDDEN: importing backend/client/generated/api/controller-core directly (resolved: ${resolved})`
        });
      }

      // 3. Rules when importing from DSH shared brain or WLT boundary shared brain
      if (resolved.startsWith("services/dsh/frontend/shared/") || resolved.startsWith("services/wlt/frontend/shared/dsh/")) {
        const symbols = getNamedImports(content, index);
        for (const sym of symbols) {
          if (ALLOWED_EXCEPTIONS.has(sym)) continue;

          // Block execution verbs
          if (forbiddenVerbs.some((verb) => sym.startsWith(verb))) {
            violations.push({
              file,
              message: `FORBIDDEN: importing execution function '${sym}' from shared/boundary brain (resolved: ${resolved})`
            });
          }

          // Allow only hooks/controllers/view-model/types
          // We enforce this by checking that camelCase functions start with use, to, format, or resolve.
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
              sym.startsWith("translate") ||  // display formatters (translateOwner, translateStage, etc.)
              sym.startsWith("wlt");           // generated WLT-for-DSH read-only UI copy constants
            if (!isAllowedPrefix) {
              violations.push({
                file,
                message: `FORBIDDEN: importing non-controller/non-view-model camelCase symbol '${sym}' from shared/boundary brain (resolved: ${resolved})`
              });
            }
          }
        }
      }

      // 4. Prevent app-field from importing services/wlt/* except whitelisted read-only references
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
            message: `FORBIDDEN: app-field is only allowed to consume read-only references from whitelisted files in services/wlt/frontend/shared/dsh/ (resolved: ${resolved})`
          });
        }
      }
    }

    // --- Rules for DSH Shared ---
    if (isShared) {
      // Prevent DSH shared from importing from surfaces or apps runtime
      for (const s of SURFACE_DIRS) {
        if (resolved.startsWith(`services/dsh/frontend/${s}/`)) {
          violations.push({
            file,
            message: `FORBIDDEN: shared brain importing from surface '${s}'`
          });
        }
      }
      if (resolved.startsWith("apps/")) {
        violations.push({
          file,
          message: `FORBIDDEN: shared brain importing from apps runtime (resolved: ${resolved})`
        });
      }
    }
  }
}

fail(guardId, violations);
