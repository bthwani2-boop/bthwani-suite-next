# BThwani Open-Source Reference Corpus and Adoption Policy

**Status:** Non-authoritative reference input
**Target repository:** `bthwani2-boop/bthwani-suite-next`
**Target placement:** `tools/prompting/BTHWANI-OSS-REFERENCE-CORPUS.md`
**Execution authority:** NONE
**Closure authority:** NONE
**Progress ledger:** FORBIDDEN
**Current-state authority:** FORBIDDEN

> This file is a curated external reference corpus and adoption policy. It must never become a second orchestrator, a second architecture authority, a campaign-state ledger, or a substitute for fresh evidence from live `h`.

The sole execution and closure constitution remains:

```text
tools/prompting/bthwani-orchestrator/00-ORCHESTRATOR.md
```

and the semantic owners/focus modules it requires.

If this file conflicts with the current orchestrator, refoundation target package, live code, or freshly verified repository evidence, the stronger/current authority wins.

---

## 1. Purpose

BThwani may use mature open-source projects to accelerate refoundation without replacing the project, changing its product identity, or forcing a new primary technology stack.

The main value of external projects is not “download and install the whole platform”.

The main value is:

```text
DISCOVER_MISSING_LOGIC
DISCOVER_MISSING_EDGE_CASES
DISCOVER_MISSING_STATE_MACHINES
DISCOVER_MISSING_SECURITY_RULES
DISCOVER_MISSING_FINANCIAL_INVARIANTS
DISCOVER_MISSING_FAILURE/RETRY/RECONCILIATION_BEHAVIOR
DISCOVER_MISSING_TEST_SCENARIOS
DISCOVER_BETTER_GENERIC_TECHNICAL_COMPONENTS
```

Then BThwani must implement the required truth inside its canonical owners using BThwani’s existing languages, bounded contexts, contracts, and deployment identities unless a small external component independently passes the adoption gate in this document.

---

## 1A. BEST-IN-CLASS PRIORITY NAVIGATION

### 1A.1 Reference selection is not adoption selection

The selection rule for reference/falsification is intentionally broader than the selection rule for direct adoption.

~~~text
REFERENCE_SELECTION
!=
DEPENDENCY_ADOPTION_SELECTION
~~~

For reference use, do not reject a system merely because it is:

~~~text
PAID
COMMERCIAL
OPEN_CORE
GPL/AGPL
JAVA
PYTHON
RUBY
PHP
TYPESCRIPT
A DIFFERENT DATABASE
TOO_LARGE_TO_SELF_HOST
NOT_A_BTHWANI_STACK_MATCH
~~~

If the system is one of the strongest/mature references for the exact root and its public code/docs/design material can expose missing logic, edge cases, state machines, contracts, operational controls, or failure handling, it may be used as a reference.

For direct code reuse, dependency, or runtime adoption, the stricter license, stack, ownership, cost, maintenance, operations, and source-of-truth gates in this document still apply.

Therefore:

~~~text
BEST_REFERENCE
→ chosen for semantic maturity and falsification power

BEST_COMPONENT_TO_ADOPT
→ chosen only after adoption gates pass
~~~

A paid or differently licensed system may be a P1 reference while remaining forbidden for direct adoption.

### 1A.2 Anti-distraction priority law

The corpus is hierarchical. Do not browse every reference merely because it is listed.

For every active BThwani root/question:

~~~text
IDENTIFY_EXACT_QUESTION
→ SELECT_THE_RELEVANT_DOMAIN_PRIORITY_LIST
→ CONSULT_P1
→ ANSWER_SUFFICIENT_AND_NO_MATERIAL_UNKNOWN?
    YES → STOP_EXTERNAL_RESEARCH
    NO  → CONSULT_P2
→ ANSWER_SUFFICIENT_AND_NO_MATERIAL_UNKNOWN?
    YES → STOP_EXTERNAL_RESEARCH
    NO  → CONSULT_P3
→ CONTINUE_ONLY_IF_A_SPECIFIC_GAP/CONTRADICTION_REMAINS
~~~

Default maximum:

~~~text
ORDINARY_ROOT
→ P1 only if sufficient
→ P1 + P2 if incomplete
→ P1 + P2 + P3 only if still materially unresolved

FINANCIAL_OR_SECURITY_ROOT
→ minimum P1 + one independent P2 cross-check
→ P3 only on disagreement, missing invariant, or unresolved failure mode

P4/P5/P6
→ specialist fallback or adversarial falsification only
→ never routine reading
~~~

This prevents corpus breadth from becoming execution delay.

### 1A.3 Stop condition

External reference research for a specific question stops when all are true:

~~~text
QUESTION_HAS_A_CLEAR_ANSWER
APPLICABLE_INVARIANTS_IDENTIFIED
APPLICABLE_EDGE_CASES_IDENTIFIED
FAILURE/RECOVERY_BEHAVIOR_IDENTIFIED
BTHWANI_OWNER_IDENTIFIED
BTHWANI_GAP_CLASSIFIED
NO_MATERIAL_CONTRADICTION_REMAINS
NO_HIGH_RISK_UNKNOWN_REMAINS
~~~

Do not continue to P2/P3 merely to collect more examples.

### 1A.4 Specialist override

Priority is by question, not brand prestige.

Examples:

~~~text
"How should unknown payment outcomes be handled?"
→ PAYMENTS P1/P2

"How should stale captain GPS be classified?"
→ TELEMETRY/DISPATCH P1

"How should fine-grained relationship authorization work?"
→ AUTHORIZATION P1

"How should refunds hit an internal ledger?"
→ LEDGER/WALLET P1
~~~

### 1A.5 Ranking meaning

~~~text
P1 = DEFAULT FIRST REFERENCE
P2 = FIRST FALLBACK / INDEPENDENT CROSS-CHECK
P3 = SECOND FALLBACK / DIFFERENT ARCHITECTURAL VIEW
P4 = SPECIALIST OR FALSIFICATION SOURCE
P5+ = DEEP SPECIALIST / LAST-RESORT REFERENCE
~~~

Ranking means reference efficiency for BThwani, not a universal claim that one product is objectively superior to every other product.

---

## 1B. BEST-IN-CLASS PRIORITY INDEX

All URLs below are reference entry points. Prefer official documentation or official repositories. Re-verify current URLs, licensing, and product status before direct code reuse or dependency adoption.

### 1B.1 Commerce core / cart / checkout / order / fulfillment

**P1 — Shopify**
- Docs: https://shopify.dev/docs
- Use first for: mature commerce semantics, cart/checkout/order/fulfillment, inventory behavior, refunds, discounts, webhooks, and admin/operator workflows.
- Mode: REFERENCE_ONLY unless a specific provider/API integration is independently selected.

**P2 — Adobe Commerce / Magento Open Source**
- Docs: https://developer.adobe.com/commerce/
- Repository: https://github.com/magento/magento2
- Use for: implementation detail, catalog/order/inventory/admin extensibility and a second mature commerce model.

**P3 — commercetools**
- Docs: https://docs.commercetools.com/
- Use for: composable commerce boundaries, carts/orders/inventory/pricing, API-first modeling, resource versioning and optimistic concurrency concepts.

**P4 — Saleor**
- Repository: https://github.com/saleor/saleor
- Docs: https://docs.saleor.io/
- Use for: inspectable checkout/order/payment/inventory/permissions logic and contract organization.

