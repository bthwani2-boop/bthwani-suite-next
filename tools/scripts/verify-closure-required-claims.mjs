const KNOWN_CLAIMS = new Set([
  "change:verification",
  "analysis:sonar",
  "analysis:codeql",
  "analysis:semgrep",
  "analysis:opencodereview",
  "security:remote",
  "experience:rendered-web-baseline",
  "experience:rendered-web-attestation",
  "experience:mobile-device",
  "dependency:review",
  "dependency:lockfile",
  "docker:policy",
]);

const TOOL_REQUIREMENTS = new Map([
  ["analysis:sonar", ["sonar"]],
  ["analysis:codeql", ["codeql"]],
  ["analysis:semgrep", ["semgrep"]],
  ["analysis:opencodereview", ["opencodereview"]],
  ["security:remote", [
    "gitleaks",
    "osv-scanner",
    "trivy",
    "actionlint",
    "zizmor",
    "pinact",
    "shellcheck",
    "hadolint",
    "yamllint",
  ]],
]);

const normalizeClaims = (claims) => [...new Set(
  (Array.isArray(claims) ? claims : String(claims ?? "").split(","))
    .map((claim) => String(claim).trim())
    .filter(Boolean),
)];

export function requiredToolsForClaims(claims) {
  const normalized = normalizeClaims(claims);
  for (const claim of normalized) {
    if (!KNOWN_CLAIMS.has(claim)) throw new Error(`UNKNOWN_REQUIRED_CLOSURE_CLAIM:${claim}`);
  }
  return [...new Set(normalized.flatMap((claim) => TOOL_REQUIREMENTS.get(claim) ?? []))].sort();
}

export function verifyClosureClaims(requiredClaims, results) {
  const normalized = normalizeClaims(requiredClaims);
  const failures = [];
  for (const claim of normalized) {
    if (!KNOWN_CLAIMS.has(claim)) {
      failures.push(`${claim}:UNKNOWN_REQUIRED_CLAIM`);
      continue;
    }
    const result = String(results?.[claim] ?? "").trim().toLowerCase();
    if (!result) failures.push(`${claim}:MISSING_RESULT`);
    else if (result !== "success") failures.push(`${claim}:${result.toUpperCase()}`);
  }
  return {ok: failures.length === 0, requiredClaims: normalized, failures};
}

function argument(args, name, required = true) {
  const index = args.indexOf(name);
  if (index < 0 || index + 1 >= args.length) {
    if (required) throw new Error(`missing ${name}`);
    return "";
  }
  return args[index + 1];
}

function main() {
  const args = process.argv.slice(2);
  const claims = argument(args, "--claims", false);
  if (args.includes("--print-required-tools")) {
    process.stdout.write(`${requiredToolsForClaims(claims).join(",")}\n`);
    return;
  }
  throw new Error("expected --print-required-tools");
}

if (process.argv[1] && new URL(import.meta.url).pathname.endsWith(process.argv[1].replaceAll("\\", "/"))) {
  main();
}
