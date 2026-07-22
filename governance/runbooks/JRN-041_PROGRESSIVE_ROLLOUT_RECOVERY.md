# JRN-041 Progressive Rollout Recovery

## Ownership

`core/platform-control` is the only owner of rollout state, feature-flag mutation, health gating, audit and captured-baseline restoration. DSH control-panel code is an authorized operating surface only. Target apps consume the resulting effective flag and never persist rollout truth.

Required mutation permission: `platform:rollouts:manage` on the `control-panel` surface. Recovery and rollout readback require `platform:read`.

## Governed target scope

Every rollout must select at least one explicit nonempty selector and may use only:

- `audience` or `audienceIds`
- `city` or `regions`
- `surface` or `surfaces`

Example:

```json
{
  "surfaces": ["app-client"],
  "regions": ["sanaa"]
}
```

Empty objects, unknown keys, empty strings and empty arrays are rejected by the service and database constraint.

## Legal lifecycle

1. Create a rollout only from an `applied` change set that contains the same disabled `feature_flag`. The rollout manager must be independent from proposer, approver and applier.
2. Advance only while status is `running`. The service re-reads aggregate health, required services and optional latency threshold immediately before changing the feature flag.
3. Pause changes only `running -> paused`. Percentage, step index and flag revision remain unchanged.
4. Resume changes only `paused -> running`. It is health-gated and does not change percentage, step index or flag revision.
5. Abort is legal from `running` or `paused` and restores the immutable captured baseline using the recorded flag revision.
6. Rollback is legal from `completed` and restores the captured baseline using the recorded flag revision.
7. A newer external flag revision causes a conflict; it must never be overwritten by force.

## Incident procedure

### Suspected risk during a running rollout

1. Call `POST /platform/v1/rollouts/{id}/pause`.
2. Verify canonical readback reports `paused` and the same percentage/revision.
3. Read `GET /platform/v1/rollouts/{id}/recovery`.
4. Inspect aggregate and required-service health plus correlated audit events.
5. Choose one path:
   - Risk cleared and health is `OPERATIONAL`: call `resume`, verify unchanged percentage/revision, then advance separately when authorized.
   - Risk confirmed or unresolved: call `abort`, verify the feature flag equals `baselineEnabled` and `baselineTargeting`.

### Risk discovered after completion

1. Read the recovery endpoint and the approved change-set rollback plan.
2. Confirm the incident is caused by the completed rollout.
3. Call `POST /platform/v1/rollouts/{id}/rollback`.
4. Verify status `rolled_back`, the flag revision incremented once, and effective runtime configuration matches the captured baseline.
5. Verify affected target surfaces read the restored canonical state.

### Failed health gate

A failed advance or resume returns `PLATFORM_ROLLOUT_HEALTH_GATE_FAILED`/conflict semantics and writes `rollout_health_gate_blocked` to `platform_audit_events` with actor, roles, correlation ID, persisted percentage and health-gate configuration. No rollout or flag state changes.

## Recovery read model

`GET /platform/v1/rollouts/{id}/recovery` returns:

- persisted rollout and change-set identifiers
- status, percentage and current health state
- legal action booleans
- recommended action
- independently approved rollback plan
- deterministic support steps
- required mutation permission

The control panel displays this server-derived guide. It does not calculate legal transitions locally.

## Verification

Permanent CI: `.github/workflows/jrn-041-progressive-rollout-verification.yml`

The same-commit gate runs:

- Platform Control Go unit/HTTP compile tests
- targeted rollout governance tests
- focused DSH control-panel TypeScript typecheck
- product/contract/boundary/binding guard
- all Platform Control migrations on PostgreSQL 16
- the complete maker-checker → rollout → health block → resume → completion → rollback integration journey

Production deployment, visual acceptance, security approval, QA approval, product-owner acceptance and release acceptance remain independent protected evidence and cannot be self-issued by implementation commits.
