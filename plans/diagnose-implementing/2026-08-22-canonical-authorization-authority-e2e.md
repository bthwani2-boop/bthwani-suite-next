# AUDIT_PREPARE — Canonical Authorization Authority End-to-End Closure

**Status:** `READY_FOR_EXECUTION`
**Package:** `tools/prompting/bthwani-orchestrator/**` — `PACKAGE_REVISION: 9`
**Repository:** `bthwani2-boop/bthwani-suite-next`
**Branch:** `c`
**Audited target-system HEAD:** `0099b9d574693aadd5fe102d384921c56b252871`
**Audit mode:** Target System Read-Only; this plan file is the sole AUDIT_PREPARE write.
**Primary root:** `RC-AUTH-001`

## 1. Audit objective and governing method

This plan is the durable output of the `AUDIT_PREPARE` lifecycle. The audit followed the governing sequence from the pinned orchestrator package on the exact target HEAD:

`Project/System/Product Truth → Actor/Responsibility → Capability/Journey → State/Transition/Invariant → Ownership/Authority → Writers/Readers/Consumers → Contracts/Data → Services/Surfaces → Runtime/CI → Root Cause → Canonical Target → Migration/Cutover/Cleanup/Verification`.

The Project-Wide Canonical Frame was used to determine authority and blast radius. The audit did **not** perform a mechanical repository sweep. Deep inspection was restricted to nodes that could materially change the highest proven root, its treatment, migration, cutover, or closure evidence.

No implementation, refactor, schema mutation, application-code write, runtime mutation, rerun, merge, or target-system remediation was performed in this phase.

## 2. Canonical Product/System Truth

The governing product truth establishes the following non-negotiable ownership model:

- **Identity** owns identities, authentication, sessions, activation, roles, permissions, and trusted identity context.
- **DSH** owns operational workflows, including the governed administration/maker-checker workflow, but must not become an independent roles/permissions authority.
- **Control Panel** is a consumer/operator surface; it must reflect canonical server-side state rather than define a competing permission vocabulary.
- Administration requires **fine-grained, exact permissions** per operation, maker/checker separation, trusted server-derived operator context, and auditable state transitions.
- Broad-role/broad-permission bypass is not an acceptable final authorization path.
- One durable fact must have one authoritative owner. Projections/read models may exist only when they are derived, reconcilable, and non-authoritative.
- User-visible success may not precede successful canonical mutation of the owning system.

Relevant governing evidence includes:

- `governance/product/PRD.md`
- `governance/product/platform-model.yaml`
- `governance/product/contracts/identity-activation-sessions.product-truth.json`
- `governance/product/contracts/administration-roles-approvals-audit.product-truth.json`

## 3. Highest proven root cause

### RC-AUTH-001 — Authorization ownership and canonical cutover are incomplete across Identity ↔ DSH Administration

**Classification:** Material architectural/semantic/security root cause
**Confidence:** High / source-proven on exact audited HEAD
**Treatment order:** Owner first; migrate all writers/readers/consumers; canonical cutover; delete legacy paths.

The system declares Identity the sole roles/permissions owner, but the actual role-definition and enforcement lifecycle does not converge on that owner:

1. **Identity local-development permission authority contains a prohibited migration-era alias.**
   - `core/identity/backend/internal/identity/local_operator_permissions.go`
   - The file states that the list is the single local-development authority and that aliases/migration-era names do not belong there.
   - It nevertheless contains both `platform:read` and `platform.read` for the same DSH/control-panel boundary.

2. **Canonical Identity access-projection evidence uses `platform.read`.**
   - `core/identity/backend/internal/identity/canonical_access_projection_db_test.go`
   - The canonical projection/enforcer test uses `dsh / control-panel / platform.read / all` and validates it through grant/revoke behavior.
   - Therefore `platform.read` is the canonical current spelling; `platform:read` is stale/legacy vocabulary to be migrated and removed.

3. **DSH correctly depends on Identity for live RBAC/permission resolution, which makes the ownership inconsistency material rather than theoretical.**
   - `services/dsh/backend/internal/auth/client.go`
   - DSH resolves permissions through Identity internal endpoints and fails closed when Identity authority is unavailable.

