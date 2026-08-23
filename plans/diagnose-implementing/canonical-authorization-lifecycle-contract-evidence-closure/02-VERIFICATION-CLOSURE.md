# 02 — VERIFICATION CLOSURE

PLAN_ID: `canonical-authorization-lifecycle-contract-evidence-closure`
SOURCE_AUDIT_HEAD: `674db9adff75356fda220d4e1e7aca9f90c540d1`
TARGET_REF: `c`
PHASE_REQUIRED: `EXECUTE_CLOSE`
HANDOFF_STATUS: `READY_FOR_EXECUTION`
CLOSURE_STATUS: `NOT_CLOSED`

## 1. Exact-final proof law

Closure evidence is valid only for the one immutable `FINAL_CANDIDATE_SHA` created after the last Target System change and after reconciliation with the then-current `master`.

The following are NOT PASS:
- evidence from any earlier SHA or parallel branch;
- `pending`, `queued`, `in_progress`, or stale results;
- unexpectedly skipped jobs/checks;
- absent required check/status/run;
- tool/engine/bootstrap failure that happens to report zero findings;
- historical Sonar/CodeQL/Semgrep/OpenCodeReview/remote-security evidence;
- local test success used as a substitute for repository-platform enforcement or remote security/quality proof;
- absence of red UI state without affirmative required evidence.

Any Target System change after evidence collection invalidates every affected exact-final proof and creates a new candidate.

## 2. Verification matrix

| ID | Verification target | Exact PASS condition | FAIL / reopen condition |
|---|---|---|---|
| `V-BASE-001` | candidate/base provenance | `FINAL_CANDIDATE_SHA` equals live PR #284 head; current `master` is reconciled; no unclassified Target System delta after handoff | head/base moved, conflict remains, wrong SHA, unclassified delta |
| `V-PRODUCT-001` | Product/Operational truth | Product Truth canonically declares execution lifecycle, constrained approval/execution matrix, Identity/DSH ownership, and diagnostics `healthy|attention` | lifecycle absent/ambiguous, forbidden pair allowed, duplicate owner/vocabulary |
| `V-CONTRACT-001` | OpenAPI/contract authority | all three material review endpoints have typed success schemas; lifecycle enum exact; diagnostics exact; material structured errors encoded; generated bindings/provenance green | generic material `200 object`, missing error/status, hand-maintained conflicting contract |
| `V-BACKEND-001` | backend/runtime semantics | exactly one canonical intent executor -> Identity -> Identity readback -> fenced finalization; all rejection paths return `not_started`; no empty/unknown execution state; diagnostics public status conforms; exact HTTP errors conform | direct alternate writer, false approval, empty state, runtime-only vocabulary, error drift |
| `V-DATA-001` | persistence/reconciliation | unique intent identity, lease-generation fencing, no legacy DSH role authority, legal state pairs only, expired work recoverable, audit reconciliation idempotent | duplicate intent, legacy authority, impossible persisted pair, stranded writer/lease, non-idempotent reconciliation |
| `V-CONSUMER-001` | Control Panel/frontend | lifecycle/diagnostics/error semantics derive from canonical transport contract; no optimistic local success; mutation readback/invalidation preserved | manual parallel enum/response authority, UI claims applied before canonical readback, missing consumer migration |
| `V-SECURITY-001` | workflow/security trust | privileged collector executes trusted repository/default-branch code only; target ref is data; least necessary permissions/secrets; exact CodeQL/security rerun has zero material finding; review thread resolved only after proof | untrusted execution path, unresolved finding, suppression-as-fix, wrong-SHA or failed scan |
| `V-QUALITY-001` | Sonar/static quality | exact final revision is analyzed; Quality Gate PASS; no material unresolved issue/security hotspot in effective scope; report SHA/revision matches candidate | failed/missing/stale gate, wrong revision, unresolved material finding |
| `V-CI-001` | CI/runtime/contract suite | required contextual/full CI and affected runtime/contract/migration suites complete successfully on exact final candidate | required run absent/pending/stale/skipped unexpectedly/failed |
| `V-REMOTE-SECURITY-001` | Semgrep/dependency/secrets/container/toolchain | every repository-configured material remote security gate applicable to final envelope passes exact final candidate; engine execution itself is proven healthy | finding remains, engine failed, scope silently excluded, stale/wrong SHA |
| `V-SEMANTIC-REVIEW-001` | OpenCodeReview / semantic reviewer | canonical remote semantic reviewer executes successfully on final diff when configured/available and returns no material unclosed finding | failed engine treated as zero findings, stale result, material review finding remains |
| `V-NEGATIVE-SPACE-001` | residue search | zero alternate writer, parallel state vocabulary, generic review response, legacy DSH RBAC registry, stale compatibility path, empty execution state, dead superseded artifact in affected cone | any material residue survives or remains an active consumer |
| `V-PR-001` | PR #284 readiness | live head=final SHA, base=current master, draft=false, mergeable=true, factual body, no unresolved material review/request-changes blocker | draft/conflict/stale body/unresolved material review/head mismatch |
| `V-MERGE-GATE-001` | repository merge authority | live ruleset/required-check enforcement is affirmatively proven when platform surface exposes it; regardless, explicit named evidence matrix below is all PASS | required policy/check unknown and relied on implicitly, enforcement absent without explicit fail-closed proof |

