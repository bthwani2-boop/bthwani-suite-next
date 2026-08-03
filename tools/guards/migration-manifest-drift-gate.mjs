#!/usr/bin/env node
// Fails when a service's committed migrations/manifest.json diverges from
// the files actually on disk: unregistered files, missing files, checksum
// drift, duplicate ordinals/filenames, or a new legacy numeric-prefix
// collision introduced after the manifest's cutover file.
// Historical migrations are immutable by default. A pre-release correction is
// accepted only when governance/contracts/migration-amendments.json records the
// exact replacement digest and the absence of production approval evidence.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const repositoryRoot = path.resolve(new URL(".", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"), "..", "..");

const servicePaths = {
  dsh: "services/dsh/database/migrations",
  wlt: "services/wlt/database/migrations",
  identity: "core/identity/database/migrations",
  workforce: "core/workforce/database/migrations",
  providers: "core/providers/database/migrations",
  "platform-control": "core/platform-control/database/migrations",
};

const args = process.argv.slice(2);
const serviceIndex = args.indexOf("--service");
const requestedServices = serviceIndex !== -1 && args[serviceIndex + 1] ? [args[serviceIndex + 1]] : null;

function sha256(content) {
  return crypto.createHash("sha256").update(content).digest("hex");
}

// Historical manifests were generated from both Windows and POSIX worktrees.
// Accept only newline-equivalent digests so the same SQL text is portable while
// any semantic, whitespace, ordering, or final-newline change still fails.
function portableSqlDigests(buffer) {
  const text = buffer.toString("utf8");
  const lf = text.replace(/\r\n?/g, "\n");
  const crlf = lf.replace(/\n/g, "\r\n");
  return new Set([sha256(buffer), sha256(Buffer.from(lf, "utf8")), sha256(Buffer.from(crlf, "utf8"))]);
}

function loadAmendments() {
  const amendmentsPath = path.join(repositoryRoot, "governance/contracts/migration-amendments.json");
  if (!fs.existsSync(amendmentsPath)) return new Map();

  const document = JSON.parse(fs.readFileSync(amendmentsPath, "utf8"));
  const amendments = new Map();
  for (const amendment of document.amendments ?? []) {
    if (!amendment?.service || !amendment?.migrationId || !amendment?.replacementSha256) continue;
    const key = `${amendment.service}:${amendment.migrationId}`;
    if (amendments.has(key)) {
      throw new Error(`duplicate migration amendment: ${key}`);
    }
    if (amendment.classification !== "PRE_RELEASE_UNAPPLIED_CORRECTION") {
      throw new Error(`unsupported migration amendment classification for ${key}`);
    }
    if (amendment.evidence?.productionApprovalEvidence !== false) {
      throw new Error(`migration amendment ${key} must explicitly prove productionApprovalEvidence=false`);
    }
    if (!/^[a-f0-9]{64}$/.test(amendment.replacementSha256)) {
      throw new Error(`migration amendment ${key} has invalid replacementSha256`);
    }
    amendments.set(key, amendment);
  }
  return amendments;
}

const amendments = loadAmendments();

function loadManifestWithExtensions(service, dir, manifestPath, failures) {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  const extensionPath = path.join(dir, "manifest.extensions.json");
  if (!fs.existsSync(extensionPath)) return manifest;

  const extension = JSON.parse(fs.readFileSync(extensionPath, "utf8"));
  if (extension.schemaVersion !== manifest.schemaVersion) {
    failures.push("manifest.extensions.json schemaVersion must match manifest.json");
  }
  if (extension.service !== service || extension.extends !== "manifest.json") {
    failures.push("manifest.extensions.json must declare the same service and extends=manifest.json");
  }
  if (!Array.isArray(extension.migrations)) {
    failures.push("manifest.extensions.json must contain migrations[]");
    return manifest;
  }

  return {
    ...manifest,
    migrations: [...manifest.migrations, ...extension.migrations],
  };
}