4. **DSH Administration deliberately keeps broad legacy permissions executable at runtime.**
   - `services/dsh/backend/internal/administration/administration.go`
   - `AdministrationPermissionCandidates(action)` admits broad fallbacks such as `administration.manage`, `administration.approve`, and `administration.read` alongside exact operations.
   - This is a reachable compatibility authority and contradicts the exact least-privilege contract.

5. **The runtime authorization gate consumes those legacy candidates.**
   - `services/dsh/backend/internal/http/administration_permission.go`
   - `requireAdministrationPermission` resolves current Identity permissions, then authorizes if any exact or legacy candidate matches.
   - Broad legacy permissions are therefore active execution paths, not dead compatibility code.

6. **Role-definition approval creates an Identity role without its permission bindings, then stores the requested permissions/surfaces in DSH.**
   - `services/dsh/backend/internal/administration/role_requests.go`
   - Approval calls `identityClient.CreateRole(ctx, roleName, description)` and then upserts local `dsh_admin_roles` with `permissions` and `surfaces`.
   - The locally stored permission-bearing state is described as a projection, but its permission content was not established in Identity by this flow.

7. **The DSH→Identity role contract currently used by this journey cannot transmit the role permission definition.**
   - `services/dsh/backend/internal/auth/client.go`
   - `RbacRole` contains `id/name/description` only.
   - `CreateRole` posts `name/description` only to `/internal/rbac/roles`.
   - The role-definition journey therefore cannot complete the user-requested permission definition in the declared owner through its current contract.

8. **Role assignment grants only the Identity role name.**
   - `services/dsh/backend/internal/administration/approvals.go`
   - Approval loads a role name and invokes `identityClient.GrantRole(...)`.
   - No permission definition is synchronized before/within the grant.

9. **Live authorization reads permissions from Identity rather than from DSH's local role record.**
   - `services/dsh/backend/internal/http/administration_permission.go`
   - Result: `Control Panel intent → DSH maker/checker request → Identity role name → DSH-local permission definition → Identity runtime permission resolution` is semantically discontinuous.

10. **Control Panel embeds a local permission vocabulary.**
    - `services/dsh/frontend/control-panel/administration/RoleDefinitionApprovalQueue.tsx`
    - `AVAILABLE_PERMISSIONS` is hard-coded in the UI and defaults to `administration.read`.
    - This is another permission-vocabulary consumer that must migrate to an owner-backed canonical contract; the UI must not be an independent vocabulary authority.

### Root-cause statement

The system has completed part of the Identity ownership cutover (trusted context, permission resolution, role grants) but has **not completed the role-definition/permission-vocabulary cutover**. DSH Administration still persists permission-bearing role definitions, the DSH→Identity role contract omits the bindings required to make those definitions canonical, runtime enforcement admits broad legacy permissions, and the Control Panel embeds a local vocabulary. This produces parallel/non-converged authorization truth and prevents structural enforcement of exact least privilege.

## 4. Decision ledger

All material decisions needed to enter `EXECUTE_CLOSE` are derivable from existing canonical authority; no unresolved product decision remains.

| Question | Classification | Resolution |
|---|---|---|
| Which service owns roles/permissions? | `DERIVABLE_FACT` | Identity exclusively owns durable role definitions, permission vocabulary/bindings and actor-role grants. |
| Is `platform.read` or `platform:read` canonical? | `DERIVABLE_FACT` | `platform.read` is canonical; migrate/remove `platform:read`. |
| May broad `administration.manage/approve/read` remain as final authorization fallback? | `DERIVABLE_FACT` | No. Final runtime authorization must require the exact action only. |
| May DSH keep independent permission-bearing role truth? | `DERIVABLE_FACT` | No. DSH may keep maker/checker workflow state and a strictly derived/reconcilable projection only. |
| May Control Panel own a hard-coded independent permission vocabulary? | `DERIVABLE_FACT` | No. It must consume canonical owner-backed vocabulary/contract. |
| Can an approved role be reported active before Identity owns the complete role definition? | `DERIVABLE_FACT` | No. Canonical owner mutation/readback precedes active/success state. |

**Unresolved `DECISION_REQUIRED`: none.**

Implementation-level choices during execution must be resolved from the existing Identity schema/API and minimum-necessary-complexity rule; they must not create a new authority or compatibility lifecycle.

## 5. Effective Working Cone

