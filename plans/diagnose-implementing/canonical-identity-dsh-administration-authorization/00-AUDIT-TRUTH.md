# 00 — AUDIT TRUTH

## Package identity

- **Repository:** `bthwani2-boop/bthwani-suite-next`
- **Target branch:** `c`
- **Phase:** `AUDIT_PREPARE`
- **Entry point:** `tools/prompting/bthwani-orchestrator/00-ORCHESTRATOR.md`
- **Orchestrator package revision observed:** `14`
- **Audit snapshot HEAD:** `119aa5e9df86c738400e062858f8f631eafbe905`
- **Audit snapshot commit:** `chore: save progress`
- **Pull request:** `#284 — Close canonical Identity/DSH administration authorization`
- **PR base at audit snapshot:** `master@ffc25c4d7799c36e876e2e0796551e6a50afcb9c`
- **PR head at audit snapshot:** `c@119aa5e9df86c738400e062858f8f631eafbe905`
- **PR state:** open, draft
- **Observed PR scale:** 343 changed files, 173 commits
- **PLAN_DIR:** `plans/diagnose-implementing/canonical-identity-dsh-administration-authorization/`
- **Target System mutation during this phase:** **FORBIDDEN**
- **Orchestrator package mutation:** **FORBIDDEN**
- **Allowed phase output:** these three plan/handoff files only

> This package records audit truth from the immutable audit snapshot above. Creating this handoff package necessarily advances branch `c`; execution MUST re-resolve the live PR/head before touching the Target System and MUST not assume this audit SHA is still the execution candidate.

---

## 1. Executive canonical truth

The highest product/system root previously present in this PR was an **incomplete authorization-authority cutover**: DSH administration had historical permission/role/projection assumptions that could compete with Identity-owned authorization truth. On the audited candidate, the material architecture has already converged substantially:

1. **Identity is the sole live authority for identity/session truth, role definitions, permission vocabulary, role bindings/direct grants, and effective permission resolution.**
2. **DSH Administration owns governance of DSH administrative change requests** — maker/checker requests, canonical mutation intents, execution state, fencing and immutable audit — but does not own a second role-definition registry.
3. **The Control Panel is a derived consumer.** It reads the permission vocabulary through the administration/Identity path and does not define an independent permission list.
4. **Terminal execution failure is not replayed, reset or edited.** `failed_terminal` freezes the old intent; recovery atomically supersedes the old request and creates exactly one fresh pending request against current canonical owner state.
5. **Non-owner projections are explicitly retired.** DSH migration `dsh-1041_drop_non_owner_admin_projections.sql` drops Partner-owned activation and Workforce-owned captain credential projections without `CASCADE`, so unknown DB dependencies fail closed.
6. **Legacy permission action `platform.read` is historical only.** Forward migration `identity-032_platform_permission_vocabulary_canonicalization.sql` moves live vocabulary/bindings/direct grants/projections to canonical `platform:read` and asserts zero live legacy residue.

The **highest currently proven remaining executable root cause** is now in the engineering control plane, not the product authorization design:

> `tools/scripts/ci-routing.test.mjs` still requires the superseded PR-closure topology `workflow_run`, while `.github/workflows/pr-closure-evidence.yml` has been redesigned as a trusted reusable `workflow_call` with explicit immutable PR/head/base/default-SHA inputs. The stale topology assertion fails before scope resolution and prevents the downstream contract/node/backend/runtime verification jobs from executing.

This is not a license to weaken CI. The fix must update the verification contract to enforce the **current security/identity invariants**, not resurrect the old topology or simply delete the failing test.

---

## 2. Canonical authority map

| Material truth | Canonical owner / authority | Canonical writer / mutation path | Permitted consumers | Forbidden parallel truth |
|---|---|---|---|---|
| Actor identity, sessions, roles, effective permissions | `IDENTITY` | Identity service/domain APIs and governed Identity migrations | DSH auth checks, control panel, other services | DSH/local role-name bypass, cached mutable permission authority |
| Permission vocabulary | `IDENTITY` | Identity canonical vocabulary/migrations | DSH role request validation, Control Panel permission picker | hard-coded UI vocabulary, DSH-local vocabulary registry |
| Role definitions and bindings | `IDENTITY` | Identity role mutation path (`UpsertRoleDefinition...` / owner API) | DSH administration readback, UI read models | DSH role-definition table/registry as authority |
| DSH administrative change governance | `DSH_ADMINISTRATION_GOVERNANCE` | maker request → checker review → canonical mutation intent → owner write/readback → fenced finalize | Control Panel and audit readers | direct UI write, bypass route, second request writer |
| Partner lifecycle truth | Partner domain | Partner canonical lifecycle path | DSH derived admin views only where needed | `dsh_admin_partner_activations` projection as authority |
| Captain/workforce credentials | `WORKFORCE` | Workforce canonical path | DSH derived consumers only | `dsh_admin_captain_credentials` as authority |
| PR identity and exact candidate | GitHub repository/PR | GitHub refs + PR metadata | CI/analyzers/handoff | branch-name inference, stale SHA reuse |
| PR closure orchestration | trusted default-branch workflow definitions | human-approved closure request → trusted dispatch/reusable closure evidence | exact-candidate CI/analyzers | candidate-controlled privileged execution, duplicate closure aggregators |

