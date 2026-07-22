# JRN-040 — Platform Change Sets Implementation Evidence

## Remote pin

```yaml
repository_mode: REMOTE_ONLY
repository: bthwani2-boop/bthwani-suite-next
target_branch: sambassam
implementation_commit: 46ca809f3048829be431c7073108752f4a059e9c
verification_workflow: .github/workflows/jrn-040-platform-change-sets-verification.yml
latest_immutable_workflow_run:
  id: 29930001440
  number: 175
  source_commit: 5631802cab45340aa224f48782d25585714d66db
  observed_status: queued
final_decision: IMPLEMENTED_AWAITING_REMOTE_RUNNER_AND_INDEPENDENT_APPROVALS
```

The source commit above contains the strict service boundary and closure guard. Run 175 is an earlier immutable proof commit that contains the executable implementation, strict service routing, strict tests, database migrations, UI, contract, and verification workflow; the final guard-only commit is a descendant and requires its own immutable run when GitHub Actions accepts it.

## Slice-by-slice execution log

| Slice | Registry capability | Implementation evidence | Verification evidence | State |
|---|---|---|---|---|
| JRN-040-S01 | List requests and create a multi-item draft | Governed list/read/create repository; 50-item cap; duplicate-target, scope, JSON and size validation; multi-item control-panel draft builder | Repository integration test; unsafe-input unit tests; control-panel typecheck gate | IMPLEMENTED |
| JRN-040-S02 | Request details, diff and expected impact | Readback includes reason, impact, rollback plan, actors, timestamps, before/proposed values, expected/validated/applied revisions and validation snapshots; details panel exposes the complete diff | Dedicated OpenAPI/client and binding guard | IMPLEMENTED |
| JRN-040-S03 | Validate request | Serializable validation captures full target state and revision, locks target identity and reserves it against another active request | Conflict, stale snapshot and integration tests | IMPLEMENTED |
| JRN-040-S04 | Submit request | Submission requires a still-current validation snapshot and rejects stale targets | Stale-snapshot negative test | IMPLEMENTED |
| JRN-040-S05 | Approve or reject with maker-checker | Proposer cannot approve or reject the same request; rejection requires a bounded reason | Maker-checker repository tests; stable HTTP error-code test; UI hides self-review actions | IMPLEMENTED |
| JRN-040-S06 | Apply with preconditions | Atomic serializable apply, advisory/row locks, optimistic revisions, all-or-nothing multi-item write and redacted audit | Apply integration test; targeted Go suite | IMPLEMENTED |
| JRN-040-S07 | Roll back to a safe version | Mandatory bounded reason; applied-revision check; restores variable owner/type/classification/status/value and feature owner/status/enabled/targeting; removes newly created targets | Apply-and-rollback integration test and metadata-restoration proof | IMPLEMENTED |
| JRN-040-S08 | Audit, duplicate prevention and conflict handling | Append-only transition audit with values redacted; duplicate target rejection; active target reservation; repeated apply/rollback blocked by state machine; application and database sensitive-value boundaries | Contract guard, direct database trigger test, HTTP error-code test | IMPLEMENTED |

## Changed paths

### Product truth and contracts

- `governance/product/contracts/jrn-040-platform-change-sets.product-truth.json`
- `core/platform-control/contracts/jrn-040-platform-change-sets.openapi.yaml`
- `core/platform-control/clients/generated/jrn-040-platform-change-sets-api.ts`

### Database

- `core/platform-control/database/migrations/platform-005_jrn040_change_set_validation.sql`
- `core/platform-control/database/migrations/platform-006_jrn040_sensitive_change_boundary.sql`

### Backend

- `core/platform-control/backend/internal/platformcontrol/jrn040_change_set_read_create.go`
- `core/platform-control/backend/internal/platformcontrol/jrn040_change_set_workflow.go`
- `core/platform-control/backend/internal/platformcontrol/jrn040_change_set_apply_rollback.go`
- `core/platform-control/backend/internal/platformcontrol/jrn040_strict_boundary.go`
- `core/platform-control/backend/internal/platformcontrol/model.go`
- `core/platform-control/backend/internal/platformcontrol/service.go`
- `core/platform-control/backend/internal/http/workflow_handlers.go`

### Frontend shared brain and control panel

- `services/dsh/frontend/shared/platform/platform-control.api.ts`
- `services/dsh/frontend/shared/platform/use-platform-change-workflow-controller.tsx`
- `services/dsh/frontend/control-panel/platform/PlatformChangeWorkflowPanel.tsx`

### Tests and gates

- `core/platform-control/backend/internal/platformcontrol/repository_integration_test.go`
- `core/platform-control/backend/internal/platformcontrol/jrn040_change_set_governance_test.go`
- `core/platform-control/backend/internal/platformcontrol/jrn040_database_sensitive_guard_test.go`
- `core/platform-control/backend/internal/platformcontrol/jrn040_strict_boundary_test.go`
- `core/platform-control/backend/internal/http/jrn040_workflow_handlers_test.go`
- `tools/guards/jrn-040-platform-change-sets-gate.mjs`
- `.github/workflows/jrn-040-platform-change-sets-verification.yml`

## Verification matrix

The immutable workflow applies every platform-control migration to PostgreSQL 16, checks Go formatting without rewriting source, runs targeted backend and HTTP tests, typechecks the generated platform-control contract and control-panel binding, executes the JRN-040 closure guard, and runs `git diff --check`.

At evidence creation time, GitHub Actions had accepted run 175 but had not assigned a runner. No failing test step existed; the job status was `queued`. Therefore this document does not convert a queue state into a passing result.

## Security and governance boundaries

- Proposed values with secret-shaped fields are rejected before persistence.
- Sensitive, confidential and restricted classifications are rejected at the strict service boundary.
- A PostgreSQL trigger independently rejects sensitive classifications and existing sensitive variable targets, protecting against internal callers that bypass the HTTP/service path.
- Audit payloads contain target metadata and state transitions, not proposed or previous values.
- No PR, merge, tag, release, production deployment, commercial SaaS activation or force push was performed.

## Remaining mandatory gates

1. A JRN-040 immutable GitHub Actions run must complete successfully on a commit containing the final closure guard.
2. Independent approvals required by Product Truth remain external and unrecorded: product manager, product owner, independent quality, application security, and release/production.
3. Until both conditions are satisfied, the journey decision remains `IMPLEMENTED_AWAITING_REMOTE_RUNNER_AND_INDEPENDENT_APPROVALS`, not `CLOSED_WITH_EVIDENCE`.
