# WLT External Wallet & Settlement Architecture

**Status:** Canonical target architecture / implementation decision record  
**Service:** `WLT` — Wallet / Financial Truth  
**Branch:** `BB`  
**Updated:** 2026-08-13  
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
- beneficiary payout intent;
- Finance-controlled financial master data;
- governed manual external settlements;
- settlement batches and XLSX execution files;
- evidence, audit, reconciliation, exceptions, and daily finance close;
- external wallet rails/providers;
- accounting and double-entry rules;
- finance control-panel responsibilities;
- migration from legacy/preview financial concepts.

The architecture is intentionally designed so that external-wallet providers can change without changing WLT's accounting truth or stakeholder business rules.

The financial-control objective is stronger than merely preventing direct balance writes:

> **All authoritative monetary values must be derived automatically from trusted operational events, canonical WLT state, and versioned financial policy.**

> **Partner, captain, and field applications never own or mutate official payout-destination master data and never calculate authoritative payout totals.**

> **Finance staff operate from system-calculated financial truth and governed legal transitions; they do not establish accounting truth through manual arithmetic, free-form balance edits, or generic monetary override fields.**

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

> **Every amount, earning, commission, fee, hold, payable, eligibility result, settlement total, and financial variance is server-derived. Human input may express governed intent, evidence, or approved master-data change; it never overrides canonical monetary truth.**

> **Beneficiaries request payout intent only. WLT resolves the current eligible amount and the current verified active payout destination.**

This distinction is mandatory:

```text
AUTOMATIC FINANCIAL TRUTH
  = event/policy-derived accounting, balances, earnings, holds,
    payout eligibility, control totals, reconciliation and readback

MANUAL EXTERNAL EXECUTION
  = an authorized Finance executor performs the real transfer in the
    official wallet application when no approved payout API exists
```

Manual external execution does **not** authorize manual accounting.

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

No actor or operator directly edits these balances. They are projections of canonical ledger transactions and governed state transitions.

---

# 4. Stakeholder financial model

| Stakeholder | Internal BThwani wallet | Cash-In / Top-up | COD | Earnings | Settlement request | External settlement |
|---|---:|---:|---:|---:|---:|---|
| Customer | Yes | Yes | Pays when applicable | No | No by default | N/A |
| Captain | Yes | Yes | Financially reserved/debited from same wallet | Delivery/commission, automatically derived | Yes: `FULL_AVAILABLE` or `SPECIFIED` | Manual governed official-wallet transfer |
| Partner | Yes | Optional only if product requires it | Receives governed order proceeds | Sales/net settlement, automatically derived | Yes: `FULL_AVAILABLE` or `SPECIFIED` | Manual governed official-wallet transfer |
| Field | Yes | Not required by default | No | Field commission, automatically derived | Yes: `FULL_AVAILABLE` or `SPECIFIED` | Manual governed official-wallet transfer |
| BThwani | Central WLT ledger | Receives external funds | Owns accounting truth | Fees/commissions | Operates settlement | Uses official corporate wallet accounts |

No stakeholder gets a parallel financial system per provider.

Partner, captain, and field surfaces may display only masked official-wallet destination state. They do not create, update, deactivate, replace, or select destination master data.

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

The customer never submits the authoritative credited amount after provider confirmation. WLT binds provider evidence to the original server-owned funding intent.

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

Every effect is produced from a trusted event and approved policy. The captain does not enter a COD amount, earning amount, commission amount, hold amount, or settlement destination.

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
Order-specific COD amount from governed PaymentAllocation
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

The order assignment event and canonical PaymentAllocation drive the financial effect. The captain application only receives/readbacks the resulting state.

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

The UI may explain these effects but may not calculate or alter them.

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
  cash_amount
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

