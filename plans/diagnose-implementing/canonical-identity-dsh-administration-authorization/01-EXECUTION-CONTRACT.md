# 01 — EXECUTION CONTRACT

## 0. Contract status

- **Input audit:** `00-AUDIT-TRUTH.md`
- **Phase authorized by this file:** execution after explicit transition out of `AUDIT_PREPARE`
- **Prepared from audit snapshot:** `c@119aa5e9df86c738400e062858f8f631eafbe905`
- **PR:** `#284`
- **Execution status:** `READY_FOR_EXECUTION`
- **Target System treatment during AUDIT_PREPARE:** none performed

This contract is intentionally **root-cause-first and destructive toward superseded reality**. It is not a list of patches. Every write must move the system toward one canonical authority/writer and must include the cleanup required by that move.

---

## 1. Non-negotiable execution rules

1. Re-resolve the **live** branch `c`, PR `#284`, PR base and exact head SHA before the first Target System write.
2. Do not create, switch or substitute branches automatically.
3. Treat any branch movement since this package was prepared as a gate:
   - fetch new head;
   - classify delta as `DISJOINT / RELATED / OVERLAP / CONFLICT / AUTHORITY_CHANGE`;
   - reconcile before writing;
   - if authority/source-of-fix changed, stop and re-audit the affected root rather than applying this contract blindly.
4. `tools/prompting/bthwani-orchestrator/**` remains read-only.
5. Do not use `git add .` or equivalent uncontrolled staging. Stage only inventoried files required by the active root and cleanup cone.
6. No test/CI edit may weaken a canonical security/product invariant solely to produce green status.
7. No production edit may add a shim, fallback, alias, duplicate route, temporary second writer or compatibility layer unless it has explicit owner, reason, expiry and removal trigger in the same execution record.
8. Every material cleanup/delete discovered inside the effective cone is part of the same execution; it may not be deferred merely because tests are already passing.
9. After the last write/delete, re-pin the exact final candidate and rerun verification from zero. Evidence from an earlier SHA is non-closing evidence.
10. If a new material finding appears, fix its highest proven owner/source-of-fix before continuing downstream.

---

## 2. Canonical target that execution must preserve

### 2.1 Product/system chain

`Identity authorization truth → DSH maker/checker governance → Identity owner mutation → independent Identity readback → fenced DSH finalization → derived Control Panel/audit consumers`

### 2.2 Failure/recovery chain

`canonical mutation intent → retryable failure only when explicitly safe → failed_terminal freezes intent → atomic supersede old request + create one fresh pending request against latest owner truth → normal maker/checker review again`

### 2.3 Engineering evidence chain

`GitHub PR/ref identity → human closure request/approval → trusted default workflow definition → immutable candidate inputs → exact full CI/analyzers → evidence correlated to PR_NUMBER + HEAD_SHA + BASE_SHA → closure only on exact final candidate`

No other chain may become an independent source of truth.

---

## 3. Source-of-fix table

| Root / obligation | Owner | Source of fix | Must not be fixed in |
|---|---|---|---|
| RC-CI-001 stale closure topology assertion | CI routing verification contract | `tools/scripts/ci-routing.test.mjs` plus directly stale control-plane docs/tests if found | production Identity/DSH code; by restoring obsolete `workflow_run` merely for green CI |
| Identity role/permission semantics | Identity | `core/identity/**` owner APIs/migrations | DSH local registry, frontend constants |
| DSH maker/checker/intent/fencing semantics | DSH Administration | `services/dsh/backend/internal/administration/**` | UI-only validation or DB-only bypass |
| DSH request authorization | Identity-backed DSH HTTP guard | `services/dsh/backend/internal/http/administration_permission.go` and owner contracts | role-name fallback or local permission list |
| Control Panel permission choices | derived consumer | canonical vocabulary controller/API | hard-coded permission vocabulary |
| Partner lifecycle | Partner domain | Partner owner path | DSH projection writer |
| Captain credentials | Workforce | Workforce owner path | DSH projection writer |
| legacy permission data | Identity migrations | forward corrective migration/rebuild/readback | ad-hoc SQL row edits or history rewriting |
| Sonar/CodeQL/Semgrep finding | code/config owner named by exact finding | highest source-of-fix identified by analyzer + code inspection | exclusion/ignore/suppression without proven false-positive basis |

---

## 4. Execution wave A — repair the engineering control-plane root first

### Objective