**P5 — Medusa**
- Repository: https://github.com/medusajs/medusa
- Docs: https://docs.medusajs.com/
- Use for: modular commerce flows and open implementation comparison.

**P6 — Spree**
- Repository: https://github.com/spree/spree
- Docs: https://spreecommerce.org/docs/
- Use only if higher priorities leave a gap.

**P7 — Sylius**
- Repository: https://github.com/Sylius/Sylius
- Docs: https://docs.sylius.com/
- Use as a final domain-driven commerce counterexample.

**STOP:** If P1 answers the product-semantic question and no implementation-level gap remains, do not read P2-P7.

### 1B.2 Multi-vendor marketplace / Partner / seller operations

**P1 — Mirakl**
- Entry: https://www.mirakl.com/
- Use for: enterprise marketplace operator/seller separation, onboarding/governance, offers, commissions and marketplace operations.
- Mode: REFERENCE_ONLY using public material.

**P2 — Mercur**
- Repository: https://github.com/mercurjs/mercur
- Use for: inspectable multi-vendor marketplace logic, seller teams, vendor onboarding, offers, commissions, payouts and admin/vendor surfaces.

**P3 — Sharetribe**
- Docs: https://www.sharetribe.com/docs/
- Use for: marketplace actors, listings, transactions, operator/user boundaries and journey comparison.

**P4 — Medusa**
- Repository: https://github.com/medusajs/medusa
- Use only when a marketplace question needs comparison with a modular commerce implementation.

**P5 — Adobe Commerce ecosystem concepts**
- Docs: https://developer.adobe.com/commerce/
- Use for mature extensibility/operator counterexamples where applicable.

BThwani extraction priorities:

~~~text
PARTNER_ONBOARDING
SELLER_MEMBERSHIP
STORE_OWNERSHIP
CATALOG_MUTATION_AUTHORITY
OFFER_OWNERSHIP
ORDER_PARTITIONING
COMMISSION
REFUND_ALLOCATION
SETTLEMENT_ELIGIBILITY
PAYOUT
SUSPENSION
OPERATOR_OVERRIDE
AUDIT
~~~

### 1B.3 Delivery / dispatch / captain operations

**P1 — Fleetbase**
- Repository: https://github.com/fleetbase/fleetbase
- Site: https://fleetbase.io/
- Use for: broad inspectable logistics, dispatch, fleet/order execution and operator workflows.

**P2 — Uber Engineering**
- Engineering: https://www.uber.com/blog/engineering/
- Use for: high-scale dispatch, marketplace matching, geospatial systems, reliability and real-time operational patterns.
- Mode: REFERENCE_ONLY.

**P3 — DoorDash Engineering**
- Engineering: https://careersatdoordash.com/engineering-blog/
- Use for: delivery marketplace, dispatch, logistics optimization and operational reliability.
- Mode: REFERENCE_ONLY.

**P4 — Traccar**
- Repository: https://github.com/traccar/traccar
- Docs: https://www.traccar.org/documentation/
- Use when the question is telemetry, location, geofencing, freshness, offline/reconnect or location provenance.

**P5 — VROOM**
- Repository: https://github.com/VROOM-Project/vroom
- Use only for vehicle/route optimization.

**P6 — OpenTripPlanner**
- Repository: https://github.com/opentripplanner/OpenTripPlanner
- Use only if multimodal-routing concepts become materially relevant.

Specialist override: GPS/telemetry questions start with Traccar; optimization questions start with VROOM.

### 1B.4 Maps / routing / geocoding / serviceability

**P1 — Google Maps Platform**
- Docs: https://developers.google.com/maps
- Use first because BThwani already has Google Maps integration and for routing/geocoding/places operational semantics.

**P2 — Mapbox**
- Docs: https://docs.mapbox.com/
- Use for independent provider comparison and port/fallback validation.

**P3 — Valhalla**
- Repository: https://github.com/valhalla/valhalla
- Use for inspectable self-hosted routing-engine concepts.

**P4 — OSRM**
- Repository: https://github.com/Project-OSRM/osrm-backend
- Use for route-engine internals.

**P5 — VROOM**
- Repository: https://github.com/VROOM-Project/vroom
- Use for multi-stop/vehicle optimization.

**P6 — PostGIS**
- Docs: https://postgis.net/documentation/
- Use for canonical internal geospatial data, spatial constraints, indexes and serviceability semantics.

### 1B.5 Payments / external financial rails / payment orchestration

**P1 — Stripe**
- Docs: https://docs.stripe.com/
- Use for: payment lifecycle, idempotency, webhooks, retries, refunds, disputes, asynchronous outcomes, provenance and API design.

**P2 — Adyen**
- Docs: https://docs.adyen.com/
- Use for: enterprise authorization/capture/refund, idempotency, webhooks, unknown/transient outcomes and reconciliation-oriented provider operations.

**P3 — Hyperswitch**
- Repository: https://github.com/juspay/hyperswitch
- Docs: https://docs.hyperswitch.io/
- Use for: inspectable payment orchestration, connectors, retries, routing and provider abstraction.

**P4 — PayPal / Braintree**
- PayPal: https://developer.paypal.com/docs/
- Braintree: https://developer.paypal.com/braintree/docs/
- Use as another mainstream provider lifecycle and webhook/refund counterexample.

**P5 — Airwallex**
- Docs: https://www.airwallex.com/docs
- Use only if payout/cross-border/provider-operation semantics remain unresolved.

High-risk rule: material payment mutations require P1 + P2 cross-check even if P1 appears sufficient.

### 1B.6 Wallet / ledger / accounting / reconciliation

**P1 — Modern Treasury Ledgers**
- Docs: https://docs.moderntreasury.com/ledgers/docs/overview
- Use for: immutable/double-entry ledger concepts, atomicity, transaction statuses, balances, linking money movement to ledger and reconciliation.

**P2 — TigerBeetle**
- Repository: https://github.com/tigerbeetle/tigerbeetle
- Docs: https://docs.tigerbeetle.com/
- Use for: transfer invariants, idempotency, pending/post/void semantics, timeouts, concurrency and balance correctness.

**P3 — Formance Ledger**
- Repository: https://github.com/formancehq/ledger
- Docs: https://docs.formance.com/
- Use for: inspectable ledger/posting/account modeling.

**P4 — Blnk**
- Repository: https://github.com/blnkfinance/blnk
- Docs: https://docs.blnkfinance.com/
- Use for: transaction lineage, inflight transactions, refund/reconciliation and recovery concepts.

**P5 — Apache Fineract**
- Repository: https://github.com/apache/fineract
- Docs: https://fineract.apache.org/
- Use for broad mature financial-account lifecycle comparisons.

**P6 — Cala**
- Repository: https://github.com/GaloyMoney/cala
- Use as a deep specialist ledger counterexample after fresh maintenance verification.

High-risk rule: ledger closure normally uses P1 + P2; use P3 only when implementation detail or another invariant remains missing.

### 1B.7 Identity / authentication / sessions

**P1 — Keycloak**
- Repository: https://github.com/keycloak/keycloak
- Docs: https://www.keycloak.org/documentation
- Use for: mature authentication, sessions, OAuth2/OIDC/SAML, MFA, federation and security administration.

**P2 — ZITADEL**
- Repository: https://github.com/zitadel/zitadel
- Docs: https://zitadel.com/docs
- Use for: modern multi-tenant/B2B identity, organizations, roles and audit.

