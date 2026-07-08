# Canonical Operational Journey Reference

- branch: journy
- head_sha: 1a312031e3f10c07a5f06ff0421d09ba82ffd3f7
- generated_at: 2026-07-08T15:42:56.236Z
- implementation_started: false
- closure_claim: false

## Numeric Truth

| Metric | Value |
|---|---:|
| head_sha | 1a312031e3f10c07a5f06ff0421d09ba82ffd3f7 |
| branch | journy |
| gap_count | 0 |
| blocking_gap_count | 0 |
| toolchain_tool_count | 60 |
| unused_script_count | 36 |
| surface_inventory_item_count | 612 |
| openapi_file_count | 5 |
| api_operation_count | 210 |
| generated_client_count | 4 |
| backend_route_count | 29 |

## Canonical Inventory Files

| Source | Reference copy | sha256 | Size |
|---|---|---|---:|
| `.diagnostics/operational-journey-factory/toolchain-inventory.json` | `.diagnostics/operational-journey-factory/inventories/toolchain-inventory.json` | `c9d120c7ee2bc62ce211f4e9b483c14e3fde084418f6977a78dbf5d60a534aef` | 90592 |
| `.diagnostics/operational-journey-factory/toolchain-inventory.md` | `.diagnostics/operational-journey-factory/inventories/toolchain-inventory.md` | `aa624d984a8789e3c237393369ad5256c9a336590ed3210b48f9550c73fcb35a` | 6070 |
| `.diagnostics/operational-journey-factory/surface-inventory.json` | `.diagnostics/operational-journey-factory/inventories/surface-inventory.json` | `93859d68086b11b625d6fbb79f7cecd39bf5453d99a4b619daf4e2505b7e8ec3` | 103372 |
| `.diagnostics/operational-journey-factory/surface-inventory.md` | `.diagnostics/operational-journey-factory/inventories/surface-inventory.md` | `a8c05c9fe78910a330b70dbf9f78d6211acf096aebabc4fe485aa60a1dff9700` | 2087 |
| `.diagnostics/operational-journey-factory/journey-inventory.json` | `.diagnostics/operational-journey-factory/inventories/journey-inventory.json` | `7c53ccc68ed360a7e870e5b119337c058c8d59555ea32101e7c5fc31717c7316` | 144099 |
| `.diagnostics/operational-journey-factory/journey-inventory.md` | `.diagnostics/operational-journey-factory/inventories/journey-inventory.md` | `03df057194b0404d55a9bf40e6fe3c7a5d78a5a1e28acc421721f05fb142bd0b` | 1235 |
| `.diagnostics/operational-journey-factory/gap-ledger.json` | `.diagnostics/operational-journey-factory/inventories/gap-ledger.json` | `729780ede5809ed9b3b3a7d8658d0feb72fb8b014b180781488352628b65c79f` | 495 |
| `.diagnostics/operational-journey-factory/gap-ledger.md` | `.diagnostics/operational-journey-factory/inventories/gap-ledger.md` | `953f01caa2b6ee455ccb335507e6749a5b4007af55e6d056da0832193ee2772d` | 317 |

## Diagnostics Folder Decisions

| Entry | Type | Files | Size | Decision | Quote |
|---|---|---:|---:|---|---|
| .diagnostics/operational-journey-factory | directory | 40 | 5319582 | KEEP_CANONICAL_FACTORY_ROOT | Core operational inventory root; only core inventory files are canonical. Old package folders remain raw evidence unless archived. |
| .diagnostics/tools | directory | 2 | 18498 | QUOTE_TO_TOOLCHAIN_REFERENCE_THEN_ARCHIVE | Useful for tool ownership, failures, and optional/manual tool classification. |

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