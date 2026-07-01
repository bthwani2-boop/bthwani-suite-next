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

## Acceptance condition

Accepted only when secret scan evidence exists for security-sensitive journeys and no committed file contains real secrets.