# 02 — VERIFICATION / CLOSURE CONTRACT

## 0. Purpose

This file defines the only acceptable path from implementation completion to `CLOSED` for PR `#284` and the canonical Identity/DSH administration authorization cutover.

It does **not** declare the system closed. It defines the evidence that must exist on the **Exact Final Candidate after the final code/config/test/data-migration cleanup write**.

- **Audit source:** `00-AUDIT-TRUTH.md`
- **Execution source:** `01-EXECUTION-CONTRACT.md`
- **Prepared from audit snapshot:** `c@119aa5e9df86c738400e062858f8f631eafbe905`
- **Current handoff state:** `READY_FOR_EXECUTION`
- **Closure default:** `NOT_CLOSED` until every mandatory gate below is proven

---

## 1. Exact Final Candidate definition

The final candidate is not “the commit where tests first became green”. It is the commit after **all** of the following have finished:

1. root-cause treatment;
2. consumer migration;
3. schema/data migration and reconciliation;
4. generated-artifact regeneration;
5. deletion/retirement of superseded writers/readers/storage/routes/contracts/tests/config;
6. dependency/import cleanup;
7. final negative-space cleanup;
8. the last material code/config/test/migration/documentation write required by this scope.

Only then:

- resolve PR `#284` live;
- record `FINAL_HEAD_SHA`;
- record `FINAL_BASE_SHA`;
- record branch/ref names;
- prove the PR head equals `FINAL_HEAD_SHA`;
- freeze evidence collection to that identity.

If any material file changes afterward, **all affected closing evidence is stale** and must be regenerated against the new SHA.

---

## 2. Final identity gate — mandatory before every remote proof

Record and cross-check:

| Field | Required proof |
|---|---|
| Repository | `bthwani2-boop/bthwani-suite-next` |
| PR | `284` |
| Head ref | `c` unless deliberately changed by the human owner and re-audited |
| Head SHA | exact 40-char `FINAL_HEAD_SHA` |
| Base ref | repository default branch / PR base |
| Base SHA | exact 40-char `FINAL_BASE_SHA` |
| PR state | open during evidence collection |
| Head repository | canonical repository, not an untrusted fork for privileged closure |
| Workflow definition | trusted default-branch definition at explicitly correlated SHA |

Any mismatch = `NOT_CLOSED`.

Do not infer candidate identity from display title alone, branch name alone, merge ref or “latest successful run”.

---

## 3. Root closure matrix

### RC-CI-001 — stale PR-closure topology assertion

`CLOSED` only if all are true:

- `tools/scripts/ci-routing.test.mjs` no longer requires superseded `workflow_run` topology as an invariant unless the actual canonical architecture has been intentionally re-decided and re-audited;
- replacement tests assert trusted-definition and immutable-candidate semantics;
- focused router suites pass on `FINAL_HEAD_SHA`;
- canonical scope-resolution job succeeds remotely;
- downstream applicable jobs are no longer skipped due routing-test failure;
- there is no parallel old closure aggregator with independent status-writing authority;
- no privileged closure job checks out/executes untrusted candidate code;
- stale docs/tests/helpers encoding the superseded topology have been removed or corrected.

A green test produced by deleting security/provenance assertions without replacement = `NOT_CLOSED`.

### RC-AUTH-001 — historical Identity/DSH authorization split

`CLOSED` only if all are true on final candidate/runtime state:

- Identity is the sole live role-definition/permission authority;
- DSH does not retain a second live role registry or permission vocabulary writer;
- all DSH administrative authorization checks derive current Identity permission truth;
- Control Panel derives permission vocabulary from the canonical service path;
- owner mutation/readback/fenced finalize sequence is verified;
- terminal-failure recovery has one atomic supersession path and no replay/reset/edit path;
- migration/backfill/readback prove old live permission/projection truth is retired;
- no affected consumer still reads a superseded source.

---

## 4. Focused verification gate

Before full remote closure, run the narrow tests that prove the highest roots at their owners.

### 4.1 CI/control plane

At minimum:

- `node --test tools/scripts/detect-ci-context.test.mjs`
- `node --test tools/scripts/ci-routing.test.mjs`
- `node --test tools/scripts/ci-runtime-bootstrap-policy.test.mjs`

Required result: zero failures.

