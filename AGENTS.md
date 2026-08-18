# BThwani Agents

`AGENTS.md` is a thin coding-agent adapter. Keep execution code-first, affected-scope, and evidence-driven.

## Authority

Resolve each task from the current human instruction, exact pinned repository/ref, applicable Product Truth/policy, and actual implementation/runtime evidence. Do not create a parallel authority layer in prompts, plans, guards, workflows, or registries.

Agent routing lives only in:

- `.agents/INDEX.md`
- `.agents/skills/**`
- `.agents/tools/**`

There is intentionally no agent-role registry, skill registry, tool registry, guard registry, workflow registry, SDLC stage registry, or governance-validation workflow.

## Execution

Use `CODE_BASED_LEAN`:

1. Pin the exact repository, user-named branch/ref, and live SHA.
2. Inspect the smallest complete affected vertical path.
3. Prove the highest material root cause before broadening scope.
4. Fix the actual source owner: code, contract, data, configuration, runtime, or consumer.
5. Migrate affected consumers/readbacks and remove obsolete parallel behavior.
6. Run only verification that adds unique assurance for the affected code cone.
7. Expand verification only when risk/evidence requires it.
8. Re-pin after material writes and before the final remote claim.

“Deep”, “complete”, and “100%” raise the evidence standard; they do not justify unrelated scans or every available tool.

## Verification

Guards and GitHub workflows are for executable engineering truth only: source integrity, architecture/import boundaries, API/contracts/generated clients, migrations/data ownership, runtime/configuration, frontend binding/accessibility, security/dependencies, and executable CI.

Do not create guards or workflows to validate governance prose, agent instructions, prompt packages, approval metadata, registries, stage metadata, or evidence bookkeeping.

Prefer:

`affected code → targeted checks → runtime proof when applicable → one broad/full verification only when closure/risk requires it`

## Repository safety

Before every logical write batch, re-resolve the user-named branch. Reconcile unexpected branch movement; never overwrite unrelated newer work. No force push unless the current human instruction explicitly requires it.

## Full-stack work

For product behavior, trace the complete affected path:

`surface → shared controller/adapter → generated contract/client → backend/domain → persistence/events/integration → canonical readback → affected surfaces`

A local UI success is not closure when persisted or cross-surface truth is required.

## Security and finance

Use actual security and financial contracts/code as truth. Authentication, authorization, sessions, secrets, PII, provider credentials, isolation, and financial mutation paths require risk-appropriate verification. WLT remains the authoritative financial-truth owner.

## Delegation

Delegation is optional and only for bounded work that materially benefits from it. Exactly one backend owns one work unit; overlapping concurrent writers are forbidden. The selected orchestrator owns diagnosis, scope, reconciliation, verification, commit, and push.

## Tools

Use `.agents/INDEX.md` only when routing is not obvious. Load the smallest relevant skill/tool set. Prefer direct scoped inspection and existing affected/runtime commands; use Graphify/LeanCTX/OpenCodeReview only when they materially reduce uncertainty or repeated work.

`tools/prompting/bthwani-orchestrator/**` is a separate self-contained textual execution package. Treat it as read-only unless the current human instruction explicitly authorizes package maintenance.

## Final response

Report only what the exact candidate proves:

```text
repository:
target_branch:
resolved_commit_sha:
changed_paths:
checks_and_evidence:
decision:
remaining_risks_or_missing_evidence:
```
