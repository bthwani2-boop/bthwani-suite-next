// Maps a task's declared domains to a risk class using
// governance/remediation/risk-classes.json's protectedDomainFloors, taking the
// highest (most protective) floor across all domains the task touches.
import { readJson } from "../_remediation-utils.mjs";

const order = ["LOW", "FOCUSED", "STANDARD", "HIGH", "CRITICAL"];

export function calculateTaskRisk(riskClasses, domains) {
  const floors = riskClasses.protectedDomainFloors ?? {};
  let highestIndex = 0;
  let highestDomain = null;
  for (const domain of domains) {
    const floor = floors[domain];
    if (!floor) continue;
    const index = order.indexOf(floor);
    if (index > highestIndex) {
      highestIndex = index;
      highestDomain = domain;
    }
  }
  const riskClass = order[highestIndex];
  const classDefinition = riskClasses.classes.find((entry) => entry.id === riskClass);
  return { riskClass, drivenBy: highestDomain, minCapabilityTier: classDefinition.minCapabilityTier, minVerificationProfile: classDefinition.minVerificationProfile };
}

function main() {
  const domains = process.argv.slice(2);
  if (domains.length === 0) {
    console.error("usage: calculate-task-risk.mjs <domain...>  (e.g. finance security)");
    process.exit(2);
  }
  const riskClasses = readJson("governance/remediation/risk-classes.json");
  console.log(JSON.stringify(calculateTaskRisk(riskClasses, domains), null, 2));
}

if (process.argv[1]?.endsWith("calculate-task-risk.mjs")) main();
