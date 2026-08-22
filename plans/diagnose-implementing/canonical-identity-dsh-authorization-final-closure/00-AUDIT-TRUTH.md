# Canonical Identity / DSH Authorization — Audit Truth

PLAN_ID: `canonical-identity-dsh-authorization-final-closure`  
REPOSITORY: `bthwani2-boop/bthwani-suite-next`  
TARGET_REF: `c`  
STARTING_HEAD: `262a80ad889963e8d950178c075b3272176e2b5c`  
PLANNED_HEAD: `RESOLVE_AT_EXECUTE_CLOSE_START_AND_REPIN_AFTER_EACH_SOURCE_CHANGE`  
LAST_RECONCILED_HEAD: `262a80ad889963e8d950178c075b3272176e2b5c`  
AUDIT_TIMESTAMP: `2026-08-23T02:38:00+03:00`  
OBJECTIVE: `Root-correct final closure of canonical Identity/DSH authorization, governed role mutation lifecycle, UX/readback truth, migrations, cleanup, and exact-candidate remote verification.`  
PHASE: `AUDIT_PREPARE`  
SCOPE: `Smallest complete working cone rooted in canonical Identity authority and DSH governed authorization workflows, plus materially affected consumers, data, runtime, CI/security/quality evidence.`  
PRIMARY_FOCUS: `Product/System/Semantic/Architectural authorization truth; contracts/data/runtime/security/quality are activated where causally affected.`

STATUS: `READY_FOR_EXECUTION`

## 1. Governing interpretation

This audit was performed under `tools/prompting/bthwani-orchestrator/00-ORCHESTRATOR.md` package revision 13 from the pinned target source HEAD above. `AUDIT_PREPARE` keeps the Target System read-only. Updating these three already-existing plan contracts is the required handoff and is not treatment of the Target System.

No new plan file, branch, lifecycle, authorization authority, fallback authority, or shadow truth is authorized by this plan. `tools/prompting/bthwani-orchestrator/**` remains read-only.

A tracked workflow, a green historical run, a build, a typecheck, a unit test, or a scanner configuration is not closure evidence by itself. Every material verification tool must eventually prove enablement, effective scope, exact candidate SHA, provenance/run identity, result, freshness, and relevant findings/suppressions after the final source change.

## 2. Canonical Product/System Truth

### CT-01 — Identity authority

`core/identity` is the sole canonical authority for:

- actor identity and authenticated session truth;
- operator context;
- role definitions;
- permission vocabulary;
- role-permission bindings;
- actor-role assignments;
- resolved effective authorization.

DSH may consume and govern changes to this truth, but must not create a parallel authorization vocabulary or assignment authority.

### CT-02 — DSH Administration authority

`services/dsh/backend/internal/administration` owns the governed operational workflow around authorization mutation:

- maker request;
- checker review;
- rollback request and independent rollback review;
- local request/audit projection;
- durable mutation orchestration and reconciliation;
- canonical Identity readback before UX success.

DSH workflow state is orchestration/audit truth. It must never replace Identity authorization truth.

### CT-03 — Separation of duties invariant

For every governed role definition/assignment mutation, the effective actors must satisfy the business invariant at the domain/use-case boundary, not only in UI or HTTP handlers:

- maker != beneficiary;
- checker != maker;
- checker != beneficiary.

For rollback/revocation originating from a previously approved assignment:

- rollback maker != beneficiary;
- rollback checker != rollback maker;
- rollback checker != beneficiary;
- rollback checker != original source checker.

The invariant must survive direct use-case invocation, HTTP retries, worker retries, process restart, and concurrent workers.

### CT-04 — Durable mutation lifecycle

A governed authorization mutation crosses a local PostgreSQL boundary and a remote Identity boundary. Therefore the canonical local orchestration must represent the real transition explicitly and durably. A local request must not become terminally successful merely because a remote call returned once, and an intent must not become permanently unreachable because the request already left `pending`.

The lifecycle requires one durable state machine with stable idempotency, claim/lease semantics, bounded retry scheduling, canonical readback, reconciliation of crash windows, and a terminal/repairable classification. This is not permission authority; it is the existing DSH workflow's orchestration responsibility.

