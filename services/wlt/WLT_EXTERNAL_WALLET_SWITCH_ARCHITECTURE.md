# WLT External Wallet Rail Architecture

**Status:** Proposed technical architecture / decision record  
**Service:** `WLT` — Wallet / Financial Truth  
**Branch baseline:** `abbas`  
**Baseline SHA reviewed:** `98cda4a75ce1e9e4be7b30e29937ec817f1d3a85`  
**Prepared:** 2026-08-08  
**Primary market target:** Yemen electronic wallets  

---

## 1. Purpose

This document defines the recommended architecture for integrating BThwani with official Yemeni electronic wallets while preserving WLT as the sole internal financial source of truth.

The architecture must support both of these external realities without redesigning WLT:

1. a common wallet switch/acquirer such as WeNet where one commercial/technical integration can reach multiple wallets; and
2. direct integrations with individual wallets when a common rail is unavailable, incomplete, commercially inferior, or missing a required capability.

The target is therefore **one internal financial architecture with pluggable external rails**, not a WeNet-specific architecture and not a collection of independent wallet-specific financial systems.

This document deliberately does **not** assume that WeNet exposes a public merchant REST API, acts as a custodian, supports refunds or payouts, or charges a specific fee. Those are contract and provider-documentation facts that must be proven before production activation.

---

## 2. Executive architecture decision

### 2.1 Canonical target

```text
                       BTHWANI WLT
                            |
                  FinancialRailRouter
                            |
                    ProviderRegistry
                            |
          +-----------------+-----------------+
          |                 |                 |
     Common Rail       Direct Wallet     Governed Manual
    WeNet/Acquirer        Adapter            Rail
          |                 |                 |
   participating        one wallet       exception only
      wallets
```

WLT remains authoritative for:

- payment and funding intents;
- internal wallet balances;
- partner/captain/field payables;
- payout requests and holds;
- refunds;
- double-entry ledger;
- reconciliation;
- settlement state;
- financial audit and finance operations.

External providers only move or report real external funds. They never become BThwani's internal source of financial truth.

### 2.2 Launch strategy

Adopt:

> **One active external provider at launch, multi-provider architecture from day one.**

This means BThwani implements only the first real adapter for which it has an approved contract, technical specification, sandbox and credentials. It must **not** pre-build speculative adapters for wallets whose APIs are unknown.

The architecture, however, must already allow another adapter to be registered later without rewriting WLT, the ledger, applications or stakeholder journeys.

### 2.3 Direct adapters are not a failure mode

If WeNet or another common rail is not suitable, the architecture becomes:

```text
                       BTHWANI WLT
                            |
                  FinancialRailRouter
                            |
                    ProviderRegistry
                            |
       +--------------------+--------------------+
       |                    |                    |
   JaibAdapter        OneCashAdapter       OtherAdapter
       |                    |                    |
      Jaib               ONE Cash              ...
```

That is an expected supported topology. It must not create separate ledgers, payout engines, reconciliation engines or wallet systems per provider.

---

## 3. Stakeholder financial policy

Stakeholder policy and provider routing are separate concerns. The provider must never be hard-coded into a customer, captain, field or partner domain model.

### 3.1 Policy matrix

| Stakeholder | Cash-in / top-up | Cash-out / payout | External-wallet policy |
|---|---|---|---|
| Customer | Yes | No general withdrawal by default | Multi-wallet |
| Captain | Yes | Yes | Primary workforce wallet/rail, governed exception |
| Field | Not required by default | Yes | Primary workforce wallet/rail, governed exception |
| Partner | Not required by default | Yes | Multi-wallet from supported verified destinations |
| BThwani treasury | Receives and settles | Funds stakeholder payouts | Multi-rail internally |

The matrix is a product/operational policy. It does not imply that every provider supports every operation.

---

## 4. Customer policy

### 4.1 Customer funding

The customer's BThwani balance is a **closed-loop internal platform balance / liability**, not an official external wallet.

The customer may fund it from any external wallet route currently enabled by BThwani:

```text
Customer official wallet
        |
        v
CashInRail
        |
        v
Authoritative provider confirmation
        |
        v
Reconciliation
        |
        v
WLT double-entry ledger
        |
        v
Customer BThwani balance
```

