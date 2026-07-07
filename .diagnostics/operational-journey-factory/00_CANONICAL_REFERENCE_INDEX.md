# Canonical Operational Journey Reference

- branch: journy
- head_sha: 1806c36e133f76501f2b18f6965d7ea47dbd7e89
- generated_at: 2026-07-07T20:06:00.632Z
- implementation_started: false
- closure_claim: false

## Numeric Truth

| Metric | Value |
|---|---:|
| head_sha | 1806c36e133f76501f2b18f6965d7ea47dbd7e89 |
| branch | journy |
| gap_count | 7 |
| blocking_gap_count | 0 |
| toolchain_tool_count | 60 |
| unused_script_count | 38 |
| surface_inventory_item_count | 611 |
| openapi_file_count | 5 |
| api_operation_count | 206 |
| generated_client_count | 4 |
| backend_route_count | 29 |

## Canonical Inventory Files

| Source | Reference copy | sha256 | Size |
|---|---|---|---:|
| `.diagnostics/operational-journey-factory/toolchain-inventory.json` | `.diagnostics/operational-journey-factory/inventories/toolchain-inventory.json` | `1560c2ef7b8d2eb663f668109b39a67199a1330453902fa71e9a159187f4e4b3` | 92147 |
| `.diagnostics/operational-journey-factory/toolchain-inventory.md` | `.diagnostics/operational-journey-factory/inventories/toolchain-inventory.md` | `8c38b54b393d0ca99e1077a9e227ff9534ecc800d58600c5b66eacd6df70ec96` | 6177 |
| `.diagnostics/operational-journey-factory/surface-inventory.json` | `.diagnostics/operational-journey-factory/inventories/surface-inventory.json` | `de8413124b3a6e7bb462946de4d0f55afc643f3dcaefb429a99099db3e40378b` | 102825 |
| `.diagnostics/operational-journey-factory/surface-inventory.md` | `.diagnostics/operational-journey-factory/inventories/surface-inventory.md` | `78c553366d5b2724c94c55f8e3f1cee53e55e573bbf89621d0a42459847ab5dd` | 2086 |
| `.diagnostics/operational-journey-factory/journey-inventory.json` | `.diagnostics/operational-journey-factory/inventories/journey-inventory.json` | `9638e484ad12c7e85e45cc346ab0d8c054dd6e4e71beaec9422330ddf28a4042` | 140959 |
| `.diagnostics/operational-journey-factory/journey-inventory.md` | `.diagnostics/operational-journey-factory/inventories/journey-inventory.md` | `c8106637b26415e789db5ba2cf7ddd16536df5776b23285f67f090e8c9f342c1` | 1235 |
| `.diagnostics/operational-journey-factory/gap-ledger.json` | `.diagnostics/operational-journey-factory/inventories/gap-ledger.json` | `37058d15c4e265360f0650b1e93d9ea6b4c393516b6b8e614e1ecd1c7cd779e4` | 8481 |
| `.diagnostics/operational-journey-factory/gap-ledger.md` | `.diagnostics/operational-journey-factory/inventories/gap-ledger.md` | `8f57e57ad736df13590038ca779aa08e4149099841e65cf77eca04752fae32b4` | 2322 |

## Diagnostics Folder Decisions

| Entry | Type | Files | Size | Decision | Quote |
|---|---|---:|---:|---|---|
| .diagnostics/operational-journey-factory | directory | 40 | 5306259 | KEEP_CANONICAL_FACTORY_ROOT | Core operational inventory root; only core inventory files are canonical. Old package folders remain raw evidence unless archived. |
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