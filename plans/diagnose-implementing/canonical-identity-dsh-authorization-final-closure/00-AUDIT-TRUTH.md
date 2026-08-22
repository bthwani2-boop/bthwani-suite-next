# AUDIT TRUTH — Canonical Identity/DSH Authorization Final Closure

## Invocation snapshot

- Repository: `bthwani2-boop/bthwani-suite-next`
- Branch: `c`
- Phase: `AUDIT_PREPARE`
- Target-system audit SHA: `02dd5cc5122909093946ef1dc200cf0848ccb2f1`
- Orchestrator package at audited SHA: revision `12`
- Pull request: `#284` (`c` → `master`), open draft at audit time
- Target system remained read-only during this audit. This directory is the mandatory temporary handoff only.
- `tools/prompting/bthwani-orchestrator/**` is protected and is not part of the mutation authority for the subsequent execution.

## Canonical Product/System truth

1. **Identity is the sole authority for actor identity, roles, permission vocabulary, role definitions, actor-role assignments and resolved authorization.**
2. **DSH Administration owns maker/checker workflow, requests, approvals, rollback requests, audit/projection/read models and delegation to sovereign owners; it does not own a parallel role registry or authorization vocabulary.**
3. Administration authorization is exact and surface-scoped: `service=dsh`, `surface=control-panel`, exact action, governed scope. Broad role labels or umbrella permissions are not authorization.
4. Maker, beneficiary and checker separation is a business invariant. Rollback is an independently approved inverse decision; it never erases the original decision/audit history.
5. Successful UX state must correspond to canonical committed state/readback. Dependency failure, unknown result and reconciliation are product states, not invisible implementation details.
6. WLT remains the financial authority. Payout files in this cone are affected only as exact-authorization consumers; this audit found no basis to move financial truth into DSH.

Primary durable truth sources inspected include `governance/product/PRD.md`, `governance/product/platform-model.yaml`, and `governance/product/contracts/administration-roles-approvals-audit.product-truth.json`.

## Working cone and material coverage

### Deeply audited

- `core/identity/backend/internal/{identity,http}` authorization/RBAC boundaries.
- Identity permission vocabulary, normalized role/permission graph and projection writer fences.
- Identity migrations `identity-028` through `identity-031`.
- DSH administration maker/checker role-definition, assignment and rollback workflows.
- DSH durable canonical mutation intent worker and runtime startup.
- DSH migrations `dsh-1033` through `dsh-1035`.
- DSH exact administration permission gate and payout exact-permission consumers.
- Control-panel administration role-definition, assignment and rollback UX/controllers/API adapters.
- Administration OpenAPI/contract path affected by these flows.
- Remote assurance control path: CodeQL, SonarQube, Remote Security, remote evidence aggregation, PR state/review evidence.
- Branch/PR integration state versus `master`.

### Material exclusions

Unconnected product domains/surfaces were not repository-swept. They remain outside this working cone unless execution or re-audit proves a writer/reader/consumer, authority, contract, data, runtime, security or regression relation to the roots below. This is an exclusion by lack of proven relation, not a claim that unrelated domains are globally defect-free.

## What is already materially corrected at the audited SHA

- DSH administration authorization gate now resolves Identity and requires an exact `dsh/control-panel/<action>/all` permission; no broad operator-role bypass was found in the gate.
- Identity migration `identity-028` expands legacy broad administration grants into exact actions, removes the broad bindings/vocabulary and asserts the exact vocabulary.
- Identity runtime resolution reads normalized RBAC tables rather than treating access projection JSON as authority.
- Identity migrations `identity-029..031` add version/idempotency machinery and fence direct projection writes at the database boundary.
- DSH migration `dsh-1033` migrates persisted administration references from local `role_id` to canonical `role_name` and drops `dsh_admin_roles`.
- DSH role-definition requests validate requested actions against Identity-owned vocabulary.
- DSH role-definition/assignment/rollback approval paths mutate Identity through stable idempotency keys and perform/read canonical state before declaring the governed decision complete.
- Control-panel role-definition UI no longer owns a hard-coded permission vocabulary; it reads the governed vocabulary and gates request/review by exact permissions.
- Assignment and rollback UIs implement loading/error/empty states, validation and canonical reload after successful calls.

These are substantial treatments of the historical split-authority root, but they do **not** establish final closure because the residual roots below remain.

## Root Landscape

### RC1 — HIGH — Canonical mutation lifecycle can diverge from governed request state

**Proven root:** DSH owns two pieces of one operational fact in separate, non-atomic transitions: the governed approval/rollback request status and `dsh_admin_canonical_mutation_intents.status`.

Evidence:

- Role-definition, role-assignment and rollback approval persist the intent, call Identity, then commit the DSH request as `approved`, and only afterward call `markCanonicalMutation(..., "applied")`.
- The final `markCanonicalMutation` error is deliberately ignored.
- If request finalization commits but marking the intent fails, the canonical business decision is `approved` while the intent can remain `pending`/`failed`.
- `RetryPendingCanonicalMutations` selects non-applied intents but attempts replay only when the associated request still has `status='pending'`; an already approved request causes the worker to skip indefinitely without reconciling/closing the intent.
- Failure marking schedules `next_attempt_at=NOW()`; the worker runs every 5 seconds. There is no exponential/bounded backoff in this lifecycle.
- Intent selection has no claim/lease/`SKIP LOCKED` ownership. Every DSH process starts the worker, so multiple replicas can select/replay the same due intent concurrently. Identity idempotency reduces upstream mutation risk but does not repair DSH lifecycle divergence or repeated work.
- Existing administration tests inspected do not cover these crash, retry, multi-replica or orphan-intent windows.

