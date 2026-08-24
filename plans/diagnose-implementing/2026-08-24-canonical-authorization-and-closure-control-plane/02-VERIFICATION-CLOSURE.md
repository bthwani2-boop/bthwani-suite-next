# VERIFY / REDIAGNOSE / CLOSE — Exact Final Candidate Contract

**STATUS:** `READY_FOR_EXECUTION`  
**EXECUTION_READY:** `true`  
**CLOSED:** `false`  
**REPOSITORY:** `bthwani2-boop/bthwani-suite-next`  
**BRANCH:** `c`  
**AUDIT_TARGET_SHA:** `51a8482bc891ce904415eadc6c0bcf7168068fbc`

This file defines the minimum proof required after `01-EXECUTION-CONTRACT.md` has been executed. It is intentionally fail-closed. A check is not closure evidence unless it targets the exact final candidate and proves the material invariant it is meant to cover.

## 1. Final-candidate pinning law

1. Complete all implementation, migration, regeneration and mandatory deletion first.
2. Confirm the working/integration tree contains no unintended changes.
3. Commit the last material write/deletion.
4. Pin that commit as `FINAL_CANDIDATE_SHA`.
5. All repository scans, CI workflows, security/quality tools, database proof, runtime proof, contract proof and negative-space rechecks used for closure must identify that exact SHA or an immutable artifact cryptographically/uniquely tied to it.
6. If any source/config/schema/test/workflow/generated artifact is changed afterward, the old final candidate is invalid. Pin a new SHA and repeat the affected verification plus the final negative-space re-audit.

No stale run, previous green branch head, merge commit from another SHA, or documentation assertion may substitute for exact-final-candidate proof.

---

# 2. Closure matrix

Every row below is mandatory unless marked `N/A_PROVEN` with evidence showing why it cannot affect the final candidate.

| Domain | Required proof | Failure means |
|---|---|---|
| Product/Semantic authority | Product Truth and implementation agree on Identity as sole applied-RBAC authority; DSH is orchestration/audit only | `NOT CLOSED` |
| Writers | repository/runtime/DB audit shows one canonical applied-RBAC writer and zero reachable parallel writers | `NOT CLOSED` |
| Readers/Consumers | every affected consumer reads/derives canonical state/vocabulary; no missing consumer | `NOT CLOSED` |
| DSH finalization | administrative decision finalizes only after authoritative Identity readback | `NOT CLOSED` |
| Contracts | Identity/DSH contracts and generated bindings express one canonical model with no drift/obsolete aliases | `NOT CLOSED` |
| Data | migrations/backfill/reconciliation show zero material mismatch/orphan/conflict | `NOT CLOSED` |
| Concurrency/Idempotency | retries, stale intents, races and replay cannot create divergent applied state | `NOT CLOSED` |
| Frontend | UI state is derived/presentational; no independent permission authority or obsolete workflow remains | `NOT CLOSED` |
| Runtime | Realtime/Redis failing contract and relevant failure/recovery paths pass for canonical semantics | `NOT CLOSED` |
| Semgrep | actual findings = 0 after disposition; unknown engine errors = 0; all raw conditions accounted; limitations visible/proven | `NOT CLOSED` |
| Remote Security | zizmor, actionlint and all configured remote analyzers pass on final SHA | `NOT CLOSED` |
| SonarQube Cloud | analysis completes and required quality gate passes without unjustified suppression/exclusion | `NOT CLOSED` |
| CodeQL | pass on exact final candidate | `NOT CLOSED` |
| Dependency Review | pass on exact final candidate / PR candidate | `NOT CLOSED` |
| Lockfile integrity | pass on exact final candidate | `NOT CLOSED` |
| Docker/runtime hardening | pass where affected/applicable | `NOT CLOSED` |
| OpenCodeReview delegation/evidence | context/delegation evidence is truthful; no workflow falsely claims semantic review it did not perform | `NOT CLOSED` |
| PR closure aggregate | exact-head closure workflow passes only after prerequisites are green | `NOT CLOSED` |
| Cleanup | all proven legacy/dead/stale/duplicate/orphan/superseded material removed | `NOT CLOSED` |
| Negative space | no hidden direct writer, alias, stale endpoint, cache/projection authority, compatibility debt or unaccounted scanner evidence | `NOT CLOSED` |

---

# 3. Canonical authorization verification

## 3.1 Product/system truth consistency

Re-read on `FINAL_CANDIDATE_SHA`:

- `governance/product/contracts/administration-roles-approvals-audit.product-truth.json`
- Identity canonical access/RBAC definitions/repository implementation
- DSH administration canonical intent/approval/readback implementation
- Identity and DSH administration contracts

Prove these statements are simultaneously true:

1. Identity owns applied authorization truth.
2. Exactly one canonical Identity mutation path creates/changes that applied truth.
3. DSH owns approval/orchestration/audit truth but not the applied authorization truth.
4. DSH cannot finalize an applied authorization transition until Identity authoritative readback confirms it.
5. Rollback/retry flows use the same canonical mutation/readback authority.
6. Role/permission vocabulary is singular and machine semantics are not duplicated downstream.

Any contradiction across these sources is a material semantic failure even if tests are green.

## 3.2 Writer negative-space audit

Search source, migrations, scripts, fixtures and runtime tooling for every write form capable of affecting canonical authorization state:

- repository/domain mutation calls;
- SQL `INSERT`/`UPDATE`/`DELETE`/upsert against canonical access/RBAC tables;
- stored procedures/functions/triggers;
- bootstrap/provisioning scripts;
- admin endpoints;
- tests/helpers that are reused by runtime provisioning;
- backfill/reconciliation code;
- caches/projections with write-back behavior.

For every hit, record owner and purpose. Closure requires:

- canonical writer: exactly one authority path;
- migration/backfill writers: bounded, canonical-owner-controlled and not runtime alternatives;
- all other write-capable paths: deleted or proven unreachable/non-authoritative.

A second reachable writer is `NOT CLOSED` regardless of whether current tests exercise it.

## 3.3 Reader/consumer completeness audit

Inventory and verify all affected consumers, including:

- Identity HTTP/RBAC boundaries;
- DSH administration and permission boundaries;
- control-panel administration screens/controllers/API/types;
- partner/store/workforce access paths;
- operations permission hooks;
- local bootstrap/dev-session/provisioning tools;
- generated API clients and schemas;
- background/runtime consumers and caches;
- tests, mocks and fixtures that encode state semantics.

Each must consume canonical data/vocabulary or a rebuildable derived projection. No consumer may infer applied authorization from DSH workflow state alone.

---

# 4. Database and data-integrity closure

## 4.1 Migration chain verification

Verify the final supported migration history and manifest ordering for:

- Identity `identity-028` through `identity-037` and any final corrective forward migrations added by execution;
- DSH `dsh-1033` through `dsh-1039` and any final corrective forward migrations added by execution.

Required checks:

- manifests include exactly the intended forward chain;
- fresh database migration reaches the canonical schema;
- upgrade from the supported pre-cutover state reaches the same schema/semantics;
- migrations are repeat-safe where designed to be idempotent;
- no migration silently ignores a material conflict that requires reconciliation;
- runtime schema objects match the intended writer fences/constraints.

Do not delete historical migrations when they are canonical reconstruction history. Remove obsolete runtime schema objects with correct forward migrations.

## 4.2 Reconciliation proof

Produce deterministic readback comparing affected DSH workflow/audit state with Identity applied state.

Closure requires zero unexplained:

- duplicate active assignments;
- orphan role/permission references;
- stale mutation intents/leases able to finalize;
- impossible state transitions;
- finalized DSH decisions without matching Identity state;
- Identity applied changes lacking the expected governed audit trail where governance requires one;
- legacy vocabulary values still reachable by current consumers.

Any mismatch must be repaired at its canonical owner and the entire reconciliation rerun.

## 4.3 Concurrency/idempotency proof

Exercise and prove:

- duplicate request/retry;
- concurrent competing role/permission decisions;
- stale fenced mutation attempt;
- timeout after Identity write but before DSH finalization;
- retry after readback failure;
- rollback competing with a newer decision;
- database transaction failure/restart.

Result must converge to one authoritative applied state and one coherent derived audit state without double application or stale overwrite.

---

# 5. Contract and generated-artifact closure

Validate all affected OpenAPI/spec/registry sources and generated outputs.

Required proof:

- all local refs resolve;
- schema/enum vocabulary is canonical;
- ownership boundaries are explicit;
- DSH workflow state is not mislabeled as applied authorization state;
- generated bindings match the canonical contracts exactly;
- no old generated files remain imported/reachable;
- no consumer depends on a deleted compatibility field/endpoint;
- contract tests verify real implementation behavior, not mocks that bypass the canonical writer/readback path.

After regeneration, perform a stale-artifact search. Duplicate generated trees or hand-maintained equivalents are material residue unless a distinct real consumer/owner is proven.

---

# 6. Frontend and journey closure

For every affected administration/workforce/partner surface:

1. Start from the real actor/session capability source.
2. Traverse the administrative journey through request, review/approval, pending state, Identity application, authoritative readback and final UI state.
3. Verify loading/empty/error/retry/denied/stale/concurrent states.
4. Verify UI does not optimistically convert an approved workflow decision into applied authorization before canonical readback.
5. Verify role/permission presentation uses canonical values and display-only mappings.
6. Verify removed routes/components/adapters cannot still be reached through navigation, imports or feature configuration.

