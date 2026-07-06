import fs from "node:fs";
import path from "node:path";
import { repoRoot } from "../guards/_guard-utils.mjs";

fs.mkdirSync(path.join(repoRoot, ".diagnostics/journeys"), { recursive: true });
fs.writeFileSync(path.join(repoRoot, ".diagnostics/journeys/cucumber-status.txt"), "OPTIONAL: Cucumber/Gherkin remains optional until real scenarios are introduced.\n", "utf8");
console.log("OPTIONAL: Cucumber/Gherkin remains optional.");