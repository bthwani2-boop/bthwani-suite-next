# WLT External Wallet & Settlement Architecture

**Status:** Canonical target architecture / implementation decision record  
**Service:** `WLT` — Wallet / Financial Truth  
**Branch:** `abbas`  
**Updated:** 2026-08-08  
**Primary market:** Yemen official electronic wallets  

---

## 1. Purpose

This document defines the target financial architecture for BThwani.

It consolidates the final decisions for:

- BThwani internal wallets;
- customer and captain cash-in/top-up;
- order payment allocation;
- captain COD financial authorization;
- partner, captain, and field earnings;
- verified official-wallet settlement destinations;
- governed manual external settlements;
- settlement batches and XLSX execution files;
- evidence, audit, reconciliation, exceptions, and daily finance close;
- external wallet rails/providers;
- accounting and double-entry rules;
- finance control-panel responsibilities;
- migration from legacy/preview financial concepts.

The architecture is intentionally designed so that external-wallet providers can change without changing WLT's accounting truth or stakeholder business rules.

---

# 2. Canonical financial decision

The target is:

```text
                            BTHWANI WLT
                                |
                       ONE FINANCIAL TRUTH
                                |
                 ONE DOUBLE-ENTRY LEDGER
                                |
        +-----------------------+-----------------------+
        |                       |                       |
     Payments                Wallets               Settlements
        |                       |                       |
        +-----------------------+-----------------------+
                                |
               +----------------+----------------+
               |                |                |
            Customer         Captain       Partner / Field
               |                |                |
          internal wallet   internal wallet   internal wallet
               |                |                |
               +----------------+----------------+
                                |
                         governed WLT state
                                |
             +------------------+------------------+
             |                                     |
          CASH-IN                              CASH-OUT
             |                                     |
   official wallet rails                  governed manual
   / common switch / direct               external transfer
             |                                     |
   authoritative evidence                 official wallet app
             |                                     |
          WLT ledger                        proof + verification
             |                                     |
             +------------------+------------------+
                                |
                         reconciliation
                                |
                         financial close
```

The foundational rules are:

> **WLT is the sole internal financial source of truth.**

> **External official wallets move real external money; they never own BThwani's internal balances, liabilities, payout state, or accounting truth.**

> **Cash-In may be electronically integrated. Cash-Out/settlement is currently a governed manual external-wallet operation, not a provider payout API.**

> **One internal wallet per actor, with one immutable ledger recording the nature and provenance of every movement.**

---

# 3. What BThwani Wallet is — and is not

BThwani Wallet is a private/internal platform ledger balance.

It is not an official national wallet and must not be presented as one.

For each actor, WLT may maintain balances/status such as:

```text
available
held
pending
earned
settled
withdrawal_eligible
```

These are states/views over one financial truth. They must not create competing ledgers.

External official-wallet accounts remain separate financial destinations/sources used to move real funds.

---

# 4. Stakeholder financial model

| Stakeholder | Internal BThwani wallet | Cash-In / Top-up | COD | Earnings | Settlement request | External settlement |
|---|---:|---:|---:|---:|---:|---|
| Customer | Yes | Yes | Pays when applicable | No | No by default | N/A |
| Captain | Yes | Yes | Financially reserved/debited from same wallet | Delivery/commission | Yes | Manual governed official-wallet transfer |
| Partner | Yes | Optional only if product requires it | Receives governed order proceeds | Sales/net settlement | Yes | Manual governed official-wallet transfer |
| Field | Yes | Not required by default | No | Field commission | Yes | Manual governed official-wallet transfer |
| BThwani | Central WLT ledger | Receives external funds | Owns accounting truth | Fees/commissions | Operates settlement | Uses official corporate wallet accounts |

No stakeholder gets a parallel financial system per provider.

---

# 5. Customer

## 5.1 Customer top-up

Canonical flow:

```text
Customer
   -> Create Funding Intent
   -> select supported official wallet route
   -> CashInRail
   -> external provider/switch
   -> authoritative confirmation
   -> reconciliation
   -> WLT double-entry posting
   -> customer internal balance credited
```

Screenshots, customer claims, or client-side success screens are never authoritative financial success.

Preferred authoritative evidence order:

1. verified provider webhook;
2. provider inquiry/read-back;
3. reconciliation feed/statement;
4. controlled finance reconciliation evidence.

## 5.2 Customer withdrawal

General withdrawal from the BThwani internal balance is not enabled by implication.

It requires separate legal, product, fraud, accounting, and regulatory approval.

---

# 6. Captain — one wallet, Cash-In + COD + earnings + settlement

The captain has **one internal WLT wallet**.

Do not create separate visible wallets for top-up, COD, earnings, or settlement.

The ledger records movement type instead:

```text
CAPTAIN_OPENING_FUNDING
CAPTAIN_TOPUP
CAPTAIN_COD_RESERVE
CAPTAIN_COD_RELEASE
CAPTAIN_COD_DEBIT
CAPTAIN_DELIVERY_EARNING
CAPTAIN_COMMISSION
CAPTAIN_ADJUSTMENT
CAPTAIN_PAYOUT_HOLD
CAPTAIN_PAYOUT_RELEASE
CAPTAIN_PAYOUT_COMPLETED
```

## 6.1 Captain top-up