**P3 — Ory**
- GitHub: https://github.com/ory
- Docs: https://www.ory.sh/docs/
- Use for: API-first identity/session architecture and separation of identity components.

**P4 — Authentik**
- Repository: https://github.com/goauthentik/authentik
- Docs: https://docs.goauthentik.io/
- Use for federation/SSO/provider flows and operator administration.

**P5 — SuperTokens**
- Repository: https://github.com/supertokens/supertokens-core
- Docs: https://supertokens.com/docs
- Use for application-centric sessions/login edge cases.

### 1B.8 Fine-grained authorization / permissions

**P1 — OpenFGA**
- Repository: https://github.com/openfga/openfga
- Docs: https://openfga.dev/docs
- Use for relationship-based/Zanzibar-style authorization.

**P2 — Keycloak Authorization Services**
- Docs: https://www.keycloak.org/docs/latest/authorization_services/
- Use for RBAC/ABAC/context/resource/scope policy models.

**P3 — Ory Keto**
- Repository: https://github.com/ory/keto
- Docs: https://www.ory.sh/keto/docs/
- Use for a second relationship/permission architecture.

**P4 — Cerbos**
- Repository: https://github.com/cerbos/cerbos
- Docs: https://docs.cerbos.dev/
- Use for policy decision/enforcement separation.

**P5 — Casbin**
- Repository: https://github.com/casbin/casbin
- Docs: https://casbin.org/docs/
- Use for compact RBAC/ABAC comparison.

### 1B.9 Notifications / inbox / preferences / multi-channel delivery

**P1 — Knock**
- Docs: https://docs.knock.app/
- Use for: mature notification workflows, in-app feed/inbox, preferences, routing, batching/digests and multi-channel semantics.

**P2 — Courier**
- Docs: https://www.courier.com/docs/
- Use for: routing, preference centers, channel choices, templates and notification API concepts.

**P3 — Novu**
- Repository: https://github.com/novuhq/novu
- Docs: https://docs.novu.co/
- Use for inspectable open-source workflow/inbox/preferences behavior.

**P4 — OneSignal**
- Docs: https://documentation.onesignal.com/
- Use for mobile push delivery, segmentation and push lifecycle.

**P5 — Braze**
- Docs: https://www.braze.com/docs/
- Use only for advanced enterprise messaging/personalization counterexamples.

Source business facts remain owned by DSH/WLT/etc.; notification references do not become business authority.

### 1B.10 Search / catalog discovery

**P1 — Algolia**
- Docs: https://www.algolia.com/doc/
- Use for product/catalog search UX, indexing, ranking, facets, typo tolerance and filters.

**P2 — Elasticsearch**
- Docs: https://www.elastic.co/guide/
- Use for mature distributed search/query/aggregation/relevance concepts.

**P3 — OpenSearch**
- Repository: https://github.com/opensearch-project/OpenSearch
- Docs: https://docs.opensearch.org/
- Use for open distributed search/analytics comparison.

**P4 — Typesense**
- Repository: https://github.com/typesense/typesense
- Docs: https://typesense.org/docs/
- Use for developer-friendly product/geo search.

**P5 — Meilisearch**
- Repository: https://github.com/meilisearch/meilisearch
- Docs: https://www.meilisearch.com/docs
- Use for lightweight typo-tolerant search/ranking.

Specialist rule: product search starts at Algolia; deep distributed-search architecture starts at Elasticsearch/OpenSearch.

### 1B.11 Durable workflows / sagas / long-running orchestration

**P1 — Temporal**
- Repository: https://github.com/temporalio/temporal
- Docs: https://docs.temporal.io/
- Use for durable execution, retries, timers, compensations and crash recovery.

**P2 — Restate**
- Repository: https://github.com/restatedev/restate
- Docs: https://docs.restate.dev/
- Use for durable functions/objects and idempotent execution.

**P3 — Cadence**
- Repository: https://github.com/uber/cadence
- Docs: https://cadenceworkflow.io/docs/
- Use for a mature alternative workflow model.

**P4 — Inngest**
- Docs: https://www.inngest.com/docs
- Use only as a developer-experience/event-driven counterexample.

Do not add a workflow engine merely because a saga/outbox exists; first prove native mechanisms are insufficient.

### 1B.12 Observability / errors / metrics / traces / logs

**P1 — OpenTelemetry**
- GitHub: https://github.com/open-telemetry
- Docs: https://opentelemetry.io/docs/
- Use for telemetry conventions, traces/metrics/logs and context propagation.

**P2 — Sentry**
- Docs: https://docs.sentry.io/
- GitHub: https://github.com/getsentry
- Use for application errors, releases and mobile/web tracing.

**P3 — Grafana stack**
- Docs: https://grafana.com/docs/
- Use for dashboards, logs, traces, metrics and operational composition.

**P4 — Prometheus**
- Repository: https://github.com/prometheus/prometheus
- Docs: https://prometheus.io/docs/
- Use for metrics, labels and alerting semantics.

**P5 — Datadog**
- Docs: https://docs.datadoghq.com/
- Use only as an enterprise operability counterexample.

### 1B.13 Backoffice / ERP / operational administration

**P1 — Odoo**
- Repository: https://github.com/odoo/odoo
- Docs: https://www.odoo.com/documentation/
- Use for broad operations/admin/workforce/accounting/inventory workflows and mature backoffice IA.

**P2 — ERPNext**
- Repository: https://github.com/frappe/erpnext
- Docs: https://docs.frappe.io/erpnext
- Use for inspectable ERP, operations, accounting, inventory and HR workflows.

**P3 — OrangeHRM**
- Repository: https://github.com/orangehrm/orangehrm
- Use when Workforce/HR-specific employee lifecycle questions remain unresolved.

**P4 — Microsoft Dynamics 365**
- Docs: https://learn.microsoft.com/dynamics365/
- Use only for enterprise backoffice workflow comparison where public docs are sufficient.

These systems do not justify a generic ERP god service.

### 1B.14 Workforce / HR / employee lifecycle

**P1 — Odoo HR**
- Docs: https://www.odoo.com/documentation/
- Use for employee, attendance, time-off, recruitment and operational HR workflows.

**P2 — ERPNext HR**
- Docs: https://docs.frappe.io/erpnext
- Use for employee records, shifts, attendance and onboarding.

**P3 — OrangeHRM**
- Repository: https://github.com/orangehrm/orangehrm
- Use for dedicated HR lifecycle comparison.

**P4 — Workday public concepts**
- Entry: https://www.workday.com/
- Use only for high-level enterprise HR falsification where public material is sufficient.

Do not collapse Identity, Person, Engagement and Operational Role into one actor blob.

### 1B.15 Customer support / operator service

**P1 — Zendesk**
- Docs: https://developer.zendesk.com/documentation/
- Use for ticket lifecycle, requester/agent boundaries, status, SLA/escalation and audit.

**P2 — Intercom**
- Docs: https://developers.intercom.com/
- Use for conversations, customer support/inbox and operator/customer context.

**P3 — Chatwoot**
- Repository: https://github.com/chatwoot/chatwoot
- Docs: https://www.chatwoot.com/docs/
- Use for inspectable omnichannel support/inbox workflows.

**P4 — Zammad**
- Repository: https://github.com/zammad/zammad
- Docs: https://docs.zammad.org/
- Use for helpdesk/ticket/audit/operator workflow comparison.

### 1B.16 Feature flags / configuration / Platform Control

