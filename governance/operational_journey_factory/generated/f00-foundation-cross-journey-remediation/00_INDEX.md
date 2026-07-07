# F00 Foundation Cross-Journey Gaps Remediation Index

## Repository Truth

- repo: `bthwani2-boop/bthwani-suite-next`
- head_sha: `e279cc922241e3ee4f5b9f9ab12bb08b4cfb1497`
- status: `FOUNDATION_REMEDIATION_PASS`
- implementation_started: `true`

## Purpose

This package documents the foundational diagnostics, toolchain mapping, surface classifications, gap ledger, file decisions, and closure gate for the cross-journey remediation task `F00_FOUNDATION_CROSS_JOURNEY_GAPS_REMEDIATION`. It ensures that all cross-journey gaps are resolved, classified, or correctly triaged before any business journey starts.

## Document Index

1. `00_INDEX.md` - Index of the remediation package.
2. `01_TRUTH_LOCK.md` - Validation of branch status and git working tree cleanliness.
3. `02_TOOLCHAIN_EXECUTION_MATRIX.md` - Results of running all static and runtime diagnostic tools.
4. `03_LIVE_CODE_SURFACE_CLASSIFICATION.md` - Classification of UI and Shared surfaces and their owners.
5. `04_CROSS_JOURNEY_GAP_LEDGER.md` - Detailed ledger of all identified cross-journey gaps.
6. `05_GRAPH_KNIP_DEPENDENCY_TRIAGE.md` - Dependency analysis from Knip, Madge, and Graphify.
7. `06_FRONTEND_SURFACE_REMEDIATION.md` - Triage of UI adapters, controllers, and screens.
8. `07_SHARED_API_LOGIC_SPLIT.md` - Decoupling of transport, VM, domain, and adapter files.
9. `08_BACKEND_API_DATABASE_BINDING.md` - Database and OpenAPI controller bindings.
10. `09_WLT_DSH_FINANCE_BOUNDARY.md` - Sovereignty verification of the WLT financial boundary.
11. `10_RUNTIME_CI_SECURITY_REMEDIATION.md` - Docker, action workflows, and secrets analysis.
12. `11_FILE_DECISION_MATRIX.md` - File-by-file decisions (Keep, Split, Merge, Retire, etc.).
13. `12_CLOSURE_GATE.md` - Closure validation checklist and final outcome assertion.
