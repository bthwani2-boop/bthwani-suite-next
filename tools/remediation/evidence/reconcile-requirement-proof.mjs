// Cross-checks a task contract's acceptance criteria against requirement-traceability
// links: every acceptance id referenced by a requirement must have evidence recorded.
import fs from "node:fs";
import path from "node:path";
import { repoRoot, readJson } from "../_remediation-utils.mjs";

export function reconcileRequirementProof(contract, traceability) {
  const gaps = [];
  const taskId = contract?.task?.id;
  const links = (traceability?.links ?? []).filter((link) => (link.taskIds ?? []).includes(taskId));
  for (const acceptance of contract?.acceptance ?? []) {
    const covered = links.some((link) => (link.evidence ?? []).length > 0);
    if (!covered) gaps.push(`ACCEPTANCE_WITHOUT_TRACED_EVIDENCE ${acceptance.id}`);
  }
  return gaps;
}

function main() {
  const contractPath = process.argv[2];
  if (!contractPath) {
    console.error("usage: reconcile-requirement-proof.mjs <task-contract.json>");
    process.exit(2);
  }
  const contract = JSON.parse(fs.readFileSync(path.resolve(repoRoot, contractPath), "utf8"));
  const traceability = readJson("governance/remediation/requirement-traceability.json");
  const gaps = reconcileRequirementProof(contract, traceability);
  if (gaps.length) {
    console.error(`reconcile-requirement-proof: NEEDS_EVIDENCE (${gaps.length})`);
    for (const gap of gaps) console.error(`- ${gap}`);
    process.exit(1);
  }
  console.log("reconcile-requirement-proof: PASS");
}

if (process.argv[1]?.endsWith("reconcile-requirement-proof.mjs")) main();
