# Development Providers and Sandboxes

DOCUMENT_CLASS: HUMAN_DEVELOPMENT_GUIDE
PRODUCT_AUTHORITY: NONE
CURRENT_PROVIDER_CONFIG_AUTHORITY: live runtime/environment configuration

## Core rule

Development providers are replaceable implementations behind BThwani semantic boundaries.

```text
MANAGED_DEV_SERVICE != DOMAIN_AUTHORITY
DEVELOPMENT_PROVIDER != REQUIRED_PRODUCTION_PROVIDER
PROVIDER_NAME != BUSINESS_DOMAIN
```

## Current practical development defaults

Use these only when useful and currently configured:

- PostgreSQL/PostGIS: managed PostgreSQL such as Neon for daily state, Docker PostgreSQL as reproducible fallback/integration.
- Object storage: Cloudflare R2 for managed test media; MinIO for local S3-compatible conformance/offline work.
- Maps: Google Maps behind the owning DSH maps/geocoding/routing integration port.
- Push: Expo Push as a delivery channel; notification business truth remains BThwani-owned.
- Email: Resend for real development delivery; Mailpit for local inspection/failure testing.
- OTP: Identity owns the challenge lifecycle; `DevOtpSink` is the normal development delivery path.
- Real SMS: Twilio/Infobip or another selected adapter only for occasional real-delivery E2E tests.
- Financial/biller integrations: WireMock/on-demand deterministic simulators for success, pending, timeout, duplicate, delayed, invalid, unknown and reconciliation cases.
- Observability: local logs by default; tracing infrastructure on demand.
- Cache/coordination: Redis/Valkey only when a proven owned requirement exists.

Current external accounts/free tiers are operational conveniences, not durable Product decisions.

## Financial sandboxes

WireMock is the deterministic default for BThwani failure/state-machine testing. A real Stripe/PayPal or other sandbox may be used only when the specific adapter/conformance question justifies it.

```text
REAL_SANDBOX_ALLOWED_WHEN_USEFUL
!=
BUILD_DOMAIN_AROUND_PROVIDER
```

No external sandbox is assumed to represent BThwani's required production financial rail.

## OTP and messaging

OTP is an Identity capability; SMS/email are channels. Development inspection must not rely on uncontrolled raw OTP logs and must be impossible to enable accidentally in production.

## Sensitive data

External development services receive synthetic/test data. Sensitive documents, financial evidence, credentials and production PII require their approved classification/storage policy and must not be copied into general development accounts.

## Unknown external outcomes

For mutations, timeout or missing confirmation is not proof of failure. Preserve the operation identity and reconcile against the owning system/provider before trying another route that could duplicate the effect.
