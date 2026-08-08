# WLT External Wallet Switch Architecture

**Status:** Proposed technical architecture / decision record  
**Service:** `WLT` — Wallet / Financial Truth  
**Branch baseline:** `abbas`  
**Baseline SHA reviewed:** `84ed2c43a2ca041e7907a0986990b8030954890c`  
**Prepared:** 2026-08-08  
**Primary market target:** Yemen electronic wallets  

---

## 1. Purpose

This document defines the recommended architecture for integrating BThwani with official Yemeni electronic wallets while preserving WLT as the sole financial source of truth.

The preferred direction is **one external wallet-switch/acquiring integration where commercially and technically possible**, rather than one bespoke integration per wallet. WeNet is the primary candidate because its public 2026 material describes:

- a **Unified Payments Interface (UPI)** connecting banks and wallets through one channel;
- an **Electronic Wallet Switch** connecting wallets, banks and payment providers;
- **Person-to-Business (P2B)** payments from individuals to merchants.

This document deliberately does **not** assume that WeNet exposes a public merchant REST API, acts as a custodian, supports refunds/payouts, or charges a specific fee. Those items are contract/API-documentation facts that must be proven before production implementation.

---

## 2. Executive decision

### 2.1 Adopt this model

```text
Customer official wallet
        |
        | P2B / wallet payment
        v
Acquiring wallet / WeNet network
        |
        | one BThwani integration boundary
        v
BTHWANI WLT
        |
        +--> authoritative payment session
        +--> provider event / inquiry
        +--> reconciliation
        +--> double-entry ledger
        +--> internal BThwani balance / payable
```

### 2.2 Do not adopt this model as the default

```text
BTHWANI
  +--> Jaib API
  +--> ONE Cash API
  +--> Floosak API
  +--> Jawali API
  +--> Mahfathati API
  +--> Cash API
  +--> ...
```

Direct wallet adapters remain a **fallback capability**, not the target architecture. They are justified only when a wallet is not reachable through the selected switch/acquirer, when commercial pricing is materially better, or when a required capability is absent from the common rail.

---

## 3. What is confirmed vs. what is not confirmed

### 3.1 Confirmed from current BThwani source

The `abbas` branch already contains the foundations that must remain canonical:

1. `services/wlt/service.manifest.ts`
   - WLT owns financial truth, wallets, payment sessions, refunds, settlements, payouts, ledger, reconciliation and finance reports.
   - Production mutations are intentionally not considered ready.

2. `services/wlt/backend/internal/provider/provider_mode.go`
   - `mock`, `sandbox`, and `production` modes exist.
   - Production is fail-closed until a real adapter, secret reference, inquiry, webhook verification, reconciliation and independent release approvals exist.

3. `services/wlt/backend/internal/provider/payment_provider.go`
   - An external-provider seam already exists.

4. `services/wlt/backend/internal/payment/provider_results.go`
   - `ApplyAuthoritativeProviderEvent` is the canonical asynchronous/read-back finalization path.
   - It enforces provider-event identity, replay/conflict handling, legal transitions, reconciliation resolution, ledger posting and DSH outbox projection atomically.

5. `services/wlt/backend/internal/payment/provider_webhook.go`
   - Signed webhook verification, timestamp skew control, payload hashing and idempotent event application already exist.

6. `services/wlt/backend/internal/payment/provider_refresh.go`
   - Provider inquiry/read-back exists as a recovery/reconciliation mechanism.

7. `services/wlt/backend/internal/ledger/kernel.go`
   - `PostLedgerTransaction` is the sole double-entry runtime write path.
   - It rejects unbalanced postings and conflicting idempotent references.

8. `services/wlt/backend/internal/payout/payout_governance.go`
   - Partner, captain and field payout destinations are governed.
   - `bank`, `mobile_money` and `manual` settlement preferences exist.
   - Sensitive payout data is handled as encrypted/masked destination data.

### 3.2 Confirmed from current WeNet public material

Public WeNet material available in 2026 states that:

- UPI is a national unified payment interface connecting banks and wallets and allowing payment acceptance through one secure standardized channel.
- the Electronic Wallet Switch is a national integration layer connecting electronic wallets with banks and payment providers;
- P2B is an immediate payment service from individuals to merchants.

### 3.3 Not confirmed and must not be hard-coded as fact

