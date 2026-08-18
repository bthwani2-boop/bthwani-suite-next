# BThwani Agents

`AGENTS.md` is a thin coding-agent adapter. Keep work direct, affected-scope, and evidence-driven.

## Authority

Resolve each task from the current human instruction, the exact pinned repository/ref, canonical Product/System Truth where applicable, and actual implementation/runtime evidence.

Do not create a parallel authority layer in prompts, plans, guards, workflows, registries, or agent metadata.

Agent routing lives only in:

- `.agents/INDEX.md`
- `.agents/skills/**`
- `.agents/tools/**`

There is intentionally no agent-role registry, skill registry, tool registry, guard registry, workflow registry, SDLC stage registry, or governance-validation workflow.

## Execution

1. Pin the exact repository, user-named branch/ref, and live SHA.
2. Inspect the smallest complete affected vertical path.
3. Prove the highest material root cause before broadening scope.
4. Fix the actual source owner: code, contract, data, configuration, runtime, or consumer.
5. Migrate affected consumers/readbacks and remove obsolete parallel behavior.
6. Run the smallest verification set that adds unique assurance for the affected code cone.
7. Expand verification only when risk or evidence requires it.
8. Re-pin after material writes and before the final remote claim.

“Deep”, “complete”, and “100%” raise the evidence standard; they do not justify unrelated scans, every available tool, or repository-wide verification by default.

## Verification

Do not create repository-specific guards, verification scripts, or workflows by default.

Prefer existing compiler, typecheck, lint, test, build, database, runtime, contract, and security-tool capabilities directly. Keep custom automation only when it provides unique executable assurance that cannot be obtained more simply and when its ongoing cost is justified.

Do not create guards or workflows to validate governance prose, agent instructions, prompt packages, approval metadata, registries, stage metadata, or evidence bookkeeping.

Prefer:

`affected code → targeted checks → runtime proof when applicable → broad/full verification only when closure or risk requires it`

## Repository safety

Before every logical write batch, re-resolve the user-named branch. Reconcile unexpected branch movement; never overwrite unrelated newer work. No force push unless the current human instruction explicitly requires it.

## Full-stack work

For product behavior, trace the complete affected path when the behavior actually crosses those layers:

`surface → shared controller/adapter → generated contract/client → backend/domain → persistence/events/integration → canonical readback → affected surfaces`

A local UI success is not closure when persisted or cross-surface truth is required.

## Security, finance, and domain ownership

Derive security, financial, and domain ownership from the current canonical implementation/contracts and explicit Product/System Truth. Do not restate mutable domain authority in this adapter.

Authentication, authorization, sessions, secrets, PII, provider credentials, isolation, and financial mutation paths require risk-appropriate verification.

## Delegation

Delegation is optional and only for bounded work that materially benefits from it.

Parallel read-only investigation is allowed when useful. At most one writer may modify an overlapping work unit at a time. When delegation is used, use one integration/push owner for the combined result.

The active executor owns reconciliation and final verification unless those responsibilities are explicitly assigned within a delegated workflow.

## Tools

Use `.agents/INDEX.md` only when routing is not obvious. Load the smallest relevant skill/tool set. Prefer direct scoped inspection and existing affected/runtime commands; use Graphify, LeanCTX, or OpenCodeReview only when they materially reduce uncertainty or repeated work.

`tools/prompting/bthwani-orchestrator/**` is a separate self-contained textual execution package. It is not implicit repository authority. Use it only when the current human instruction explicitly invokes it, and treat it as read-only unless package maintenance is explicitly authorized.

## Final response

For repository writes, report the exact target branch/SHA, changed paths, verification performed, and any remaining unproven risk. Do not claim more than the exact candidate proves.
