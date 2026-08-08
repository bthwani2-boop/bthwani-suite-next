# bthwani-suite-next

Canonical implementation line for BThwani.

## Repository role

The old `C:\bthwani-suite` repository is a donor/reference source only. This repository owns the active implementation. Runtime code must not depend on the donor repository, and no capability is closed without same-commit evidence.

## Canonical status sources

Human-readable status summaries in this README are intentionally avoided because they become stale and can overstate runtime readiness. Use the current owners instead:

- Product-wide requirements and ownership: `governance/product/PRD.md`
- Platform model: `governance/product/platform-model.yaml`
- Capability-specific product truth: `governance/product/contracts/`
- DSH capability ownership: `services/dsh/capabilities.ts`
- DSH surface posture: `services/dsh/surface-map.ts`
- DSH runtime evidence state: `services/dsh/runtime-map.ts`
- DSH service manifest: `services/dsh/service.manifest.ts`
- WLT service manifest: `services/wlt/service.manifest.ts`
- Canonical decision vocabulary: `governance/contracts/decision-vocabulary.json`
- SDLC machine contracts: `governance/contracts/sdlc/`
- GitHub workflow intent: `governance/github/workflow-registry.json`
- Desired master protection configuration: `governance/github/master-protection.ruleset.json`
- Actual GitHub enforcement/check/review state: query GitHub live for the exact target branch and candidate SHA; no tracked snapshot is current proof.

## Decision rule

Static implementation, contract presence, historical evidence, fixtures, mocks, desired configuration, and successful narrow CI jobs do not imply runtime or production closure. `CLOSED_WITH_EVIDENCE` requires the applicable same-commit runtime, product, QA, security, finance, isolation, governance, CI, release, and production evidence defined by `governance/GOVERNANCE.md` and the governed SDLC contracts.