Restore the verification contract so it validates the **current canonical trusted closure architecture**, thereby unblocking all downstream evidence. This wave is not allowed to change product behavior.

### A1. Re-read live authority before edit

On the re-resolved execution head, inspect together:

- `.github/workflows/pr-closure-request.yml`
- `.github/workflows/pr-closure-dispatch.yml`
- `.github/workflows/pr-closure-evidence.yml`
- `.github/workflows/ci.yml`
- `tools/scripts/ci-routing.test.mjs`
- any helper used by those tests to classify events/scopes

Confirm that the live control plane still uses trusted/default definitions and exact immutable candidate identity. If it no longer does, classify as `AUTHORITY_CHANGE` and re-audit this root before editing.

### A2. Replace obsolete topology assertions with semantic/provenance assertions

The failing test currently requires:

- `workflow_run:`
- a fixed `workflows: ["BThwani Contextual CI"]` relationship
- `github.event.workflow_run.*` conditions

Those assertions encode the superseded implementation topology and must not remain if `workflow_call` is the canonical design.

The replacement test contract must prove at least:

1. `pr-closure-evidence.yml` is invoked through a trusted reusable path (`workflow_call`) rather than directly by untrusted PR code.
2. required immutable inputs exist: PR number, head ref/SHA, base ref/SHA, closure approver and trusted default SHA.
3. top-level/default permissions remain fail-closed and privileged permissions are limited to the evidence job that needs them.
4. the workflow revalidates:
   - PR is open;
   - head repo is canonical;
   - exact PR head/base refs and SHAs match supplied values;
   - base is current default branch;
   - closure request marker/label exists;
   - caller/approver identity is the approved independent actor;
   - running workflow definition SHA equals the approved default SHA;
   - default branch did not move between approval and analyzer dispatch.
5. privileged closure execution does not checkout or execute candidate-owned scripts.
6. full CI is dispatched through the trusted default `ci.yml` definition with immutable target inputs.
7. analyzers are dispatched through trusted default definitions and correlated by exact expected titles/SHAs.
8. correlation fails closed if workflow definition, title, head SHA, base SHA or default SHA drifts.
9. the closure workflow cannot silently treat an absent/failed analyzer as success.
10. no second reachable privileged PR closure path uses `pull_request_target`, candidate checkout or obsolete `workflow_run` aggregation as parallel authority.

### A3. Mandatory cleanup in the same wave

- remove the obsolete test name if it claims `workflow_run` is semantically required;
- remove obsolete regex assertions tied only to the old event topology;
- search for and update/delete directly stale tests/comments/docs that claim PR closure **must** be `workflow_run` when they are normative rather than historical;
- do not delete legitimate historical incident/evidence text solely because it contains the string `workflow_run`;
- do not keep both old and new closure assertions “for compatibility”.

### A4. Focused verification before continuing

Run the canonical focused routing suites that failed in remote CI, including at minimum:

- `node --test tools/scripts/detect-ci-context.test.mjs`
- `node --test tools/scripts/ci-routing.test.mjs`
- `node --test tools/scripts/ci-runtime-bootstrap-policy.test.mjs`

If a focused test fails because it asserts another stale topology, inspect whether it protects a real invariant. Update/delete only after proving the canonical invariant and owner.

**Wave A exit:** routing tests green without weakening trusted-definition, immutable-identity or no-untrusted-privileged-execution guarantees.

---

## 5. Execution wave B — exact remote pipeline unblocking and scope materialization

After Wave A code and cleanup are committed/pushed:

1. re-resolve PR `#284` and exact head SHA;
2. ensure the PR head equals the implementation candidate being tested;
3. trigger/allow the canonical PR CI path;
4. require `Resolve canonical target and affected scope` to succeed;
5. require the resulting route/scope summary to select all affected authorization, migration, contract and runtime domains rather than narrowing because governance files are not executable;
6. do not manually mark skipped downstream jobs as passed;
7. if routing omits a materially affected code/data domain, fix the router’s scope ownership logic at its source before continuing.

**Wave B exit:** canonical target/scope resolves on the exact implementation candidate and downstream verification jobs execute rather than skip because of RC-CI-001.

---

## 6. Execution wave C — prove or repair Identity authorization ownership

### C1. Permission vocabulary

Prove live canonical vocabulary uses `platform:read` and no live source uses `platform.read` as a current action.

Allowed historical occurrence:

- immutable migration/history/test text whose purpose is specifically to migrate/assert retirement of `platform.read`.

Forbidden occurrence:

- active seed/bootstrap writer;
- runtime authorization check;
- role definition;
- UI vocabulary;
- API contract/default;
- direct actor grant;
- current fixture that creates live state using the legacy action after canonicalization.

### C2. Role definitions

Prove all role definition creation/update paths terminate in Identity canonical writer. Search for any DSH DB insert/update that can independently define role permissions or bindings. Delete such path/table/contract if still reachable and non-canonical.

### C3. Effective permission resolution

Prove DSH control-panel authorization uses current Identity session/effective permission data and exact service/surface/action/scope. Any role-name fallback, wildcard bypass or broad `admin` special-case that bypasses canonical permission truth must be deleted unless explicitly part of Identity canonical permission semantics.

### C4. Local operator bootstrap

Retain local-development bootstrap only if it is demonstrably:

- environment-bounded;
- convergent/idempotent;
- expressed through Identity owner APIs/projection rebuilds;
- not a second role-definition vocabulary writer;
- incapable of widening production/runtime authority.

Delete migration-era aliases or independent DB writes if found.

**Wave C exit:** Identity is the only live role/permission authority and all DSH/runtime consumers are derived.

---

## 7. Execution wave D — prove or repair DSH maker/checker + canonical intent state machine

### D1. Creation

- maker creates request only;
- request captures required expected owner version where needed;
- permissions are canonicalized against current Identity vocabulary before persistence;
- no direct owner mutation occurs from the UI/maker path before checker approval.

### D2. Review

- checker authorization is exact and live;
- maker/checker separation is enforced server-side;
- approval creates/advances canonical mutation intent exactly once;
- rejection cannot mutate owner truth.

### D3. Owner mutation/readback/finalize

- intent executor performs the owner mutation through Identity;
- independent readback proves complete canonical truth;
- DSH finalization uses version/fence protection;
- a stale worker cannot overwrite a later decision;
- request becomes semantically approved only after owner truth is proven and fenced finalize commits.

### D4. Failure/recovery

For `failed_terminal`:

- old intent payload remains immutable;
- no replay/reset/edit endpoint or internal function remains reachable;
- supersession transaction locks current request/intent;
- exactly one replacement request is inserted;
- old request becomes superseded in the same transaction;
- replacement resolves latest owner role/version/vocabulary;
- duplicate concurrent supersession attempts cannot create two replacements;
- audit records make the old/new relation explicit.

Delete any old recovery path that violates these invariants.

**Wave D exit:** one DSH governance state machine, one owner mutation intent path, no replay/shadow path.

---

## 8. Execution wave E — data migration, backfill and canonical cutover

### E1. Identity migration chain

Run the real migration chain, not isolated SQL fragments, against:

1. clean empty database;
2. representative pre-cutover/seeded state containing:
   - employees/roles/direct grants relevant to DSH administration;
   - legacy `platform.read` live rows before canonicalization;
   - actor access projections requiring rebuild.

Required proofs:

- historical employee backfill is idempotent;
- `identity-032` creates/uses canonical `platform:read`;
- role bindings and direct grants move to canonical action;
- actor projection rebuild occurs from canonical sources;
- zero legacy live vocabulary/bindings/direct grants/projections remain;
- rerunning supported/idempotent migration or reconciliation paths does not duplicate grants.

Do **not** rewrite applied historical migrations merely to remove the legacy string; use forward corrective migrations as already designed.

### E2. DSH migration chain

Run DSH administration migrations in order against clean + representative seeded state.

For `dsh-1041` specifically prove:

- all Partner activation consumers already read Partner-owned truth;
- all captain credential consumers already read Workforce-owned truth;
- no foreign key/view/function/trigger/runtime reader still depends on the two DSH projections;
- drop succeeds without `CASCADE`;
- post-drop assertion proves both relations absent;
- no later migration recreates them or equivalent shadow tables.

### E3. Reconciliation discipline

If seeded data shows drift:

- compute expected state from current canonical owner;
- reconcile deterministically and idempotently;
- add a forward migration/reconciler only if necessary for all affected installations;
- verify readback;
- delete temporary reconciliation scaffolding once all consumers/data are migrated, unless it has a permanent necessary owner/purpose.

No manual one-off row mutation is closure evidence.

**Wave E exit:** schema/data can be rebuilt and upgraded into one canonical state with zero old writer/projection authority.