## 3. Canonical acceptance scenarios

### `AC-STATE-001` — new request

Given a new role-definition, role-assignment, or rollback request awaiting review:
- approval state = `pending`;
- execution state = `not_started`;
- no Identity mutation has occurred.

### `AC-STATE-002` — approved review accepted but execution outstanding

When checker approval has durably created canonical execution work but canonical Identity application/finalization is not yet proven:
- approval state remains `pending`;
- execution state is one of `pending | reconciling | retryable_failure | terminal_failure`;
- consumer MUST NOT display or infer applied RBAC truth.

### `AC-STATE-003` — canonical success

Only after Identity mutation succeeds, canonical Identity readback proves resulting truth, and the fenced DSH finalizer commits:
- approval state = `approved`;
- execution state = `applied`;
- Control Panel readback reflects canonical Identity truth.

### `AC-STATE-004` — rejection symmetry

For all three governed review journeys — role definition, role assignment, rollback — rejection returns and persists semantically:
- approval state = `rejected`;
- execution state = `not_started`;
- no executable mutation intent capable of changing RBAC truth remains.

### `AC-STATE-005` — failure never becomes false approval

For retryable failure, reconciliation, terminal failure, Identity outage, or stale executor:
- state never becomes `approved` without canonical applied readback/finalization;
- user-visible semantics indicate outstanding/failing mutation rather than success.

### `AC-AUTH-001` — Identity unavailable

If Identity is unavailable before canonical proof:
- no local DSH RBAC truth is written as substitute;
- structured `IDENTITY_UNAVAILABLE`/canonical lifecycle outcome is returned as defined by contract;
- durable intent/retry semantics remain the sole recovery path where applicable.

### `AC-AUTH-002` — maker/checker/version enforcement

Self-review, invalid request state, or expected-version mismatch:
- is rejected with exact canonical structured error/status;
- creates no unauthorized Identity mutation;
- cannot bypass through UI or alternate endpoint.

### `AC-IDEMPOTENCY-001` — replay/recovery

Repeated delivery, process crash, worker retry, or manual canonical retry of one `(operation_type, request_id)`:
- yields one semantic mutation intent;
- does not duplicate role assignment/revocation/definition effect;
- converges by Identity readback.

### `AC-FENCING-001` — stale executor

An executor with expired owner/lease generation cannot finalize after a newer generation claims the intent. Only the current fenced generation can dispose/finalize.

### `AC-DIAG-001` — diagnostics public vocabulary

When all required governed dependencies are healthy, top-level status = `healthy`. When any material required dependency requires operator attention, top-level status = `attention`; component facts preserve the reason. No public `degraded` or `unhealthy` Administration status survives.

### `AC-UI-001` — no false success

After a mutation review, Control Panel invalidates/reloads canonical read models and never fabricates applied state locally. Structured reconciling/failure states remain visible and actionable.

