# Canonical Operational Journey Reference

- branch: journy
- head_sha: 50221e30d81cb65879671ba47198d94f3d054db1
- generated_at: 2026-07-07T15:01:17.062Z
- implementation_started: false
- closure_claim: false

## Numeric Truth

| Metric | Value |
|---|---:|
| head_sha | 50221e30d81cb65879671ba47198d94f3d054db1 |
| branch | journy |
| gap_count | 178 |
| blocking_gap_count | 0 |
| toolchain_tool_count | 60 |
| unused_script_count | 38 |
| surface_inventory_item_count | 628 |
| openapi_file_count | 5 |
| api_operation_count | 206 |
| generated_client_count | 4 |
| backend_route_count | 29 |

## Canonical Inventory Files

| Source | Reference copy | sha256 | Size |
|---|---|---|---:|
| `.diagnostics/operational-journey-factory/toolchain-inventory.json` | `.diagnostics/operational-journey-factory/inventories/toolchain-inventory.json` | `b1a604accf29cf5c8d2347f98705f79ed0529fa8538033c452241f9617e32037` | 92147 |
| `.diagnostics/operational-journey-factory/toolchain-inventory.md` | `.diagnostics/operational-journey-factory/inventories/toolchain-inventory.md` | `9a9278d6fb9f1896397ebf3758859ea600371ed4d474feef725f4d234f64bcb1` | 6177 |
| `.diagnostics/operational-journey-factory/surface-inventory.json` | `.diagnostics/operational-journey-factory/inventories/surface-inventory.json` | `2997c1abfe213e42f6ee332f457b5afdf33308d316dd00878d68726a36b16a29` | 105340 |
| `.diagnostics/operational-journey-factory/surface-inventory.md` | `.diagnostics/operational-journey-factory/inventories/surface-inventory.md` | `8e78afbbd840ba23b1e0405cf913b294aa5eca879f4127f27edcf086bdb88924` | 2086 |
| `.diagnostics/operational-journey-factory/journey-inventory.json` | `.diagnostics/operational-journey-factory/inventories/journey-inventory.json` | `dda96a95608ef9a0879fa8c134f6fcbc6b765c3a0cce9b58e207f1a942391175` | 141337 |
| `.diagnostics/operational-journey-factory/journey-inventory.md` | `.diagnostics/operational-journey-factory/inventories/journey-inventory.md` | `556b083960e8950fdc951b87d6a6d97bedaff8141832efbb8fb9dae157077d78` | 1235 |
| `.diagnostics/operational-journey-factory/gap-ledger.json` | `.diagnostics/operational-journey-factory/inventories/gap-ledger.json` | `e2b49973c676d57420d0c88d6f015322c7f578ce2e304604a3b22ce9b077f8d2` | 212554 |
| `.diagnostics/operational-journey-factory/gap-ledger.md` | `.diagnostics/operational-journey-factory/inventories/gap-ledger.md` | `c05226f3392848fd1e43bda476c72e71a1598b4439e9c66786ce821984bf1038` | 53051 |

## Diagnostics Folder Decisions

| Entry | Type | Files | Size | Decision | Quote |
|---|---|---:|---:|---|---|
| .diagnostics/operational-journey-factory | directory | 50 | 6535308 | KEEP_CANONICAL_FACTORY_ROOT | Core operational inventory root; only core inventory files are canonical. Old package folders remain raw evidence unless archived. |

## Extracted Evidence Candidates

| Diagnostic entry | File | Action |
|---|---|---|
| none | none | none |

## Blockers

- BLOCKED_NEEDS_EVIDENCE: Optional evidence command failed: 08-knip-json

## Warnings

- Optional evidence command failed: 08-knip-json

## Result

BLOCKED_NEEDS_EVIDENCE. Do not delete or execute journeys until blockers are resolved.