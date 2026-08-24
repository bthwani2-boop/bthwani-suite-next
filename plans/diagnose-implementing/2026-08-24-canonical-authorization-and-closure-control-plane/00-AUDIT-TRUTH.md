# AUDIT_PREPARE — Canonical Truth Handoff

**STATUS:** `READY_FOR_EXECUTION`  
**EXECUTION_READY:** `true`  
**CLOSED:** `false`  
**REPOSITORY:** `bthwani2-boop/bthwani-suite-next`  
**BRANCH:** `c`  
**PHASE:** `AUDIT_PREPARE`  
**AUDIT_TARGET_SHA:** `51a8482bc891ce904415eadc6c0bcf7168068fbc`  
**PR:** `#284`  
**PR_BASE_SHA:** `ffc25c4d7799c36e876e2e0796551e6a50afcb9c`

> This handoff records the audit of the exact Target System candidate at `AUDIT_TARGET_SHA`. Commits that add only the three canonical handoff files under this `PLAN_DIR` are planning metadata, not Target System mutations. Before `EXECUTE_CLOSE`, compare the then-current branch with `AUDIT_TARGET_SHA`: if anything other than these three plan files changed after the audit, re-audit the changed material cone before executing it.

## 1. Binding invariant

`One Material Truth -> One Canonical Source -> One Authority -> One Owner -> One Canonical Writer/Write Path -> Derived Consumers Only -> Full Cutover -> Mandatory Deletion of Superseded Reality -> Zero Parallel Truth -> Zero Unjustified Residue.`

A passing test, workflow, scanner, UI, API, or migration is evidence only. None may redefine product/system truth or conceal a parallel writer, stale vocabulary, partial cutover, compatibility debt, or material residue.

## 2. Audit authority and constraints

The audit was driven exclusively from `tools/prompting/bthwani-orchestrator/00-ORCHESTRATOR.md` at `AUDIT_TARGET_SHA`, together with the files it canonically delegates to in the same package. The Target System remained read-only. No branch or worktree was created or switched. `tools/prompting/bthwani-orchestrator/**` remained read-only.

All three focus axes are materially active:

1. Product/Governance truth and semantic authority.
2. Code/Architecture ownership, writers, consumers, cleanup and cutover.
3. Data/Contracts/Runtime/Security/Quality evidence and closure.

## 3. Canonical truth and authority map

| Material truth | Canonical source / evidence | Authority / owner | Canonical writer | Derived consumers | Forbidden parallel reality |
|---|---|---|---|---|---|
| Applied actor RBAC / effective authorization | `governance/product/contracts/administration-roles-approvals-audit.product-truth.json` + `core/identity/backend/internal/identity/canonical_actor_access.go` and Identity repository/domain | **Identity** | Identity backend transaction/repository path | DSH Administration, control panel, partner/workforce consumers, API contracts, read models | Any DSH/frontend/bootstrap/direct SQL path that independently creates, mutates, or interprets applied RBAC as a second authority |
| Administrative approval/decision workflow | Product truth + `services/dsh/backend/internal/administration/canonical_intents.go` and administration domain | **DSH Administration** for workflow/orchestration/audit only | Canonical mutation intent + lease/fencing path, with finalization after Identity authoritative readback | Admin UI, queues, audit views, operational consumers | Treating DSH approval state as applied RBAC truth; direct applied-RBAC mutation from DSH |
| Permission/role vocabulary | Canonical Identity/product vocabulary reflected through contracts and migrations | **Identity/Product truth** | Canonical Identity definition/migration path | DSH contracts, workforce/partner access, frontend presentation | Aliases or domain-local role/permission vocabularies with independent semantics |
| Scanner/security evidence | Raw analyzer evidence at exact SHA, then deterministic normalized evidence | Analyzer/workflow owner | Analyzer output + one normalizer/policy path per tool | Aggregate closure/status checks | Gate text, status checks, or classifier shortcuts that reinterpret raw findings or erase tool conditions |
| Final closure state | Exact final candidate after last write/delete + re-audit | Orchestrator closure protocol | Verification/closure record only after all material gates pass | PR closure/reporting | Declaring closure from stale SHA, partial workflows, documentation, or aggregate status alone |

## 4. Highest proven root-cause hierarchy