---

## 3. Root-cause clusters

### RC-AUTH-001 — Historical incomplete Identity/DSH authorization authority cutover

**Class:** Product/System/Architectural root, historically material; **structurally treated in audited candidate, closure verification still mandatory**.

**Historical failure mode**

- DSH could carry permission-bearing administration projections or broad fallback assumptions.
- permission vocabulary semantics had legacy naming (`platform.read`) and independent consumer assumptions.
- Control Panel could become a local semantic authority if it carried a hard-coded vocabulary.
- role mutation could be considered complete before canonical owner write + independent readback + fenced DSH finalization.

**Canonical target**

`Identity role/permission truth → DSH governed request/intent only → Identity canonical mutation → independent Identity readback → fenced DSH finalize → derived consumers only`.

**Current evidence at audit snapshot**

- `governance/product/contracts/administration-roles-approvals-audit.product-truth.json`
  - Identity/Workforce/DSH ownership is explicit.
  - maker/checker separation is explicit.
  - execution states include `failed_terminal`.
  - approved meaning requires canonical owner mutation + readback + fenced finalization.
  - replay/reset/edit of terminal failures is forbidden.
- `services/dsh/backend/internal/administration/administration.go`
  - Role is documented as a DSH API view over Identity-owned role truth.
  - role list/read is sourced from Identity; no DSH local role-definition registry is retained.
- `services/dsh/backend/internal/administration/role_requests.go`
  - role request permission validation reads current Identity vocabulary.
  - approval writes the complete role definition through Identity, performs independent owner readback, then finalizes the DSH request.
- `services/dsh/backend/internal/http/administration_permission.go`
  - each protected request resolves current Identity session/effective permissions.
  - requires exact service/surface/action/scope; no broad role-name authorization fallback.
- `services/dsh/frontend/control-panel/administration/RoleDefinitionApprovalQueue.tsx`
  - permission choices come from the canonical vocabulary controller.
  - failed-terminal entries cannot be approved/rejected again; replacement is explicit and reasoned.
- `services/dsh/backend/internal/administration/terminal_supersession.go`
  - old terminal intent is locked and retained immutable.
  - old request is marked superseded and exactly one fresh pending replacement is created in the same transaction.
- `services/dsh/database/migrations/dsh-1041_drop_non_owner_admin_projections.sql`
  - drops Partner/Workforce-owned DSH projections without `CASCADE` and asserts absence.
- `core/identity/database/migrations/identity-032_platform_permission_vocabulary_canonicalization.sql`
  - forward-canonicalizes `platform.read` to `platform:read`, migrates role/direct grants, rebuilds actor projections and asserts zero live legacy residue.
- `core/identity/backend/internal/identity/employee_dsh_permission_backfill_test.go`
  - preserves the historical backfill migration as immutable history and verifies the later canonicalization migration removes the legacy live permission representation.

**Disposition:** `VERIFY_AND_CLOSE`; do not re-architect again unless exact-candidate evidence contradicts the owner map above.

---

### RC-CI-001 — Stale PR-closure verification topology blocks the current canonical pipeline

**Class:** current material Engineering Control Plane root; **OPEN / SOURCE OF FIX PROVEN**.

**Failure evidence**

- Exact audit snapshot workflow run: `32781218846` — failure.
- First failing job: `97603482989 — Resolve canonical target and affected scope`.
- `node --test tools/scripts/ci-routing.test.mjs` fails test:
  - `PR closure is aggregated only by a trusted workflow_run definition`.
  - failing assertion: `assert.match(evidenceWorkflow, /workflow_run:/u)`.
