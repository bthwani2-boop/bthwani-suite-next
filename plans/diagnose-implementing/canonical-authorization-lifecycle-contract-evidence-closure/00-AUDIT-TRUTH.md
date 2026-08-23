# Canonical Authorization Lifecycle + Exact Remote Evidence — Audit Truth

PLAN_ID: `canonical-authorization-lifecycle-contract-evidence-closure`  
PACKAGE_REVISION: `13`  
REPOSITORY: `bthwani2-boop/bthwani-suite-next`  
TARGET_REF: `c`  
PHASE: `AUDIT_PREPARE`  
STARTING_HEAD: `57f6603c6e9fa15d2c406f454b9e20f566f30599`  
AUDITED_TARGET_SOURCE_HEAD: `57f6603c6e9fa15d2c406f454b9e20f566f30599`  
AUDIT_DATE: `2026-08-23`  
STATUS: `READY_FOR_EXECUTION`  
OBJECTIVE: `Root-correct end-to-end closure of the canonical administration authorization mutation lifecycle contract, its consumers, and exact-final remote verification evidence.`

## 1. Governing interpretation

This handoff was rebuilt from the exact live branch `c` source HEAD under `tools/prompting/bthwani-orchestrator/00-ORCHESTRATOR.md` package revision 13.

`AUDIT_PREPARE` kept the Target System read-only. No backend, frontend, OpenAPI, governance, database, workflow, runtime, application, generated binding, or orchestrator target file was treated in this phase. The only writes are retirement of the materially superseded prior plan package and creation of this three-file derived handoff.

`tools/prompting/bthwani-orchestrator/**` remains read-only. No branch was created or switched.

The user-supplied historical paths:

- `plans/diagnose-implementing/canonical-identity-dsh-authorization-final-closure/`
- `plans/diagnose-implementing/2026-08-22-canonical-authorization-authority-e2e.md`

were already absent before this package. The later package `canonical-identity-dsh-authorization-remote-evidence-closure` was materially stale because it was pinned to `a19a987...` and still classified roots that were changed by later source commit `c1aa06f...`; it was therefore retired in full before this package was written.

## 2. Reconciled canonical ownership

### `INV-AUTH-001 — Identity is the sole RBAC truth owner`

Identity remains the sole canonical owner of:

- actor identity and authentication;
- role definitions;
- canonical permission vocabulary;
- role-permission bindings;
- actor-role assignments;
- resolved authorization truth.

DSH must not create a local authorization registry, permission truth, shadow assignment state, or a second role-definition authority.

### `INV-AUTH-002 — DSH Administration owns governed mutation orchestration, not RBAC truth`

DSH Administration owns:

- maker/checker request state;
- separation-of-duties validation;
- durable canonical mutation intent orchestration;
- retry/reconciliation execution state;
- append-only administration audit/projection.

These are operational facts. They must not become parallel RBAC truth.

### `INV-AUTH-003 — Control Panel is a consumer/operator surface`

The Control Panel may initiate governed requests, review decisions, display execution/reconciliation state, and refresh canonical state. It may not define alternate authorization semantics or optimistic local success that outruns canonical Identity readback.

## 3. Source-fixed prior architectural root — one execution/finalization authority

The prior highest root, duplicate synchronous mutation/finalization beside the canonical intent worker, is no longer live on `57f6603...`.

Current source proves:

- `ReviewRoleAssignmentApproval` persists one durable `role-assignment` intent and then invokes `executeCanonicalMutationNow()`;
- `ReviewRoleDefinitionRequest` persists one `role-definition-upsert` intent and invokes the same immediate execution primitive;
- `ReviewRollbackRequest` persists one `role-rollback` intent and invokes the same immediate execution primitive;
- `executeCanonicalMutationNow()` and the worker both route through the same canonical reconciler;
- the canonical intent implementation owns pre-readback, mutation-if-required, post-readback, retry/failure classification and finalization;
- fencing uses `lease_owner`, `lease_expires_at`, and `lease_generation`;
- the current safety bounds are a 60-second lease and 20-second per-intent execution timeout;
- stale lease owners cannot write success because finalization and failure-state writes require the current owner, current generation, and an unexpired lease;
- source-request finalization, audit and intent `applied` transition are atomically guarded inside the DSH finalization transaction.

