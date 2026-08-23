# 01 — EXECUTION CONTRACT

PLAN_ID: `canonical-authorization-lifecycle-contract-evidence-closure`
SOURCE_AUDIT_HEAD: `674db9adff75356fda220d4e1e7aca9f90c540d1`
TARGET_REF: `c`
PHASE_REQUIRED: `EXECUTE_CLOSE`
STATUS: `READY_FOR_EXECUTION`

This contract executes the roots proven in `00-AUDIT-TRUTH.md`. It does not authorize patching around them. Every step is fail-closed: if owner/authority, source state, or exact candidate changes materially, stop and return to AUDIT_PREPARE.

## Execution laws

1. Use the existing branch `c`; create/switch no branch automatically.
2. `tools/prompting/bthwani-orchestrator/**` remains READ-ONLY.
3. Highest semantic root first; integration reconciliation is a prerequisite, not an excuse to patch symptoms.
4. Preserve one RBAC writer: DSH canonical intent executor -> Identity -> Identity readback -> fenced DSH finalization.
5. Product Truth -> OpenAPI -> backend/runtime -> generated/derived frontend. No reverse authority.
6. Cleanup/deletion is part of each treatment, not deferred polish.
7. After every Target System change the final candidate SHA changes; all exact-final evidence before that change becomes stale.
8. No merge until every `V-*`, `AC-*`, and `CE-*` gate in `02-VERIFICATION-CLOSURE.md` passes on the same exact candidate.

## STEP-000 — Reconcile source authority before writes

### Purpose
Prove this handoff still applies after its derived PLAN_DIR commits and before any Target System mutation.

### Actions
- Resolve live `c` SHA, live `master` SHA, PR #284 head/base/draft/mergeability, open reviews/threads, exact status contexts, and exact workflow runs.
- Compare all commits after `674db9adff75356fda220d4e1e7aca9f90c540d1`.
- Classify each delta:
  - `PLAN_ARTIFACT_ONLY`: continue;
  - `TARGET_SYSTEM_MATERIAL`: STOP -> AUDIT_PREPARE delta reconciliation;
  - `UNRELATED_BUT_IN_PR`: retain only if intentional and safe; it remains inside the whole-PR verification envelope.
- Confirm current Product Truth/OpenAPI/runtime defects still match `RC-ADMIN-SEMANTIC-CONTRACT-001`.

### Stop trigger
Any new material truth owner, new writer, changed lifecycle semantics, or changed conflict situation requiring product/architecture choice.

## STEP-010 — Reconcile current `master` into existing `c`

### Purpose
Remove PR integration blocker before treating a stale merge base.

### Actions
- Update/fetch current `master` and integrate it into `c` using the repository's governed method; do not create a side branch and do not force-move refs.
- Resolve conflicts by canonical ownership and current invariants, never blanket `ours`/`theirs`.
- For every conflict touching Product Truth, Identity/DSH authorization, contracts, migrations, runtime, CI/security/quality, or orchestration-adjacent verification, re-run targeted diagnosis immediately.
- Record resulting reconciliation SHA as the new execution baseline.

### Stop trigger
Conflict exposes a new material semantic decision or contradicts Identity/DSH authority model.

## STEP-100 — Canonicalize Product/Operational administration semantics

### Source of authority
`governance/product/contracts/administration-roles-approvals-audit.product-truth.json`

### Required treatment
Add/normalize the canonical administration mutation lifecycle as a first-class product fact:
- execution states: `not_started`, `pending`, `reconciling`, `retryable_failure`, `terminal_failure`, `applied`;
- allowed approval/execution pairs:
  - `pending + not_started`;
  - `pending + pending|reconciling|retryable_failure|terminal_failure` after approved review has created durable work but before proven apply;
  - `approved + applied` only;
  - `rejected + not_started` only;
- define that `approved` is not emitted until canonical Identity mutation, Identity readback, and fenced DSH finalization have succeeded;
- define terminal/retryable failure as non-applied, non-approved state requiring governed recovery/retry;
- preserve separation-of-duties and expected-version invariants;
- explicitly retain diagnostics public vocabulary `healthy | attention`, where any material governed dependency failure yields `attention` while component-level facts remain diagnostic detail.

### Cleanup
Remove/replace any product wording that permits `approved == review accepted` before canonical apply or introduces `degraded/unhealthy` as parallel top-level diagnostics vocabulary.

## STEP-110 — Make OpenAPI the complete transport authority

### Source
`services/dsh/contracts/dsh.administration.openapi.yaml`

### Required treatment
- Add reusable typed schemas for all review success responses:
  - role-definition review: `{ request, role }`;
  - role-assignment review: `{ approval, assignment }`;
  - rollback review: `{ request }`.