### CT-05 — UX truth

The Control Panel may display success only when the governed operation has reached the canonical state and Identity readback confirms the expected role/permission truth. Intermediate, retryable, failed, reconciliation-required, empty, unavailable, and recovery states must be explicit where materially reachable. No screen may infer success from a local-only status flip.

### CT-06 — permission vocabulary survivor

The canonical read capability for Platform Control is `platform:read`.

Evidence on the pinned target source:

- the live Control Panel navigation checks `platform:read`;
- Platform Control backend read routes are guarded by `platform:read`;
- the local Identity bootstrap currently contains both `platform:read` and `platform.read`, despite its own rule that aliases/migration-era names do not belong there.

Therefore `platform.read` is superseded residue. Execute phase must migrate any remaining consumer/data references to `platform:read`, prove zero remaining consumers, then delete the alias and its bindings/data residue.

## 3. Authority / Writer / Reader / Consumer map

| Concern | Canonical owner | Legitimate writers | Readers / consumers | Forbidden parallel truth |
|---|---|---|---|---|
| Actor/session/operator context | Identity | Identity auth/session use cases | DSH, Platform Control, Control Panel | client-selected or DSH-local identity authority |
| Permission vocabulary | Identity | Identity RBAC administration/bootstrap governed source | DSH administration, Platform Control, Control Panel | DSH-local aliases or duplicated vocabularies |
| Role definitions/bindings | Identity | Identity canonical RBAC mutation API | DSH governed admin/readback, authorization resolvers | local DSH role definition truth |
| Actor-role assignments | Identity | Identity canonical grant/revoke API | session/auth resolvers, DSH readback, UX | local assignment as authorization source |
| Maker/checker workflow | DSH Administration | DSH governed request/review use cases | Control Panel, audit, worker | UI-only approval rules |
| Mutation orchestration | DSH Administration | single canonical orchestration use case/worker | review paths, reconciliation, audit | ad-hoc retries or second queue/state machine |
| Platform read capability | Identity vocabulary + live Platform Control contract | Identity vocabulary governance | Control Panel + Platform Control backend | `platform.read` alias |
| Tool evidence | GitHub Actions / scanner authority | governed remote workflows | closure gate | local/manual result treated as final evidence |

## 4. Effective Scope / Working Cone

The working cone is intentionally smaller than the repository and includes only the paths required to close the proven roots and their consumers:

- `services/dsh/backend/internal/administration/**`
- materially related DSH HTTP administration handlers/contracts/tests/migrations;
- `services/dsh/backend/internal/auth/**`
- `core/identity/backend/internal/identity/**` RBAC/vocabulary/bootstrap paths materially touched by the cutover;
- Identity schema/migrations for vocabulary/bindings if required by the cleanup;
- Control Panel authorization consumers/readback states in the affected administration/platform journeys;
- Platform Control authorization boundary where it proves the canonical capability;
- `.github/workflows/sonarqube.yml` and the remote verification workflows needed for exact-candidate evidence;
- tests/fixtures/contracts generated from any changed canonical API/schema;
- only data migrations/backfills necessary for the proven duplicate vocabulary or lifecycle-state change.

Repository-wide sweep is prohibited unless a concrete reference/consumer search from a proven root expands the cone.

## 5. Proven Root Causes

### RC-0 — CRITICAL — Separation-of-duties invariant is incomplete at the mutation owner

`ReviewRoleAssignmentApproval` prevents reviewer == maker but does not prevent reviewer == beneficiary. `ReviewRollbackRequest` likewise prevents reviewer == rollback maker but does not prevent reviewer == beneficiary or reviewer == original source checker.

Impact:

- a privileged target can approve a role assignment to itself after another actor creates the request;
- a beneficiary can approve its own rollback/revocation workflow;
- the original source checker can also become the rollback checker, defeating independent reversal review;
- UI or handler checks cannot repair this because the invariant is missing at the domain/use-case owner.

Negative-space evidence: the administration package currently has only the audit-redaction unit test; no dedicated negative tests prove these maker/beneficiary/checker combinations.