Disposition: `SOURCE_FIXED / MUST_REMAIN_NEGATIVE_SPACE_CLOSED`. Execution must not recreate a direct synchronous Identity executor, direct-finalizer SQL path, unleased fallback, or second lifecycle.

## 4. Highest proven current live root — `RC-AUTH-CONTRACT-001`

**Severity:** `HIGH`  
**Class:** Product / System / Semantic / Contract / Governance  
**Status:** `PROVEN_LIVE`

### Problem

The authorization mutation execution/reconciliation lifecycle now exists as a real cross-layer system fact, but it has no single complete Product/API semantic owner.

The current product-truth owner `governance/product/contracts/administration-roles-approvals-audit.product-truth.json` defines decision/approval state only:

- `pending`
- `approved`
- `rejected`

It does not define the separate durable mutation execution lifecycle or the actor-visible meaning of reconciliation/failure states.

The current OpenAPI `services/dsh/contracts/dsh.administration.openapi.yaml` already contains a `MutationExecutionStatus` vocabulary:

- `not_started`
- `pending`
- `reconciling`
- `retryable_failure`
- `terminal_failure`
- `applied`

but the three material review operations still expose a generic `200` response shape and do not canonically declare the full runtime outcome/error semantics. The live backend can return structured semantics including:

- `404 NOT_FOUND`;
- `503 IDENTITY_UNAVAILABLE`;
- `409 CANONICAL_MUTATION_FAILED`;
- `409 CANONICAL_MUTATION_RECONCILING`;
- `409 REQUEST_STATE_CONFLICT`;
- `400 SEPARATION_OF_DUTIES_VIOLATION`;
- `400 INVALID_REQUEST`.

The Control Panel already consumes structured transport errors and execution status. Therefore implementation and UI have become richer than the durable Product/API semantic authority.

### Why this is root-level

This is not a documentation cosmetic issue. It determines whether the same approved mutation is interpreted consistently across Product, API, Backend, UI, tests and later readback.

Without a canonical distinction, different consumers can incorrectly equate:

`approved decision == applied RBAC mutation`

when the real distributed contract is:

`approved decision + canonical intent may still be pending/reconciling/failing until Identity post-readback and fenced DSH finalization succeed`.

This drift can recreate local-success truth, error-code drift, generated-client ambiguity, UI inconsistency, and future parallel lifecycle definitions even though the executor itself is now structurally unified.

### Canonical target

Decision state and execution state are orthogonal canonical facts:

```text
Decision state
  pending | approved | rejected

Execution state
  not_started | pending | reconciling | retryable_failure | terminal_failure | applied
```

Required meaning:

- `not_started`: no canonical mutation execution obligation is active yet.
- `pending`: durable canonical intent exists and is eligible/awaiting execution.
- `reconciling`: an approved intent is currently owned or canonical outcome is being reconciled; it is not success.
- `retryable_failure`: canonical application is not confirmed; bounded retry/reconciliation remains legitimate.
- `terminal_failure`: canonical application cannot continue under the current request without a new governed action; it is not applied.
- `applied`: canonical Identity state is confirmed by post-readback and DSH request/intent/audit finalization is successfully fenced and committed.

A review API may make a synchronous execution attempt, but it must return the canonical lifecycle truth. The product is not redesigned into an asynchronous-polling-only flow merely to avoid modeling failure/reconciliation correctly.

## 5. Current consumers / writers / readers

| Fact | Canonical owner | Legitimate writer | Readers / consumers | Forbidden parallel truth |
|---|---|---|---|---|
| RBAC role definitions, permissions, actor-role assignments | Identity | Identity RBAC API | DSH Administration, sessions, Control Panel | DSH-local RBAC registry |
| review decision state | DSH Administration | governed maker/checker use cases | Control Panel queues, audit | UI-local decision truth |
| mutation execution/reconciliation state | DSH canonical intents | one fenced reconciler/finalizer | review response, worker, diagnostics, Control Panel | direct synchronous executor or UI-derived success |
| API status/error semantics | canonical DSH OpenAPI + HTTP implementation | contract owner + adapter | generated/manual consumers, tests, Control Panel | handwritten divergent status/code maps |
| durable Product/System meaning | existing administration product-truth owner | governed product/governance reconciliation | future objectives, contracts, implementations | implementation-only semantic authority |

