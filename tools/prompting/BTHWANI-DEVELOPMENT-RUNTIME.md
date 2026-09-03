# BThwani Development Runtime

**Status:** Development operating profile  
**Primary phase:** Development / refoundation / integration  
**Repository:** `bthwani2-boop/bthwani-suite-next`  
**Scope:** Practical development runtime, external development services, local tooling, OTP/SMS, media, financial simulators, and integration verification.

---

## 1. Purpose

This document defines the **simple default development environment** for BThwani.

The goal is not to reproduce production on the developer machine at all times.

The goal is to make daily development:

- fast;
- light on the Windows workstation;
- low-cost or free when practical;
- easy to understand;
- reproducible;
- provider-neutral at domain boundaries;
- compatible with later production cutover without rewriting business logic.

Production is intentionally covered only briefly. Production residency, provider approval, security and regulatory decisions are separate concerns and must not complicate normal development.

---

# 2. Core Development Decision

Use a **hybrid development runtime**.

```text
DAILY DEVELOPMENT

LOCAL WINDOWS MACHINE
├── source code / Git
├── IDE
├── Expo / Metro
├── mobile apps
├── Next.js control panel
├── Go service(s) actively being developed
└── unit / focused tests

REMOTE MANAGED DEVELOPMENT SERVICES
├── PostgreSQL/PostGIS   -> Neon
├── public/test storage  -> Cloudflare R2
├── maps                 -> Google Maps
├── push                 -> Expo Push
└── email                -> Resend

LOCAL ON-DEMAND TOOLS
├── WireMock financial simulator
├── WireMock biller/recharge simulator
├── Mailpit when local email inspection is needed
├── Jaeger when distributed tracing is needed
├── MinIO when storage conformance/integration is needed
└── full Docker runtime for integration/closure verification
```

This is the default.

Do **not** run the full Docker stack continuously during normal application development unless the current task actually requires it.

---

# 3. Three Runtime Modes

BThwani development uses only these three modes.

## 3.1 DAILY_DEV

The normal working mode.

```text
Code under active development -> local/native
Stateful managed services      -> remote when practical
Heavy simulators               -> off unless needed
Full Docker runtime            -> off
```

Use this for most coding, UI work, API development and application testing.

## 3.2 FOCUSED_INTEGRATION

Enable only the infrastructure needed by the current capability.

Examples:

```text
WLT work
-> local WLT + local WireMock + remote PostgreSQL

Media work
-> local DSH + R2

Distributed tracing
-> affected services + Jaeger

Email rendering
-> service + Mailpit
```

Do not start unrelated infrastructure.

## 3.3 FULL_INTEGRATION

Use the repository Docker runtime for:

- full-stack integration;
- migrations;
- smoke tests;
- journey tests;
- provider-adapter conformance tests;
- closure verification;
- reproducibility checks;
- offline/local fallback.

```text
FULL_INTEGRATION != DAILY_DEV
```

---

# 4. Daily Local Workloads

Keep these local because local feedback is faster than remote deployment loops.

## Mobile

```text
app-client   -> Expo / Metro local
app-partner  -> Expo / Metro local
app-captain  -> Expo / Metro local
app-field    -> Expo / Metro local
```

Existing development ports remain repository/runtime-owned.

Do not move Metro to a remote server for normal development.

## Control Panel

Run Next.js locally during development.

Do not deploy every UI change to Vercel, Render, Railway or another remote runtime merely to test it.

## Go services

Run the service currently being changed natively when practical.

Prefer a short local feedback loop over:

```text
edit -> image build -> deploy -> wait -> test
```

A service may be containerized when the current test specifically depends on container topology.

---

# 5. Development Database

## Default

```text
PostgreSQL/PostGIS -> Neon
```

Reason:

- BThwani already uses PostgreSQL/PostGIS;
- development and production should use the same database engine;
- managed remote PostgreSQL reduces local Docker/WSL2 load;
- no separate database model is introduced;
- application code still depends on PostgreSQL, not on Neon as a domain concept.

## Mandatory rule

```text
DEV DATABASE ENGINE = POSTGRESQL/POSTGIS
```

Do not introduce MongoDB, MongoDB Atlas, Firestore or another database merely to make development remote or easier.

This is forbidden:

```text
Development -> MongoDB
Production  -> PostgreSQL
```

## Application dependency

Application services must depend on normal PostgreSQL connection configuration such as `DATABASE_URL`.

Do not introduce a `NeonRepository`, `NeonDatabaseService`, or Neon-specific business logic.

## Local fallback

PostgreSQL in Docker remains the local reproducible fallback and integration target.

## Development data

Remote development databases must contain:

- synthetic data;
- test actors;
- test stores;
- test locations;
- test transactions;
- development-only credentials.

Do not copy a real production customer database into a global development service.

---

# 6. Object Storage / Images / Files

## Default development provider

```text
Cloudflare R2
```

Use R2 for development media and test files because it is managed, inexpensive, S3-compatible and removes the need to keep MinIO running continuously.

## Required architecture

Business/domain code must not depend directly on R2 or MinIO.

```text
Media Domain
    |
ObjectStoragePort
    |
    +-- R2Adapter
    +-- MinIOAdapter
    +-- FutureProductionAdapter
```

## Data classes

Keep storage policy simple but explicit.

```text
PUBLIC_MEDIA
- product images
- store images
- category images
- logos
- banners
- public catalog assets

PRIVATE_MEDIA
- non-public user/support files

SENSITIVE_DOCUMENT
- identity documents
- employee documents
- payout verification evidence
- financial settlement evidence
- regulated/private documents
```

During development, synthetic examples of any class may use R2.

Production may route different classes to different providers without changing the Media domain.

## MinIO

MinIO is **not** the Media domain.

Use it only as:

- a local S3-compatible adapter;
- integration/conformance infrastructure;
- offline fallback;
- a possible deployment implementation where appropriate.

Do not require MinIO to run during normal daily development.

---

# 7. Maps

## Default development provider

```text
Google Maps
```

BThwani already has a provider boundary for maps. Keep Google behind that boundary.

```text
DSH
 -> Providers / Geo boundary
 -> Google Maps adapter
```

Do not introduce Mapbox or a second maps provider without a demonstrated requirement.

Do not spread Google-specific calls across domains or application screens.

Production use is policy/regulatory dependent, but no production concern should force development to replace Google Maps prematurely.

---

# 8. Push Notifications

## Default development provider

```text
Expo Push
```

Keep two concepts separate:

```text
Notification truth -> BThwani
Push delivery      -> provider adapter/channel
```

In-app notifications remain BThwani-owned state.

Expo is a delivery channel, not the notification source of truth.

Do not add direct FCM/APNs integration during development unless a real requirement exists that Expo cannot satisfy.

---

# 9. Email

## Default development provider

```text
Resend
```

Use a provider-neutral application contract:

```text
EmailSender
├── ResendAdapter
├── MailpitAdapter / SMTP local path
└── FutureProductionAdapter
```

Use Resend for normal real-email development testing when an external delivery test is useful.

Use Mailpit only when you need:

- local/offline email inspection;
- HTML rendering inspection without external sending;
- SMTP integration testing;
- deterministic failure testing;
- full local integration.

Do not keep Mailpit running continuously without a reason.

Do not make Resend a domain authority.

---

# 10. OTP Is Not SMS

This distinction is mandatory.

```text
OTP = Identity authentication / activation capability
SMS = one delivery channel
```

Identity owns:

- challenge creation;
- purpose;
- code generation;
- hashing;
- expiration;
- attempt limits;
- resend policy;
- single-use consumption;
- replay protection;
- session/activation transition.

An SMS vendor must never become BThwani's Identity authority.

Correct model:

```text
Identity
   |
OtpChallenge
   |
OtpDeliveryPort
   +-- DevOtpSink
   +-- SmsOtpAdapter
   +-- EmailOtpAdapter
```

---

# 11. Default OTP Development Flow

## Default

```text
OTP_DELIVERY = DevOtpSink
```

The OTP engine remains real.

The delivery is fake/development-only.

The development path must still exercise:

- random OTP generation;
- real TTL;
- real code hashing;
- real attempt counting;
- resend cooldown;
- superseded challenge invalidation;
- replay protection;
- single-use behavior;
- rate limiting;
- session/activation transition.

Do not hard-code a universal development OTP such as `123456` as the normal development mechanism.