### RC-0 — Applied authorization sovereignty must remain singular across the entire cone

The highest material system root is the risk/incompleteness of a canonical cutover where Identity is the only applied-RBAC authority while DSH Administration is an approval/orchestration consumer. The repository already contains the intended architecture: Identity canonical actor access and DSH canonical mutation intents/readback. Execution must complete that architecture across every writer, reader, contract, migration, bootstrap path, surface and test, and delete all superseded realities.

**Required final state:**

- Identity is the sole applied authorization writer and authoritative readback source.
- DSH Administration owns approval intent, lease/fencing, decision workflow and audit projection only.
- DSH may request mutation through the canonical path, but cannot independently materialize applied RBAC truth.
- Approval finalization occurs only after authoritative Identity readback proves the requested applied state.
- Frontend and other domains consume derived canonical capabilities/vocabulary; they do not own permission truth.
- No legacy alias, direct writer, second table interpretation, second contract vocabulary, bootstrap bypass, shadow cache, or permanent compatibility layer remains reachable.

### RC-1 — Full consumer/data/contract cutover is part of RC-0, not a follow-up

The affected cone materially includes Identity, DSH Administration, control-panel administration, workforce/partner/store access, local development/bootstrap provisioning, OpenAPI contracts, generated/derived bindings, database migrations, tests and runtime authorization consumers.

Evidence-bearing paths include, at minimum:

- `core/identity/backend/internal/identity/canonical_actor_access.go`
- `core/identity/backend/internal/identity/actor_admin.go`
- `core/identity/backend/internal/identity/employee_access.go`
- `core/identity/backend/internal/identity/partner_actor_access.go`
- `core/identity/backend/internal/identity/permissions.go`
- `core/identity/backend/internal/identity/rbac_definitions.go`
- `core/identity/backend/internal/identity/repository.go`
- `core/identity/contracts/**`
- `core/identity/database/migrations/identity-028_*.sql` through `identity-037_*.sql`
- `services/dsh/backend/internal/administration/**`
- `services/dsh/backend/internal/http/administration*.go`
- `services/dsh/contracts/dsh.administration.openapi.yaml` and related registry/components
- `services/dsh/database/migrations/dsh-1033_*.sql` through `dsh-1039_*.sql`
- `services/dsh/frontend/control-panel/administration/**`
- `services/dsh/frontend/shared/administration/**`
- `services/dsh/frontend/shared/operations/use-operations-permission.ts`
- workforce/partner/store access consumers and local provisioning/bootstrap tools changed by PR #284.

These are one implementation cone. A migration or UI change without writer/reader reconciliation is a partial cutover and is `NOT CLOSED`.

### RC-2 — Semgrep evidence policy currently conflates tool-engine conditions with unknown security errors

Exact run: `Semgrep Code Remote` run `32761499977`, job `97541189096`, candidate `51a8482bc891ce904415eadc6c0bcf7168068fbc`.

Proven evidence:

- Semgrep `1.172.0` executed successfully in diff mode against PR base `ffc25c4d7799c36e876e2e0796551e6a50afcb9c`.
- Raw evidence was produced and uploaded as artifact `9532853877`, digest `sha256:527522815bda4589c60fcce727621db888d7952d13138d6ae394164a1d770863`.
- Raw scan contains **0 actual findings/results**.
- It contains **42 engine conditions**.
- Current policy recognizes only a narrowly matched known tool-limitation signature; **2** conditions are classified while **40** remain `unknownEngineErrors`.
- The workflow therefore fails even though the scan produced zero actual findings.

**Root treatment:** do not suppress Semgrep or convert errors to success. Normalize engine conditions structurally and exhaustively, distinguish proven tool limitations from genuinely unknown engine errors, retain raw evidence, fail on actual findings or truly unknown conditions, and prove `allRawFindingsAccounted=true` without semantic loss.

### RC-3 — GitHub Actions security/control-plane defects are real findings

Exact run: `Remote Security` run `32761499894` on the audit SHA.

Passing analyzers included shellcheck, gitleaks, hadolint, trivy, yamllint, osv-scanner and pinact. Material failures are:

- `zizmor`: high-confidence `excessive-permissions` in `.github/workflows/ci.yml`.
- `actionlint`: four `SC2209` findings across `.github/workflows/ci.yml` and `.github/workflows/semgrep.yml`.