## 6. Effective working cone / blast radius

### IN_SCOPE for execution

- `governance/product/contracts/administration-roles-approvals-audit.product-truth.json`;
- `services/dsh/contracts/dsh.administration.openapi.yaml`;
- materially affected generated/manual contract bindings;
- `services/dsh/backend/internal/administration/**` only where contract/error/result semantics or regression tests require alignment;
- material DSH administration HTTP adapter/error mapping and tests;
- Control Panel administration API types/controller/UI tests and canonical readback behavior;
- database/current migrations as read/verification inputs; mutation only if live evidence proves the current persisted intent state cannot express the settled lifecycle;
- CI/security/quality workflows only if an exact-final rerun reproduces a real source defect requiring owner-correct treatment.

### READ_ONLY / negative-space proof

- Identity RBAC owner implementation, unless execution discovers a direct contract contradiction;
- current canonical intent executor/fencing implementation, except regression-hardening required to preserve the settled semantics;
- unrelated domains/surfaces.

### NOT_AFFECTED_WITH_REASON

Unrelated DSH commerce/order/catalog/finance functionality is outside the mutation cone because no causal, authority, consumer or contract relation to this authorization lifecycle was proven.

## 7. Cleanup / deletion / migration disposition

### `DELETE_REQUIRED`

- the stale `canonical-identity-dsh-authorization-remote-evidence-closure` plan package: retired before this handoff;
- generic review response schemas that remain after typed canonical review-response schemas replace them, where they have no other legitimate consumer;
- duplicate handwritten lifecycle enums/status maps/error-code truth exposed by execution after canonical contract cutover;
- any obsolete tests or compatibility aliases that assert the superseded `approved == applied` meaning.

### `MIGRATE / RECONCILE`

- Product Truth to include the execution lifecycle and invariants;
- OpenAPI review responses and structured error outcomes;
- generated/manual API bindings where the contract pipeline requires regeneration;
- affected consumers/tests to one canonical typed result/error model.

### `KEEP / HARDEN`

- one canonical intent executor/reconciler;
- current lease owner + expiry + generation fencing;
- synchronous execution-attempt UX/API behavior;
- structured HTTP error consumption;
- canonical Control Panel readback/refetch.

### Database disposition

No schema migration is currently required. Existing intent/request state already expresses the observed lifecycle. If live execution proves this assumption false, stop the affected cone and re-establish the migration contract rather than introducing an ad-hoc column or shadow status.

## 8. Exact-current evidence gate — `RC-EXACT-EVIDENCE-001`

For exact audited Target Source SHA `57f6603c6e9fa15d2c406f454b9e20f566f30599`:

- GitHub returned no PR-triggered workflow runs;
- GitHub returned no classic commit statuses.

Therefore no SonarQube, CodeQL, Semgrep, OpenCodeReview, Remote Security, CI, dependency or lockfile result is an exact-current PASS. Older or parallel evidence below is diagnostic evidence only.

## 9. Tool Evidence Matrix — actual outputs inspected

### `E-SONAR-001 — SonarQube historical remote failure`

Remote command issue `#306` targeted `c@33f12d90...` and canonical run `32605132576`.

Direct job inspection proves:

- branch ownership: PASS;
- candidate checkout: PASS;
- Sonar token validation: PASS;
- Node affected coverage preparation: PASS;
- governed DB provisioning/migrations: PASS;
- **Generate affected Go coverage reports: FAIL**;
- **SonarQube scanner: SKIPPED**.

Verdict: `STALE_FAIL / SCANNER_NOT_EXECUTED`. It produced no valid Quality Gate for that candidate.

Current `sonarqube.yml` has since moved to one `go test ./... -coverprofile` per Go module with raw and normalized `go tool cover -func` validation before scanner. Therefore the old coverage-generation defect is `SOURCE_FIXED / EXACT_FINAL_RERUN_REQUIRED`.

PR `#304` supplies a separate real Sonar result on a divergent candidate: **Quality Gate FAILED because Security Rating on New Code = B while A was required**. This is `PARALLEL_CANDIDATE_FINDING`, not proof that current `c` has rating B.

Final proof must show that scanner actually executes on the final SHA; a green pre-scan job or skipped scanner is not Sonar evidence.

### `E-CODEQL-001 — CodeQL stale pass and trust-boundary findings`

