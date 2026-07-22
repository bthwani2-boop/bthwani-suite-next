import { readdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const guardsDirectory = dirname(fileURLToPath(import.meta.url));
const specificGates = readdirSync(guardsDirectory)
  .filter((name) => /^jrn-\d+-product-truth-gate\.mjs$/i.test(name))
  .sort();

if (specificGates.length === 0) {
  console.error("Product Truth gate failed: no journey-specific Product Truth validators were found.");
  process.exit(1);
}

for (const gate of specificGates) {
  await import(pathToFileURL(resolve(guardsDirectory, gate)).href);
}

console.log(JSON.stringify({
  gate: "product-truth-dispatcher",
  validators: specificGates,
}, null, 2));
