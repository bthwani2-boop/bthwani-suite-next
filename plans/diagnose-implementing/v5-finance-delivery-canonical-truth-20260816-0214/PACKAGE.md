# Bthwani Task Package

SCHEMA: BTHWANI_PACKAGE_V5
TASK_ID: v5-finance-delivery-canonical-truth-20260816-0214
TARGET: كل ما يتعلق بالمالية والمحافظ والدفع وPaymentAllocation وCOD وضمان/رصيد كابتن بثواني وكابتن المتجر والتوصيل والعقوبات والأهلية والأسطول والنطاقات والتسوية والاسترداد وكل المستهلكين والأسطح والبيانات والعقود المرتبطة بها
MODE: PREPARE_ONLY
INTEGRATION_BRANCH: A
TASK_BRANCH: task/v5-finance-delivery-canonical-truth-20260816-0214
BASE_SHA: bdbcb811ab2a0fe0cc4db6e4947d5ef741d2c5c7
LATEST_RECONCILED_SHA: bdbcb811ab2a0fe0cc4db6e4947d5ef741d2c5c7
ROOT: Canonical operational and financial truth across BTHWANI delivery and partner/store delivery
INTEGRATION_OWNER: UNASSIGNED
RUNTIME_REQUIRED: YES

> This package is diagnosis/preparation authority only. Historical plans, old packages, comments, and prior branch evidence are Derived Support and must be re-proven against the current candidate before execution or closure.
>
> User policy: any previously asked decision not explicitly overridden by the user adopts the recommendation. New contradictions discovered by diagnosis remain explicit `DECISION_REQUIRED`; they must never be guessed.

## Operational Coverage

