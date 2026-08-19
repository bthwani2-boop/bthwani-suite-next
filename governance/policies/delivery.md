# Delivery Policy

Status: ACTIVE_CANONICAL

## Repository and branch safety

- Work on the exact repository and user-named branch/ref.
- Pin the current remote SHA before writes and re-pin after material write batches.
- Reconcile unexpected branch movement; never overwrite newer unrelated work or force-push unless explicitly authorized.
- Do not create branches, PRs, merges, releases, or deployments unless the current task requests them.

## Execution

Every task is judged inside the current project-wide Canonical frame. The current objective selects priority; it does not redefine platform truth or become a scope ceiling.

Default execution flow:

`project-wide orientation → smallest complete proven working cone → highest proven root → root-correct treatment → affected verification → project-consistency/governance reconciliation → re-audit/re-rank`.

Fix the authoritative source/root cause first, migrate affected consumers, delete obsolete parallel behavior, and preserve previously proven canonical closures unless new evidence legitimately reopens them.

`AUDIT_PREPARE` is read-only for the target system and produces one mandatory temporary plan artifact after blocking material decisions are resolved. `EXECUTE_CLOSE` performs the same required audit/inspection/diagnosis/analysis but couples it directly to immediate root-correct treatment and requires no plan artifact by default.

Verification must not mutate the source it proves.

Normal proof flow:

`change → affected verification → runtime/security/finance proof when materially required → broader/project-consistency verification only when the changed authority/risk/closure claim requires it`.

Do not turn every iteration into a repository-wide deep scan, and do not let a narrow objective create a narrow worldview.

## Evidence

Evidence is bound to the exact candidate that produced it. A later relevant write invalidates earlier evidence for that claim.

Use only materially applicable evidence:

- static/code;
- contracts/data;
- runtime;
- visual/accessibility;
- security/privacy;
- finance;
- CI;
- release/production only when explicitly requested or claimed.

One evidence type does not imply another. Static PASS is not runtime success, and CI configuration is not proof of an actual successful run.

## CI

- CI is read-only with respect to tracked source.
- Run affected work by default; skip only when non-applicability is proven.
- External actions are pinned and permissions are least-privilege.
- Required checks use the exact candidate SHA.
- Avoid duplicate jobs, duplicate bootstraps, duplicate materialization, and non-gating diagnostics on the critical path.
- Full verification of verification-authority changes is an end-of-change/closure property, not an iteration tax.

## Release and deployment

Merge/release/deploy/production are separate actions. Do not infer them from code PASS. When explicitly requested, require the environment-specific evidence needed by the changed code, database, provider, or native client.

## Retention

Git history is the archive. Do not commit temporary diagnostics, screenshots, logs, generated reports, task-state files, local databases, caches, or duplicate backup trees unless they are actual product/runtime source required by the repository.

The one temporary `AUDIT_PREPARE` plan is an explicitly phase-governed handoff artifact, not durable Product Truth. `EXECUTE_CLOSE` does not create such an artifact by default.

## Result language

Scoped evidence outcomes may use:

- `PASS` — the stated check/claim passed.
- `FIX_REQUIRED` — an in-scope defect remains.
- `NEEDS_EVIDENCE` — required proof for the claim is missing or stale.
- `BLOCKED_EXTERNAL` — remaining work truly depends on something outside the execution boundary.

These are evidence/reporting labels, not alternate Orchestrator stop states.

Final lifecycle states are owned exclusively by `tools/prompting/bthwani-orchestrator/00-ORCHESTRATOR.md` and `04-VERIFY-REDIAGNOSE-CLOSE.md`: `CLOSED`, `READY_FOR_EXECUTION`, `DECISION_REQUIRED`, or `EXTERNAL_BLOCKER` as applicable. Do not invent `CLOSED_WITH_EVIDENCE` or another competing closure state.