A fixed bootstrap credential, if retained for a tightly scoped bootstrap procedure, must not become normal Identity behavior.

## Dev OTP visibility

Expose development OTP through a deliberate development-only sink/inbox.

Do not rely on uncontrolled raw OTP logging.

Any development OTP inspection surface must be impossible to enable accidentally in production.

---

# 12. Real SMS Testing During Development

Real SMS testing is occasional E2E verification, not the normal login path.

Provider abstraction:

```text
SmsProvider
├── DevSmsSink
├── TwilioSmsAdapter
├── InfobipSmsAdapter
└── FutureYemeniSmsAdapter
```

Use Twilio or Infobip only when a real phone delivery test is required.

Do not send paid SMS for routine developer logins.

Do not build Identity around Twilio Verify, Firebase Authentication or another external identity authority.

---

# 13. SMS Usage Policy

SMS is an expensive/fallible delivery channel. Do not use it for every notification.

Preferred channel order for ordinary operational communication:

```text
1. In-App
2. Push
3. Email where appropriate
4. SMS when the use case justifies it
```

Good SMS use cases:

- phone OTP;
- account recovery when required;
- security-critical notification;
- phone-number change confirmation;
- important fallback communication.

Do not send routine order lifecycle events by SMS when Push/In-App is sufficient.

---

# 14. OTP / SMS Abuse Protection

Build abuse protection from the beginning even in development architecture.

Required controls include:

```text
per-phone limits
per-IP limits
per-device limits
country/number policy
resend cooldown
challenge attempt cap
velocity checks
daily/provider spend limits where applicable
single active/superseding challenge policy
raw OTP never persisted
raw OTP never logged in production
```

The public OTP endpoint must never be an unlimited SMS-spending endpoint.

---

# 15. TOTP and Passkeys

Do not complicate customer development by requiring these immediately.

However, Identity architecture must not prevent additional authentication methods.

Conceptual model:

```text
AuthenticationMethod
├── phone_otp
├── password where product-approved
├── totp
└── passkey
```

For Control Panel / privileged operators, prefer future TOTP or Passkeys over depending exclusively on SMS OTP.

These are authentication methods, not SMS delivery channels.

---

# 16. Financial Provider Development

Do not use Stripe or PayPal merely because development can access global providers.

They would simulate the wrong external contract for the intended Yemeni financial model.

Use:

```text
FinancialRail
├── DevelopmentSimulator
└── FutureApprovedYemeniAdapter
```

## Default simulator

Use the existing WireMock financial simulator on demand.

The simulator should cover real integration behaviors including:

- success;
- pending;
- rejection;
- timeout;
- provider unavailable;
- delayed result;
- duplicate callback/reference;
- invalid callback/signature where applicable;
- ambiguous/unknown external result;
- reconciliation mismatch.

WLT remains the sole internal financial truth.

The simulator/provider is never the internal wallet/ledger authority.

---

# 17. Telecom Recharge / Bills / Utilities

Do not hide recharge and bill fulfillment inside a generic payment provider.

Keep two concerns separate:

```text
FinancialRail
-> moves/authorizes money

BillerGateway
-> fulfills telecom / electricity / water / internet / other biller service
```

Development:

```text
BillerGateway
└── WireMock / Biller Simulator
```

The simulator should support at minimum:

- inquiry success;
- subscriber not found;
- bill already paid;
- recharge success;
- duplicate request;
- invalid mobile/account number;
- insufficient provider balance/float;
- provider unavailable;
- timeout;
- unknown external result;
- delayed result;
- price/quote changed;
- reversal where supported;
- reconciliation mismatch.

Do not retry an ambiguous external fulfillment blindly through another provider.

---

# 18. Docker Policy

Docker remains important, but its role is specific.

```text
Docker = reproducible development/integration infrastructure
Docker != BThwani product authority
Docker != mandatory daily runtime
```

Use Docker for:

- PostgreSQL local fallback;
- MinIO adapter/conformance tests;
- WireMock financial/biller simulators;
- Mailpit;
- Jaeger;
- full-stack integration;
- closure verification;
- offline development.

Do not require all containers to run simply because they exist in Compose.

Use profiles/on-demand composition whenever possible.

---

# 19. Observability During Development

## Default

Do not run full tracing infrastructure continuously.

Use local application logs and focused diagnostics for normal development.