| Node | Kind | Parent | Claim | Status | Evidence |
|---|---|---|---|---|---|
| OP-ROOT | Product outcome | - | Bthwani must have one canonical source of truth for every durable fact/decision; no parallel financial or operational authority may remain. | INTENDED_AUTHORIZED | user decision; `services/wlt/WLT_EXTERNAL_WALLET_SWITCH_ARCHITECTURE.md` |
| OP-AUTHORITY-MAP | Authority | OP-ROOT | Identity owns authentication/principal; Workforce owns workforce lifecycle/non-financial readiness/scopes; DSH owns commerce/order/fleet/dispatch; WLT owns all authoritative money. | DESIRED_RESOLVED | orchestrator + user decisions + WLT architecture |
| OP-CHECKOUT | Journey | OP-ROOT | Customer checkout has exactly three canonical customer payment choices: COD, internal Bthwani wallet, Mixed wallet+COD. External official wallets are Cash-In rails, not a fourth order-payment semantic. | DESIRED_RESOLVED | user clarification; `services/dsh/backend/internal/checkout/checkout.go` currently has a fourth `official_wallet` method |
| OP-PAYMENT-ALLOCATION | Financial object | OP-CHECKOUT | Every order must have one server-owned PaymentAllocation splitting product/delivery/discount/subsidy/internal-wallet/external-rail/cash components and preserving conservation. | INTENDED_AUTHORIZED | WLT architecture section PaymentAllocation; current DSH pricing snapshot is not the complete allocation |
| OP-CUSTOMER-TOPUP | Journey | OP-ROOT | Customer and captain top-up use official-wallet Cash-In evidence -> WLT ledger -> one internal wallet. | INTENDED_AUTHORIZED | user decision + WLT architecture |
| OP-CAPTAIN-WALLET | Financial object | OP-ROOT | BTHWANI captain has one WLT wallet; no separate visible guarantee wallet. | INTENDED_AUTHORIZED | user decision + WLT architecture |
| OP-CAPTAIN-OPENING-FUNDING | Policy | OP-CAPTAIN-WALLET | Platform sovereign Finance/Platform control configures the required opening/minimum financial floor for BTHWANI captain; top-up is via governed WLT Cash-In. | INTENDED_AUTHORIZED | user decision |
| OP-CAPTAIN-WITHDRAWAL | Journey | OP-CAPTAIN-WALLET | Captain may request settlement only for amount above required protected floor after active COD exposure/holds/debts are accounted. No withdrawal may make protected collateral unsafe. | INTENDED_AUTHORIZED | user decision + WLT settlement architecture |
| OP-BTHWANI-COD | Journey | OP-CHECKOUT | For BTHWANI captain, only canonical cash component of COD/Mixed creates order-specific exposure reservation. On successful delivery the reserved exposure becomes final WLT wallet debit; prepaid components do not consume COD exposure. | INTENDED_AUTHORIZED | user clarification + WLT architecture; current reservation implementation requires reconciliation |
| OP-BTHWANI-COD-FAILURE | Recovery | OP-BTHWANI-COD | Cancellation/reassignment/rejection releases/retargets reservation exactly once; no delivery may be operationally closed while the required WLT financial transition is unknown/failed without durable recovery/reconciliation. | DESIRED_RESOLVED | current `delivery_proof_completion.go` ignores FinalizeCodReservation error |
| OP-PARTNER-DELIVERY | Journey | OP-CHECKOUT | Partner/store delivery exposes the same three customer payment choices but financial responsibility/proceeds are scoped to the store/partner, not BTHWANI captain finance. | INTENDED_AUTHORIZED | user decision |
| OP-PARTNER-COURIER | Actor | OP-PARTNER-DELIVERY | Store courier is store-scoped and mutually exclusive with BTHWANI primary dispatch affiliation. Partner may have multiple store memberships where product rules allow. | INTENDED_AUTHORIZED | user decision + DSH fleet migrations/product truth |
| OP-PARTNER-SALARIED | Compensation | OP-PARTNER-COURIER | If courier is a salaried store employee, order delivery fee belongs to store and courier has no per-order financial entitlement in Bthwani. Salary/payroll remains store responsibility. | INTENDED_AUTHORIZED | user decision |
| OP-PARTNER-COMPENSATION | Compensation | OP-PARTNER-COURIER | If store elects per-delivery courier compensation, exact policy/settlement owner must be canonical and must not create ad-hoc client-entered amounts. | DECISION_REQUIRED | user stated store may choose salary or delivery-fee model; exact platform-managed settlement semantics not yet fully specified |
| OP-PARTNER-COLLATERAL | Financial policy | OP-PARTNER-COURIER | Store may optionally require its courier to satisfy store-owned collateral/risk policy; this must never reuse or contaminate BTHWANI platform captain collateral. | DECISION_REQUIRED | user states optional and linked to store; implementation ownership/mechanics need explicit cut |
| OP-PARTNER-RESPONSIBILITY | Responsibility | OP-PARTNER-COURIER | Platform provides app/account/security boundary; employment, payroll, store-specific safety and operational responsibility remain with store. Platform security/identity cannot be bypassed. | INTENDED_AUTHORIZED | user clarification |
| OP-PENALTY-CATALOG | Financial policy | OP-ROOT | Penalty catalog/value is configured in sovereign Platform control panel but authoritative monetary policy/version is WLT-owned. Operations selects a penalty type; does not enter the amount. | INTENDED_AUTHORIZED | user decision; current Workforce/WLT accept amount input |
| OP-PENALTY-POSTING | Financial transition | OP-PENALTY-CATALOG | WLT derives penalty amount from pinned policy version + operational incident facts and posts immutable ledger transaction; reversal is compensating transaction. | DESIRED_RESOLVED | current WLT penalty posting uses canonical ledger, but amount is caller supplied |
| OP-REFUND | Journey | OP-CHECKOUT | Refund follows funding lineage: wallet -> wallet; electronic rail -> same rail when supported; collected cash -> customer wallet by default unless a real governed cash refund with evidence is executed. | INTENDED_AUTHORIZED | recommendation adopted by user |
| OP-DISPATCH-ELIGIBILITY | Decision | OP-ROOT | One canonical captain eligibility composition must govern candidate discovery, capacity, create, reassign, inbox and accept. | DESIRED_RESOLVED | current DSH/Workforce/WLT split |
| OP-FINANCIAL-ELIGIBILITY | Decision | OP-DISPATCH-ELIGIBILITY | WLT alone owns captain financial eligibility and order-specific COD capacity; DSH consumes bounded decision/readback and never recalculates money. | INTENDED_AUTHORIZED | WLT architecture + `dispatchfinancialeligibility/decision.go` |
| OP-WORKFORCE-READINESS | Decision | OP-DISPATCH-ELIGIBILITY | Workforce owns non-financial readiness, workforce accreditation, suspension/absence and service-area/shift scopes. | INTENDED_AUTHORIZED | adopted recommendation |
| OP-DISPATCH-PRESENCE | State | OP-DISPATCH-ELIGIBILITY | DSH owns ephemeral dispatch presence/capacity only (online/offline/available/busy); Workforce suspension/absence remains separate source truth. | INTENDED_AUTHORIZED | adopted recommendation |
| OP-SERVICE-AREA | Authorization | OP-DISPATCH-ELIGIBILITY | Captain must be authorized by Workforce serviceAreaCodes for requested order area. Candidate/capacity/assignment cannot manufacture scope by echoing requested area. | DESIRED_RESOLVED | current DSH candidate query does not consume Workforce scopes |
| OP-FLEET-AFFILIATION | Authorization | OP-DISPATCH-ELIGIBILITY | Exactly one active primary dispatch affiliation at a time: BTHWANI XOR PARTNER. | INTENDED_AUTHORIZED | explicit user decision |
| OP-ACCREDITATION | Authority | OP-DISPATCH-ELIGIBILITY | Workforce operationsAccreditationStatus is the sole general operational accreditation; DSH duplicate mutable accreditation authority must be removed/converted to non-authoritative projection during cutover. | INTENDED_AUTHORIZED | recommendation adopted by user; current DSH profile has mutable `accreditation_status` |
| OP-PARTNER-COURIER-ID | Identity handoff | OP-PARTNER-DELIVERY | Membership ID and captain actor ID are separate typed identifiers; partner delivery resolves active membership -> captain_actor_id before Workforce readiness. | DESIRED_RESOLVED | current partnerdelivery passes storeCourierID to Workforce and persists same value as membership FK |
| OP-SETTLEMENT | Journey | OP-ROOT | Beneficiary settlement is WLT-controlled, server-derived, destination-resolved, evidence/reconciliation-bound; excess captain balance may be requested only within eligible amount. | INTENDED_AUTHORIZED | WLT architecture |
| OP-CROSS-SURFACE | Consumer set | OP-ROOT | app-client, app-captain, app-partner, control-panel and relevant backend/internal services must read the same canonical decisions and never reimplement monetary or eligibility rules client-side. | DESIRED_RESOLVED | V5 scope + WLT architecture |
| OP-PARTNER-APP-COURIER | Surface | OP-PARTNER-DELIVERY | Partner app must expose clear, fit-for-purpose sections for store couriers, assignments, status/readiness, delivery tasks and store-owned configuration without copying BTHWANI captain surface wholesale. | INTENDED_AUTHORIZED | user clarification |
| OP-GOVERNANCE | Governance | OP-ROOT | Product Truth/contracts/plans must match live canonical ownership after cutover; stale historical docs cannot remain active-looking authority. | DESIRED_RESOLVED | current architecture/old package drift observed |
| OP-CLEANUP | Cleanup | OP-ROOT | DONE requires line/file/folder cleanup: remove obsolete parallel truth, stale fields/routes/types/tests/generated artifacts/temp workflows/scripts and repair every reference/consumer. | INTENDED_AUTHORIZED | user explicit requirement + V5 cleanup policy |

