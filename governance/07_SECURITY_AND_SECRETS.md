# 07 — Security and Secrets

Status: CANONICAL

## Secret rules

Do not commit real secrets, production tokens, private keys, payment secrets, SMS secrets, live DB passwords, service account credentials, signing keys, or private certificates.

## Local placeholders

Allowed only when clearly marked LOCAL_ONLY, not valid against a real provider, and not used as live fallback.

## Runtime configuration

- real `.env` files are not committed
- examples are placeholders only
- live-like runtime must fail closed when required secrets are missing
- provider credentials belong to controlled provider registry

## Auth ownership

Authentication belongs to `core/identity`.

## Secure SDLC authority

Security-sensitive journeys must define security requirements before implementation, not only after code is written.

Use risk-based security verification for:

- authentication, sessions, RBAC, tenant context, or delegated access
- PII, secrets, payments, WLT financial truth, files, media, or audit logs
- public APIs, admin/operator APIs, infrastructure, containers, CI, or runtime configuration

Required controls, when applicable:

- threat model and trust boundaries
- authorization and object ownership checks
- tenant isolation negative tests
- secret scanning
- dependency and license review
- API/security test profile
- vulnerability severity and residual-risk owner
- independent retest for critical or high security fixes

Commercial SaaS activation remains blocked until the SaaS/Tenancy annex gate approves it.

## Acceptance condition

Accepted only when secret scan evidence exists for security-sensitive journeys, no committed file contains real secrets, and applicable secure SDLC or tenant-isolation controls are recorded.