These are workflow-source defects. They must be corrected at the owning workflow/control-plane logic, not bypassed by changing gates, ignoring diagnostics, broadening permissions, or weakening security policy.

### RC-4 — Contextual CI exposes a Realtime/Redis behavioral contract mismatch

Exact run: `BThwani Contextual CI` run `32761500147` on the audit SHA. The failure occurs in the Realtime/Redis behavioral contract path rather than repository checkout/dependency setup. This is an implementation/runtime execution finding and must be repaired at the canonical realtime delivery/publish owner. Test-only modification, silent Redis fallback, swallowing publish failure, or making the workflow non-blocking is forbidden unless the product/runtime truth itself proves a different contract.

### RC-5 — SonarQube Cloud is a material quality finding/evidence gate, not the semantic authority

Exact run: `SonarQube Cloud` run `32761500006` failed on the audit SHA. Sonar findings/quality-gate evidence must be diagnosed and dispositioned during execution at the code owner that creates them. Sonar configuration or tests may be corrected only when they are demonstrably wrong; they may not be weakened to manufacture a green gate.

### RC-6 — PR Closure Request failure is downstream until an independent root is proven

`BThwani PR Closure Request` run `32761499911` failed while multiple prerequisite gates were red. It must not be treated as a primary root merely because it is red. Its canonical role is aggregate/exact-head closure enforcement. Execution must first close the underlying material findings, then prove the closure workflow itself against the exact final candidate; only an independently reproduced defect in the closure workflow becomes a separate root.

## 5. Exact-head evidence ledger at audit saturation

| Check / analyzer | Audit SHA result | Audit disposition |
|---|---:|---|
| Dependency Review | PASS | supporting evidence |
| OpenCodeReview Delegation Context | PASS | delegation/context path healthy; not semantic closure by itself |
| Docker Runtime Hardening | PASS | supporting evidence |
| BThwani Lockfile Integrity | PASS | supporting evidence |
| CodeQL | PASS | supporting security evidence |
| Semgrep Code Remote | FAIL | RC-2: zero findings, unresolved engine-condition classification |
| Remote Security | FAIL | RC-3: zizmor + actionlint source findings |
| BThwani Contextual CI | FAIL | RC-4: Realtime/Redis behavior contract finding |
| SonarQube Cloud | FAIL | RC-5: quality finding/evidence gate requiring execution diagnosis |
| BThwani PR Closure Request | FAIL | RC-6: downstream/aggregate until independently proven otherwise |

A green subset does not imply closure. A red aggregate check does not replace diagnosis of its underlying evidence.

## 6. Writers, readers and consumers that must converge

Execution must enumerate and prove, not assume, every member of these classes in the affected cone:

1. **Writers:** Identity applied-RBAC mutation paths, DB migrations/backfills, bootstrap/provisioning writers, DSH mutation-intent producer, any direct SQL or administrative mutation path.
2. **Readers:** Identity authoritative readback, DSH decision finalizer, HTTP authorization middleware/definitions, partner/store/workforce access checks, frontend capability readers.
3. **Consumers:** control-panel administration queues/screens, workforce/partner surfaces, DSH services, local provisioning/dev-session tools, API clients, runtime guards, tests and generated bindings.
4. **Data:** canonical access projection/state, role/permission vocabulary, DSH mutation intents/leases/fences/audit reconciliation, migrated historical records.
5. **Contracts:** Identity RBAC/admin/employee/support contracts, DSH administration contract and any related shared schemas/registry entries.

No member may preserve an independently writable or semantically divergent truth after cutover.

## 7. Mandatory data and migration obligations

The execution must treat the Identity `028..037` and DSH `1033..1039` migration series as an ordered canonicalization/reconciliation chain, not merely files that happen to apply.

Required proof after the final migration/cutover:

- canonical vocabulary is singular;
- historical rows are reconciled/backfilled to the canonical representation;
- no pending/malformed duplicate role-change state can create a second applied truth;
- fencing/idempotency prevents stale or concurrent mutation intents from winning after a newer canonical decision;
- projection/update write fences block non-canonical writers;
- repeated execution/retry cannot create duplicate authority state;
- authoritative Identity readback and DSH audit/decision projection agree for every migrated affected record;
- all legacy columns/tables/indexes/triggers/functions or compatibility paths with no remaining canonical purpose are dropped/retired once consumers have migrated.