## Root-Cause Graph

| RC | Root cause | Operational parent | Evidence | Depends on | Consumers | Blast / unlock | Priority | Deepening | Disposition |
|---|---|---|---|---|---|---|---|---|---|
| RC-001 | MONETARY_FACT_OWNERSHIP_SPLIT: monetary amount/policy authority leaks outside WLT (Workforce captain guarantee fields and caller-supplied penalty amount). | OP-AUTHORITY-MAP | `core/workforce/backend/internal/workforce/operational_core.go`; `services/wlt/backend/internal/penalty/penalty.go`; WLT architecture | - | Workforce, WLT, control-panel, captain, finance, operations | Finance-wide; removing it establishes one money authority and unblocks penalties/collateral/settlement | P0 | DEEPENED_ENOUGH_TO_RANK | TREAT_FIRST |
| RC-002 | COD_EXPOSURE_SETTLEMENT_LIFECYCLE_SPLIT: reservation, wallet debit, delivery completion, cash semantics and recovery are not one fail-closed lifecycle; current delivery completion ignores WLT finalize error and legacy custody path treats reservation orders inconsistently. | OP-BTHWANI-COD | `services/wlt/backend/internal/cod/reservation.go`; `services/wlt/backend/internal/cod/sovereign_cod.go`; `services/dsh/backend/internal/http/delivery_proof_completion.go` | RC-001, OP-PAYMENT-ALLOCATION | captain, client, dispatch, WLT, finance, partner payable | Direct platform financial exposure and orphaned operational/financial state | P0 | DEEPENED_ENOUGH_TO_RANK | TREAT_WITH_RC-001_COHERENT_CUTOVER |
| RC-003 | CAPTAIN_OPERATIONAL_ELIGIBILITY_AUTHORITY_SPLIT: eligibility is independently composed across Workforce, DSH dispatch/fleet, WLT and scopes; create/candidate/accept paths do not share one semantic decision. | OP-DISPATCH-ELIGIBILITY | `assignment_governance.go`; Workforce readiness/scopes; WLT dispatchfinancialeligibility | RC-001 | dispatch, captain, control-panel, capacity forecast, partner-delivery guardrails | Cross-surface assignment correctness; prevents offer-to-ineligible actor | P0 | DEEPENED_ENOUGH_TO_RANK | TREAT_AFTER_FINANCIAL_OWNER_CUT |
| RC-004 | PARTNER_COURIER_IDENTIFIER_SEMANTICS_CONFLATION: one storeCourierID is used as both DSH membership ID and Workforce actor ID. | OP-PARTNER-COURIER-ID | `services/dsh/backend/internal/partnerdelivery/service.go`; partner-delivery schema/migrations | RC-003 | partner app, DSH partner delivery, Workforce | Wrong-person readiness, FK/identity confusion, store isolation risk | P1 | DEEPENED_ENOUGH_TO_RANK | READY_AFTER_RC-003_BOUNDARY |
| RC-005 | CHECKOUT_PAYMENT_METHOD_SEMANTIC_DRIFT: live DSH defines `official_wallet` as fourth payment method although product decision is COD/WALLET/MIXED and official wallets are Cash-In rails. | OP-CHECKOUT | `services/dsh/backend/internal/checkout/checkout.go`; user decision; WLT architecture | RC-001 | app-client, checkout, WLT session, contracts, generated clients | Payment-state ambiguity across all fulfillment modes | P1 | DEEPENED_ENOUGH_TO_RANK | REMOVE_OR_MIGRATE_AFTER_USAGE_INVENTORY |
| RC-006 | SERVICE_AREA_AND_CAPACITY_SCOPE_DRIFT: DSH candidate/capacity logic does not prove Workforce service-area authorization and labels requested area onto candidates. | OP-SERVICE-AREA | `services/dsh/backend/internal/dispatch/assignment_governance.go`; Workforce scopes contract | RC-003 | dispatch, forecasting, operations, captain | Wrong-area dispatch and false capacity | P1 | DEEPENED_ENOUGH_TO_RANK | MERGE_IN_ELIGIBILITY_CUTOVER |
| RC-007 | ACCREDITATION_AND_AVAILABILITY_AUTHORITY_OVERLAP: Workforce and DSH both hold overlapping accreditation/suspension-style semantics. | OP-ACCREDITATION | Workforce operational core + DSH captain dispatch profile | RC-003 | operations, dispatch, captain | Contradictory readiness and duplicate writers | P1 | DEEPENED_ENOUGH_TO_RANK | REMOVE_DUPLICATE_AUTHORITY |
| RC-008 | PARTNER_COURIER_FINANCIAL_RESPONSIBILITY_MODEL_INCOMPLETE: salary mode is resolved, but optional per-delivery compensation and optional store collateral need one explicit store-scoped policy boundary. | OP-PARTNER-COMPENSATION | user decisions; partner delivery current code lacks complete store-courier finance model | RC-001, RC-004 | partner, courier, WLT, control-panel | Prevents hidden payroll/liability and accidental BTHWANI financial ownership | P1 | DEEPENING_REQUIRED | DECISION_REQUIRED |
| RC-009 | LEGACY_FINANCIAL_DUAL_TRUTH_RISK: historical package proved legacy ledger/direct balance/daily-close divergences. Current penalty direct-write subfinding is superseded, but remaining ledger/daily-close paths require current-ref reproof before cutover. | OP-GOVERNANCE | `plans/diagnose-implementing/wlt-finance-wallet-multisurface/GLOBAL-DIAGNOSIS.md` as Derived Support only | RC-001 | WLT finance, reconciliation, settlements | Potential finance-wide reconciliation corruption if still live | P1 | DEEPENING_REQUIRED | REPROVE_CURRENT_PATHS_NOT_COPY_HISTORY |
| RC-010 | GOVERNANCE_AUTHORITY_DRIFT: product truth/old diagnoses contain stale claims while live code has evolved; Workforce lacks one comprehensive authority declaration matching runtime scope. | OP-GOVERNANCE | WLT historical package + current code differences | RC-001..RC-009 | future agents, governance, generated contracts | Recurrence multiplier; stale docs can recreate duplicate truth | P2 | DEEPENED_ENOUGH_TO_RANK | CLEAN_AFTER_RUNTIME_TRUTH_CUTOVER |
| RC-011 | ORDER_ACTOR_PROVENANCE_GAP: previously proven lower root remains material but is downstream of higher authority/eligibility roots. | OP-ROOT | prior V5 diagnosis package/evidence; must be repinned before execution | RC-001, RC-003 | order/audit/settlement | Material attribution/audit risk but lower leverage now | P2 | PROVEN_CANNOT_OUTRANK | HOLD_UNTIL_HIGHER_ROOTS_CLOSED |

