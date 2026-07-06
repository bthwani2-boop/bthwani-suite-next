import fs from "node:fs";
import path from "node:path";
import { repoRoot } from "../guards/_guard-utils.mjs";

fs.mkdirSync(path.join(repoRoot, ".diagnostics/performance"), { recursive: true });
fs.writeFileSync(path.join(repoRoot, ".diagnostics/performance/expo-atlas-status.txt"), "OPTIONAL: Expo Atlas remains optional until verified against the current Expo apps.\n", "utf8");
console.log("OPTIONAL: Expo Atlas remains optional.");