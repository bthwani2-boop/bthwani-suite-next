# Canonical Operational Journey Reference

- branch: journy
- head_sha: 8a316bd9659257b400681ef5f65f4c466d3707eb
- generated_at: 2026-07-07T16:29:13.205Z
- implementation_started: false
- closure_claim: false

## Numeric Truth

| Metric | Value |
|---|---:|
| head_sha | 8a316bd9659257b400681ef5f65f4c466d3707eb |
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
| `.diagnostics/operational-journey-factory/toolchain-inventory.json` | `.diagnostics/operational-journey-factory/inventories/toolchain-inventory.json` | `cbca2334d6d63220f0925c9921ec5f40cd846d77f09bf88fb39a31d559c8b1b4` | 92147 |
| `.diagnostics/operational-journey-factory/toolchain-inventory.md` | `.diagnostics/operational-journey-factory/inventories/toolchain-inventory.md` | `297a10d25768209b757b3994e591fc3eb657c2380236e1e7f4193871c24f1f28` | 6177 |
| `.diagnostics/operational-journey-factory/surface-inventory.json` | `.diagnostics/operational-journey-factory/inventories/surface-inventory.json` | `947a8949b4bb42b8e8d987cfa98998fba7111cb7e8b787624384635482d98e61` | 105612 |
| `.diagnostics/operational-journey-factory/surface-inventory.md` | `.diagnostics/operational-journey-factory/inventories/surface-inventory.md` | `1056fdb265e94f8e31677b582a7b0351bad3a0dc864dba0bf5aad18d57c9ba1d` | 2086 |
| `.diagnostics/operational-journey-factory/journey-inventory.json` | `.diagnostics/operational-journey-factory/inventories/journey-inventory.json` | `447074149891e85709d2808fe1fb2b2ce56877e7d20dd2cbda262dfba6557108` | 141337 |
| `.diagnostics/operational-journey-factory/journey-inventory.md` | `.diagnostics/operational-journey-factory/inventories/journey-inventory.md` | `d0e30e92f8821ed9874fd5ca0da64eba700153267f3bd1693c902e723b470a61` | 1235 |
| `.diagnostics/operational-journey-factory/gap-ledger.json` | `.diagnostics/operational-journey-factory/inventories/gap-ledger.json` | `a09e033dfd6c55d21a26a7f8925e5b6655b2326fd56a26bbaf3cd4054ba22890` | 202081 |
| `.diagnostics/operational-journey-factory/gap-ledger.md` | `.diagnostics/operational-journey-factory/inventories/gap-ledger.md` | `9c5445acf427d31cf8d466a76c2d06d410a3ee685cf147e9e6e4dc4cdde0228d` | 50754 |

## Diagnostics Folder Decisions

| Entry | Type | Files | Size | Decision | Quote |
|---|---|---:|---:|---|---|
| .diagnostics/operational-journey-factory | directory | 51 | 6502593 | KEEP_CANONICAL_FACTORY_ROOT | Core operational inventory root; only core inventory files are canonical. Old package folders remain raw evidence unless archived. |
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