- Current `.github/workflows/pr-closure-evidence.yml` instead begins with `on: workflow_call:` and requires immutable inputs:
  - `pr_number`, `head_ref`, `head_sha`, `base_ref`, `base_sha`, `closure_approver`, `default_sha`.
- The current evidence workflow revalidates open PR identity, exact head/base refs and SHAs, repository ownership, approval marker/label, independent approver, and trusted default definition before dispatching full exact-candidate CI/analyzers.
- Because the routing test aborts first, contract diagnostics, Node verification, Backend verification and Runtime proof were skipped in run `32781218846`.

**Why this is a root cause rather than a symptom**

The executable closure architecture changed, but its verification contract retained the old topology as an invariant. This is **semantic/control-plane contract drift**. Merely skipping the test would destroy protection; restoring `workflow_run` solely to satisfy the test would restore superseded architecture. The correct owner is the CI-routing verification contract and any stale documentation/guards that assert the old topology.

**Source of fix**

- primary: `tools/scripts/ci-routing.test.mjs`
- dependent stale assertions/docs: any exact repository references that semantically require `workflow_run` for PR closure after the canonical `workflow_call` redesign
- authoritative implementation to preserve: `.github/workflows/pr-closure-evidence.yml` and its trusted caller/dispatch path, subject to exact security verification

**Required end-state invariant**

The test must assert security and provenance semantics, not obsolete event shape:

- reusable evidence workflow is `workflow_call`-only for privileged closure execution;
- immutable PR/head/base/default-SHA inputs are required;
- the running definition is the approved default-branch definition;
- caller actor/approval identity is revalidated;
- candidate code is not checked out/executed in privileged closure context;
- full CI and analyzers are dispatched against immutable candidate identity while workflow definitions execute from trusted default branch;
- run correlation fails closed on identity drift;
- no second `workflow_run`/PR-target closure authority remains reachable.

**Disposition:** `IMPLEMENT_FIRST`.

---

## 4. Known material findings ledger

| ID | Finding | Evidence state | Materiality | Required disposition |
|---|---|---|---|---|
| F-001 | CI routing contract expects obsolete `workflow_run` closure topology | exact audit SHA, run `32781218846` | blocker to all downstream verification | fix at `ci-routing.test.mjs` owner; remove superseded assertions; rerun exact CI |
| F-002 | SonarQube PR comment reported New Code Coverage `7.4%` (<80%) and Security Rating `B` (<A) | historical PR evidence dated 2026-08-24; not proven on current final candidate | material until exact-candidate revalidation | rerun canonical Sonar workflow after CI root is fixed; if reproduced, remediate production code/tests at source; no exclusions/gaming |
| F-003 | CodeQL checkout findings on `remote-analysis-evidence.yml` / `open-code-review.yml` | review threads now `resolved=true` and `outdated=true` | historical, not active blocker | do not reopen blindly; exact final CodeQL/security revalidation required |
| F-004 | connector timed out twice reading `pr-closure-request.yml` during audit | `DEGRADED_EVIDENCE` | non-blocking because current evidence workflow + failing test + remote log already prove RC-CI-001 | execution should inspect live trusted caller before edit; no architectural decision is pending |
| F-005 | downstream contract/node/backend/runtime jobs skipped on audit SHA | consequence of F-001 | material verification gap, not independent root | unblock routing first, then execute full exact-candidate verification |

There are **no unresolved live PR review threads** observed in the current review-thread inventory; the four CodeQL threads returned were resolved and outdated. This does not replace final analyzer runs.

---

## 5. Effective scope / affected cone

The PR is broad; scope is therefore authority-based rather than a blind 343-file sweep.

### 5.1 Product and governance truth

- `governance/product/contracts/administration-roles-approvals-audit.product-truth.json`
- any contract explicitly defining DSH administration roles/approvals/audit semantics

### 5.2 Identity authority cone

- `core/identity/backend/internal/identity/**` where role definitions, permission vocabulary, session/effective permission resolution, local operator convergence and access projections are owned
- `core/identity/database/migrations/**` relevant to employee DSH backfill, platform permission canonicalization and subsequent access-projection convergence
- Identity API/contracts used by DSH role mutation/vocabulary/readback

### 5.3 DSH governance cone

- `services/dsh/backend/internal/administration/**`
- `services/dsh/backend/internal/http/administration*`
- DSH admin request/intent/audit/reconciliation/fencing tests
- `services/dsh/database/migrations/dsh-1033*` through `dsh-1041*` where the administration state machine and non-owner projection retirement are material

### 5.4 Frontend/UX consumer cone

