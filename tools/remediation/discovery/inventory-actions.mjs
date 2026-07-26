// Counts user-facing action call sites (onPress/onClick/onSubmit) per frontend surface
// as a proxy for the action/button inventory in spec §9. Read-only, regex-based.
import fs from "node:fs";
import path from "node:path";
import { repoRoot, writeInventory } from "../_remediation-utils.mjs";

const frontendSurfaces = ["apps/app-client", "apps/app-partner", "apps/app-captain", "apps/app-field", "apps/control-panel"];
const actionPattern = /\b(onPress|onClick|onSubmit|onLongPress)\s*=/g;

function countActions(root) {
  const full = path.join(repoRoot, root);
  if (!fs.existsSync(full)) return { root, present: false, actionCount: 0 };
  let count = 0;
  const stack = [full];
  while (stack.length) {
    const dir = stack.pop();
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (["node_modules", ".expo", ".next", "android", "ios", "dist", "build"].includes(entry.name)) continue;
      const entryPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        stack.push(entryPath);
        continue;
      }
      if (!/\.(tsx?|jsx?)$/.test(entry.name)) continue;
      const content = fs.readFileSync(entryPath, "utf8");
      const matches = content.match(actionPattern);
      count += matches ? matches.length : 0;
    }
  }
  return { root, present: true, actionCount: count };
}

const items = frontendSurfaces.map(countActions);

writeInventory("actions", {
  generatedAt: new Date().toISOString(),
  note: "Proxy count of onPress/onClick/onSubmit/onLongPress call sites per surface; not a substitute for the full product model graph populated in wave P1-A.",
  items,
});