Captain top-up uses the same canonical Cash-In engine as customer top-up:

```text
Official Wallet
   -> Funding Intent
   -> CashInRail
   -> authoritative provider evidence
   -> reconciliation
   -> WLT ledger
   -> wallet(captain)
```

The provider does not decide the accounting destination. The server-owned purpose does:

```text
CUSTOMER_TOPUP -> wallet(customer)
CAPTAIN_TOPUP  -> wallet(captain)
```

## 6.2 Captain COD must be order-specific

General minimum-balance eligibility is not enough.

The final authorization must be:

```text
General Captain Eligibility
          |
          v
Order-specific COD amount
          |
          v
available balance >= required COD exposure?
          |
          v
atomic reserve
          |
          v
assignment allowed
```

This prevents two concurrent assignments from consuming the same captain balance.

## 6.3 COD reserve instead of immediate irreversible debit

Example:

```text
Captain available balance = 30,000 YER
Order COD product exposure = 10,000 YER
```

On governed assignment/acceptance:

```text
CAPTAIN_COD_RESERVE 10,000
available/spendable -> 20,000
held                 -> 10,000
```

If the order is cancelled before settlement:

```text
CAPTAIN_COD_RELEASE 10,000
available -> 30,000
```

If delivered:

```text
reserved COD -> final COD debit
```

Then, if delivery earning is paid through WLT:

```text
CAPTAIN_DELIVERY_EARNING +800
final visible balance -> 20,800
```

A hold is not a second wallet. It is a controlled restriction on part of the same financial balance.

---

# 7. PaymentAllocation — mandatory order-level financial truth

A critical canonical object is required for every order/payment path:

```text
PaymentAllocation
  order_id
  currency
  subtotal
  delivery_fee
  discount
  platform_subsidy
  internal_wallet_amount
  external_official_wallet_amount
  cod_product_amount
  cod_delivery_amount
  total
  policy_version
```

The server must enforce the conservation invariant:

```text
internal_wallet_amount
+ external_official_wallet_amount
+ cash_amount
+ platform_subsidy
= governed total
```

No UI or provider may infer allocation from the payment-method label alone.

## 7.1 Delivery fee must never be counted twice

The system must explicitly choose one governed policy.

If the captain only receives product COD in cash and delivery earning is credited by WLT:

```text
COD product exposure = product cash amount
Delivery earning     = separate WLT credit
```

If the captain retains delivery cash directly from the customer, WLT must not credit the same delivery earning a second time.

The allocation must make this mechanically testable.

## 7.2 Mixed payment

Example:

```text
Product              10,000
Customer WLT           4,000
COD product exposure   6,000
Delivery                 800
```

If delivery is separately credited by WLT, captain COD authorization covers `6,000`, not `10,800`.

---

# 8. Partner earnings and settlement

Partner financial truth must be derived from governed operational and financial evidence, including as applicable:

- delivered order/pricing snapshot;
- completion evidence;
- completed refunds;
- approved commission/fee policy;
- idempotent settlement calculation;
- WLT ledger posting.

Canonical conceptual equation:

```text
gross governed proceeds
- completed refunds
- platform fees/commissions
+/- approved adjustments
= partner payable
```

DSH provides operational evidence. WLT owns the financial calculation and posting.

---

# 9. Field earnings

Field commission must not become finally earned merely because a visit form was completed.

The target commercial trigger is the governed successful outcome, for example:

```text
Field visit completed
        -> commission candidate
        -> partner approved
        -> store published
        -> store client_visible
        -> FIELD_COMMISSION_EARNING
        -> field internal wallet
```

The exact event contract must be server-owned and versioned.

---

# 10. OfficialWalletDestination — only verified destinations can receive settlement

The target payout destination is an official electronic-wallet account, not a bank/IBAN product model.

Canonical model:

```text
OfficialWalletDestination
  destination_id
  actor_type
  actor_id
  provider_key
  wallet_identifier_encrypted
  wallet_identifier_masked
  beneficiary_name
  verification_status
  status
  version
  submitted_at
  submitted_by
  verified_at
  verified_by
  verification_method
  verification_evidence_reference
  created_at
  updated_at
```

Minimum lifecycle:

```text
SUBMITTED
  -> PENDING_VERIFICATION
  -> VERIFIED
  -> ACTIVE_FOR_PAYOUT

or

PENDING_VERIFICATION
  -> REJECTED

ACTIVE_FOR_PAYOUT
  -> SUSPENDED / RETIRED
```

A generic `active=true` flag is never a substitute for verified status.

## 10.1 Destination change

Trust never transfers automatically to a changed wallet number.

```text
Old destination = VERIFIED
User requests new identifier
        |
        v
New destination version = PENDING_VERIFICATION
        |
        v
new payouts blocked until verification
```

An already approved payout snapshot is not silently rewritten after a destination change.

---

# 11. Destination and execution method are separate concepts

Do not model:

```text
settlementPreference = manual
```

as if `manual` were the financial destination.

Correct separation:

```text
DestinationType:
  official_wallet

ExecutionMethod:
  manual_external_wallet_transfer
```

The destination says **where** the money goes.

The execution method says **how** BThwani performed the external movement.

---

# 12. Current production target for Cash-Out: governed manual settlement

For the current Yemen operating model, WLT must **not** assume a provider payout API.