- `services/dsh/frontend/control-panel/administration/**`
- `services/dsh/frontend/shared/administration/**`
- session/control-panel permission helpers that gate the administration surfaces
- generated/runtime bindings consumed by those surfaces

### 5.5 Engineering control-plane cone

- `tools/scripts/ci-routing.test.mjs`
- `tools/scripts/detect-ci-context*`
- `.github/workflows/ci.yml`
- `.github/workflows/pr-closure-request.yml`
- `.github/workflows/pr-closure-dispatch.yml`
- `.github/workflows/pr-closure-evidence.yml`
- exact-candidate analyzers invoked from closure: CodeQL, SonarQube, remote security, Semgrep, OpenCodeReview, dependency review, Docker runtime hardening, lockfile integrity

### 5.6 Negative space

Execution must search the entire repository at the final candidate for reachable or authoritative remnants, including but not limited to:

- live `platform.read` use outside immutable migration/history/tests specifically asserting its retirement;
- any DSH role-definition registry/table/write path acting as live authority;
- any broad role-name/admin fallback authorization;
- hard-coded Control Panel administration permission vocabulary;
- `dsh_admin_partner_activations` or `dsh_admin_captain_credentials` live readers/writers/contracts/routes;
- replay/reset/edit path for `failed_terminal` intents;
- more than one replacement request creation path per superseded terminal request;
- stale `workflow_run`-required PR-closure assertions after the canonical control-plane update;
- duplicate privileged PR closure aggregators or candidate-controlled privileged checkout/execution.

---

## 6. Writers / readers / consumers inventory

### Canonical writers

1. **Identity role-definition writer** — Identity owner mutation API/domain path only.
2. **Identity permission data writer** — governed Identity migrations/APIs only.
3. **DSH maker/checker request writer** — DSH administration request path only.
4. **DSH canonical intent/reconciliation writer** — DSH administration intent/reconciler with fencing/version checks.
5. **Terminal replacement writer** — atomic supersession transaction only; old intent remains immutable.
6. **Trusted PR closure definition** — default-branch workflow definition; candidate supplies immutable identity, not privileged executable authority.

### Readers / derived consumers

- DSH role list/read → Identity role truth.
- DSH permission authorization → live Identity session/effective permissions.
- DSH role-request validation → Identity permission vocabulary.
- Control Panel role-definition UI → server-derived canonical vocabulary and request state.
- audit surfaces → immutable DSH governance records.
- CI/analyzers → GitHub PR/ref exact identity.

### Explicitly forbidden writers/authorities

- Control Panel direct Identity/DB mutation bypass.
- DSH-local role-definition truth.
- DSH-local mutable permission vocabulary truth.
- Partner/Workforce truth rewritten into DSH projections.
- terminal-failure replay/reset/edit.
- workflow test/CI config that makes an insecure or stale topology canonical merely because a test expects it.

---

## 7. Cleanup / deletion / retirement ledger

Cleanup is part of treatment. The following dispositions are mandatory:

| Artifact / reality | Current disposition | Execution obligation |
|---|---|---|
| DSH Partner activation projection | `RETIREMENT_IMPLEMENTED` by `dsh-1041` | prove migration applies with no hidden dependency; prove no live readers/writers remain |
| DSH captain credential projection | `RETIREMENT_IMPLEMENTED` by `dsh-1041` | same as above |
| live `platform.read` vocabulary/bindings/direct grants/projections | `FORWARD_MIGRATION_IMPLEMENTED` by `identity-032` | prove migration/readback and zero live legacy residue |
| immutable historical migrations containing legacy names | `RETAIN_REQUIRED` | do **not** rewrite/delete solely to make text search empty; they have necessary migration/audit purpose. Exclude only after proving they are immutable history, not live authority |
| local hard-coded administration vocabulary | `SUPERSEDED` in audited UI | prove negative space; delete any remaining live copy if found |
| broad DSH role-name/fallback auth | `SUPERSEDED` in audited HTTP guard | prove negative space; delete any remaining live path if found |
| stale `workflow_run` assertions in CI routing contract | `DELETE_OR_REWRITE_REQUIRED` | remove obsolete topology assertions and replace with canonical semantic/provenance invariants |
| stale docs/comments/helpers encoding old PR-closure topology | `DELETE_OR_REWRITE_IF_FOUND` | no compatibility note may preserve an alternative executable authority |
| obsolete tests whose sole purpose is asserting superseded truth | `DELETE_OR_REWRITE_REQUIRED` | tests follow canonical implementation truth, not vice versa |

