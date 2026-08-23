# Canonical Identity / DSH Authorization — Execution Contract

PLAN_ID: `canonical-identity-dsh-authorization-single-mutation-authority`  
REPOSITORY: `bthwani2-boop/bthwani-suite-next`  
TARGET_REF: `c`  
AUDITED_TARGET_SOURCE_HEAD: `cd03ac7e05e6b753c7a2faac326d2a07da269a4b`  
SOURCE_PHASE: `AUDIT_PREPARE`  
NEXT_PHASE: `EXECUTE_CLOSE`

This contract is a deterministic handoff, not Source of Truth and not permission to skip live revalidation. `tools/prompting/bthwani-orchestrator/**` remains read-only.

## 1. Entry gate for EXECUTE_CLOSE

Before the first target-system write:

1. Resolve the live HEAD of branch `c` without creating or switching branches.
2. Compare it to `AUDITED_TARGET_SOURCE_HEAD`.
3. Plan-only commits that merely retire superseded plans or create this three-file handoff do not invalidate the source diagnosis.
4. If any application, contract, schema, governance, runtime, workflow or materially related test source changed after the audited source HEAD, re-audit only the affected cone and re-rank the root before writing that cone.
5. If the proven root remains valid, execute immediately from the highest root; do not perform another repository-wide discovery pass.

## 2. Root to execute first

`RC-AUTH-EXEC-001`: DSH currently has two reachable execution/finalization authorities for each durable authorization intent:

- synchronous maker/checker review functions;
- background canonical mutation reconciliation worker.

The execution objective is to collapse them into one canonical claimed-intent mutation engine while preserving the synchronous review product contract.

## 3. Canonical execution architecture

Implement one authority in `services/dsh/backend/internal/administration/canonical_intents.go` with these semantics:

### 3.1 One claim model

Provide one exact-intent claim primitive for synchronous review and retain batch claiming for the worker. Both must yield the same claimed-intent representation containing at least operation type, request ID, payload, attempt information, lease owner and lease expiry semantics.

The exact claim must:

- claim only the requested intent;
- require the intent to be executable and not terminal/applied;
- respect an existing unexpired lease owned by another executor;
- use row locking/atomic update rather than read-then-write races;
- never create a fallback direct-execution path when lease acquisition fails.

### 3.2 One reconciler

Both synchronous review and worker execution must call the same claimed-intent reconciler. No caller-specific Identity mutation implementation may remain.

For all three intent types:

1. validate payload and source request consistency;
2. validate applicable SoD invariants again at execution time;
3. canonical Identity pre-readback;
4. if already converged, do not issue a remote mutation;
5. otherwise perform exactly one idempotent Identity mutation using the durable request/intent key;
6. canonical Identity post-readback;
7. do not report or persist success until the expected canonical state is proven;
8. atomically perform fenced DSH finalization.

### 3.3 Atomic fenced finalization

Finalization must occur in one local database transaction that owns all local success writes:

- lock/read the canonical intent row;
- prove `lease_owner` equals the current executor;
- prove the lease has not expired at finalization time;
- prove the intent is not terminal and handle already-applied idempotently;
- lock/revalidate the corresponding source request and expected reviewer/version/state;
- update source request to the canonical final status;
- write the canonical audit event;
- update the intent to `applied`, clear retry/error/lease fields;
- commit all those writes together.

A stale or lease-lost executor must perform **zero** source-request/audit/intent finalization writes. It must return/re-read the current canonical state rather than forcing a version update.

No raw duplicated `status='applied'` SQL may remain in `approvals.go`, `role_requests.go` or `rollback.go`.

## 4. Review-path migration

### 4.1 Role assignment / revocation

In `ReviewRoleAssignmentApproval`:

- preserve request locking, expected-version and SoD validation;
- preserve the rejection path as local maker/checker workflow behavior;
- on approval, persist the canonical intent in the existing transaction and commit;
- synchronously claim that exact intent and call the shared reconciler;
- return only the canonical readback/finalized result;
- remove direct `GrantRoleWithIdempotency` / `RevokeRoleWithIdempotency` execution and duplicate local finalization.

### 4.2 Role definition

In `ReviewRoleDefinitionRequest`:

- preserve validation, permission normalization and rejection behavior;
- on approval, persist the canonical `role-definition-upsert` intent and commit;
- synchronously enter the same exact-intent claim/reconciler path;
- remove direct `UpsertRoleDefinition`, caller-owned readback finalization and duplicate applied SQL.

### 4.3 Rollback

In `ReviewRollbackRequest`:

- preserve rollback/source checks and the full rollback SoD invariant;
- on approval, persist the `role-rollback` intent and commit;
- synchronously use the same exact-intent claim/reconciler;
- remove direct grant/revoke and duplicate finalization.

## 5. Worker correction

`RetryPendingCanonicalMutations` and `RunCanonicalMutationWorker` remain legitimate consumers of the same engine, not a second authority.

Required corrections:

