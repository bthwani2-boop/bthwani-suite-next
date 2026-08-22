---
name: bthwani-security-secrets-privacy
version: 2026.08.18-v2
summary: Route authentication, authorization, secrets, PII, sensitive logs, and isolation changes to targeted security evidence.
---

# bthwani-security-secrets-privacy

## Invoke when

Authentication, authorization, RBAC, sessions, tokens, keys, credentials, PII, payment data, logs, CORS, trusted context, isolation, or sensitive provider configuration changes.

## Method

1. Pin the exact candidate.
2. Inspect affected code/config/diffs for credential exposure, unsafe logs, weak authorization/trusted context, broad CORS, or isolation defects.
3. Redact secrets and private data from evidence.
4. Run the smallest applicable security checks for the affected code cone.
5. Require runtime authorization/session/isolation evidence when those behaviors are changed or claimed.
6. Keep material security findings fail-closed until fixed or explicitly left as unresolved risk.

Do not create security stage manifests, governance gates, or approval bureaucracy as substitutes for actual security evidence.

## Output

```text
resolved_commit_sha:
sanitation_confirmed:
affected_paths:
findings:
security_checks:
runtime_evidence:
missing_evidence:
remediation:
residual_risk:
decision:
```
