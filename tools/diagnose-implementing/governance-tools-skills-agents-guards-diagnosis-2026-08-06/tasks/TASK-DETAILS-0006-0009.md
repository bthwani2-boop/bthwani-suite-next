# Atomic Work Items — TASK-0006 through TASK-0009

## TASK-0006 — Create one fail-closed agent-system guard aggregate

- Phase/priority: `PHASE-03` / `P0`
- Finding: `FND-0004`
- Objective: Make all mandatory agent, skill, tool, guard and projection controls reachable from one local and CI route.
- Depends on: TASK-0003, TASK-0004, TASK-0005
- Exact target paths: `package.json; tools/guards/guard-manifest.json; governance/guards/guard-registry.json; .github/workflows/ci-policy.yml; .github/workflows/ci-node-diagnostics.yml`
- Required change: Make all mandatory agent, skill, tool, guard and projection controls reachable from one local and CI route.
- Implementation: Update the listed canonical owners and projections as one atomic unit; migrate consumers before any deletion; retain exact diff and reference-scan evidence.
- Commands:
  - `pnpm run guard:agent-system-all`
  - `pnpm run guard:guard-registry`
  - `pnpm run guard:required-command-integrity`
- Expected result: The atomic target state is present on one pushed commit and all listed checks return exit code 0.
- Risk control: Do not create parallel authority, weaken a guard, delete before migration, or claim runtime/external proof from static files.
- Acceptance: Make all mandatory agent, skill, tool, guard and projection controls reachable from one local and CI route.
- Verification:
  - `pnpm run guard:agent-system-all`
  - `pnpm run guard:guard-registry`
  - `pnpm run guard:required-command-integrity`
- Rollback: Revert the single work-item commit without force-pushing. Restore the prior registry version and generated projections in one commit.
- Commit boundary: `fix(agent-system): create one fail-closed agent-system guard aggregate`

## TASK-0007 — Require same-commit CI evidence for agent-system changes

- Phase/priority: `PHASE-03` / `P0`
- Finding: `FND-0005`
- Objective: Ensure affected governance and toolchain commits receive immutable required checks and evidence.
- Depends on: TASK-0006
- Exact target paths: `.github/workflows/ci.yml; .github/workflows/ci-policy.yml; tools/guards/same-commit-evidence-gate.mjs; governance/github/workflow-registry.json`
- Required change: Ensure affected governance and toolchain commits receive immutable required checks and evidence.
- Implementation: Update the listed canonical owners and projections as one atomic unit; migrate consumers before any deletion; retain exact diff and reference-scan evidence.
- Commands:
  - `pnpm run guard:same-commit-evidence`
  - `pnpm run guard:workflow-lint`
  - `pnpm run guard:workflow-security`
  - `pnpm run guard:actions-pin`
- Expected result: The atomic target state is present on one pushed commit and all listed checks return exit code 0.
- Risk control: Do not create parallel authority, weaken a guard, delete before migration, or claim runtime/external proof from static files.
- Acceptance: Ensure affected governance and toolchain commits receive immutable required checks and evidence.
- Verification:
  - `pnpm run guard:same-commit-evidence`
  - `pnpm run guard:workflow-lint`
  - `pnpm run guard:workflow-security`
  - `pnpm run guard:actions-pin`
- Rollback: Revert the single work-item commit without force-pushing. Restore the prior registry version and generated projections in one commit.
- Commit boundary: `fix(agent-system): require same-commit ci evidence for agent-system changes`

## TASK-0008 — Converge and enable master branch enforcement

- Phase/priority: `PHASE-04` / `P0`
- Finding: `FND-0006`
- Objective: Reconcile ruleset 18292744 to the current BThwani CI result contract, enable it for master, and refresh the derived enforcement snapshot.
- Depends on: TASK-0007
- Exact target paths: `GitHub ruleset 18292744`; `tools/scripts/apply-repository-ruleset.mjs`; `governance/github/master-protection.ruleset.json`
- Required change: enforcement=active and required_status_checks=[BThwani CI result], with approved review/history controls preserved
- Implementation: Fetch current ruleset immediately before mutation; submit a complete reviewed payload; do not enable stale contexts or introduce bypass actors.
- Commands:
  - `gh api repos/bthwani2-boop/bthwani-suite-next/rulesets/18292744`
  - `node tools/scripts/apply-repository-ruleset.mjs --ruleset-id 18292744 --payload governance/github/master-protection.ruleset.json`
  - `gh api repos/bthwani2-boop/bthwani-suite-next/rulesets/18292744`
  - `pnpm run guard:guard-registry && pnpm run guard:workflow-lint && pnpm run guard:workflow-security`
- Expected result: The atomic target state is present on one pushed commit and all listed checks return exit code 0.
- Risk control: Do not create parallel authority, weaken a guard, delete before migration, or claim runtime/external proof from static files.
- Acceptance: Ruleset 18292744 is active for master, requires only BThwani CI result, preserves approved review/history controls, and matches the refreshed derived snapshot.
- Verification:
  - `gh api repos/bthwani2-boop/bthwani-suite-next/rulesets/18292744`
  - `pnpm run guard:guard-registry`
  - `pnpm run guard:workflow-lint`
  - `pnpm run guard:workflow-security`
- Rollback: Revert the single work-item commit without force-pushing. Restore the prior registry version and generated projections in one commit.
- Commit boundary: `fix(ci): converge and enable master ruleset`

## TASK-0009 — Run end-to-end agent-system closure verification

- Phase/priority: `PHASE-05` / `P0`
- Finding: `FND-0009`
- Objective: Prove the complete registry-to-command-to-CI chain on one immutable commit and prepare package disposal.
- Depends on: TASK-0001, TASK-0002, TASK-0003, TASK-0004, TASK-0005, TASK-0006, TASK-0007, TASK-0008
- Exact target paths: `governance/agents; governance/skills; governance/guards; governance/tools; tools/toolchain; package.json; .github/workflows`
- Required change: Prove the complete registry-to-command-to-CI chain on one immutable commit and prepare package disposal.
- Implementation: Update the listed canonical owners and projections as one atomic unit; migrate consumers before any deletion; retain exact diff and reference-scan evidence.
- Commands:
  - `pnpm run guard:agent-system-all`
  - `pnpm run toolchain:ai:verify`
  - `pnpm run verify:full`
  - `node tools/diagnose-implementing/validate-package.mjs tools/diagnose-implementing/governance-tools-skills-agents-guards-diagnosis-2026-08-06 --strict --disposal`
- Expected result: The atomic target state is present on one pushed commit and all listed checks return exit code 0.
- Risk control: Do not create parallel authority, weaken a guard, delete before migration, or claim runtime/external proof from static files.
- Acceptance: Prove the complete registry-to-command-to-CI chain on one immutable commit and prepare package disposal.
- Verification:
  - `pnpm run guard:agent-system-all`
  - `pnpm run toolchain:ai:verify`
  - `pnpm run verify:full`
  - `node tools/diagnose-implementing/validate-package.mjs tools/diagnose-implementing/governance-tools-skills-agents-guards-diagnosis-2026-08-06 --strict --disposal`
- Rollback: Revert the single work-item commit without force-pushing. Restore the prior registry version and generated projections in one commit.
- Commit boundary: `fix(agent-system): run end-to-end agent-system closure verification`
