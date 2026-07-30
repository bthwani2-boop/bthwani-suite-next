import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { repoRoot } from "../_guard-utils.mjs";

let cachedBinaryPath;
let cachedTempDir;

function run(command, args, options = {}) {
  return spawnSync(command, args, {
    cwd: repoRoot,
    encoding: "utf8",
    shell: false,
    ...options,
  });
}

export function ensureGoRouteExtractor() {
  if (cachedBinaryPath && fs.existsSync(cachedBinaryPath)) return cachedBinaryPath;

  const goVersion = run("go", ["version"]);
  if (goVersion.status !== 0) {
    throw new Error(`GO_NOT_AVAILABLE ${goVersion.stderr || goVersion.error?.message || "unknown error"}`);
  }

  const extractorSource = path.join(repoRoot, "tools/guards/extract_routes.go");
  if (!fs.existsSync(extractorSource)) {
    throw new Error("GO_ROUTE_EXTRACTOR_SOURCE_MISSING tools/guards/extract_routes.go");
  }

  cachedTempDir = fs.mkdtempSync(path.join(os.tmpdir(), "bthwani-go-routes-"));
  cachedBinaryPath = path.join(cachedTempDir, process.platform === "win32" ? "extract_routes.exe" : "extract_routes");
  const build = run("go", ["build", "-o", cachedBinaryPath, extractorSource]);
  if (build.status !== 0) {
    throw new Error(`GO_ROUTE_EXTRACTOR_BUILD_FAILED ${build.stderr || build.stdout}`);
  }

  return cachedBinaryPath;
}

export function extractGoRoutes(relativeFile) {
  const absoluteFile = path.join(repoRoot, relativeFile);
  if (!fs.existsSync(absoluteFile)) {
    throw new Error(`GO_ROUTER_FILE_MISSING ${relativeFile}`);
  }

  const binary = ensureGoRouteExtractor();
  const result = run(binary, [absoluteFile]);
  if (result.status !== 0) {
    throw new Error(`GO_ROUTE_EXTRACTION_FAILED ${relativeFile}: ${result.stderr || result.stdout}`);
  }

  let routes;
  try {
    routes = JSON.parse(result.stdout.trim());
  } catch (error) {
    throw new Error(`GO_ROUTE_EXTRACTION_INVALID_JSON ${relativeFile}: ${error.message}`);
  }
  if (!Array.isArray(routes)) {
    throw new Error(`GO_ROUTE_EXTRACTION_NOT_ARRAY ${relativeFile}`);
  }

  return routes.map((route) => ({
    method: typeof route.method === "string" ? route.method.toUpperCase() : "",
    path: typeof route.path === "string" ? route.path : "",
  }));
}

export function routeKey(route) {
  return `${String(route.method ?? "").toUpperCase()} ${String(route.path ?? "")}`.trim();
}

export function cleanupGoRouteExtractor() {
  if (cachedTempDir) fs.rmSync(cachedTempDir, { recursive: true, force: true });
  cachedBinaryPath = undefined;
  cachedTempDir = undefined;
}
