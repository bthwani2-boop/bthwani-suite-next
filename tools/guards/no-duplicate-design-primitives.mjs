import path from "node:path";
import { fail, listCodeFiles } from "./_guard-utils.mjs";

const guardId = "no-duplicate-design-primitives";
const violations = [];

const allowedPrefixes = ["shared/ui-kit/"];
const forbiddenBasenames = new Set([
  "ActionBar",
  "Badge",
  "Button",
  "Card",
  "Chip",
  "DataTable",
  "Dialog",
  "EmptyState",
  "ErrorState",
  "FilterBar",
  "Header",
  "IconButton",
  "ListItem",
  "LoadingState",
  "OfflineState",
  "PermissionState",
  "Screen",
  "Sheet",
  "StateView",
  "Surface",
  "Tabs",
  "Text",
  "TextField",
  "Toolbar",
]);

for (const file of listCodeFiles()) {
  if (allowedPrefixes.some((prefix) => file.startsWith(prefix))) continue;

  const basename = path.basename(file, path.extname(file));
  if (forbiddenBasenames.has(basename) || (basename === "CpPrimitives" && file !== "apps/control-panel/runtime/src/components/CpPrimitives.tsx")) {
    violations.push({
      file,
      message: `reusable design primitive '${basename}' belongs in shared/ui-kit`,
    });
  }
}

fail(guardId, violations);
