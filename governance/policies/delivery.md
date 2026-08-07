# Delivery and Evidence Policy

Status: ACTIVE_CANONICAL

## 1. Scope

This policy governs repository execution, branch safety, change lifecycle, affected verification, CI, evidence, approval, release, deployment, rollback, production verification, and final decisions.

## 2. Repository and branch truth

- Resolve the exact repository and user-named branch/ref before claims or writes.
- Pin the current remote SHA and use it as the candidate baseline.
- Re-resolve immediately before a logical write batch and after the final write/push.
- If the branch moves unexpectedly, reconcile semantic differences before continuing.
- Never substitute the default branch, force-push, hard-reset newer work, overwrite concurrent changes, auto-create a task branch, open a PR, merge, release or deploy without current-task authority.

## 3. Change lifecycle

For every meaningful change:

`intent/product outcome → ownership/impact → implementation → affected verification → review/approvals → release decision → deployment → production verification`

The lifecycle is evidence-driven, not document-count-driven. Do not create task reports, checklists, packages or ceremony files merely to simulate progress.

## 4. Impact and execution

- Start with the smallest complete affected scope and expand only from dependency, ownership, product, security, financial, database, runtime or release evidence.
- Fix root cause at the authoritative owner and migrate affected consumers; avoid surface patches, compatibility forks and parallel truths.
- One logical write concern should remain understandable and reviewable in Git history.
- Verification cannot mutate the source it is proving.

## 5. Evidence model

Evidence is bound to the exact candidate it tested. A later relevant mutation invalidates earlier evidence for that claim.

Evidence scopes include, when applicable:

- `static`
- `product`
- `runtime`
- `visual`
- `qa`
- `security`
- `finance`
- `isolation`
- `governance`
- `ci`
- `release`
- `production`

No scope is implied by another. Static PASS does not prove runtime; automated CI does not grant product/security/finance/release approval; a successful build does not prove production behavior.

## 6. Verification selection

Default to affected verification plus risk expansion. Full-workspace/full-runtime verification is used only when:

- explicitly requested by the current authorized workflow/task; or
- impact cannot be bounded safely; or
- a shared foundation/contract/runtime change can invalidate broad consumers; or
- current policy marks the change class as requiring full verification.

All required verification is fail-closed. Unsupported or unavailable required evidence yields `NEEDS_EVIDENCE`, not fabricated PASS.

## 7. CI

- CI is read-only with respect to tracked source.
- Required workflows/actions are pinned and registered.
- Required checks run against the exact candidate SHA.
- Skipped work is acceptable only when the router proves it non-applicable.
- Cancelled/superseded runs are not success evidence for a newer candidate.
- Repository configuration files describe desired controls; live GitHub enforcement must be verified before claiming branch protection/ruleset/required-check enforcement.

## 8. Decisions

Use only `governance/contracts/decision-vocabulary.json`.

- `PASS`: the scoped claim is proven.
- `FIX_REQUIRED`: an internal failure remains.
- `NEEDS_EVIDENCE`: correctness may be plausible but required proof is absent/stale.
- `BLOCKED_EXTERNAL`: a genuine external dependency prevents remaining safe work.
- `READY_FOR_REVIEW`: implementation/evidence is ready for an independent/protected review.
- `PROTOCOL_VIOLATION`: execution violated a governing contract.
- `CLOSED_WITH_EVIDENCE`: every applicable same-commit evidence scope and required approval is complete, with no fail/blocked/pending class remaining.

## 9. Approval separation

Product, architecture/governance, implementation review, QA, security, finance, release, production and residual-risk acceptance remain logically distinct domains. Sole-owner mode may satisfy only the explicitly allowed owner roles recorded by the machine contract. An execution agent cannot impersonate the owner or self-grant protected approval.

Authentication/authorization/sessions, PII/secrets, isolation, finance, migrations/production data, critical/high vulnerability acceptance, residual risk, release, deployment, production verification and final closure remain protected where the active authority contract says so.

## 10. Release and deployment

- Release requires a clean immutable candidate, required same-commit CI and every applicable protected approval.
- Database/provider/native-client changes require the rollout/compatibility/rollback evidence appropriate to their risk.
- Deployment is a separate authorized action, not an automatic consequence of merge or PASS.
- Production verification must confirm the deployed artifact/version and the specific critical journeys/invariants claimed by release.
- Rollback/roll-forward plans preserve audit/data evidence and respect migration/financial/provider ownership.

## 11. Repository retention

Git history is the default archive. Generated diagnostics, screenshots, logs, reports, temporary task state, local databases, caches and tool outputs are not tracked unless a canonical registry explicitly requires a durable artifact with owner, schema, retention and candidate binding. Detailed machine rules remain in `governance/policies/repository-retention-policy.json`.

## 12. Final report

Every completed execution reports at minimum:

```text
repository:
target_branch:
resolved_commit_sha:
changed_paths:
checks_and_evidence:
decision:
remaining_risks_or_missing_evidence:
```

Claims must not exceed current evidence.
