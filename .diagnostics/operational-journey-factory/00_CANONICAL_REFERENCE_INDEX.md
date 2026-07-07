# Canonical Operational Journey Reference

- branch: journy
- head_sha: 4cbe5a8c0aac32308affe90295f496bb9d681c26
- generated_at: 2026-07-07T14:40:49.619Z
- implementation_started: false
- closure_claim: false

## Numeric Truth

| Metric | Value |
|---|---:|
| head_sha | 4cbe5a8c0aac32308affe90295f496bb9d681c26 |
| branch | journy |
| gap_count | 178 |
| blocking_gap_count | 0 |
| toolchain_tool_count | 60 |
| unused_script_count | 35 |
| surface_inventory_item_count | 628 |
| openapi_file_count | 5 |
| api_operation_count | 206 |
| generated_client_count | 4 |
| backend_route_count | 29 |

## Canonical Inventory Files

| Source | Reference copy | sha256 | Size |
|---|---|---|---:|
| `.diagnostics/operational-journey-factory/toolchain-inventory.json` | `.diagnostics/operational-journey-factory/inventories/toolchain-inventory.json` | `43efb3d4a3a2429e546138ceefdbd0f1a0b1bf76771e1475e354634a53833ddf` | 89861 |
| `.diagnostics/operational-journey-factory/toolchain-inventory.md` | `.diagnostics/operational-journey-factory/inventories/toolchain-inventory.md` | `93269bf289ede96fa4d5ec958b4e23f4d04127807dd53b829866cdb9e4dc387d` | 6067 |
| `.diagnostics/operational-journey-factory/surface-inventory.json` | `.diagnostics/operational-journey-factory/inventories/surface-inventory.json` | `a8e414ca73ae175e55609d1aef07e740e3111afe42b26ab5fcf2749bbfca6251` | 105340 |
| `.diagnostics/operational-journey-factory/surface-inventory.md` | `.diagnostics/operational-journey-factory/inventories/surface-inventory.md` | `adfce304ecdfa718246846eb270ed12d117f1770bbc9800646ac9680f5d81dd9` | 2086 |
| `.diagnostics/operational-journey-factory/journey-inventory.json` | `.diagnostics/operational-journey-factory/inventories/journey-inventory.json` | `70ade9821664d1f3894b17da72a3c4fd94d60136ec150bc584ddbc64e2184dbe` | 141337 |
| `.diagnostics/operational-journey-factory/journey-inventory.md` | `.diagnostics/operational-journey-factory/inventories/journey-inventory.md` | `2bf5f8be2a4189d3c37bfef0e5e0af57d3992761f7036df4a3fcd6c687cfd730` | 1235 |
| `.diagnostics/operational-journey-factory/gap-ledger.json` | `.diagnostics/operational-journey-factory/inventories/gap-ledger.json` | `0c2a245d47165160856b838d81650eac24e729be3eb877ffdfae4c6a6b1720e7` | 212554 |
| `.diagnostics/operational-journey-factory/gap-ledger.md` | `.diagnostics/operational-journey-factory/inventories/gap-ledger.md` | `5ead0264f34e94fa3e9f30934131716e538c68579311de521a82235fb0d4129b` | 53051 |

## Diagnostics Folder Decisions

| Entry | Type | Files | Size | Decision | Quote |
|---|---|---:|---:|---|---|
| .diagnostics/operational-journey-factory | directory | 46 | 4043525 | KEEP_CANONICAL_FACTORY_ROOT | Core operational inventory root; only core inventory files are canonical. Old package folders remain raw evidence unless archived. |

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