No actor or Finance operator may type an authoritative allocation component as a manual correction. A legitimate correction requires a governed source event/policy transition and corresponding auditable WLT effect.

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
+/- governed typed adjustments
= partner payable
```

DSH provides operational evidence. WLT owns the financial calculation and posting.

The partner never types gross proceeds, fees, commission, net payable, or payout destination. The partner reads the result and may request `FULL_AVAILABLE` or `SPECIFIED` payout only.

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

The field actor never creates or edits commission value and never enters payout-destination data. The application displays the automatically derived commission/wallet state and allows payout intent only.

---

# 10. OfficialWalletDestination — WLT-owned Finance master data

The target payout destination is an official electronic-wallet account, not a bank/IBAN product model.

It is sensitive financial master data and is **not beneficiary self-service data**.

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
  change_reason
  submitted_at
  submitted_by
  verified_at
  verified_by
  approved_at
  approved_by
  verification_method
  verification_evidence_reference
  change_evidence_references[]
  created_at
  updated_at
```

Minimum lifecycle:

```text
CANDIDATE
  -> PENDING_VERIFICATION
  -> VERIFIED
  -> PENDING_APPROVAL       // when approval policy requires it
  -> ACTIVE_FOR_PAYOUT

or

PENDING_VERIFICATION / PENDING_APPROVAL
  -> REJECTED

ACTIVE_FOR_PAYOUT
  -> SUSPENDED / RETIRED
```

A generic `active=true` flag is never a substitute for verified status.

## 10.1 Ownership and beneficiary restrictions

For `partner`, `captain`, and `field`:

```text
Beneficiary application
   -> may read masked destination + status
   -> may NOT create destination
   -> may NOT update destination
   -> may NOT deactivate destination
   -> may NOT replace destination
   -> may NOT choose destination for a payout
   -> may NOT submit provider / beneficiary / wallet identifier in payout intent
```

This prohibition must exist in backend authorization and contracts, not only in UI hiding.

Any legacy self-service destination mutation endpoint or shared component must be removed, retired, or fail closed for beneficiary actors.

## 10.2 Initial provisioning

Destination data should be captured once through the appropriate governed onboarding/orchestration flow and persisted/owned by WLT.

For captain and field, the conceptual flow is:

```text
Operations / Workforce provisioning
        -> actor/profile established
        -> authorized destination candidate capture
        -> WLT OfficialWalletDestination candidate
        -> provider/account verification when available
        -> Finance review
        -> required independent approval
        -> ACTIVE_FOR_PAYOUT
```

For partner:

```text
Partner onboarding
        -> authorized destination candidate capture
        -> WLT OfficialWalletDestination candidate
        -> provider/account verification when available
        -> Finance review
        -> required approval
        -> ACTIVE_FOR_PAYOUT
```

Workforce, DSH, or onboarding orchestration may collect the candidate only as part of an authorized workflow. They do not become the long-term financial source of truth. WLT owns the canonical destination version and lifecycle.

If an approved provider exposes an authoritative verification API, use it. If no such API exists, a Finance-authorized operator may capture the externally evidenced identifier through the governed master-data workflow. That is a controlled operational necessity, not beneficiary free-form input and not a manual accounting calculation.

## 10.3 Destination change — Finance only

Trust never transfers automatically to a changed wallet number.

The canonical change flow is:

```text
Current destination = VERIFIED + ACTIVE_FOR_PAYOUT
        |
        v
Authorized Finance Maker requests change
        |
        +-- mandatory reason
        +-- required evidence
        +-- step-up authorization when policy requires
        |
        v
New destination version = PENDING_VERIFICATION
        |
        v
provider/account verification or governed evidence review
        |
        v
required independent Finance/management approval
        |
        v
New version = ACTIVE_FOR_PAYOUT
Old version = immutable historical version / RETIRED
```

The beneficiary does not initiate the technical mutation by submitting a new wallet identifier.

An already held, approved, frozen, or executing payout is not silently rewritten after a destination change. It remains bound to its pinned destination version unless it is explicitly cancelled/rejected and re-created through the governed flow.

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
Beneficiary submits payout intent
  amountMode = FULL_AVAILABLE | SPECIFIED
  amount only when SPECIFIED
        |
        v
WLT resolves actor + eligible available funds transactionally
        |
        v
WLT resolves current VERIFIED + ACTIVE_FOR_PAYOUT destination
        |
        v
WLT pins destination version + resolved amount
        |
        v
Funds placed on HOLD
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

Finance does not manually calculate the payout amount or destination. Those are already resolved and pinned by WLT before execution.

---

# 13. Unified PayoutRequest — intent in, server truth out

Partner, captain, and field must use one canonical payout engine.

## 13.1 Beneficiary request contract