## Ledger

| Type | ID | RC | Relation / claim | Status | Evidence |
|---|---|---|---|---|---|
| Decision | DEC-001-WLT-SOLE-MONEY-OWNER | RC-001 | WLT is the only authoritative owner of balances, amounts, guarantees/collateral, fees, penalties, earnings, COD exposure, settlement, refunds and financial eligibility. | RESOLVED | user adoption + WLT architecture |
| Decision | DEC-002-CAPTAIN-ONE-WALLET | RC-001 | BTHWANI captain uses one WLT wallet. Opening/top-up, COD exposure, earnings, holds and payout are ledger purposes/states, not separate wallets. | RESOLVED | user decision + WLT architecture |
| Decision | DEC-003-CAPTAIN-COLLATERAL | RC-001 | Platform configures BTHWANI captain opening/minimum floor in sovereign control plane backed by WLT versioned policy; excess above protected requirements can be settlement-eligible. | RESOLVED | user decision |
| Decision | DEC-004-COD-ORDER-SPECIFIC | RC-002 | Prepaid amount does not consume COD collateral; only PaymentAllocation.cash_amount is reserved for COD/Mixed. | RESOLVED | explicit user approval |
| Decision | DEC-005-COD-NET-SETTLEMENT | RC-002 | BTHWANI COD reserve converts to final WLT debit on accepted delivery; captain top-ups wallet through official-wallet Cash-In; same order must not also create a second legacy remittance liability for the same economic amount. | RESOLVED | user clarification + WLT architecture target |
| Decision | DEC-006-CAPTAIN-EXCESS-WITHDRAWAL | RC-001 | Captain settlement request may use only server-derived eligible excess; minimum protected requirement, active COD reservations, payout holds/debts and unresolved financial cases remain unavailable. | RESOLVED | user decision |
| Decision | DEC-007-FLEET-XOR | RC-003 | Primary dispatch affiliation is exclusive: BTHWANI XOR PARTNER; no simultaneous dual primary fleet. | RESOLVED | explicit user decision |
| Decision | DEC-008-ACCREDITATION-OWNER | RC-007 | Workforce owns general operational accreditation; DSH duplicate mutable accreditation authority is removed. | RESOLVED | unoverridden recommendation adopted |
| Decision | DEC-009-AVAILABILITY-SPLIT | RC-007 | Workforce owns absence/suspension/workforce availability windows; DSH owns ephemeral dispatch presence. | RESOLVED | unoverridden recommendation adopted |
| Decision | DEC-010-PENALTY-POLICY | RC-001 | Sovereign Platform control panel manages a versioned penalty catalog whose monetary authority is WLT. Operations selects policy/type against incident; no amount field. WLT derives and posts amount. | RESOLVED | explicit user decision |
| Decision | DEC-011-PAYMENT-METHODS | RC-005 | Customer checkout canonical methods are COD, WALLET, MIXED. Official wallets are top-up/funding rails, not a fourth checkout method. | RESOLVED | user clarification + architecture |
| Decision | DEC-012-PARTNER-PAYMENTS | RC-008 | Partner/store delivery offers same three customer payment methods, but store/partner is financial beneficiary/responsibility boundary. | RESOLVED | explicit user decision |
| Decision | DEC-013-PARTNER-SALARY | RC-008 | SALARIED store courier has no per-order WLT earning; delivery fee belongs to store. Store payroll is outside platform finance. | RESOLVED | explicit user decision |
| Decision | DEC-014-REFUND-LINEAGE | RC-001 | Refund follows funding lineage; collected-cash refund defaults to customer internal wallet unless real governed cash refund evidence exists. | RESOLVED | unoverridden recommendation adopted |
| Decision | DEC-015-ELIGIBILITY-CALLS | RC-003 | Critical writes use live/synchronous authority checks; bounded versioned short-lived decisions may support high-volume preview/candidate discovery only. | RESOLVED | unoverridden recommendation adopted |
| Decision | DEC-016-PARTNER-RESPONSIBILITY | RC-008 | Platform owns technical identity/account/security integrity; store owns employment/payroll/store-specific safety and staff responsibility. | RESOLVED | user clarification |
| Decision | DEC-017-BELOW-FLOOR-PREPAID | RC-001 | After a previously activated BTHWANI captain balance falls below platform floor, should prepaid-only assignments remain allowed if all non-financial gates pass, or should all dispatch stop until top-up? | DECISION_REQUIRED | user approved an initial activation floor but later specifically stated low balance blocks COD; semantics conflict and must not be guessed |
| Decision | DEC-018-PARTNER-PER-DELIVERY | RC-008 | If store chooses per-delivery compensation, decide whether Bthwani WLT actually creates courier earning/settlement or merely reports store-owned compensation outside platform finance. | DECISION_REQUIRED | user states store may choose salary or per-delivery |
| Decision | DEC-019-PARTNER-COLLATERAL | RC-008 | If store opts into courier collateral, decide whether platform WLT provides store-scoped collateral accounting or the platform only records a non-financial store declaration and leaves money fully outside Bthwani. | DECISION_REQUIRED | user states optional collateral linked to store |
| Finding | F-001-WF-FINANCIAL-GUARANTEE-WRITABLE | RC-001 | Workforce captain core still has writable guarantee amount/currency/status/reference despite comment that money truth belongs to WLT. | OPEN | `core/workforce/backend/internal/workforce/operational_core.go` |
| Finding | F-002-WF-PENALTY-AMOUNT-WRITABLE | RC-001 | Workforce incident creation accepts `ProposedPenaltyMinorUnits` and currency. | OPEN | same file |
| Finding | F-003-WLT-PENALTY-CALLER-AMOUNT | RC-001 | WLT penalty endpoint accepts caller-provided `AmountMinorUnits`; ledger is canonical but economic value is not policy-derived. | OPEN | `services/wlt/backend/internal/penalty/penalty.go` |
| Finding | F-004-DSH-DUPLICATE-ACCREDITATION | RC-007 | DSH captain dispatch profile persists/writes `accreditation_status` independently. | OPEN | `services/dsh/backend/internal/dispatch/assignment_governance.go` |
| Finding | F-005-DSH-SERVICE-AREA-NOT-AUTHORIZED | RC-006 | Candidate list injects requested area into each candidate and does not consume Workforce serviceAreaCodes. | OPEN | `assignment_governance.go` |
| Finding | F-006-PARTNER-ID-CONFLATION | RC-004 | PartnerDelivery `storeCourierID` is passed directly to Workforce ActivationReadiness while persisted as store courier membership. | OPEN | `services/dsh/backend/internal/partnerdelivery/service.go` |
| Finding | F-007-FOURTH-PAYMENT-METHOD | RC-005 | DSH defines `official_wallet` checkout method contrary to resolved three-method product model. | OPEN | `services/dsh/backend/internal/checkout/checkout.go` |
| Finding | F-008-COD-FINALIZE-ERROR-DROPPED | RC-002 | Accepted BTHWANI delivery proof invokes WLT FinalizeCodReservation and discards error. | OPEN | `services/dsh/backend/internal/http/delivery_proof_completion.go` |
| Finding | F-009-COD-RESERVATION-CALLER-AMOUNT | RC-002 | DSH client sends amount/currency into WLT ReserveCodCapacity; target must bind reservation to WLT-owned PaymentAllocation/order finance truth instead of trusting caller amount. | OPEN | `services/dsh/backend/internal/wlt/cod_reservations.go`; WLT architecture |
| Finding | F-010-UNIVERSAL-STRICTEST-FINANCIAL-DECISION | RC-001 | WLT dispatch eligibility currently applies max(minDispatch,minCOD) universally, so financial eligibility is not purpose/order specific. | OPEN | `services/wlt/backend/internal/dispatchfinancialeligibility/decision.go` |
| Finding | F-011-PRICING-NOT-FULL-PAYMENT-ALLOCATION | RC-005 | DSH PricingSnapshot contains subtotal/delivery/discount/total but not canonical funding allocation across wallet/cash/subsidy/rail. | OPEN | `services/dsh/backend/internal/checkout/pricing.go`; WLT architecture |
| Finding | F-012-OLD-PENALTY-DIRECT-WALLET-WRITE | RC-009 | Historical diagnosis claimed direct wallet mutation in penalty path; current code no longer does this and relies on canonical ledger projection. | SUPERSEDED | current `services/wlt/backend/internal/penalty/penalty.go` |
| Finding | F-013-LEGACY-LEDGER-DAILY-CLOSE | RC-009 | Historical package claims legacy ledger and non-blocking daily close still coexist; current candidate must reprove exact writers/readers before execution. | NEEDS_REPROOF | historical `wlt-finance-wallet-multisurface/GLOBAL-DIAGNOSIS.md` only |
| Finding | F-014-ATTACHMENT-UNAVAILABLE | RC-010 | User referenced an attachment, but no retrievable conversation attachment is exposed to the current file-search source; package cannot silently claim attachment coverage. | BLOCKED_EVIDENCE | file_search returned NoSourcesAvailable on 2026-08-16 |
| Dependency | DEP-001-WLT-PAYMENT-ALLOCATION | RC-002 | COD, mixed refund, partner proceeds and captain exposure require canonical WLT PaymentAllocation keyed to order/checkout. | OPEN | WLT architecture |
| Dependency | DEP-002-WORKFORCE-SCOPES | RC-003 | Eligibility must consume authoritative Workforce scopes/readiness. | OPEN | Workforce internal scopes contract/client |
| Dependency | DEP-003-FLEET-MEMBERSHIP | RC-003 | BTHWANI/PARTNER dispatch must consume DSH fleet affiliation/membership truth. | OPEN | DSH fleet migrations |
| Dependency | DEP-004-WLT-POLICY-VERSIONING | RC-001 | Collateral and penalty policy require versioned audited WLT policy and sovereign control-plane writer. | OPEN | desired canonical cutover |
| Consumer | CON-001-APP-CLIENT | RC-005 | Checkout/payment/refund readback. | OPEN | app-client surface |
| Consumer | CON-002-APP-CAPTAIN | RC-001 | Wallet/top-up/COD capacity/earnings/settlement/readiness. | OPEN | app-captain surface |
| Consumer | CON-003-APP-PARTNER | RC-004 | Store courier management/tasks/payment/compensation configuration/readback. | OPEN | app-partner surface |
| Consumer | CON-004-CONTROL-PANEL | RC-001 | Platform penalty/collateral policy, operations application, finance/readback/settlement/reconciliation. | OPEN | control-panel surface |
| Consumer | CON-005-DSH | RC-003 | Checkout/order/fleet/dispatch/partner delivery. | OPEN | services/dsh |
| Consumer | CON-006-WORKFORCE | RC-003 | Non-financial provider readiness/scopes/incidents. | OPEN | core/workforce |
| Consumer | CON-007-WLT | RC-001 | Sole financial truth, policy, ledger, decisions, cash-in/out, reconciliation. | OPEN | services/wlt |
| Cleanup | CLN-001-WF-GUARANTEE | RC-001 | Remove Workforce guarantee money fields/writers/routes/UI/schema authority after migration; retain only non-authoritative historical references if legally required and clearly archival. | OPEN | F-001 |
| Cleanup | CLN-002-WF-PENALTY-AMOUNT | RC-001 | Remove `ProposedPenaltyMinorUnits`/currency as operator-entered authority from Workforce incident create/update contracts/UI. | OPEN | F-002 |
| Cleanup | CLN-003-DSH-ACCREDITATION | RC-007 | Remove DSH mutable accreditation writer/column/types/tests after Workforce cutover; no compatibility fallback. | OPEN | F-004 |
| Cleanup | CLN-004-ID-NAMES | RC-004 | Rename ambiguous `storeCourierId` to explicit membership/actor identifiers across DB/OpenAPI/Go/TS/events/audit/generated clients. | OPEN | F-006 |
| Cleanup | CLN-005-OFFICIAL-WALLET-METHOD | RC-005 | Inventory and remove/migrate `official_wallet` checkout method, branches, tests, schema values and UI; official wallet remains Cash-In rail. | OPEN | F-007 |
| Cleanup | CLN-006-ELIGIBILITY-DUPLICATES | RC-003 | Delete old local eligibility implementations/filters/projections that can independently grant authority after canonical composition lands. | OPEN | RC-003 |
| Cleanup | CLN-007-COD-LEGACY | RC-002 | Remove or strictly isolate obsolete COD custody/remittance semantics that duplicate the chosen BTHWANI collateral-backed settlement path; partner/store COD gets its own explicit store-liability path. | OPEN | RC-002 |
| Cleanup | CLN-008-STAGED-TEMP | RC-010 | Remove stale temporary stage workflows/scripts and update stale derived packages/docs only after preserving necessary provenance. | OPEN | prior task-branch artifacts + V5 cleanup |
| Cleanup | CLN-009-LINE-FILE-FOLDER | RC-010 | Perform final line/file/folder inventory for dead/stale/duplicate/misplaced code, configs, contracts, generated outputs, tests, migrations references and docs. | OPEN | user explicit requirement |

