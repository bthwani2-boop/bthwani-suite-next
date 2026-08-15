# Decision Register — Finance / Delivery Canonical Truth

This file records product decisions only. Technical choices that can be derived from canonical ownership and evidence are not escalated as product questions.

## Resolved decisions

### D01 — Sole financial source of truth

**Decision:** WLT only.

No other domain may authoritatively own or mutate money amounts, balances, guarantees/collateral, penalties, fees, earnings, refunds, settlement totals, financial eligibility or COD exposure.

### D02 — BTHWANI captain wallet

**Decision:** one WLT internal wallet per captain.

Opening funding, top-up, COD reserve/release/debit, earning, penalty, hold and settlement are ledger purposes/states of the same wallet.

### D03 — BTHWANI captain opening/minimum funding

**Decision:** sovereign Platform/Finance control configures the required opening/minimum protected amount as versioned WLT policy.

The captain funds through supported official-wallet Cash-In rails. No operator edits the wallet balance directly.

### D04 — Excess withdrawal

**Decision:** the captain may request settlement only from server-derived excess above protected requirements after active COD reservations, open cash exposure, holds, debts and unresolved finance exposure are accounted.

### D05 — COD exposure

**Decision:** only the canonical cash component of an order creates COD exposure. Wallet/prepaid amount does not consume COD exposure.

For Mixed, reserve only `PaymentAllocation.cash_amount`.

### D06 — BTHWANI COD settlement model

**Decision:** reserve cash exposure before/at governed assignment; on accepted delivery convert the reservation to final WLT wallet debit; cancellation/reassignment releases/retargets it exactly once.

Do not also create a second legacy cash-remittance liability for the same economic amount. Physical cash custody and financial exposure must remain explicitly modeled and reconciled so neither can disappear behind the other.

### D07 — Captain primary fleet affiliation

**Decision:** one primary active dispatch affiliation only: `BTHWANI XOR PARTNER`.

No dual simultaneous primary affiliation.

### D08 — Accreditation authority

**Decision:** Workforce owns general operational accreditation. DSH duplicate mutable accreditation authority must be removed.

### D09 — Availability authority

**Decision:** Workforce owns workforce suspension/absence/work windows. DSH owns ephemeral dispatch presence/capacity (`online/offline/available/busy`).

### D10 — Penalty catalog and posting

**Decision:** sovereign Platform section in control panel configures the penalty catalog/value, but canonical monetary policy/version belongs to WLT.

Operations selects the penalty type/version for an incident. Workforce/Operations sends facts/reference, not an authoritative amount. WLT derives amount and posts the financial deduction.

### D11 — Customer payment methods

**Decision:** exactly three checkout methods:

- `COD`
- `WALLET`
- `MIXED`

Official electronic wallets are Cash-In/top-up rails, not a fourth checkout payment method.

### D12 — Partner/store delivery payment methods

**Decision:** partner/store delivery offers the same three customer payment methods, but financial beneficiary/responsibility is tied to the store/partner.

### D13 — Salaried store courier

**Decision:** when store courier is a salaried store employee, delivery fee belongs to store and courier has no per-order Bthwani financial entitlement. Salary/payroll stays store responsibility.

### D14 — Refund

**Decision:** refund follows original funding lineage. Wallet returns to wallet; electronic rail returns to same rail when governed/supported; collected cash returns to customer wallet by default unless a real governed cash refund with evidence is executed.

### D15 — Eligibility freshness

**Decision:** critical financial/assignment writes use fresh authority checks. Short-lived versioned decision projections may support discovery/preview only and cannot become an unbounded write authority.

### D16 — Store responsibility

**Decision:** Bthwani provides the app/account/security platform boundary. Store owns its employment, payroll and store-specific staff responsibility. Bthwani identity/security isolation cannot be disabled by the store.

### D17 — Ongoing floor and prepaid-only work

**Decision:** initial opening/minimum funding is required to activate a BTHWANI captain. After activation, falling below the configured COD-safe floor blocks `COD` and the cash component of `MIXED`, but fully prepaid `WALLET` assignments may remain eligible when all non-financial gates pass.

Prepaid work never reserves collateral. COD/Mixed cash exposure is allowed only while the authoritative WLT decision proves the effective protected balance covers the new cash exposure in addition to existing reservations/open financial exposure.

### D18 — Partner courier per-delivery compensation

**Decision:** when a store chooses a per-delivery compensation model instead of salary, the platform may manage that earning canonically as a store-funded partner-courier earning.

The store selects a governed versioned compensation policy through Partner surfaces; WLT owns/derives the monetary amount and settlement. Bthwani never funds the store payroll/earning from platform money and never grants credit. Salary mode creates no per-order courier earning.

Free-form per-order manual amounts are not authoritative.

### D19 — Optional store-courier collateral

**Decision:** store-courier collateral is the store's own off-platform responsibility unless a future explicitly authorized product changes that boundary.

Bthwani/WLT must not custody, guarantee or present that store-owned collateral as a Bthwani financial position. The platform may provide operational configuration/status/evidence needed by the store workflow, but no DSH/Workforce field may become an authoritative monetary balance or fake wallet.

### D20 — Store-courier responsibility boundary

**Decision:** for store delivery, Bthwani supplies the application, identity/account isolation, permissions and governed operational workflow; the store remains responsible for the employment relationship, salary, internal staff policies and store-owned collateral arrangements.

Platform security and identity baseline remain mandatory and cannot be disabled by the store.

## Decision status

`DECISION_REQUIRED = 0` for the product semantics covered by this package as of the user's latest answers and the standing rule that any unanswered previously asked question adopts the stated recommendation.

Any newly discovered contradiction outside these resolved semantics must be surfaced as a new explicit decision; existing resolved decisions may not be silently reopened by implementation convenience.