The beneficiary-facing write contract should be intentionally narrow:

```text
PayoutIntentInput
  amount_mode        // FULL_AVAILABLE | SPECIFIED
  amount?            // required only when SPECIFIED
  idempotency_key
```

It must not accept beneficiary-selected:

```text
destination_id
provider_key
beneficiary_name
wallet_identifier
wallet_reference
resolved_available_balance
resolved_full_payout_amount
```

For `FULL_AVAILABLE`, the client must not read `balance = X` and submit `amount = X` as authoritative truth.

## 13.2 Server-side eligible amount

WLT calculates the eligible amount at mutation time inside the authoritative transaction/locking boundary.

Conceptually:

```text
eligibleAvailable =
    canonical available balance
  - active holds
  - active reservations
  - pending payout reservations
  - unsettled/non-final amounts
  - restricted/disputed amounts
  - any policy-defined non-withdrawable principal
```

Exact implementation may use ledger projections/reservation tables, but there must be one server-owned result.

Rules:

```text
FULL_AVAILABLE:
  resolved_amount = current eligibleAvailable
  require resolved_amount > 0

SPECIFIED:
  require amount > 0
  require amount <= current eligibleAvailable
  resolved_amount = amount
```

The read/display state may become stale; the write transaction is authoritative.

## 13.3 Persisted payout model

After server resolution, the canonical persisted object may contain:

```text
PayoutRequest
  payout_id
  beneficiary_actor_type  // partner | captain | field
  beneficiary_actor_id
  amount_mode
  requested_amount?       // present only for SPECIFIED intent
  resolved_amount
  currency
  destination_id          // resolved by WLT, not selected by beneficiary
  destination_version     // immutable pin
  status
  hold_transaction_id
  policy_version
  idempotency_key
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
amount_mode
resolved_amount
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
DestinationMaker    -> prepares destination provision/change with reason/evidence
DestinationChecker  -> independently verifies/approves destination when required
PayoutMaker         -> prepares payout/batch
PayoutChecker       -> independently approves/rejects
Executor            -> performs manual external transfer
Reconciler          -> matches external evidence/statement
DayCloser           -> closes financial business date
```

Production rules must support, at minimum:

- approval permission separated from preparation permission;
- sensitive destination change permission separated from beneficiary access;
- execution permission separated from verification/reconciliation permission;
- server-side enforcement of legal state transitions;
- auditable identity/time for each action;
- mandatory reason/evidence for destination changes and governed adjustments;
- configurable enhanced approval for sensitive/high-value cases;
- no production mode in which required controls silently disappear because an environment variable was omitted.

Recommended invariants when SoD is applicable:

```text
destination_changed_by != destination_approved_by
executed_by            != independently_verified_by
```

Where staffing temporarily requires a controlled exception, the exception itself must be explicitly approved, reasoned, time-bounded, and audited. It must not be an invisible bypass.

A Finance role is not permission to edit balances or invent settlement totals. Monetary truth remains WLT-derived.

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

`row_count` and `total_amount` are computed from approved immutable payout snapshots; the operator does not type the control total.

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

No edited XLSX value can flow back into the authoritative batch, payout, destination, or ledger.

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

The workbench must display system-calculated batch count, remaining rows, control total, executed total, outstanding total, and reconciliation state. Staff must not need to calculate these manually.

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

The `amount`, `currency`, and `destination_version` come from the approved snapshot. The executor records evidence/reference, not a replacement accounting amount.

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

Variance values are computed by WLT. Finance classifies/resolves the exception with evidence; it does not manually overwrite the expected truth to force zero variance.

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
  destinationChangeApprovals[]
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
- how much and how was it derived?
- which destination version was approved?
- who created/changed/verified/approved that destination version?
- who prepared and approved the payout?
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
- ledger/control totals not balanced under policy;
- unapproved or unverified destination state affecting pending payout;
- direct/manual authoritative financial mutation detected.

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