## Frontier

| Work | RC | Depends on | Blocks / unlocks | Conflict | Owner | Parallel | State | Evidence |
|---|---|---|---|---|---|---|---|---|
| W-001 | RC-001 | DEC-017/018/019 only for their affected cones; core WLT ownership otherwise settled | Establish one monetary owner and versioned policies | finance-authority | UNASSIGNED | NO | PREPARE | F-001,F-002,F-003,F-010 |
| W-002 | RC-002 | W-001, DEP-001 | Safe COD/Mixed exposure and exact delivery-finance closure | cod-lifecycle | UNASSIGNED | NO | PREPARE | F-008,F-009,WLT architecture |
| W-003 | RC-003 | W-001, DEP-002, DEP-003 | One captain eligibility primitive for all dispatch consumers | dispatch-eligibility | UNASSIGNED | NO | PREPARE | F-004,F-005,F-010 |
| W-004 | RC-004 | W-003 | Correct partner courier identity/scoping | partner-delivery | UNASSIGNED | NO | PREPARE | F-006 |
| W-005 | RC-005 | DEP-001 | Canonical payment methods/allocation/refund lineage | checkout-payment | UNASSIGNED | YES_AFTER_GRAPH_PROOF | PREPARE | F-007,F-011 |
| W-006 | RC-008 | DEC-018,DEC-019,W-001,W-004 | Complete partner courier finance boundary | partner-courier-finance | UNASSIGNED | NO | BLOCKED_DECISION | user product decisions |
| W-007 | RC-009 | W-001 | Prove/remove remaining legacy financial truth and daily-close drift | wlt-ledger-close | UNASSIGNED | YES_AFTER_CURRENT_REPROOF | DIAGNOSE | F-013 |
| W-008 | RC-010 | W-001..W-007 | Governance/contracts/docs/generated cleanup and recurrence prevention | governance-cleanup | UNASSIGNED | NO | HOLD | current truth must land first |
| W-009 | RC-011 | W-001,W-003 | Resume order actor provenance only if reranking still selects it | order-provenance | UNASSIGNED | NO | HOLD | lower systemic leverage |