Required source of fix: central DSH administration domain/use-case invariant reused by assignment, role-definition mutation where applicable, and rollback paths; then HTTP/UX/tests consume that single rule.

### RC-1 — HIGH — Canonical mutation intent lifecycle can diverge from request and Identity truth

Current intent behavior proves multiple structural gaps:

1. failed/non-applied intents are immediately scheduled with `next_attempt_at = NOW()`; there is no bounded/exponential backoff or retry classification;
2. workers select due intents without a durable claim/lease/ownership mechanism;
3. retries only reload requests whose status is still `pending`;
4. request approval may commit and the subsequent `markCanonicalMutation(..., "applied")` error is ignored;
5. this makes `request=approved` + `intent!=applied` reachable, while the retry worker can no longer replay that request because it is not pending;
6. multiple workers can observe the same due intent; remote idempotency limits remote duplication but does not make the local orchestration state machine exclusive or self-repairing.

Required source of fix: one canonical orchestration state machine that persists pre-remote, remote-applied/readback, local-finalization, retry, and terminal/reconciliation states; it must have stable idempotency and durable claim/lease behavior. Do not add a second queue or shadow lifecycle.

### RC-2 — HIGH — Superseded authorization vocabulary/helper paths remain reachable

Two concrete residues remain:

- Identity local bootstrap grants both `platform:read` and `platform.read` although the live frontend/backend contract uses `platform:read` and the bootstrap explicitly rejects aliases/migration-era names;
- DSH auth still exposes convenience wrappers that synthesize `legacy-grant:` and `legacy-revoke:` idempotency keys beside the newer explicit-idempotency APIs.

Required source of fix: migrate all live consumers and persisted bindings to the canonical APIs/capability, reconcile/backfill data, prove zero references, then delete the alias and legacy wrappers. No permanent compatibility alias is allowed.

### RC-3 — HIGH — Sonar remote verification is blocked by invalid Go coverage generation semantics

Historical remote Sonar run `32604031534` for old SHA `6f5c67576cfbdc959c3a3ed2551efdc4517e9bb7` failed specifically at `Generate Go coverage report`, before the Sonar scanner could run.

The current workflow source still combines legacy `go test -coverprofile=<text file>` outputs and then passes the concatenated text profile to `go tool covdata textfmt -i=...`. `covdata textfmt` expects covdata directories, not a concatenated legacy text profile. The per-package filename also uses package basename and can collide for distinct packages with the same basename.

Required source of fix: choose one valid coverage model and keep it canonical:

- preferred simple path where module topology permits: produce one valid Go legacy coverprofile with one `mode:` header and validate it with `go tool cover -func` before scanner; or
- if covdata is required, generate real `GOCOVERDIR` covdata directories and pass those directories to `go tool covdata textfmt`.

No silent skip/empty report/fallback is allowed. Sonar scanner and Quality Gate must run only after a validated non-empty report.

### RC-4 — CLOSURE GATE — Exact-final-candidate remote evidence is absent

At audit source HEAD `262a80ad889963e8d950178c075b3272176e2b5c`:

- no classic commit statuses were present;
- the linked connector returned no PR-triggered workflow runs for the exact SHA;
- no GitHub issue containing that exact SHA was found;
- the connector does not expose the generic Actions run-list/dispatch surface needed to prove every `workflow_dispatch`/issue-triggered run from this chat.

This is not evidence that workflows never ran. It is evidence that exact-candidate PASS is not currently proven and therefore cannot be counted.

Tracked workflow design observations:

- Semgrep: exact-SHA-aware and fail-closed configuration is present;
- OpenCodeReview: exact head/base materialization and fail-closed adjudication configuration is present;
- Remote Security: governed remote workflow exists, but the latest `c` commit explicitly says known failing/unproven Remote Security/yamllint/Regal/Conftest policy changes were excluded;
- Sonar: exact-SHA-aware workflow exists but the Go coverage blocker above must be repaired;
- CodeQL: historical old-SHA evidence exists, not exact-current-candidate evidence.

