# BThwani Developer Documentation

DOCUMENT_CLASS: HUMAN_DEVELOPMENT_AND_OPERATIONS_GUIDANCE
EXECUTION_AUTHORITY: NONE
PRODUCT_SEMANTIC_AUTHORITY: NONE
CURRENT_COMMAND_AUTHORITY: LIVE_REPOSITORY_SCRIPTS_AND_CONFIG

## Start here

A developer new to BThwani should read in this order:

1. `governance/GOVERNANCE.md` — how durable truth is organized.
2. `governance/product/PRD.md` — what BThwani is, actors, surfaces and bounded-context ownership.
3. `governance/product/CAPABILITIES.md` — required capabilities, invariants and acceptance expectations.
4. `governance/product/FINANCIAL-MODEL.md` when money, wallets, COD, payouts, settlement or reconciliation is affected.
5. `governance/product/EXPERIENCE-AND-DESIGN.md` — cross-surface UX/RTL/accessibility/design rules.
6. The applicable file under `governance/policies/`.
7. `development/getting-started.md` — current workstation/bootstrap path.
8. The applicable development guide or operational runbook.

## What Docs owns

`docs/**` explains how humans develop, run, inspect and operate BThwani. It may summarize governance or executable configuration for usability, but it does not create Product/domain truth or current runtime truth.

```text
DOCS != PRODUCT GOVERNANCE
DOCS != EXECUTABLE CONFIG
DOCS != CURRENT ROUTE/SCHEMA REGISTRY
```

When a command, path, port or environment value conflicts with live scripts/configuration, the executable source wins and the documentation must be corrected.

## Documentation map

### Development

- `development/getting-started.md` — prerequisites, install, primary commands, verification.
- `development/runtime.md` — daily/focused/full runtime modes and current local service endpoints.
- `development/mobile.md` — Expo/Metro, devices, ADB, application commands.
- `development/providers-and-sandboxes.md` — development provider choices, simulators and safety boundaries.
- `development/eas.md` — mobile EAS initialization/preflight/build operations.
- `development/sentry.md` — mobile Sentry activation/verification.
- `development/github-evidence.md` — GitHub evidence model for the active campaign.
- `development/leanctx.md` — LeanCTX usage.

### Runbooks

`runbooks/README.md` routes operational incidents to the smallest applicable runbook. Runbooks describe diagnosis/recovery only; they never override domain owners or invent direct database/business mutations.

### Reference

`reference/external-systems/` contains non-authoritative external research. Reference selection is not dependency adoption and external systems never define BThwani ownership.

## Staleness rule

Every documentation change that mentions executable commands/paths/configuration must verify them against the same repository candidate. Historical commands, branch assumptions, deleted paths and implementation inventories must be removed rather than retained as compatibility prose.