function checkService(service) {
  const relativeDir = servicePaths[service];
  const dir = path.join(repositoryRoot, relativeDir);
  const manifestPath = path.join(dir, "manifest.json");
  const failures = [];

  // Every service listed in servicePaths carries a committed manifest as of
  // VC-130b; a missing one is a regression, never a skip.
  if (!fs.existsSync(manifestPath)) {
    return {
      service,
      failures: [`missing ${relativeDir}/manifest.json — regenerate with: node tools/scripts/generate-migration-manifest.mjs --service ${service}`],
    };
  }

  const manifest = loadManifestWithExtensions(service, dir, manifestPath, failures);
  const onDisk = new Set(fs.readdirSync(dir).filter((name) => name.toLowerCase().endsWith(".sql")));

  const seenOrdinals = new Set();
  const seenFiles = new Set();
  for (const entry of manifest.migrations) {
    if (seenOrdinals.has(entry.ordinal)) failures.push(`duplicate ordinal: ${entry.ordinal}`);
    seenOrdinals.add(entry.ordinal);
    if (seenFiles.has(entry.file)) failures.push(`duplicate filename in manifest: ${entry.file}`);
    seenFiles.add(entry.file);

    if (!onDisk.has(entry.file)) {
      failures.push(`manifest file missing on disk: ${entry.file}`);
      continue;
    }
    const migration = fs.readFileSync(path.join(dir, entry.file));
    const acceptableDigests = portableSqlDigests(migration);
    if (!acceptableDigests.has(entry.sha256)) {
      const amendment = amendments.get(`${service}:${entry.file}`);
      if (!amendment || !acceptableDigests.has(amendment.replacementSha256)) {
        const amendmentDigest = amendment?.replacementSha256 ?? "<none>";
        failures.push(
          `checksum drift: ${entry.file} recorded=${entry.sha256} amendment=${amendmentDigest} actual=${sha256(migration)}`,
        );
      }
    }
  }

  for (const file of onDisk) {
    if (!seenFiles.has(file)) failures.push(`file not in manifest: ${file}`);
  }

  const cutoverIndex = manifest.migrations.findIndex((entry) => entry.file === manifest.cutover);
  if (cutoverIndex === -1) {
    failures.push(`cutover file '${manifest.cutover}' not found in manifest.migrations`);
  } else {
    const historicalPrefixes = new Set(
      manifest.migrations.slice(0, cutoverIndex + 1).map((entry) => entry.historicalPrefix).filter(Boolean),
    );
    for (const entry of manifest.migrations.slice(cutoverIndex + 1)) {
      if (entry.historicalPrefix && historicalPrefixes.has(entry.historicalPrefix)) {
        failures.push(`new legacy numeric prefix collision after cutover: ${entry.file} reuses prefix ${entry.historicalPrefix}`);
      }
    }
  }

  return { service, failures };
}

function checkGenericServiceMigrationWrapper() {
  const failures = [];
  const wrapperPath = path.join(repositoryRoot, "tools/scripts/invoke-service-migrations.ps1");
  const testPath = path.join(repositoryRoot, "tools/scripts/test-service-migration-runner.ps1");

  for (const filePath of [wrapperPath, testPath]) {
    const relative = path.relative(repositoryRoot, filePath).replaceAll(path.sep, "/");
    if (!fs.existsSync(filePath)) {
      failures.push(`${relative}: missing generic service migration wrapper/test`);
      continue;
    }
    const content = fs.readFileSync(filePath, "utf8");
    if (content.includes("runtime_schema_migrations")) {
      failures.push(`${relative}: must not own or assert runtime_schema_migrations; use schema_migrations via schema-migration-runner.ps1`);
    }
  }

  const wrapper = fs.existsSync(wrapperPath) ? fs.readFileSync(wrapperPath, "utf8") : "";
  if (!wrapper.includes("schema-migration-runner.ps1") || !wrapper.includes("Invoke-BthwaniGovernedMigrations")) {
    failures.push("tools/scripts/invoke-service-migrations.ps1: must delegate to schema-migration-runner.ps1/Invoke-BthwaniGovernedMigrations");
  }

  return failures;
}