- Remove generic material `200: type: object` review responses after typed replacement.
- Make required execution lifecycle fields exact and non-empty wherever returned.
- Encode/retain canonical diagnostics enum `healthy | attention`.
- Encode material review error responses/codes so contract matches runtime semantics, including as applicable:
  - `400 INVALID_REQUEST`;
  - `400 SEPARATION_OF_DUTIES_VIOLATION`;
  - `401`/`403` authorization failures;
  - `404 NOT_FOUND`;
  - `409 REQUEST_STATE_CONFLICT`;
  - `409 CANONICAL_MUTATION_FAILED`;
  - `409 CANONICAL_MUTATION_RECONCILING`;
  - `503 IDENTITY_UNAVAILABLE`.
- Update generated bindings/contracts and provenance/scope gates using the repository's canonical generation mechanism; do not hand-edit generated output as an alternate authority.

### Acceptance
No material review success/error semantic remains only in Go or TypeScript.

## STEP-120 — Conform backend/runtime to the canonical contract without creating a new writer

### Administration use cases
- Preserve the current unique durable intent and `executeCanonicalMutationNow` / reconciler architecture.
- Preserve Identity as the only RBAC mutation authority.
- Preserve Identity post-readback before final success.
- Preserve lease owner + expiry + monotonic generation fencing and atomic finalization.

### Required semantic fixes
- Role-assignment rejection MUST return `executionStatus=not_started`.
- Role-definition rejection MUST return `executionStatus=not_started`.
- Rollback rejection remains `not_started`.
- Audit/list/get/direct-review responses MUST satisfy the same lifecycle vocabulary and pair matrix.
- Administration diagnostics top-level public status MUST be `healthy` or `attention`; current runtime-only `degraded`/`unhealthy` values are removed from the public contract path. Any unhealthy required dependency maps to `attention` while component details preserve diagnosis.
- HTTP error mapping must exactly match OpenAPI typed errors and must not silently collapse canonical mutation failures into generic success or unrelated status codes.

### Forbidden
- second executor/queue;
- direct Identity RBAC call from HTTP/UI bypassing DSH intent orchestration;
- local fallback role assignment;
- converting failure into approval;
- compatibility response that keeps both old and new lifecycle vocabulary.

## STEP-130 — Migrate Control Panel / frontend consumers to derived contract semantics

### Scope
`services/dsh/frontend/shared/administration/**` plus affected Administration Control Panel components/tests.

### Required treatment
- Replace independently maintained review-response/lifecycle/diagnostics/error authority with OpenAPI-derived/generated bindings or the repository's canonical compile-time contract mechanism.
- If a thin manual adapter remains, it MUST consume generated canonical types and add no independent enum/state vocabulary.
- Preserve controller invalidation/readback behavior; no optimistic local canonical success.
- UI must render:
  - `pending/not_started` as awaiting review;
  - execution outstanding/failure while approval remains pending without claiming RBAC applied;
  - `approved/applied` as canonical success only;
  - `rejected/not_started` as rejected/no mutation;
  - diagnostics `attention` with component detail.
- Structured error messages may be localized, but error-code meaning must derive from canonical transport types.

### Cleanup
Delete obsolete handwritten lifecycle/diagnostics/error aliases and tests that encode old/parallel semantics after all consumers migrate.

## STEP-140 — Data reconciliation and migration gate

### Existing canonical storage
- DSH maker/checker request tables;
- `dsh_admin_canonical_mutation_intents` unique by `(operation_type, request_id)`;
- lease metadata and `lease_generation` fencing;
- append-only Administration audit projection.

### Required reconciliation
Run read-only diagnostics first, then if anomalies are proven repair through one governed migration/reconciliation path:
- every `approved` request must have canonical proof equivalent to applied finalization;
- every `rejected` request must have no executable canonical mutation intent and semantically reads `not_started`;
- pending requests with retry/reconcile/terminal intents are legal per matrix;
- no duplicate `(operation_type, request_id)`;
- no abandoned expired lease capable of blocking canonical worker;
- no residual `dsh_admin_roles` local authority or role UUID link;
- audit lifecycle records reconcile idempotently without copying sensitive payloads.

### Migration rule
Do NOT create a schema migration merely to mirror product lifecycle when current storage can derive it correctly. Create a new migration/backfill only if a persisted impossible state/residue is proven and cannot be safely repaired by existing canonical reconciliation semantics. Migration must be idempotent, cutover-complete, and remove the obsolete representation.

## STEP-150 — Close remote-analysis trust boundary root

### Source
`.github/workflows/remote-analysis-evidence.yml`

### Required treatment
- Remove shell-step-output authority from the trusted collector checkout ref.
- Bind trusted collector checkout directly to repository-owned default-branch context (for example the event repository default branch) while keeping `persist-credentials: false` and minimum permissions.
- Prove the workflow never executes the untrusted target branch in the privileged `workflow_run` collector context.
- Keep target SHA/ref only as data passed to read-only evidence queries.
- Review whether `statuses: write`, `SONAR_TOKEN`, and each other permission/secret are necessary; reduce any unjustified privilege without breaking the canonical remote evidence path.
- Do not suppress/dismiss CodeQL finding as the treatment.

### Required proof
Exact post-change CodeQL/security analysis must remove or conclusively adjudicate `security/code-scanning/661`; only then resolve the PR review thread.

