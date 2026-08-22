# Canonical Identity / DSH Authorization — Verification & Closure Contract

PLAN_ID: `canonical-identity-dsh-authorization-final-closure`  
REPOSITORY: `bthwani2-boop/bthwani-suite-next`  
TARGET_REF: `c`  
AUDITED_SOURCE_HEAD: `262a80ad889963e8d950178c075b3272176e2b5c`  
GOVERNING_PHASE: `EXECUTE_CLOSE`  
CLOSURE_POLICY: `FAIL_CLOSED / EXACT_FINAL_CANDIDATE_ONLY`

## 1. Closure rule

`GREEN != CLOSED`.

A build, typecheck, unit test, CI workflow, CodeQL scan, Semgrep scan, Sonar Quality Gate, OpenCodeReview result, or successful screen is only one piece of evidence. Final closure is legal only when the exact candidate after the last source change satisfies every applicable verification and closure criterion below, and a fresh affected-cone/negative-space re-audit finds no known material remainder.

Any source mutation after a verification run invalidates that run as final-candidate evidence unless the tool is provably unaffected and the governing orchestrator explicitly permits reuse. Default behavior is rerun.

## 2. Evidence record required for every remote tool

For every required remote workflow/scanner record:

- `tool_name`
- `workflow_name`
- `run_id`
- `run_url_or_canonical_identity`
- `requested_ref`
- `resolved_sha`
- `baseline/base_sha` where relevant
- `mode/effective_scope`
- `started_at/completed_at`
- `conclusion`
- `artifact/provenance identity`
- `finding counts and material findings`
- `suppressions/waivers with reason`, if any
- `exact_candidate_match = true`

Missing or stale evidence is `NOT_PROVEN`, never PASS.

## 3. Verification matrix

### V-AUTH-01 — Assignment SoD matrix

Prove at the DSH administration domain/use-case boundary:

- maker == beneficiary -> rejected before intent/remote mutation;
- checker == maker -> rejected;
- checker == beneficiary -> rejected;
- maker/checker/beneficiary all distinct -> allowed subject to all other permissions/state/version rules.

Evidence must include focused unit/integration tests and one runtime/API journey where material.

### V-AUTH-02 — Rollback SoD matrix

Prove:

- rollback maker == beneficiary -> rejected;
- rollback checker == rollback maker -> rejected;
- rollback checker == beneficiary -> rejected;
- rollback checker == original source checker -> rejected;
- all required actors independent -> allowed subject to other rules.

### V-AUTH-03 — Authorization owner and deny-by-default

Prove that:

- Identity is queried/consumed as the effective authorization authority;
- DSH does not authorize from local approval status alone;
- missing/unavailable Identity authorization fails closed;
- operator context is trusted from authenticated Identity and client mismatch is rejected;
- no role-name bypass or wildcard fallback was added during treatment.

### V-AUTH-04 — Permission vocabulary canonicalization

For `platform:read` cutover prove:

- live Platform Control read routes require `platform:read`;
- Control Panel navigation/affected platform readers use `platform:read`;
- Identity vocabulary/bootstrap and role bindings contain the canonical capability;
- zero `platform.read` live-code, fixture, seed, migration-residue, binding, actor/session projection, or generated-contract consumer remains except historical migrations that are intentionally immutable and cannot execute as live authority;
- any historical migration text retained is classified as historical and cannot recreate the alias on a fresh current schema.

### V-AUTH-05 — Legacy grant/revoke helper removal

Prove zero live caller of synthesized `legacy-grant:` / `legacy-revoke:` idempotency wrappers remains, all callers supply stable operation/request-derived idempotency, and the wrappers are deleted.

## 4. Canonical mutation lifecycle verification

### V-LIFE-01 — State-machine legality

Prove every state transition is explicit and legal. Tests must reject impossible transitions and prove that no path reaches complete/applied before canonical Identity truth is known.

### V-LIFE-02 — Atomic local transition

Where request/audit/intent updates share PostgreSQL, prove the local finalization transaction cannot persist a partial combination that falsely reports success.

### V-LIFE-03 — Durable claim / lease

Run concurrent-worker tests proving:

- one due intent is claimed once;
- another worker skips a live claim;
- lease expiry permits safe recovery;
- stale owner cannot finalize after ownership loss;
- process restart preserves recoverability.

### V-LIFE-04 — Retry/backoff

Prove transient Identity failures produce increasing bounded delay with jitter/equivalent governed policy, do not spin every worker interval, and preserve a next eligible time across restart.

### V-LIFE-05 — Crash window: remote applied before local finalization

Inject a failure after Identity mutation but before local finalization. On retry/restart, canonical Identity readback must detect the remote result and converge local request + intent without duplicating or reversing the mutation.

### V-LIFE-06 — Crash window: request finalized but intent completion fails

Inject failure in/around the current problematic completion edge. Prove the operation remains discoverable and reconciles to complete rather than becoming `approved + non-applied` orphan residue.