The minimum complete affected cone is:

1. Governing Identity/Administration product truth and invariants.
2. Identity permission vocabulary, role model, role→permission bindings, permission resolution, actor-role grants, reconciliation and persistence.
3. DSH Administration role-definition request/review/approval workflow and its database state/projections.
4. DSH Administration role-assignment/rollback workflow.
5. DSH HTTP authorization enforcement and exact action mapping.
6. Control Panel Administration role-definition and approval UX/controllers.
7. DSH↔Identity internal API contracts and any generated bindings/contract tests that represent this boundary.
8. Existing role/permission/grant data, migrations, backfill and reconciliation.
9. Tests/security/runtime/CI/Sonar evidence required to prove the final candidate.

### Blast radius

- control-panel operators and admin journeys;
- custom role creation/approval;
- role assignment/revocation;
- all exact administration operations currently admitting broad candidates;
- local-development operator permissions;
- existing Identity role/permission/grant rows;
- existing `dsh_admin_roles` and related request/assignment records;
- sessions/permission readback where role changes alter effective permissions;
- generated/internal contract consumers of Identity RBAC.

## 6. Negative Space and boundaries checked

The audit intentionally did not widen into unrelated domains without evidence.

- Mobile `dsh-capabilities.tsx` adapters in Client/Partner/Captain primarily bind Expo/native capabilities into `@bthwani/dsh/mobile-capabilities`. Repetition exists, but no independent business/authorization truth was proven there. They are outside this working cone unless execution discovers an authorization consumer dependent on migrated vocabulary.
- Sampled WLT actor-finance boundary (`services/dsh/backend/internal/http/actor_finance_handlers.go`, `services/dsh/backend/internal/wlt/actor_finance_client.go`) remained a bounded DSH façade over WLT, with fail-closed configuration and idempotency/correlation requirements for mutation. No higher financial root was found that changes `RC-AUTH-001`.
- Other DSH domains are searched during execution only for consumers of the migrated permission vocabulary/legacy candidates; no repository-wide cleanup sweep is authorized by this plan.

Negative-space evidence is bounded evidence, not a declaration that every unrelated subsystem is globally clean.

## 7. Canonical target state and invariants

`EXECUTE_CLOSE` must converge the system to all of the following simultaneously:

1. Identity owns the complete durable role definition: identity/name/description plus exact permission bindings/scopes and any canonical surface applicability needed by the authorization model.
2. A single permission vocabulary is exposed from/derived from Identity authority; local aliases are not active authority.
3. Role-definition approval commits the **complete** canonical role definition to Identity idempotently before DSH may report it active/approved.
4. DSH owns maker/checker workflow records, correlation/audit and derived read projections only.
5. A retained DSH projection has no independent writer and can be reconstructed/reconciled from Identity; otherwise remove the permission-bearing projection fields/table.
6. Actor-role grants reference roles whose canonical permission bindings already exist in Identity.
7. Runtime enforcement checks exactly one canonical action for the requested operation. No broad fallback candidate may grant access.
8. `platform:read` is migrated out and unreachable; `platform.read` is the sole canonical spelling for that permission.
9. Broad legacy permissions are removed only after every legitimate consumer/role is migrated to explicit exact permissions.
10. Control Panel consumes the canonical vocabulary and presents truthful pending/approved/rejected/failure/recovery/readback states.
11. No UI success state implies effective permission activation until owner mutation and authoritative readback succeed.
12. Identity-unavailable, conflict, stale version and retry paths remain fail-closed and recoverable; they never silently fall back to local truth.
13. Maker/checker separation, trusted operator context, auditability, idempotency and correlation remain intact.

## 8. Root-first execution waves

### Wave 0 — Re-audit exact live candidate

Before the first target write:

- resolve current branch HEAD;
- re-read the governing Product Truth and affected owner/consumer files;
- inspect the current Identity role/permission schema and internal RBAC API;
- enumerate all writers/readers/consumers of the exact affected vocabulary and DSH role projection;
- reconcile any delta from audited HEAD before mutation.

If a higher material root appears, preempt this plan and treat the higher root first according to the orchestrator.

### Wave 1 — Complete Identity's canonical role-definition authority

