import fs from "node:fs";
import path from "node:path";
import { fail, repoRoot, toPosix } from "./_guard-utils.mjs";

const guardId = "service-fullstack-linkage";
const violations = [];

const servicesRoot = path.join(repoRoot, "services");

function hasImplementationFiles(dir, serviceRoot = dir) {
  if (!fs.existsSync(dir)) return false;

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === ".gitkeep" || entry.name === "README.md") continue;
    const full = path.join(dir, entry.name);
    const rel = toPosix(path.relative(serviceRoot, full));

    if (entry.isDirectory()) {
      if (hasImplementationFiles(full, serviceRoot)) return true;
    } else {
      if (rel.startsWith("contracts/") && /\.openapi\.ya?ml$/.test(rel)) {
        continue;
      }
      return true;
    }
  }

  return false;
}

if (fs.existsSync(servicesRoot)) {
  for (const entry of fs.readdirSync(servicesRoot, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;

    const service = entry.name;
    if (service.startsWith("_")) continue;

    const dir = path.join(servicesRoot, service);
    const manifestPath = path.join(dir, "service.manifest.ts");
    const active =
      fs.existsSync(manifestPath) || hasImplementationFiles(dir, dir);

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

    if (fs.existsSync(manifestPath)) {
      const manifest = fs.readFileSync(manifestPath, "utf8");

      const serviceDeclaration = new RegExp(
        `\\bservice:\\s*["']${service}["']`
      );

      if (!serviceDeclaration.test(manifest)) {
        violations.push({
          file: toPosix(path.relative(repoRoot, manifestPath)),
          message: `active service manifest must declare service: "${service}"`
        });
      }

      if (!/\brealService:\s*true\b/.test(manifest)) {
        violations.push({
          file: toPosix(path.relative(repoRoot, manifestPath)),
          message: "active service manifest must declare realService: true"
        });
      }

      if (!/\bactivatesService:\s*true\b/.test(manifest)) {
        violations.push({
          file: toPosix(path.relative(repoRoot, manifestPath)),
          message: "active service manifest must declare activatesService: true"
        });
      }
    }
  }
}

fail(guardId, violations);
