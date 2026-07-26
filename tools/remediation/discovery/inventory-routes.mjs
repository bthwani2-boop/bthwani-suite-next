// Scoped Go route inventory: extracts registered HTTP method + path pairs from
// RegisterXRoutes-style Go source under each backend, without running the build.
// Read-only, regex-based (no full AST/compile step needed for discovery-only proof).
import fs from "node:fs";
import path from "node:path";
import { repoRoot, writeInventory } from "../_remediation-utils.mjs";

const backendRoots = [
  "services/dsh/backend",
  "services/wlt/backend",
  "core/identity/backend",
  "core/workforce/backend",
  "core/platform-control/backend",
  "core/providers/backend",
];

const routePattern = /\.(Get|Post|Put|Patch|Delete|Handle)\(\s*"([^"]+)"/g;

function scanGoFiles(root) {
  const found = [];
  const full = path.join(repoRoot, root);
  if (!fs.existsSync(full)) return found;
  const stack = [full];
  while (stack.length) {
    const dir = stack.pop();
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;
      const entryPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        stack.push(entryPath);
        continue;
      }
      if (!entry.name.endsWith(".go") || entry.name.endsWith("_test.go")) continue;
      const content = fs.readFileSync(entryPath, "utf8");
      let match;
      routePattern.lastIndex = 0;
      while ((match = routePattern.exec(content))) {
        found.push({
          method: match[1].toUpperCase() === "HANDLE" ? "ANY" : match[1].toUpperCase(),
          route: match[2],
          file: path.relative(repoRoot, entryPath).replaceAll("\\", "/"),
        });
      }
    }
  }
  return found;
}

const items = backendRoots.flatMap((root) => scanGoFiles(root).map((route) => ({ backend: root, ...route })));

writeInventory("routes", {
  generatedAt: new Date().toISOString(),
  backendRoots,
  routeCount: items.length,
  items,
});