The following are **UNKNOWN until a written commercial offer and technical integration pack are obtained**:

- whether BThwani contracts directly with WeNet or through one acquiring wallet;
- whether WeNet is only the network/switch or also the merchant acquirer for BThwani;
- merchant onboarding/setup fee;
- monthly/annual fee;
- P2B fee;
- percentage fee;
- issuer/source-wallet fee;
- settlement fee;
- API/webhook fee;
- refund fee;
- minimum transaction/monthly volume;
- current participating-wallet list for the exact P2B product;
- merchant API base URL/endpoints;
- authentication scheme;
- webhook signature scheme;
- settlement frequency;
- whether settlement is gross or net of fees;
- refund support;
- payout/B2P support;
- sandbox availability and test credentials;
- SLA, timeout and retry rules.

No production implementation may convert any of these unknowns into assumptions.

---

## 4. Critical domain distinction: network != acquirer != wallet != WLT

This distinction is mandatory because it prevents a major architectural error.

### 4.1 Network / switch

Example candidate: `WeNet`.

Responsibilities may include routing, interoperability, clearing, transaction messaging and settlement coordination. The network must **not** automatically be modeled as the legal custodian of BThwani funds unless the contract says so.

### 4.2 Acquirer / merchant relationship

The acquiring party is the institution through which BThwani receives merchant payments and receives a merchant identifier / point / settlement arrangement.

Possible production shapes are:

```text
BThwani <-> WeNet directly <-> wallets
```

or:

```text
BThwani <-> one acquiring wallet <-> WeNet <-> other wallets
```

The code must support both without redesigning the ledger.

### 4.3 Source wallet

The customer's wallet, such as Jaib or another participating wallet, is a **payment source/route attribute**. It is not a BThwani ledger and it must not own payment truth inside the platform.

### 4.4 BThwani WLT

WLT remains the only internal financial authority. External wallets move real funds; WLT records BThwani liabilities, receivables, clearing positions, earnings, payouts and balances.

---

## 5. Recommended provider model

Do not model every wallet as a separate provider when the transaction is actually acquired/routed through WeNet.

Use these distinct concepts:

```text
FinancialRail
  network            = wenet | direct | other
  acquirer            = <contracted institution>
  merchantAccount     = <BThwani merchant identity>
  settlementAccount   = <external BThwani account/wallet reference>
  sourceWallet        = <customer wallet, optional transaction metadata>
  capabilities        = <server-owned capability set>
```

### 5.1 Recommended capability set

Capabilities must be discovered from contract/API documentation, not guessed from wallet names:

```text
create_payment
payment_inquiry
signed_webhook
refund_full
refund_partial
void
merchant_p2b
wallet_topup
payout
payout_inquiry
statement_export
settlement_report
reconciliation_feed
idempotency
```

A missing capability fails closed.

---

## 6. Refactor the current provider abstraction before production

### 6.1 Current problem

The current provider layer is transport-oriented:

```go
Post(ctx, path, body, meta)
Get(ctx, path, meta)
InquirePayout(...)
```

and current payment code contains card-shaped paths such as:

```text
/financial/card/authorize
/financial/card/capture
/financial/card/status
```

This is acceptable for the existing simulator/sandbox history, but it is not a safe production abstraction for a wallet switch because a P2B wallet rail may be an immediate sale/transfer and may not expose card-style `authorize -> capture` semantics.

### 6.2 Recommended domain interface

The production-facing interface should express WLT operations, not provider URL paths. For example:

```go
type PaymentRail interface {
    Capabilities(ctx context.Context) Capabilities
    CreatePayment(ctx context.Context, req CreatePaymentRequest) (CreatePaymentResult, error)
    InquirePayment(ctx context.Context, req PaymentInquiryRequest) (PaymentResult, error)
    RefundPayment(ctx context.Context, req RefundRequest) (RefundResult, error)
    VerifyAndNormalizeWebhook(ctx context.Context, headers http.Header, body []byte) (NormalizedProviderEvent, error)
}
```

Optional payout capability should be a separate interface if the selected rail does not support it:

```go
type PayoutRail interface {
    CreatePayout(...)
    InquirePayout(...)
}
```

This prevents inbound customer payments and stakeholder payouts from being falsely coupled.

---

## 7. Webhook architecture

### 7.1 Keep the canonical event application