### `AC-DATA-001` — persisted state reconciliation

Repository/runtime DB assertions prove:
- `approved -> applied`;
- `rejected -> not_started/no executable intent`;
- pending execution states conform to the matrix;
- no duplicate canonical intent;
- no `dsh_admin_roles` canonical authority residue;
- audit reconstruction is idempotent and privacy-safe.

### `AC-SECURITY-001` — privileged workflow isolation

A pull-request/untrusted target SHA cannot cause its code/scripts/workflow-controlled executable content to run in the privileged `workflow_run` remote-analysis collector with repository write capability or secrets. Trusted collector code is selected directly from repository-owned default-branch authority; target SHA/ref is queried as data only.

## 4. Required negative-space searches

Before closure, perform repository-wide targeted searches over the affected cone and relevant merge diff for all of the following classes. Every match must be classified `CANONICAL | DERIVED | TEST_ONLY | DELETE_REQUIRED | NOT_APPLICABLE_PROVEN`:

- `dsh_admin_roles`, legacy role UUID links, or any DSH-owned RBAC registry;
- direct Identity role-definition/assignment mutation calls outside the canonical DSH intent executor path;
- second queue/worker/synchronous mutation path for the same governed operation;
- `approved` assumptions that omit `executionStatus=applied` semantics;
- empty/default/unknown execution status paths;
- alternate execution lifecycle enum/string vocabulary;
- `degraded` / `unhealthy` as public DSH Administration diagnostics status;
- generic material review success `type: object` schemas;
- handwritten frontend review-response/lifecycle/error types that independently own semantics rather than derive from canonical contract;
- fallback/compatibility aliases preserving previous contract/state meanings;
- stale/dead tests or fixtures whose only purpose is obsolete semantics;
- unresolved TODO/FIXME/temporary bypass related to the root;
- stale plan or PR metadata claiming a superseded baseline/result;
- any `continue-on-error`, ignored exit status, or evidence collector behavior that can convert scanner/engine failure into green evidence.

`V-NEGATIVE-SPACE-001` cannot PASS until every material match has an explicit disposition and all `DELETE_REQUIRED` obligations are completed.

## 5. Exact-final evidence set

All applicable evidence below must identify the same `FINAL_CANDIDATE_SHA` or prove immutable checkout of that SHA:

| Evidence | Required proof |
|---|---|
| GitHub PR metadata | exact head SHA, current base SHA, draft=false, mergeable=true |
| GitHub status/check/run readback | all required named checks/runs present and successful; no material pending/missing/stale |
| Contextual/full CI | build/test/contracts/DB/runtime scopes appropriate to the full final merge envelope |
| Identity/DSH Go tests | canonical authority, mutation lifecycle, idempotency, readback, fencing, error mapping |
| Administration contract tests | OpenAPI schema/provenance/generated bindings and exact HTTP response/error semantics |
| Control Panel tests | typed consumer contract, state rendering, invalidation/readback, errors/permissions |
| DB migration/schema assertions | canonical intent uniqueness/fencing, legacy registry absence, reconciliation invariants |
| CodeQL | exact final analysis, zero material unresolved alert/findings; trust-boundary finding closed by source proof |
| SonarQube | exact revision + Quality Gate PASS + material issue/hotspot review |
| Semgrep | engine/rules/scope executed successfully, zero material finding |
| OpenCodeReview | engine executes successfully and semantic findings are zero/closed when configured/applicable |
| Remote security | repository-configured secrets/dependency/container/workflow/action hardening gates pass |
| Negative-space scans | zero material parallel truth/writer/legacy/fallback residue |
| Review threads | every material thread resolved because source issue is proven closed, not administratively hidden |

If a named tool is not applicable or unavailable in the canonical repository toolchain, the closure record must say `N/A_PROVEN` with the exact reason and an authoritative substitute if the property still requires proof. `N/A` cannot be used to bypass a required security/quality property.

## 6. Closure Evidence gates

The task may reach `CLOSED` only when every gate below is PASS on the same final candidate:

| Gate | Mandatory closure condition |
|---|---|
| `CE-001 EXACT_CANDIDATE` | one immutable final SHA is named and all evidence binds to it |
| `CE-002 ZERO_MATERIAL_FINDINGS` | zero known unresolved material product/semantic/architectural/security/quality/runtime/data finding |
| `CE-003 ZERO_PARALLEL_TRUTH` | one source/authority/owner/write path per material truth; no shadow/duplicate writer/state/contract |
| `CE-004 COMPLETE_CONSUMER_CUTOVER` | every writer/reader/consumer/API/UI/runtime surface in affected cone migrated; zero missing consumer/partial cutover |
| `CE-005 ZERO_WORKAROUND_RESIDUE` | zero patch/fallback/permanent compatibility/unjustified legacy/dead/stale/orphan residue in scope |
| `CE-006 FULL_MERGE_ENVELOPE_VERIFIED` | entire final PR #284 diff against current master is covered by adequate CI/security/quality/regression proof, not only the narrow mutation cone |
| `CE-007 CURRENT_MASTER_RECONCILED` | current master is integrated, PR has no conflict, mergeability is affirmatively true |
| `CE-008 EXACT_REMOTE_EVIDENCE_GREEN` | all required exact-final CI/CodeQL/Sonar/Semgrep/semantic/remote-security evidence is PASS or narrowly `N/A_PROVEN`; no unresolved material review thread |
| `CE-009 GUARDED_MERGE` | merge uses the expected exact head SHA so GitHub rejects stale head; merge result is successful |
| `CE-010 POST_MERGE_MASTER_PROOF` | resulting master contains expected candidate and immediate canonical verification/repository signals show no material regression |

`CE-009` is forbidden unless `CE-001..CE-008` are already PASS. Overall `CLOSED` is forbidden until `CE-010` passes.

## 7. PR #284 all-green gate

“Everything green” means affirmative proof, not color alone. Before merge, PR #284 must satisfy all of the following simultaneously:

1. exact head equals `FINAL_CANDIDATE_SHA`;
2. base is the current reconciled `master`;
3. PR is not draft;
4. GitHub reports it mergeable;
5. all platform-required checks/ruleset conditions visible through authoritative APIs are satisfied;
6. every required check named by this closure contract is present and PASS, even if GitHub platform configuration accidentally does not require it;
7. no material security/code-review thread or request-changes state remains unresolved;
8. PR body describes the final actual scope/evidence and contains no stale claim;
9. no later commit has invalidated the evidence.

If branch protection/ruleset APIs cannot prove enforcement, this explicit gate remains authoritative and fail-closed. Lack of server-side enforcement is a repository-governance finding to close or explicitly prove equivalent enforcement before merge; it is never permission to merge unverified code.

## 8. Re-diagnosis loop

After each implementation/verification cycle:

`VERIFY -> RE-AUDIT AFFECTED CONE -> RE-SCAN NEGATIVE SPACE -> RE-RANK FINDINGS -> FIX HIGHEST ROOT -> CLEANUP -> NEW EXACT CANDIDATE -> VERIFY AGAIN`

Reopen the root rather than patch its symptom when:
- a test reveals a semantic mismatch;
- a scanner finds a new trust/dataflow issue;
- a consumer still depends on obsolete vocabulary;
- a migration reveals impossible historical state;
- master/head changes;
- a supposedly green tool did not actually execute the intended engine/scope;
- any `DELETE_REQUIRED` residue remains.

## 9. Current AUDIT_PREPARE result

At handoff creation:
- canonical source audit baseline = `674db9adff75356fda220d4e1e7aca9f90c540d1`;
- the subsequent changes in this PLAN_DIR are derived planning artifacts only and MUST be reconciled by `STEP-000` before Target System execution;
- the implementation roots and treatments are deterministic;
- no material `DECISION_REQUIRED` remains open;
- no closure verification gate in this file is claimed as executed by the planning phase;
- PR #284 is NOT declared green, merge-ready, merged, or `CLOSED`.

Therefore the handoff status is **`READY_FOR_EXECUTION`**, while closure remains **`NOT_CLOSED`** until `CE-001..CE-010` are all proven.
