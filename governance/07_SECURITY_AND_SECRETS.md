# 07 — Security and Secrets

Status: ACTIVE_CANONICAL

## Secret rules

Never commit real production tokens, private keys, payment secrets, SMS credentials, live database passwords, service-account credentials, signing keys, private certificates, or unredacted sensitive evidence.

## Placeholders and examples

Placeholders are allowed only when clearly nonfunctional, scoped to examples or local development, and never used as a live fallback. A placeholder, mock provider, or local secret does not prove provider readiness.

## Runtime configuration

- real environment files are not committed;
- examples contain placeholders only;
- applicable runtime must fail closed when required sensitive configuration is missing;
- provider credentials remain in controlled secret and provider owners;
- logs and evidence exclude secrets, tokens, private data, and unnecessary PII.

## Identity and authorization ownership

Authentication, session, and actor identity belong to `core/identity`. Each service owns object-level authorization and business permissions for its resources. Role presence alone is insufficient when fine-grained permission or ownership checks apply.

## Secure SDLC

Security requirements are defined before implementation for applicable changes involving:

- authentication, sessions, authorization, RBAC, delegated access, or tenant context;
- PII, secrets, payment data, WLT financial truth, files, media, or audit logs;
- public, partner, captain, field, operator, or administrative APIs;
- infrastructure, containers, CI, runtime configuration, or external providers.

Required controls may include threat modeling, trust boundaries, object ownership, negative authorization tests, isolation tests, secret scanning, dependency review, API security tests, vulnerability decisions, residual-risk ownership, and independent retest.

## Authority and decisions

- The implementation author cannot grant the independent security approval required for the same high-risk change.
- Security failures use `SECURITY_BLOCK`; do not introduce alternative security block labels.
- A clean secret scan does not prove authorization, privacy, runtime, or production security.
- Commercial SaaS activation remains outside current scope and requires its separate conditional gate if later authorized.

## Acceptance condition

Accepted only when sensitive values are absent or sanitized, applicable controls and negative tests exist, required independent security evidence is tied to the same commit, unresolved security findings remain fail-closed, and no static scanner result is upgraded into complete security or production approval.
