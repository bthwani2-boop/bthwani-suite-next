# U007 — assignment-handoff-delivery-lifecycle

Captain dispatch must close from decision through custody, not at assignment creation. The assignment kill-switch is mandatory configuration and must fail closed when missing, malformed, nil or unsupported. Legal open/killed decisions must be explicit. Assignment creation/reassignment needs one active assignment per order, idempotency, actor-scoped acceptance/decline, required decline reason, expiry/late-response handling and concurrency safety.

Pickup is a bilateral custody transition. The store/partner confirmation and Captain completion must both occur before DSH advances to picked_up. Duplicate confirmations must be idempotent, request-key reuse with payload drift must conflict, shortage/mismatch must block, and reassignment must supersede the old Captain’s custody rights. Operator resolution is an audited DSH action and cannot mutate WLT just because custody has an exception.

Cross-surface proof matters: the Captain sees offers/current task, partner sees store handoff, client sees only authorized delivery progress, and operations sees canonical assignment/custody state. No surface can locally advance the order. This unit therefore combines the assignment and custody transaction boundaries while leaving location/PoD/support/finance to their own units.

## Closure boundary

DSH exclusively owns assignment, custody and delivery operational state; partner/client/control-panel read only their authorized projections. The unit remains open until all required checks are executed on the exact candidate, all known fixable Captain defects in this concern are removed, cleanup is complete, and later units have not invalidated its evidence.