### 4.2 Customer withdrawal

General customer withdrawal or P2P transfer must not be inferred from the existence of top-up. It requires separate legal, product, fraud and accounting approval.

---

## 5. Captain policy: cash-in and cash-out

The captain is explicitly a **two-direction financial actor**.

```text
                         Captain WLT
                             |
                 +-----------+-----------+
                 |                       |
              Cash-In                  Cash-Out
              Top-up                    Payout
                 |                       |
        official external          verified official
             wallet                    wallet
```

### 5.1 Captain top-up

`CAPTAIN_TOPUP` must use the same canonical `CashInRail` architecture as customer top-up:

```text
Official wallet
    -> Funding Intent / Payment Session
    -> FinancialRailRouter
    -> selected CashInRail
    -> authoritative confirmation
    -> reconciliation
    -> ledger posting
    -> captain internal balance
```

The accounting destination differs by funding purpose:

```text
CUSTOMER_TOPUP -> wallet(customer)
CAPTAIN_TOPUP  -> wallet(captain)
```

Provider identity must never determine the accounting account. The server-owned financial purpose does.

### 5.2 Captain earnings and one visible balance

Do not create a separate visible "top-up wallet" and "earnings wallet" for the captain unless product requirements later demand that UX.

The captain may see one financial balance, while WLT internally preserves the origin and eligibility of each movement:

```text
CAPTAIN_TOPUP
CAPTAIN_EARNING
CAPTAIN_COMMISSION
CAPTAIN_ADJUSTMENT
CAPTAIN_HOLD
CAPTAIN_RELEASE
CAPTAIN_PAYOUT
```

The server must distinguish at least:

```text
available
held
pending
withdrawal_eligible
```

The entire displayed balance must not automatically be treated as withdrawable.

### 5.3 Withdrawability of captain top-up principal

Product intent currently allows the captain to fund and withdraw money. That intent must be preserved in the model, but production activation of withdrawal for externally topped-up principal is an explicit **legal/commercial/AML gate** because unrestricted cash-in -> internal balance -> cash-out can resemble stored-value or money-transfer activity.

Therefore WLT must implement **withdrawal eligibility as server-owned policy**, not as `withdrawable = balance`.

If approved, top-up principal can become withdrawal-eligible according to the approved policy. If not approved, captain earnings can remain withdrawable while top-up funds are restricted to approved platform purposes.

---

## 6. Workforce policy: captain and field

### 6.1 Primary workforce financial rail

To reduce operational fragmentation, BThwani should prefer one official wallet/provider for captain and field financial operations at launch, provided that the selected provider has sufficient coverage and the required capabilities.

Use policy, not hard-coded provider names:

```text
WorkforceFinancialPolicy
  primaryCashInRail
  primaryPayoutRail
  exceptionRails
```

Example configuration shape only:

```text
primaryCashInRail = provider_x
primaryPayoutRail = provider_x
```

If the provider changes later, configuration and adapter routing change; the captain/field domain and WLT ledger do not.

### 6.2 Governed exception

The workforce policy should be:

> **Primary Required/Preferred Settlement Wallet + Governed Exception**

An exception may be approved for geographic, accessibility, contractual or operational reasons. Exceptions must be explicit and auditable; they must not silently turn workforce payout into unrestricted multi-wallet routing.

### 6.3 Verified workforce destination

Before a destination can receive payout, it must pass the approved finance verification process and become an active canonical destination.

Changing the destination must require re-verification. Trust must not automatically migrate from an old destination to a new one.

---

## 7. Partner policy: flexible verified settlement destination

Partners are commercially different from workforce actors. BThwani should **not require every partner to open the same official wallet**.

Adopt:

> **Preferred Rail + Flexible Settlement Destination.**

### 7.1 Supported partner destination catalogue

Partners choose only from a BThwani-controlled list of currently supported payout destinations:

```text
SupportedPartnerSettlementRails
  provider_a = enabled
  provider_b = enabled
  provider_c = disabled
```

