const MOBILE_RUNTIME_PATTERN = /^apps\/app-(client|partner|captain|field)\/runtime\/src\//u;
const MOBILE_RUNTIME_PRODUCT_CONTAINER_PATTERN = /\/(?:features|screens|domain|data|services|readiness)(?:\/|$)/u;
const CONTROL_PANEL_PAGE_PATTERN = /^apps\/control-panel\/runtime\/src\/app\/.+\/page\.tsx$/u;

const APPLICATION_BOUNDARY = Object.freeze({
  client: "DshClientApplication",
  partner: "DshPartnerApplication",
  captain: "DshCaptainApplication",
  field: "DshFieldApplication",
});

function nonTypeDshAppImports(content) {
  const imports = [];
  const pattern = /import\s*\{([^}]*)\}\s*from\s*["']@bthwani\/dsh\/app-(client|partner|captain|field)["'];?/gu;
  for (const match of content.matchAll(pattern)) {
    const app = match[2];
    for (const rawBinding of match[1].split(",")) {
      const binding = rawBinding.replace(/\/\*[\s\S]*?\*\//gu, "").trim();
      if (!binding || binding.startsWith("type ")) continue;
      const imported = binding.split(/\s+as\s+/u)[0]?.trim();
      if (imported) imports.push({ app, imported });
    }
  }
  return imports;
}

function isRuntimeProductImport(imported) {
  if (imported.endsWith("Application")) return false;
  if (imported === "configureCatalogMobileFilePicker") return false;
  if (/^(?:dsh|parseDsh|buildDsh|DSH_)/u.test(imported)) return false;
  if (/^(?:fetch|useDsh|useWorkforce|create|update|delete|submit|approve|reject|accept|decline|cancel|resolve|set)/u.test(imported)) {
    return true;
  }
  return /(?:Surface|Gate|Screen|Provider|Panel|Controller)$/u.test(imported);
}

function controlPanelPageViolations(content) {
  const violations = [];
  if (/from\s+["']@bthwani\/core-[^"']+["']/u.test(content)) {
    violations.push("CONTROL_PANEL_RUNTIME_PAGE_OWNS_CORE_DOMAIN_POLICY");
  }
  if (/from\s+["']@bthwani\/control-panel(?:\/[^"']*)?["']/u.test(content)) {
    violations.push("CONTROL_PANEL_RUNTIME_PAGE_OWNS_PRESENTATION_COMPOSITION");
  }
  if (/from\s+["']@bthwani\/ui-kit(?:\/[^"']*)?["']/u.test(content)) {
    violations.push("CONTROL_PANEL_RUNTIME_PAGE_OWNS_PRODUCT_PRESENTATION");
  }
  if (/\b(?:hasServiceControlPanelPermission|useIdentitySession)\b/u.test(content)) {
    violations.push("CONTROL_PANEL_RUNTIME_PAGE_OWNS_AUTHORIZATION_OR_IDENTITY_DECISION");
  }
  if (/<form\b/u.test(content)) {
    violations.push("CONTROL_PANEL_RUNTIME_PAGE_OWNS_PRODUCT_FORM");
  }

  const logicalLines = content
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("//"));
  if (logicalLines.length > 80 && /\b(?:useState|useReducer|useEffect)\b/u.test(content)) {
    violations.push("CONTROL_PANEL_RUNTIME_PAGE_IS_STATEFUL_PRODUCT_APPLICATION");
  }
  return violations;
}

export function findRuntimeOwnershipViolations(file, content) {
  const violations = [];
  const mobileMatch = file.match(MOBILE_RUNTIME_PATTERN);
  if (mobileMatch) {
    const app = mobileMatch[1];
    if (MOBILE_RUNTIME_PRODUCT_CONTAINER_PATTERN.test(file)) {
      violations.push("MOBILE_RUNTIME_PRODUCT_CONTAINER_FORBIDDEN");
    }

    for (const imported of nonTypeDshAppImports(content)) {
      if (isRuntimeProductImport(imported.imported)) {
        violations.push(`MOBILE_RUNTIME_PRODUCT_IMPORT_FORBIDDEN:${imported.imported}`);
      }
    }

    if (/\/App\.tsx$/u.test(file)) {
      const requiredBoundary = APPLICATION_BOUNDARY[app];
      if (!content.includes(requiredBoundary)) {
        violations.push(`MOBILE_RUNTIME_APPLICATION_BOUNDARY_REQUIRED:${requiredBoundary}`);
      }
    }
  }

  if (CONTROL_PANEL_PAGE_PATTERN.test(file)) {
    violations.push(...controlPanelPageViolations(content));
  }

  return [...new Set(violations)];
}

export function isForbiddenAppRuntimeDshImport(file, resolved) {
  return file.startsWith("apps/") && resolved.startsWith("services/dsh/frontend/");
}
