# bthwani-suite-next

Canonical implementation line for BThwani.

## Repository role

The old `C:\bthwani-suite` repository is a donor/reference source only. This repository owns the active implementation. Runtime code must not depend on the donor repository, and no capability is closed without same-commit evidence.

## Canonical status sources

Human-readable status summaries in this README are intentionally avoided because they become stale and can overstate runtime readiness. Use the following machine-readable owners instead:

- DSH capability ownership: `services/dsh/capabilities.ts`
- DSH surface posture: `services/dsh/surface-map.ts`
- DSH runtime evidence state: `services/dsh/runtime-map.ts`
- DSH service manifest: `services/dsh/service.manifest.ts`
- WLT service manifest: `services/wlt/service.manifest.ts`
- SaaS activation evidence: `governance/saas/saas-governance.json`
- GitHub enforcement evidence: `governance/github/repository-enforcement.json`
- Canonical decision vocabulary: `governance/contracts/decision-vocabulary.json`

## Decision rule

Static implementation, contract presence, historical evidence, fixtures, mocks, and successful narrow CI jobs do not imply runtime or production closure. `CLOSED_WITH_EVIDENCE` requires the applicable same-commit runtime, product, QA, security, finance, isolation, governance, CI, release, and production evidence defined by `AGENTS.md` and the governed SDLC contracts.
