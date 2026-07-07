# Canonical Operational Journey Reference

- branch: journy
- head_sha: 9c63ba9fea862b0e05016fb0bd0346b91eaec1c4
- generated_at: 2026-07-07T16:53:22.897Z
- implementation_started: false
- closure_claim: false

## Numeric Truth

| Metric | Value |
|---|---:|
| head_sha | 9c63ba9fea862b0e05016fb0bd0346b91eaec1c4 |
| branch | journy |
| gap_count | 169 |
| blocking_gap_count | 0 |
| toolchain_tool_count | 60 |
| unused_script_count | 38 |
| surface_inventory_item_count | 630 |
| openapi_file_count | 5 |
| api_operation_count | 206 |
| generated_client_count | 4 |
| backend_route_count | 29 |

## Canonical Inventory Files

| Source | Reference copy | sha256 | Size |
|---|---|---|---:|
| `.diagnostics/operational-journey-factory/toolchain-inventory.json` | `.diagnostics/operational-journey-factory/inventories/toolchain-inventory.json` | `adf5e9699608bb02512ced01add6134c41c9baaae4975dfc8d7621fe36e14db7` | 92147 |
| `.diagnostics/operational-journey-factory/toolchain-inventory.md` | `.diagnostics/operational-journey-factory/inventories/toolchain-inventory.md` | `9fe98a1cdcbbc9ec0774253aa16209a75a5b00b58433f2215f5e89962994a758` | 6177 |
| `.diagnostics/operational-journey-factory/surface-inventory.json` | `.diagnostics/operational-journey-factory/inventories/surface-inventory.json` | `7b7e09299a4ec95708a0523adb5f696e6a1e0a2ed5e03d2d5a18d0712dc0e704` | 105612 |
| `.diagnostics/operational-journey-factory/surface-inventory.md` | `.diagnostics/operational-journey-factory/inventories/surface-inventory.md` | `c410b4b0a192e3a10fd97c47b9134149616358d0024baf29e07334384e2b8c37` | 2086 |
| `.diagnostics/operational-journey-factory/journey-inventory.json` | `.diagnostics/operational-journey-factory/inventories/journey-inventory.json` | `5caa4ae1d4e16c911d61e59f0141ece9b13a3193901e41c3975da006ab53b8a5` | 141337 |
| `.diagnostics/operational-journey-factory/journey-inventory.md` | `.diagnostics/operational-journey-factory/inventories/journey-inventory.md` | `12ff1d1da5ae6953e6dda3fd1a85cf54635a8f6489d8c1d8e5b4dc41ee7dd2e7` | 1235 |
| `.diagnostics/operational-journey-factory/gap-ledger.json` | `.diagnostics/operational-journey-factory/inventories/gap-ledger.json` | `7a618c66900448724e9aac21824e949c41c2574d3cc4cb249a6d4a4f90ef6f75` | 202081 |
| `.diagnostics/operational-journey-factory/gap-ledger.md` | `.diagnostics/operational-journey-factory/inventories/gap-ledger.md` | `2cf7499001d28f70645484a022956338cd91e376276caefa8a3aa4310377feec` | 50754 |

## Diagnostics Folder Decisions

| Entry | Type | Files | Size | Decision | Quote |
|---|---|---:|---:|---|---|
| .diagnostics/operational-journey-factory | directory | 52 | 6502394 | KEEP_CANONICAL_FACTORY_ROOT | Core operational inventory root; only core inventory files are canonical. Old package folders remain raw evidence unless archived. |
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