Do not hard-code provider names as permanent support truth. Coverage is administrative configuration with effective dates and capability evidence.

### 7.2 Preferred provider without mandatory lock-in

BThwani may mark one provider as preferred because it is cheaper, faster or more automated, but partners remain able to choose another supported destination.

Any difference in fees or settlement speed must be contractually valid, transparently represented and approved by finance/product policy.

### 7.3 Canonical partner payout destination

A partner should not choose an arbitrary wallet on every payout request.

Use one active verified canonical destination per supported policy scope, for example:

```text
PartnerSettlementDestination
  partner_id
  provider_key
  destination_reference_encrypted
  masked_destination
  verification_status
  active
  verified_at
```

A change request follows:

```text
request change
    -> verify new destination
    -> approve
    -> deactivate old destination
    -> activate new destination
```

### 7.4 Provider without payout API

Lack of an automated payout API does not automatically make a partner destination unsupported.

A provider can temporarily use a **Governed Manual Rail** if finance approves it:

```text
Payout Request
    -> Hold
    -> Finance approval
    -> controlled external transfer
    -> provider/reference proof recorded
    -> independent reconciliation
    -> Settled
```

The manual rail must still obey maker/checker, audit, idempotency, proof and reconciliation requirements. It must never be a simple "mark paid" button.

---

## 8. Critical domain distinction: network != acquirer != source wallet != destination wallet != WLT

### 8.1 Network / switch

Example candidate: `WeNet`.

Potential responsibilities include routing, interoperability, clearing, messaging and settlement coordination. It must not automatically be modeled as custodian of BThwani funds unless the contract explicitly establishes that role.

### 8.2 Acquirer / merchant relationship

The acquiring party is the institution through which BThwani receives merchant payments and obtains merchant identity / point / settlement arrangements.

Possible shapes:

```text
BThwani <-> WeNet directly <-> participating wallets
```

or:

```text
BThwani <-> acquiring wallet <-> WeNet <-> participating wallets
```

### 8.3 Source wallet

The wallet selected by the payer is transaction route metadata, not the internal financial authority.

### 8.4 Destination wallet

For partner/captain/field payout, the verified external destination is payout-routing data. It does not own the internal payable or wallet balance.

### 8.5 WLT

WLT remains the sole internal financial authority for balances, liabilities, payment state, payout state, ledger, reconciliation and audit.

---

## 9. FinancialRailRouter and ProviderRegistry

These are required architectural components.

### 9.1 ProviderRegistry

The registry contains server-owned provider/rail configuration and capabilities:

```text
ProviderRegistration
  provider_key
  network_key
  acquirer_key
  environment
  contract_status
  operational_status
  capabilities
  credential_secret_reference
  webhook_verification_profile
  pricing_version
  settlement_profile
  enabled_operations
```

A provider name must not be scattered through business logic.

### 9.2 FinancialRailRouter

The router selects an eligible rail based on server-owned facts:

```text
operation
stakeholder_type
source/destination wallet route
currency
amount
provider capabilities
contract status
operational health
stakeholder policy
pricing policy
external liquidity policy
```

At launch, routing should be deterministic and configuration-driven. Do not build complex automatic cost optimization until at least two real production rails exist and their behavior is proven.

### 9.3 No unsafe automatic failover

A payment or payout whose first provider call has an **ambiguous result** must never be immediately retried through a second provider.

Example forbidden behavior:

```text
Provider A timeout
    -> immediately send same money movement to Provider B
```

That can create duplicate charges or duplicate payouts.

Correct behavior:

```text
Provider A timeout
    -> provider_result_unknown
    -> inquiry / webhook / reconciliation
    -> establish authoritative outcome
    -> only then allow a new intent/route if safe
```

Failover is permitted only before an external mutation is attempted, after an explicit confirmed failure, or through a new idempotently governed operation according to provider semantics.

---

## 10. Rail interfaces

The production-facing abstraction must express financial operations rather than raw provider URL paths.

Recommended separation:

```go
type CashInRail interface {
    Capabilities(ctx context.Context) Capabilities
    CreatePayment(ctx context.Context, req CreatePaymentRequest) (CreatePaymentResult, error)
    InquirePayment(ctx context.Context, req PaymentInquiryRequest) (PaymentResult, error)
    VerifyAndNormalizeWebhook(ctx context.Context, headers http.Header, body []byte) (NormalizedProviderEvent, error)
}

type CashOutRail interface {
    CreatePayout(ctx context.Context, req CreatePayoutRequest) (CreatePayoutResult, error)
    InquirePayout(ctx context.Context, req PayoutInquiryRequest) (PayoutResult, error)
}

type RefundRail interface {
    CreateRefund(ctx context.Context, req RefundRequest) (RefundResult, error)
    InquireRefund(ctx context.Context, req RefundInquiryRequest) (RefundResult, error)
}
```

A single adapter may implement one, two or all interfaces. Capability absence must fail closed.

### 10.1 Recommended capability vocabulary

```text
cash_in
cash_out
payment_inquiry
payout_inquiry
signed_webhook
refund_full
refund_partial
void
merchant_p2b
wallet_topup
qr
redirect
deep_link
purchase_code
merchant_binding
statement_export
settlement_report
reconciliation_feed
idempotency
```

Capabilities are derived from approved provider documentation and sandbox evidence, never guessed from provider names.

---

## 11. Current WLT source assessment

The `abbas` branch already has important foundations that should remain canonical:

1. `services/wlt/service.manifest.ts`
   - WLT owns financial truth, wallets, payment sessions, refunds, settlements, payouts, ledger, reconciliation and finance reports.
   - production mutations are intentionally not considered ready.

2. `services/wlt/backend/internal/provider/provider_mode.go`
   - `mock`, `sandbox` and `production` modes exist;
   - production is fail-closed until real adapter, secrets, inquiry, webhook verification, reconciliation and approvals exist.

3. `services/wlt/backend/internal/provider/payment_provider.go`
   - an external-provider seam already exists, but it is transport-oriented (`Post`, `Get`, `InquirePayout`).

4. `services/wlt/backend/internal/payment/payment.go`
   - current provider calls include card-shaped paths such as `/financial/card/authorize` and `/financial/card/capture`.
   - this must not be imposed on wallet P2B rails that may use immediate-payment semantics.

5. `services/wlt/backend/internal/payment/provider_results.go`
   - `ApplyAuthoritativeProviderEvent` is a strong canonical asynchronous/read-back finalizer;
   - provider event identity, replay/conflict handling, legal transition, reconciliation resolution, ledger posting and DSH outbox projection are coordinated atomically.

6. `services/wlt/backend/internal/payment/provider_webhook.go`
   - signed webhook verification, timestamp-skew control, hashing and replay/idempotency concepts already exist.

7. `services/wlt/backend/internal/payment/provider_refresh.go`
   - provider inquiry/read-back exists as a recovery mechanism.

8. `services/wlt/backend/internal/ledger/kernel.go`
   - `PostLedgerTransaction` is the sole runtime double-entry write path and rejects unbalanced postings.

9. `services/wlt/backend/internal/payout/payout_governance.go`
   - partner, captain and field destinations are already governed;
   - `bank`, `mobile_money` and `manual` settlement preferences exist;
   - sensitive payout destination data is encrypted/masked.

### 11.1 Required refactor before a real wallet provider

Do not remove these foundations. Refactor only the external edge:

- add `ProviderRegistry`;
- add `FinancialRailRouter`;
- replace raw URL-path semantics at the production boundary with domain rail interfaces;
- preserve current transport client beneath adapters if useful;
- normalize provider-specific events before they reach payment/ledger logic.

---

## 12. Provider-specific customer action model

Frontends must not contain wallet-name condition forests such as:

```text
if jaib ...
if one_cash ...
if jawali ...
```

WLT should return a server-owned customer action/capability projection, for example:

```text
NONE
REDIRECT
DEEP_LINK
DISPLAY_QR
SCAN_QR
ENTER_PURCHASE_CODE
ENTER_CUSTOMER_IDENTIFIER
MERCHANT_BINDING_REQUIRED
WAIT_FOR_PROVIDER_CONFIRMATION
```

Only add action types proven by real provider documentation. The app renders the action; it does not re-derive provider rules.