---

## 9. Execution wave F — Control Panel and contract consumer cutover

### F1. Permission vocabulary UI

- permission options are read from the canonical API/controller;
- no duplicate enum/list/map defines current authorization vocabulary independently;
- UI labels/descriptions may be presentation-only but must not alter action identity;
- disabled/loading/error behavior must fail closed rather than substitute a local fallback list.

### F2. Request/review UX

- maker/checker capability display matches exact backend permission contract;
- `failed_terminal` cannot be silently reopened as the same request;
- replacement action exposes reason and produces a fresh pending request;
- UI does not claim “approved” before backend/owner truth does.

### F3. APIs/contracts/generated artifacts

For every changed administration contract:

- identify canonical schema source;
- regenerate bindings from that source;
- remove manually maintained duplicates if superseded;
- prove request/response state enums and permission identity match backend truth;
- delete stale generated artifacts rather than carrying old/new versions in parallel.

**Wave F exit:** every frontend/API/generated consumer derives from one backend/contract truth with no local authority.

---

## 10. Execution wave G — remote quality/security findings

Only after the exact candidate reaches full analyzer execution:

### G1. SonarQube

Re-run canonical SonarQube workflow for the exact candidate.

Historical PR evidence showed:

- New Code Coverage `7.4%` vs required `>=80%`;
- Security Rating `B` vs required `A`.

Do not assume those values still apply, but do not ignore them.

If reproduced:

- inspect exact uncovered production branches introduced by this PR;
- add meaningful tests for product/security/state/migration invariants, not line-count padding;
- inspect the exact security issue(s) behind rating B and fix source code/config at the owner;
- no blanket exclusions, `NOSONAR`, generated-code relabeling, quality-profile weakening or test-only fake behavior as a fix.

### G2. CodeQL / security-remote

Previously reported checkout findings are resolved/outdated. Final candidate must nevertheless show no active equivalent privileged-untrusted checkout/execution path.

### G3. Semgrep / OpenCodeReview / Dependency Review / Docker / Lockfile

Treat each result as evidence. For every material finding:

- verify validity;
- identify highest source-of-fix;
- remediate there;
- remove any superseded code/config revealed by the fix;
- rerun the exact analyzer on the new candidate.

**Wave G exit:** all required analyzers for the exact candidate succeed or contain only explicitly proven non-material/non-applicable findings recorded with evidence.

---

## 11. Mandatory cleanup wave — not optional and not deferrable

After functional/security treatment, perform a dedicated cleanup inventory over the full affected cone and negative space.

### Delete/retire when proven superseded

- DSH local role-definition storage/writer/read model that competes with Identity;
- old permission vocabulary constants/aliases/fallback maps;
- broad authorization fallback branches;
- dead terminal retry/reset/replay helpers;
- duplicate request/reconciler implementations;
- old Partner/Captain DSH projection consumers;
- unused API routes/contracts after owner migration;
- generated artifacts from superseded schemas;
- obsolete tests that encode superseded truth;
- stale workflow assertions/helpers tied only to old closure topology;
- unused packages/dependencies/imports created by deletion;
- dead comments/TODO/FIXME/HACK that describe already-completed compatibility work and have no remaining action;
- temporary migration/cutover scaffolding whose exit condition has been met.

### Retain only with explicit Necessary Purpose

Examples:

- immutable historical migrations required to upgrade/rebuild databases;
- audit history required to explain immutable state transitions;
- generated artifacts that are still canonical outputs of a single schema source;
- presentation labels that are derived and cannot mutate authorization meaning.

For every retained suspicious artifact, record:

`Owner + Necessary Purpose + Real Consumer + Why it cannot create/modify independent truth`.

Anything lacking that proof is residue and must be deleted.

---

## 12. Negative-space search contract

At the final implementation candidate, perform repository-wide searches equivalent in intent to the following classes; refine paths/patterns to avoid false conclusions from immutable history:

1. legacy permission names (`platform.read`) outside migration-history retirement contexts;
2. DSH local role permission/definition tables, inserts, updates and registry APIs;
3. `role == admin` / broad admin bypass patterns in DSH authorization;
4. hard-coded control-panel administration permission arrays/maps;
5. retired projection names `dsh_admin_partner_activations`, `dsh_admin_captain_credentials` outside historical migration references;
6. terminal failure replay/reset/edit functions/routes;
7. duplicate replacement/supersession writers;
8. duplicate role mutation calls that bypass the canonical intent path;
9. obsolete `workflow_run` closure requirements in active tests/docs/config;
10. privileged PR-trigger workflows that checkout/execute untrusted candidate code;
11. duplicate analyzer/closure status writers capable of publishing independent final truth;
12. orphan imports/dependencies/routes/contracts/tests left after cleanup.