**P1 — LaunchDarkly**
- Docs: https://docs.launchdarkly.com/
- Use for mature flag lifecycle, targeting, environments, rollout and audit.

**P2 — OpenFeature**
- GitHub: https://github.com/open-feature
- Docs: https://openfeature.dev/docs/
- Use for vendor-neutral feature-flag API semantics.

**P3 — Unleash**
- Repository: https://github.com/Unleash/unleash
- Docs: https://docs.getunleash.io/
- Use for inspectable flag strategy/environments/rollout.

**P4 — Flagsmith**
- Repository: https://github.com/Flagsmith/flagsmith
- Docs: https://docs.flagsmith.com/
- Use for another open remote-config/flag model.

Feature flags do not authorize Platform Control to own unrelated business configuration.

### 1B.17 Promotions / discounts / loyalty

**P1 — Shopify**
- Docs: https://shopify.dev/docs
- Use for discount lifecycle, combinability, targeting and cart/order effects.

**P2 — Talon.One**
- Docs: https://docs.talon.one/
- Use for advanced promotion/loyalty rules, campaigns, budgets, coupons and effects.

**P3 — Voucherify**
- Docs: https://docs.voucherify.io/
- Use for coupons, promotions, loyalty, validation and redemption lifecycle.

**P4 — Saleor**
- Docs: https://docs.saleor.io/
- Use for inspectable promotion implementation comparison.

**P5 — Medusa**
- Docs: https://docs.medusajs.com/
- Use only if implementation details remain unresolved.

### 1B.18 Fraud / payment risk

**P1 — Stripe Radar**
- Docs: https://docs.stripe.com/radar
- Use for payment fraud/risk signals, rules and review outcomes.

**P2 — Adyen risk management**
- Docs: https://docs.adyen.com/risk-management/
- Use for enterprise payment-risk rules and result handling.

**P3 — Sift**
- Docs: https://developers.sift.com/
- Use for abuse/fraud event modeling and decision workflows.

**P4 — Fingerprint**
- Docs: https://dev.fingerprint.com/
- Use for device-intelligence concepts only when required.

Fraud providers produce signals/decisions; BThwani owns canonical business action/audit semantics.

### 1B.19 Object storage / media

**P1 — Amazon S3 semantics**
- Docs: https://docs.aws.amazon.com/s3/
- Use for object semantics, presigned access, lifecycle, metadata and multipart upload.

**P2 — Cloudflare R2**
- Docs: https://developers.cloudflare.com/r2/
- Use because BThwani development may use R2 and it is S3-compatible.

**P3 — MinIO**
- Repository: https://github.com/minio/minio
- Docs: https://min.io/docs/
- Use for local/self-hosted S3-compatible conformance.

Domain code depends on ObjectStorage semantics, not an S3/R2/MinIO business authority.

### 1B.20 Secrets / credentials / sensitive configuration

**P1 — HashiCorp Vault**
- Repository: https://github.com/hashicorp/vault
- Docs: https://developer.hashicorp.com/vault/docs
- Use for secret references, leases, rotation, dynamic secrets and audit.

**P2 — AWS Secrets Manager**
- Docs: https://docs.aws.amazon.com/secretsmanager/
- Use for managed secret versioning/rotation/injection patterns.

**P3 — SOPS**
- Repository: https://github.com/getsops/sops
- Use for encrypted configuration/secrets workflow concepts.

**P4 — Doppler**
- Docs: https://docs.doppler.com/
- Use as a managed secrets/config developer-experience counterexample.

### 1B.21 API contracts / generation / compatibility

**P1 — OpenAPI Specification**
- Spec: https://spec.openapis.org/oas/latest.html
- Use for canonical HTTP API contract semantics.

**P2 — oapi-codegen**
- Repository: https://github.com/oapi-codegen/oapi-codegen
- Use if BThwani needs one Go OpenAPI generation lineage.

**P3 — Redocly**
- Docs: https://redocly.com/docs/
- Use for OpenAPI lint/bundle/governance concepts.

**P4 — Pact**
- GitHub: https://github.com/pact-foundation
- Docs: https://docs.pact.io/
- Use for consumer/provider contract testing concepts.

**P5 — Schemathesis**
- Repository: https://github.com/schemathesis/schemathesis
- Docs: https://schemathesis.readthedocs.io/
- Use for property/fuzz-style OpenAPI testing when applicable.

### 1B.22 Integration testing / failure injection / real infrastructure proof

**P1 — Testcontainers-Go**
- Repository: https://github.com/testcontainers/testcontainers-go
- Use for real PostgreSQL/Redis/service dependencies in deterministic integration tests.

**P2 — WireMock**
- Repository: https://github.com/wiremock/wiremock
- Docs: https://wiremock.org/docs/
- Use for provider simulators, timeout/duplicate/unknown-result behavior and API conformance.

**P3 — Toxiproxy**
- Repository: https://github.com/Shopify/toxiproxy
- Use for latency, disconnect, timeout and network-failure simulation.

**P4 — Pact**
- Docs: https://docs.pact.io/
- Use when consumer/provider compatibility is the unresolved risk.

**P5 — k6**
- Repository: https://github.com/grafana/k6
- Docs: https://grafana.com/docs/k6/
- Use for load/performance only when performance becomes a proven closure criterion.

---

## 1C. ROOT-TO-REFERENCE ROUTER

Use this table to avoid broad browsing.

| BThwani root/question | Start here | First fallback | Specialist/deep fallback |
|---|---|---|---|
| Cart / checkout / order | Shopify | Adobe Commerce | commercetools / Saleor |
| Partner / marketplace | Mirakl | Mercur | Sharetribe |
| Catalog / inventory | Shopify | Adobe Commerce | commercetools / Saleor |
| Dispatch | Fleetbase | Uber Engineering | DoorDash Engineering |
| Captain GPS / geofence | Traccar | Google Maps | Mapbox |
| Routing | Google Maps | Mapbox | Valhalla / OSRM |
| Route optimization | VROOM | Google/Mapbox optimization docs | Valhalla |
| Payment provider lifecycle | Stripe | Adyen | Hyperswitch |
| Unknown financial result | Adyen | Stripe | Hyperswitch |
| Wallet / ledger | Modern Treasury | TigerBeetle | Formance |
| Reconciliation | Modern Treasury | Adyen | Blnk / Formance |
| Identity / sessions | Keycloak | ZITADEL | Ory |
| Relationship authorization | OpenFGA | Keycloak AuthZ | Ory Keto |
| Notification workflow | Knock | Courier | Novu |
| Push delivery | OneSignal | Expo/FCM official docs | Novu |
| Product search | Algolia | Elasticsearch | OpenSearch / Typesense |
| Durable workflow | Temporal | Restate | Cadence |
| Tracing / telemetry contract | OpenTelemetry | Grafana | Sentry |
| Error/release observability | Sentry | OpenTelemetry | Grafana |
| Backoffice operations | Odoo | ERPNext | Dynamics concepts |
| Workforce / HR | Odoo HR | ERPNext HR | OrangeHRM |
| Support | Zendesk | Intercom | Chatwoot |
| Feature flags / rollout | LaunchDarkly | OpenFeature | Unleash |
| Promotions / loyalty | Shopify | Talon.One | Voucherify |
| Payment fraud/risk | Stripe Radar | Adyen Risk | Sift |
| Object storage | S3 semantics | R2 | MinIO |
| Secrets | Vault | AWS Secrets Manager | SOPS |
| OpenAPI contract | OpenAPI spec | oapi-codegen | Redocly / Pact |
| Real integration proof | Testcontainers-Go | WireMock | Toxiproxy / Pact |

