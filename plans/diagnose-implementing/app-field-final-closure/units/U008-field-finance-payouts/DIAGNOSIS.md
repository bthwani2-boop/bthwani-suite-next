# U008 — field-finance-payouts

## Boundary
This unit is **only** the field actor's own wallet, ledger references, commissions and payout requests plus finance-operator lookup of that same field actor. It does not include client/partner/captain finance, settlements for other actors, captain COD custody, payment checkout or provider integration unrelated to a field payout. Current `representative-wallets.product-truth.json` is the controlling product source and remains in DISCOVERY.

## Current diagnosis
The existing app-field finance screen displays the field wallet balances, ledger entries, commissions and payout destination/request functionality. The shared field finance API uses authenticated DSH routes such as `/dsh/field/me/finance/*`; actor identity is meant to be derived from the bearer session rather than supplied by the mobile client. This is correct architecture: app-field and DSH do not own or calculate wallet truth, and WLT remains the sole financial owner.

Current Product Truth gives the field actor permission to read only their own wallet/commissions/ledger/payout requests and submit an own payout request. It forbids supplying beneficiary identity, selecting operator context, requesting more than available balance, mutating wallet balance or reading another field actor. Finance operators need `finance.read` and operator-context isolation. Because the capability is DISCOVERY, static existence is not enough for closure: WLT repository scoping, DSH proxy context propagation, payout idempotency/eligibility, no-store cache/privacy, WLT-unavailable behavior and independent financial-control evidence remain required.

COD must not be added here. The current store-captain custody Product Truth explicitly excludes app-field, and the field finance Product Truth does not grant field COD actions.

## Remaining changes
- Trace self-wallet/ledger/commission/payout routes from app-field through DSH BFF to WLT and verify actor/operator-context derivation.
- Prove cross-actor/cross-context lookups fail closed without disclosure.
- Prove displayed balances come directly from WLT and no settlement/commission arithmetic becomes local wallet truth.
- Prove payout amount/eligibility/idempotency and payload-drift behavior plus WLT-unavailable fail-closed/retry UX.
- Prove finance.read-scoped control-panel lookup for the same field actor and retain independent financial review as external evidence.

## Exit condition
The field employee can read only their own WLT-owned financial state and submit only authorized idempotent payout requests through DSH. An operator can read the same actor only with finance.read and current trusted operator context. No DSH/frontend balance mutation, direct mobile WLT call, COD expansion or cross-actor disclosure exists.
