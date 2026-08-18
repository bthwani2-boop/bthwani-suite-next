# bthwani-suite-next

Canonical implementation line for BThwani.

## Repository role

The old `C:\bthwani-suite` repository is donor/reference only. This repository owns the active implementation. Runtime code must not depend on the donor repository.

## Current truth sources

Avoid status prose that drifts. Read the current owner instead:

- Product requirements and ownership: `governance/product/PRD.md`
- Platform model: `governance/product/platform-model.yaml`
- Capability Product Truth: `governance/product/contracts/`
- DSH capability ownership: `services/dsh/capabilities.ts`
- DSH surface posture: `services/dsh/surface-map.ts`
- DSH runtime state: `services/dsh/runtime-map.ts`
- DSH service manifest: `services/dsh/service.manifest.ts`
- WLT service manifest: `services/wlt/service.manifest.ts`
- Executable CI: `.github/workflows/`
- Exact repository-platform enforcement/check state: query GitHub live for the target branch and candidate SHA.

There is intentionally no guard registry, workflow registry, or SDLC stage control plane. Verification belongs to executable code, contracts, data, runtime, security, and executable CI.

## Working rule

Use the smallest complete affected scope, fix the highest proven root cause, run only checks that add material assurance, and expand verification only when evidence or closure risk requires it.

Static implementation or configuration does not imply runtime success. Historical evidence, fixtures, mocks, desired configuration, or a prior workflow run do not prove a newer candidate.
