# Canonical Authorization Lifecycle + Exact Remote Evidence — Execution Contract

PLAN_ID: `canonical-authorization-lifecycle-contract-evidence-closure`  
REPOSITORY: `bthwani2-boop/bthwani-suite-next`  
TARGET_REF: `c`  
AUDITED_TARGET_SOURCE_HEAD: `57f6603c6e9fa15d2c406f454b9e20f566f30599`  
PRIMARY_ROOT: `RC-AUTH-CONTRACT-001`  
PHASE_TO_EXECUTE: `EXECUTE_CLOSE`

## 1. Execution entry gate

Before the first Target-System write:

1. resolve the live `c` HEAD;
2. compare it to `57f6603c6e9fa15d2c406f454b9e20f566f30599`;
3. ignore this package's own plan-artifact-only commits when evaluating source invalidation;
4. if source outside plan artifacts changed materially in Product Truth, DSH administration OpenAPI/backend/frontend, Identity RBAC boundary, canonical-intent execution, or verification control paths, re-audit only the affected cone before mutation;
5. do not create or switch branch automatically.

Do not re-promote the old duplicate-executor diagnosis without current evidence. The current prepared root is the Product/API lifecycle semantic gap.

## 2. Settled target truth

Apply `D-001..D-006` from `00-AUDIT-TRUTH.md` as binding semantic constraints unless newer material evidence invalidates them.

Target model:

```text
Governed review decision
  -> decision status: pending | approved | rejected

If approved mutation is required
  -> one durable canonical intent
  -> execution status: pending/reconciling/retryable_failure/terminal_failure/applied
  -> one fenced reconciler/finalizer
  -> Identity canonical pre-readback
  -> mutation iff required
  -> Identity canonical post-readback
  -> atomic fenced DSH request + audit + intent finalization
  -> canonical typed API result/readback
  -> affected Control Panel canonical refresh
```

`approved` and `applied` are never aliases.

## 3. Source-of-defect and Source-of-fix

### Source-of-defect

The defect is distributed semantic ownership:

- Product Truth lacks the canonical execution/reconciliation lifecycle;
- OpenAPI defines a lifecycle enum but the material review operations still use generic success schemas and incomplete error/status declarations;
- backend/frontend already expose richer operational semantics.

### Required Source-of-fix order

1. existing canonical Product Truth owner for administration semantics;
2. existing canonical DSH administration OpenAPI owner;
3. affected generated/manual contract bindings;
4. backend HTTP/result mapping and tests;
5. Control Panel consumer/types/tests/readback;
6. exact-final remote verification/control evidence.

Implementation must converge downward from one semantic definition rather than copy the current implementation into multiple documents independently.

## 4. `STEP-001 — Reconcile durable Product Truth`

Update only the existing canonical administration product-truth owner. Do not create a second governance file for the same lifecycle.

Required content:

- explicit separation between `approval/decision state` and `mutation execution state`;
- canonical execution vocabulary:
  `not_started | pending | reconciling | retryable_failure | terminal_failure | applied`;
- invariant that approved decision does not imply applied RBAC mutation;
- `applied` requires Identity canonical post-readback plus fenced DSH finalization;
- `reconciling` and `retryable_failure` are not success;
- terminal failure semantics must not silently mutate local approval into canonical RBAC success;
- canonical owner relation: Identity owns RBAC truth; DSH owns governed decision/intent/reconciliation/audit truth; Control Panel consumes both;
- synchronous execution attempt is preserved;
- no direct/fallback mutation outside the one canonical reconciler.

Do not copy implementation mechanics that are not durable Product/System truth.

## 5. `STEP-002 — Canonicalize OpenAPI review contracts`

In `services/dsh/contracts/dsh.administration.openapi.yaml`:

### Typed review success/result schemas

Replace generic `200` object responses for all material review endpoints with explicit typed schemas that expose the canonical decision state and `executionStatus` where applicable.

Operations include at minimum:

- role-assignment/revocation approval review;
- role-definition request review;
- rollback request review.

Reuse one canonical `MutationExecutionStatus` definition. Do not create per-endpoint duplicate enums.

### Structured errors/outcomes

Model the real HTTP semantics so consumers/generated bindings can distinguish at least:

- `400 INVALID_REQUEST`;
- `400 SEPARATION_OF_DUTIES_VIOLATION`;
- `401` unauthenticated;
- `403` forbidden;
- `404 NOT_FOUND`;
- `409 REQUEST_STATE_CONFLICT`;
- `409 CANONICAL_MUTATION_RECONCILING`;
- `409 CANONICAL_MUTATION_FAILED`;
- `503 IDENTITY_UNAVAILABLE`.

