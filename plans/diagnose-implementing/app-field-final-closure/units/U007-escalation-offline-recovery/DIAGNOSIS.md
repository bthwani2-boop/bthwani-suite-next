# U007 — escalation-offline-recovery

## Boundary
This unit covers field-originated escalations and the durability/recovery of field mutations while connectivity or authorization changes. Control-panel is included for operations/support resolution. app-partner is included only when the partner is an authorized reader of a field-originated onboarding/readiness blocker. app-client and app-captain are not part of this unit.

## Current diagnosis
The current escalation screen can submit severity/category/description, exposes queued state for offline submission and preserves governed failure presentation. Work queue lists open escalations. This proves creation and basic field readback, but it does not prove a complete employee-visible lifecycle after the operator requests more information, resolves/rejects/closes the issue, or requires additional evidence. Execution must first inspect current authoritative escalation states and only implement the field actions/readback actually defined by those contracts.

Offline infrastructure is useful but incomplete for final closure. `FieldOfflineOperation` is scoped by actor and installation and carries operation ID, idempotency key, correlation ID, created time, attempts, next retry and pending/retrying/synced/failed_permanent state. Native runtime replaces the default adapter with SecureStore. Corrupt data is preserved. However, the current record has no expiry, queue schema version, cancelled or unknown-result state. Failure handling is retry-count driven rather than clearly classifying authorization/permanent business failures versus transient network/5xx failures. There is no explicit server-result lookup contract in the queue model, and only four operation types are represented.

The critical security case is offline revocation: a mutation queued while authorized must not execute later if the field actor loses assignment/session/readiness. The queue also must not report success if the request committed but the response was lost. Media/evidence that a queued mutation references must remain valid or produce an actionable permanent state, not silently disappear.

## Remaining changes
- Reconcile escalation states/actions with current contracts and expose only field-authorized follow-up/readback.
- Add deterministic offline schema/version/expiry and cancellation semantics where Product Truth requires them.
- Classify retryable versus permanent errors by governed code/status; authorization/revocation and validation failures must not retry blindly.
- Add unknown-result reconciliation/result lookup for commit-response uncertainty where mutation APIs require it.
- Prove queued work revalidates assignment/session/readiness at server commit time and fails safely after revocation.
- Prove referenced evidence/media survives or fails explicitly across offline/restart/reconnect.

## Exit condition
Field-originated escalations must converge after operator decisions, and every supported offline operation must end in an explainable committed, pending/retrying, cancelled/expired, permanently failed or reconciled state without duplicate effects or unauthorized replay. Process death/restart and network loss before/after commit are mandatory manual cases.
