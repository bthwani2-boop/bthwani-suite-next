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

**Decision:** the captain may request settlement only from server-derived excess above protected requirements after active COD reservations, holds, debts and unresolved finance exposure are accounted.

### D05 — COD exposure

**Decision:** only the canonical cash component of an order creates COD exposure. Wallet/prepaid amount does not consume COD exposure.

For Mixed, reserve only `PaymentAllocation.cash_amount`.

### D06 — BTHWANI COD settlement model

**Decision:** reserve cash exposure before/at governed assignment; on accepted delivery convert the reservation to final WLT wallet debit; cancellation/reassignment releases/retargets it exactly once.

Do not also create a second legacy cash-remittance liability for the same economic amount.

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

## Decision Required — only unresolved product semantics

### D17 — What happens to prepaid-only work after a BTHWANI captain falls below the configured floor?

There is a semantic conflict between two accepted statements:

- an opening/minimum financial floor is required for BTHWANI captain activation generally;
- the user later stated that low/zero balance makes the captain ineligible for COD orders.

**A — Recommended:** separate initial onboarding activation from ongoing order risk. Opening funding is required to activate initially; after activation, falling below the COD floor blocks COD/Mixed cash exposure but may still allow prepaid/WALLET-only delivery if all non-financial gates pass. This avoids unnecessarily stopping risk-free prepaid work and keeps the financial gate proportional to exposure.

**B:** falling below the configured floor blocks every BTHWANI delivery assignment, including fully prepaid orders, until top-up restores the floor.

**C:** no floor after initial activation; only per-order COD amount matters. Not recommended because it removes the ongoing protected minimum requested by the product.

**Recommendation:** A.

**Impact:** controls whether financial eligibility is purpose-specific or a universal dispatch prerequisite after initial activation.

---

### D18 — If a store chooses per-delivery compensation for its courier, who performs the financial settlement?

Salary mode is already resolved. This question is only for store-selected per-delivery compensation.

**A — Recommended:** optional platform-managed partner-courier earning. Store configures an allowed versioned compensation policy through Partner surface; WLT stores/derives the monetary policy and creates courier earning only for stores that explicitly opt in. Salary mode creates no courier earning. This gives stores flexibility while keeping money canonical.

**B:** Bthwani never pays/settles partner couriers. Delivery fee always belongs to store; store pays courier outside the platform even when it uses per-delivery compensation. App may show operational delivery counts only, not authoritative earnings.

**C:** store manually enters each courier amount after each order. Rejected because it creates ad-hoc monetary truth.

**Recommendation:** A if the product intends the Partner app to show/pay per-delivery courier earnings; otherwise B is simpler and keeps Bthwani out of the store payroll relationship.

**Impact:** determines whether partner couriers need WLT earning/settlement capabilities and additional Finance/Partner UI.

---

### D19 — Optional store-courier collateral: platform-managed or entirely store-external?

The user decided that a store may optionally use collateral for its courier and that it must be linked to the store, not BTHWANI captain finance.

**A — Recommended if the platform must enforce it:** WLT provides a distinct store-scoped partner-courier risk policy/position. Partner configures allowed policy within governed bounds; WLT is monetary owner; DSH only consumes an eligibility decision. No BTHWANI collateral tables/policies are reused.

**B — Recommended if Bthwani only provides the app:** collateral is entirely the store's off-platform responsibility. Bthwani does not store a monetary collateral amount or display a fake wallet balance; it may store only a non-financial store declaration if needed for workflow.

**C:** store enters collateral amount/status into DSH/Workforce and DSH treats it as financial truth. Rejected.

**Recommendation:** B unless Bthwani explicitly wants to guarantee/enforce this financial risk for stores. If enforcement is a platform feature, choose A.

**Impact:** determines whether WLT needs a new partner-courier financial product or whether this cone is explicitly out of Bthwani finance scope.

## Auto-adoption rule

If the user does not override D17/D18/D19, their recommendations above become the authorized decisions according to the user's stated rule that unanswered decisions adopt the recommendation.