---

## 13. Payment lifecycle must be capability-aware

The current WLT lifecycle contains card-oriented states such as `authorization_pending`, `authorized` and `capture_pending`.

For immediate wallet P2B, support a path such as:

```text
reference_created
    -> pending_provider
    -> captured
```

If a provider explicitly has authorization/capture semantics:

```text
reference_created
    -> authorization_pending
    -> authorized
    -> capture_pending
    -> captured
```

`PaymentSessionCapabilities` remains the server-owned behavioral projection. Frontends must not infer legal actions from provider names or raw status strings.

---

## 14. Webhook and provider-event architecture

Keep `ApplyAuthoritativeProviderEvent` as the internal authoritative event application boundary.

The current webhook handler uses a BThwani-defined HMAC header format. Do not assume WeNet or any wallet uses the same scheme.

Each adapter must:

1. authenticate according to the provider's actual specification;
2. validate certificate/signature/MAC, timestamp and nonce where applicable;
3. reject replay;
4. validate merchant/account identity, amount and currency;
5. normalize the provider payload to the canonical internal event;
6. call the existing authoritative event-application path.

Provider-specific payloads and headers must not leak into ledger or stakeholder business logic.

---

## 15. Funding and accounting policy

The current captured-provider posting pattern is not universally correct for every financial purpose. Accounting must be purpose-driven.

### 15.1 Customer top-up

```text
Dr provider_clearing
Cr wallet(customer)
```

### 15.2 Captain top-up

```text
Dr provider_clearing
Cr wallet(captain)
```

### 15.3 Order payment

Order checkout can continue through the approved platform clearing/payable accounting policy rather than automatically using a wallet top-up entry.

### 15.4 Provider settles net of fees

If BThwani absorbs an external fee, recognize the fee separately during settlement reconciliation rather than reducing the customer's/captain's credited principal without an explicit product rule.

Illustrative pattern:

```text
At authoritative funding:
Dr provider_clearing          gross amount
Cr wallet(actor)              gross amount

At settlement:
Dr external_settlement_cash   net amount
Dr payment_processing_expense fee amount
Cr provider_clearing          gross amount
```

### 15.5 Ledger classification requirement

Before adding fee accounting, explicitly classify expense and external cash/settlement accounts. Do not allow a new expense account type to inherit a default liability classification.

---

## 16. Fees and routing are separate

Do not hard-code historical/provider-discussion values such as `2%` or `1.5%` as contractual truth.

Commercial configuration should support at least:

```text
fee_type:
  fixed
  percentage
  fixed_plus_percentage
  tiered
  capped

fee_bearer:
  platform
  customer_explicit
  shared

settlement_basis:
  gross
  net
```

A unified API does not guarantee unified or cheap pricing.

If a provider charges 2% of gross inflow:

```text
10 x 1,000 at 2% = 200
1 x 10,000 at 2% = 200
```

Top-up aggregation only reduces cost when there are fixed/minimum fees, operational overhead, or a different funding tariff. The real economic objective is lower, capped or otherwise acceptable rail/acquirer pricing.

---

## 17. Reconciliation architecture

Every external money movement must converge through reconciliation even when a synchronous response says success.

Preferred evidence order:

1. provider-signed event/webhook;
2. authenticated provider inquiry/read-back;
3. official reconciliation/settlement feed;
4. official statement/API/export;
5. controlled finance manual reconciliation as an exception.

### 17.1 Canonical matching keys

Where supported:

```text
provider/network
acquirer
merchant_id / point_id
external_transaction_id
provider_reference
BThwani operation reference
amount
currency
source/destination wallet route
occurred_at
settlement_batch_id
```

### 17.2 Exception states

At minimum:

```text
provider_result_unknown
unmatched
amount_mismatch
currency_mismatch
merchant_mismatch
destination_mismatch
duplicate_external_transaction
duplicate_callback
late_success
late_failure
settlement_shortfall
settlement_overage
fee_mismatch
manual_review
resolved
```

No ambiguous result may silently become `captured`, `paid` or `settled`.

---

## 18. Treasury and external liquidity

