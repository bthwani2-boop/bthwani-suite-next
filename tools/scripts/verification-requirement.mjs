import { readFileSync } from "node:fs";

const VERIFICATION_AUTHORITY_PREFIXES = [
  ".github/actions/",
  ".github/workflows/",
  "governance/guards/",
];

const VERIFICATION_AUTHORITY_FILES = new Set([
  "governance/contracts/full-verification-policy.json",
  "tools/guards/authority-separation-gate.mjs",
  "tools/guards/direct-work-branch-execution-gate.mjs",
  "tools/guards/governance-schema-gate.mjs",
  "tools/guards/guard-registry-gate.mjs",
  "tools/guards/required-command-integrity-gate.mjs",
  "tools/guards/sdlc/Invoke-SdlcGate.ps1",
  "tools/scripts/ci-routing.test.mjs",
  "tools/scripts/ci-runtime-bootstrap-policy.test.mjs",
  "tools/scripts/detect-ci-context.mjs",
  "tools/scripts/detect-ci-context.test.mjs",
  "tools/scripts/run-foundation-gate.ps1",
  "tools/scripts/verification-requirement.mjs",
]);

function normalizePath(value) {
  return String(value ?? "").trim().replaceAll("\\", "/").replace(/^\.\//, "");
}

export function isVerificationAuthorityChange(files) {
  return files.map(normalizePath).some((file) =>
    VERIFICATION_AUTHORITY_FILES.has(file) ||
    VERIFICATION_AUTHORITY_PREFIXES.some((prefix) => file.startsWith(prefix)),
  );
}

export function deriveVerificationRequirement({
  fullScope,
  verificationDepth,
  policy,
  diagnostics,
  verification,
  backend,
  runtimeRequired,
  authorityChange,
}) {
  const scope = fullScope ? "all" : "affected";
  const depth = fullScope || verificationDepth === "full" ? "full" : "affected";
  const requiredJobs = [
    policy ? "policy" : "",
    diagnostics ? "diagnostics" : "",
    verification ? "node" : "",
    backend ? "backends" : "",
    runtimeRequired ? "runtime" : "",
  ].filter(Boolean);

  return {
    scope,
    depth,
    runtime_required: Boolean(runtimeRequired),
    required_jobs: requiredJobs,
    reason: authorityChange ? "verification-authority-change" : scope === "all" ? "explicit-full-scope" : "affected-change",
  };
}

function main() {
  if (process.argv.includes("--authority-change")) {
    const files = readFileSync(0, "utf8").split(/\r?\n/).filter(Boolean);
    process.stdout.write(`${isVerificationAuthorityChange(files) ? "true" : "false"}\n`);
    return;
  }
  throw new Error("Use --authority-change with newline-delimited changed paths on stdin.");
}

if (process.argv[1] && new URL(import.meta.url).pathname.endsWith(process.argv[1].replaceAll("\\", "/"))) main();