## STEP-160 — Complete cleanup / negative-space cutover

Search the affected cone and delete/retire all superseded material residue:
- generic review response objects;
- duplicate manual lifecycle/diagnostics/error vocabularies;
- `degraded/unhealthy` public Administration diagnostics vocabulary;
- empty/implicit execution-status response paths;
- legacy DSH local RBAC registry/writer references;
- alternate/synchronous canonical mutation paths;
- stale compatibility aliases/fallbacks;
- dead tests that protect obsolete semantics;
- stale PR body statements;
- unused imports/files/config introduced by the treatment.

For each deletion, prove no remaining real consumer. Do not delete unrelated 257-file PR changes merely to shrink statistics; classify them and verify the final merge envelope.

## STEP-170 — Focused source verification before remote gates

Run the smallest authoritative suites immediately after source treatment, then broader suites:
- Identity RBAC tests proving sole authority/idempotency/version semantics where touched by reconciliation;
- DSH Administration Go/unit/DB tests for role-definition, role-assignment, rollback, canonical intents, fencing, retries, terminal failures, readback, audit, diagnostics;
- OpenAPI lint/contract/provenance/generated-binding checks;
- Control Panel Administration type/controller/UI tests;
- runtime boundary tests for exact HTTP statuses/errors;
- migrations/schema assertions/reconciliation tests;
- negative-space repository scans for forbidden writers/vocabulary/legacy registry.

Any material failure reopens the associated root; do not patch test symptoms.

## STEP-200 — Create the exact final verification candidate

After the last Target System mutation:
- record exact `FINAL_CANDIDATE_SHA`;
- prove current `master` is integrated / candidate base relationship is current;
- ensure no uncommitted/untracked material residue in the execution environment;
- stop all source mutation while exact-final remote verification is running.

If any subsequent source change occurs, discard all exact-final evidence and repeat from this step.

## STEP-210 — Exact-final remote quality/security/CI evidence

For the SAME `FINAL_CANDIDATE_SHA`, obtain all applicable canonical evidence required by `02-VERIFICATION-CLOSURE.md`, including:
- contextual/full CI as required by the 257-file merge envelope;
- CodeQL;
- SonarQube quality gate and current revision;
- Semgrep;
- OpenCodeReview semantic review when canonical remote toolchain is available;
- remote-security gates (Gitleaks/Trivy/OSV/dependency/lockfile and workflow/action hardening tools as configured);
- runtime/migration/contract evidence;
- exact GitHub status/check/run readback.

A missing, skipped unexpectedly, pending, stale, wrong-SHA, tool-error, or zero-findings-from-a-failed-engine result is NOT PASS.

## STEP-220 — PR #284 readiness

Only after exact-final proof:
- update PR body to truthfully describe actual final scope, canonical owners, migrations/cutover, cleanup, verification evidence, and known non-applicable checks;
- ensure all material review threads are resolved because their source findings are actually closed;
- ensure no unresolved REQUEST_CHANGES or equivalent blocker;
- mark PR ready for review only after closure gates justify it;
- prove `mergeable=true` against current `master` and exact head SHA;
- prove all required/platform checks green; if ruleset visibility is unavailable, use the explicit fail-closed named evidence matrix rather than absence of red.

## STEP-230 — Merge gate

Merge PR #284 to `master` only when every `CE-*` is PASS and use the exact expected head SHA so GitHub rejects a stale merge.

If `master` or PR head moves between verification and merge:
1. DO NOT MERGE;
2. reconcile the new delta;
3. create a new final candidate;
4. rerun all invalidated exact-final evidence.

After merge, verify the resulting master commit contains the expected candidate and no material post-merge regression signal. Only then may the overall task reach `CLOSED`.

## Parallel execution rules

After STEP-010 and STEP-100/110 establish the canonical contract:
- backend/runtime conformance (STEP-120) and frontend consumer migration (STEP-130) may proceed in parallel where file ownership does not collide;
- workflow trust-boundary treatment (STEP-150) is independent and may proceed in parallel with semantic implementation;
- data reconciliation diagnostics (STEP-140) may run read-only in parallel, but any write migration waits for proven need;
- one integration authority owns final commits, contract generation, conflict reconciliation, and final cleanup;
- STEP-160/170 join all streams before exact-final candidate creation.

## Mutation cone vs verification envelope

**Mutation cone:** only files necessary to close proven semantic/security/integration roots plus derived consumers and evidence plumbing.

**Verification envelope:** the entire final PR #284 merge diff against current master, because all 257+ files will enter `master` if merged.

## Hard stop triggers

STOP and return to diagnosis when any of the following appears:
- a new material owner/authority conflict;
- need for a product choice not encoded by current Product Truth;
- new direct RBAC writer or second mutation executor;
- master/head delta materially changes the cone;
- data reconciliation exposes irreconcilable state requiring semantic decision;
- exact remote tool cannot establish trustworthy same-SHA evidence;
- required check/ruleset is missing or unexpectedly skipped;
- security/quality finding remains material after treatment;
- cleanup would remove a still-live consumer.