Multi-wallet partner payouts and direct integrations can fragment BThwani's real external liquidity.

Example:

```text
BThwani @ Provider A: high balance
BThwani @ Provider B: low balance
Partner payouts due @ Provider B: high
```

WLT therefore needs a treasury/liquidity projection for external accounts, without creating a second financial ledger.

Recommended model:

```text
ExternalProviderAccount
  provider_key
  account_reference
  currency
  reported_available_balance
  pending_incoming
  pending_outgoing
  required_payout_liquidity
  minimum_operational_buffer
  last_reconciled_at
```

This is an operational reconciliation/treasury view over authoritative external evidence and WLT obligations. It must not replace the double-entry ledger.

Rebalancing between external providers is a governed treasury operation and must only be implemented where contractually and operationally supported.

---

## 19. External financial connection configuration

Store no production secret in source code or ordinary configuration rows.

Recommended entity:

```text
ExternalFinancialConnection
  id
  operator_context_id
  provider_key
  network_key
  acquirer_key
  merchant_id
  merchant_point_id
  settlement_account_reference
  credential_secret_reference
  webhook_secret_or_certificate_reference
  environment
  status
  capability_snapshot
  contract_version
  pricing_version
  activated_at
  disabled_at
```

Secrets remain in the approved secret store; WLT stores references and non-secret identifiers.

---

## 20. Participating wallet coverage

Public/historical material has referenced wallets including ONE Cash, Floosak, Jawali, Mahfathati, Jaib and Cash.

This is **not production configuration**.

Production coverage must come from the current signed provider/switch/acquirer documentation and be represented as administratively controlled route/capability configuration with effective dates.

If a wallet exits a switch or a direct provider is disabled, BThwani must be able to disable the route without code deployment.

---

## 21. Refund policy

Refund support is provider capability, not a universal assumption.

Rules:

1. prefer original-rail refund when supported;
2. support full/partial refund only when documented;
3. normalize external refund state into WLT's governed refund lifecycle;
4. never mark refund complete from frontend action alone;
5. never silently substitute internal wallet credit for an external refund unless product, accounting and legal policy explicitly allows that fallback.

---

## 22. Security and production gates

Production activation requires:

- exact provider authentication from approved documentation;
- TLS validation and mTLS if required;
- secret/certificate rotation procedure;
- no provider credentials in repository, logs or frontend bundles;
- webhook/callback verification;
- replay protection;
- idempotency on every financial mutation;
- strict amount/currency/merchant/destination validation;
- outbound timeouts and bounded retry semantics;
- circuit breaker;
- correlation ID propagation;
- immutable provider event identity/hash;
- operator-context isolation;
- maker/checker for financial releases;
- reconciliation and settlement evidence;
- no UI scraping, notification interception, robotic wallet login or ADB automation as a financial integration.

Keep production provider mode fail-closed until these gates and same-commit runtime evidence are complete.

---

## 23. Observability and finance control plane

Required metrics should include:

```text
payments_created_total
payments_captured_total
payments_failed_total
funding_customer_total
funding_captain_total
provider_result_unknown_total
provider_webhook_invalid_total
provider_webhook_replay_total
provider_inquiry_latency
reconciliation_open_total
reconciliation_age_seconds
settlement_variance_minor_units
provider_fee_minor_units
provider_effective_fee_bps
external_liquidity_shortfall_total
payout_unknown_total
refund_unknown_total
route_selection_total
route_unavailable_total
```

Finance/control-panel views should expose, without secrets:

- active providers and rails;
- provider capabilities;
- stakeholder routing policy;
- workforce primary provider;
- supported partner settlement destinations;
- provider connection state;
- pricing/contract version;
- reconciliation exceptions;
- settlement batches;
- fee variance;
- external-liquidity alerts;
- payout/refund exceptions;
- audit history.

A UI toggle alone must never be sufficient to enable production money movement.

---

## 24. Commercial due-diligence checklist

Before implementing any real provider, obtain written answers for:

| Item | Required answer |
|---|---|
| Contract topology | Direct BThwani-provider/switch contract or acquiring-wallet contract? |
| Cash-in | Customer top-up/order payment support? |
| Captain cash-in | Can workforce funding use the same rail? |
| Cash-out | Partner/captain/field payout capability? |
| Setup fee | One-time onboarding/integration cost |
| Monthly/annual | Recurring cost |
| P2B fee | Fixed fee per merchant payment |
| Percentage | Percentage of transaction value |
| Source-wallet fee | Issuer/source-wallet fee and bearer |
| Network fee | Included in acquiring price or separate? |
| Settlement fee | Cost per settlement/batch |
| Settlement timing | Real-time, T+0, T+1, other |
| Settlement basis | Gross or net of fees |
| API fee | API/webhook/inquiry pricing |
| Refund | Full/partial capability and cost |
| Minimum volume | Minimum transactions/value/commitment |
| Wallet coverage | Exact current wallet coverage per operation |
| Merchant identity | Merchant/point allocation model |
| API model | Direct switch API or acquirer API over switch |
| Sandbox | Credentials and test cases |
| Webhook | Authentication/signature specification |
| Inquiry | Authoritative status endpoint |
| Reconciliation | Feed/report/statement format |
| Idempotency | Mutation replay semantics |
| Payout destination validation | Available validation/KYC data |
| SLA | Availability/support/incident SLA |
| Treasury transfer | Whether provider-to-provider rebalancing is supported |

BThwani should prefer switch/acquirer-level pricing over multiple high wallet-specific merchant percentages, but technical unification must never be mistaken for proof of lower commercial cost.

---

## 25. Implementation sequence

### Phase 0 — Contract, legal and product policy

Obtain:

- first provider commercial offer;
- cash-in/cash-out capability matrix;
- merchant/acquirer topology;
- integration guide;
- sandbox credentials;
- wallet coverage;
- webhook/inquiry/reconciliation specs;
- settlement/fee rules;
- captain top-up withdrawal policy approval;
- workforce primary-wallet policy;
- partner supported-destination policy.

### Phase 1 — Internal rail architecture

Implement/refactor:

- `ProviderRegistry`;
- `FinancialRailRouter`;
- `CashInRail`, `CashOutRail`, `RefundRail` domain interfaces;
- provider capability model;
- server-owned stakeholder routing policy;
- normalized provider customer-action model;
- no ambiguous-result automatic failover.

### Phase 2 — Funding purposes

Introduce server-owned purposes while reusing canonical WLT payment/event/ledger boundaries:

```text
CUSTOMER_TOPUP
CAPTAIN_TOPUP
ORDER_PAYMENT
```

Post ledger entries according to purpose, not provider name.

### Phase 3 — First real adapter

Implement only documented capabilities for the first contracted provider:

- create cash-in payment if supported;
- inquiry;
- webhook normalization/verification if provided;
- idempotency;
- timeout/unknown-result handling;
- reconciliation feed/import;
- payout only if separately documented.

### Phase 4 — Workforce rollout

- configure primary workforce rail;
- verify captain/field official destinations;
- enable captain top-up;
- enable governed payout;
- implement exception workflow.

### Phase 5 — Partner multi-destination payout

- supported partner destination catalogue;
- verified canonical destination;
- automated adapter payout where supported;
- governed manual payout rail where approved;
- partner payout reconciliation.

### Phase 6 — Treasury/liquidity controls

- external account reconciliation;
- required payout liquidity;
- threshold/shortfall alerts;
- governed rebalancing where supported.

### Phase 7 — Additional adapters

A new provider should require only:

```text
Adapter
+ registration
+ credentials/secrets
+ capabilities
+ request/response mapping
+ webhook verification
+ reconciliation mapping
+ contract tests
+ operational approval
```

It must not require rewriting WLT, the ledger, stakeholder wallets, DSH or mobile applications.

### Phase 8 — Production release gate

Require:

- sandbox contract tests;
- provider failure/negative tests;
- migration tests;
- ledger balance tests;
- duplicate/replay tests;
- timeout/unknown-result tests;
- reconciliation tests;
- gross/net fee tests;
- stakeholder policy tests;
- operator-context isolation tests;
- finance/security/release approvals;
- same-commit runtime evidence.

---

## 26. Required test matrix