Issue `#297`, `codeql-full`, candidate `b2077e079922e3491e9dfb128bf123c9be7671a1`, canonical run `32600874220`: direct jobs show successful analysis for:

- GitHub Actions;
- JavaScript/TypeScript;
- Go modules: platform-control, workforce, identity, DSH, WLT and providers;
- aggregate CodeQL result.

Verdict: `STALE_PASS`, never final evidence.

PR `#304` contains two real CodeQL findings against the then-current OpenCodeReview workflow:

1. `Cache Poisoning via execution of untrusted code`;
2. `Checkout of untrusted code in a non-privileged context`.

Later source commit `c1aa06f...` moved locked Node and pinned review-engine installation before candidate checkout, disabled package-manager cache for that bootstrap, limited `copilot-requests: write` at the job level, and treated candidate source as untrusted review data. Verdict: `SOURCE_FIXED_STRUCTURALLY / EXACT_FINAL_CODEQL_REQUIRED`.

### `E-SEMGREP-001 — real parallel-candidate execution`

Parallel run `32605227229` executed the complete Semgrep pipeline successfully:

- exact candidate checkout;
- exact scope resolution;
- pinned Semgrep installation;
- rule execution;
- findings normalization/policy;
- artifact upload;
- aggregate enforcement.

Prior run inspection established Semgrep `1.172.0`, `p/default + p/security-audit`, 243 rules, 14 changed targets, and `0 findings / 0 blocking` for that parallel candidate.

Artifact:

- ID `9483950508`;
- digest `sha256:be8914382e93525f9e4dc9006411e15b8ea19e21544581a0ebc6619e37c422c5`;
- head SHA `ca774bef51b5e092085137bceb22e27d2d12ca44`.

Verdict: `PARALLEL_CANDIDATE_PASS`, not evidence for current/final `c`.

### `E-OCR-001 — old engine failure; zero findings was invalid`

OpenCodeReview run `32602076128` on `87e07df...` installed OCR successfully but GitHub Models returned `410 Gone` during retirement brownout.

The actual result recorded:

- `status=failed`;
- 10 files selected/reviewed attempts;
- all 10 file reviews failed;
- `0` comments;
- `0` input/output/total tokens;
- adjudication failed;
- aggregate gate failed.

Artifact was still retained:

- ID `9483160190`;
- size `3710` bytes;
- digest `sha256:bdf7dfe42094eb156c6a859f8b653708137c3df5cee02ec0f810fc6a1a1f17e7`.

Verdict: `ENGINE_FAILURE_WITH_EVIDENCE`. `0 findings` from an engine/provider failure is explicitly **not** CLEAN.

A later parallel run `32605227245` using Copilot CLI completed all semantic-review steps successfully and retained artifact:

- ID `9483955173`;
- size `43657` bytes;
- digest `sha256:e7ed9feede35f0cf63ed9c2227fae29cbabac7b0ce694da494202d77dd63d3ca`;
- head SHA `ca774bef...`.

Prior inspection established 12/12 reviewable files completed and zero material findings on that candidate. Verdict: `PARALLEL_CANDIDATE_PASS` only.

### `E-SECURITY-001 — Remote Security partial historical failure`

Issue `#302` targeted `6f5c675a3df0761d0fb7c571ceae888f51df1756`, run `32603966329`, aggregate FAIL.

Direct job/log evidence:

- Gitleaks: **11,345 commits**, ~113.31 MB scanned, `no leaks found`;
- OSV Scanner: seven dependency targets scanned; two `image-size` advisories were filtered under the then-documented no-fixed-upstream patch+guard exception; remaining result PASS;
- Trivy: seven dependency targets, `0` vulnerabilities;
- actionlint: FAIL due two ShellCheck `SC2209` findings in the then-current `.github/workflows/semgrep.yml`;
- zizmor, pinact, ShellCheck, Hadolint and yamllint: SKIPPED because the old job was sequential/fail-fast.

Verdict: `PARTIAL_STALE_FAIL`. Three clean analyzers do not make the complete security gate clean, and skipped analyzers are not PASS.

Current source changed Remote Security to an independent analyzer matrix with `fail-fast:false`, per-analyzer log/JSON/artifact retention, and a fail-closed aggregate gate. Verdict for the old collection root: `SOURCE_FIXED / EXACT_FINAL_FULL_MATRIX_REQUIRED`.