---

## 1D. REFERENCE QUERY CARD

Before consulting the corpus, reduce the root to a concrete question.

Example:

~~~text
ACTIVE_ROOT:
WLT payment unknown-result handling

QUESTION:
Provider timed out after a payment mutation. What state must BThwani persist and when is retry safe?

P1:
Adyen

P1_FINDINGS_REQUIRED:
- idempotency behavior
- timeout/transient semantics
- webhook/reconciliation behavior
- safe retry condition

P2_CROSS_CHECK:
Stripe

STOP_WHEN:
- canonical BThwani UNKNOWN state is defined
- reconciliation path is defined
- retry safety is defined
- provider provenance is defined
- tests can falsify duplicate charge / lost result
~~~

Another example:

~~~text
ACTIVE_ROOT:
Captain live location

QUESTION:
When must a position be considered stale and how should reconnect/out-of-order events behave?

P1:
Traccar

P2:
Google Maps/provider semantics only if needed

STOP_WHEN:
- position timestamp/provenance is defined
- freshness/staleness rule is defined
- out-of-order behavior is defined
- offline/reconnect behavior is defined
- DSH remains canonical delivery owner
~~~

This card is temporary reasoning/evidence, not a durable campaign-state ledger.

---

## 1E. Corpus expansion law

Do not add a new reference because it is popular.

A new reference enters this file only when it provides material value not sufficiently represented by the higher-priority corpus:

~~~text
NEW_REFERENCE_ADMISSION
=
UNIQUE_FALSIFICATION_VALUE
OR
UNIQUE_SPECIALIST_DEPTH
OR
CLEARLY_STRONGER_CURRENT_P1/P2
~~~

If a source merely duplicates existing P4/P5 material:

~~~text
DO_NOT_ADD
~~~

If an existing P1 becomes stale, inaccessible, materially weaker, or no longer exposes useful public evidence:

~~~text
RE-RANK
→ PROMOTE_STRONGER_REFERENCE
→ KEEP_LIST_SHORT
~~~

The goal is maximum semantic coverage with minimum browsing fan-out.

---

## 2. Non-negotiable stack preservation

External-source research does **not** authorize a platform rewrite.

The default canonical technology direction remains:

```text
BACKEND
→ Go

DATABASE
→ PostgreSQL / PostGIS

MOBILE
→ TypeScript
→ React Native
→ Expo

CONTROL PANEL
→ TypeScript
→ React
→ Next.js

PRIMARY BUSINESS BOUNDED CONTEXTS
→ DSH
→ WLT
→ Identity
→ Workforce
→ other independently proven services only
```

Therefore, the following are forbidden by default:

```text
REPLACE_GO_BACKEND_WITH_NODE_PLATFORM
REPLACE_GO_BACKEND_WITH_PYTHON_PLATFORM
REPLACE_GO_BACKEND_WITH_RUBY_PLATFORM
REPLACE_POSTGRESQL_WITH_AN_UNRELATED_DATABASE
REPLACE_EXPO_APPS_WITH_AN_EXTERNAL_MARKETPLACE_FRONTEND
REPLACE_DSH/WLT_WITH_A_MONOLITHIC_EXTERNAL_PLATFORM
ADOPT_A_WHOLE_PLATFORM_ONLY_BECAUSE_IT_IS_OPEN_SOURCE
```

A technology change is allowed only when the normal orchestrator/root-cause process independently proves that the current technology itself is the root defect and that migration is safer and materially better than refounding inside the existing stack.

---

## 3. Canonical usage model

Every external project must be classified into exactly one of these modes:

### 3.1 REFERENCE_ONLY

Read architecture, state machines, APIs, tests, failure handling, product flows, database models, and invariants.

Do not copy or import code.

Use this mode by default for:

```text
whole marketplace platforms
whole logistics platforms
whole ERP/banking platforms
copyleft projects
projects in a materially different stack
projects with mixed/open-core licensing
```

### 3.2 SELECTIVE_LOGIC_REFERENCE

Extract a specific behavioral invariant or workflow, then implement it natively inside BThwani.

Example:

```text
EXTERNAL PROJECT
→ refund state machine is stronger than ours
→ identify invariant
→ map invariant to WLT owner
→ implement in Go/PostgreSQL/contracts/tests
→ no external platform dependency introduced
```

### 3.3 SMALL_COMPONENT_CANDIDATE

A focused library/tool may be adopted when it removes substantial custom plumbing and passes all gates.

Examples:

```text
Testcontainers-Go
sqlc
pgx
oapi-codegen
Watermill
OpenTelemetry-Go
```

None is automatically required.

### 3.4 COMPONENT/SERVICE_ADOPTION

A self-contained external engine may be integrated behind a semantic BThwani port only when it owns no BThwani business truth and can be replaced without rewriting the domain.

Examples that may be evaluated in the future:

```text
routing engine
GPS/telemetry engine
object-storage implementation
search engine
observability backend
```

The domain must depend on a semantic port, never directly on the vendor/project.

### 3.5 WHOLE_PLATFORM_REPLACEMENT

Forbidden by default.

This mode requires explicit proof that:

```text
CURRENT_BTHWANI_BOUNDARY_IS_A_PROVEN_LOSER
REPLACEMENT_MATCHES_REQUIRED_TRUTH
STACK_MIGRATION_COST_IS_ACCEPTABLE
ALL_FIVE_SURFACES_CAN_CUT_OVER
DSH/WLT/IDENTITY/WORKFORCE_BOUNDARIES_REMAIN_CORRECT
DATA_MIGRATION_IS_PROVEN
LICENSE_IS_ACCEPTABLE
LOCK_IN_IS_ACCEPTABLE
LEVEL_4_CLOSURE_GETS_FASTER_NOT_SLOWER
```

Absence of this proof means: do not replace.

---

## 4. Mandatory extraction workflow

Whenever a BThwani root touches an area covered by mature external systems:

```text
PIN_LIVE_h
→ IDENTIFY_CURRENT_BTHWANI_OWNER
→ IDENTIFY_REQUIRED_PRODUCT_TRUTH
→ SELECT_RELEVANT_EXTERNAL_REFERENCES
→ EXTRACT_BEHAVIORAL_INVARIANTS
→ EXTRACT_EDGE_CASES
→ EXTRACT_FAILURE_MODES
→ EXTRACT_SECURITY/FINANCIAL_RULES
→ EXTRACT_TEST_ORACLE_SCENARIOS
→ COMPARE_WITH_BTHWANI
→ CLASSIFY_EACH_FINDING
→ IMPLEMENT_ONLY_PROVEN_GAPS
→ VERIFY_WITH_BTHWANI_CONTRACTS/DATA/RUNTIME
→ PROVE_NO_NEW_SHADOW_AUTHORITY
```

Each finding must terminate in one of:

```text
PRESENT_AND_CANONICAL
PRESENT_BUT_DEFECTIVE
PRESENT_BUT_IN_WRONG_OWNER
MISSING_AND_REQUIRED
NOT_APPLICABLE
REFERENCE_COMPONENT_CANDIDATE
REJECTED
```

“Interesting” is not a terminal state.

---

## 5. What to extract from external projects

### Product/business logic

Look for:

```text
actors
roles
permissions
state machines
allowed actions
order lifecycle
seller lifecycle
captain lifecycle
dispatch lifecycle
checkout lifecycle
payment lifecycle
refund lifecycle
commission lifecycle
settlement lifecycle
payout lifecycle
reconciliation lifecycle
inventory effects
serviceability rules
cancellation rules
timeout behavior
failure recovery
idempotency
concurrency rules
```

### API/contracts

Look for:

```text
resource boundaries
operation semantics
request/response ownership
error models
idempotency keys
webhook semantics
pagination
filtering
authorization metadata
versioning
event schemas
```

Do not mirror an external API merely because it exists.

### Database/data integrity

Look for:

```text
canonical writer
uniqueness constraints
foreign-key semantics
transaction boundaries
ledger/posting rules
optimistic/pessimistic locking
outbox boundaries
reconciliation evidence
audit/provenance
derived projection rules
```

### UX/journeys

Look for:

```text
missing screens
missing journey states
recovery paths
empty states
error states
offline states
operator workflows
partner onboarding
captain workflow
refund/dispute visibility
financial status explainability
```

UX reference does not transfer business authority to the app.

### Testing

Look for:

```text
integration scenarios
race-condition tests
retry tests
replay tests
financial balance tests
double-submit tests
timeout/unknown-result tests
webhook replay tests
migration tests
real-database tests
cross-service contract tests
```

---

## 6. Primary reference corpus

Licenses and project terms can change. **Fresh verification of the exact repository/component license is mandatory immediately before direct code reuse or dependency adoption.**

### 6.1 Marketplace / Partner / Commerce

#### Mercur
Repository: https://github.com/mercurjs/mercur
Current observed license class: MIT
Primary mode: `SELECTIVE_LOGIC_REFERENCE`

Use to challenge BThwani for:

```text
seller/vendor onboarding
seller teams/membership
vendor catalog ownership
offers
multi-vendor order behavior
commission calculation
payout eligibility
refund allocation
seller/admin boundaries
marketplace operational workflows
```

High-value candidate invariants:

```text
SELLER_SCOPING
PARTNER_MEMBERSHIP
CATALOG_MUTATION_AUTHORITY
ORDER_SPLITTING
COMMISSION_CALCULATION
SETTLEMENT_ELIGIBILITY
PAYOUT_LIFECYCLE
REFUND_ALLOCATION
```

Do not replace the Go DSH backend with Mercur.

#### Medusa
Repository: https://github.com/medusajs/medusa
Primary mode: `REFERENCE_ONLY / SELECTIVE_LOGIC_REFERENCE`

Use for:

```text
commerce lifecycle
cart/checkout/order modeling
inventory
fulfillment
payment orchestration boundaries
promotions
returns/refunds
```

Do not adopt a whole Node/TypeScript commerce backend as a shortcut around BThwani refoundation.

#### Saleor
Repository: https://github.com/saleor/saleor
Primary mode: `REFERENCE_ONLY`

Use for:

```text
checkout semantics
order state
inventory
payment behavior
GraphQL contract ideas
permissions
operator workflows
```

Its Python/GraphQL stack is not a reason to change BThwani’s Go direction.

#### Spree
Repository: https://github.com/spree/spree
Primary mode: `REFERENCE_ONLY`

Use for mature commerce and admin workflow comparisons.

#### Vendure
Repository: https://github.com/vendure-ecommerce/vendure
Primary mode: `REFERENCE_ONLY`

Treat direct code reuse conservatively because license/commercial terms must be freshly verified for the exact version/component before use.

---

## 7. Logistics / Captain / Dispatch corpus

### Traccar
Repository: https://github.com/traccar/traccar
Current observed license class: Apache-2.0
Primary mode: `SELECTIVE_LOGIC_REFERENCE / COMPONENT_CANDIDATE`

Use to challenge Captain/dispatch/telemetry logic for:

```text
position timestamp
position accuracy
heading
speed
last-known-position
position freshness
stale-position classification
geofence entry/exit
offline behavior
reconnect behavior
device/session identity
telemetry provenance
```

BThwani must still own delivery/dispatch business truth.

### Fleetbase
Repository: https://github.com/fleetbase/fleetbase
Primary mode: `REFERENCE_ONLY`

Use for:

```text
fleet/dispatch concepts
driver/captain operations
order/route execution
fleet management
operator workflows
```

Do not import a whole logistics platform into DSH by default. Freshly verify the exact license of every component before any code reuse.

### Valhalla
Repository: https://github.com/valhalla/valhalla
Primary mode: `REFERENCE_ONLY / FUTURE_COMPONENT_CANDIDATE`

Use for routing-engine concepts if self-hosted routing ever becomes a proven requirement.

Google Maps already being used in development is not itself a reason to add another routing engine.

### VROOM
Repository: https://github.com/VROOM-Project/vroom
Primary mode: `REFERENCE_ONLY / FUTURE_COMPONENT_CANDIDATE`

Use for vehicle-route optimization concepts only when a proven route-optimization root exists.

---

## 8. WLT / financial corpus

Financial references are primarily **invariant oracles**, not automatic runtime replacements.

### Formance Ledger
Repository: https://github.com/formancehq/ledger
Primary mode: `SELECTIVE_LOGIC_REFERENCE`

Use to challenge:

```text
ledger account modeling
multi-posting transactions
atomic posting
financial transaction semantics
query/readback
idempotency
```

### Blnk
Repository: https://github.com/blnkfinance/blnk
Primary mode: `SELECTIVE_LOGIC_REFERENCE`

Use to challenge:

```text
transaction lineage
inflight transactions
refunds
bulk operations
queue/recovery behavior
reconciliation
```

### TigerBeetle
Repository: https://github.com/tigerbeetle/tigerbeetle
Primary mode: `REFERENCE_ONLY / INVARIANT_ORACLE`

Use to challenge:

```text
idempotent transfer identity
pending/post/void semantics
timeouts
replay behavior
balance correctness
concurrency
financial history
```

Do not replace PostgreSQL/WLT merely because TigerBeetle has stronger financial primitives.

### Cala
Repository: https://github.com/GaloyMoney/cala
Primary mode: `REFERENCE_ONLY`

Use for double-entry/ledger modeling comparisons if the repository remains applicable after fresh verification.

### Apache Fineract
Repository: https://github.com/apache/fineract
Primary mode: `REFERENCE_ONLY`

Use for mature financial/loan/account lifecycle concepts only. It is too broad to become the BThwani core by default.

### ERPNext
Repository: https://github.com/frappe/erpnext
Primary mode: `REFERENCE_ONLY`

Use for accounting/operations edge-case research only where relevant. It must not become a general replacement platform.

---

## 9. Go/PostgreSQL engineering candidates

These candidates are not part of the stack merely because they are good projects.

### Testcontainers-Go
Repository: https://github.com/testcontainers/testcontainers-go
Typical license class: MIT
Primary mode: `SMALL_COMPONENT_CANDIDATE`

High-value use:

```text
REAL_POSTGRESQL
→ RUN_MIGRATIONS
→ START_SERVICE
→ WRITE
→ READ_BACK
→ ASSERT_EVENT/FINANCIAL_EFFECT
→ DESTROY_ENVIRONMENT
```

Strong candidate when real-database integration verification is required.

### sqlc
Repository: https://github.com/sqlc-dev/sqlc
Typical license class: MIT
Primary mode: `SMALL_COMPONENT_CANDIDATE`

Use only if the current data-access/root refoundation proves that generated type-safe SQL access removes material hand-written duplication or drift.