Use/reuse the repository's canonical structured error envelope. Do not introduce a new parallel error shape for these endpoints.

If current runtime maps two materially different semantic failures to one undocumented generic code, align runtime and contract at the correct HTTP owner rather than documenting a contradiction.

## 6. `STEP-003 — Align backend HTTP/domain boundary without recreating authority`

Inspect the exact administration HTTP adapter and error mapper after the contract update.

Required outcome:

- every documented review result maps deterministically from the domain use case;
- every canonical error code/status maps once at the transport owner;
- no handler-local alternate string/error map;
- no direct Identity mutation is reintroduced into review handlers/use cases;
- no request path reports success before canonical readback + fenced finalization;
- `ErrCanonicalMutationInProgress`, `ErrCanonicalMutationFailed`, `ErrIdentityUnavailable`, request conflict, not-found, invalid and SoD behavior remain structurally distinguishable.

Do not weaken current distributed failure semantics merely to fit the old OpenAPI.

## 7. `STEP-004 — Contract/binding cutover`

After OpenAPI is canonical:

- regenerate or reconcile affected bindings using the repository's canonical generation path;
- remove superseded handwritten DTO/status/error definitions when they duplicate generated/canonical contract truth and have no legitimate independent ownership;
- migrate every affected caller to the canonical typed result;
- prove no stale `generic object` review-response consumer remains;
- prove no lifecycle enum with divergent vocabulary remains reachable.

A compatibility alias is allowed only if a real mixed-version consumer is proven and must have an explicit removal condition. Convenience is not a compatibility requirement.

## 8. `STEP-005 — Control Panel semantic cutover`

Preserve the current good behavior:

- structured error `code` consumption, not substring matching;
- explicit `RECONCILING` and failure UX;
- assignment/revocation/rollback success refreshes affected canonical staff state plus required queues/audit/diagnostics;
- role-definition success refreshes canonical role catalog plus required queues/audit/diagnostics;
- UI may not convert an approved-but-reconciling mutation into applied local state.

Reconcile frontend types to the canonical contract. Delete duplicate local lifecycle definitions if the canonical/generated contract now owns them.

Required actor meaning:

- accepted/approved review with reconciliation outstanding is visibly distinct from applied success;
- retryable/terminal failure is explicit and recoverable according to the canonical workflow;
- later readback resolves to owner truth, not optimistic cached intent.

## 9. `STEP-006 — Preserve one executor/finalizer and prove negative space`

The following are structural invariants, not implementation options:

- exactly one canonical mutation reconciler/finalizer for role assignment, revocation, role-definition upsert and rollback;
- synchronous review may call the same exact-intent executor; it may not contain a second Identity mutation implementation;
- worker and synchronous path use the same fenced claim/reconciliation model;
- stale lease owner/generation cannot finalize;
- no unleased direct fallback;
- no second queue;
- no alternate lifecycle table/state used as RBAC truth;
- no local-only success on Identity unavailability/unknown outcome.

Search and delete any newly exposed duplicate direct Identity mutation/finalizer blocks, stale helpers, duplicate `applied` SQL, dead compatibility routes or tests asserting superseded behavior.

## 10. `STEP-007 — Database/data reconciliation`

Current prepared assumption: no schema migration required.

During execution verify:

- durable intent rows can represent every settled execution state;
- lease generation/owner/expiry are present and authoritative for execution ownership;
- source approval/role-definition/rollback request state remains consistent with intent terminal/applied state;
- no orphan intent/request combinations create a hidden third state meaning;
- no historical local-only `approved` rows incorrectly imply current Identity assignment without canonical reconciliation/readback.

If data inspection proves a backfill/reconciliation is required, perform the smallest deterministic owner-correct migration/reconciliation. Do not add shadow columns or a second status authority.

## 11. `STEP-008 — Test contract and failure windows`

Add/update tests capable of falsifying the old and new failure modes.

Required semantic cases:

1. approved + applied;
2. rejected with no mutation intent execution;
3. approved + reconciling;
4. approved + retryable failure;
5. approved + terminal failure;
6. Identity unavailable;
7. request version/state conflict;
8. not found;
9. maker/checker/beneficiary SoD violations;
10. rollback original-checker exclusion;
11. same-intent synchronous review vs worker race;
12. stale lease owner after expiry/reclaim cannot finalize;
13. remote mutation success + local interruption -> readback/reconciliation without duplicate semantic effect;
14. ambiguous remote timeout -> canonical readback before retry;
15. already-converged Identity state -> no unnecessary mutation, valid finalization;
16. independent batch intents continue despite one intent failure where current batch semantics require isolation;
17. Control Panel canonical refresh after success;
18. Control Panel does not display applied success for reconciling/failure.

Tests must assert canonical semantics; do not change expected behavior merely to make current implementation green.

## 12. `STEP-009 — Cleanup / deletion manifest`

After cutover, classify and execute all still-valid cleanup obligations.

Delete when proven superseded:

- generic review `200` response schemas replaced by typed canonical schemas;
- duplicate local lifecycle enums/types;
- duplicate transport error-code maps;
- stale comments/docs/tests saying approval alone means RBAC application;
- obsolete compatibility/fallback helpers;
- any direct review-time Identity mutation block outside canonical reconciler;
- any duplicate raw finalizer SQL path outside canonical finalization owner.

Also perform negative reference searches for prior residue:

- legacy `platform.read` permission alias;
- superseded hidden role grant/revoke wrappers;
- historical direct executor/finalizer paths;
- stale plan references that can mislead a later executor.

No artifact is deleted solely because it looks old; deletion requires proven supersession/no required consumer. Once `DELETE_REQUIRED` is proven and prerequisites are satisfied, deletion is mandatory.

## 13. `STEP-010 — Exact-final remote evidence`

After the **last Source change**, pin exact final source SHA `F` and run the applicable canonical remote control paths.

Do not run heavy final evidence on an intermediate SHA and carry it forward.

Required tool classes:

- SonarQube Cloud;
- CodeQL Actions + JavaScript/TypeScript + affected/all applicable Go modules;
- Semgrep;
- OpenCodeReview;
- Remote Security analyzer matrix;
- Dependency Review where applicable;
- Lockfile Integrity;
- contextual/full/runtime/journey CI according to changed cone;
- Remote Analysis Evidence/readback.

For each, inspect actual jobs/logs/artifacts/findings. A green aggregate name alone is insufficient.

If any final tool reports a material source finding, treat it at its owner, then pin a new `F` and repeat all invalidated final evidence. Do not suppress/ignore/waive a material finding merely to reach closure.

## 14. Change cone

### ALLOWED

- existing administration Product Truth owner;
- administration OpenAPI and generated bindings;
- DSH admin transport/domain tests and narrowly required semantic alignment;
- Control Panel administration consumers/tests;
- proven related cleanup;
- exact-evidence workflow/tool source only if a final rerun reproduces a real defect requiring correction.

### CONDITIONAL_EXPANSION

- Identity owner code/data only if current execution proves a contract/owner inconsistency;
- DB migration/backfill only if persisted-state proof requires it;
- other consumers only when a real contract dependency is discovered.

### READ_ONLY

- orchestrator package;
- unrelated services/surfaces/domains;
- historical plans/runs except as provenance.

### FORBIDDEN_WITHOUT_REPLAN

- changing Identity/DSH canonical ownership;
- creating a second authorization truth;
- replacing synchronous attempt with polling-only semantics;
- adding a second queue/state machine;
- weakening fencing/readback/SoD/idempotency;
- adding a fallback direct mutation;
- inventing new public lifecycle meaning outside the settled target.

## 15. Explicitly forbidden treatments

Do not use any of the following as a fix:

- documentation-only closure;
- UI-only status mapping;
- Backend-only undocumented codes;
- DB-only status patch;
- feature-flagged legacy executor;
- silent fallback to direct Identity mutation;
- in-memory mutex as distributed ownership;
- delaying/disabling worker to avoid races;
- async polling redesign to hide reconciliation semantics;
- duplicate generated + handwritten contract truth retained permanently;
- test weakening/skipping;
- scanner exclusion or `continue-on-error` used to convert material failure into PASS;
- historical/parallel PASS treated as final evidence;
- `0 findings` accepted when engine/provider/review coverage failed.

## 16. Stop / invalidation triggers

Stop only the affected cone and return through diagnosis if newer evidence changes any of:

- Identity vs DSH canonical ownership;
- lifecycle state vocabulary/meaning;
- public API semantics;
- need for a schema migration/backfill;
- current one-executor/fencing invariant;
- material consumer inventory;
- security boundary of verification tooling.

Mechanical/local implementation choices that preserve the settled semantics do not require re-planning.
