# U006 — captain-finance-wlt

## Objective
Close Captain financial readback so COD custody and personal commission lifecycle come only from WLT-backed canonical truth, with no Captain-side financial mutation.

## Truth owner
WLT exclusively owns COD financial liability, commission policy/calculation/lifecycle, wallet/ledger/adjustments; DSH may proxy bounded authorized references only.

## Diagnosis
This unit exists because the Captain path cannot be closed from a single screen. It must trace the authoritative write/read owner through shared adapters, contracts, backend state, persistence and only the downstream surfaces that are directly affected. The package deliberately distinguishes **absence of candidate-bound proof** from a proven code defect: where current source already implements a behavior, execution first verifies it against the applicable Product Truth and changes code only when the evidence reveals a mismatch. Where a concrete mismatch is already visible—most notably Captain commission readback—the task names that gap directly.

The unit must preserve trusted actor context, idempotency/correlation, legal state transitions, refresh/restart readback and strict tenant/actor isolation. UI state, local storage, derived planning files and historical evidence cannot become authoritative operational or financial truth. Any implementation that changes a canonical contract must migrate every Captain-specific consumer and rerun invalidated evidence on the same final candidate.

## Reconciled branch movement

Before finalization, `abbas` advanced to `519577aae52e9e565aaa3d955726f89dc3982659` with WLT daily finance close, settlement batch/export and manual transfer evidence changes. These changes do not implement Captain commission readback and must be preserved as current WLT operator-owned settlement infrastructure. Captain work must integrate without bypassing its freeze/evidence/reconciliation controls.

## Planned work
- Preserve and prove Captain COD custody truth: Current Captain finance bridge reads WLT-owned COD through a governed DSH Captain proxy; this needs actor isolation, state/idempotency and reconciliation evidence. Target: Captain sees only own canonical COD liability and status; retries/readbacks are consistent and finance operator can reconcile authoritative WLT records.
- Implement missing Captain commission lifecycle readback: Product Truth requires app-captain to list own pending/confirmed/settled/rejected/reversed commissions and adjustment reasons, but WltDshCaptainBridge explicitly reports aggregate Captain earnings unavailable and current settlement reference is partner-oriented. Target: Captain finance renders own commission lifecycle and adjustment reasons from WLT; 'settled' is a commission state, not a frontend-calculated payout or unauthorized Captain settlement action.

## Boundaries
Affected surfaces: app-captain, control-panel. Dependencies: U004. Journeys/capabilities: SETTLEMENTS_COMMISSIONS, Captain COD custody. Unrelated sections remain out of scope unless a new direct dependency is proven and `COVERAGE.json` is updated before implementation.

## Closure rule
Do not mark this unit done from static inspection alone when persisted, cross-surface, security, runtime or financial behavior is involved. Execute the linked verification checks after the final relevant write and record exact resulting SHA/evidence in `RESULT.json`.