Do not introduce it as cosmetic modernization.

### pgx
Repository: https://github.com/jackc/pgx
Typical license class: MIT
Primary mode: `SMALL_COMPONENT_CANDIDATE`

BThwani currently uses PostgreSQL and existing Go database access must not be migrated to pgx as an unrelated side project.

Adopt only if the DB access layer is already the proven root and the migration removes a material defect.

### oapi-codegen
Repository: https://github.com/oapi-codegen/oapi-codegen
Typical license class: Apache-2.0
Primary mode: `SMALL_COMPONENT_CANDIDATE`

Strong candidate if it helps achieve:

```text
ONE_CANONICAL_OPENAPI_SOURCE
→ ONE_REPRODUCIBLE_COMPOSER
→ ONE_GENERATOR_LINEAGE
→ NO_MANUAL_DTO/ENUM/OPERATION_MIRRORS
```

Do not introduce a second generator alongside another surviving generator lineage.

### Watermill
Repository: https://github.com/ThreeDotsLabs/watermill
Typical license class: MIT
Primary mode: `SMALL_COMPONENT_CANDIDATE`

Use only if event/outbox/messaging refoundation proves a genuine need.

Do not add an event framework merely for architectural sophistication.

### River
Repository: https://github.com/riverqueue/river
Typical license class: MPL-2.0
Primary mode: `REFERENCE_ONLY / CONDITIONAL_COMPONENT_CANDIDATE`

Free does not mean zero licensing consideration. Prefer simpler licensing when two technically adequate choices exist.

### OpenTelemetry-Go
Repository: https://github.com/open-telemetry/opentelemetry-go
Primary mode: `SMALL_COMPONENT_CANDIDATE`

Use for observability only when the runtime/observability root requires it. Observability must not become business authority.

### Casbin
Repository: https://github.com/casbin/casbin
Primary mode: `REFERENCE_ONLY / CONDITIONAL_COMPONENT_CANDIDATE`

Use only if authorization architecture proves a need. Identity/security remains canonical authority for BThwani permission semantics.

---

## 10. Adoption gate for any external dependency

No dependency may be added until all applicable questions are answered:

```text
1. WHAT_PROVEN_ROOT_REQUIRES_THIS?
2. WHAT_BTHWANI_TRUTH_DOES_IT_OWN?
3. SHOULD_IT_OWN_THAT_TRUTH?
4. DOES_IT_REPLACE_A_PROVEN_LOSER?
5. DOES_IT_REMOVE_SUBSTANTIAL_CUSTOM_PLUMBING?
6. CAN_THE_DOMAIN_DEPEND_ON_A_SEMANTIC_PORT_INSTEAD?
7. IS_THE_LICENSE_ACCEPTABLE_FOR_THE_EXACT_VERSION/COMPONENT?
8. IS_IT_FREE_TO_USE_IN_THE_REQUIRED_MODE?
9. CAN_LEVEL_4_BE_REPRODUCED_WITHOUT_A_PAID_SAAS_DEPENDENCY?
10. DOES_IT_PRESERVE_GO/POSTGRES/EXPO/NEXT_DIRECTION?
11. DOES_IT_CREATE_A_SECOND_SOURCE_OF_TRUTH?
12. DOES_IT_CREATE_A_SECOND_GENERATOR/REGISTRY/WRITER?
13. DOES_IT_ADD_RUNTIME/OPERATIONS_COMPLEXITY?
14. IS_MAINTENANCE_ACTIVE_ENOUGH?
15. CAN_IT_BE_REMOVED/REPLACED_WITHOUT_REWRITING_BUSINESS_LOGIC?
16. DOES_IT_MAKE_THE_CURRENT_ROOT_FASTER_TO_CLOSE?
```

Adoption is allowed only when the answer set proves a net reduction in canonical complexity.

---

## 11. Zero-cost rule

BThwani refoundation must not require buying source code or a commercial source license merely to achieve canonical closure.

Default preference order:

```text
1. EXISTING_BTHWANI_CODE_IF_CANONICAL
2. NATIVE_REFOUNDATION_IN_EXISTING_STACK
3. PERMISSIVE_FREE_OSS_COMPONENT
4. LOCAL_SIMULATOR / SELF_HOSTED_FREE_TOOL
5. FREE_EXTERNAL_SANDBOX WHEN USEFUL
6. COMPLEX_COPYLEFT_REFERENCE_ONLY
7. PAID_SOURCE_OR_REQUIRED_PAID_SAAS = NOT_A_DEFAULT_CLOSURE_DEPENDENCY
```

Free-tier availability is operational convenience, not architectural truth.

---

## 12. License handling

Before direct code reuse or dependency adoption:

```text
FETCH_CURRENT_LICENSE
→ VERIFY_EXACT_REPOSITORY
→ VERIFY_EXACT_COMPONENT
→ VERIFY_EXACT_VERSION/TAG
→ CHECK_NOTICE/ATTRIBUTION_REQUIREMENTS
→ CHECK_COPYLEFT/SOURCE_DISTRIBUTION_IMPLICATIONS
→ RECORD_DECISION_IN_NORMAL_DEPENDENCY_REVIEW_EVIDENCE
```

Default engineering policy:

```text
MIT / BSD / Apache-2.0
→ easiest direct-candidate class, still verify

MPL
→ conditional; inspect file-level obligations

GPL / AGPL / strong copyleft
→ reference-only by default unless explicitly approved after license review

mixed / open-core / commercial add-ons
→ reference-only by default; verify component boundaries before use

unknown / no license
→ no code reuse
```

This is an engineering risk policy, not legal advice.

---

## 13. Provider and SaaS rule

External providers must remain adapters behind semantic ports.

Examples:

```text
DSH
→ Geocoder
→ RoutePlanner

WLT
→ PaymentGateway
→ PayoutRail

Identity / Notification owner
→ SmsSender
→ EmailSender
→ PushSender

Media owner
→ ObjectStorage
```

Forbidden:

```text
GenericProvider.execute(...)
ProviderManager as a business god service
Vendor-specific domain models
Vendor-specific business truth
Provider credentials as general business records
Blind financial fallback
```

Development may use real sandboxes/free tiers where practical, but Level-4 closure must have a reproducible path that does not depend on buying access to a SaaS provider.

---

## 14. Mapping external knowledge to BThwani owners

```text
MARKETPLACE / SELLER / STORE / CATALOG / ORDER
→ DSH semantic capability owner

CHECKOUT ORCHESTRATION
→ DSH Checkout

PAYMENT / LEDGER / REFUND / COMMISSION / SETTLEMENT / PAYOUT / RECONCILIATION
→ WLT

AUTHENTICATION / SESSION / ACTOR / SECURITY-SENSITIVE AUTHORIZATION
→ Identity

PERSON / ENGAGEMENT / EMPLOYEE / OPERATIONAL WORKFORCE STATE
→ Workforce

ROUTE / APP SHELL / NAVIGATION / DEEP LINKS / NATIVE INTEGRATION
→ apps/*

DESIGN PRIMITIVES
→ proven design-system package

EXTERNAL REQUEST EXECUTION
→ adapter under the domain/service that understands the operation

CROSS-SERVICE WIRE LAW
→ sovereign service contract / proven root protocol owner
```

External project directory names must never determine BThwani ownership.

---

## 15. Required financial comparison checklist

Whenever WLT/payment/checkout-finance is touched, compare against mature financial references for:

```text
CANONICAL_FINANCIAL_OWNER
CANONICAL_LEDGER_WRITER
BALANCED_POSTING_WHERE_APPLICABLE
EXACT_IDEMPOTENCY
REPLAY_BEHAVIOR
TRANSACTION_ATOMICITY
CONCURRENCY/LOCKING
PENDING_STATE
UNKNOWN_PROVIDER_RESULT
REFUND
REVERSAL
SETTLEMENT
PAYOUT
RECONCILIATION
PROVIDER_PROVENANCE
AUDIT
CANONICAL_READBACK
ZERO_PARALLEL_WRITERS
```

External references may reveal missing rules, but BThwani’s WLT remains the owner.

---

## 16. Required Captain/dispatch comparison checklist

Whenever Captain/dispatch/location is touched, compare against mature logistics/telemetry references for:

```text
CAPTAIN_IDENTITY
ASSIGNMENT
ACCEPT/REJECT
ARRIVAL
PICKUP
DELIVERY
CANCELLATION
LOCATION_TIMESTAMP
LOCATION_ACCURACY
LOCATION_FRESHNESS
STALE_LOCATION
OFFLINE
RECONNECT
GEOFENCE
ROUTE_DEVIATION_WHERE_APPLICABLE
DUPLICATE_LOCATION_EVENT
OUT_OF_ORDER_LOCATION_EVENT
BATTERY/OS_BACKGROUND_LIMITATIONS_WHERE_MATERIAL
OPERATOR_OVERRIDE
AUDIT/PROVENANCE
```

Do not turn Traccar/Fleetbase into the DSH business owner.

---

## 17. Required Partner/marketplace comparison checklist

Whenever Partner/store/catalog/commission/payout is touched, compare against mature marketplace references for:

```text
PARTNER_ONBOARDING
PARTNER_MEMBERSHIP
STORE_OWNERSHIP
CATALOG_MUTATION_AUTHORITY
APPROVAL
AVAILABILITY
ORDER_PARTITIONING
FULFILLMENT_RESPONSIBILITY
COMMISSION_CALCULATION
REFUND_ALLOCATION
SETTLEMENT_ELIGIBILITY
PAYOUT_DESTINATION
PAYOUT_FAILURE
SUSPENSION
AUDIT
CONTROL_PANEL_OPERATOR_ACTIONS
```

---

## 18. Testing/reference oracle law

External projects are valuable as adversarial test oracles.

A missing external scenario should become a BThwani test only when the scenario is materially applicable to BThwani.

High-value test families:

```text
DOUBLE_SUBMIT
DUPLICATE_WEBHOOK
OUT_OF_ORDER_WEBHOOK
TIMEOUT_WITH_UNKNOWN_REMOTE_RESULT
RETRY_AFTER_UNKNOWN
CONCURRENT_BALANCE_MUTATION
REFUND_AFTER_PARTIAL_FULFILLMENT
REVERSAL_AFTER_FAILURE
SETTLEMENT_VS_PAYOUT_SEPARATION
CAPTAIN_OFFLINE/RECONNECT
STALE_GPS
PARTNER_SUSPENDED_DURING_ACTIVE_ORDER
CATALOG_MUTATION_WITHOUT_AUTHORITY
MIGRATION_FROM_OLD_SCHEMA
REAL_POSTGRES_READBACK
CONTRACT_GENERATION_REPRODUCIBILITY
```

---

## 19. AI-agent usage

Multiple AI agents may inspect external projects in parallel only as read-only evidence collectors/reviewers when allowed by the current orchestrator.

Recommended pattern:

```text
Gemini
→ product surfaces / Expo / UX / journey comparison

Claude
→ architecture / finance / security / data falsification

Codex
→ sole mutation authority when selected by the active execution session
```

Never allow external-reference research to create:

```text
THREE_COMPETING_ARCHITECTURES
THREE_NAMING_SYSTEMS
THREE_PARTIAL_CUTOVERS
THREE_MUTATORS_ON_h
```

The current orchestrator remains supreme.

---

## 20. Explicit prohibitions

```text
DO_NOT_COPY_AN_EXTERNAL_ARCHITECTURE_WHOLESALE
DO_NOT_CHANGE_LANGUAGE_TO_MATCH_A_REFERENCE_PROJECT
DO_NOT_CHANGE_DATABASE_TO_MATCH_A_REFERENCE_PROJECT
DO_NOT_CREATE_A_GENERIC_PROVIDERS_SERVICE
DO_NOT_CREATE_A_GENERIC_SHARED_DUMP
DO_NOT_ADD_A_BROKER_WITHOUT_A_PROVEN_ROOT
DO_NOT_ADD_SQLC/PGX/TESTCONTAINERS/OAPI_CODEGEN_ONLY_FOR_MODERNIZATION
DO_NOT_ADD_TWO_TOOLS_FOR_THE_SAME_GENERATION/AUTHORITY_ROLE
DO_NOT_IMPORT_COPYLEFT_CODE_WITHOUT_REVIEW
DO_NOT_ASSUME_GITHUB_PUBLIC == PERMISSIVE_LICENSE
DO_NOT_ASSUME_FREE_TIER == DURABLE_FREE_ARCHITECTURE
DO_NOT_MAKE_EXTERNAL_PROJECTS_CANONICAL_BTHWANI_AUTHORITIES
DO_NOT_PRESERVE_A_LOSER_JUST_TO_MATCH_AN_EXTERNAL_PATTERN
DO_NOT_TURN_THIS_FILE_INTO_A_PROGRESS_LEDGER
DO_NOT_PIN_LIVE_h_STATE_IN_THIS_FILE
```

---

## 21. Decision rule

For every external idea/component:

```text
IF BTHWANI_ALREADY_HAS_CORRECT_CANONICAL_TRUTH
→ KEEP BTHWANI

IF BTHWANI_HAS_REQUIRED_TRUTH_BUT_IMPLEMENTATION_IS_DEFECTIVE
→ REFOUND_BTHWANI

IF REQUIRED_LOGIC_IS_MISSING
→ IMPLEMENT_IT_IN_THE_CANONICAL_BTHWANI_OWNER

IF A_SMALL_FREE_COMPONENT_REMOVES_MATERIAL_GENERIC_PLUMBING
AND LICENSE/MAINTENANCE/OPERATIONS/OWNERSHIP_GATES_PASS
→ ADOPT_BEHIND_THE_CORRECT_BOUNDARY

IF A_WHOLE_EXTERNAL_PLATFORM_REQUIRES_STACK/DOMAIN_REPLACEMENT
→ REFERENCE_ONLY BY DEFAULT
```

---

## 22. Final principle

```text
OPEN_SOURCE_IS_AN_ACCELERATOR_AND_ADVERSARIAL_REFERENCE
NOT_THE_NEW_BTHWANI_ARCHITECTURE
```

BThwani keeps its product truth, languages, bounded contexts, deployment identities, and canonical ownership.

External projects are used to:

```text
FIND_WHAT_WE_MISSED
PROVE_WHAT_WE_IMPLEMENTED_WEAKLY
BORROW_MATURE_INVARIANTS
BORROW_EDGE_CASES
BORROW_TEST_IDEAS
ADOPT_SMALL_GENERIC_COMPONENTS_WHEN_PROVEN
```

The objective is faster and more complete Level-4 refoundation with **less** custom accidental complexity, not replacement of BThwani with someone else’s platform.