The canonical stakeholder settlement flow is:

```text
Beneficiary requests payout
        |
        v
WLT validates withdrawal eligibility
        |
        v
Funds placed on HOLD
        |
        v
Verified OfficialWalletDestination required
        |
        v
Risk / duplicate / policy checks
        |
        v
Maker preparation
        |
        v
Checker approval
        |
        v
SettlementBatch
        |
        v
FREEZE batch + control total + hash
        |
        v
Execution Workbench / generated XLSX
        |
        v
Finance executor opens BThwani official wallet app
        |
        v
Manual external transfer
        |
        v
Reference + evidence recorded
        |
        v
Independent verification
        |
        v
Official-wallet/provider statement reconciliation
        |
        v
WLT ledger finalization
        |
        v
COMPLETED
```

There is no unrestricted `Mark Paid` operation.

A payout is completed only after governed execution and reconciliation requirements are satisfied.

---

# 13. Unified PayoutRequest

Partner, captain, and field must use one canonical payout engine:

```text
PayoutRequest
  payout_id
  beneficiary_actor_type  // partner | captain | field
  beneficiary_actor_id
  amount
  currency
  destination_id
  destination_version
  status
  hold_transaction_id
  policy_version
  requested_at
```

Do not build separate accounting engines for:

```text
CaptainPayout
PartnerPayout
FieldPayout
```

Stakeholder-specific eligibility belongs in policy, not in parallel ledgers/workflows.

---

# 14. ApprovedPayoutSnapshot — approved data becomes immutable

At approval time, create an immutable snapshot containing at least:

```text
payout_id
beneficiary_actor_id
beneficiary_name
provider_key
masked_destination
destination_id
destination_version
amount
currency
policy_version
approved_at
approved_by
snapshot_hash
```

After approval, the executable amount, beneficiary, and destination cannot be edited in place.

Any material change requires cancellation/rejection and a new approval path.

This guarantees that the transaction executed is the transaction actually approved.

---

# 15. Maker / Checker / Executor / Reconciler / DayCloser

Financial separation-of-duties is a backend control, not a UI convention.

Canonical logical roles:

```text
Maker       -> prepares payout/batch
Checker     -> independently approves/rejects
Executor    -> performs manual external transfer
Reconciler  -> matches external evidence/statement
DayCloser   -> closes financial business date
```

Production rules must support, at minimum:

- approval permission separated from preparation permission;
- execution permission separated from verification/reconciliation permission;
- server-side enforcement of legal state transitions;
- auditable identity/time for each action;
- configurable enhanced approval for sensitive/high-value cases;
- no production mode in which required controls silently disappear because an environment variable was omitted.

Recommended invariant when SoD is applicable:

```text
executed_by != independently_verified_by
```

Where staffing temporarily requires a controlled exception, the exception itself must be explicitly approved, reasoned, time-bounded, and audited. It must not be an invisible bypass.

---

# 16. SettlementBatch — immutable execution unit

Approved payout requests are grouped into a settlement batch, typically by operational execution scope such as provider and currency.

Canonical model:

```text
SettlementBatch
  batch_id
  provider_key
  currency
  status
  row_count
  total_amount
  created_by
  created_at
  frozen_by
  frozen_at
  batch_hash
  policy_version
```

Lifecycle:

```text
DRAFT
  -> PREPARED
  -> APPROVED
  -> FROZEN
  -> EXECUTION_IN_PROGRESS
  -> AWAITING_VERIFICATION
  -> AWAITING_RECONCILIATION
  -> COMPLETED

or -> CANCELLED / EXCEPTION
```

Once `FROZEN`:

- no row may be added;
- no row may be removed;
- no amount may be changed;
- no beneficiary may be changed;
- no destination may be changed.

A required change creates a new governed batch/version rather than mutating the frozen evidence.

---

# 17. XLSX is an execution artifact, never the database

The authoritative direction is:

```text
WLT
  -> immutable SettlementBatch snapshot
  -> generated XLSX
```

Never:

```text
Excel edit
  -> silently changes WLT financial truth
```

Generated rows should contain only the minimum necessary execution data, for example:

```text
row_sequence
batch_id
payout_id
beneficiary
provider
masked/required execution identifier
amount
currency
row_fingerprint
```

File metadata must be retained:

```text
batch_id
generated_at
generated_by
row_count
total_amount
currency
file_hash
artifact_reference
```

Downloads/exports must be audited.

Sensitive unmasked identifiers must be exposed only to authorized execution roles and only where operationally necessary.

---

# 18. Settlement Execution Workbench

The control panel should provide a row-by-row execution workspace rather than forcing staff to operate from Excel alone.

Example:

```text
Transfer 7 of 27

Payout ID:   PAY-...
Beneficiary: ...
Provider:    ...
Wallet:      masked / reveal-with-permission
Amount:      50,000 YER

[Copy wallet]
[Copy amount]
[Record transfer]
```

The executor must not be able to alter the approved beneficiary, wallet, or amount from the execution screen.

`Record transfer` requires the governed execution fields; there is no bare success toggle.

---

# 19. ManualTransferEvidence

Each executed external transfer records at least:

```text
transfer_execution_id
batch_id
payout_id
approved_snapshot_hash
executed_by
executed_at
provider_key
external_transfer_reference
amount
currency
destination_version
evidence_references[]
execution_status
```

