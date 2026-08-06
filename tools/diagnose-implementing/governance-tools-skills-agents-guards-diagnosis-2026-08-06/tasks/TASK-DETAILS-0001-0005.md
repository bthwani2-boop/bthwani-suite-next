# Atomic Work Items — TASK-0001 through TASK-0005

## TASK-0001 — Converge LeanCTX lifecycle authority

- Phase/priority: `PHASE-01` / `P0`
- Finding: `FND-0001`
- Objective: Establish one canonical LeanCTX lifecycle state and remove contradictory activation language.
- Depends on: none
- Exact target paths: `AGENTS.md; governance/tools/agent-tool-registry.json; .agents/tools/leanctx.md; LEAN-CTX.md; .lean-ctx.toml`
- Required change: Establish one canonical LeanCTX lifecycle state and remove contradictory activation language.
- Implementation: Update the listed canonical owners and projections as one atomic unit; migrate consumers before any deletion; retain exact diff and reference-scan evidence.
- Commands:
  - `pnpm run guard:agent-governance`
  - `pnpm run guard:document-authority-conflicts`
  - `pnpm run leanctx:verify`
- Expected result: The atomic target state is present on one pushed commit and all listed checks return exit code 0.
- Risk control: Do not create parallel authority, weaken a guard, delete before migration, or claim runtime/external proof from static files.
- Acceptance: Establish one canonical LeanCTX lifecycle state and remove contradictory activation language.
- Verification:
  - `pnpm run guard:agent-governance`
  - `pnpm run guard:document-authority-conflicts`
  - `pnpm run leanctx:verify`
- Rollback: Revert the single work-item commit without force-pushing. Restore the prior registry version and generated projections in one commit.
- Commit boundary: `fix(agent-system): converge leanctx lifecycle authority`

## TASK-0002 — Normalize platform adapter registration

- Phase/priority: `PHASE-01` / `P1`
- Finding: `FND-0002`
- Objective: Make every live adapter machine-classified with bounded capabilities and lifecycle.
- Depends on: TASK-0001
- Exact target paths: `governance/agents/agent-registry.json; governance/agents/agent-schema.json; governance/authority/authority-precedence.json; CLAUDE.md; GEMINI.md; .github/copilot-instructions.md; opencode.json`
- Required change: Make every live adapter machine-classified with bounded capabilities and lifecycle.
- Implementation: Update the listed canonical owners and projections as one atomic unit; migrate consumers before any deletion; retain exact diff and reference-scan evidence.
- Commands:
  - `pnpm run guard:agent-governance`
  - `pnpm run guard:governance-schema`
- Expected result: The atomic target state is present on one pushed commit and all listed checks return exit code 0.
- Risk control: Do not create parallel authority, weaken a guard, delete before migration, or claim runtime/external proof from static files.
- Acceptance: Make every live adapter machine-classified with bounded capabilities and lifecycle.
- Verification:
  - `pnpm run guard:agent-governance`
  - `pnpm run guard:governance-schema`
- Rollback: Revert the single work-item commit without force-pushing. Restore the prior registry version and generated projections in one commit.
- Commit boundary: `fix(agent-system): normalize platform adapter registration`

## TASK-0003 — Unify tool catalog authority and projections

- Phase/priority: `PHASE-01` / `P0`
- Finding: `FND-0003`
- Objective: Select one writable tool model and make agent and operational catalogs generated scoped projections.
- Depends on: TASK-0002
- Exact target paths: `governance/tools/agent-tool-registry.json; tools/toolchain/tool-catalog.v5.json; tools/toolchain/tool-activation-baseline.json; tools/toolchain/tool-decisions.json; tools/toolchain/tool-owners.json; tools/toolchain/expected-tool-ids.v5.json`
- Required change: Select one writable tool model and make agent and operational catalogs generated scoped projections.
- Implementation: Update the listed canonical owners and projections as one atomic unit; migrate consumers before any deletion; retain exact diff and reference-scan evidence.
- Commands:
  - `pnpm run guard:tool-catalog-coverage`
  - `pnpm run guard:toolchain-activation`
  - `pnpm run guard:oss-toolchain-policy`
