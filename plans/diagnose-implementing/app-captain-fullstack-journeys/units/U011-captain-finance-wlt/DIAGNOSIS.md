# U011 — captain-finance-wlt

Captain finance is intentionally isolated in its own unit because financial correctness cannot be inferred from delivery success. The primary Captain finance screen already composes WLT financial eligibility, wallet, COD custody, commissions, payout destination/request and incidents, but two material gaps remain: a reachable Captain Cash-In/top-up entry has not been proven, and an older WltDshCaptainBridge retains stale earnings/settlement-unavailable presentation that may conflict with newer components.

WLT already contains the authoritative top-up engine with server-derived captain_topup purpose, authorize/capture through CashInRail and transactional capture finalization plus wallet credit. Ambiguous provider outcomes enter governed unknown/reconciliation state. If the Captain UI lacks a reachable top-up controller, implementation must add only a bounded WLT-backed consumer, never a new DSH/frontend payment engine.

COD is the highest monetary consistency risk. DSH still exposes Captain collect/remit semantics while current WLT Product Truth describes Captain-funded reserve/release/finalize and explicitly forbids a second remittance liability for the same order value. Coexistence is legal only when model selection is explicit and mutually exclusive per order/effect. The unit must prove concurrency, cancellation, retry, payout destination immutability, FULL_AVAILABLE/SPECIFIED validation, provider unknown-result handling and ledger/audit/reconciliation consistency before financial closure.

## Closure boundary

WLT exclusively owns Captain monetary truth, financial eligibility, ledger effects, Cash-In, COD financial effects, earnings/commissions, payout and reconciliation. The unit remains open until all required checks are executed on the exact candidate, all known fixable Captain defects in this concern are removed, cleanup is complete, and later units have not invalidated its evidence.