### 4.2 Identity authorization

Run the canonical Identity unit/integration suites covering:

- role-definition create/update/readback;
- permission vocabulary;
- effective permission resolution;
- employee DSH permission backfill;
- `platform.read` → `platform:read` canonicalization;
- actor projection rebuild/convergence;
- local operator convergence and no migration-era alias authority.

Tests are evidence, not truth. If a test disagrees with canonical product/owner semantics, fix the implementation or stale test at the correct source; do not preserve duplicate truth to satisfy both.

### 4.3 DSH administration

Run suites covering:

- maker/checker separation;
- role request validation against Identity vocabulary;
- canonical mutation intent creation;
- owner mutation/readback;
- fencing/version races;
- retryable vs terminal failure;
- terminal supersession uniqueness/atomicity;
- idempotency/reconciliation;
- exact HTTP permission checks;
- audit immutability.

### 4.4 Control Panel

Run tests/type-checks for administration surfaces covering:

- canonical vocabulary loading;
- role request/review state mapping;
- terminal replacement UX;
- exact permission gating;
- fail-closed behavior when canonical vocabulary/session truth cannot be loaded.

Any skipped materially affected focused suite without explicit non-applicability proof = `NOT_CLOSED`.

---

## 5. Database / migration / backfill gate

### 5.1 Clean database proof

From an empty supported database state:

- apply the full Identity migration chain;
- apply the full DSH migration chain;
- start the relevant services;
- prove schema/readiness without manual repair.

### 5.2 Seeded/pre-cutover proof

Construct or use a representative dataset that contains the states the migrations are designed to transform, including:

- employee/role/direct permission data;
- legacy `platform.read` bindings/grants/projections before canonicalization;
- DSH administration requests/intents/audit rows across meaningful states;
- non-owner Partner/Captain DSH projections before retirement where migration ordering expects them.

Then apply the real migration path.

### 5.3 Required readbacks

After migration:

- canonical `platform:read` exists where required;
- live `platform.read` vocabulary row absent;
- live role bindings using `platform.read` absent;
- live direct grants using `platform.read` absent;
- live actor projections using `platform.read` absent;
- effective permissions resolve correctly from canonical owner data;
- `dsh_admin_partner_activations` absent;
- `dsh_admin_captain_credentials` absent;
- no successor shadow relation re-creates the same non-owner authority under a different name;
- no dependent view/function/trigger/foreign key was silently removed via `CASCADE`;
- application readers use sovereign Partner/Workforce sources.

### 5.4 Idempotency/reconciliation

Where the migration/reconciler is specified as idempotent:

- rerun it or execute its supported reconciliation twice;
- prove no duplicate grants, requests, replacement links, audit rows or owner mutations are created;
- prove drift repair derives from owner truth rather than local ad-hoc values.

### 5.5 Historical migration classification

Occurrences of legacy names inside immutable applied migration history are acceptable **only** when classified as `IMMUTABLE_HISTORY` with a real upgrade/rebuild purpose and no runtime authority.

Deleting or editing applied historical migrations merely to make text search empty is not cleanup; it can break reproducibility and therefore blocks closure unless a deliberate migration-history rewrite strategy is separately proven safe for every installation.

---

## 6. Canonical writer / reader proof

Create a final writer-reader inventory from actual code, not only docs.

### 6.1 For role definitions / permissions

Prove exactly:

- **1 canonical owner:** Identity;
- **1 canonical mutation authority:** Identity owner path;
- DSH request/intent code invokes that owner path but cannot persist an alternate role truth;
- all DSH/UI readers derive from owner truth or read-only governed request/audit state;
- no DB trigger, script, bootstrap or migration-era runtime writer can mutate an alternate live source.

### 6.2 For DSH governance requests

Prove exactly:

- one request writer per material request type;
- one checker review path;
- one canonical intent executor/reconciler;
- one fenced finalization path;
- one terminal supersession path;
- immutable audit append path;
- no direct route bypasses request → review → owner mutation → readback → finalize.

### 6.3 For Partner/Captain truth

Prove DSH is read-derived only after projection retirement and that no hidden writer exists in:

- migrations;
- seed/bootstrap scripts;
- test fixtures executed in runtime;
- admin routes;
- background jobs;
- data-repair scripts.