### V-LIFE-07 — Timeout ambiguity

Simulate remote timeout where the mutation may have applied. Prove readback resolves ambiguity before reissuing an effect and stable idempotency prevents duplicate remote mutation.

### V-LIFE-08 — Version/conflict semantics

Prove stale request/role version conflicts are classified correctly and do not become infinite retries or silent success.

### V-LIFE-09 — Existing data migration/backfill

On representative pre-change data prove:

- pending intents migrate correctly;
- failed intents receive valid retry metadata;
- ambiguous approved/non-applied combinations become reconciliation-required until Identity readback;
- no row is declared successful by migration without canonical evidence;
- constraints and indexes support due-work/claim queries;
- forward migration is repeatably valid under the repository migration discipline.

## 5. UX / journey verification

### V-UX-01 — Assignment journey

From Control Panel entry through maker request, checker review, application, canonical readback, refresh/relogin, prove UI state matches backend/Identity truth at every step.

### V-UX-02 — Rollback journey

Prove independent checker eligibility, rollback application, canonical readback, and later readback. No stale action remains enabled for an actor that domain SoD will reject.

### V-UX-03 — Failure/recovery states

Exercise at minimum:

- Identity unavailable;
- retryable application failure;
- reconciliation in progress;
- terminal conflict where applicable;
- network/API failure;
- empty/no-request state.

Each state must provide accurate feedback and a valid recovery path or explicit terminal explanation. No false success and no indefinite ambiguous loading.

### V-UX-04 — Accessibility and action semantics

Where affected controls are changed, prove disabled/hidden/action feedback remains keyboard/screen-reader understandable and that authorization is not communicated solely by visual styling.

## 6. API / contract / generated binding verification

### V-CONTRACT-01

If operation/reconciliation state or error codes change, update the canonical API contract first and prove generated bindings match it exactly.

### V-CONTRACT-02

Search all writers/readers/consumers for old enum/error/action names. Zero mixed-version consumer remains before deleting old definitions.

### V-CONTRACT-03

Compatibility layers are temporary only during the same controlled migration and must be deleted before closure. No permanent dual contract is accepted.

## 7. Database verification

### V-DATA-01 — fresh database

Create a fresh database using canonical migrations and prove Identity/DSH schemas, constraints, seeds/bootstrap, and authorization vocabulary converge without `platform.read` residue.

### V-DATA-02 — upgrade path

Upgrade from a representative previous schema/data state and prove backfill/cutover without lost requests, duplicate bindings, orphaned intents, or invented success.

### V-DATA-03 — constraints

Prove database constraints/indexes materially enforce uniqueness/state validity and support claim/due-work performance where appropriate; business SoD still remains in the domain owner when it depends on cross-record actor semantics not safely expressible as a simple constraint.

### V-DATA-04 — transaction and idempotency

Prove repeated identical operation IDs are safe and conflicting payload reuse fails explicitly rather than silently mutating a different request.

## 8. Sonar repair and Quality Gate verification

### V-SONAR-01 — coverage generator validity

Before Sonar scanner:

- Go coverage report exists;
- is non-empty;
- uses one valid representation;
- parses successfully with Go tooling;
- contains deterministic, collision-free source/package data;
- workflow fails hard if generation/validation fails.

### V-SONAR-02 — exact candidate scan

Run SonarQube Cloud on `FINAL_CANDIDATE_SHA`. Record project key, analysis identity, imported JS/Go/Flutter coverage where configured, Quality Gate status, each condition, issues, hotspots, duplications and coverage metrics relevant to the affected scope.

### V-SONAR-03 — no waiver-by-tooling

A Quality Gate failure must be diagnosed and fixed from source/tool config as appropriate. Do not lower thresholds, ignore the failed language, or skip coverage solely to get green.

## 9. Remote security / quality tool matrix

### V-TOOL-01 — Canonical CI

Relevant Node/Go/contracts/database/runtime checks pass on exact final candidate.

### V-TOOL-02 — CodeQL

Exact final candidate CodeQL completes successfully for all configured languages/effective scope with no unresolved material security finding.

### V-TOOL-03 — Semgrep

Exact final candidate Semgrep completes in governed mode; scan/policy/artifact steps succeed; no unresolved material finding remains.

### V-TOOL-04 — Remote Security

Run applicable governed Remote Security subtools and preserve their individual conclusions, including Gitleaks, OSV, Trivy, actionlint, zizmor, pinact, ShellCheck, Hadolint, yamllint and any current governed policy evaluation. Every failure is investigated; aggregate green cannot hide a red subtool.

### V-TOOL-05 — Dependency Review / lockfile integrity

Where activated by the final diff/governance, prove exact candidate dependency review and lockfile integrity.

### V-TOOL-06 — OpenCodeReview

Run semantic review against exact head/base. Host execution, evidence adjudication, policy evaluation and artifact publication must succeed. Material architecture/semantic findings route back into source treatment.

### V-TOOL-07 — PR review / CodeRabbit where active

