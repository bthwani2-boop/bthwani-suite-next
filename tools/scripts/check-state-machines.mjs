import fs from "node:fs";
import path from "node:path";
import { repoRoot } from "../guards/_guard-utils.mjs";

fs.mkdirSync(path.join(repoRoot, ".diagnostics/logic"), { recursive: true });
fs.writeFileSync(path.join(repoRoot, ".diagnostics/logic/state-machines-status.txt"), "OPTIONAL: XState remains optional until real machines are introduced.\n", "utf8");
console.log("OPTIONAL: XState remains optional.");