All must be rerun on the final source SHA after the last source mutation.

## 6. Settled material decisions

| ID | Decision | Rationale |
|---|---|---|
| D-01 | Identity remains the sole authorization truth owner. | Existing architecture and canonical APIs already establish this boundary. |
| D-02 | DSH Administration remains the sole governed maker/checker/orchestration owner. | Moving workflow state into Identity would conflate authorization truth with operational approval orchestration. |
| D-03 | SoD is pairwise distinct maker/beneficiary/checker; rollback checker also differs from original source checker. | This is the smallest rule that closes the proven self-benefit and non-independent rollback paths. |
| D-04 | `platform:read` survives; `platform.read` is migrated and deleted. | Both live Control Panel and Platform Control backend use `platform:read`. |
| D-05 | Explicit-idempotency APIs survive; `legacy-grant:`/`legacy-revoke:` wrappers are deleted after consumer migration. | Idempotency must be operation/request-derived and durable, not hidden in compatibility wrappers. |
| D-06 | Canonical mutation orchestration is repaired in-place as one state machine; no second queue/lifecycle is created. | Prevents parallel truth and preserves correct owner. |
| D-07 | Sonar Go coverage uses one valid coverage representation and validates it before scanner; no coverage bypass. | Repairs the actual failing step rather than weakening the gate. |
| D-08 | Branch `c` only; no new implementation branch is created for this task. | Explicit execution constraint. |
| D-09 | Exact-candidate remote tool evidence is mandatory after the last source change. | Package revision 13 closure contract. |

There are no unresolved material `DECISION_REQUIRED` items at the end of this AUDIT_PREPARE pass.

## 7. Negative Space that must be re-audited in EXECUTE_CLOSE

The following absence/edge conditions are closure-critical:

- no path permits beneficiary == checker;
- no rollback path permits source checker == rollback checker;
- no direct use-case call bypasses SoD;
- no intent can remain forever non-applied after local approval;
- no stale lease can permanently block reconciliation;
- no two workers can own the same mutation simultaneously;
- no retry storm occurs during Identity outage;
- no UI displays success before canonical Identity readback;
- no `platform.read` vocabulary/binding/session/bootstrap/frontend/backend reference remains after cutover;
- no `legacy-grant:` or `legacy-revoke:` helper/consumer remains;
- no empty or malformed Go coverage artifact can be accepted by Sonar workflow;
- no historical/stale/different-SHA scanner result is accepted as final evidence;
- no plan-only commit is mistaken for implementation closure.

## 8. Tool evidence ledger at AUDIT_PREPARE stop

| Tool / boundary | Current evidence | Audit verdict |
|---|---|---|
| CodeQL | historical old-SHA success exists; no exact final candidate proof | `REQUIRED_IN_EXECUTE_CLOSE` |
| SonarQube Cloud | run `32604031534` failed at Go coverage on old SHA; source-level blocker identified | `ROOT_CAUSE_PROVEN / FIX_FIRST` |
| Semgrep | fail-closed exact-SHA workflow present; exact final run not proven | `ENABLED_NOT_CLOSED` |
| Remote Security | workflow present; latest c commit records excluded failing/unproven policy changes | `ENABLED_NOT_CLOSED` |
| OpenCodeReview | exact candidate/evidence adjudication workflow present; exact final run not proven | `ENABLED_NOT_CLOSED` |
| Dependency Review / lockfile integrity | hardened workflow changes exist in current lineage | `REVERIFY_FINAL_SHA` |
| PR / integration | PR #284 is draft and was not mergeable at audit time; c is unprotected | `NOT_A_CLOSURE_GATE_PASS` |

## 9. AUDIT_PREPARE stopping condition

The root causes, canonical target, smallest complete working cone, migration/cutover direction, cleanup obligations, verification gates, and material decisions are sufficiently proven for execution. The Target System has not been modified in this phase; only the existing plan contract is being refreshed.

Next legal state: `EXECUTE_CLOSE` using `01-EXECUTION-CONTRACT.md`, with a mandatory fresh HEAD re-pin/re-audit before any source write.

`READY_FOR_EXECUTION`