`ApplyAuthoritativeProviderEvent` is a strong boundary and should remain the canonical finalizer.

### 7.2 Change only the provider-specific edge

The current webhook handler assumes BThwani-defined headers and HMAC format:

```text
X-WLT-Provider-Timestamp
X-WLT-Provider-Signature
HMAC-SHA256(timestamp + "." + body)
```

Do **not** assume WeNet or an acquiring wallet uses this format.

The provider adapter must:

1. authenticate the real provider request exactly as documented;
2. validate timestamp/nonce/certificate/signature as applicable;
3. reject replay;
4. normalize the external payload into BThwani's internal `ProviderEventInput`;
5. call `ApplyAuthoritativeProviderEvent`.

Provider-specific payloads and headers must never leak into ledger logic.

---

## 8. Payment lifecycle must be capability-aware

The current WLT lifecycle contains card-oriented states such as `authorization_pending`, `authorized`, and `capture_pending`.

For wallet P2B, support a direct-payment path such as:

```text
reference_created
    -> pending_provider
    -> captured
```

or, if the provider explicitly has an authorization stage:

```text
reference_created
    -> authorization_pending
    -> authorized
    -> capture_pending
    -> captured
```

The chosen provider capability determines the legal lifecycle. Frontends must continue to consume server-owned `PaymentSessionCapabilities`; they must not derive behavior from provider names or status text.

---

## 9. Customer funding / BThwani internal balance

### 9.1 Product truth

Customer BThwani balance is a **closed-loop internal ledger balance / prepaid platform liability**, not an official external wallet account.

The external wallet is only the cash-in rail.

### 9.2 Recommended top-up flow

```text
1. Customer chooses "Add balance".
2. WLT creates a server-owned funding intent/payment session.
3. WLT selects the active rail/acquirer.
4. Provider returns merchant/payment instructions or a provider reference.
5. Customer approves payment in the external official wallet.
6. WLT receives a verified webhook or performs authoritative inquiry.
7. WLT reconciles the external event.
8. Only after authoritative success, WLT posts the double-entry transaction.
9. Customer BThwani balance becomes spendable.
```

### 9.3 Never credit on these signals alone

- customer screenshot;
- customer-entered transaction number without provider confirmation;
- frontend callback only;
- redirect URL only;
- SMS copied by the customer;
- local mobile notification;
- UI scraping of a wallet application.

These may be evidence for manual investigation, but not authoritative payment confirmation.

---

## 10. Accounting policy

The current captured-provider posting uses:

```text
Dr provider_clearing
Cr platform_payable
```

That is not universally correct for every financial purpose.

### 10.1 Checkout paid externally

A checkout payment may continue to enter a platform clearing/payable pipeline according to the existing order-settlement model:

```text
Dr provider_clearing
Cr platform_payable
```

### 10.2 Customer wallet top-up

A top-up must credit the customer's internal wallet liability, not generic platform payable:

```text
Dr provider_clearing
Cr wallet(customer)
```

Therefore provider capture finalization must choose an **accounting policy from the server-owned payment purpose**, not from provider name.

### 10.3 Provider settles net of fees and BThwani absorbs the fee

Example: customer funds 10,000 YER; provider settles 9,900 YER and retains 100 YER fee.

At authoritative customer payment:

```text
Dr provider_clearing       10,000
Cr wallet(customer)        10,000
```

At settlement reconciliation:

```text
Dr external_settlement_cash 9,900
Dr payment_processing_expense 100
Cr provider_clearing       10,000
```

This preserves the customer's full 10,000 balance while recognizing BThwani's provider cost explicitly.

### 10.4 Required ledger classification improvement

`ledgerAccountClassification` currently classifies specific asset/income accounts and defaults other account types to liability. Before fee accounting is implemented, add explicit classification for expense and external settlement/cash accounts. Never let `payment_processing_expense` default to liability.

---

## 11. Important economic correction

Do not claim that "top up once and make many orders" automatically solves a percentage fee.

If the provider charges 2% of total inflow:

```text
2% of 10 x 1,000 = 200
2% of 1 x 10,000 = 200
```

Top-up aggregation helps when there are **fixed per-transaction fees, minimum fees, operational overhead, or a cheaper wallet-funding tariff**. It does not mathematically eliminate an unchanged percentage of gross value.

Therefore the economic objective is:

1. obtain a lower network/acquiring price;
2. prefer fixed/capped fees where possible;
3. negotiate volume tiers;
4. avoid wallet-by-wallet merchant percentages if a switch-level price exists;
5. measure effective cost in basis points against gross payment value.

---

## 12. Fees must be modeled separately from routing

Do not hard-code historical values such as `2%`, `1.5%`, etc. as provider truth.

The commercial configuration should support:

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

Any customer-borne fee must be disclosed and explicitly accepted. Default policy for BThwani should remain server-configured, audited and legally reviewed.

---

## 13. Reconciliation architecture

Every external-wallet payment must converge through reconciliation even when a synchronous success response exists.

Preferred evidence order:

1. provider-signed webhook;
2. authenticated provider inquiry/read-back;
3. official provider settlement/reconciliation feed;
4. official statement/API/export import;
5. controlled finance manual reconciliation as an exception.

### 13.1 Required matching keys

Where supported:

```text
network
acquirer
merchant_id / point_id
provider_transaction_id
provider_reference
payment_session_id / merchant_reference
amount
currency
source_wallet
sender/reference identity where legally supplied
occurred_at
settlement_batch_id
```

### 13.2 Required exception states

At minimum:

```text
provider_result_unknown
unmatched
amount_mismatch
currency_mismatch
merchant_mismatch
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

No ambiguous external result may silently become `captured` or `settled`.

---

## 14. External account / merchant configuration

Store no production secret directly in source code or ordinary configuration rows.

Recommended canonical configuration entity:

```text
ExternalFinancialConnection
  id
  operator_context_id
  network_key
  acquirer_key
  merchant_id
  merchant_point_id
  settlement_account_reference
  credential_secret_reference
  webhook_secret_reference / certificate_reference
  environment
  status
  capability_snapshot
  contract_version
  pricing_version
  activated_at
  disabled_at
```

Secrets remain in an approved secret store; WLT stores references and non-secret identifiers.

---

## 15. Participating wallets

Public historical/market material has referenced wallets such as:

- ONE Cash
- Floosak
- Jawali
- Mahfathati
- Jaib
- Cash

This is **not production configuration** and must not be committed as a permanent authoritative coverage list.

Production coverage must come from the current signed WeNet/acquirer integration documentation and must be stored as an administratively controlled capability/route catalogue with effective dates.

If a wallet exits the switch, BThwani must be able to disable that route without code deployment.

---

## 16. Payouts to partner, captain and field

Current WLT payout governance already supports `mobile_money` destinations for `partner`, `captain` and `field` actors.

Do not assume customer P2B connectivity implies outbound payout capability.

Payout architecture:

```text
internal earnings/payable
    -> payout request
    -> amount held
    -> finance approval
    -> verified destination
    -> provider/acquirer payout if capability exists
       OR governed manual/mobile-money settlement
    -> provider proof/inquiry
    -> independent reconciliation
    -> settled