- worker and synchronous review use the identical reconciler/finalizer;
- use a lease with material headroom over the per-intent execution deadline; target `60s` lease and `20s` per-intent execution timeout unless live runtime evidence proves a stricter safe bound;
- finalization must verify lease ownership and non-expiry, so lease duration is a safety bound rather than an assumption;
- an intent-scoped validation, Identity, readback, terminal or retryable error must not prevent independent already-claimed intents from being attempted in the same batch;
- process-wide cancellation or inability to access the database may abort the batch;
- aggregate/report the batch-level error after independent items have been dispositioned rather than returning at the first item failure.

## 6. Failure and unknown-outcome contract

Classify errors at the canonical executor, not independently in callers:

- malformed payload, source mismatch, invalid action, irreconcilable SoD drift → terminal failure with durable reason;
- Identity unavailable, timeout, temporary transport/server failure, canonical readback unavailable/mismatch → retryable with bounded backoff;
- lease loss/expiry → current executor performs no final writes; the current/new owner reconciles;
- remote timeout or any ambiguous remote outcome → canonical readback before deciding whether another mutation is required;
- already-converged canonical state → skip remote mutation and proceed through fenced local finalization;
- local crash after remote success → later reconciler uses readback and finalizes without duplicate semantic effect.

Do not add silent fallback, sleep-based coordination, direct mutation when claim fails, or a permanent compatibility executor.

## 7. Consumer / UX cutover

Preserve synchronous success semantics while making them canonical:

- assignment/revocation/rollback success is returned only after Identity readback and DSH finalization; then refresh the affected canonical staff state plus the relevant maker/checker queue;
- role-definition success is returned only after canonical role-definition readback and DSH finalization; then refresh canonical roles state plus the relevant queue;
- retryable/reconciliation-required/failed states must not be represented as success;
- no UI-local optimistic state becomes an authorization authority.

Inspect only the concrete Control Panel consumers reached by the affected handlers/hooks. Do not redesign unrelated screens.

## 8. Cleanup / deletion obligations

Cleanup is mandatory in the same root closure:

1. delete direct Identity mutation blocks from the three review functions;
2. delete duplicated intent-applied/finalization SQL outside the canonical finalizer;
3. inspect every remaining consumer of non-leased `markCanonicalMutation`; if none is legitimate after cutover, delete that helper and its compatibility path;
4. remove dead imports, branches, helper functions and tests whose only purpose was the old direct executor;
5. prove no reachable direct authorization executor exists outside the single canonical intent engine;
6. do not retain old code “for safety”, behind a dormant flag, commented block or compatibility wrapper.

No schema migration is presently required: existing `lease_owner` and `lease_expires_at` fields are sufficient if used as an actual transactional fence. Add/change schema only if live execution proves that invariant impossible with the current columns.

## 9. Governance reconciliation

After implementation proves the system truth, reconcile the smallest existing canonical governance owner:

`governance/product/contracts/administration-roles-approvals-audit.product-truth.json`

Record the durable invariant that a governed authorization mutation has one DSH execution/finalization authority; maker/checker review may synchronously await it but must not independently mutate Identity or independently finalize the same intent.

Do not create a second governance document or task-specific architectural authority.

## 10. Required tests in the execution cone

At minimum, add/repair tests proving:

- synchronous review racing the worker yields one lease owner/finalizer and one consistent canonical result;
- lease expires, another owner reclaims, stale owner cannot finalize;
- already-converged Identity state causes no remote mutation but does finalize correctly;
- remote mutation succeeds then local finalization is interrupted; a later reconciliation converges/finalizes;
- ambiguous remote timeout is resolved by readback before mutation retry;
- first claimed intent fails while later independent intents in the same batch are still processed;
- invalid payload/source mismatch becomes terminal without mutating Identity;
- role assignment, role revocation, role-definition upsert and rollback all use the same engine;
- all SoD negative combinations remain rejected;
- synchronous UI success refreshes the correct canonical staff/roles state and does not show false success on retryable failure.

## 11. Explicitly forbidden treatments

The following do not close the root:

- disabling the background worker;
- delaying the worker after enqueue;
- adding an in-memory mutex only;
- letting the review path mutate directly when lease acquisition fails;
- adding a second queue or separate synchronous executor;
- converting the product journey to asynchronous polling merely to avoid the race;
- weakening idempotency, readback, SoD or final verification;
- keeping direct execution behind a feature flag or compatibility switch;
- treating tests passing as proof that duplicate authority has been structurally removed.

## 12. Execution completion frontier

The implementation portion of this root is complete only when:

- all three approval types enter one claimed-intent executor;
- there is one fenced finalizer;
- direct executor/finalizer residue is deleted;
- consumers have canonical readback semantics;
- governance is reconciled;
- the verification contract in `02-VERIFICATION-CLOSURE.md` passes on the exact final source candidate.

Only then may EXECUTE_CLOSE evaluate `CLOSED`. This AUDIT_PREPARE handoff itself is not closure.