All exposure/control totals are calculated by WLT.

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
DESTINATION_UNVERIFIED
DESTINATION_APPROVAL_MISSING
EXECUTION_TIMEOUT
RECONCILIATION_VARIANCE
UNEXPECTED_EXTERNAL_TRANSACTION
CONTROL_TOTAL_MISMATCH
UNAUTHORIZED_FINANCIAL_MUTATION
MANUAL_MONETARY_OVERRIDE_ATTEMPT
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
- destination-version mutation idempotency where applicable;
- batch idempotency;
- unique external reference controls where valid;
- duplicate statement import detection;
- duplicate evidence-reference detection;
- warnings/holds for suspicious same-beneficiary/same-amount repetitions;
- destination-change risk signal;
- recent financial-adjustment risk signal;
- configurable enhanced review for high-value/sensitive transactions;
- rejection of beneficiary destination mutation attempts;
- rejection of generic manual monetary overrides.

Threshold amounts belong in versioned finance policy, never hard-coded architecture documentation.

---

# 26. Audit trail

Every sensitive action is append-only/auditable, including:

```text
DESTINATION_CANDIDATE_CREATED
DESTINATION_CHANGE_REQUESTED
DESTINATION_VERIFIED
DESTINATION_APPROVED
DESTINATION_ACTIVATED
DESTINATION_SUSPENDED

PAYOUT_REQUESTED
PAYOUT_AMOUNT_RESOLVED
PAYOUT_DESTINATION_RESOLVED
FUNDS_HELD
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
policy_version
```

The unmasked identifier remains encrypted in its canonical secure storage.

---

# 27. Step-up security for sensitive finance operations

Production controls should support re-authentication/MFA or equivalent step-up authorization for sensitive operations such as:

- creating/changing/verifying/approving a payout destination;
- approving sensitive/high-value payout or batch;
- freezing a batch;
- exporting unmasked execution data;
- performing privileged settlement actions;
- overriding/closing blocking exceptions;
- authorizing governed financial adjustments;
- closing the financial day.

Authorization tokens/approvals must be server-owned, scoped, time-limited where appropriate, and not reusable for a different transaction.

---

# 28. Reminder/escalation engine

The system must reduce dependence on employee memory.

Policy-driven reminders/escalations should detect conditions such as:

```text
destination candidate awaiting verification/approval
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

Expected incoming/outgoing, expected closing balance, and variance are calculated automatically. Finance may record authoritative statement evidence/readback, not manually reshape expected WLT truth until it matches.

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

Until then, stakeholder payouts use `ManualSettlementExecution` while all internal financial calculation remains automatic.

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

Refund amounts are derived from original canonical allocation and completed refund policy, not manually typed as authoritative corrections.

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
- exact replay/conflict detection;
- typed reason and provenance for governed adjustments;
- no generic direct balance mutation.

No frontend, reconciliation UI, spreadsheet, provider callback, DSH handler, or Finance operator writes a balance directly.

Any legitimate adjustment must be represented by a specific governed transaction/event type whose amount is validated by its source/policy and whose reason/evidence/approval requirements are explicit.

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

All fee amounts are produced from versioned fee policy and canonical transaction facts.

---

# 39. Finance Control Center — system-calculated truth, operator-controlled actions

The useful information architecture from the legacy financial workspace should be retained, but rebuilt on canonical runtime truth.

Recommended sections:

```text
Finance Command Center
Ledger & Financial Events
Payments & Internal Wallets
External Wallet Accounts
Official-Wallet Destination Master Data
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

The system must calculate and display, as applicable:

```text
current canonical balances
available / held / pending / withdrawal-eligible
order allocation and COD exposure
partner/captain/field earnings and commissions
payout eligibility
resolved payout amount
settlement batch row count and control total
executed / outstanding settlement totals
expected vs actual external account balances
reconciliation variance
blocking financial exposure
legal next actions
```

Finance employees should not need to perform arithmetic to determine what is owed, what may be paid, whether a batch balances, or whether a day can close.

Forbidden Finance UI patterns include:

```text
editable current balance
editable earned commission
editable partner payable
editable payout resolved amount
editable frozen batch total
generic "financial override amount"
manual calculator field whose result becomes authoritative truth
```

Where a business correction is legitimate, expose a named governed workflow such as an approved adjustment/refund/fee-policy/destination-change action with server validation, reason, evidence, permission, audit, and approval rules.

---

# 40. Legacy concepts intentionally retained