A visually correct screen with a parallel local permission truth is a failure.

---

# 7. Realtime/Redis runtime closure

Re-run the exact behavior that failed `BThwani Contextual CI` run `32761500147`, then broaden to the owning failure/recovery cone.

Required proof:

- canonical realtime publish/delivery behavior is defined at one owner;
- Redis publish failure has explicit behavior and cannot silently report success when delivery semantics require failure;
- no in-memory/local alternate delivery state becomes a parallel truth unless it is a deliberately canonical, persisted/reconciled design owned by the product/runtime contract;
- retries are idempotent where duplicate emission would be material;
- observability exposes failure/recovery sufficiently for operations;
- existing real consumers continue to behave correctly.

A test change that merely expects the buggy behavior is not proof.

---

# 8. Remote analysis and security closure

## 8.1 Semgrep

Run the canonical Semgrep workflow on `FINAL_CANDIDATE_SHA` and retain raw evidence.

Required summary invariants:

- `headSha == FINAL_CANDIDATE_SHA`;
- correct PR/base or full-scan scope is recorded;
- every raw `.results[]` finding is normalized/dispositioned;
- every raw `.errors[]` engine condition is normalized/dispositioned;
- cardinalities reconcile exactly with the raw artifact;
- `allRawFindingsAccounted == true` only after that reconciliation;
- `unknownEngineErrors == 0`;
- actual material findings requiring remediation == 0;
- `toolLimitationsProven` may be nonzero only when each limitation is explicit, structurally classified, retained in raw evidence and does not hide unscanned material code without a compensating authoritative analysis.

If a Semgrep limitation creates a real coverage gap, closure requires another authoritative analysis or a corrected scan strategy that covers the gap; merely labeling it a limitation is insufficient.

## 8.2 Remote Security

All configured analyzers must execute and pass on the final candidate unless a specific analyzer is `N/A_PROVEN`:

- zizmor;
- actionlint;
- gitleaks;
- shellcheck;
- hadolint;
- trivy;
- yamllint;
- osv-scanner;
- pinact;
- any additional canonical analyzer present in the final workflow.

Specifically re-prove that:

- `.github/workflows/ci.yml` no longer has the high-confidence excessive-permissions finding;
- the four previously observed actionlint `SC2209` findings in `ci.yml`/`semgrep.yml` are eliminated at source;
- actions remain immutable/pinned according to repository policy;
- workflow permissions are least-privilege and scoped to real need;
- exact-SHA checkout remains enforced where closure evidence depends on candidate identity.

## 8.3 CodeQL / dependency / container / lockfile

Re-run CodeQL, Dependency Review, Docker Runtime Hardening and Lockfile Integrity on the exact final candidate/PR context. A previous pass on the audit SHA is background evidence only and cannot close a modified final candidate.

## 8.4 OpenCodeReview truthfulness

Verify the workflow accurately distinguishes delegation/context from actual semantic host-agent review. It must not claim a review was executed by a workflow that only prepared context. Any semantic review evidence used for closure must identify the actual reviewer/agent execution and candidate SHA.

---

# 9. SonarQube Cloud closure

Run SonarQube Cloud against `FINAL_CANDIDATE_SHA` using the canonical project configuration.

Required proof:

- scanner execution completes;
- source/coverage paths map to the intended code, not stale/generated duplicates;
- required coverage reports are valid for the same candidate;
- quality gate passes;
- all new/material issues are resolved or explicitly proven false positive with narrow documented disposition;
- no broad exclusion, quality-profile weakening, gate weakening or generated-noise workaround was introduced solely to obtain green status;
- duplicate/dead code revealed by the root treatment is removed rather than suppressed.

If Sonar failure is caused by a pre-scan coverage/build failure, fix that owning build/test/runtime root first; do not misclassify it as a Sonar service failure.

---

# 10. Contextual CI and end-to-end closure

Run the canonical Contextual CI on the exact final candidate and require all routed affected scopes to pass. Then execute the broadest material verification required by the final affected cone.

At minimum prove:

- Node/TypeScript verification for affected frontends/tooling;
- Go tests for affected Identity/DSH backends;
- contract validation/generation checks;
- migration/DB checks;
- runtime/Realtime/Redis behavioral checks;
- affected administration journey tests;
- security/quality gates delegated to their canonical workflows rather than duplicated inside CI.

If adaptive routing selects scopes, verify the router sees the real diff and does not omit a materially affected service. For final closure, use full verification where the cross-domain cutover makes affected-only reasoning insufficient.

---

# 11. PR Closure Request verification

Only after all underlying checks are green, run/observe the canonical PR closure workflow for the exact head.

Verify it:

- resolves PR identity branch-agnostically;
- compares/evaluates the actual head SHA, not a branch name assumption;
- consumes the authoritative status/evidence set;
- does not accept stale successful runs from prior SHAs;
- fails closed when required evidence is missing/degraded;
- distinguishes tool limitation evidence from a successful clean scan;
- cannot self-satisfy by trusting its own aggregate status.

If it still fails with all prerequisites genuinely green on the same SHA, diagnose the closure workflow as an independent control-plane root and repair it before closure.

---

# 12. Mandatory cleanup verification

After the last functional fix, perform a dedicated deletion audit. Search the full effective scope for artifacts that became unnecessary because of the canonical cutover.

Categories that require explicit disposition:

- `Legacy`
- `Dead`
- `Stale`
- `Duplicate`
- `Unused`
- `Orphan`
- `Deprecated`
- `Superseded`
- `Redundant`
- `Unreachable`
- `Misowned`
- `Non-Canonical`

For each candidate, answer:

1. Does it have a necessary current purpose?
2. Is it owned by the correct authority?
3. Does a real supported consumer use it?
4. Is its value proven and distinct from a canonical artifact?
5. Can it be rebuilt/derived instead of owning state?

If the answer does not justify survival, delete it. Re-run dependency/import/build/runtime verification after deletion.

No “leave for safety”, “cleanup later”, disabled dead block, commented legacy code, stale package, unused route or duplicate schema is allowed inside the effective scope.

---

# 13. Negative-space recheck after the last deletion

This recheck must occur **after** cleanup, because deletion can expose hidden consumers or fallback paths.

Search/prove absence of:

- second applied-RBAC writer;
- direct DSH mutation of Identity-owned state;
- approval-as-applied-state interpretation;
- stale role/permission aliases;
- old endpoints/routes still registered;
- alternate bootstrap/provisioning writers;
- write-capable caches/projections;
- permanent compatibility adapters;
- duplicate contract/generated trees;
- obsolete migrations/runtime schema objects;
- fallback branches masking Redis/realtime failure;
- security scanner ignore/suppression added without proven justification;
- workflow permissions broader than required;
- analyzer evidence not tied to final SHA;
- failing/skipped required checks treated as green;
- dead files/packages/dependencies after cutover.

Also verify repository search results for superseded terminology are either zero or individually proven non-semantic historical/test-migration evidence with no runtime authority.

Any material discovery here returns execution to the owning unit. Do not waive it in the closure report.

---

# 14. Final evidence record

Before declaring `CLOSED`, produce one final record containing at least:

- `AUDIT_TARGET_SHA`;
- `FINAL_CANDIDATE_SHA`;
- PR number/head/base;
- canonical authority/writer statement;
- complete changed-file/deletion inventory for execution;
- migration/backfill/reconciliation evidence;
- writer/reader/consumer inventory result;
- runtime/E2E evidence;
- contract/generated-artifact evidence;
- Semgrep raw artifact + normalized summary counts;
- Remote Security analyzer outcomes;
- CodeQL outcome;
- SonarQube outcome/quality gate;
- Contextual CI outcome;
- Dependency Review/Lockfile/Docker outcomes;
- OpenCodeReview evidence disposition;
- PR Closure Request outcome;
- cleanup/deletion ledger;
- negative-space search result;
- all `N/A_PROVEN` decisions with evidence;
- statement that no known material finding remains.

Every external/remote result must identify the exact final SHA or be rejected as stale evidence.

---

# 15. Closure decision algorithm

Declare `CLOSED` **only if all are true**:

1. `FINAL_CANDIDATE_SHA` was pinned after the last write/delete.
2. Canonical Product/System Truth is consistent across Product -> UX -> Frontend -> APIs/Contracts -> Backend -> Data/DB -> Runtime.
3. One applied authorization authority/writer remains: Identity.
4. DSH Administration is orchestration/audit-only and finalizes from authoritative readback.
5. All writers/readers/consumers/data/contracts are fully cut over.
6. Data reconciliation and concurrency/idempotency proof are clean.
7. No material fallback, workaround, shim, half migration or compatibility debt remains.
8. No legacy/dead/stale/duplicate/orphan/deprecated/superseded material remains in the effective scope.
9. Semgrep raw evidence is fully accounted with no actual unresolved finding or unknown engine error.
10. Remote Security, CodeQL, SonarQube, Contextual CI and all required supporting checks pass on the exact final candidate.
11. PR Closure Request passes for that exact head after prerequisites.
12. Final cleanup and negative-space re-audit reveal zero known material finding/residue.

If any item is false or unknown, status is `NOT CLOSED` and execution continues from the highest remaining proven root.

## AUDIT_PREPARE terminal state

At the time this handoff is created:

`READY_FOR_EXECUTION`

This is not `CLOSED`. The three-file handoff is complete only as an execution contract; system closure must be proven later on the exact final candidate under `EXECUTE_CLOSE`.