## Evidence

| Evidence | Claim | Check / source | Candidate | Environment | Result | Limits / invalidates on |
|---|---|---|---|---|---|---|
| E-001 | V5 orchestration authority | `tools/prompting/bthwani-orchestrator/00-ORCHESTRATOR.md` | bdbcb811ab2a0fe0cc4db6e4947d5ef741d2c5c7 | GitHub remote | PASS | invalidate if orchestrator changes |
| E-002 | New isolated task branch pinned to current A | Git ref for `task/v5-finance-delivery-canonical-truth-20260816-0214` | bdbcb811ab2a0fe0cc4db6e4947d5ef741d2c5c7 | GitHub remote | PASS | invalidate if A/task head moves |
| E-003 | WLT is target sole money authority; one captain wallet; PaymentAllocation required | `services/wlt/WLT_EXTERNAL_WALLET_SWITCH_ARCHITECTURE.md` | bdbcb811... | GitHub remote | PASS | architecture is intended target; live implementation still must prove conformance |
| E-004 | Workforce still exposes writable guarantee and proposed penalty amount | `core/workforce/backend/internal/workforce/operational_core.go` | bdbcb811... | GitHub remote | PASS | invalidates on file change |
| E-005 | WLT penalty uses canonical ledger but caller supplies amount | `services/wlt/backend/internal/penalty/penalty.go` | bdbcb811... | GitHub remote | PASS | invalidates on penalty/policy boundary change |
| E-006 | DSH checkout exposes 4 methods including `official_wallet` | `services/dsh/backend/internal/checkout/checkout.go` | bdbcb811... | GitHub remote | PASS | invalidates on checkout contract/model change |
| E-007 | DSH pricing snapshot is not full funding allocation | `services/dsh/backend/internal/checkout/pricing.go` | bdbcb811... | GitHub remote | PASS | may be supplemented by WLT object; requires graph trace |
| E-008 | DSH dispatch profile writes accreditation and candidate query does not consume Workforce area scopes | `services/dsh/backend/internal/dispatch/assignment_governance.go` | bdbcb811... | GitHub remote | PASS | invalidate on dispatch eligibility cutover |
| E-009 | Partner delivery passes storeCourierID directly to Workforce readiness and task persistence | `services/dsh/backend/internal/partnerdelivery/service.go` | bdbcb811... | GitHub remote | PASS | invalidate on membership->actor resolver change |
| E-010 | WLT financial eligibility uses max general/COD threshold universally | `services/wlt/backend/internal/dispatchfinancialeligibility/decision.go` | bdbcb811... | GitHub remote | PASS | invalidate on purpose/order-specific decision API |
| E-011 | Accepted delivery proof discards WLT finalize error | `services/dsh/backend/internal/http/delivery_proof_completion.go` | bdbcb811... | GitHub remote | FAIL | critical fail-open path; invalidate on durable handoff/error propagation fix |
| E-012 | COD reservation currently consumes caller amount/currency and tracks dedicated reserved balance | `services/wlt/backend/internal/cod/reservation.go` + DSH WLT client | bdbcb811... | GitHub remote | PASS_WITH_GAP | must bind to WLT-owned PaymentAllocation and chosen lifecycle |
| E-013 | Historical finance package contains stale and still-unverified risks | `plans/diagnose-implementing/wlt-finance-wallet-multisurface/GLOBAL-DIAGNOSIS.md` | historical/derived | GitHub remote | STALE | no runtime claim may rely on it without current reproof |
| E-014 | Current penalty direct-wallet-write historical finding is obsolete | compare historical diagnosis vs current penalty.go | bdbcb811... | GitHub remote | PASS | only closes that specific old subfinding |
| E-015 | Conversation attachment evidence cannot currently be retrieved | file_search NoSourcesAvailable | N/A | ChatGPT file source | BLOCKED | must be imported/reviewed if attachment becomes retrievable; package cannot claim attachment contents |

