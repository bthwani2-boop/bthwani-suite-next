# BThwani Operational Runbooks

Status: OPERATIONAL_GUIDANCE

This directory contains operational and recovery procedures. Runbooks are not governance authority, Product Truth, API contracts, database truth, release approval, or evidence that a runtime action succeeded.

## Precedence

Before acting on a runbook, resolve the current repository commit and verify the relevant canonical sources:

1. `governance/authority/authority-precedence.json`;
2. `AGENTS.md` and applicable canonical governance;
3. current service contracts, migrations, source and runtime configuration;
4. current registered guard/CI commands.

If a route, permission, workflow, migration name, environment variable, threshold or command in a runbook has drifted, the current canonical contract/implementation wins and the runbook must be corrected.

## Rules

- Do not treat `Status: OPERATIONAL_RUNBOOK` as implementation or runtime evidence.
- Never turn diagnostic SQL into an unauthorized mutation.
- Never bypass authorization, isolation, migration, financial or release controls to accelerate recovery.
- Prefer stable identifiers and redacted evidence; do not paste secrets or PII into incidents.
- Verification remains read-only with respect to source.
- A runbook cannot issue `CLOSED_WITH_EVIDENCE` or protected approval.
- Branch names, workflow names and commit IDs are not durable unless the current repository still registers them.

## Ownership

Runbooks should name the service/domain that owns the operational fact being recovered. Cross-domain recovery must preserve the canonical owner; in particular, WLT remains the financial-truth owner for WLT-governed financial mutation.