The old `bthwani-suite` repository contains useful concepts that should be **re-implemented**, not copied as runtime truth.

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
- beneficiary self-service payout destination mutation;
- client-selected payout destination/provider/beneficiary identifiers;
- client-computed `FULL_AVAILABLE` payout amounts;
- manual authoritative balance/commission/payable edits;
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

DESTINATION_CANDIDATE_CREATED
DESTINATION_CHANGE_REQUESTED
DESTINATION_VERIFIED
DESTINATION_APPROVED
DESTINATION_ACTIVATED

PAYOUT_REQUESTED
PAYOUT_AMOUNT_RESOLVED
PAYOUT_DESTINATION_RESOLVED
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

# 42. Security and financial-authority invariants

Production must fail closed if any required invariant is unavailable.

Minimum invariants:

1. WLT is the only balance/accounting writer.
2. Provider identity never determines ledger account selection.
3. No client-supplied amount overrides server-owned financial truth.
4. All authoritative earnings, commissions, fees, holds, balances, payable totals, eligibility, control totals, and variances are server-derived from trusted events/state/policy.
5. Partner/captain/field cannot create, update, deactivate, replace, or select official-wallet payout destination master data.
6. Payout intent from a beneficiary contains only `FULL_AVAILABLE` or `SPECIFIED`, amount only for `SPECIFIED`, and idempotency context.
7. `FULL_AVAILABLE` is resolved transactionally by WLT; a displayed client balance is not the authoritative payout amount.
8. `SPECIFIED` must be positive and bounded by current server-owned eligible funds.
9. WLT resolves and pins the current verified active destination; the beneficiary does not choose `destinationId`, provider, beneficiary name, or wallet identifier.
10. No unverified settlement destination can receive payout.
11. Destination provision/change is Finance-controlled, versioned, reasoned, evidenced, verified, approved as required, and audited.
12. Approved payout data cannot be edited in place.
13. Frozen batches are immutable.
14. No bare `mark paid` state transition exists.
15. External execution requires evidence/reference according to policy.
16. Execution and independent verification are separated where required.
17. Reconciliation mismatch blocks final completion/close.
18. Duplicate/replay/idempotency controls apply at every financial boundary.
19. Provider webhooks are authenticated before normalization/finalization.
20. Sensitive wallet identifiers are encrypted and masked.
21. Secrets live outside source code and outside client bundles.
22. Mock/sandbox can never serve as accidental production fallback.
23. Audit events are append-only and protected.
24. Spreadsheet artifacts do not become financial truth.
25. Manual overrides create explicit typed auditable exceptions/transactions, never silent mutations.
26. Finance roles do not grant generic direct balance/commission/payable/settlement-total editing authority.
27. No required finance control silently disappears because an environment variable is absent.

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
financial event-to-readback latency
beneficiary destination mutation denials
destination verification/approval backlog
unauthorized monetary override attempts
payout FULL_AVAILABLE/SPECIFIED validation failures
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
- destination versions and destination-change approvals/evidence;
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

The target architecture requires resolving at least these gaps in the current codebase.

## P0 — before real money

1. Introduce/complete server-owned `PaymentAllocation` for COD/wallet/mixed/official-wallet payment composition.
2. Make delivery-fee accounting explicit so it cannot be counted twice.
3. Implement order-specific atomic captain COD reserve/release/final debit and automatic readback.
4. Retire bank/IBAN/manual-as-destination semantics from the target payout model; use `OfficialWalletDestination`.
5. Remove beneficiary self-service destination create/update/deactivate/replace/select behavior from partner/captain/field contracts, backend authorization, shared modules, and UI.
6. Implement WLT-owned destination provisioning/change lifecycle with Finance authorization, mandatory reason/evidence, versioning, verification, required approval, masking/encryption, and immutable history.
7. Implement beneficiary payout intent as `FULL_AVAILABLE | SPECIFIED` only; prohibit beneficiary-selected `destinationId`, provider, beneficiary name, or wallet reference.
8. Implement transactional server-side `FULL_AVAILABLE` resolution and positive/bounded `SPECIFIED` validation against current eligible funds.
9. Resolve and pin current `VERIFIED + ACTIVE_FOR_PAYOUT` destination server-side when accepting the payout.
10. Replace provider-managed payout as the current target journey with `ManualSettlementExecution`.
11. Implement unified `PayoutRequest` + hold lifecycle for partner/captain/field.
12. Implement immutable `ApprovedPayoutSnapshot`.
13. Implement backend-enforced Destination Maker/Checker and Payout Maker/Checker/Executor/Reconciler controls.
14. Implement immutable `SettlementBatch`, automatically calculated control totals, and hashes.
15. Implement generated XLSX artifact metadata/hash plus audit.
16. Implement `ManualTransferEvidence` and prevent bare `mark paid`.
17. Implement provider/official-wallet statement import and four-way reconciliation.
18. Implement `SettlementAuditPack`.
19. Implement `DailyFinanceClose` with blocking gates.
20. Eliminate generic/manual authoritative monetary edits from beneficiary and Finance surfaces; all legitimate corrections must be typed governed WLT transactions/events.
21. Correct ledger account classification for expenses and external settlement assets.
22. Implement/finish customer + captain Cash-In through canonical `CashInRail`.
23. Keep production provider mode fail-closed until real provider evidence/configuration exists.

