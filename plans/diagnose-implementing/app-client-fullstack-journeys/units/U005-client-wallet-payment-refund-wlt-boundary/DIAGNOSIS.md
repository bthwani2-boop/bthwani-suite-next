# U005 — client wallet, payment, Cash-In, refund and WLT boundary

The client financial journey must be planned from ownership, not from whichever screen displays an amount. Current Product Truth makes WLT the sole owner of wallet balances, ledger entries, payment allocation, Cash-In, refunds and reconciliation evidence. DSH may authenticate, authorize, orchestrate or proxy bounded references for a client journey, but neither DSH nor app-client may derive a second balance, append ledger truth or turn an operational status into financial success.

The first slice is read isolation. `MySpace`/client finance must resolve the authenticated actor and trusted operator context on the server side, read only that actor's WLT wallet/ledger through the governed DSH boundary, and fail closed when WLT is unavailable. No arbitrary client actor/context selector or settlement-derived balance is acceptable.

The second slice is money entering or funding an order. Cash-In/provider evidence and PaymentAllocation are WLT-owned. A client assertion, screenshot, callback-shaped payload or optimistic UI cannot credit funds. Duplicate provider events and client retries must converge to one financial effect; an ambiguous external result stays `unknown`/reconcilable until authoritative evidence exists. Order payment composition must conserve the governed total and not duplicate delivery fees or other components.

The third slice is refund/reversal. Refund routing follows the authoritative original source and idempotent WLT state machine. A timeout cannot trigger a second provider route for the same money, and an external-source refund cannot silently become internal wallet balance unless current approved Product Truth explicitly allows it. The WLT control-panel finance section is in scope only for investigation/reconciliation that changes this client's canonical financial readback; unrelated payout/treasury administration is excluded.

Closure requires WLT tests and financial-boundary guards, targeted DSH facade/outbox/order tests, WLT/provider runtime smokes and a negative/replay/unknown/refund exact-candidate scenario. UI equality with a number is not evidence of financial correctness.
