# Source Manifest — diagnose_all-end-to-end

## Purpose

This manifest proves provenance and coverage for the real semantic merge. The active directory no longer stores 14 `SOURCE-*` duplicate copies. Instead, every source artifact is mapped into one or more canonical merged files while the original source directories remain available as historical/provenance evidence.

## Source package A — v5-finance-delivery-canonical-truth-20260816-0214

| Source file | Git blob SHA | Merged destination(s) | Coverage |
|---|---|---|---|
| `START-HERE.md` | `33afbec96e3363bb3b102f0cf9f4222fdd1dbf62` | `START-HERE.md`, `RECONCILIATION.md` | purpose, authority order, hard rules, root ranking, PREPARE_ONLY status |
| `DIAGNOSIS.md` | `43c32b9060425998b349f4747e3f7ecbdf98c40c` | `DIAGNOSIS.md`, `COVERAGE.md`, `PACKAGE.md` | checkout, PaymentAllocation, captain wallet/collateral, COD lifecycle, eligibility, service area, accreditation/presence, fleet, partner delivery, penalties, refunds, settlement, historical reproof, security, surfaces |
| `DECISIONS.md` | `72eca66205759e4e91868a8b7469c153abd86540` | `DECISIONS.md`, `RECONCILIATION.md` | original D01-D20 outcomes; later conflicts reconciled explicitly |
| `CLEANUP.md` | `7ca5e6d5acc968316bcdba1471b19bedfe970cbc` | `CLEANUP.md`, `PACKAGE.md` | financial authority cleanup, COD/payment/eligibility/fleet/accreditation/penalty/partner surface cleanup, legacy-finance reproof, migrations/contracts/line-file-folder cleanup and final verification |
| `PACKAGE.md` | `55e1e8a81af8a02592e7f8738d7f2faa9c054e7c` | `PACKAGE.md`, `START-HERE.md`, `DIAGNOSIS.md` | operational coverage, original root-cause graph, evidence/frontier concepts, fail-closed package contract |
| `MERGE-RECONCILIATION.md` | `7e1408f37a0fd1204c9710b5e0f52ad9c887230c` | `RECONCILIATION.md`, `DIAGNOSIS.md`, `CLEANUP.md`, `PACKAGE.md` | branch verification and mandatory MR-F01..MR-F11 carried-forward findings |

Source count: `6/6` mapped.

## Source package B — v5-canonical-finance-delivery-captain-closure-20260816-0226

| Source file | Git blob SHA | Merged destination(s) | Coverage |
|---|---|---|---|
| `START-HERE.md` | `df896406da0ab955f5e4a048eb857d0f7a6840a7` | `START-HERE.md`, `RECONCILIATION.md` | status, root hierarchy, merged branch audit, canonical authority map, final product outcomes and DONE rule |
| `RECONCILIATION.md` | `c5caa6fea3c6702d36f19426679f51c408383629` | `RECONCILIATION.md`, `DECISIONS.md` | latest-A delta classification and later store-courier compensation authority override |
| `DIAGNOSIS.md` | `895bb9f94f755f24fcacdc0d65bdfb1378844488` | `DIAGNOSIS.md`, `PACKAGE.md`, `COVERAGE.md` | systemic root model, tender/exposure/custody/settlement separation, canonical operational models, surfaces and dangerous-pattern inventory |
| `DECISIONS.md` | `81da2b02112319974310934c1a22b76c29814c10` | `DECISIONS.md` | expanded binding D01-D36 decision set and fail-closed closure rule |
| `IMPLEMENTATION-AUDIT.md` | `e14f5ec374512579888324774b9ec4d4a5bc034c` | `IMPLEMENTATION-AUDIT.md` | actual implementation status, actor-provenance failed run, capability-by-capability OPEN/NOT IMPLEMENTED audit |
| `COVERAGE.md` | `6ab4b4bcb073ee9c0406dadb2cbb61f979675ae3` | `COVERAGE.md` | authority/domain, journey, surface, failure/recovery and evidence coverage |
| `CLEANUP.md` | `3c78bdefaf57dad0f31d297b97a5aee9dfa3688f` | `CLEANUP.md`, `PACKAGE.md` | C01-C30 zero-residue cleanup semantics expanded in the merged cleanup contract |
| `PACKAGE.md` | `27f9b9c614c23fb12df6e27e80a6c7ce6ee79e24` | `PACKAGE.md`, `START-HERE.md` | F0-F14 frontier, invariants, blockers, evidence bundle and final closure predicate |

Source count: `8/8` mapped.

## Total source coverage

`14/14 SOURCE ARTIFACTS MAPPED`

No source artifact is omitted from the provenance ledger.

## Semantic conflict resolution ledger

### Store courier per-delivery compensation

Older source allowed a possible platform-managed store-funded WLT earning policy. Later explicit user decision removed BTHWANI from store employee compensation responsibility.

Active merged authority: store compensation/payroll is store-owned; BTHWANI does not become payer/payroll ledger unless a future explicit product/contract decision changes this.

### Captain one wallet versus explicit guarantee position

Older source emphasized one captain WLT wallet/no second guarantee wallet. Later source required an explicit restricted guarantee/collateral financial position.

Active merged authority: one coherent captain-facing WLT account/wallet experience, with a distinct restricted collateral position inside WLT; no second independent source/wallet and no Workforce money authority.

### COD reservation/debit versus custody/remittance

Older source emphasized avoiding a duplicate remittance liability when collateral-backed reservation is converted to final WLT debit. Later source emphasized explicit physical cash custody.

Active merged authority: exposure and custody are separate; custody/audit remains explicit, but the final economic settlement must not double-count the same amount through two liabilities.

### Historical penalty direct-write finding

Older historical package claimed direct wallet mutation. Current diagnosis found canonical ledger posting for that subpath.

Active merged authority: caller amount authority remains a defect; the superseded direct-write claim is not carried as a current defect without fresh evidence.

## Temporary SOURCE-* copy retirement

The previous consolidation created these temporary copy classes inside `diagnose_all-end-to-end`:

- `SOURCE-0214-*`
- `SOURCE-0226-*`

They are removed by the real merge because keeping them would leave a duplicate file forest rather than one coherent package.

The original source directories remain unchanged as provenance, so removing the temporary copies does not destroy source evidence.

## Active merged files

The only active file set inside `diagnose_all-end-to-end` after this correction is:

- `START-HERE.md`
- `DIAGNOSIS.md`
- `DECISIONS.md`
- `IMPLEMENTATION-AUDIT.md`
- `COVERAGE.md`
- `CLEANUP.md`
- `PACKAGE.md`
- `RECONCILIATION.md`
- `SOURCE-MANIFEST.md`

Future diagnosis updates for this continuing scope should update these canonical merged files rather than reintroduce source-prefixed copies.
