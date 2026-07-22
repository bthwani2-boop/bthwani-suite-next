# JRN-031 — Administration, Roles, Approvals, Rollback, Audit, and Diagnostics

## Closure state

- **Implementation state:** `IMPLEMENTED_AND_VERIFIED_READY_FOR_INDEPENDENT_APPROVAL`
- **Product truth state:** `PENDING_INDEPENDENT_APPROVAL`
- **Repository:** `bthwani2-boop/bthwani-suite-next`
- **Implementation branch:** `sambassam`
- **Verified immutable snapshot:** `4e5b74e1c46286ee52a6a0fd8bfede3676284d56`
- **Full remote verification run:** `29920877185`
- **Verification job:** `88925767497`
- **Verification conclusion:** `success`
- **Merge state:** not merged into `master`
- **Deployment state:** not deployed

This evidence records code and automated verification closure. It does not replace the independent Product, Quality, Application Security, Release, and Production approvals required by the JRN-031 product truth.

## Mandatory-command execution boundary

The journey was executed remotely on `sambassam` under:

- `governance/prompting/unified-operational-journey-execution-command.md`
- `governance/27_FULLSTACK_MULTI_SURFACE_JOURNEY_REGISTRY.md`
- `governance/product/contracts/jrn-031-administration-roles-approvals-audit.product-truth.json`
- `governance/approvals/jrn-031-independent-approvals.json`

No local repository state was used as execution evidence.

## Functional-slice closure map

| Slice | Implemented closure | Primary evidence |
|---|---|---|
| FS-01 | Live administration role inventory | `services/dsh/backend/internal/administration/administration.go` |
| FS-02 | Governed role-definition request with mandatory reason | `role_definition_approvals.go` |
| FS-03 | Independent checker approval/rejection for role definitions | `ReviewRoleDefinition` and HTTP review route |
| FS-04 | Operation-level administration permission allowlist | `governedAdministrationPermissions` |
| FS-05 | Explicit multi-surface role metadata with mandatory `control-panel` boundary | migration `dsh-131` and role normalization |
| FS-06 | Live approved staff-role assignment projection | `ListStaff` and shared administration brain |
| FS-07 | Governed staff-role assignment request | `RequestStaffRoleAssignment` |
| FS-08 | Governed staff-role revocation request | `RequestStaffRoleRevocation` |
| FS-09 | Maker–Checker enforcement with maker, beneficiary, and checker separation | role-assignment and role-definition review transactions |
| FS-10 | Partner activation/blocking delegated to the sovereign partner lifecycle | `AdministrationDashboardScreen.tsx` → `/dsh/partners` owner surface |
| FS-11 | Captain creation, vehicle, documents, and license review delegated to Workforce | `AdministrationDashboardScreen.tsx` → `/dsh/hr` owner surface |
| FS-12 | Sensitive mutations require reasons, review notes, versions, and conflict protection | requests, reviews, SQL checks, and OpenAPI schemas |
| FS-13 | Append-only administration audit at the database boundary | `dsh_admin_audit_append_only_guard` trigger |
| FS-14 | Allowlisted audit metadata and privacy-minimized partner/captain projections | `writeAdminAudit`, `redactAuditDetail`, minimized DTOs |
| FS-15 | Rollback request appends an inverse decision without deleting source history | `RequestDecisionRollback` |
| FS-16 | Rollback checker differs from rollback maker, beneficiary, and original checker | `ReviewDecisionRollback` |
| FS-17 | Aggregate diagnostics expose operational counts without PII, credentials, documents, tokens, or secrets | `GetAdministrationDiagnostics` and diagnostics panel |
| FS-18 | Canonical contract, product truth, route tests, governance guards, focused typecheck, and PostgreSQL invariant test | contract/test/workflow files listed below |

## Security and authorization closure

