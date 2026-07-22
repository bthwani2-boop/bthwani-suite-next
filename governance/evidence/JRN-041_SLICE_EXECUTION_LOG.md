# JRN-041 Sequential Slice Execution Log

Repository mode: `REMOTE_ONLY`  
Repository: `bthwani2-boop/bthwani-suite-next`  
Target branch: `sambassam`  
Journey: `JRN-041 — الإطلاق التدريجي والتراجع`  
Execution command: `governance/prompting/unified-operational-journey-execution-command.md`

## Journey boundary

The operating surface is the control panel. `core/platform-control` remains the sole owner of rollout state, feature-flag mutation, health gates, audit and baseline restoration. Client, partner, captain and field apps are controlled-effect consumers only and do not own rollout operations or local rollout truth.

## Slice sequence

| Slice | Result | Permanent evidence |
|---|---|---|
| FS-01 Product truth | Implemented | `governance/product/contracts/jrn-041-progressive-rollout-rollback.product-truth.json` defines actors, outcome, failure states, acceptance and protected approvals. |
| FS-02 Actor/RBAC | Implemented | Read uses `platform:read`; mutations use `platform:rollouts:manage`; maker-checker and applied-change checks remain in Platform Control. |
| FS-03 Surface placement | Implemented | Control-panel rollout workspace is required; target apps are explicitly excluded as operating surfaces with controlled-effect rationale. |
| FS-04 State machine | Implemented | Explicit `running`, `paused`, `completed`, `aborted`, `rolled_back`, `failed`; resume is distinct from advance. |
| FS-05 Flow contract | Implemented | Create → advance → pause → blocked advance → blocked unhealthy resume → healthy resume → advance → complete → rollback is covered by the PostgreSQL integration test. |
| FS-06 API contract | Implemented | `core/platform-control/contracts/jrn-041-progressive-rollout.openapi.yaml` covers create/read/advance/pause/resume/abort/rollback/recovery. |
| FS-07 Client binding | Implemented | Shared DSH platform API and controller bind `resumePlatformRollout` and `fetchPlatformRolloutRecovery`; no local success truth. |
| FS-08 Backend orchestration | Implemented | Platform Control validates target scope, health-gates advance/resume, records health blocks, and derives recovery guidance. |
| FS-09 Database invariants | Implemented | `platform-004_jrn041_rollout_governance.sql` enforces governed scope, health-gate shape, lifecycle timestamps and paused-advance defense in depth. |
| FS-10 Migration path | Implemented | Additive PostgreSQL migration preserves historical rows with `NOT VALID` checks while enforcing new/changed records; permanent CI applies all migrations on PostgreSQL 16. |
| FS-11 Lifecycle correctness | Implemented | Pause and resume preserve percentage/step/revision; abort/rollback restore captured baseline with revision checks; stale overwrite remains blocked. |
| FS-12 Data/readback | Implemented | Control panel displays server-provided target scope, percentage, step, revision and recovery read model. |
| FS-13 Audit/correlation | Implemented | `rollout_resumed` and `rollout_health_gate_blocked` retain actor, roles, correlation, persisted percentage and gate evidence. |
| FS-14 Security/boundaries | Implemented | Platform Control ownership is declared in its service manifest; DSH remains an authorized surface only; arbitrary target keys are rejected. |
| FS-15 Negative paths | Implemented | Empty/unknown target scope, invalid steps/gates, paused advance, unhealthy resume, illegal transitions and revision conflicts are rejected. |
| FS-16 Runtime verification | Gate installed | `.github/workflows/jrn-041-progressive-rollout-verification.yml` runs Go, TypeScript, static guard, migrations and the full PostgreSQL journey on the exact commit. |
| FS-17 Observability/recovery | Implemented | Canonical recovery endpoint, control-panel recovery card, health-block audit event and `JRN-041_PROGRESSIVE_ROLLOUT_RECOVERY.md`. |
| FS-18 Closure/evidence | Ready for independent review | Code/data/contract/CI implementation is committed remotely. Product, QA, security, visual/accessibility, release and production evidence remain independent protected gates. |

## Key negative proofs

- `advance` returns `ErrInvalidTransition` unless status is exactly `running`.
- PostgreSQL rejects percentage/step/revision change from `paused` unless the transition is legal baseline restoration.
- `resume` is health-gated and changes only `paused -> running`; it clears active `paused_at` without changing percentage or flag revision.
- Failed health gates create `rollout_health_gate_blocked`; rollout and feature-flag state remain unchanged.
- Target scope rejects `{}`, unknown keys, empty strings and empty arrays.
- Abort and rollback restore the captured feature-flag baseline and reject a newer external revision.

## Checks installed

- `go test ./internal/platformcontrol ./internal/http`
- `go test ./internal/platformcontrol -run TestGovernedProgressiveRolloutJourney -count=1 -v` against PostgreSQL 16
- `pnpm exec tsc -p services/dsh/tsconfig.jrn-041.json --noEmit`
- `node tools/guards/jrn-041-progressive-rollout-gate.mjs`
- ordered application of `core/platform-control/database/migrations/*.sql`

## Decision boundary

Engineering implementation state: `READY_FOR_REVIEW` after same-commit CI success.  
Release state: `NOT_RELEASED`.  
Production state: `NOT_DEPLOYED`.  
Commercial SaaS activation: `NOT_ACTIVATED`.  
Protected independent evidence: `PENDING`.
