# Canonical Identity / DSH Authorization — Audit Truth

PLAN_ID: `canonical-identity-dsh-authorization-single-mutation-authority`  
REPOSITORY: `bthwani2-boop/bthwani-suite-next`  
TARGET_REF: `c`  
TARGET_SOURCE_HEAD: `cd03ac7e05e6b753c7a2faac326d2a07da269a4b`  
ORCHESTRATOR: `tools/prompting/bthwani-orchestrator/00-ORCHESTRATOR.md`  
PACKAGE_REVISION: `13`  
PHASE: `AUDIT_PREPARE`  
STATUS: `READY_FOR_EXECUTION`

The target system remained read-only during this audit. Commits after `TARGET_SOURCE_HEAD` that only delete superseded plan artifacts or create this three-file handoff are planning-artifact mutations, not target-system treatment and do not change the pinned source diagnosis.

## 1. Canonical Product/System Truth

1. `core/identity` is the sole canonical authority for actor identity, roles, permission vocabulary, role definitions, role-permission bindings, actor-role assignments and resolved authorization.
2. `services/dsh/backend/internal/administration` is the sole governed maker/checker and durable mutation-orchestration authority for authorization administration. DSH workflow state is orchestration/audit truth, never RBAC truth.
3. Every approved governed mutation has exactly one canonical execution/finalization authority. HTTP/use-case review paths may synchronously await that authority, but may not independently mutate Identity or independently finalize the same intent.
4. A successful review means: durable intent exists → one owner holds a valid lease → canonical Identity pre-readback → mutation only if needed → canonical post-readback → atomic DSH request/audit/intent finalization. Local status alone is never success.
5. Separation of duties remains pairwise distinct maker/beneficiary/checker; rollback checker must additionally differ from the original source checker.
6. No parallel/shadow writer, compatibility executor, silent fallback, duplicate finalizer or second queue/lifecycle is permitted.

## 2. Pinned evidence on the target source HEAD

### E-01 — SoD root from the prior handoff is now closed in source

`services/dsh/backend/internal/administration/approvals.go` contains `validateRoleReviewSeparation`, enforcing maker != reviewer, beneficiary != reviewer and maker != beneficiary. `services/dsh/backend/internal/administration/rollback.go` reuses it and additionally rejects original source checker == rollback checker. SoD remains a regression gate, not the current highest root.

### E-02 — role-assignment review is a direct executor

`approvals.go::ReviewRoleAssignmentApproval`:

- persists `role-assignment` canonical intent and commits it;
- then directly calls `GrantRoleWithIdempotency` or `RevokeRoleWithIdempotency`;
- then independently updates `dsh_admin_approval_requests` to `approved` and independently sets the intent to `applied`.

### E-03 — role-definition review is a direct executor

`role_requests.go::ReviewRoleDefinitionRequest`:

- persists `role-definition-upsert` intent and commits it;
- then directly calls `UpsertRoleDefinition` and readback;
- then independently finalizes the request and intent.

### E-04 — rollback review is a direct executor

`rollback.go::ReviewRollbackRequest`:

- persists `role-rollback` intent and commits it;
- then directly grants/revokes Identity;
- then independently finalizes the rollback request and intent.

### E-05 — a second executor/finalizer exists for the same intents

`canonical_intents.go` claims the same `role-assignment`, `role-definition-upsert` and `role-rollback` intents with leases, performs canonical readback/mutation, finalizes the same source requests, writes audit rows and marks the same intents `applied`.

The live worker calls `RetryPendingCanonicalMutations`, so this is runtime-reachable parallel authority, not dead code.

### E-06 — lease protects worker claiming but does not fence the direct review executor

The direct review functions do not acquire the canonical intent lease before Identity mutation/finalization. A worker can claim an intent after the review transaction commits and before the direct path finishes. Identity idempotency reduces duplicate remote effects but does not prevent duplicate local execution/finalization authority or contradictory caller outcomes.

The worker finalizes request rows before `markIntentApplied`; those request updates are not atomically fenced by ownership of the intent lease. A stale/expired owner therefore has a material stale-finalizer risk unless lease ownership/expiry is checked inside the same finalization transaction.

### E-07 — worker deadline and lease have no safety headroom

`canonicalMutationLeaseDuration = 30s`, and `RunCanonicalMutationWorker` creates a worker context with the same 30s timeout. The execution deadline can therefore consume the entire lease, leaving no safety margin for finalization and enabling expiry/reclaim near the final write boundary.

### E-08 — one intent-scoped error aborts the current claimed batch

`RetryPendingCanonicalMutations` returns immediately on the first reconciliation error. Remaining already-claimed intents are not processed in that invocation. This is unnecessary batch coupling and can amplify delays under a poison/transient item.

### E-09 — exact-candidate remote closure evidence is absent

For `cd03ac7e05e6b753c7a2faac326d2a07da269a4b`, the connected GitHub evidence returned no classic commit statuses and no PR-triggered workflow runs. This is `EXACT_CANDIDATE_EVIDENCE_MISSING`, not proof of failure and not proof of success.

## 3. Highest proven root

### RC-AUTH-EXEC-001 — CRITICAL — duplicate canonical mutation execution/finalization authority

The maker/checker review functions and the reconciliation worker are both authoritative executors/finalizers for the same durable intents.

Reachable race:

1. review transaction inserts intent and commits;
2. worker claims the new due intent;
3. review path and worker both perform Identity readback/mutation;
4. one path finalizes the DSH request;
5. the other path receives a version/finalization conflict or lease loss;
6. the caller can observe failure even though canonical Identity and DSH may already be converged successfully.

Remote idempotency does not repair this semantic race because it cannot establish one local execution/finalization authority.

## 4. Consequential material gaps inside the same root cone

- `GAP-LEASE-FENCE`: source-request finalization is not performed in one transaction that proves current intent lease ownership and non-expiry.
- `GAP-LEASE-HEADROOM`: executor deadline is not strictly shorter than the lease.
- `GAP-BATCH-ISOLATION`: one item error aborts processing of the remaining claimed batch.
- `GAP-CONSUMER-READBACK`: synchronous UX success must refresh the canonical affected staff/role state, not only workflow queues; this remains an end-to-end consumer obligation.
- `GAP-EVIDENCE`: exact final remote verification is not yet available and belongs to EXECUTE_CLOSE after the last source mutation.

## 5. Canonical Target

The target is one DSH canonical intent engine, not a second queue and not an async product redesign:

`review decision + durable intent → exact-intent lease claim → one claimed-intent reconciler → Identity pre-readback → idempotent mutation only if needed → Identity post-readback → atomically fenced request + audit + intent finalization → synchronous response from canonical readback`

The background worker must call the same claimed-intent reconciler. Review handlers remain synchronous for successful canonical application, but delegate execution to that same authority.

The existing `lease_owner` and `lease_expires_at` columns are sufficient for this treatment if all finalization occurs in one transaction that locks/checks the intent and requires the current owner plus unexpired lease. No new schema authority is required.

## 6. Effective Scope / Affected Cone

Primary source-of-fix paths:

- `services/dsh/backend/internal/administration/canonical_intents.go`
- `services/dsh/backend/internal/administration/approvals.go`
- `services/dsh/backend/internal/administration/role_requests.go`
- `services/dsh/backend/internal/administration/rollback.go`
- administration tests and direct HTTP handlers/contracts that invoke these three review use cases
- Control Panel administration staff/roles consumers affected by review success/readback
- current DSH migration/schema definition for `dsh_admin_canonical_mutation_intents` only if needed for validation; schema change is not currently required
- `governance/product/contracts/administration-roles-approvals-audit.product-truth.json` for the durable single-executor invariant after implementation is proven
- exact-candidate CI/security/quality workflows needed to verify the final source SHA

No repository-wide mutation sweep is authorized.

## 7. Artifact disposition / cleanup obligations

During EXECUTE_CLOSE, after the shared executor is established:

- delete the direct Identity mutation blocks from `approvals.go`, `role_requests.go` and `rollback.go`;
- delete their duplicated raw `status='applied'` intent-finalization SQL;
- remove any non-leased `markCanonicalMutation` compatibility/helper path if it has no legitimate remaining consumer;
- delete dead helpers/branches exposed by the cutover;
- retain only one implementation that can perform canonical Identity mutation/readback and DSH finalization for these intent types;
- prove zero old direct executor references before closure.

Superseded handoffs were deleted before this package was created:

- `plans/diagnose-implementing/2026-08-22-canonical-authorization-authority-e2e.md`
- `plans/diagnose-implementing/canonical-identity-dsh-authorization-final-closure/`

## 8. Settled material decisions

| ID | Decision |
|---|---|
| D-01 | Identity remains the sole RBAC truth owner. |
| D-02 | DSH Administration remains the sole maker/checker + intent orchestration owner. |
| D-03 | Keep the current synchronous review product contract; do not convert the journey to a second async lifecycle. |
| D-04 | Both synchronous reviews and the worker must use one claimed-intent reconciler/finalizer. |
| D-05 | Use current lease columns as the fencing authority; all final writes must prove owner + non-expired lease inside the same transaction. |
| D-06 | Executor deadline must be materially shorter than lease duration; implementation target is 20s per-intent execution under a 60s lease unless existing runtime evidence requires a stricter value. |
| D-07 | Intent-scoped failure must not prevent independent claimed intents from being processed in the same batch. |
| D-08 | User-visible success requires canonical Identity readback plus DSH finalization; affected canonical staff/roles state must be refreshed after success. |
| D-09 | No permanent compatibility path, second queue, direct fallback executor or parallel truth survives cutover. |
| D-10 | Exact-final-candidate remote evidence is mandatory after the last source change. |

No material `DECISION_REQUIRED` remains.

## 9. Cross-tool evidence disposition

GitHub is the direct authority for repository/source/branch evidence. API Response Cleaner was used only to normalize the branch evidence. Atlassian Rovo was reachable at the account-resource level but repository-related search was unavailable because the app is not installed on that Atlassian instance; this is not a repository blocker. Linear search returned no related tracking artifact. Neither source overrides the pinned repository evidence.

## 10. AUDIT_PREPARE stop

Root, authority, affected cone, target architecture, cleanup obligations, consumer obligation, governance disposition and verification contract are determined sufficiently for deterministic execution. The next legal phase is `EXECUTE_CLOSE` using the other two files in this directory, after re-pinning branch `c` and checking whether any target-source code changed after `TARGET_SOURCE_HEAD`.

`READY_FOR_EXECUTION`
