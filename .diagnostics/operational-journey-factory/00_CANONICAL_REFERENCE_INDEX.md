# Canonical Operational Journey Reference

- branch: journy
- head_sha: 0b89aca02db5dcae60e91264f6d9327abe60a184
- generated_at: 2026-07-08T00:30:15.366Z
- implementation_started: false
- closure_claim: false

## Numeric Truth

| Metric | Value |
|---|---:|
| head_sha | 0b89aca02db5dcae60e91264f6d9327abe60a184 |
| branch | journy |
| gap_count | 11 |
| blocking_gap_count | 1 |
| toolchain_tool_count | 60 |
| unused_script_count | 38 |
| surface_inventory_item_count | 623 |
| openapi_file_count | 5 |
| api_operation_count | 210 |
| generated_client_count | 4 |
| backend_route_count | 29 |

## Canonical Inventory Files

| Source | Reference copy | sha256 | Size |
|---|---|---|---:|
| `.diagnostics/operational-journey-factory/toolchain-inventory.json` | `.diagnostics/operational-journey-factory/inventories/toolchain-inventory.json` | `aa2e9423006971837dc1401d38349c36cc57ac9f03c094ea21262e9cb766ee59` | 92147 |
| `.diagnostics/operational-journey-factory/toolchain-inventory.md` | `.diagnostics/operational-journey-factory/inventories/toolchain-inventory.md` | `30e99e70deaa9e583d26d19f7dcc2917480cffdb32b3f8d2a82fb8fba6e7cacd` | 6177 |
| `.diagnostics/operational-journey-factory/surface-inventory.json` | `.diagnostics/operational-journey-factory/inventories/surface-inventory.json` | `81ef1cb6d76d8436a142f17838335ce53d6b20d61cb5e45907198b196c034cdc` | 104850 |
| `.diagnostics/operational-journey-factory/surface-inventory.md` | `.diagnostics/operational-journey-factory/inventories/surface-inventory.md` | `c8b14f86ccc02975921328e988ae7f19df31a93d0fb0dd1b0515ed75df1fb817` | 2087 |
| `.diagnostics/operational-journey-factory/journey-inventory.json` | `.diagnostics/operational-journey-factory/inventories/journey-inventory.json` | `aa533190d9cbf495076409142c53908767c730e4ff3317ce450882dcca4ca04b` | 144021 |
| `.diagnostics/operational-journey-factory/journey-inventory.md` | `.diagnostics/operational-journey-factory/inventories/journey-inventory.md` | `0326fcb170a71552f3cbf40669a784b78f871fecf45de3524d26c287bc8e3a26` | 1235 |
| `.diagnostics/operational-journey-factory/gap-ledger.json` | `.diagnostics/operational-journey-factory/inventories/gap-ledger.json` | `2ec3fccdce2126508ad27705494e17f545a73eace21acbb5fe83368c49426cf9` | 13811 |
| `.diagnostics/operational-journey-factory/gap-ledger.md` | `.diagnostics/operational-journey-factory/inventories/gap-ledger.md` | `bd0bc6f7577dc5567733b23022d88e48cf52a7e9e900fc3669828ec79059a866` | 3580 |

## Diagnostics Folder Decisions

| Entry | Type | Files | Size | Decision | Quote |
|---|---|---:|---:|---|---|
| .diagnostics/operational-journey-factory | directory | 40 | 5383836 | KEEP_CANONICAL_FACTORY_ROOT | Core operational inventory root; only core inventory files are canonical. Old package folders remain raw evidence unless archived. |
| .diagnostics/tools | directory | 2 | 18432 | QUOTE_TO_TOOLCHAIN_REFERENCE_THEN_ARCHIVE | Useful for tool ownership, failures, and optional/manual tool classification. |

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