At minimum test:

1. customer top-up success;
2. captain top-up success;
3. order payment success;
4. explicit provider decline;
5. timeout before known provider acceptance;
6. timeout after possible provider acceptance;
7. duplicate create request;
8. duplicate webhook with identical payload;
9. duplicate event with conflicting payload;
10. invalid signature/certificate;
11. stale webhook;
12. amount mismatch;
13. currency mismatch;
14. merchant/point mismatch;
15. destination mismatch;
16. provider success after local timeout;
17. provider failure after local timeout;
18. late callback after terminal state;
19. customer top-up accounting;
20. captain top-up accounting;
21. checkout accounting;
22. gross settlement;
23. net settlement with fee;
24. fee mismatch;
25. captain payout to verified primary workforce destination;
26. field payout to verified primary workforce destination;
27. workforce governed exception;
28. partner payout to each enabled destination type;
29. partner destination change and re-verification;
30. governed manual partner settlement;
31. partial refund if supported;
32. refund unknown state;
33. payout unknown state;
34. attempted failover while first provider result is unknown — must be blocked;
35. confirmed provider failure followed by safe new route;
36. route disabled while requests exist;
37. wallet removed from a common switch;
38. provider contract disabled;
39. external liquidity below threshold;
40. cross-operator-context access attempt;
41. secret/certificate rotation;
42. provider outage and circuit-breaker recovery;
43. withdrawal-eligibility enforcement for captain top-up principal;
44. customer general withdrawal remains unavailable unless separately enabled.

---

## 27. Explicitly forbidden designs

Do not implement:

- a second ledger for WeNet or any wallet;
- a second source of payment truth outside WLT;
- provider names hard-coded into captain/field/partner business rules;
- a provider-specific partner payout engine per wallet;
- direct wallet balance mutation from frontend code;
- credit from customer/captain screenshot alone;
- hard-coded fee percentages as contractual truth;
- hard-coded permanent participating-wallet lists;
- copy-pasted full financial flows per provider;
- assumption that WeNet holds/custodies BThwani funds without proof;
- assumption that P2B implies outbound payout capability;
- assumption that wallet payments all use `authorize -> capture`;
- assumption that current generic HMAC webhook format matches a real provider;
- automatic second-provider retry after an ambiguous first-provider mutation;
- `withdrawable_balance = total_balance` for captain without policy;
- arbitrary partner destination per payout without verification;
- ungoverned manual payout or a simple "mark paid" action;
- wallet-app scraping, notification interception, ADB automation or robotic login as payment integration;
- production provider enablement before the existing fail-closed requirements are satisfied.

---

## 28. Evidence boundary and legacy material

Older BThwani repositories and prior analysis contain useful historical product intent: internal BThwani balances, external official wallets as cash-in/cash-out rails, multiple Yemeni providers, provider fees and stakeholder settlement flows.

They are **evidence of intent, not current provider contracts or current API truth**.

Current public WeNet material supports treating it as a candidate common switch/UPI/P2B rail. It does not substitute for private merchant pricing, current participant coverage, API documentation, custody terms, refund capability or payout capability.

No historical mock fee, generic purchase-code UX, or assumed provider behavior may be copied into production without current evidence.

---

## 29. Final target model

```text
                              BTHWANI WLT
                                   |
                         FinancialRailRouter
                                   |
                           ProviderRegistry
                                   |
             +---------------------+---------------------+
             |                     |                     |
         Common Rail          Direct Adapters       Manual Rail
         if suitable            if required        governed only
             |
      participating wallets

Stakeholder policy above the router:

Customer
  -> multi-wallet cash-in

Captain
  -> primary workforce cash-in
  -> primary workforce cash-out
  -> governed exception

Field
  -> primary workforce cash-out
  -> governed exception

Partner
  -> flexible supported verified cash-out destination
  -> preferred provider optional, never mandatory
```

The core architectural rule is:

> **One WLT, one ledger, one reconciliation authority, one routing layer, many pluggable external rails.**

BThwani should launch with one real provider adapter, but the system must be structurally ready for WeNet, direct wallet adapters, or a hybrid model without financial re-platforming.
