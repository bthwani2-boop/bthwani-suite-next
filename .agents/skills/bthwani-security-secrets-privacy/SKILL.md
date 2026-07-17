---
name: bthwani-security-secrets-privacy
version: 2026.07.17-v1
summary: Route authentication, authorization, secrets, PII, sensitive logs, and privacy findings to independent security evidence.
---

# bthwani-security-secrets-privacy

## Purpose

Own security-evidence routing and sanitized review for authentication, authorization, sessions, secrets, credentials, PII, payment data, logs, CORS, and sensitive provider configuration.

## Invoke when

- Authentication, authorization, RBAC, sessions, tokens, keys, credentials, PII, payment data, logs, CORS, or sensitive provider configuration changes.
- A diff, runtime output, or artifact contains secret-like or private material.
- Independent security review is required by SDLC or the declared risk.

## Do not invoke when

- No security, privacy, secret, authentication, authorization, or sensitive-data boundary is affected.
- The task is a non-sensitive wording change with no behavioral or configuration claim.

## Read before

- `AGENTS.md`
- `governance/07_SECURITY_AND_SECRETS.md`
- `governance/26_SDLC_TEAM_AND_STAGE_GATES.md`
- applicable contracts, configuration, logs, and data-flow paths

## Authority boundary

This skill detects, sanitizes, and routes findings. It does not replace `APPLICATION_SECURITY_AUTHORITY`, cannot accept residual risk, cannot approve its own remediation, and cannot disclose sensitive values as evidence.

## Required checks

1. Inspect affected diffs and outputs for credentials, private keys, tokens, PII, payment data, unsafe logs, broad CORS, and credential persistence.
2. Redact values before recording or communicating evidence.
3. Distinguish a detected secret, unsafe configuration, missing evidence, and independently approved security state.
4. Require same-commit security approval for applicable high-risk transitions.
5. Keep security failures fail-closed.

## Forbidden

- Pasting or committing real secrets or private data.
- Converting placeholders into live credentials.
- Hiding a security finding as a warning or generic code failure.
- Returning the noncanonical decision `BLOCKED_SECURITY_RISK`; use `SECURITY_BLOCK`.
- Self-approving security remediation or residual risk.

## Required output

```text
resolved_commit_sha:
sanitation_confirmed:
affected_paths:
findings:
required_security_checks:
security_authority_decision:
missing_evidence:
remediation:
residual_risk:
decision:
```

Allowed decisions: `PASS`, `FIX_REQUIRED`, `NEEDS_EVIDENCE`, `SECURITY_BLOCK`, `BLOCKED_EXTERNAL`, and `PROTOCOL_VIOLATION`.