## Required Diagnosis Passes Before Execution

The execution frontier is not permitted until each material cone has explicit evidence for:

1. forward + reverse money flow: funding -> wallet -> allocation -> reservation -> delivery -> settlement/refund;
2. temporal state transitions and stale/expired decisions;
3. actor/responsibility separation for BTHWANI captain vs partner/store courier;
4. authorization, IDOR, wrong store/partner/operator-context and role negatives;
5. concurrent COD reservations, assignment races, payout/top-up races and idempotent replay;
6. dependency timeout/unknown-result/retry/outbox/reconciliation;
7. mixed-payment conservation and partial refund lineage;
8. old/new data migrations and mixed-version compatibility without parallel truth;
9. cross-surface differential behavior for client/captain/partner/control-panel;
10. full writer inventory for wallet balance, financial policy, penalty amount, accreditation, fleet membership, scopes, payment method/allocation and COD states;
11. negative-space search for alternate writers/routes/cron/jobs/events/generated clients and hidden legacy APIs;
12. line/file/folder cleanup proof after cutover.

## Non-Negotiable Target Invariants

- One canonical owner per durable fact/decision; projections never become writable authority.
- No authoritative money amount originates from UI/Workforce/DSH when it belongs to WLT.
- No customer/captain/partner client computes financial eligibility, settlement total, penalty amount, refund allocation or COD exposure.
- No BTHWANI captain and PARTNER primary affiliation at the same time.
- No assignment/candidate/capacity decision without authoritative area scope, workforce readiness, fleet affiliation, dispatch presence/capacity and WLT financial decision.
- No membership ID may be accepted where an actor ID is required.
- No COD/Mixed reservation exceeds canonical cash component from PaymentAllocation.
- No operational delivery closure may silently lose a required WLT transition.
- No payout/withdrawal reduces protected captain funds below server-derived safe threshold/exposure/holds/debts.
- No salaried store courier receives duplicate per-order earning.
- No `official_wallet` checkout semantic survives if it only represents a top-up rail.
- No compatibility/fallback/legacy path may remain reachable as a second source of truth after cutover.
- Historical evidence cannot close current runtime behavior.

## Closure

- Integration head: SELF
- Final candidate: SELF
- Verification: PREPARE_ONLY package; execution verification must be defined per work item before writes and bound to exact candidate SHA.
- Runtime/product evidence: REQUIRED for eventual EXECUTE_END_TO_END; not satisfied by this diagnosis package.
- Cleanup: mandatory line/file/folder inventory and removal/merge/relocation of every proven stale/duplicate/legacy/temporary artifact.
- Governance: V5 core plus updated Product Truth/contracts must match live post-cutover authority.
- Final adversarial: must prove zero parallel money authority, zero duplicate eligibility authority, zero ambiguous IDs, zero fail-open finance handoff, zero stale active-looking source truth, and zero unaccounted material finding/decision/consumer/dependency/scope delta.
