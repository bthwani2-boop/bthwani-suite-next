import fs from "node:fs";
import path from "node:path";
import { fail, repoRoot } from "./_guard-utils.mjs";

const guardId = "backend-api-binding-gate";
const violations = [];

function normalizePath(rawPath) {
  return rawPath
    .trim()
    .replace(/\/$/, "") // Strip trailing slash
    .replace(/\{([^}]+)\}/g, (match, p1) => {
      const cleanName = p1.endsWith("...") ? p1.slice(0, -3) : p1;
      return `{${cleanName}}`;
    });
}

// 1. Load OpenAPI contracts and extract path/method combinations
function loadOpenApiRoutes(relPath) {
  const fullPath = path.join(repoRoot, relPath);
  if (!fs.existsSync(fullPath)) return [];
  const content = fs.readFileSync(fullPath, "utf8");
  const routes = [];
  let currentPath = null;
  
  for (const line of content.split(/\r?\n/)) {
    const pathMatch = line.match(/^  (\/[^\s:]+)\s*:/);
    if (pathMatch) {
      currentPath = pathMatch[1];
      continue;
    }
    
    if (currentPath) {
      const methodMatch = line.match(/^    (get|post|patch|delete|put|options)\s*:/);
      if (methodMatch) {
        routes.push({
          method: methodMatch[1].toUpperCase(),
          path: normalizePath(currentPath)
        });
      }
    }
  }
  return routes;
}

// 2. Parse Go router files and extract registered routes
function loadGoRoutes(relPath) {
  const fullPath = path.join(repoRoot, relPath);
  if (!fs.existsSync(fullPath)) return [];
  const content = fs.readFileSync(fullPath, "utf8");
  const routes = [];
  const lines = content.split(/\r?\n/);
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const routeMatch = line.match(/mux\.HandleFunc\(\s*["']([A-Z]+)\s+([^"']+)["']/);
    if (routeMatch) {
      const method = routeMatch[1];
      const rawPath = routeMatch[2];
      
      if (rawPath === "/") continue;
      
      routes.push({
        method,
        path: normalizePath(rawPath),
        line: i + 1
      });
    }
  }
  return routes;
}

// Map of services and their files
const services = [
  {
    name: "DSH",
    openapi: "services/dsh/contracts/dsh.openapi.yaml",
    router: "services/dsh/backend/internal/http/server.go"
  },
  {
    name: "WLT",
    openapi: "services/wlt/contracts/wlt.openapi.yaml",
    router: "services/wlt/backend/internal/http/server.go"
  },
  {
    name: "Identity",
    openapi: "core/identity/contracts/auth.openapi.yaml",
    router: "core/identity/backend/internal/http/server.go"
  }
];

const openApiRoutesMap = {};
for (const svc of services) {
  openApiRoutesMap[svc.name] = loadOpenApiRoutes(svc.openapi);
}

// Core service validation
for (const svc of services) {
  const openApiRoutes = openApiRoutesMap[svc.name];
  const goRoutes = loadGoRoutes(svc.router);
  
  const openApiRouteSet = new Set(openApiRoutes.map(r => `${r.method} ${r.path}`));
  const goRouteSet = new Set(goRoutes.map(r => `${r.method} ${r.path}`));
  
  for (const goRoute of goRoutes) {
    const key = `${goRoute.method} ${goRoute.path}`;
    if (!openApiRouteSet.has(key)) {
      violations.push({
        file: svc.router,
        line: goRoute.line,
        message: `FORBIDDEN: Route "${key}" is registered in Go router but not documented in OpenAPI contract "${svc.openapi}"`
      });
    }
  }
  
  for (const apiRoute of openApiRoutes) {
    const key = `${apiRoute.method} ${apiRoute.path}`;
    if (!goRouteSet.has(key)) {
      violations.push({
        file: svc.openapi,
        message: `MISSING IMPLEMENTATION: Route "${key}" is documented in OpenAPI contract but not registered in Go router "${svc.router}"`
      });
    }
  }
}

