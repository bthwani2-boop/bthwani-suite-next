---
name: bthwani-security-secrets-privacy
version: 2026.06.19-clean
summary: Block secrets, sensitive values, unsafe logs, and privacy risks.
---

# bthwani-security-secrets-privacy

## Invoke when

- env files, tokens, keys, URLs, credentials, logs, user data, payment data, or provider config are touched
- a diff includes secret-like material
- the user asks for security review

## Read before

`AGENTS.md`, `governance/07_SECURITY_AND_SECRETS.md`, relevant config files

## Execution contract

Inspect diffs and outputs for secret-like values, unsafe logging, broad CORS, credential persistence, and accidental private data exposure. Redact before sharing.

## Forbidden

- do not paste secrets into chat
- do not commit real credentials
- do not convert placeholders into real values
- do not hide a security finding as a warning

## Required evidence

- redacted finding summary
- affected paths
- decision and required remediation
- confirmation that evidence is sanitized

## Failure decision

- secret-like value present -> `BLOCKED_SECURITY_RISK`
- unsafe config but no secret -> `FIX_REQUIRED`
- insufficient sanitized evidence -> `NEEDS_EVIDENCE`

## Notes

No extra notes.
