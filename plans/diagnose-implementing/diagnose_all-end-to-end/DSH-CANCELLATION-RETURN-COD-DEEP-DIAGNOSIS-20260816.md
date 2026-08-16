# DSH CANCELLATION + RETURN + COD — DEEP ROOT-CAUSE DIAGNOSIS

Status: `ACTIVE_DIAGNOSIS / NOT_CLOSED`
Branch: `b`
Evidence HEAD before this documentation write: `e0cbde2fdfb6b29497361a184d647b5bf74e212c`
Parent: `DSH-SYSTEMIC-DEEP-DIAGNOSIS-20260816.md`

## 1. Boundary law

This journey crosses three sovereign truths:

- DSH: order/delivery/custody operational state;
- Partner/Captain/Store: physical possession and proof;
- WLT: payment/refund/COD custody/ledger/reconciliation.

No cancellation/refund/COD transition may claim completion while physical custody or financial custody is unresolved.

## 2. Positive patterns to preserve

### DSH cancellation financial handoff

The governed cancellation path does not derive refund amount in DSH. It enqueues a WLT financial-closure event in the same DSH transaction as the order cancellation.

### BThwani return-to-store custody sequence

The BThwani captain return path has a meaningful custody chain:

`picked_up/arrived_customer -> returning_to_store -> return_arrived_store -> partner accepts custody -> returned_to_store`.

Partner acceptance updates delivery, assignment, order, status event and return evidence transactionally.

### WLT COD sovereignty

WLT has a strong COD custody model with:

- expected vs actual amount evidence;
- proof reference;
- collector actor/type checks;
- ledger posting;
- reconciliation case for differences;
- idempotent custody evidence;
- OperatorContext scoping.

These mechanics should be retained.

## 3. Proven root causes

### FIN-CUST-RC-01 — Cancellation custody guard ignores Partner Delivery possession

Status: `PROVEN`
Priority: `P0 physical + financial correctness`

Evidence:

`ExecuteCancellationAction` checks custody only through:

`dsh_assignments -> dsh_deliveries`

and blocks cancellation only when the BThwani delivery status is `picked_up`.

It does not inspect `dsh_partner_delivery_tasks`.

After the order is cancelled, the same function runs:

`UPDATE dsh_partner_delivery_tasks SET status='cancelled' ... WHERE status NOT IN ('completed','cancelled')`

Partner Delivery itself records pickup through `picked_up_at` while the task may remain in `assigned`, then progresses to `departed` / `arrived`.

Result:

An order can be financially cancelled while goods are already physically held by the store courier, and the Partner Delivery task is then overwritten to `cancelled` without a return/custody handoff.

Required target:

Create one fulfillment-agnostic `CustodyState` resolver:

- BThwani captain custody;
- Partner store courier custody;
- client pickup custody;
- return custody;
- store receipt.

Cancellation eligibility must use that resolver. Once custody has transferred out of store, cancellation requires a return/recovery saga before financial closure unless a separately governed exception policy explicitly proves otherwise.

---

### FIN-CUST-RC-02 — Required cancellation side effects ignore SQL failures and still mark completion

Status: `PROVEN`
Priority: `P0 false completion`

Evidence:

After updating the order and enqueuing WLT closure, `ExecuteCancellationAction` executes updates for:

- `dsh_assignments`;
- `dsh_deliveries`;
- `dsh_partner_delivery_tasks`;
- `dsh_pickup_sessions`;

using `tx.Exec(...)` without checking returned errors.

It then marks:

- cancellation case `status='cancelled'`;
- cancellation action `status='completed'`;

and commits.

Result:

Dependent operational work may remain active while the cancellation case claims completion.

Required remediation:

Every side effect required for cancellation truth must be checked and part of the same transaction, or represented as an explicit durable saga step that prevents terminal `cancelled/completed` until readback proves closure.

---

### FIN-CUST-RC-03 — Partner Delivery COD event uses compatibility API that misclassifies store courier as Captain

Status: `PROVEN`
Priority: `P0 financial identity`

Evidence chain:

1. Partner Delivery completion calls `enqueueWltDeliveryCompletedNotification(tx, orderID, current.StoreCourierID)`.
2. That helper calls compatibility `wltoutbox.Enqueue(... EventTypeDeliveryCompleted, orderID, courierID, partnerID, checkoutIntentID)`.
3. `wltoutbox.Enqueue` explicitly documents that the transitional delivery-completion shape is converted to a **captain collector**.
4. For `delivery_completed`, it stores `collector_type='captain'` and uses the passed ID as both captain/collector ID.
5. A newer canonical API already exists: `EnqueueDeliveryCompleted(collectorType, collectorID, ...)`, supporting `store_courier` independently.
6. Partner Delivery's `StoreCourierID` is itself currently ambiguous between DSH membership identity and Identity/Workforce Actor ID.

Result:

A Partner store courier COD delivery can enter WLT as if collected by a BThwani Captain, potentially using a membership ID as the financial custody actor ID.

Required remediation:

- Partner Delivery must resolve canonical membership -> actor identity before financial handoff;
- use `collector_type='store_courier'` with an explicit canonical collector Actor ID;
- retain membership ID separately as operational provenance if needed;
- remove old variadic `Enqueue` delivery-completion compatibility path after all callers migrate;
- WLT must validate collector type/identity against the source fulfillment evidence, not only trust a syntactically allowed string.

---

### FIN-CUST-RC-04 — Return case is marked `resolved` before physical return is complete

Status: `PROVEN SEMANTIC/OPERATIONS GAP`
Priority: `P1`

Evidence:

`ResolveDeliveryExceptionReturnToStore` changes the delivery/order to `returning_to_store` but also immediately sets the delivery exception:

- `status='resolved'`;
- `resolved_at=NOW()`;
- `resolution_action='return_to_store'`;
- `return_started_at=NOW()`.

Physical custody is still outstanding until:

- Captain arrival (`return_arrived_at`);
- Partner receipt (`returned_at`, `return_accepted_by_actor_id`).

Some specialized reads compensate by including resolved return records with `returned_at IS NULL`, but generic operator exception listings group them as resolved rather than active custody work.

Required target:

Use explicit lifecycle states such as:

`RETURN_REQUESTED -> RETURNING -> ARRIVED_STORE -> RECEIPT_CONFIRMED -> RESOLVED`

or separate the exception decision from a linked `ReturnCase` aggregate. `resolved` must mean no remaining operational obligation.

---

### FIN-CUST-RC-05 — Return completion and financial cancellation are separate obligations without a single composite closure state

Status: `PROVEN DESIGN SEPARATION / END-TO-END CLOSURE HOLD`
Priority: `P1`

Evidence:

Migration `dsh-093` explicitly states that returning an order does **not** create a refund; financial cancellation remains governed through DSH cancellation -> WLT closure.

After Partner accepts return custody, Order becomes `returned_to_store`. Operator cancellation eligibility includes `StatusReturnedStore`, so a later governed cancellation can initiate WLT financial closure.

This separation is valid in principle, but there is no single composite state in the inspected return aggregate proving both:

- physical custody returned;
- financial closure completed/no-action.

Required closure proof still pending:

- Control Panel workflow must make the post-return financial obligation explicit;
- automation/manual ownership must be unambiguous;
- returned orders with pending financial closure must be visible and non-terminal from operations perspective;
- no returned order may become forgotten without financial disposition.

Keep this item `OPEN` until all consumers/workers/operator surfaces are traced.

## 4. COD identity target

Canonical COD custody evidence should carry separate fields:

- `fulfillmentType`;
- `collectorMembershipId` where applicable;
- `collectorActorId`;
- `collectorType` (`captain | store_courier | partner_store`);
- `partnerId/storeId/branchId` scope;
- order/payment-session identity;
- expected amount derived by WLT;
- actual amount captured by evidence;
- proof reference;
- custody event idempotency/correlation.

No generic `captainId` compatibility projection should remain an authority for Partner Delivery cash.

## 5. Required restructuring sequence

1. Build fulfillment-agnostic custody model/readback.
2. Make cancellation guard consume canonical custody truth.
3. Replace ignored dependent updates with checked atomic/saga steps.
4. Correct Partner Delivery membership/actor identity first.
5. Migrate Partner Delivery COD handoff to `EnqueueDeliveryCompleted(store_courier, actorId, ...)`.
6. Remove legacy variadic delivery-completion outbox API.
7. Introduce explicit ReturnCase lifecycle through partner receipt.
8. Bind return physical closure to financial-disposition obligation.
9. Prove WLT refund/COD ledger/reconciliation outcomes back into DSH operator-visible closure state.
10. Add end-to-end tests for every fulfillment mode.

## 6. Mandatory closure tests

- BThwani captain picked-up order cannot cancel before return custody;
- Partner store courier picked-up/departed/arrived order cannot cancel before return custody;
- client-pickup custody cannot be financially cancelled inconsistently;
- failure cancelling any dependent task prevents terminal cancellation state or creates visible saga failure;
- Partner Delivery COD creates `store_courier`, never `captain`, custody identity;
- membership ID cannot be accepted as Actor ID by WLT custody authorization;
- COD amount mismatch creates reconciliation rather than false balanced completion;
- returned-to-store order cannot disappear while financial closure is pending;
- refund/no-action result is durably projected to cancellation/order surfaces;
- retries are idempotent across DSH and WLT.

## 7. Verdict

WLT COD accounting primitives are comparatively strong, and BThwani return receipt has real custody confirmation. The highest gaps are at the **cross-fulfillment boundary**: cancellation only understands BThwani custody, Partner Delivery sends the wrong collector identity semantics to WLT, and cancellation can mark completion while required dependent updates fail silently.