Inspect reviews and unresolved threads on the active PR. Any material unresolved comment blocks closure even when automated scanners are green.

### V-TOOL-08 — provenance

Every accepted artifact must identify the exact SHA it analyzed. Artifact name alone is insufficient.

## 10. Negative-space re-audit

After all candidate tests are green, perform fresh search/inspection rather than trusting the implementation diff.

### V-NEG-01

Search for every forbidden actor equality path and verify no alternate assignment/rollback endpoint/use-case bypasses SoD.

### V-NEG-02

Search for all writers of approval/rollback/intent statuses and prove one canonical transition model.

### V-NEG-03

Search for every reader of `pending`, `failed`, `applied`, old/new lifecycle states and migrate all consumers.

### V-NEG-04

Search for `platform.read`, `legacy-grant:`, `legacy-revoke:` and removed helper names. Classify all hits; zero reachable superseded path remains.

### V-NEG-05

Search for catch-and-ignore patterns around mutation completion/readback, especially `_ =` or ignored update errors in the affected cone. No material completion error may be discarded.

### V-NEG-06

Inspect worker scheduling/query paths for unbounded immediate retry, missing lease predicates, stale claim handling, and no-index due-work scans.

### V-NEG-07

Inspect UI for local-only optimistic success, stale cached permissions, and actions visible/enabled for forbidden reviewer relationships.

### V-NEG-08

Inspect scanner workflows for `continue-on-error`, silent fallbacks, empty-artifact acceptance, stale SHA checkout, or different-ref analysis in the required gates.

## 11. Acceptance criteria

### AC-01 — canonical authority

Identity is the only authorization truth; DSH is the only governed authorization workflow/orchestration owner; no parallel authority exists.

### AC-02 — SoD

Pairwise maker/beneficiary/checker separation and independent rollback checker are enforced centrally and proven through negative tests/runtime evidence.

### AC-03 — lifecycle

Every governed mutation is durable, exclusive, idempotent, retry-bounded, crash-recoverable, and canonically reconciled.

### AC-04 — data

Fresh and upgrade migrations succeed; no ambiguous row is silently marked successful; all relevant constraints/indexes exist.

### AC-05 — vocabulary

`platform:read` is the only live Platform Control read capability and `platform.read` is removed from all reachable truth/consumer paths.

### AC-06 — legacy cleanup

No legacy grant/revoke wrapper or synthetic legacy idempotency path remains reachable.

### AC-07 — UX

Affected journeys reflect canonical state including progress, failure, retry, recovery and later readback without false success.

### AC-08 — toolchain

All materially required remote tools pass on the same `FINAL_CANDIDATE_SHA` with inspectable provenance and no unresolved material finding.

### AC-09 — repository integration

PR head/base/reviews/mergeability and required checks are reconciled; post-merge/default-branch evidence required by governance is proven.

### AC-10 — simplicity

No compatibility layer, shadow lifecycle, duplicate vocabulary, fallback authority, orphan state, unused helper, or unjustified abstraction remains in the Effective Scope.

## 12. Closure evidence IDs

### CE-01 — Exact candidate identity

One `FINAL_CANDIDATE_SHA` is recorded and every final pre-merge tool result maps to it.

### CE-02 — Writer/reader/consumer migration complete

Inventory proves every affected writer, reader, consumer, contract, generated binding, data row class, job, runtime path and surface has moved to canonical truth.

### CE-03 — Root closure

RC-0 through RC-3 are proven impossible/repaired at source; RC-4 is satisfied by fresh exact-candidate evidence.

### CE-04 — Negative space clear

Fresh re-audit finds no known material bypass, drift, parallel truth, orphan/retry loop, stale alias, legacy wrapper, false-success UX or verification workaround.

### CE-05 — Tool evidence complete

CodeQL, Sonar, Semgrep, Remote Security, OpenCodeReview and all other activated verification boundaries have exact-candidate PASS/proven-N/A evidence. Historical or different-SHA results do not satisfy this criterion.

### CE-06 — PR/integration complete

The intended PR is non-draft when ready, mergeable, has no unresolved material review item, and all required checks/evidence correspond to its exact head. Merge result/default-branch follow-up is verified where required.

### CE-07 — Cleanup complete

All proven legacy/dead/stale/duplicate/superseded reachable paths inside the Effective Scope are deleted after cutover.

### CE-08 — Final post-change re-audit

After the last source mutation and evidence run, perform one final `AUDIT + INSPECT + DIAGNOSE + ANALYZE` over the affected cone and negative space. It produces no new material finding.

## 13. State transitions for this plan

- Current legal state after this document refresh: `READY_FOR_EXECUTION`.
- During source treatment: `EXECUTING` / root-specific verification states as governed by the orchestrator.
- A failed/missing exact-candidate tool keeps the task open and routes to diagnosis.
- `CLOSED` is legal only when every applicable `AC-*` and `CE-*` is proven on the exact final candidate/integration state.

Until then: **DO NOT MARK CLOSED.**
