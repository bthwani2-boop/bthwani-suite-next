// Given a risk class, resolves the minimum verification profile and its guard ids
// and commands from governance/remediation/verification-profiles.json. The
// orchestrator alone decides which task-*.yml workflows to dispatch; workflows never
// self-select their own scope.
import { readJson } from "../_remediation-utils.mjs";
import { calculateTaskRisk } from "./calculate-task-risk.mjs";

const profileToWorkflows = {
  STATIC_SCOPED: ["task-static-analysis"],
  TARGETED_TEST: ["task-static-analysis", "task-contract-verification"],
  AFFECTED_BUILD: ["task-static-analysis", "task-contract-verification", "task-backend-database"],
  RUNTIME_PROOF: ["task-static-analysis", "task-contract-verification", "task-backend-database", "task-ui-runtime"],
  FULL_GATE: [
    "task-static-analysis", "task-contract-verification", "task-backend-database", "task-ui-runtime",
    "task-security-isolation", "task-resilience", "task-performance", "task-final-verification",
  ],
};

export function calculateRequiredProof(riskClasses, profiles, domains) {
  const risk = calculateTaskRisk(riskClasses, domains);
  const profile = profiles.profiles.find((entry) => entry.id === risk.minVerificationProfile);
  return {
    ...risk,
    profile: profile.id,
    guardIds: profile.guardIds,
    commands: profile.commands,
    dimensions: profile.dimensions,
    dispatchWorkflows: profileToWorkflows[profile.id] ?? [],
  };
}

function main() {
  const domains = process.argv.slice(2);
  if (domains.length === 0) {
    console.error("usage: calculate-required-proof.mjs <domain...>");
    process.exit(2);
  }
  const riskClasses = readJson("governance/remediation/risk-classes.json");
  const profiles = readJson("governance/remediation/verification-profiles.json");
  console.log(JSON.stringify(calculateRequiredProof(riskClasses, profiles, domains), null, 2));
}

if (process.argv[1]?.endsWith("calculate-required-proof.mjs")) main();
