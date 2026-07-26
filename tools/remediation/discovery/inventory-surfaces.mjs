// Enumerates the 15 product surfaces from capability-graph.json and reports whether
// each has a corresponding directory in the working tree. Read-only.
import fs from "node:fs";
import path from "node:path";
import { repoRoot, writeInventory, readJson } from "../_remediation-utils.mjs";

const graph = readJson("governance/remediation/capability-graph.json");
const surfaces = graph?.surfaces ?? [];

const surfaceDirs = {
  "app-client": "apps/app-client",
  "app-partner": "apps/app-partner",
  "app-captain": "apps/app-captain",
  "app-field": "apps/app-field",
  "control-panel": "apps/control-panel",
  "dsh-backend": "services/dsh/backend",
  "wlt-backend": "services/wlt/backend",
  identity: "core/identity",
  workforce: "core/workforce",
  "platform-control": "core/platform-control",
  providers: "core/providers",
};

const items = surfaces.map((surface) => {
  const dir = surfaceDirs[surface];
  return {
    surface,
    directory: dir ?? null,
    present: dir ? fs.existsSync(path.join(repoRoot, dir)) : null,
  };
});

writeInventory("surfaces", {
  generatedAt: new Date().toISOString(),
  surfaceElements: graph?.surfaceElements ?? [],
  items,
});
