---
name: bthwani-security-secrets-privacy
description: Prevent secrets, unsafe env handling, privacy leaks, and security regressions.
---

# bthwani-security-secrets-privacy

## Use when

- Config/env/auth/security/logging/API changes are involved.
- Evidence or patch may contain credentials.

## Procedure

1. Scan touched files for secret-like strings.
2. Keep `.env*` local and out of prompts unless redacted.
3. Avoid logging tokens, passwords, private URLs, or personal data.
4. Check auth/role/tenant boundary for service changes.

## Evidence / checks

For sensitive changes, require patch review and a redaction note. If secret-like material appears, decision is `BLOCKED_SECURITY_RISK` until removed.



## Global constraints

- Target root: `C:\bthwani-suite-next`.
- Use PowerShell and `pnpm`; never use `npx`.
- Keep scope narrow; do not touch unrelated files.
- Do not claim closure without evidence.
- Prefer targeted checks over full workspace checks unless risk justifies more.