## Jaeger

Start Jaeger only when investigating a distributed flow such as:

```text
DSH -> WLT
DSH -> Providers
service -> outbox -> downstream consumer
timeout / retry / saga / callback
```

Jaeger is an investigation tool, not a mandatory daily dependency.

Do not send secrets, raw OTPs, credentials or unnecessary PII to logs/traces.

---

# 20. Cache / Valkey / Redis

Do not activate Valkey/Redis merely because it is common infrastructure.

Default:

```text
OFF
```

Enable it only when a real owned requirement is proven, for example:

- distributed rate limiting;
- hot cache with measured need;
- distributed locking;
- ephemeral coordination.

Do not create a cache as a second source of business truth.

---

# 21. Development Provider Matrix

| Capability | Daily development default | On-demand/local fallback | Production note |
|---|---|---|---|
| Source / IDE | Local Windows | — | — |
| Expo / Metro | Local | — | — |
| Go services | Local/native while active | Docker integration | Deploy provider-independently |
| Next.js control panel | Local | Docker if needed | Deploy according to production policy |
| PostgreSQL/PostGIS | Neon | Docker PostgreSQL | Yemen/local or approved production PostgreSQL |
| Public/test object storage | Cloudflare R2 | MinIO | Public media may remain global if approved |
| Sensitive production documents | Synthetic data only in Dev | MinIO test | Residency/policy controlled |
| Maps | Google Maps | mock only when testing failures | Continue if production policy permits |
| Push | Expo Push | test doubles where useful | Production channel decided by policy |
| Email | Resend | Mailpit | Provider selected by production policy |
| OTP engine | BThwani Identity | same | same Identity authority |
| OTP default delivery | DevOtpSink | — | real approved delivery channel |
| Real SMS E2E | Twilio/Infobip occasionally | DevSmsSink | approved Yemeni/other provider |
| TOTP | local capability when implemented | — | recommended for privileged users |
| Passkeys | architecture-ready | — | recommended for privileged users |
| Financial provider | WireMock simulator | same | approved Yemeni financial rail |
| Bills/recharges | WireMock simulator | same | approved Yemeni biller/aggregator |
| Jaeger | Off | on-demand | self-hosted/approved observability as required |
| Valkey/Redis | Off | on-demand | only if a real requirement exists |
| Full Docker runtime | Off | integration/closure only | deployment mechanism independent |

---

# 22. Development Environment Rules

These rules are mandatory for development simplicity.

## Rule 1 — Stateful remote, active code local

```text
Stateful managed infrastructure -> remote when practical
Code being edited               -> local
```

Do not create remote deployment loops for every code edit.

## Rule 2 — Provider neutrality

```text
MANAGED_DEV_SERVICES_MUST_NOT_BECOME_DOMAIN_AUTHORITIES
```

Neon, R2, Resend, Expo, Google, Twilio and WireMock are implementations or channels.

They are not BThwani business/domain truth.

## Rule 3 — Development provider may differ from production

```text
DEVELOPMENT_PROVIDER != PRODUCTION_PROVIDER
```

is allowed when the underlying contract remains compatible.

Examples:

```text
Dev PostgreSQL  -> Neon
Prod PostgreSQL -> approved Yemen/local PostgreSQL

Dev Storage     -> R2
Prod Storage    -> R2 for public media and/or Yemen storage for sensitive documents
```

## Rule 4 — No unnecessary provider proliferation

One default provider per capability during development.

Do not add multiple equivalent providers without a tested reason.

## Rule 5 — No production data in global Dev

Global development services receive synthetic/test data only.

## Rule 6 — No provider-specific domain models

Do not create business concepts such as:

```text
NeonCustomer
R2ProductImage
TwilioActor
ResendNotification
MinioMediaDomain
```

Model BThwani concepts, then map them through adapters.

## Rule 7 — Docker must remain a valid integration path

Even when daily development uses managed services, the repository must remain capable of reproducible local/full integration verification.

## Rule 8 — No fake success bypasses

Mocks/simulators may emulate provider behavior but must not bypass the real BThwani state machine, authorization, accounting, challenge lifecycle or validation rules.

---

# 23. External Capability Contracts

Use stable semantic boundaries.