// --- Cross-service DSH-WLT Outbound Client & Webhook checks ---

function mapGoMethod(methodStr) {
  const clean = methodStr.replace(/["']/g, "");
  if (clean.includes("MethodPost")) return "POST";
  if (clean.includes("MethodGet")) return "GET";
  if (clean.includes("MethodPut")) return "PUT";
  if (clean.includes("MethodPatch")) return "PATCH";
  if (clean.includes("MethodDelete")) return "DELETE";
  return clean.toUpperCase();
}

function verifyOutboundCall(targetService, method, pathStr, sourceFile, lineNum) {
  const openApiRoutes = openApiRoutesMap[targetService];
  if (!openApiRoutes) return;
  
  const normalizedPath = normalizePath(pathStr);
  const openApiRouteSet = new Set(openApiRoutes.map(r => `${r.method} ${r.path}`));
  
  // Try direct match
  const directKey = `${method} ${normalizedPath}`;
  if (openApiRouteSet.has(directKey)) return;
  
  // Try parameter normalization match
  const pathNorm = normalizedPath.replace(/\{[^}]+\}/g, "{param}");
  for (const apiRoute of openApiRoutes) {
    const apiNorm = apiRoute.path.replace(/\{[^}]+\}/g, "{param}");
    if (apiRoute.method === method && apiNorm === pathNorm) return;
  }
  
  violations.push({
    file: sourceFile,
    line: lineNum,
    message: `FORBIDDEN CROSS-SERVICE CALL: Outbound request "${method} ${pathStr}" to ${targetService} service is not documented in its OpenAPI contract`
  });
}

// A. Check DSH -> WLT client outbound calls
const dshWltClientFile = "services/dsh/backend/internal/wlt/client.go";
if (fs.existsSync(path.join(repoRoot, dshWltClientFile))) {
  const content = fs.readFileSync(path.join(repoRoot, dshWltClientFile), "utf8");
  const lines = content.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const m = line.match(/c\.baseURL\s*\+\s*["'](\/wlt\/[^"']+)["']/);
    if (m) {
      let method = "POST";
      const methodMatch = line.match(/(http\.Method[A-Za-z]+|"[A-Z]+")/);
      if (methodMatch) {
        method = mapGoMethod(methodMatch[1]);
      }
      verifyOutboundCall("WLT", method, m[1], dshWltClientFile, i + 1);
    }
  }
}

// B. Check DSH -> WLT finance proxy outbound reads
const dshFinanceProxyFile = "services/dsh/backend/internal/http/financeproxy.go";
if (fs.existsSync(path.join(repoRoot, dshFinanceProxyFile))) {
  const content = fs.readFileSync(path.join(repoRoot, dshFinanceProxyFile), "utf8");
  const lines = content.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const m = line.match(/proxyFinanceRead\([^,]+,\s*[^,]+,\s*["'](\/wlt\/[^"']+)["']/);
    if (m) {
      let wltPath = m[1];
      if (wltPath.endsWith("/")) {
        wltPath = wltPath + "{id}";
      }
      verifyOutboundCall("WLT", "GET", wltPath, dshFinanceProxyFile, i + 1);
    }
  }
}

// C. Check WLT -> DSH webhook notifications
const wltDshNotifyFile = "services/wlt/backend/internal/dshnotify/client.go";
if (fs.existsSync(path.join(repoRoot, wltDshNotifyFile))) {
  const content = fs.readFileSync(path.join(repoRoot, wltDshNotifyFile), "utf8");
  const lines = content.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const m = line.match(/c\.baseURL\s*\+\s*["'](\/dsh\/[^"']+)["']/);
    if (m) {
      let method = "POST";
      const methodMatch = line.match(/(http\.Method[A-Za-z]+|"[A-Z]+")/);
      if (methodMatch) {
        method = mapGoMethod(methodMatch[1]);
      }
      verifyOutboundCall("DSH", method, m[1], wltDshNotifyFile, i + 1);
    }
  }
}

fail(guardId, violations);
