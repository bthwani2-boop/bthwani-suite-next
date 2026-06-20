import fs from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();

const ACTIVE_SERVICES = ["dsh", "wlt"];
const RESERVED_SERVICES = ["knz", "arb", "amn", "esf", "mrf", "snd", "kwd"];

function exists(relPath) {
  return fs.existsSync(path.join(repoRoot, relPath));
}

function read(relPath) {
  return fs.readFileSync(path.join(repoRoot, relPath), "utf8");
}

function requiredActivationFiles(serviceId) {
  return [
    `services/${serviceId}/SERVICE_BLUEPRINT.md`,
    `services/${serviceId}/service.manifest.ts`,
    `services/${serviceId}/contracts/${serviceId}.openapi.yaml`,
  ];
}

function validateActiveManifest(serviceId, manifestPath, failures) {
  const content = read(manifestPath);

  if (!content.includes(`service: "${serviceId}"`) && !content.includes(`service: '${serviceId}'`)) {
    failures.push(`${manifestPath} active service manifest must declare service: "${serviceId}"`);
  }

  if (!content.includes("realService: true")) {
    failures.push(`${manifestPath} active service manifest must declare realService: true`);
  }

  if (!content.includes("activatesService: true")) {
    failures.push(`${manifestPath} active service manifest must declare activatesService: true`);
  }
}

const failures = [];

for (const serviceId of ACTIVE_SERVICES) {
  for (const relPath of requiredActivationFiles(serviceId)) {
    if (!exists(relPath)) {
      failures.push(`${relPath} active service ${serviceId} is missing ${path.basename(relPath)}`);
    }
  }

  const manifestPath = `services/${serviceId}/service.manifest.ts`;
  if (exists(manifestPath)) {
    validateActiveManifest(serviceId, manifestPath, failures);
  }
}

for (const serviceId of RESERVED_SERVICES) {
  const serviceRoot = `services/${serviceId}`;

  if (!exists(serviceRoot)) {
    continue;
  }

  const activationFiles = requiredActivationFiles(serviceId);
  const present = activationFiles.filter(exists);

  if (present.length > 0 && present.length < activationFiles.length) {
    failures.push(
      `${serviceRoot} is RESERVED but partially activated. Present: ${present.join(", ")}. Either complete activation intentionally or remove partial activation files.`
    );
  }

  if (present.length === activationFiles.length) {
    const manifestPath = `services/${serviceId}/service.manifest.ts`;
    const content = read(manifestPath);
    const activates = content.includes("activatesService: true") || content.includes("realService: true");

    if (activates) {
      failures.push(
        `${serviceRoot} is RESERVED but declares active-service markers. Move it to ACTIVE_SERVICES intentionally before activation.`
      );
    }
  }
}

if (failures.length > 0) {
  console.log("service-fullstack-linkage: FAIL");
  for (const failure of failures) {
    console.log(`- ${failure}`);
  }
  process.exit(1);
}

console.log("service-fullstack-linkage: PASS");
console.log(`active services: ${ACTIVE_SERVICES.join(", ")}`);
console.log(`reserved services: ${RESERVED_SERVICES.join(", ")}`);