Implement the minimum coherent Identity capability required to own a complete role definition, including exact permission bindings/scopes and authoritative readback. Prefer one atomic/idempotent owner mutation rather than a permanent multi-call partial lifecycle. If the existing Identity schema already has the required binding model, expose/reuse it rather than creating a second one.

Required properties:

- validation against canonical permission vocabulary;
- conflict/version semantics;
- idempotent retry behavior;
- transactional or equivalently fail-closed role+binding commit;
- canonical role read endpoint returning the effective definition needed by DSH/Control Panel;
- authorization and internal-service trust consistent with existing Identity boundaries.

### Wave 2 — Normalize permission vocabulary

Build an exact inventory of:

- `platform.read` and `platform:read` writers/readers/tests/data;
- broad `administration.manage`, `administration.approve`, `administration.read` grants and consumers;
- exact `administration.*` actions;
- existing role→permission bindings and direct permission grants.

Establish one explicit canonical action map. Do not map a broad permission to exact permissions by guess. Derive each role's intended exact actions from authoritative/current role definitions and actual governed journey requirements.

### Wave 3 — Data migration/backfill/reconciliation

Inventory and reconcile at least:

- Identity roles;
- Identity permission vocabulary;
- Identity role→permission links;
- actor-role grants/direct grants;
- DSH `dsh_admin_roles` permission/surface data;
- pending/approved role-definition requests;
- role-assignment/rollback records that reference affected roles.

For each role:

1. establish the exact intended canonical definition;
2. create/update canonical Identity bindings idempotently;
3. verify authoritative readback;
4. reconcile actor grants/effective permissions;
5. only then mark/rebuild DSH projection state as converged.

Any irreconcilable data conflict must fail closed and remain explicitly blocked; execution must not pick a winner silently.

### Wave 4 — Cut DSH role-definition workflow to the owner

Replace the incomplete `CreateRole(name, description)` journey with the complete canonical Identity mutation/readback. DSH approval status may flip to approved only after the canonical definition is committed and verified.

Preserve maker/checker, version checks, correlation and audit. Retries must not duplicate roles or bindings.

### Wave 5 — Migrate assignment and effective-permission consumers

Ensure all role assignment/revocation paths operate only on complete canonical roles. Verify current-session/effective-permission semantics after grants and revocations; if refresh/re-auth is required, make that explicit and truthful in API/UX behavior rather than relying on stale state.

### Wave 6 — Exact-permission enforcement cutover

After data and consumers are migrated:

- change administration authorization to require only the exact operation action;
- remove `AdministrationPermissionCandidates` compatibility behavior;
- remove reachable broad fallback authorization paths;
- prove broad permission alone can no longer authorize an exact operation.

### Wave 7 — Retire aliases and parallel projection truth

After all consumers are cut over:

- remove `platform:read` from local-development authority and any stored/reachable permission data;
- remove stale aliases/tests/fixtures;
- delete or strictly demote permission-bearing DSH role projection state;
- enforce no independent DSH writer for Identity-owned role definitions;
- retain only data with a necessary purpose, correct owner, real consumer and proven value.

No permanent compatibility layer or dual authority may remain at closure.

### Wave 8 — Control Panel UX/contract migration

Replace local hard-coded permission vocabulary with canonical owner-backed data/contract. The role-definition UX must expose the real semantics of the operation:

- clear entry/context and permission descriptions;
- validation before request submission;
- explicit maker/checker pending state;
- approval/rejection feedback;
- owner-backed authoritative role readback after approval;
- failure and retry path when Identity mutation is unavailable;
- stale/version-conflict handling and refresh;
- no optimistic active/granted state before authoritative success;
- accessible loading/error/empty/disabled/action states.

Generated clients/bindings/contracts must be updated from the canonical contract rather than hand-maintained in parallel.

### Wave 9 — Cleanup and structural simplification

Delete all superseded paths exposed by the cutover, including legacy candidates, aliases, dead helpers, stale tests/fixtures and redundant state. Do not preserve a path “for safety” unless it has a proven continuing canonical purpose.

## 9. Verification matrix on the Exact Final Candidate

Closure requires evidence after the **last** target change.

### Canonical owner / data

- create role definition with exact permissions → approve → Identity authoritative readback matches exactly;
- database constraints prevent orphan/duplicate role-permission state;
- migration is idempotent on a second run;
- Identity↔DSH projection reconciliation has zero unexplained divergence;
- no stale `platform:read` row/link/fixture is reachable;
- no broad fallback grants an operation implicitly.