**Operational consequence:** orphan/stale intent state, repeated retries/traffic, misleading diagnostics, inability to prove all applied decisions have closed reconciliation records, and ambiguous user recovery after dependency/partial failure.

**Competing hypothesis falsified:** Identity idempotency is not the root. Identity's durable operation ledger returns the stored successful result for the same request hash/idempotency key, so safe replay exists upstream. The defect is the DSH lifecycle/transaction/reconciliation design.

### RC2 — MEDIUM — Residual parallel/legacy authorization vocabulary and helper paths require cutover proof

1. `core/identity/backend/internal/identity/local_operator_permissions.go` explicitly says aliases must not create multiple authorization vocabularies, yet local development reconciliation persists both `platform:read` and `platform.read` into the canonical vocabulary/role graph. `platform_local_bootstrap.go` uses the colon form, making the dot form a high-confidence stale-alias candidate; exact consumer proof is still required immediately before deletion.
2. DSH auth client retains source-compatible `GrantRole`/`RevokeRole` wrappers that synthesize `legacy-grant:*` / `legacy-revoke:*` keys while governed paths use the explicit idempotent methods. They are reachable source until zero-call proof establishes deletion safety.
3. Identity retains a source-compatible legacy role-definition helper using `legacy-role-definition:*`. It must be classified by live callers: migrate any legitimate internal consumer or delete the helper if superseded.

These are not equal in severity to RC1, but final closure forbids leaving unjustified reachable aliases/legacy authority paths.

### RC3 — INTEGRATION / CLOSURE BLOCKER — PR exact-candidate evidence and protected Orchestrator divergence

- PR `#284` exists and is the correct single PR channel; no duplicate PR is required.
- At audit time it is draft and `mergeable=false`.
- `c` was ahead of `master` by the target changes and behind it by one commit; the divergent cone includes protected `tools/prompting/bthwani-orchestrator/**` history.
- The audited `c` Orchestrator is revision 12 while the inspected `master` copy was revision 11. This task has no authority to resolve that protected package conflict.
- No admissible current-SHA CodeQL/Sonar/Remote Security completion or independent PR review was available for the audited target SHA; PR review submissions and inline review threads were empty at audit time.

This is not a reason to weaken or bypass merge rules. It is a final integration gate to be re-evaluated after product/system treatment reaches an exact final candidate.

## UX / failure-recovery finding coupled to RC1

The API correctly communicates that a rejected canonical mutation leaves the request pending, but the control-panel surfaces only expose a generic action error plus the normal pending queue. Administration diagnostics report database/Identity reachability but do not expose reconciliation backlog or durable intent state. Because retry/reconciliation is real product behavior for an approved high-sensitivity operation, execution must provide an unambiguous state/readback path such as queued/reconciling/applied/failed-with-actionable-recovery, without exposing sensitive data.

## Writers / readers / consumers inventory

### Canonical writers

- Identity normalized RBAC writer (`PermissionEnforcer`, role-definition versioned/idempotent writer, actor-role grant/revoke).
- Identity database normalized RBAC tables and operation ledger.
- DSH Administration writes workflow request/approval/rollback/audit and canonical mutation intent records only.

### Readers

- Identity permission resolution reads normalized RBAC graph/direct grants.
- DSH exact permission gate reads trusted Identity session/resolved permissions.
- DSH role/staff administration projections read Identity canonical APIs.
- Control-panel controllers read DSH governed endpoints, which in turn read canonical owners.

### Material consumers

- Role-definition request/review surface.
- Staff role assignment/revocation request/review surface.
- Rollback request/review surface.
- Administration diagnostics/audit.
- Exact authorization consumers, including payout destination verify/deactivate routing.
- Runtime canonical mutation worker.
- CI/remote assurance consumers of the final PR SHA.

## Negative space checked

- No local DSH role registry remains after the migration design (`dsh_admin_roles` is dropped).
- No broad operator bypass found in `requireAdministrationPermission`.
- No hard-coded role-definition permission list found in the inspected control-panel role-definition UI.
- Identity resolved permissions use normalized tables, not projection JSON as authority.
- Broad administration vocabulary is explicitly migrated/deleted by `identity-028`.
- Identity operation ledger provides replay-safe result reuse; therefore adding another compatibility writer is not justified.
- PR `#284` currently has no independent review evidence to reuse.

## Governance disposition

The canonical ownership and maker/checker truths already have durable governance owners. No new governance write is justified during `AUDIT_PREPARE`. During execution, if RC1 establishes a durable platform-wide rule for governed cross-service mutations that is not already adequately represented, reconcile it into the smallest existing governance owner **after** the implementation truth is proven; do not create a parallel policy document.

## Branch/race and continuity risks

- Re-pin `c` immediately before execution and after every final write/push.
- Treat any concurrent delta by relation: disjoint / related / overlapping / conflict / authority change.
- The protected Orchestrator divergence is outside this task's mutation authority and blocks merge only when still present at final integration time.
- Plan commits after the audit SHA are bookkeeping artifacts only. `EXECUTE_CLOSE` must revalidate the live branch and must not treat this plan as Source of Truth.

## Handoff readiness

No unresolved material decision currently changes the target or treatment. RC1 is executable without inventing Product Truth; RC2 has deterministic zero-reference/consumer-discovery gates; RC3 has deterministic exact-candidate/PR gates. The handoff is therefore ready for `EXECUTE_CLOSE` after revalidation of live HEAD.
