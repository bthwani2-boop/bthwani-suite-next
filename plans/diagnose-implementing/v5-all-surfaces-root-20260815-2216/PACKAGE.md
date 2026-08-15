# Bthwani Task Package

SCHEMA: BTHWANI_PACKAGE_V5
TASK_ID: v5-all-surfaces-root-20260815-2216
TARGET: كل الاسطح
MODE: EXECUTE_END_TO_END
INTEGRATION_BRANCH: A
TASK_BRANCH: task/v5-all-surfaces-root-20260815-2216
BASE_SHA: babc873b6b2e712efbe082e37d1bcec977fc3d8d
LATEST_RECONCILED_SHA: babc873b6b2e712efbe082e37d1bcec977fc3d8d
ROOT: كل الاسطح
INTEGRATION_OWNER: bthwani2-boop
RUNTIME_REQUIRED: YES

## Operational Coverage

| Node | Kind | Parent | Claim | Status | Evidence |
|---|---|---|---|---|---|
| OP-001 | Product outcome | ROOT | A checkout that crosses the WLT handoff must create one immutable commercial order truth shared by every consuming surface. | PROVEN | EVD-ROOT,EVD-ADVERSARIAL |
| OP-002 | Client checkout | OP-001 | app-client hands an OCC-locked server-priced cart snapshot to DSH checkout and WLT. | PROVEN | EVD-ROOT |
| OP-003 | Financial handoff | OP-001 | WLT receives the frozen line inputs and cart snapshot hash while DSH remains owner of commercial cart and order truth. | PROVEN | EVD-ROOT |
| OP-004 | Order creation | OP-001 | DSH must create order header and lines from the same frozen checkout truth, not from mutable live cart state. | PROVEN | EVD-ROOT,EVD-ADVERSARIAL |
| OP-005 | Client order read | OP-004 | app-client reads the created immutable order truth. | PROVEN | EVD-ROOT |
| OP-006 | Partner fulfillment | OP-004 | app-partner consumes the same immutable order items and lifecycle truth. | PROVEN | EVD-ROOT |
| OP-007 | Operations oversight | OP-004 | control-panel consumes the same order truth under operator scoping and redaction. | PROVEN | EVD-ROOT |
| OP-008 | Downstream fulfillment | OP-004 | dispatch and captain-side execution depend on the order aggregate created from that truth. | PROVEN | EVD-ROOT |

## Root-Cause Graph

| RC | Root cause | Operational parent | Evidence | Depends on | Consumers | Blast / unlock | Priority | Deepening | Disposition |
|---|---|---|---|---|---|---|---|---|---|
| RC-001 | Checkout freezes pricing totals and WLT line inputs only in memory, but does not durably persist the checkout item snapshot; CreateOrderTruth later re-reads mutable dsh_cart_items, creating a dual commercial truth boundary between frozen checkout pricing and order lines. | OP-004 | EVD-ROOT,EVD-NEGATIVE-SPACE,EVD-ADVERSARIAL | NONE | CON-CLIENT,CON-PARTNER,CON-OPS,CON-DISPATCH | A post-checkout cart mutation can permanently bind order totals and pricing hash from one snapshot to item lines from another; fixing the canonical boundary closes all downstream surfaces at once. | 1 | DEEPENED_ENOUGH_TO_RANK | READY |

## Ledger

| Type | ID | RC | Relation / claim | Status | Evidence |
|---|---|---|---|---|---|
| FINDING | FND-001 | RC-001 | Order creation reads product_id, product_name, unit_price_minor and quantity from live dsh_cart_items after checkout and WLT handoff. | PROMOTED | EVD-ROOT |
| LOWER_LAYER | LLR-001 | RC-001 | The cart remains state=active until order creation and UpsertItem authorizes active-cart mutation, so the stale-read window is real. | PROMOTED | EVD-NEGATIVE-SPACE |
| LOWER_LAYER | LLR-002 | RC-001 | dsh-904 makes the copied order-item commercial snapshot immutable, turning a mismatched capture into durable contradictory truth. | PROMOTED | EVD-ADVERSARIAL |
| LOWER_LAYER | LLR-003 | NONE | Order header totals, currency and pricing_snapshot_hash are already copied from checkout by dsh-062; header pricing is not a second root. | DISPOSITIONED | EVD-ADVERSARIAL |
| DECISION | DEC-001 | RC-001 | Persist one canonical checkout item snapshot in the checkout transaction and make order creation consume it exclusively; do not freeze the cart as a workaround or retain a live-cart fallback. | RESOLVED | EVD-ROOT,EVD-ADVERSARIAL |
| DEPENDENCY | DEP-001 | RC-001 | WLT remains unchanged: it already consumes the frozen checkout lines and hash; DSH must persist the same commercial source before the handoff. | RESOLVED | EVD-ROOT |
| CONSUMER | CON-CLIENT | RC-001 | app-client order truth must remain consistent with the checkout it submitted. | DISPOSITIONED | EVD-ROOT |
| CONSUMER | CON-PARTNER | RC-001 | app-partner fulfillment must see lines matching the authoritative order pricing snapshot. | DISPOSITIONED | EVD-ROOT |
| CONSUMER | CON-OPS | RC-001 | control-panel order views must consume the same canonical lines. | DISPOSITIONED | EVD-ROOT |
| CONSUMER | CON-DISPATCH | RC-001 | downstream dispatch and captain execution must originate from a commercially coherent order aggregate. | DISPOSITIONED | EVD-ROOT |
| CLEANUP | CLN-001 | RC-001 | Remove the live dsh_cart_items read from CreateOrderTruth and leave no fallback or parallel source after snapshot persistence is live. | OPEN | EVD-VERIFICATION-PLAN |