## 8. Mandatory cleanup/deletion ledger

The following are **obligations**, not optional polish. Exact artifacts are deleted when repository-wide consumer proof establishes they are superseded:

- direct applied-RBAC writers outside Identity;
- stale/duplicate permission or role constants and aliases;
- DSH-owned applied-state interpretations that duplicate Identity truth;
- legacy read/write routes or endpoints superseded by the canonical mutation/readback flow;
- old schema columns/tables/triggers/functions/projections made obsolete by canonical migrations;
- frontend hard-coded permission truth or duplicate local administration models;
- bootstrap/dev provisioning bypasses that manufacture authorization differently from canonical Identity semantics;
- redundant compatibility shims after the last consumer migrates;
- stale generated artifacts/contracts/tests/docs/configs that encode superseded semantics;
- workflow code that duplicates scanner authority or transforms raw findings inconsistently;
- obsolete workflow permissions, shell assignment forms or classification branches exposed by zizmor/actionlint/Semgrep evidence.

**Exit rule:** an artifact may remain only with `Necessary Purpose + Correct Owner + Real Consumer + Proven Value`. A temporary compatibility element must be read-only where possible, have an explicit owner and exit condition, and be removed in the same execution once the last real consumer moves.

## 9. Material decisions resolved in AUDIT_PREPARE

1. **Applied RBAC authority:** Identity, exclusively.
2. **Administrative workflow authority:** DSH Administration owns approval/orchestration/audit, not applied RBAC.
3. **Finalization rule:** DSH cannot finalize an applied authorization change until Identity authoritative readback proves the requested canonical state.
4. **Vocabulary authority:** one canonical Identity/Product permission-role vocabulary; no permanent aliases with independent meaning.
5. **Cutover rule:** migrate all consumers/data first, then delete superseded reality in the same closure effort; no permanent dual-write/dual-authority period.
6. **Semgrep rule:** engine conditions are not automatically security findings; every raw condition must be deterministically classified without hiding unknowns or actual findings.
7. **Security workflow rule:** least privilege and analyzer-clean workflow source are mandatory; security gates are not weakened to pass.
8. **CI/runtime rule:** Realtime/Redis behavior is fixed at its canonical runtime owner, not in a test-only/workflow-only workaround.
9. **Closure rule:** PR Closure is exact-final-candidate aggregate evidence, never a substitute for underlying root closure.
10. **Cleanup rule:** proven superseded material is deleted; retaining it “for safety” is not closure.

No unresolved product/authority decision remains that requires user choice before deterministic implementation. Tool-specific diagnostics discovered during implementation are execution findings governed by the already resolved canonical rules above, not new permission to invent a second truth.

## 10. Negative-space obligations

Execution must explicitly search for the absence of hidden parallel truth after the positive path is green:

- raw SQL writes to canonical authorization state outside Identity owner;
- aliases/synonyms for canonical roles or permissions;
- alternate bootstrap/provisioning mutations;
- cached/projection state that can outlive or override authoritative Identity state;
- DSH approval rows interpreted as applied state without readback;
- stale endpoints/routes/contracts still reachable;
- duplicate frontend permission maps or independent state machines;
- tests/mocks that pass without traversing the canonical writer/readback path;
- workflow status checks whose name is green while raw evidence is unaccounted;
- scanners running against a different SHA/base than the final candidate;
- dead files/packages/dependencies/configs left after consumer migration.

Any material residue found by this recheck reopens execution and makes `CLOSED` illegal.

## 11. Readiness conclusion

The highest semantic authority, canonical target, affected implementation cone, data/contract migration direction, material cleanup obligations, scanner/control-plane roots and exact-head verification requirements are sufficiently fixed to execute without a new product/authority discovery cycle.

`EXECUTION_READY=true`

The next phase must consume `01-EXECUTION-CONTRACT.md` and `02-VERIFICATION-CLOSURE.md`, mutate the Target System only under `EXECUTE_CLOSE`, and may declare `CLOSED` only after exact-final-candidate re-audit proves complete cutover and zero material residue.