### Authorization

- each exact administration action permits an actor with that exact permission;
- each exact action denies an actor with only a different/broad legacy permission;
- wrong surface is denied;
- missing/invalid trusted operator context is denied;
- Identity unavailable is fail-closed;
- self-review/self-grant prohibited paths remain denied;
- revoke removes effective authorization according to defined session semantics.

### Journey / UX

- request → pending → checker review → authoritative commit → readback → assignment → effective authorization works End-to-End;
- rejected request never creates owner state;
- canonical mutation failure leaves the request recoverable and does not show false approval/success;
- concurrent/stale-version review has explicit conflict behavior;
- retry is idempotent and does not duplicate owner state;
- loading/error/empty/success/recovery states are truthful and accessible.

### Contracts / generated consumers

- internal RBAC contract represents the full canonical role definition required by the journey;
- generated clients/bindings are regenerated and no stale manual duplicate contract remains;
- contract tests prove writer/reader agreement across Identity, DSH and Control Panel.

### Security / audit

- maker/checker invariants hold;
- least privilege is enforced with exact actions;
- audit/correlation identifies requester, reviewer, target, before/after state and owner mutation result without leaking secrets;
- no client-controlled trusted identity/permission context is accepted.

### Runtime / quality

On the final candidate, rerun the materially affected validation set and then the governed broader gates required by repository policy:

- targeted Identity and DSH tests;
- database/migration/reconciliation tests;
- contract/OpenAPI/generated binding verification;
- relevant TypeScript typecheck/build and Go build/tests;
- affected runtime/journey verification for administration;
- security/static checks;
- GitHub governed CI;
- SonarQube Cloud scan/Quality Gate.

## 10. Current exact-SHA CI evidence and blocker

For audited target SHA `0099b9d574693aadd5fe102d384921c56b252871`:

- Dependency Review: **success**
- BThwani Lockfile Integrity: **success**
- CodeQL: **success**
- BThwani Contextual CI: **success**
- SonarQube Cloud: **failure**

The Sonar job shows all prerequisite checkout/token/scope/Node/contract/coverage/Go/database steps succeeding; the failure is isolated to the `SonarQube Cloud scan` step. This is a material current verification blocker, but available evidence does not prove it is the architectural root above. `EXECUTE_CLOSE` must obtain the exact Sonar finding/failure evidence, remediate any material issues at their own highest root, and require a successful final-candidate Sonar gate before closure.

A green build, test, CI subset, Sonar rerun, or single UI path is never sufficient by itself to declare `CLOSED`.

## 11. Final re-audit / Negative Space before closure

After the last change:

1. re-enumerate every writer/reader/consumer of affected role/permission facts;
2. search for stale aliases, broad candidates, duplicate vocabularies and independent projection writers;
3. prove all old paths are deleted or `N/A_PROVEN`;
4. re-check adjacent Identity/DSH/Control Panel trust boundaries for regression;
5. re-check the bounded WLT financial boundary if shared auth/context code changed;
6. re-run exact final-candidate verification after cleanup;
7. only then evaluate closure.

## 12. Closure gate

`CLOSED` is permitted only when the exact final candidate proves all of the following:

- one canonical Identity authorization authority;
- complete role-definition ownership in Identity;
- exact least-privilege enforcement;
- all existing data/roles/grants migrated and reconciled;
- all consumers on canonical vocabulary/contract;
- no `platform:read` alias;
- no broad authorization fallback;
- no independent DSH permission truth;
- no local Control Panel permission authority;
- no missing consumer, partial migration, contract/data drift, orphan/broken state, workaround, permanent compatibility path, regression or known material finding in the Effective Scope;
- final governed CI/security/Sonar/runtime verification green after the last change;
- final Audit + Inspect + Diagnose + Analyze of the Affected Cone and Negative Space finds no material unresolved issue.

## 13. AUDIT_PREPARE stop state

All material decisions required to execute this treatment are resolved from existing authority. The target system remained read-only throughout audit. This document is the sole planned write and is the handoff artifact for `EXECUTE_CLOSE`.

**Stop state:** `READY_FOR_EXECUTION`