Evidence can include a receipt/screenshot or provider-issued reference, but image evidence alone is not final financial truth.

The server must prevent duplicate reuse of authoritative references where provider semantics require uniqueness.

---

# 20. Four-way settlement reconciliation

A completed payout should be able to prove agreement between:

```text
1. WLT PayoutRequest / ApprovedPayoutSnapshot
2. Frozen SettlementBatch row
3. Manual transfer execution evidence/reference
4. Official provider/wallet statement or authoritative external record
```

Expected result:

```text
amount        == amount
currency      == currency
beneficiary   == approved destination
provider ref  == authoritative external evidence
```

Mismatch creates a reconciliation exception; it does not create a false completed payout.

Example statuses:

```text
MATCHED
UNMATCHED
AMOUNT_MISMATCH
DESTINATION_MISMATCH
DUPLICATE_REFERENCE
MISSING_TRANSFER
UNKNOWN_EXTERNAL_TRANSACTION
NEEDS_REVIEW
```

---

# 21. Provider statement import

Because an external API/feed may not exist, WLT should support controlled import of official wallet/provider statements or exports.

The importer must:

- preserve the original artifact and file hash;
- record provider/account/business-date scope;
- normalize rows without destroying source evidence;
- match deterministically where possible;
- route ambiguous/unmatched rows to exceptions;
- be idempotent for the same source artifact;
- never mutate ledger balances merely because a spreadsheet row exists.

Automation can be added later if providers expose authoritative APIs or feeds.

---

# 22. SettlementAuditPack — canonical financial evidence package

A useful concept from the legacy repository is retained and upgraded into a runtime-backed `SettlementAuditPack`.

It is not preview data and not a second financial source of truth.

Recommended contents:

```text
SettlementAuditPack
  payoutSnapshot
  destinationSnapshot
  destinationSnapshotHash
  approvals[]
  settlementBatchId
  settlementBatchHash
  batchControlTotal
  exportArtifactHash
  executionRecord
  externalTransferReference
  transferEvidence[]
  providerStatementReference
  reconciliationResult
  ledgerTransactionIds[]
  exceptions[]
  immutableAuditTimeline[]
  generatedAt
  packHash
```

The pack must make it possible to answer for each settled amount:

- why did the money leave BThwani?
- for whom?
- how much?
- which destination version was approved?
- who prepared and approved it?
- which batch contained it?
- who executed it?
- what external reference/evidence exists?
- did the official statement confirm it?
- what ledger transaction finalized it?
- were any exceptions involved?

---

# 23. DailyFinanceClose — no silent unfinished money

The legacy `DailyReconciliation` / close-gate concept is retained as a real backend-governed financial close.

A business date cannot close while material unresolved conditions exist, including:

- payout approved but unintentionally left unbatched;
- frozen batch not fully accounted for;
- executed transfer missing evidence/reference;
- execution awaiting independent verification;
- verified transfer not reconciled;
- unresolved material reconciliation variance;
- unmatched provider statement row requiring action;
- open blocking finance exception;
- batch control-total mismatch;
- ledger/control totals not balanced under policy.

Canonical gate:

```text
all required evidence complete
AND all required approvals complete
AND batch totals reconcile
AND external statement reconciliation complete
AND no blocking exceptions
AND financial control totals balanced
        |
        v
ALLOW DAILY CLOSE
```

Otherwise:

```text
BLOCK CLOSE
+ explicit unresolved exposure
+ owners
+ reasons
```

---

# 24. Finance Exception Queue

Financial anomalies must become first-class records, not free-text notes.

Canonical examples:

```text
MISSING_RECEIPT
MISSING_EXTERNAL_REFERENCE
AMOUNT_MISMATCH
BENEFICIARY_MISMATCH
DUPLICATE_TRANSFER
DUPLICATE_EXTERNAL_REFERENCE
STATEMENT_NOT_FOUND
BATCH_TOTAL_MISMATCH
DESTINATION_CHANGED
EXECUTION_TIMEOUT
RECONCILIATION_VARIANCE
UNEXPECTED_EXTERNAL_TRANSACTION
CONTROL_TOTAL_MISMATCH
```

Each exception records:

```text
exception_id
type
severity
financial_exposure
related_entity_ids
opened_at
opened_by/automatic_source
owner
resolution
resolution_reason
resolution_evidence
resolved_at
resolved_by
approval_if_required
```

Blocking exceptions prevent the relevant payout/batch/day from falsely closing.

---

# 25. Duplicate and anomaly protection

Server-side protections must include:

- payout idempotency;
- batch idempotency;
- unique external reference controls where valid;
- duplicate statement import detection;
- duplicate evidence-reference detection;
- warnings/holds for suspicious same-beneficiary/same-amount repetitions;
- destination-change risk signal;
- recent financial-adjustment risk signal;
- configurable enhanced review for high-value/sensitive transactions.

Threshold amounts belong in versioned finance policy, never hard-coded architecture documentation.

---

# 26. Audit trail

Every sensitive action is append-only/auditable, including:

```text
PAYOUT_REQUESTED
FUNDS_HELD
DESTINATION_VERIFIED
PAYOUT_PREPARED
PAYOUT_APPROVED
BATCH_CREATED
BATCH_FROZEN
EXECUTION_FILE_EXPORTED
TRANSFER_EXECUTED
EVIDENCE_ADDED
TRANSFER_VERIFIED
STATEMENT_IMPORTED
RECONCILIATION_MATCHED
EXCEPTION_OPENED
EXCEPTION_RESOLVED
LEDGER_FINALIZED
PAYOUT_COMPLETED
DAY_CLOSED
```

Do not put secrets or full sensitive wallet identifiers into every audit event.

Prefer references such as:

```text
destination_id
destination_version
masked_identifier
snapshot_hash
```

The unmasked identifier remains encrypted in its canonical secure storage.

---

# 27. Step-up security for sensitive finance operations

Production controls should support re-authentication/MFA or equivalent step-up authorization for sensitive operations such as:

- verifying/changing a payout destination;
- approving sensitive/high-value payout or batch;
- freezing a batch;
- exporting unmasked execution data;
- performing privileged settlement actions;
- overriding/closing blocking exceptions;
- closing the financial day.

Authorization tokens/approvals must be server-owned, scoped, time-limited where appropriate, and not reusable for a different transaction.

---

# 28. Reminder/escalation engine

The system must reduce dependence on employee memory.

Policy-driven reminders/escalations should detect conditions such as:

```text
approved payout not batched within policy window
frozen/exported batch not executed
executed transfer missing evidence
transfer waiting for independent verification
verified transfer waiting for reconciliation
end-of-day unresolved settlement exposure
```

Time windows are configuration/policy, not hard-coded architecture constants.

---

# 29. Treasury view for BThwani external wallet accounts

External official-wallet balances are operational treasury facts, not WLT wallet balances.

WLT/Finance should maintain controlled views such as:

```text
ExternalProviderAccount
  provider_key
  account_reference
  currency
  opening_external_balance
  expected_incoming
  expected_outgoing
  fees
  expected_closing_balance
  actual_closing_balance
  variance
  statement_reference
  reconciliation_status
```

This enables reconciliation at two levels:

1. each individual transfer/payment;
2. the entire external wallet account/control total.

External liquidity fragmentation across multiple providers must be visible before multiple production rails are enabled.

---

# 30. Cash-In provider architecture

Cash-In remains pluggable and provider-independent.

Target:

```text
                       BTHWANI WLT
                            |
                  FinancialRailRouter
                            |
                    ProviderRegistry
                            |
             +--------------+--------------+
             |                             |
        Common Rail                    Direct Rail
      WeNet/acquirer                  wallet adapter
             |                             |
      supported wallets                one provider
```

A common switch is preferred when commercially/technically suitable, but is not a mandatory architectural dependency.

A direct adapter is an expected supported topology, not a failure of the design.

## 30.1 Launch strategy

Adopt:

> **One active real Cash-In provider/rail at launch, multi-provider architecture from day one.**

Implement only providers for which BThwani has approved contract/technical evidence.

Do not implement speculative production adapters from public assumptions.

---

# 31. ProviderRegistry

Canonical server-owned registration:

```text
ProviderRegistration
  provider_key
  network_key
  acquirer_key
  environment
  contract_status
  operational_status
  supported_wallets
  capabilities
  credential_secret_reference
  webhook_verification_profile
  pricing_version
  settlement_profile
  enabled_operations
```

Capabilities must be proven by approved documentation/test evidence, not guessed from provider names.

Useful vocabulary includes:

```text
cash_in
payment_inquiry
signed_webhook
merchant_p2b
wallet_topup
qr
redirect
deep_link
purchase_code
merchant_binding
refund_full
refund_partial
statement_export
settlement_report
reconciliation_feed
idempotency
```

Missing/unknown capability fails closed.

---

# 32. FinancialRailRouter

The router is server-owned and chooses only eligible routes based on:

```text
operation
actor/purpose
currency
amount
provider capabilities
contract status
operational health
stakeholder policy
pricing policy
environment
```

At launch, use deterministic configuration such as a primary route plus controlled fallback.

Do not build complex smart cost routing before at least two real production rails exist and are proven.

## 32.1 Ambiguous external results must not auto-failover

Forbidden:

```text
Provider A mutation times out
        -> immediately send same money movement through Provider B
```

Correct:

```text
Provider A result unknown
        -> inquiry/webhook/reconciliation
        -> establish authoritative outcome
        -> only then allow a new governed attempt if safe
```

This prevents duplicate external movements.

---

# 33. Rail interfaces — current and future

The current target production interface is Cash-In oriented:

```go
type CashInRail interface {
    Capabilities(ctx context.Context) Capabilities
    CreatePayment(ctx context.Context, req CreatePaymentRequest) (CreatePaymentResult, error)
    InquirePayment(ctx context.Context, req PaymentInquiryRequest) (PaymentResult, error)
    VerifyAndNormalizeWebhook(ctx context.Context, headers http.Header, body []byte) (NormalizedProviderEvent, error)
}
```

Refund capability should remain separate where supported:

```go
type RefundRail interface {
    CreateRefund(ctx context.Context, req RefundRequest) (RefundResult, error)
    InquireRefund(ctx context.Context, req RefundInquiryRequest) (RefundResult, error)
}
```

**Automated Cash-Out/Payout is not part of the current production target.**

