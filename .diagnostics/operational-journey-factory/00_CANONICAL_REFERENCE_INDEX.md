# Canonical Operational Journey Reference

- branch: journy
- head_sha: e45f83ae051822efef4de56cac4d0a06bdc056fc
- generated_at: 2026-07-07T19:38:21.791Z
- implementation_started: false
- closure_claim: false

## Numeric Truth

| Metric | Value |
|---|---:|
| head_sha | e45f83ae051822efef4de56cac4d0a06bdc056fc |
| branch | journy |
| gap_count | 27 |
| blocking_gap_count | 0 |
| toolchain_tool_count | 60 |
| unused_script_count | 38 |
| surface_inventory_item_count | 624 |
| openapi_file_count | 5 |
| api_operation_count | 206 |
| generated_client_count | 4 |
| backend_route_count | 29 |

## Canonical Inventory Files

| Source | Reference copy | sha256 | Size |
|---|---|---|---:|
| `.diagnostics/operational-journey-factory/toolchain-inventory.json` | `.diagnostics/operational-journey-factory/inventories/toolchain-inventory.json` | `7c498b765cebf74c6134016a4502149220aef2cea2ad457f83db3f41fd0cf77b` | 92147 |
| `.diagnostics/operational-journey-factory/toolchain-inventory.md` | `.diagnostics/operational-journey-factory/inventories/toolchain-inventory.md` | `5df201e1d3cecb0dc206993d13165ac45268ba7866dace408bde88c81587cdc2` | 6177 |
| `.diagnostics/operational-journey-factory/surface-inventory.json` | `.diagnostics/operational-journey-factory/inventories/surface-inventory.json` | `3bfffb962adaf60a4aa137debc896704360129d31a305956799d59356ed30d8e` | 104719 |
| `.diagnostics/operational-journey-factory/surface-inventory.md` | `.diagnostics/operational-journey-factory/inventories/surface-inventory.md` | `a697ebedde6a1866ff738696203936cf580261a44b7e8039f2bdd649f3d14987` | 2086 |
| `.diagnostics/operational-journey-factory/journey-inventory.json` | `.diagnostics/operational-journey-factory/inventories/journey-inventory.json` | `705f1b87d99b51b5db0f324e1d8c1a8830614a11e7bc9c2e7881426137a0601c` | 141187 |
| `.diagnostics/operational-journey-factory/journey-inventory.md` | `.diagnostics/operational-journey-factory/inventories/journey-inventory.md` | `cd3fbe664d5b3424b48dbd91cfb58de2a5b5378041396936fb7e7da10e067bcd` | 1235 |
| `.diagnostics/operational-journey-factory/gap-ledger.json` | `.diagnostics/operational-journey-factory/inventories/gap-ledger.json` | `ffb8d62987f9c78a43e82bf0be213f43f124465eb7959e6d81771132aae8ef94` | 31936 |
| `.diagnostics/operational-journey-factory/gap-ledger.md` | `.diagnostics/operational-journey-factory/inventories/gap-ledger.md` | `192cff449e1d0625ea42f333f9b825ccf509a197e4fad3fb6920db3b59014aef` | 8174 |

## Diagnostics Folder Decisions

| Entry | Type | Files | Size | Decision | Quote |
|---|---|---:|---:|---|---|
| .diagnostics/operational-journey-factory | directory | 40 | 5418815 | KEEP_CANONICAL_FACTORY_ROOT | Core operational inventory root; only core inventory files are canonical. Old package folders remain raw evidence unless archived. |
| .diagnostics/tools | directory | 2 | 18100 | QUOTE_TO_TOOLCHAIN_REFERENCE_THEN_ARCHIVE | Useful for tool ownership, failures, and optional/manual tool classification. |

## Extracted Evidence Candidates

| Diagnostic entry | File | Action |
|---|---|---|
| tools | `.diagnostics/tools/brand-identity-report.md` | QUOTE_TO_TOOLCHAIN_REFERENCE_THEN_ARCHIVE |

## Blockers

- none

## Warnings

- Optional evidence command failed: 08-knip-json

## Result

CANONICAL_REFERENCE_PREPARED. This is still not final closure; it is the source-of-truth reference layer for future journey packages.