Any second reachable writer/authority = `NOT_CLOSED` regardless of test results.

---

## 7. State-machine adversarial gate

Positive happy-path tests are insufficient. Execute adversarial/race cases.

### Required cases

1. maker attempts to approve own request → rejected.
2. checker acts with stale expected version → fenced/rejected.
3. two workers attempt finalization → exactly one effective finalization.
4. owner mutation succeeds but DSH finalize is interrupted → reconciliation/readback converges without duplicate owner mutation.
5. owner mutation returns retryable failure → bounded retry semantics hold.
6. request reaches `failed_terminal` → old intent cannot be replayed/reset/edited.
7. two actors concurrently supersede same terminal request → exactly one replacement survives/commits.
8. replacement is based on latest canonical owner role/version/vocabulary.
9. old request becomes `superseded`; old intent remains immutable terminal evidence.
10. repeated read/reconcile does not create new requests/audit facts.
11. service restart between owner mutation and local finalization converges from owner truth.
12. Identity unavailable during authorization/readback → operation fails closed; no local fallback authority activates.

Any nondeterministic duplicate or silent fallback = `NOT_CLOSED`.

---

## 8. Frontend / UX truth gate

For each affected Control Panel administration surface, verify against real backend semantics:

- displayed role permissions are derived from canonical vocabulary;
- no stale local list appears during loading/offline/error state;
- buttons/actions are gated consistently with exact backend permissions;
- maker cannot see/use checker-only action as an authority bypass;
- review status reflects backend state, not optimistic UI truth;
- `approved` is displayed only after backend canonical finalization semantics;
- terminal failure clearly requires a replacement request, not retry of the old request;
- replacement reason/reason-code path is preserved;
- superseded requests are not presented as active pending requests;
- errors do not silently coerce terminal/rejected states into success.

UI passing screenshots while backend/data truth is wrong is non-closing.

---

## 9. Contract / generated-artifact gate

For every changed administration API/schema/binding:

1. identify one schema/contract source;
2. regenerate using canonical generator;
3. verify generated diff is deterministic;
4. prove state enums/permission identifiers match backend;
5. remove superseded generated/manual duplicates;
6. prove frontend/backend compile against the same contract;
7. search for old enum/action names in active consumers.

Any hand-edited generated artifact that disagrees with source schema = `NOT_CLOSED`.

---

## 10. Exact remote CI gate

A successful local run is insufficient where the repository governs remote evidence.

On `FINAL_HEAD_SHA`, require the canonical remote CI to execute all applicable lanes selected from the affected cone, including as applicable:

- canonical target/scope resolution;
- contract diagnostics;
- Node verification;
- backend verification;
- runtime proof;
- any migration/database provisioning lane required by the router.

### Remote evidence requirements

For every closing run record:

- workflow name;
- run ID;
- event;
- trusted definition ref/SHA where available;
- PR number;
- target head SHA;
- base SHA;
- conclusion;
- list of jobs and conclusions.

A run on an earlier implementation SHA is reference evidence only.

Skipped job classification must be explicit. A materially affected job skipped because routing misclassified scope = `NOT_CLOSED`.

---

## 11. Exact security / quality analyzer gate

The closure workflow observed in the audited candidate dispatches a set of exact analyzers. The final candidate must obtain required evidence from the canonical current set, not a hard-coded stale list if the trusted workflow legitimately evolves.

At minimum, verify applicability/results for:

- CodeQL;
- SonarQube Cloud;
- remote security workflow;
- Semgrep;
- OpenCodeReview;
- Dependency Review;
- Docker Runtime Hardening;
- Lockfile Integrity.

### 11.1 SonarQube

Historical finding to revalidate:

- New Code Coverage: `7.4%` against threshold `>=80%`;
- New Code Security Rating: `B` against required `A`.

Closure requires the exact final candidate’s quality gate to pass. If the metric/finding changes, use the final exact result as authority; retain historical result only as provenance.

Forbidden closure tactics:

- lower thresholds;
- blanket exclusions;
- move production files into excluded/generated categories without truth;
- add meaningless tests only for coverage count;
- `NOSONAR`/suppression without validated false-positive rationale.

### 11.2 CodeQL/security

