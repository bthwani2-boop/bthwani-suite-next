# DSH/WLT residual diagnosis report

```yaml
repository: bthwani2-boop/bthwani-suite-next
branch: smsm
pinned_start_sha: 8465596195e5b3e8a57aff2ef11cdf149dcc287d
mode: DIAGNOSIS_AND_PLAN_ONLY
diagnosis_scope: residual_gaps_only
operational_code_changed: false
finding_count: 10
work_item_count: 9
verification_count: 10
decision: FIX_REQUIRED
```

## Executive verdict

The branch cannot be classified as ready for journey execution or final closure at the pinned commit. This package does not repeat earlier implementation. It records only residual gaps directly proven in the current remote state and converts each gap into an ordered work item and same-commit verification.

The most urgent residual defect is executable: DSH can mark a staff-role assignment or rollback approved while applying no canonical authorization change. The active OpenAPI contract describes the inverse behavior. In the same administration area, DSH also creates active role definitions locally, which establishes a parallel authorization source beside Identity.

## Proven residual findings

| ID | Severity | Residual gap | Required work |
|---|---|---|---|
| FND-0001 | P0 | Approval and rollback change request status without applying canonical authorization | TASK-0002 |
| FND-0002 | P0 | DSH activates role definitions in a local authority | TASK-0001 |
| FND-0003 | P1 | Administration routes return synthetic, status-incompatible, and weakly classified responses | TASK-0003 |
| FND-0004 | P0 | Contract registry strategy is invalid and authority files are outside mandatory typecheck | TASK-0004 |
| FND-0005 | P0 | DSH readiness sources contradict each other and have no current evidence SHA | TASK-0005 |
| FND-0006 | P1 | Active contract shards lack complete generated-client ownership proof | TASK-0004 |
| FND-0007 | P0 | WLT financial persistence, clients, mutation, reconciliation, and journey proof remain incomplete | TASK-0006 |
| FND-0008 | P1 | Generic runtime aliases can collect partial-stack evidence | TASK-0007 |
| FND-0009 | P0 | FOUNDATION-00 and J001 through J107 remain unclosed | TASK-0008 |
| FND-0010 | P0 | `dsh-991_eradicate_store_team_members.sql` is absent from the canonical migration manifest | TASK-0009 |

## Root-cause synthesis

### Authority convergence failure

Role definition, role assignment, approval status, and effective authorization are not one transaction or one authority. DSH currently contains local state that can diverge from Identity or Workforce. The correction must not copy the same model into more tables. It must establish one canonical writer and treat DSH as a governed facade, request ledger, audit boundary, and projection consumer.

### Verification boundary failure

The DSH TypeScript project compiles frontend and client paths but excludes the contract registry and root service truth files. This allows invalid contract strategy values and readiness contradictions to evade the service typecheck. The correction is to compile the full authority surface and add machine checks for registry coverage and projection consistency.

### Database migration convergence failure

GitHub Actions validated the database contract but failed before applying the DSH chain because `dsh-991_eradicate_store_team_members.sql` is not registered in the canonical migration manifest. Migration files and manifest entries must be created and reviewed as one atomic change; drift detection must remain fail-closed.

### Evidence convergence failure

DSH and WLT manifests deliberately remain fail-closed, but their evidence chains are incomplete. DSH also contains contradictory hardcoded readiness values. WLT explicitly records database, generated-client, mutation, reconciliation, and journey evidence as incomplete. All readiness fields must be derived from one same-commit evidence ledger.

### Operational closure failure

The canonical journey package requires 107 journeys with 24 slices each, manual acceptance, runtime readback, and same-commit evidence. The first and final journeys remain open and not assessed. Isolated source completion cannot be promoted into journey closure.

## Boundaries

This package is a derived support artifact. It does not authorize merge, release, production mutation, policy changes, or bypasses. It is safe to delete after durable implementation decisions and evidence have moved to their canonical owners.

## Required implementation order

1. Establish Identity as the single role-definition authority.
2. Bind role assignment and rollback approval to canonical mutation and readback.
3. Correct administration contract and measured runtime semantics.
4. Compile and converge DSH contract registry and client ownership.
5. Register and verify the DSH `dsh-991` migration through the canonical runner.
6. Generate all DSH readiness projections from one same-commit evidence ledger.
7. Close WLT financial evidence while production mutation remains disabled.
8. Make DSH/WLT runtime evidence dependency-complete and unambiguous.
9. Close FOUNDATION-00 and journeys J001 through J107 sequentially.

No later item may inherit success from an earlier commit. Each item requires a logical commit, push, re-pin, checks after the last write, and evidence on the same commit.
