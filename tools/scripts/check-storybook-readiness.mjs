import fs from "node:fs";
import path from "node:path";
import { repoRoot } from "../guards/_guard-utils.mjs";

const candidates = ["shared/ui-kit/.storybook", ".storybook"];
const found = candidates.filter((p) => fs.existsSync(path.join(repoRoot, p)));
fs.mkdirSync(path.join(repoRoot, ".diagnostics/storybook"), { recursive: true });

if (found.length === 0) {
  fs.writeFileSync(path.join(repoRoot, ".diagnostics/storybook/status.txt"), "PARTIAL: Storybook config not found.\n", "utf8");
  console.log("PARTIAL: Storybook config not found.");
  process.exit(0);
}

fs.writeFileSync(path.join(repoRoot, ".diagnostics/storybook/status.txt"), "FOUND: " + found.join(", ") + "\n", "utf8");
console.log("FOUND: " + found.join(", "));