All previous checkout findings may be historical/resolved, but final exact candidate must have zero active material equivalent finding. Verify privileged workflows do not execute candidate-owned code with secrets/write permissions.

### 11.3 Other analyzers

Every material exact finding must have:

- finding identity;
- validity classification;
- root cause;
- owner/source-of-fix;
- implementation SHA that fixes it;
- rerun evidence proving closure.

“Tool passed after ignore rule” is not enough unless the ignore is itself the proven correct source-of-truth configuration.

---

## 12. Review-thread / human-review gate

Before `CLOSED`:

- enumerate current PR review threads;
- zero unresolved material thread may remain;
- outdated/resolved historical threads are recorded but not treated as active failures;
- if a thread was resolved by code deletion/refactor, verify the risky path truly disappeared rather than moved;
- review comments from bots are evidence, not automatic truth; validate against current code;
- any human `REQUEST_CHANGES` or equivalent material blocker must be closed by code/evidence or explicitly re-reviewed.

At the audit snapshot, four CodeQL threads were `resolved=true` and `outdated=true`; that fact is historical only and must be refreshed on final candidate.

---

## 13. Mandatory cleanup / zero-residue gate

After all functional fixes and before final SHA is frozen, run a cleanup pass that explicitly answers for every suspicious artifact:

`Does this still have Necessary Purpose + Correct Owner + Real Consumer + Proven Value?`

If no → delete.

### Required cleanup classes

- dead/stale functions;
- duplicate role/permission logic;
- obsolete request/reconcile branches;
- unreachable routes;
- superseded API contracts;
- stale generated artifacts;
- retired DB projections;
- orphan migrations/scripts only if truly unnecessary and safe to remove — do not confuse immutable migration history with dead runtime code;
- unused dependencies/imports;
- duplicate caches/projections;
- hard-coded permission vocabulary;
- migration-era aliases/fallbacks;
- obsolete CI topology assertions;
- duplicate workflows/scanners/status writers;
- stale TODO/FIXME/HACK related to completed cutover;
- test helpers/mocks that encode a second authority.

### Required deletion proof

For each material deletion/retirement, record:

- old artifact;
- old owner/consumer;
- canonical replacement;
- consumer migration proof;
- deletion commit;
- negative-space proof that no reachable reference remains.

If an old path is still reachable and lacks a justified owner/exit condition → `NOT_CLOSED`.

---

## 14. Negative-space recheck — after the last cleanup write

Run repository-wide exact-candidate searches and inspect every result.

### Search classes

- `platform.read`;
- `dsh_admin_partner_activations`;
- `dsh_admin_captain_credentials`;
- role-name admin bypass patterns;
- local administration permission arrays/maps;
- DSH role-definition DB writers;
- terminal intent `reset`, `replay`, `retry` paths that can affect `failed_terminal` contrary to product truth;
- replacement/supersession insert paths;
- direct Identity role mutation from UI/non-governed route;
- obsolete `workflow_run` PR-closure normative assertions;
- `pull_request_target` + checkout/execute combinations;
- duplicate `statuses: write` closure authorities;
- deprecated route/contract names discovered during migration;
- unused imports/dependencies after deletion.

### Classification rules

Every search hit must be classified:

- `CANONICAL_LIVE`
- `DERIVED_READ_ONLY`
- `IMMUTABLE_HISTORY`
- `TEST_OF_RETIREMENT`
- `DELETE_REQUIRED`
- `FALSE_MATCH`

No unclassified material hit is allowed.

Perform this recheck **after** the final deletion/refactor; an earlier negative-space scan is not closing evidence.

---

## 15. Final runtime proof

Where the affected cone includes runtime behavior, prove with the real service stack rather than only mocks:

1. start required Identity + DSH + database dependencies through canonical runtime tooling;
2. readiness/health succeeds;
3. authenticate a control-panel actor through Identity;
4. execute representative administration flows:
   - list canonical roles;
   - load canonical permission vocabulary;
   - create maker request;
   - review through a distinct checker;
   - observe owner mutation/readback/finalized result;
   - exercise a safe fault-injection/integration case for reconciliation/terminal semantics if canonical test tooling supports it;
5. restart relevant service and prove persisted state remains canonical;
6. verify no retired DSH projection is queried at runtime;
7. inspect logs for fallback/compatibility warnings that indicate hidden alternate paths.