## Frontier

| Work | RC | Depends on | Blocks / unlocks | Conflict | Owner | Parallel | State | Evidence |
|---|---|---|---|---|---|---|---|---|
| WRK-001 | RC-001 | NONE | Persist the immutable checkout item snapshot atomically with Checkout Intent creation and bind it to the frozen cart snapshot. | DSH checkout schema and checkout transaction | bthwani2-boop | NO | READY | EVD-ROOT,EVD-VERIFICATION-PLAN |
| WRK-002 | RC-001 | WRK-001 | Make CreateOrderTruth consume only the checkout snapshot and reject missing or inconsistent snapshot evidence. | DSH order creation | bthwani2-boop | NO | WAITING | EVD-ROOT,EVD-VERIFICATION-PLAN |
| WRK-003 | RC-001 | WRK-001,WRK-002 | Prove mutation-after-checkout cannot change order lines, verify consumer/isolation invariants, and remove the obsolete live-cart source. | DSH DB tests and cross-surface contract consumers | bthwani2-boop | NO | WAITING | EVD-VERIFICATION-PLAN |

## Evidence

| Evidence | Claim | Check / source | Candidate | Environment | Result | Limits / invalidates on |
|---|---|---|---|---|---|---|
| EVD-ROOT | Frozen checkout line inputs and pricing are produced before WLT handoff, while CreateOrderTruth later reads order lines from live cart state. | services/dsh/backend/internal/cart/checkout_snapshot_scoped.go; services/dsh/backend/internal/http/checkout.go; services/dsh/backend/internal/orders/order_truth.go; governance/product/contracts/order-creation-truth.product-truth.json | BASE_SHA | GitHub branch A pinned at BASE_SHA | PASS | Invalidated by a newer integration delta that changes checkout snapshot persistence or order line source before implementation. |
| EVD-NEGATIVE-SPACE | No governing cart closure prevents the mutation window: the cart stays active through checkout and cart mutation is authorized for active carts until order creation marks it checked_out. | services/dsh/backend/internal/cart/cart.go; services/dsh/database/migrations/dsh-096_cart_slice_closure.sql; services/dsh/database/migrations/dsh-999_runtime_schema_alignment.sql; services/dsh/backend/internal/orders/order_truth.go | BASE_SHA | GitHub branch A pinned at BASE_SHA | PASS | Invalidated if a newer migration or runtime path introduces an authoritative checkout snapshot or closes the cart lifecycle before handoff. |
| EVD-ADVERSARIAL | Header pricing is already copied from checkout by dsh-062 and order items become immutable by dsh-904, proving the defect is specifically the missing canonical line snapshot and not missing header pricing. | services/dsh/database/migrations/dsh-062_checkout_coupon_pricing_engine.sql; services/dsh/database/migrations/dsh-904_order_item_currency_snapshot_closure.sql | BASE_SHA | GitHub branch A pinned at BASE_SHA | PASS | Invalidated by a newer migration that changes either order pricing derivation or order-item creation semantics. |
| EVD-VERIFICATION-PLAN | Closure requires DB proof that a cart changed after Checkout Intent creation cannot alter order lines, that order-line subtotal matches frozen checkout subtotal, that missing snapshots fail closed, and that client/store/operator isolation remains intact. | Targeted checkout and order DB integration tests plus migration manifest gate and existing order isolation assertions | BASE_SHA | Planned task-branch verification | PASS | Plan must be replaced by executed TASK_HEAD evidence before integration readiness. |

## Closure

- Integration head: SELF
- Final candidate: SELF
- Verification: pending TASK_HEAD targeted DB and governance checks
- Runtime/product evidence: pending runtime-required checkout-to-order proof
- Cleanup: pending removal of live-cart order line source
- Governance: pending final V5 and migration-manifest gates
- Final adversarial: pending post-implementation independent challenge
