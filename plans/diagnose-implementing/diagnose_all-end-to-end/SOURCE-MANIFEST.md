# SOURCE MANIFEST — zero-omission consolidation ledger

Baseline branch: `A`

Pinned source baseline: `90800fa32a1a18b820082d2e936e0383eecd7c8e`

Target directory: `plans/diagnose-implementing/diagnose_all-end-to-end`

## Completeness contract

The two source directories contained 14 files total at the pinned baseline. All 14 are copied into the target directory using their existing Git blob SHAs. Reusing the original blob SHA means the copied source file content is byte-identical to the source file; no summarization or rewrite occurs during consolidation.

### Source package 0214 — 6/6 files

| Original file | Original blob SHA | Consolidated file |
|---|---|---|
| `v5-finance-delivery-canonical-truth-20260816-0214/CLEANUP.md` | `7ca5e6d5acc968316bcdba1471b19bedfe970cbc` | `SOURCE-0214-CLEANUP.md` |
| `v5-finance-delivery-canonical-truth-20260816-0214/DECISIONS.md` | `72eca66205759e4e91868a8b7469c153abd86540` | `SOURCE-0214-DECISIONS.md` |
| `v5-finance-delivery-canonical-truth-20260816-0214/DIAGNOSIS.md` | `43c32b9060425998b349f4747e3f7ecbdf98c40c` | `SOURCE-0214-DIAGNOSIS.md` |
| `v5-finance-delivery-canonical-truth-20260816-0214/MERGE-RECONCILIATION.md` | `7e1408f37a0fd1204c9710b5e0f52ad9c887230c` | `SOURCE-0214-MERGE-RECONCILIATION.md` |
| `v5-finance-delivery-canonical-truth-20260816-0214/PACKAGE.md` | `55e1e8a81af8a02592e7f8738d7f2faa9c054e7c` | `SOURCE-0214-PACKAGE.md` |
| `v5-finance-delivery-canonical-truth-20260816-0214/START-HERE.md` | `33afbec96e3363bb3b102f0cf9f4222fdd1dbf62` | `SOURCE-0214-START-HERE.md` |

### Source package 0226 — 8/8 files

| Original file | Original blob SHA | Consolidated file |
|---|---|---|
| `v5-canonical-finance-delivery-captain-closure-20260816-0226/CLEANUP.md` | `3c78bdefaf57dad0f31d297b97a5aee9dfa3688f` | `SOURCE-0226-CLEANUP.md` |
| `v5-canonical-finance-delivery-captain-closure-20260816-0226/COVERAGE.md` | `6ab4b4bcb073ee9c0406dadb2cbb61f979675ae3` | `SOURCE-0226-COVERAGE.md` |
| `v5-canonical-finance-delivery-captain-closure-20260816-0226/DECISIONS.md` | `81da2b02112319974310934c1a22b76c29814c10` | `SOURCE-0226-DECISIONS.md` |
| `v5-canonical-finance-delivery-captain-closure-20260816-0226/DIAGNOSIS.md` | `895bb9f94f755f24fcacdc0d65bdfb1378844488` | `SOURCE-0226-DIAGNOSIS.md` |
| `v5-canonical-finance-delivery-captain-closure-20260816-0226/IMPLEMENTATION-AUDIT.md` | `e14f5ec374512579888324774b9ec4d4a5bc034c` | `SOURCE-0226-IMPLEMENTATION-AUDIT.md` |
| `v5-canonical-finance-delivery-captain-closure-20260816-0226/PACKAGE.md` | `27f9b9c614c23fb12df6e27e80a6c7ce6ee79e24` | `SOURCE-0226-PACKAGE.md` |
| `v5-canonical-finance-delivery-captain-closure-20260816-0226/RECONCILIATION.md` | `c5caa6fea3c6702d36f19426679f51c408383629` | `SOURCE-0226-RECONCILIATION.md` |
| `v5-canonical-finance-delivery-captain-closure-20260816-0226/START-HERE.md` | `df896406da0ab955f5e4a048eb857d0f7a6840a7` | `SOURCE-0226-START-HERE.md` |

## Count proof

- Source package 0214: `6` files.
- Source package 0226: `8` files.
- Source files expected: `14`.
- Source files copied: `14`.
- Omitted source files: `0`.
- Rewritten source files: `0`.
- Added consolidation-control files: `2` (`START-HERE.md`, `SOURCE-MANIFEST.md`).
- Expected total files in target directory after this consolidation: `16`.

## Provenance / conflict handling

The original packages remain in place. The consolidated copies are immutable provenance snapshots unless a later explicit migration deliberately replaces them while preserving traceability. Future diagnosis should add new canonical diagnosis artifacts in this target directory rather than modifying the source snapshots silently.