- Expected result: The atomic target state is present on one pushed commit and all listed checks return exit code 0.
- Risk control: Do not create parallel authority, weaken a guard, delete before migration, or claim runtime/external proof from static files.
- Acceptance: Select one writable tool model and make agent and operational catalogs generated scoped projections.
- Verification:
  - `pnpm run guard:tool-catalog-coverage`
  - `pnpm run guard:toolchain-activation`
  - `pnpm run guard:oss-toolchain-policy`
- Rollback: Revert the single work-item commit without force-pushing. Restore the prior registry version and generated projections in one commit.
- Commit boundary: `fix(agent-system): unify tool catalog authority and projections`

## TASK-0004 — Remove retired tool policies from active skill namespace

- Phase/priority: `PHASE-02` / `P1`
- Finding: `FND-0007`
- Objective: Migrate consumers and remove or relocate retired tool-as-skill directories after impact proof.
- Depends on: TASK-0003
- Exact target paths: `.agents/skills/graphify; .agents/skills/open-code-review-delegate; .agents/tools/graphify.md; .agents/tools/open-code-review.md; governance/skills/skills-registry.json`
- Required change: Migrate consumers and remove or relocate retired tool-as-skill directories after impact proof.
- Implementation: Update the listed canonical owners and projections as one atomic unit; migrate consumers before any deletion; retain exact diff and reference-scan evidence.
- Commands:
  - `git grep -n "\.agents/skills/graphify\|\.agents/skills/open-code-review-delegate" -- . ":(exclude).git"`
  - `pnpm run guard:agent-governance`
  - `pnpm run guard:document-authority-conflicts`
- Expected result: The atomic target state is present on one pushed commit and all listed checks return exit code 0.
- Risk control: Do not create parallel authority, weaken a guard, delete before migration, or claim runtime/external proof from static files.
- Acceptance: Migrate consumers and remove or relocate retired tool-as-skill directories after impact proof.
- Verification:
  - `git grep -n "\.agents/skills/graphify\|\.agents/skills/open-code-review-delegate" -- . ":(exclude).git"`
  - `pnpm run guard:agent-governance`
  - `pnpm run guard:document-authority-conflicts`
- Rollback: Revert the single work-item commit without force-pushing. Restore the prior registry version and generated projections in one commit.
- Commit boundary: `fix(agent-system): remove retired tool policies from active skill namespace`

## TASK-0005 — Define and execute AI tool environment evidence contract

- Phase/priority: `PHASE-02` / `P1`
- Finding: `FND-0008`
- Objective: Produce sanitized environment-specific availability evidence without making tools authorities.
- Depends on: TASK-0003
- Exact target paths: `tools/scripts/verify-ai-toolchain.ps1; tools/scripts/invoke-graphify-toolchain.ps1; tools/scripts/invoke-leanctx-toolchain.ps1; tools/scripts/invoke-open-code-review-toolchain.ps1; tools/toolchain/tool-activation-baseline.json`
- Required change: Produce sanitized environment-specific availability evidence without making tools authorities.
- Implementation: Update the listed canonical owners and projections as one atomic unit; migrate consumers before any deletion; retain exact diff and reference-scan evidence.
- Commands:
  - `pnpm run toolchain:ai:verify`
  - `pnpm run graphify:verify`
  - `pnpm run leanctx:verify`
  - `pnpm run ocr:verify`
- Expected result: The atomic target state is present on one pushed commit and all listed checks return exit code 0.
- Risk control: Do not create parallel authority, weaken a guard, delete before migration, or claim runtime/external proof from static files.
- Acceptance: Produce sanitized environment-specific availability evidence without making tools authorities.
- Verification:
  - `pnpm run toolchain:ai:verify`
  - `pnpm run graphify:verify`
  - `pnpm run leanctx:verify`
  - `pnpm run ocr:verify`
- Rollback: Revert the single work-item commit without force-pushing. Restore the prior registry version and generated projections in one commit.
- Commit boundary: `fix(agent-system): define and execute ai tool environment evidence contract`
