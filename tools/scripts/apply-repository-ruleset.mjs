import fs from "node:fs";
import { parseArgs } from "node:util";
import { execFileSync } from "node:child_process";

const { values } = parseArgs({
  options: {
    "ruleset-id": { type: "string" },
    payload: { type: "string" },
  },
});

if (!values["ruleset-id"] || !values.payload) {
  console.error("Usage: node apply-repository-ruleset.mjs --ruleset-id <id> --payload <file>");
  process.exit(1);
}

if (!fs.existsSync(values.payload)) {
  console.error(`Payload file not found: ${values.payload}`);
  process.exit(1);
}

try {
  const result = execFileSync("gh", [
    "api",
    "-X", "PUT",
    `repos/bthwani2-boop/bthwani-suite-next/rulesets/${values["ruleset-id"]}`,
    "--input", values.payload,
  ], { encoding: "utf8" });
  console.log("Ruleset applied successfully:");
  console.log(result);
} catch (err) {
  console.error("Failed to apply ruleset:");
  console.error(err.stderr || err.message);
  process.exit(1);
}