**Rule:** a historical migration is not residue when it remains necessary to recreate/upgrade the database deterministically. A live old writer, reader, projection, compatibility alias, fallback, duplicate state machine or obsolete test authority is residue and must be removed.

---

## 8. Data migration / backfill obligations

1. Prove `identity-011_employee_dsh_permission_backfill.sql` remains idempotent and fail-closed for historical employee role/department authority.
2. Prove `identity-032_platform_permission_vocabulary_canonicalization.sql` executes after that history and removes all live `platform.read` vocabulary/bindings/direct grants/actor projections while establishing `platform:read`.
3. Prove actor-access projections are rebuilt from canonical owner data, not manually patched.
4. Prove DSH administration migrations apply in sequence on:
   - an empty database;
   - a representative seeded/pre-cutover dataset containing relevant requests/intents/projections.
5. Prove `dsh-1041` drops only non-owner projections after all consumers are migrated, with no `CASCADE` hiding unknown dependencies.
6. Any drift discovered during execution requires reconciliation from the current owner truth; no one-off row edit is closure.

---

## 9. State-machine invariants requiring exact verification

- maker and checker cannot be the same actor where product truth forbids it.
- `approved` is not committed until owner mutation succeeds, owner readback matches exactly, and DSH fenced finalization commits.
- stale version/fence cannot finalize a request.
- retryable failure remains retryable only under explicit bounded semantics.
- `failed_terminal` freezes old canonical intent payload.
- terminal failure cannot be replayed/reset/edited.
- supersession marks old request superseded and creates exactly one fresh pending replacement in one transaction.
- replacement resolves latest canonical owner version/vocabulary rather than copying stale owner truth blindly.
- idempotent rerun cannot create duplicate owner mutations, duplicate audit facts or duplicate replacement requests.

---

## 10. Tool/evidence applicability ledger

- **GitHub:** `EVIDENCE_AVAILABLE` and authoritative for repository files, PR identity, review threads and Actions evidence.
- **Remote CI log:** `EVIDENCE_AVAILABLE`; exact audit snapshot failure is reproducible and source-of-fix is localized.
- **SonarQube PR comment:** `EVIDENCE_AVAILABLE_BUT_STALE_FOR_FINAL`; must be regenerated on exact final candidate.
- **CodeQL review threads:** `HISTORICAL_RESOLVED_OUTDATED`; final CodeQL run still required.
- **Connector read of `pr-closure-request.yml`:** `DEGRADED_EVIDENCE` due repeated timeout; not a blocker because no material product/system decision depends on it in AUDIT_PREPARE.
- Other listed plugins/tools are not elevated above the repository/remote evidence source of truth. They may be used during execution only when their direct domain evidence materially reduces uncertainty; analyzer output is evidence, never architectural authority by itself.

---

## 11. Decision ledger

### Resolved decisions

1. **Who owns role/permission truth?** Identity.
2. **What does DSH own?** maker/checker governance, intent execution/fencing/audit for DSH administration requests, not a role registry.
3. **What happens after approved request reaches `failed_terminal`?** old intent/request truth is frozen; recovery atomically supersedes the old request and creates exactly one fresh pending replacement. No replay/reset/edit.
4. **How is legacy permission naming removed?** forward canonicalization migration plus projection rebuild and fail-closed assertions; do not rewrite historical migrations.
5. **Is the current CI failure evidence that the new `workflow_call` topology is wrong?** No. Proven root is verification-contract drift. Execution must verify the new topology’s security invariants and update the stale test, not reverse the architecture merely to make a test green.

### `DECISION_REQUIRED`

**None material.**

---

## 12. Readiness determination

`AUDIT_PREPARE` has reached handoff saturation because:

- the highest historical product/system root and canonical target are established;
- current live owners/writers/readers are identified;
- current material CI root is reproduced on exact audit SHA and its Source of Fix is known;
- data/backfill/cutover obligations are explicit;
- cleanup/deletion obligations are explicit, including negative space;
- historical versus live residue is distinguished;
- known remote findings are accounted for rather than silently discarded;
- no material Product/System decision remains unresolved;
- execution can proceed owner-first without re-deriving the architecture.

**HANDOFF STATUS: `READY_FOR_EXECUTION`**

This is **not** `CLOSED`. No closure claim is permitted until `02-VERIFICATION-CLOSURE.md` is satisfied on the exact final candidate after the last production/code/config/test cleanup write.