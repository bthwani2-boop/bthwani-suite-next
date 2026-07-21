#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { repoRoot } from "./_guard-utils.mjs";
import { cleanupGoRouteExtractor, extractGoRoutes } from "./lib/go-route-extractor.mjs";

const guardId = "GO_ROUTES_CI";
const targets = [
  { label: "DSH", file: "services/dsh/backend/internal/http/server.go" },
  { label: "WLT", file: "services/wlt/backend/internal/http/server.go" },
  { label: "Identity", file: "core/identity/backend/internal/http/server.go" },
  { label: "Workforce", file: "core/workforce/backend/internal/http/server.go" },
];

let failed = false;
const combinedRoutes = [];

try {
  for (const target of targets) {
    try {
      const routes = extractGoRoutes(target.file);
      combinedRoutes.push(...routes.map((route) => ({ service: target.label, ...route })));
      console.log(`GO_AST_ROUTES ${target.label}: PASS routes=${routes.length}`);
    } catch (error) {
      failed = true;
      console.error(`GO_AST_ROUTES ${target.label}: FAIL ${error.message}`);
    }
  }

  try {
    const diagnosticsDir = path.join(repoRoot, ".diagnostics/tools");
    fs.mkdirSync(diagnosticsDir, { recursive: true });
    fs.writeFileSync(
      path.join(diagnosticsDir, "go-routes.json"),
      JSON.stringify(combinedRoutes, null, 2),
      "utf8",
    );
    console.log(`GO_AST_ROUTES: wrote transient diagnostics routes=${combinedRoutes.length}`);
  } catch (error) {
    console.warn(`GO_AST_ROUTES: diagnostics skipped ${error.message}`);
  }
} finally {
  cleanupGoRouteExtractor();
}

if (failed) {
  console.error(`${guardId}: FAIL`);
  process.exit(1);
}

console.log(`${guardId}: PASS services=${targets.length} routes=${combinedRoutes.length}`);