If runtime proof is required by CI/router and cannot execute, classify the exact blocker; do not declare closure.

---

## 16. Closure evidence table

The final execution must populate an evidence table equivalent to:

| Gate | Exact SHA | Evidence ID/run/command | Result | Residue/follow-up |
|---|---|---|---|---|
| Branch/PR identity | `FINAL_HEAD_SHA` | GitHub PR/ref readback | PASS/FAIL | none or blocker |
| Focused CI routing | `FINAL_HEAD_SHA` | local/remote test evidence | PASS/FAIL | ... |
| Identity authorization | `FINAL_HEAD_SHA` | tests/runtime | PASS/FAIL | ... |
| DSH state machine | `FINAL_HEAD_SHA` | tests/runtime | PASS/FAIL | ... |
| clean migrations | `FINAL_HEAD_SHA` | DB run | PASS/FAIL | ... |
| seeded/backfill migrations | `FINAL_HEAD_SHA` | DB run/readback | PASS/FAIL | ... |
| frontend/contracts | `FINAL_HEAD_SHA` | type/tests/runtime | PASS/FAIL | ... |
| full remote CI | `FINAL_HEAD_SHA` | run ID | PASS/FAIL | ... |
| SonarQube | `FINAL_HEAD_SHA` | run/analysis ID | PASS/FAIL | ... |
| CodeQL | `FINAL_HEAD_SHA` | run/analysis ID | PASS/FAIL | ... |
| Semgrep | `FINAL_HEAD_SHA` | run ID | PASS/FAIL | ... |
| OpenCodeReview | `FINAL_HEAD_SHA` | run ID | PASS/FAIL | ... |
| dependency/runtime/lockfile security | `FINAL_HEAD_SHA` | run IDs | PASS/FAIL | ... |
| review threads | `FINAL_HEAD_SHA` | thread inventory | PASS/FAIL | ... |
| cleanup inventory | `FINAL_HEAD_SHA` | deletion ledger | PASS/FAIL | ... |
| negative-space recheck | `FINAL_HEAD_SHA` | search evidence | PASS/FAIL | ... |

Every `FAIL`, unknown material state or unexecuted required gate keeps status `NOT_CLOSED`.

---

## 17. Final closure assertions

The final reviewer must be able to assert **all** of the following without qualification:

- one material authorization truth;
- one Identity canonical source/authority for role and permission truth;
- one canonical owner per domain truth;
- one canonical write path per material truth;
- DSH administration is governance/intent/audit, not parallel authorization authority;
- all writers/readers/consumers migrated;
- complete canonical cutover;
- terminal failure semantics are deterministic and fenced;
- no missing consumer;
- no partial migration/backfill;
- no contract/data drift;
- no hidden compatibility fallback;
- no old reachable projection/storage authority;
- no stale/duplicate/dead material artifact in effective scope;
- no obsolete CI topology assertion blocks or distorts canonical evidence;
- exact remote CI/analyzers pass on final candidate;
- no known material finding remains open;
- cleanup and negative-space audit were rerun after the last write/delete.

If any assertion cannot be proven, status is `NOT_CLOSED`.

---

## 18. Final status vocabulary

Use only these states for this package:

- `READY_FOR_EXECUTION` — audit/handoff is deterministic enough to begin treatment.
- `EXECUTING` — implementation/cleanup underway.
- `VERIFYING` — final candidate frozen and closure gates running.
- `NOT_CLOSED` — one or more material gates/findings/residue remain.
- `CLOSED` — every mandatory gate is proven on exact final candidate after final cleanup.

Do not use `WORKING`, `TESTS_PASS`, `CI_GREEN` or `READY_TO_MERGE` as synonyms for `CLOSED`.

---

## 19. Current package conclusion

At package-preparation time:

- target architecture/root ownership is sufficiently established;
- RC-CI-001 has a proven Source of Fix;
- data/backfill and cleanup obligations are enumerated;
- no material Product/System decision remains unresolved;
- current exact audit SHA is **not closed** because the CI routing contract fails and downstream exact verification has not executed;
- historical Sonar evidence must be revalidated on the final candidate.

**PACKAGE HANDOFF: `READY_FOR_EXECUTION`**

**SYSTEM CLOSURE: `NOT_CLOSED`**