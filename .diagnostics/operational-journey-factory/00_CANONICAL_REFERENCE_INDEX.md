# Canonical Operational Journey Reference

- branch: journy
- head_sha: 682aec7ef7b51167a3d828448bcdfd11cec2cd60
- generated_at: 2026-07-07T14:12:49.442Z
- implementation_started: false
- closure_claim: false

## Numeric Truth

| Metric | Value |
|---|---:|
| head_sha | 682aec7ef7b51167a3d828448bcdfd11cec2cd60 |
| branch | journy |
| gap_count | 184 |
| blocking_gap_count | 0 |
| toolchain_tool_count | 60 |
| unused_script_count | 33 |
| surface_inventory_item_count | 628 |
| openapi_file_count | 5 |
| api_operation_count | 206 |
| generated_client_count | 4 |
| backend_route_count | 29 |

## Canonical Inventory Files

| Source | Reference copy | sha256 | Size |
|---|---|---|---:|
| `.diagnostics/operational-journey-factory/toolchain-inventory.json` | `.diagnostics/operational-journey-factory/inventories/toolchain-inventory.json` | `bd6d5cb42685e7dd9398c8b5806350df478c3cdf0131656db4b0dfb2d779bfaf` | 88139 |
| `.diagnostics/operational-journey-factory/toolchain-inventory.md` | `.diagnostics/operational-journey-factory/inventories/toolchain-inventory.md` | `8825b2484d5526ad98ba11ee3a1887cbc24156eecdc3e06078bdd5972294c92c` | 5965 |
| `.diagnostics/operational-journey-factory/surface-inventory.json` | `.diagnostics/operational-journey-factory/inventories/surface-inventory.json` | `e88c744fb084a7853764e107401e1bfa01866d245f5cdc6d7be4bee63055d700` | 105340 |
| `.diagnostics/operational-journey-factory/surface-inventory.md` | `.diagnostics/operational-journey-factory/inventories/surface-inventory.md` | `61c6f90945c3f75474e306b78cf67a353004006ae2f5a2305f7da0b79b51ce41` | 2086 |
| `.diagnostics/operational-journey-factory/journey-inventory.json` | `.diagnostics/operational-journey-factory/inventories/journey-inventory.json` | `5210b77ccc13ef20e33de03d7a17ad31d88a59f7c2d26c091d5c023b356d223e` | 141337 |
| `.diagnostics/operational-journey-factory/journey-inventory.md` | `.diagnostics/operational-journey-factory/inventories/journey-inventory.md` | `60e30abb29ab824a4ffe32b93111acc38ec3dfd2b486a2c09e7a6187cf31ea5f` | 1235 |
| `.diagnostics/operational-journey-factory/gap-ledger.json` | `.diagnostics/operational-journey-factory/inventories/gap-ledger.json` | `6f62200d68dfc88530aec43a4ac53fe7e953f4ec06cc05dfd87f422f1d365e97` | 219533 |
| `.diagnostics/operational-journey-factory/gap-ledger.md` | `.diagnostics/operational-journey-factory/inventories/gap-ledger.md` | `eac7106e51c593bbe5eb3354939dc62e9a6d1485916a1396bd6b40a36bbcdd1a` | 54751 |

## Diagnostics Folder Decisions

| Entry | Type | Files | Size | Decision | Quote |
|---|---|---:|---:|---|---|
| .diagnostics/operational-journey-factory | directory | 44 | 4058076 | KEEP_CANONICAL_FACTORY_ROOT | Core operational inventory root; only core inventory files are canonical. Old package folders remain raw evidence unless archived. |

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