A future `AutomatedPayoutRail` may be introduced only if a licensed/contracted provider actually exposes a suitable capability and BThwani approves its legal, security, reconciliation, and operational model.

Until then, stakeholder payouts use `ManualSettlementExecution`.

---

# 34. Simulator and environments

The existing financial-provider simulator remains valuable and permanent for non-production use.

Use it for:

- local development;
- deterministic automated tests;
- timeout/unknown-result simulation;
- duplicate/replay cases;
- webhook verification tests;
- reconciliation scenarios;
- provider outage scenarios.

Production must fail closed unless a real approved adapter/configuration exists.

Mock/sandbox must never become an accidental production fallback.

---

# 35. Canonical provider event finalization

Provider-specific payloads must terminate at the adapter boundary.

Canonical flow:

```text
Provider-specific request/webhook
        |
        v
Adapter authentication/signature verification
        |
        v
Normalize to WLT provider event
        |
        v
ApplyAuthoritativeProviderEvent
        |
        +-- legal state transition
        +-- provider-event idempotency/replay protection
        +-- reconciliation update
        +-- WLT ledger posting
        +-- downstream outbox/event projection
```

The existing `ApplyAuthoritativeProviderEvent` pattern should remain the canonical finalization seam and be extended, not bypassed.

---

# 36. Refund policy follows original money source

Refund semantics are server-owned and source-aware:

```text
Internal BThwani wallet payment
   -> refund/credit internal wallet according to policy

External official-wallet payment
   -> original-rail refund if provider/contract supports it
   -> otherwise governed finance exception/manual refund process

COD
   -> COD-specific reversal/refund accounting
```

Do not silently convert an external-wallet refund into internal BThwani balance merely because it is easier technically, unless approved product/legal policy explicitly allows it.

---

# 37. Ledger remains the sole accounting kernel

All financial value changes pass through the canonical WLT double-entry kernel.

Required invariants include:

- at least two lines per transaction;
- positive amounts;
- debit/credit validity;
- balanced entries per currency;
- idempotent transaction references;
- operator/system context;
- exact replay/conflict detection.

No frontend, reconciliation UI, spreadsheet, provider callback, or DSH handler writes a balance directly.

---

# 38. Canonical accounting examples

## 38.1 Customer top-up

```text
Dr provider_clearing
Cr wallet_liability(customer)
```

## 38.2 Captain top-up

```text
Dr provider_clearing
Cr wallet_liability(captain)
```

## 38.3 Provider settlement with BThwani-absorbed fee

Example only:

```text
Gross provider clearing 10,000
Provider settles          9,900
Fee                         100

Dr external_settlement_cash   9,900
Dr payment_processing_expense   100
Cr provider_clearing         10,000
```

The ledger classifier must support real account classes, including at least:

```text
asset
liability
income
expense
```

Do not let unknown/new expense accounts fall through to `liability` classification.

## 38.4 Fees

Fee policy may be:

```text
fixed
percentage
fixed_plus_percentage
tiered
capped
```

Fee bearer may be:

```text
platform
customer_explicit
shared
```

Never hide a fee by net-crediting the internal wallet unless policy/accounting explicitly specifies that treatment.

A constant percentage fee is not reduced merely by batching transactions; batching only reduces fixed/minimum/operational overhead unless the commercial tariff itself changes.

---

# 39. Finance Control Center

The useful information architecture from the legacy financial workspace should be retained, but rebuilt on canonical runtime truth.

Recommended sections:

```text
Finance Command Center
Ledger & Financial Events
Payments & Internal Wallets
External Wallet Accounts
Payout Requests
Settlement Batches
Manual Transfer Execution
Evidence & Audit Packs
Reconciliation
Finance Exceptions
Commissions & Fees
Refunds & Holds
Policies & Approvals
Daily Finance Close
Reports
```

The control panel is an operational/read-control surface. It is not a parallel ledger.

---

# 40. Legacy concepts intentionally retained

The old `bthwani-suite` repository contains useful concepts that should be **re-implemented**, not copied as runtime truth:

## 40.1 Retain and upgrade

```text
DailyReconciliationWorkbench
  -> Settlement/Reconciliation Workbench

Daily reconciliation read model
  -> expected / actual / variance / evidence / reconciliation runtime model

Maker-Checker preview
  -> mandatory backend Approval/SoD policy

AuditPack preview
  -> SettlementAuditPack

FinanceClose / Close Gate
  -> DailyFinanceClose

Finance registry
  -> Finance Control Center

Exception/variance model
  -> Finance Exception Queue

Posting-rule concepts
  -> versioned WLT Ledger Posting Policies

Subledger/read models
  -> reporting/read models only above the canonical ledger
```

## 40.2 Do not revive

Do not copy/reintroduce:

- bank/IBAN as the target stakeholder payout product model;
- provider-managed automated payout as V1 truth;
- frontend financial authority;
- preview/mock data as runtime truth;
- parallel subledgers as independent sources of truth;
- generic `bank-statement` assumptions where official-wallet/provider evidence is the real source;
- legacy COD calculations that do not support order-specific allocation/reserve;
- legacy hard-coded fees, thresholds, or provider semantics.

---

# 41. Target canonical financial event taxonomy

Use a stable, versioned vocabulary such as:

```text
CUSTOMER_WALLET_TOPUP
CAPTAIN_TOPUP

CAPTAIN_COD_RESERVE
CAPTAIN_COD_RELEASE
CAPTAIN_COD_DEBIT
CAPTAIN_DELIVERY_EARNING
CAPTAIN_COMMISSION

PARTNER_ORDER_EARNING
FIELD_COMMISSION_CANDIDATE
FIELD_COMMISSION_EARNING

PAYOUT_REQUESTED
PAYOUT_HOLD
PAYOUT_RELEASE

SETTLEMENT_BATCH_CREATED
SETTLEMENT_BATCH_FROZEN

MANUAL_EXTERNAL_TRANSFER_RECORDED
MANUAL_EXTERNAL_TRANSFER_VERIFIED

PROVIDER_STATEMENT_IMPORTED
PROVIDER_STATEMENT_MATCHED
RECONCILIATION_EXCEPTION

PAYOUT_COMPLETED
DAILY_FINANCE_CLOSED
```

Exact names are implementation details, but the semantic distinctions are mandatory.

---

# 42. Security invariants

Production must fail closed if any required invariant is unavailable.

Minimum invariants:

1. WLT is the only balance/accounting writer.
2. Provider identity never determines ledger account selection.
3. No client-supplied amount overrides server-owned financial truth.
4. No unverified settlement destination can receive payout.
5. Approved payout data cannot be edited in place.
6. Frozen batches are immutable.
7. No bare `mark paid` state transition.
8. External execution requires evidence/reference according to policy.
9. Execution and independent verification are separated where required.
10. Reconciliation mismatch blocks final completion/close.
11. Duplicate/replay/idempotency controls apply at every financial boundary.
12. Provider webhooks are authenticated before normalization/finalization.
13. Sensitive wallet identifiers are encrypted and masked.
14. Secrets live outside source code and outside client bundles.
15. Mock/sandbox can never serve as accidental production fallback.
16. Audit events are append-only and protected.
17. Spreadsheet artifacts do not become financial truth.
18. Manual overrides create explicit auditable exceptions, never silent mutations.

---

# 43. Observability and operational controls

Metrics/alerts should cover at least:

```text
cash-in creation/success/failure/unknown result
webhook signature failure/replay
provider inquiry latency/error
unreconciled provider events
wallet top-up posting latency
COD reserve conflicts
payout holds
approved-but-unbatched payouts
frozen-but-unexecuted batches
executed-without-evidence transfers
verification backlog
reconciliation exceptions
unmatched statement rows
batch control-total variance
external wallet account variance
daily close blocked exposure
```

Observability never substitutes for accounting evidence.

---

# 44. Backup and disaster recovery

The canonical database/object storage must preserve:

- payout requests;
- holds;
- destination versions;
- immutable payout snapshots;
- approvals;
- settlement batches;
- generated-artifact metadata/hashes;
- execution records;
- evidence metadata/files;
- provider statement imports;
- reconciliation results;
- exceptions;
- audit events;
- ledger transactions;
- daily close records.

Losing an employee laptop or XLSX file must not lose the financial history.

Backup/restore procedures must be tested, not merely configured.

---

# 45. Current code gaps to remove before real-money production

The target architecture requires resolving at least these gaps in the current codebase:

## P0 — before real money

1. Introduce server-owned `PaymentAllocation` for COD/wallet/mixed/official-wallet payment composition.
2. Make delivery-fee accounting explicit so it cannot be counted twice.
3. Implement order-specific atomic captain COD reserve/release/final debit.
4. Replace bank/IBAN-oriented payout target model with `OfficialWalletDestination` for the target product path.
5. Implement destination verification lifecycle and require `VERIFIED/ACTIVE_FOR_PAYOUT` before hold/execution.
6. Replace provider-managed payout as the current target journey with `ManualSettlementExecution`.
7. Implement unified `PayoutRequest` + hold lifecycle for partner/captain/field.
8. Implement immutable `ApprovedPayoutSnapshot`.
9. Implement backend-enforced Maker/Checker/Executor/Reconciler controls.
10. Implement immutable `SettlementBatch`, batch control totals, and hashes.
11. Implement generated XLSX artifact metadata/hash plus audit.
12. Implement `ManualTransferEvidence` and prevent bare `mark paid`.
13. Implement provider/official-wallet statement import and four-way reconciliation.
14. Implement `SettlementAuditPack`.
15. Implement `DailyFinanceClose` with blocking gates.
16. Correct ledger account classification for expenses and external settlement assets.
17. Implement/finish customer + captain Cash-In through canonical `CashInRail`.
18. Keep production provider mode fail-closed until real provider evidence/configuration exists.

## P1 — before broad commercial scale

1. Finalize field commission trigger on the governed successful commercial event (`client_visible` or its canonical successor).
2. Complete partner settlement end-to-end on the unified payout engine.
3. Add Finance Exception Queue and resolution workflow.
4. Add treasury/external-wallet account reconciliation views.
5. Finalize source-aware refund mapping.
6. Add step-up authentication for sensitive finance actions.
7. Add reminder/escalation engine.
8. Add finance dashboards for unresolved external-settlement exposure.
9. Version posting rules, fee policies, eligibility policies, and close policies.

## P2 — only after the core is proven