```text
Database
-> PostgreSQL protocol / DATABASE_URL

Object storage
-> ObjectStoragePort

Maps
-> GeoProvider / Providers boundary

Push
-> PushDeliveryPort

Email
-> EmailSender

OTP delivery
-> OtpDeliveryPort

SMS
-> SmsProvider

Financial external rail
-> FinancialRail / PaymentProvider boundary

Biller fulfillment
-> BillerGateway
```

Exact package/interface names may follow current repository ownership and governance, but the architectural separation is mandatory.

---

# 24. Practical Daily Workflow

## Normal app/API work

Start only:

```text
1. IDE
2. required Expo/Next.js surface
3. Go service(s) being changed
4. remote Neon/R2/Google/Expo/Resend as needed
```

Keep Docker off unless the current task needs it.

## OTP work

```text
Identity local
PostgreSQL remote/local
DevOtpSink
```

Use a real SMS adapter only for occasional E2E delivery verification.

## Financial work

```text
WLT local
required facade/service local
WireMock financial simulator
PostgreSQL
```

## Bill/recharge work

```text
Biller capability/service local
WLT when money movement is part of flow
WireMock biller simulator
PostgreSQL
```

## Media work

```text
DSH/media service local
R2 remote
```

Run MinIO only for adapter/conformance/full-integration verification.

## Closure / integration verification

Start required full Docker topology, then run repository-owned migrations, readiness, smoke, integration and journey tests.

The exact commands remain owned by repository scripts/orchestrator; do not duplicate command truth into this document.

---

# 25. Production — Short Note Only

Development convenience does not automatically define production architecture.

Production should be selected by:

- Yemen regulatory/authority requirements;
- data classification;
- customer/financial/location sensitivity;
- cost;
- service availability;
- operational reliability;
- approved provider contracts.

Likely direction:

```text
Sensitive core data / financial truth / identity
-> Yemen-hosted or otherwise explicitly approved infrastructure

Public low-sensitivity media
-> may remain on a suitable global object/CDN provider if approved

Google Maps / platform push / other unavoidable global capabilities
-> use only according to production policy and regulatory approval

Financial and biller rails
-> approved Yemeni providers/adapters
```

Production selection must not require rewriting DSH, WLT, Identity or other domain truth because development providers were correctly isolated behind contracts.

---

# 26. Explicit Non-Goals

This development profile does **not** require:

- a development VPS;
- Sohobcom/YemenNet for development;
- MongoDB or MongoDB Atlas;
- Firebase Authentication;
- Stripe;
- PayPal;
- Mapbox alongside Google Maps;
- full-time MinIO;
- full-time Mailpit;
- full-time Jaeger;
- Redis/Valkey without a proven need;
- Twilio SMS for every developer login;
- every service running in Docker all day;
- production data copied to global development services.

---

# 27. Default Development Stack

This is the canonical simple default unless a specific task requires otherwise.

```text
BTHWANI DEVELOPMENT STACK

LOCAL COMPUTE
├── Windows workstation
├── Git / IDE
├── Expo / Metro
├── Go services being edited
├── Next.js control panel
└── focused tests

REMOTE MANAGED DEV
├── Neon PostgreSQL/PostGIS
├── Cloudflare R2
├── Google Maps
├── Expo Push
└── Resend

IDENTITY / COMMUNICATION
├── BThwani Identity owns OTP
├── DevOtpSink by default
├── Twilio/Infobip only for occasional real SMS E2E
├── TOTP/passkey-ready architecture
└── no external Identity authority

LOCAL ON-DEMAND
├── WireMock financial simulator
├── WireMock biller/recharge simulator
├── Mailpit
├── MinIO
├── Jaeger
├── Valkey only if proven necessary
└── full Docker integration runtime
```

---

# 28. Final Development Law

```text
FAST DAILY LOOP
+
REAL BTHWANI DOMAIN LOGIC
+
CHEAP MANAGED STATEFUL DEV SERVICES
+
ON-DEMAND LOCAL SIMULATORS
+
REPRODUCIBLE FULL DOCKER VERIFICATION
+
NO PROVIDER LOCK-IN
=
BTHWANI DEVELOPMENT RUNTIME
```

When choosing between additional tooling and a simpler existing path, prefer the simpler path unless the additional component solves a demonstrated development or product requirement.