```

The destination must be verified before use. A change of payout destination must trigger re-verification and must not silently inherit trust from the previous destination.

---

## 17. Refunds

Refund support through WeNet is currently unproven from public documentation.

Rules:

1. prefer original-rail refund when the contracted API supports it;
2. use full or partial refund only according to provider capability;
3. normalize provider refund events into WLT's existing governed refund lifecycle;
4. never mark a refund complete from a frontend action alone;
5. never silently replace an external refund with BThwani internal balance unless product policy, customer disclosure and legal/accounting treatment explicitly permit that fallback.

---

## 18. Security requirements

Production activation requires all of the following:

- exact provider authentication implementation from official documentation;
- TLS validation; mTLS if required;
- secret rotation procedure;
- no credentials in repository, logs or frontend bundles;
- webhook signature/certificate verification;
- replay protection;
- timestamp/nonce validation if supported;
- idempotency on every mutation;
- strict amount/currency/merchant validation;
- rate limits;
- outbound timeouts and bounded retries;
- circuit breaker;
- correlation ID propagation;
- immutable provider-event audit identity/hash;
- operator-context isolation;
- maker/checker for financial release operations;
- no app UI automation, notification scraping or credential sharing.

Keep production provider mode fail-closed until these controls and same-commit runtime evidence are complete.

---

## 19. Observability and finance operations

Required metrics:

```text
payments_created_total
payments_captured_total
payments_failed_total
provider_result_unknown_total
provider_webhook_invalid_total
provider_webhook_replay_total
provider_inquiry_latency
provider_payment_latency
reconciliation_open_total
reconciliation_age_seconds
settlement_variance_minor_units
provider_fee_minor_units
provider_effective_fee_bps
payout_unknown_total
refund_unknown_total
```

Control-panel finance views should expose:

- connection state;
- active network/acquirer;
- capability snapshot;
- pricing version, without exposing secrets;
- payment/reconciliation exceptions;
- settlement batches;
- fee variance;
- payout exceptions;
- audit history.

A control-panel toggle alone must never be sufficient to enable production money movement.

---

## 20. Commercial due-diligence checklist

Before implementation against WeNet or an acquiring wallet, obtain a written answer for every field below.

| Item | Required answer |
|---|---|
| Contract topology | Direct BThwani-WeNet contract, or BThwani-acquiring-wallet contract? |
| Setup fee | One-time onboarding/integration cost |
| Monthly/annual | Recurring cost |
| P2B fee | Fixed fee per merchant payment |
| Percentage | Percentage of transaction value, if any |
| Source-wallet fee | Is there an issuer/source-wallet fee and who bears it? |
| Network fee | Is WeNet fee included in acquiring price or charged separately? |
| Settlement fee | Cost per batch/settlement |
| Settlement timing | Real-time, T+0, T+1, other |
| Settlement basis | Gross or net of fees |
| API fee | API/webhook/inquiry pricing |
| Refund | Full/partial support and fee |
| Minimum volume | Minimum transactions/value/commitment |
| Wallet coverage | Exact current participating wallets for merchant P2B |
| Merchant identity | Merchant ID / point ID allocation model |
| API model | Direct WeNet API or acquirer API over WeNet |
| Sandbox | Availability, test cases and credentials |
| Webhook | Authentication/signature specification |
| Inquiry | Authoritative status inquiry endpoint |
| Reconciliation | Feed/report/statement format |
| Idempotency | Provider-supported idempotency semantics |
| SLA | Availability, support and incident SLA |
| Payout | Whether outbound mobile-wallet payout is supported |

### Commercial acceptance target

BThwani should prefer **switch-level/acquirer-level pricing** rather than separate merchant contracts/percentages with every participating wallet.

Do not proceed merely because the integration is technically unified if the aggregate commercial cost remains equivalent to multiple high wallet-specific percentages.

---

## 21. Implementation sequence

### Phase 0 — Contract and evidence

No production code assumption.

Obtain:

- commercial offer;
- merchant/acquirer topology;
- integration guide;
- sandbox credentials;
- current wallet coverage;
- webhook/inquiry/reconciliation specs;
- settlement/fee rules.

### Phase 1 — Provider abstraction hardening

- introduce domain-level payment rail interface;
- separate `network`, `acquirer` and `source_wallet`;
- move webhook verification behind provider adapter;
- remove card endpoint assumptions from wallet flow;
- add server-owned provider capabilities.

### Phase 2 — WeNet/acquirer sandbox adapter

Implement only documented capabilities.

- create payment;
- inquiry;
- webhook normalization if provided;
- idempotency;
- timeout/unknown-result handling;
- reconciliation feed/import if available.

### Phase 3 — Customer wallet funding

- introduce a dedicated funding purpose/intent while reusing canonical payment sessions and provider events;
- post top-up accounting to `wallet(customer)` rather than generic `platform_payable`;
- add settlement and provider-fee accounting;
- add top-up-specific reconciliation tests.

### Phase 4 — Merchant checkout over the same rail

- route `official_wallet` checkout through the same rail;
- preserve existing order/payment session boundary;
- verify DSH outbox behavior after authoritative capture.

### Phase 5 — Refund capability

Only if documented and sandbox-verified.

### Phase 6 — Stakeholder payout capability

Only if the network/acquirer provides a suitable outbound rail. Otherwise preserve the existing governed payout/manual-mobile-money path.

### Phase 7 — Production release gate

Production enablement requires:

- sandbox contract tests passing;
- provider negative/failure cases passing;
- migration tests;
- ledger balance tests;
- duplicate/replay tests;
- timeout/unknown-result tests;
- reconciliation tests;
- settlement gross/net fee tests;
- operator-context isolation tests;
- finance approval;
- security approval;
- release approval;
- same-commit runtime evidence.

---

## 22. Required test matrix

At minimum test:

1. successful P2B payment;
2. explicit decline;
3. provider timeout before response;
4. provider timeout after provider accepted transaction;
5. duplicate create request;
6. duplicate webhook identical payload;
7. duplicate external event with conflicting payload;
8. invalid signature;
9. stale webhook;
10. amount mismatch;
11. currency mismatch;
12. merchant/point mismatch;
13. provider success after local timeout;
14. provider failure after local timeout;
15. late callback after terminal state;
16. customer top-up ledger posting;
17. checkout ledger posting;
18. gross settlement;
19. net settlement with fee;
20. fee mismatch;
21. partial refund if supported;
22. refund timeout/unknown state;
23. payout unknown state if supported;
24. route disabled while requests exist;
25. wallet removed from participating network;
26. cross-operator-context access attempt;
27. secret/certificate rotation;
28. provider outage and circuit breaker recovery.

---

## 23. Designs explicitly forbidden

Do not implement any of the following:

- a second ledger for WeNet;
- a second source of payment truth outside WLT;
- direct wallet balance mutation from frontend code;
- crediting customer WLT balance from a screenshot;
- hard-coded provider fees as contractual truth;
- hard-coded participating-wallet list as permanent truth;
- one copy-pasted provider implementation per wallet when the transaction uses one switch;
- assuming WeNet holds/custodies BThwani funds without contractual proof;
- assuming WeNet P2B automatically provides payouts;
- assuming all wallet payments use `authorize -> capture`;
- assuming current generic HMAC webhook format matches WeNet;
- using wallet-app scraping, ADB automation, notification interception or robotic login as a financial integration;
- enabling production provider mode before the existing fail-closed requirements are satisfied.

---

## 24. Legacy BThwani material: use as evidence, not source of truth

Older repositories contain useful product/history material, including:

- `bthfinal/.cursor/context/analysis/wlt/WLT_TOPUP_UX_FORENSIC_ANALYSIS.md`
- `bthfinal/.cursor/context/analysis/wlt/WLT_PROVIDER_FEE_AND_ABSORPTION_SPEC.md`
- `bthfinal/.cursor/context/analysis/wlt/WLT_PARTNER_CAPTAIN_FIELD_REVERSE_FLOW_ANALYSIS.md`
- `bthwani-suite/wlt/frontend/dsh/shared/contracts/financeProviders.types.ts`

They establish historical intent: BThwani WLT is internal, external official wallets fund it, multiple Yemeni wallets were contemplated, provider fees were considered, and partner/captain/field settlement was treated as an outward flow.

They must **not** be copied literally into the current architecture because older UI/code generalized wallet behavior into a provider/purchase-code pattern and included development fee values that are not current contractual truth.

---

## 25. External evidence registry

Reviewed public evidence as of 2026-08-08:

- WeNet official 2026 website: `wenet.ye/ar`
- WeNet UPI: `wenet.ye/ar/solutions/upi`
- WeNet Electronic Wallet Switch: `wenet.ye/ar/solutions/wallet-switch`
- WeNet P2B: `wenet.ye/ar/solutions/p2btransfer`
- Jaib official business/service material: `e-jaib.com`

These sources support the existence and stated purpose of the network services. They do **not** substitute for the private merchant contract, pricing sheet or integration documentation.

---

## 26. Final recommendation

The recommended BThwani target is:

```text
                         BTHWANI WLT
                              |
                    one canonical rail seam
                              |
                  +-----------+-----------+
                  |                       |
          preferred common rail      direct fallback
          WeNet / acquirer           only when required
                  |
          Electronic Wallet Switch
                  |
      +-----------+-----------+-----------+
      |           |           |           |
    Wallet A    Wallet B    Wallet C    Wallet N
```

The architecture must optimize for **one integration boundary**, but must not confuse that with "one HTTP endpoint". A single integration will normally contain multiple operations such as create payment, inquiry, webhook, reconciliation, refund and possibly payout.

The best commercial form for BThwani is one merchant/acquiring relationship with switch-level interoperability and a predictable low fixed/capped or otherwise acceptable fee. The best technical form is one `WeNet/acquirer` adapter normalized into the existing WLT payment-event, reconciliation and double-entry ledger boundaries.

No external wallet, acquiring wallet or switch becomes the BThwani source of financial truth. WLT remains authoritative.