function checkDshFinancialSovereigntyMigrations() {
  const failures = [];
  const dshMigrationDir = path.join(repositoryRoot, servicePaths.dsh);
  const historicalException = "dsh-099_captain_dispatch_financial_eligibility.sql";
  const forbiddenCreations = [
    [
      /CREATE\s+TABLE[\s\S]{0,3000}dsh_platform_dispatch_balance_policy/i,
      "DSH_MUST_NOT_CREATE_DISPATCH_BALANCE_POLICY",
    ],
    [
      /CREATE\s+TABLE[\s\S]{0,3000}dsh_captain_financial_eligibility[\s\S]{0,3000}(available_balance_minor_units|minimum_dispatch_balance_minor_units|minimum_cod_balance_minor_units|wallet_status)/i,
      "DSH_MUST_NOT_CREATE_WALLET_BALANCE_ELIGIBILITY_TRUTH",
    ],
    [
      /ALTER\s+TABLE\s+(?:IF\s+EXISTS\s+)?dsh_captain_financial_eligibility[\s\S]{0,300}ADD\s+COLUMN\s+(?:IF\s+NOT\s+EXISTS\s+)?(available_balance_minor_units|minimum_dispatch_balance_minor_units|minimum_cod_balance_minor_units|wallet_status)\b/i,
      "DSH_MUST_NOT_ADD_WALLET_BALANCE_ELIGIBILITY_TRUTH",
    ],
  ];

  for (const name of fs.readdirSync(dshMigrationDir).filter((entry) => entry.endsWith(".sql"))) {
    if (name === historicalException) continue;
    const relative = `${servicePaths.dsh}/${name}`;
    const content = fs.readFileSync(path.join(dshMigrationDir, name), "utf8");
    for (const [pattern, code] of forbiddenCreations) {
      if (pattern.test(content)) {
        failures.push(`${relative}: ${code}; DSH may store only opaque WLT eligibility decision metadata, not wallet balances/minimums/status truth`);
      }
    }
  }

  return failures;
}

const targetServices = requestedServices ?? Object.keys(servicePaths);
let anyFailure = false;
for (const service of targetServices) {
  if (!servicePaths[service]) {
    console.error(`Unknown service '${service}'. Known: ${Object.keys(servicePaths).join(", ")}`);
    process.exitCode = 1;
    continue;
  }
  const result = checkService(service);
  if (result.failures.length > 0) {
    anyFailure = true;
    console.error(`migration-manifest-drift-gate: FAIL ${service}`);
    for (const failure of result.failures) console.error(`  - ${failure}`);
  } else {
    console.log(`migration-manifest-drift-gate: PASS ${service} (${result.service})`);
  }
}

const genericWrapperFailures = checkGenericServiceMigrationWrapper();
if (genericWrapperFailures.length > 0) {
  anyFailure = true;
  console.error("migration-manifest-drift-gate: FAIL generic-service-migration-wrapper");
  for (const failure of genericWrapperFailures) console.error(`  - ${failure}`);
} else {
  console.log("migration-manifest-drift-gate: PASS generic-service-migration-wrapper");
}

const dshFinancialSovereigntyFailures = checkDshFinancialSovereigntyMigrations();
if (dshFinancialSovereigntyFailures.length > 0) {
  anyFailure = true;
  console.error("migration-manifest-drift-gate: FAIL dsh-financial-sovereignty");
  for (const failure of dshFinancialSovereigntyFailures) console.error(`  - ${failure}`);
} else {
  console.log("migration-manifest-drift-gate: PASS dsh-financial-sovereignty");
}

if (anyFailure) process.exit(1);
