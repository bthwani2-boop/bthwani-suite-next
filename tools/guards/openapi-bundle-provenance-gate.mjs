#!/usr/bin/env node
// Verifies that each core bounded-context's committed generated bundle is
// byte-identical to a fresh recomposition from its fragment sources.
//
// This is the check that historically did not exist: generated-client-provenance-gate.mjs
// only compares the generated TS client to the *committed* bundle, so a bundle
// that has drifted from its own fragments passes silently. This gate closes
// that gap for the four bounded contexts that share the generic AST composer
// (tools/scripts/openapi-context-composer.mjs). DSH and WLT have dedicated,
// purpose-built provenance gates (tools/guards/dsh-openapi-modular-gate.mjs,
// tools/guards/wlt-openapi-bundle-gate.mjs) because their fragment layouts
// differ from the four contexts covered here — this gate does not duplicate
// that logic, it only covers what the generic composer owns.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { composeContext, contextManifests } from "../scripts/openapi-context-composer.mjs";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const failures = [];

for (const context of Object.keys(contextManifests)) {
  const result = await composeContext(context, { write: false });
  const bundlePath = path.join(repositoryRoot, result.bundlePath);
  if (!fs.existsSync(bundlePath)) {
    failures.push(`${context}: committed bundle missing at ${result.bundlePath}`);
    continue;
  }
  const committed = fs.readFileSync(bundlePath, "utf8").replace(/\r\n/g, "\n");
  const fresh = result.bundle.endsWith("\n") ? result.bundle : `${result.bundle}\n`;
  if (committed !== fresh) {
    failures.push(
      `${context}: ${result.bundlePath} is stale relative to its fragment sources; run pnpm run openapi:generate:${context} and commit the result`,
    );
    continue;
  }
  console.log(`openapi-bundle-provenance-gate: OK ${context} (${result.pathCount} paths, ${result.operationIds.length} operations)`);
}

if (failures.length > 0) {
  console.error("openapi-bundle-provenance-gate: FAILED");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
