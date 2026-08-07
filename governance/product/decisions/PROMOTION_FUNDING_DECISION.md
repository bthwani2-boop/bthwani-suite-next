# Promotion Funding Decision

Status: ACTIVE_CANONICAL
Authority domain: `promotion_funding`

This decision defines durable ownership and accounting semantics for promotions, discounts and their funding source. It refines product policy and the DSH/WLT financial boundary.

## Outcome

Every applied promotion has one canonical commercial definition, explicit eligibility and funding attribution, a point-in-time order/checkout snapshot where required, and a WLT-owned financial effect. No surface or DSH component may invent a parallel discount/funding ledger.

## Ownership

- DSH/product policy owns promotion definition, eligibility, scope, merchandising and the operational/commercial snapshot attached to checkout/order.
- The funding source is an explicit commercial attribute of the governed promotion/policy; it is never inferred from UI location or a hardcoded percentage.
- WLT owns authoritative financial mutation, ledger entries, settlement, reimbursement, commission impact, refunds and reconciliation caused by the promotion.
- Surfaces display eligible offers and readback only; they do not calculate authoritative funded amounts.

## Rules

1. A promotion must have stable identity/version, validity window, eligibility conditions, applicable catalog/store/business scope and explicit funding model.
2. Eligibility is evaluated by the canonical server owner against current inputs; client-supplied totals or discount amounts are untrusted.
3. Checkout/order stores the immutable promotion/commercial snapshot required to reproduce the accepted transaction without re-reading mutable current policy.
4. The snapshot distinguishes customer discount from who funds that discount and from any independent commission/delivery/settlement policy.
5. WLT receives governed operational/commercial references and computes/posts the authoritative financial consequences idempotently.
6. Refund/cancellation/partial-fulfillment handling follows current WLT financial policy using the original snapshot and actual operational outcome.
7. Replays/timeouts/unknown results cannot double-apply discount funding or reimbursement.
8. Partner-funded, platform-funded or other supported funding types remain independent of partner subscription/commission model unless Product Truth explicitly links them.
9. A promotion that becomes inactive later does not retroactively alter a completed order snapshot.
10. Audit/readback must make the funding basis explainable to authorized operators without exposing restricted financial/partner data to unauthorized actors.

## Forbidden

- hardcoded discount/funding truth in mobile/web surfaces;
- DSH writing ledger/reimbursement/settlement truth;
- caller-supplied authoritative discount/funding amount;
- applying a promotion outside its canonical scope/window/eligibility;
- recomputing historical completed orders from the current mutable promotion definition;
- silently treating a provider/WLT timeout as financial success;
- duplicate funding effects on retry.

## Evidence boundary

Static/product checks can prove ownership and contract shape. Claims about applied amounts, settlement, refund, reimbursement or no-duplication require WLT/finance and runtime/database evidence on the exact candidate. This decision does not grant finance, release or production approval.