- Identity authenticates the actor; it does not grant a broad administration bypass.
- The broad `operator` role bypass was removed from the administration permission gate.
- Exact Identity permissions must target service `dsh` and surface `control-panel`, or access must come from an approved active DSH administration role assignment.
- Approved roles must contain the `control-panel` surface at both application and PostgreSQL boundaries.
- Role-definition, role-assignment, and rollback queues require their corresponding checker permissions.
- The permission gate does not propagate phone PII.
- Partner review notes and captain license numbers remain inside their sovereign lifecycle owners.
- Raw reasons and review notes are not written into administration audit detail.
- Audit UPDATE and DELETE operations are rejected unless an explicit audit-maintenance context is enabled.

## Full-stack ownership evidence

### Database

- `services/dsh/database/migrations/dsh-131_jrn031_governed_administration_closure.sql`
- `services/dsh/database/tests/jrn-031-administration-governance.sql`

### Backend/domain

- `services/dsh/backend/internal/administration/administration.go`
- `services/dsh/backend/internal/administration/role_definition_approvals.go`
- `services/dsh/backend/internal/administration/role_assignment_approvals.go`
- `services/dsh/backend/internal/administration/rollback_and_diagnostics.go`
- `services/dsh/backend/internal/http/administration_permission.go`
- `services/dsh/backend/internal/http/administration_approval_routes.go`
- `services/dsh/backend/internal/http/administration_rollback_diagnostics.go`
- `services/dsh/backend/internal/http/journey_031_routes_test.go`

### Shared frontend brain and control-panel surface

- `services/dsh/frontend/shared/administration/administration.types.ts`
- `services/dsh/frontend/shared/administration/administration.api.ts`
- `services/dsh/frontend/shared/administration/use-administration-controller.tsx`
- `services/dsh/frontend/control-panel/administration/AdministrationDashboardScreen.tsx`
- `services/dsh/frontend/control-panel/administration/RoleDefinitionApprovalQueue.tsx`
- `services/dsh/frontend/control-panel/administration/RoleAssignmentApprovalQueue.tsx`
- `services/dsh/frontend/control-panel/administration/DecisionRollbackQueue.tsx`
- `services/dsh/frontend/control-panel/administration/AdministrationDiagnosticsPanel.tsx`
- `services/dsh/frontend/control-panel/administration/GovernedAdministrationScreen.tsx`

### Canonical contract and governance

- `services/dsh/contracts/dsh.administration.openapi.yaml`
- `governance/product/contracts/jrn-031-administration-roles-approvals-audit.product-truth.json`
- `governance/approvals/jrn-031-independent-approvals.json`
- `services/dsh/tests/jrn-031-administration-maker-checker.test.mjs`
- `services/dsh/tests/jrn-031-administration-governance.test.mjs`
- `services/dsh/tsconfig.jrn-031.json`
- `.github/workflows/ci.yml`

## Verified gates

The full remote verification run `29920877185` completed with `success` and passed every required gate on snapshot `4e5b74e1c46286ee52a6a0fd8bfede3676284d56`:

1. Checkout of the exact branch snapshot.
2. Go, pnpm, and Node setup.
3. Frozen workspace dependency installation.
4. Isolated PostgreSQL 16 startup.
5. Ordered administration migration execution.
6. PostgreSQL role-scope, rollback-lifecycle, and append-only-audit invariants.
7. Targeted administration and protected HTTP Go tests.
8. Build of the affected Go administration and HTTP owners.
9. Existing Maker–Checker guard and the expanded JRN-031 governance guard.
10. Focused TypeScript ownership-graph typecheck.
11. Canonical administration OpenAPI parsing.
12. JRN-031 product-truth validation.
13. Final all-gates verdict.

Temporary diagnostic and one-shot verification workflows were removed after the successful verdict. Permanent verification is consolidated in `.github/workflows/ci.yml`.

## Independent approvals still required

The following approvals remain external to code execution and cannot be self-issued by the implementation agent:

- Product Manager
- Product Owner
- Independent Quality
- Application Security
- Release / Production

Until those approvals are recorded, the correct governance state remains `PENDING_INDEPENDENT_APPROVAL`, despite the implementation and automated verification closure recorded here.