## P1 — before broad commercial scale

1. Finalize field commission trigger on the governed successful commercial event (`client_visible` or its canonical successor).
2. Complete partner settlement end-to-end on the unified payout engine.
3. Add Finance Exception Queue and resolution workflow.
4. Add treasury/external-wallet account reconciliation views with automatically calculated expected/actual variance.
5. Finalize source-aware refund mapping.
6. Add step-up authentication for sensitive finance actions.
7. Add reminder/escalation engine.
8. Add finance dashboards for unresolved external-settlement exposure and legal next actions.
9. Version posting rules, fee policies, eligibility policies, destination approval policy, and close policies.

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
- financial effect appears from canonical order event without captain-entered amount;
- mixed payment allocation conservation;
- full electronic payment creates zero COD exposure.

## Destination / payout authority

- partner destination create rejected;
- partner destination update/deactivate/replace rejected;
- captain destination create/update/deactivate/replace rejected;
- field destination create/update/deactivate/replace rejected;
- beneficiary-selected `destinationId` rejected/absent from contract;
- beneficiary-supplied provider/beneficiary/wallet identifier rejected/absent from payout intent;
- Finance destination provisioning requires authorization;
- destination change requires reason and evidence;
- destination change creates a new version rather than mutating prior history;
- required destination verification and independent approval enforced;
- unverified destination rejected for payout;
- old/pinned destination version remains immutable after later change;
- unauthorized Finance/operator destination transition rejected;
- cross-operator-context destination access rejected.

## Payout amount resolution

- `FULL_AVAILABLE` with zero eligible funds rejected;
- `FULL_AVAILABLE` resolves current eligible funds server-side;
- `FULL_AVAILABLE` race where balance changes between read and write uses authoritative write-time value;
- active holds/reservations/pending payouts reduce eligible amount exactly once;
- disputed/restricted/non-withdrawable amounts are excluded according to policy;
- `SPECIFIED <= 0` rejected;
- `SPECIFIED > eligibleAvailable` rejected;
- valid `SPECIFIED` accepted;
- concurrent payout requests cannot over-reserve the same balance;
- duplicate payout request idempotency;
- payout pins the current verified active destination automatically.

## Automatic financial truth / manual authority negatives

- captain cannot submit earning/commission value;
- partner cannot submit net payable value;
- field cannot submit commission value;
- Finance cannot directly edit canonical wallet balance;
- Finance cannot directly edit earned commission/payable/resolved payout amount;
- typed governed adjustment requires reason/evidence/permission/approval as policy requires;
- server-calculated batch control total cannot be manually replaced;
- server-calculated reconciliation variance cannot be manually zeroed by changing expected truth.

## Batch / manual execution

- approved payout snapshot remains immutable;
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

## Multi-surface

- partner/captain/field destination display is masked and read-only;
- destination-unavailable state gives Finance-managed guidance without edit control;
- payout UI exposes only `FULL_AVAILABLE` and `SPECIFIED` semantics;
- amount input appears only for `SPECIFIED`;
- all automatic financial effects match canonical backend readback;
- control-panel displays calculated totals/variance/next actions without manual arithmetic fields;
- forbidden/offline/error states never fall back to local financial truth.