Parallel PR `#304` later demonstrated full independent evidence collection. Relevant historical outputs included Gitleaks/OSV/Trivy/zizmor/pinact/ShellCheck/Hadolint passes with actionlint/yamllint failures; Regal/Conftest failures belonged to a parallel-only Rego policy path absent from current `c`. No parallel result is promoted to current truth.

### `E-CI-001 — CI/lockfile historical evidence`

Historical `ci-full` run `32601043818` on `b2077e0...` failed across multiple gates. One proven DSH backend cause was a readiness test that duplicated the latest migration manifest head. Current source replaced that copied-head assertion with schema-invariant readiness and explicitly guards against reintroducing the duplicated migration-head pattern. Verdict: `HISTORICAL_FAIL / PROVEN_SOURCE_FIX_FOR_THAT_ROOT / EXACT_FINAL_CI_REQUIRED`.

Historical lockfile-integrity run `32600810413` passed on the old candidate. Verdict: `STALE_PASS` only.

Current Dependency Review and Lockfile Integrity controls remain applicable as exact-final evidence where their routing conditions trigger.

## 10. Capability/tool coverage ledger

| Capability | Audit use | Result / disposition |
|---|---|---|
| GitHub | primary source/runtime-platform evidence | USED: exact source, commits, source files, PR findings, runs, jobs, logs, artifacts, statuses |
| SonarQube | quality/security/coverage evidence | USED through actual GitHub/Sonar outputs; exact current evidence missing |
| CodeQL | data-flow/workflow SAST | USED through real historical run + PR findings; exact final required |
| Semgrep | fast/custom SAST | USED through real run/artifact; current/final unverified |
| OpenCodeReview | semantic review | USED through failed and successful real runs/artifacts |
| Remote Security analyzers | secrets/dependency/workflow/container hygiene | USED through actual analyzer logs/results; full final matrix required |
| API Response Cleaner | deterministic evidence normalization | USED for branch response normalization; not truth owner |
| Atlassian Rovo | possible Jira/Confluence durable decision evidence | BLOCKED: 403, app not installed; no authority derived |
| Linear | possible product/work decision evidence | USED; no material authorization/reconciliation decision found |
| Figma / design-specific tools | design truth | N/A_PROVEN: no design file/node/reference materially tied to this admin lifecycle was established |
| Sent / messaging tools | messaging operations | N/A_PROVEN: no causal relation to this authorization lifecycle |
| Expo / Android / presentation/data-viz tools | mobile/runtime/presentation-specific | N/A_PROVEN for this root; affected operator surface is Control Panel and no mobile runtime semantic dependency was proven |

Selective non-use of unrelated plugins is intentional. Invoking an unrelated tool cannot convert missing evidence into proof and would violate the smallest-complete-working-cone rule.

## 11. Resolved decisions

### `D-001`
Approval decision and canonical mutation execution are distinct facts. An approved decision is not necessarily an applied RBAC mutation.

### `D-002`
Preserve the existing synchronous review product/API behavior as a synchronous execution **attempt**. Do not redesign to polling-only or asynchronous-only operation as a workaround.

### `D-003`
Structured API `status/code/message/correlationId` plus typed lifecycle result is the consumer contract. UI substring matching or local reinterpretation is forbidden.

### `D-004`
No new DB schema is planned. Existing durable intent state is sufficient unless execution-time evidence disproves that assumption.

### `D-005`
Historical and parallel PASS results never count as final evidence. All closure claims require the exact final source SHA after the last source mutation.

### `D-006`
For every required remote analyzer, `configured`, `started`, `ran`, `covered` and `clean` are different states. A skipped scanner, blocked provider, missing artifact/output, or engine failure is not PASS.

No material `DECISION_REQUIRED` remains.

## 12. Handoff readiness

The Source-of-Defect, Source-of-Fix, canonical lifecycle semantics, writers/readers/consumers, change cone, cleanup obligations, negative space and final verification requirements are sufficiently proven for deterministic execution.

Execution should not rediscover whether the old duplicate executor is still the root. It is not. Execution begins at `RC-AUTH-CONTRACT-001`, preserves the already-unified executor/fencing/readback architecture, and closes Product/API/consumer semantics before exact-final remote verification.

`READY_FOR_EXECUTION`
