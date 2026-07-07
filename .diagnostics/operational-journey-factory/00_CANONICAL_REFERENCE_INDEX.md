# Canonical Operational Journey Reference

- branch: journy
- head_sha: 5da17eac9e1287f499f97cea6a7a1bd7a786f537
- generated_at: 2026-07-07T16:28:13.636Z
- implementation_started: false
- closure_claim: false

## Numeric Truth

| Metric | Value |
|---|---:|
| head_sha | 5da17eac9e1287f499f97cea6a7a1bd7a786f537 |
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
| `.diagnostics/operational-journey-factory/toolchain-inventory.json` | `.diagnostics/operational-journey-factory/inventories/toolchain-inventory.json` | `04eb4b43b8331e063fc152528f69541ca07ef1401dded76c6a928b51747d5465` | 92147 |
| `.diagnostics/operational-journey-factory/toolchain-inventory.md` | `.diagnostics/operational-journey-factory/inventories/toolchain-inventory.md` | `7142eca2611d8148aab0e88d9c04c431d6053eab2de870a3697bd431771073ff` | 6177 |
| `.diagnostics/operational-journey-factory/surface-inventory.json` | `.diagnostics/operational-journey-factory/inventories/surface-inventory.json` | `8ccadb6573bcbbc9bd278cb806598f0e6148224003bda7c8d09b484b7b72fd9d` | 105612 |
| `.diagnostics/operational-journey-factory/surface-inventory.md` | `.diagnostics/operational-journey-factory/inventories/surface-inventory.md` | `c174aa4d70ceac8ce6fd3dba1d14dddc1f37a11e7213473a23006154ed0c06ad` | 2086 |
| `.diagnostics/operational-journey-factory/journey-inventory.json` | `.diagnostics/operational-journey-factory/inventories/journey-inventory.json` | `234e91f5d61bf102a3d4de12830bffb74fd2ec48655dadf40a2566197d766e39` | 141337 |
| `.diagnostics/operational-journey-factory/journey-inventory.md` | `.diagnostics/operational-journey-factory/inventories/journey-inventory.md` | `f5f2d27378ae7f2b6748d3d61341a64dd00d879964bf4bea36844c1fc3d13bb2` | 1235 |
| `.diagnostics/operational-journey-factory/gap-ledger.json` | `.diagnostics/operational-journey-factory/inventories/gap-ledger.json` | `adcadacaed0846c3e31df6d1e5bb4db5cf5f4b8768c102faf2372be061ca8734` | 202081 |
| `.diagnostics/operational-journey-factory/gap-ledger.md` | `.diagnostics/operational-journey-factory/inventories/gap-ledger.md` | `f98a53d7a7bec0178dcadf89e1797204e5b5ce4f0cd857e5dd128ced87eba46a` | 50754 |

## Diagnostics Folder Decisions

| Entry | Type | Files | Size | Decision | Quote |
|---|---|---:|---:|---|---|
| .diagnostics/operational-journey-factory | directory | 51 | 6502589 | KEEP_CANONICAL_FACTORY_ROOT | Core operational inventory root; only core inventory files are canonical. Old package folders remain raw evidence unless archived. |
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