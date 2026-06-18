import fs from "node:fs";
import path from "node:path";
import { fail, repoRoot, toPosix } from "./_guard-utils.mjs";

const guardId = "service-fullstack-linkage";
const violations = [];

const servicesRoot = path.join(repoRoot, "services");

function hasNonPlaceholderFiles(dir) {
  if (!fs.existsSync(dir)) return false;

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === ".gitkeep") continue;
    const full = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (hasNonPlaceholderFiles(full)) return true;
    } else {
      return true;
    }
  }

  return false;
}

if (fs.existsSync(servicesRoot)) {
  for (const entry of fs.readdirSync(servicesRoot, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;

    const service = entry.name;
    const dir = path.join(servicesRoot, service);
    const active = hasNonPlaceholderFiles(dir);

    if (!active) continue;

    const required = [
      "SERVICE_BLUEPRINT.md",
      "service.manifest.ts",
      `contracts/${service}.openapi.yaml`
    ];

    for (const rel of required) {
      const requiredPath = path.join(dir, rel);
      if (!fs.existsSync(requiredPath)) {
        violations.push({
          file: toPosix(path.relative(repoRoot, requiredPath)),
          message: `active service ${service} is missing ${rel}`
        });
      }
    }
  }
}

fail(guardId, violations);