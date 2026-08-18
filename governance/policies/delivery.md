# Delivery Policy

Status: ACTIVE_CANONICAL

## Repository and branch safety

- Work on the exact repository and user-named branch/ref.
- Pin the current remote SHA before writes and re-pin after material write batches.
- Reconcile unexpected branch movement; never overwrite newer unrelated work or force-push unless explicitly authorized.
- Do not create branches, PRs, merges, releases, or deployments unless the current task requests them.

## Execution

Default to the smallest complete affected scope. Fix the authoritative source/root cause first, migrate affected consumers, and delete obsolete parallel behavior. Verification must not mutate the source it proves.

Normal flow:

`change → affected verification → runtime/security/finance proof when materially required → one broader/full verification only when closure risk justifies it`

Do not turn every iteration into a repository-wide scan.

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
- Run affected work by default; skip only when the router proves it non-applicable.
- External actions are pinned and permissions are least-privilege.
- Required checks use the exact candidate SHA.
- Avoid duplicate jobs, duplicate bootstraps, duplicate materialization, and non-gating diagnostics on the critical path.
- Full verification of verification-authority changes is an end-of-change/closure property, not an iteration tax.

## Release and deployment

Merge/release/deploy/production are separate actions. Do not infer them from code PASS. When explicitly requested, require the environment-specific evidence needed by the changed code, database, provider, or native client.

## Retention

Git history is the archive. Do not commit temporary diagnostics, screenshots, logs, generated reports, task-state files, local databases, caches, or duplicate backup trees unless they are actual product/runtime source required by the repository.

## Result language

Use plain scoped outcomes:

- `PASS` — the stated check/claim passed.
- `FIX_REQUIRED` — an in-scope defect remains.
- `NEEDS_EVIDENCE` — required proof for the claim is missing or stale.
- `BLOCKED_EXTERNAL` — remaining work truly depends on something outside the execution boundary.
- `CLOSED_WITH_EVIDENCE` — the exact candidate has no known material unresolved issue in the requested/affected scope and the evidence required for that scope exists.

Do not create a machine decision registry merely to encode these words.
