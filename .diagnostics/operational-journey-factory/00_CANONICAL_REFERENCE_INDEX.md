# Canonical Operational Journey Reference

- branch: journy
- head_sha: 845e59cb5c0538f64b1ae1ee2b5d395963ea3f3e
- generated_at: 2026-07-07T04:22:30.948Z
- implementation_started: false
- closure_claim: false

## Numeric Truth

| Metric | Value |
|---|---:|
| head_sha | 845e59cb5c0538f64b1ae1ee2b5d395963ea3f3e |
| branch | journy |
| gap_count | 43 |
| blocking_gap_count | 0 |
| toolchain_tool_count | 60 |
| unused_script_count | 33 |
| surface_inventory_item_count | 777 |
| openapi_file_count | 5 |
| api_operation_count | 206 |
| generated_client_count | 4 |
| backend_route_count | 29 |

## Canonical Inventory Files

| Source | Reference copy | sha256 | Size |
|---|---|---|---:|
| `.diagnostics/operational-journey-factory/toolchain-inventory.json` | `.diagnostics/operational-journey-factory/canonical-reference/inventories/toolchain-inventory.json` | `146b5f12acd7d72af00678919fb7b56ad0d403d808ebaeaa59c950519fe86c17` | 88071 |
| `.diagnostics/operational-journey-factory/toolchain-inventory.md` | `.diagnostics/operational-journey-factory/canonical-reference/inventories/toolchain-inventory.md` | `69d30639d14de3d007d83f63aa4428db0c5603e133e349e79f7b33cf31710e7c` | 5965 |
| `.diagnostics/operational-journey-factory/surface-inventory.json` | `.diagnostics/operational-journey-factory/canonical-reference/inventories/surface-inventory.json` | `88ab931f2aacbe1d492e7824b00b7bc3fd8fbb6e403d3d09c0ecaca0429617b0` | 127084 |
| `.diagnostics/operational-journey-factory/surface-inventory.md` | `.diagnostics/operational-journey-factory/canonical-reference/inventories/surface-inventory.md` | `8ee22d0da9c2fdf7ac8df12961e1bd0e4c184ede3f8c5e8bafdc014b8f8951b0` | 2089 |
| `.diagnostics/operational-journey-factory/journey-inventory.json` | `.diagnostics/operational-journey-factory/canonical-reference/inventories/journey-inventory.json` | `acdd19f8f323ccc9f3de4c7dc74504a39cbc9835c5ab5671bfa829cf7cf72e6f` | 141337 |
| `.diagnostics/operational-journey-factory/journey-inventory.md` | `.diagnostics/operational-journey-factory/canonical-reference/inventories/journey-inventory.md` | `d9d3b56641bd4811b2036979b760bda9a44fe488dfc2c021ed99390c532e3d7b` | 1235 |
| `.diagnostics/operational-journey-factory/gap-ledger.json` | `.diagnostics/operational-journey-factory/canonical-reference/inventories/gap-ledger.json` | `49fa0f45f209b0380e91407e4cf68addb1424ae4fda53d0bb0183c9b21436de6` | 70951 |
| `.diagnostics/operational-journey-factory/gap-ledger.md` | `.diagnostics/operational-journey-factory/canonical-reference/inventories/gap-ledger.md` | `360b7b80d31258d8ed85f298bccb5a2f5130042fe04074b35986ddbe379f5427` | 16956 |

## Diagnostics Folder Decisions

| Entry | Type | Files | Size | Decision | Quote |
|---|---|---:|---:|---|---|
| .diagnostics/operational-journey-factory | directory | 35 | 2904852 | KEEP_CANONICAL_FACTORY_ROOT | Core operational inventory root; only core inventory files are canonical. Old package folders remain raw evidence unless archived. |
| .diagnostics/security | directory | 0 | 0 | QUOTE_AS_SPECIALIST_EVIDENCE_THEN_ARCHIVE | Useful specialist evidence; must be linked into operational gap ledger before controlling journeys. |
| .diagnostics/toolchain | directory | 0 | 0 | QUOTE_TO_TOOLCHAIN_REFERENCE_THEN_ARCHIVE | Useful for tool ownership, failures, and optional/manual tool classification. |

## Extracted Evidence Candidates

| Diagnostic entry | File | Action |
|---|---|---|
| none | none | none |

## Blockers

- none

## Warnings

- none

## Result

CANONICAL_REFERENCE_PREPARED. This is still not final closure; it is the source-of-truth reference layer for future journey packages.