1. Add a second real Cash-In provider/rail.
2. Add more sophisticated routing where justified.
3. Automate statement reconciliation if provider feeds/APIs become available.
4. Add automated payout only if future provider, legal, security, finance, and reconciliation requirements are all proven and approved.

---

# 46. Required test matrix

At minimum, test:

## Cash-In

- successful customer top-up;
- successful captain top-up;
- duplicate intent;
- duplicate webhook;
- conflicting replay;
- provider timeout before mutation;
- provider timeout with unknown result;
- webhook/inquiry disagreement;
- statement-only recovery;
- fee posting;
- unsupported provider capability;
- mock accidentally requested in production.

## COD / order allocation

- COD amount smaller/equal/larger than captain available balance;
- concurrent assignment reserve race;
- cancellation releases reserve exactly once;
- delivery converts reserve to debit exactly once;
- delivery earning credited once;
- mixed payment allocation conservation;
- full electronic payment creates zero COD exposure.

## Destination / payout

- unverified destination rejected;
- destination change forces re-verification;
- approved snapshot remains immutable;
- duplicate payout request idempotency;
- hold/release correctness;
- unauthorized role transition rejected;
- SoD conflict rejected/explicitly governed.

## Batch / manual execution

- frozen batch cannot mutate;
- batch row count/total exact;
- generated XLSX hash recorded;
- duplicate external reference rejected where required;
- execution without evidence blocked;
- executor cannot alter beneficiary/amount/destination;
- incomplete batch cannot complete.

## Reconciliation / close

- exact four-way match;
- amount mismatch;
- destination mismatch;
- missing external transaction;
- unknown external transaction;
- duplicate statement import;
- unresolved exception blocks completion;
- blocking exposure prevents daily close;
- resolved zero-variance day closes once idempotently.

---

# 47. Explicitly forbidden architectures

Do not implement:

- a separate ledger per provider;
- a separate wallet system per stakeholder/provider;
- frontend balance mutation;
- screenshot-based top-up success;
- manual payout completion without governed execution evidence;
- editable frozen settlement spreadsheets as source of truth;
- automatic provider failover after an ambiguous mutation result;
- provider-name branching throughout business code;
- hard-coded provider fees or capabilities without approved evidence;
- unrestricted reuse of external references;
- unverified payout destinations;
- silent financial overrides;
- parallel preview/subledger databases as financial authority;
- automated Cash-Out in V1 merely because a generic provider interface exists.

---

# 48. Final target

```text
                              BTHWANI WLT
                                   |
                         ONE FINANCIAL TRUTH
                                   |
                  +----------------+----------------+
                  |                                 |
               CASH-IN                         INTERNAL MONEY
                  |                                 |
        FinancialRailRouter                  wallets + ledger
                  |                                 |
          ProviderRegistry                         |
          /             \                           |
   Common Switch      Direct Rail                   |
          |               |                         |
          +------- authoritative evidence ----------+
                                   |
                          payments / top-ups
                                   |
        +--------------------------+--------------------------+
        |                          |                          |
     Customer                    Captain               Partner / Field
                                   |
                          COD reserve + earnings
                                   |
                            PayoutRequest
                                   |
                                 HOLD
                                   |
                      verified wallet destination
                                   |
                        Maker / Checker approval
                                   |
                           SettlementBatch
                                   |
                                FREEZE
                                   |
                      XLSX + Execution Workbench
                                   |
                      manual official-wallet transfer
                                   |
                     reference + evidence + checker
                                   |
                         provider/wallet statement
                                   |
                      FOUR-WAY RECONCILIATION
                                   |
                         SettlementAuditPack
                                   |
                        ledger finalization
                                   |
                              COMPLETED
                                   |
                         DailyFinanceClose
```

The operational rule is:

> **There is no financial state called simply “paid”. A settlement is requested, held, verified, approved, frozen into a batch, executed externally, evidenced, independently checked, reconciled, ledger-finalized, and only then completed.**

The architecture deliberately keeps the real-money provider boundary replaceable while making WLT accounting, audit, reconciliation, and stakeholder financial rules stable.

---

# 49. Final decision summary

BThwani should proceed with:

- **one WLT**;
- **one canonical double-entry ledger**;
- **one internal wallet per actor**;
- **one server-owned PaymentAllocation per order**;
- **Cash-In through approved official-wallet rails**;
- **captain top-up through the same Cash-In engine as customer top-up**;
- **captain COD as an atomic reserve/debit on the same wallet**;
- **partner/captain/field settlement through one PayoutRequest engine**;
- **verified official-wallet destinations only**;
- **manual external Cash-Out settlement as the current production model**;
- **SettlementBatch + immutable snapshot + hash**;
- **XLSX as an execution artifact only**;
- **ExecutionWorkbench + evidence + independent verification**;
- **provider/official-wallet statement reconciliation**;
- **SettlementAuditPack**;
- **Finance Exception Queue**;
- **DailyFinanceClose**;
- **one active real Cash-In rail initially, multi-provider architecture from day one**;
- **simulator retained permanently for non-production testing**;
- **future automated payout only after explicit capability, contractual, legal, security, accounting, and reconciliation proof**.

This is the canonical target architecture to use when changing WLT backend, database migrations, finance control-panel flows, DSH financial boundaries, mobile journeys, tests, and governance documentation.