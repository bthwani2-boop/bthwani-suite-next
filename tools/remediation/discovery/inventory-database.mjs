// Inventories migration sequences per backend service: file count, naming order
// sanity, and the highest migration number seen. Read-only.
import fs from "node:fs";
import path from "node:path";
import { repoRoot, writeInventory } from "../_remediation-utils.mjs";

const migrationRoots = [
  "services/dsh/database/migrations",
  "services/wlt/database/migrations",
  "core/identity/database/migrations",
  "core/workforce/database/migrations",
  "core/platform-control/database/migrations",
  "core/providers/database/migrations",
];

function inspect(root) {
  const full = path.join(repoRoot, root);
  if (!fs.existsSync(full)) return { root, present: false, files: [] };
  const files = fs.readdirSync(full).filter((name) => /\.sql$/i.test(name)).sort();
  const numbers = files
    .map((name) => name.match(/^(\d+)/)?.[1])
    .filter(Boolean)
    .map(Number);
  return {
    root,
    present: true,
    fileCount: files.length,
    highestSequence: numbers.length ? Math.max(...numbers) : null,
    files,
  };
}

const items = migrationRoots.map(inspect);

writeInventory("database", {
  generatedAt: new Date().toISOString(),
  migrationRoots,
  items,
});