Every match must be classified as `CANONICAL / DERIVED / IMMUTABLE_HISTORY / DELETE_REQUIRED / RETIRE_AFTER_CUTOVER`. Unclassified matches block closure.

---

## 13. Concurrency and atomicity rules

### Safe parallel work

Parallelize only independent read/verification lanes, for example:

- Identity migration verification;
- DSH state-machine tests;
- frontend consumer audit;
- remote analyzer result collection.

### Serialize

- writes to the same file/path;
- migration sequence changes;
- canonical role/permission owner changes;
- PR closure workflow topology changes;
- final staging/push ownership;
- any change whose result changes the authority map used by another lane.

Before integrating concurrent work:

1. fetch latest;
2. classify concurrent delta;
3. reconcile related/overlapping authority changes;
4. re-run affected verification;
5. only then advance the candidate.

---

## 14. Failure handling during execution

### If focused CI tests fail after Wave A

Do not layer exceptions. Cluster failures by semantic owner. Fix stale contract assumptions or implementation security invariants at source.

### If migration fails

Do not use `CASCADE`, disable constraints or skip assertions to force success. Discover the hidden consumer/data invariant, migrate it, then retry.

### If owner readback mismatches

Do not finalize DSH state. Reconcile owner truth, preserve intent/audit integrity, and require exact readback before fenced finalization.

### If exact PR head moves

All earlier closing evidence is stale. Re-pin and rerun all materially affected gates.

### If a tool is unavailable

Classify explicitly:

- `DIAGNOSIS_BLOCKER`
- `EXECUTION_FINDING`
- `DEGRADED_EVIDENCE`
- `NOT_APPLICABLE`
- `EVIDENCE_AVAILABLE`

Do not invent green evidence.

---

## 15. Implementation completion criteria

Implementation work may stop and hand off to closure verification only when all are true:

- RC-CI-001 is removed at its owner; no obsolete parallel PR-closure assertion remains.
- exact pipeline reaches and executes all applicable downstream jobs.
- Identity remains the only role/permission live authority.
- DSH contains governance/request/intent/audit truth only, not duplicate authorization truth.
- terminal-failure recovery has exactly one canonical supersession path.
- migrations/backfills are deterministic, idempotent where required and fail closed.
- all consumers are migrated.
- required projections/storage/routes/contracts are deleted after cutover.
- cleanup/negative-space inventory has no unclassified material residue.
- any exact Sonar/CodeQL/Semgrep/OpenCodeReview/etc. finding has been remediated at source.
- the last cleanup write has been committed before defining the final verification candidate.

Passing tests before those conditions is **not** implementation completion.

---

## 16. Forbidden “fixes”

The following are explicitly non-closing:

- reintroducing `workflow_run` solely to satisfy the stale test;
- deleting `ci-routing.test.mjs` without replacing its canonical security/provenance coverage;
- skipping the failing router test;
- marking skipped downstream CI jobs successful;
- hard-coding Identity permissions into DSH or UI;
- allowing role-name admin bypass;
- resetting a `failed_terminal` intent to pending;
- editing/replaying old terminal request payload;
- keeping both DSH and Identity role definitions “temporarily” without exit condition and same-execution removal;
- using `CASCADE` to conceal unmigrated DB consumers;
- rewriting applied historical migrations to hide legacy history;
- lowering Sonar quality thresholds or excluding changed code to pass;
- suppressing security findings without proving false-positive/non-applicability;
- leaving cleanup for a future PR after cutover is complete.

---

## 17. Required handoff to verification

When implementation is complete, record:

- exact implementation candidate SHA after the last production/test/config cleanup write;
- list of changed files by root/wave;
- deletion/retirement list;
- migration/backfill evidence identifiers;
- focused test evidence;
- exact remote CI/analyzer run IDs;
- any retained compatibility/history artifacts with owner/purpose;
- proof there is no branch drift.

Then execute `02-VERIFICATION-CLOSURE.md` from the top on that exact candidate.

**EXECUTION CONTRACT STATE: `READY_FOR_EXECUTION`**