---

# 47. Explicitly forbidden architectures

Do not implement:

- a separate ledger per provider;
- a separate wallet system per stakeholder/provider;
- frontend balance mutation;
- beneficiary self-service official-wallet destination create/update/deactivate/replace;
- beneficiary-selected payout `destinationId`, provider, beneficiary name, or wallet identifier;
- client-computed `FULL_AVAILABLE` payout amount as authoritative truth;
- manually entered authoritative earnings, commissions, balances, payable totals, holds, eligibility, settlement totals, or reconciliation expected values;
- generic Finance `adjust balance` / `override amount` controls without a typed governed transaction model;
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
                 trusted operational events + policy
                                   |
                     AUTOMATIC FINANCIAL DERIVATION
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
                    order event -> COD reserve/earnings
                                   |
                  automatic balance/eligibility readback
                                   |
                  beneficiary payout intent only
                     FULL_AVAILABLE | SPECIFIED
                                   |
                         WLT resolves amount
                                   |
                 WLT resolves VERIFIED destination
                                   |
                       pins destination version
                                   |
                            PayoutRequest
                                   |
                                 HOLD
                                   |
                        Maker / Checker approval
                                   |
                           SettlementBatch
                      automatic control totals
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

> **There is no financial state called simply “paid”. A settlement is requested, amount-resolved, destination-resolved, held, verified, approved, frozen into a batch, executed externally, evidenced, independently checked, reconciled, ledger-finalized, and only then completed.**

And the financial-authority rule is:

> **Humans may request, approve, execute, evidence, reconcile, and govern master-data changes according to role. Humans do not calculate or edit the authoritative money truth.**

The architecture deliberately keeps the real-money provider boundary replaceable while making WLT accounting, financial authority, audit, reconciliation, and stakeholder rules stable.

---

# 49. Final decision summary

BThwani should proceed with:

- **one WLT**;
- **one canonical double-entry ledger**;
- **one internal wallet per actor**;
- **automatic server-derived monetary truth from trusted operational events and versioned policy**;
- **zero beneficiary direct financial-value mutation**;
- **one server-owned PaymentAllocation per order**;
- **Cash-In through approved official-wallet rails**;
- **captain top-up through the same Cash-In engine as customer top-up**;
- **captain COD as an atomic reserve/debit on the same wallet, triggered from governed order facts**;
- **partner/captain/field earnings and commissions automatically posted from canonical events**;
- **partner/captain/field payout destination display as masked read-only state**;
- **no beneficiary destination create/update/deactivate/replace/select path**;
- **WLT-owned official-wallet destination master data**;
- **initial destination provisioning through governed onboarding/Finance orchestration**;
- **Finance-only destination change with authorization, reason, evidence, versioning, verification, required approval, and audit**;
- **partner/captain/field settlement through one PayoutRequest engine**;
- **beneficiary payout intent limited to `FULL_AVAILABLE` or `SPECIFIED`**;
- **transactional server calculation of `FULL_AVAILABLE`**;
- **server validation of `SPECIFIED` against current eligible funds**;
- **server resolution and immutable pinning of the current verified active destination**;
- **verified official-wallet destinations only**;
- **manual external Cash-Out settlement as the current production execution model**;
- **automatic WLT accounting and control calculations even when external execution is manual**;
- **SettlementBatch + immutable snapshot + automatically calculated control total + hash**;
- **XLSX as an execution artifact only**;
- **ExecutionWorkbench + evidence + independent verification**;
- **provider/official-wallet statement reconciliation**;
- **SettlementAuditPack**;
- **Finance Exception Queue**;
- **DailyFinanceClose**;
- **Finance Control Center that presents calculated truth and next legal actions without requiring staff arithmetic**;
- **no generic manual balance, commission, payable, payout, or reconciliation override fields**;
- **typed governed adjustment workflows only when a real correction is required**;
- **one active real Cash-In rail initially, multi-provider architecture from day one**;
- **simulator retained permanently for non-production testing**;
- **future automated payout only after explicit capability, contractual, legal, security, accounting, and reconciliation proof**.

This is the canonical target architecture to use when changing WLT backend, database migrations, finance control-panel flows, DSH financial boundaries, mobile journeys, tests, and governance Product Truth.
