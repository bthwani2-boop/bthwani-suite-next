import fs from "node:fs";
import path from "node:path";
import { repoRoot } from "../guards/_guard-utils.mjs";

fs.mkdirSync(path.join(repoRoot, ".diagnostics/design-system"), { recursive: true });
fs.writeFileSync(path.join(repoRoot, ".diagnostics/design-system/style-dictionary-status.txt"), "OPTIONAL: Style Dictionary remains optional; current UI Kit tokens remain canonical.\n", "utf8");
console.log("OPTIONAL: Style Dictionary remains optional.");