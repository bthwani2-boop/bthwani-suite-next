# U008 — field-finance-payouts

## Current-BB diagnosis

Historical U008 PASS was largely static/delegated and bound to a different branch context, so it does not close current `BB`. Current shared WLT `field-finance` code already contains API/controller/payout-attempt logic, including persisted prepared/unknown payout attempts intended for reconciliation. Do not build a second finance subsystem. Re-prove server-resolved actor/worker/store isolation, wallet/ledger/commission readback, payout destination/request rules, idempotency, unknown-result reconciliation, retry/restart and control-panel mutation separation. A reproduced defect must be repaired in the owning WLT/DSH boundary. Shared financial contracts require actual-consumer regression verification, but unrelated settlement/accounting work stays out. Client-supplied actor scope must never override server identity and DSH/mobile must not become financial truth.
