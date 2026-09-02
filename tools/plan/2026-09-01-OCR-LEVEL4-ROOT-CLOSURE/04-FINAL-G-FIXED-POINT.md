# FINAL `g` FIXED-POINT VERIFICATION

## 0. Scope

This file qualifies **branch `g` only**.

It does not evaluate, compare, merge, rebase, synchronize, or prepare any other branch.

`GREEN != CLOSED`.

Verification must prove the corrected state of all material content on one exact immutable `g` SHA and must prove absence of superseded authority, cleanup residue, parallel truth, duplicate writers, stale tooling, and undispositioned artifacts.

## 1. Evidence ladder

Use where applicable:

1. static source/ownership proof;
2. focused unit/component tests;
3. schema/contract/generated consistency;
4. migration/backfill/reconciliation/readback;
5. runtime/integration tests;
6. product journey/device/browser evidence;
7. CI/security/scanner evidence;
8. structural negative-space audit;
9. exact-candidate branch-wide qualification;
10. fresh adversarial audit of all material content on `g`.

Evidence from a different SHA or different branch is context only unless independently revalidated for the exact `g` candidate.

## 2. Evidence-debt law

Every material test/CI/scanner/runtime/review/device finding must be:

`PROVENANCE → VALIDATE/FALSIFY → DEDUPLICATE → MAP TO ROOT/FALSE POSITIVE → ACT → CONSUME`.

No orphan finding and no success-only interpretation.

## 3. Per-root verification

Before closure verify dimensions invalidated by the root, including where applicable:

- canonical semantics/owner/writer uniqueness;
- schema/constraints/clean install;
- existing-data migration/backfill/readback;
- contract/generated parity;
- API/runtime behavior;
- all affected consumers;
- scripts/workflows/config/tooling invocation paths;
- product journeys;
- auth/security/privacy;
- concurrency/idempotency/recovery;
- A11y/RTL/LTR;
- deletion/reference absence.

## 4. Independent falsification

Attempt to disprove closure by searching for:

- second writers/owners;
- old path/import/route/config/env names;
- old script/workflow/tool invocations;
- manual mappings/wrappers/contract repairs;
- stale fixtures/tests/mocks/snapshots;
- dead files/packages;
- legacy/history/archive/backup/copy/temp residue;
- error/missing/unknown converted to plausible success;
- clean-install vs upgraded-state divergence;
- unused dependencies/plugins;
- misplaced responsibility.

Closure requires the falsification attempt to find no material contradiction.

## 5. Structural negative-space gate

Before root closure prove as applicable:

```text
OLD_WRITERS=0
OLD_READERS=0
OLD_IMPORTS=0
OLD_REEXPORTS=0
OLD_ROUTES=0
OLD_CONFIG_REFS=0
OLD_SCRIPT_WORKFLOW_REFS=0
OLD_RUNTIME_REACHABILITY=0
UNMIGRATED_CONSUMERS=0
UNEXPECTED_GENERATED_DIFF=0
UNBOUNDED_COMPATIBILITY=0
THIRD_AUTHORITY=0
EXPECTED_DELETIONS_MISSING=0
UNDISPOSITIONED_MATERIAL_ARTIFACTS=0
```

Functional pass with residue is not closure.

## 6. Queue exhaustion is not closure

When the known Root Graph first becomes empty, run a fresh independent audit across **all material content on `g`**, not only files/directories already mentioned in the plan.

Cover:

`product/system behavior`, `code/architecture`, `data/schema/migrations/clean-install`, `contracts/generated`, `runtime/config/env`, `scripts/tooling/CLI`, `workflows/actions`, `security/auth/privacy`, `concurrency/recovery/idempotency`, `all application journeys/UX/A11y/RTL`, `filesystem ownership`, `semantic duplicates`, `parallel/shadow truth`, `dead/stale/obsolete/legacy/temp residue`, `compatibility`, `dependencies`, `exports/routes/config`, `tests/fixtures/mocks/snapshots`, `documents/manifests with live authority`.

Any material finding reopens the graph.

## 7. Final branch-wide canonical cleanliness sweep

Run on the exact final `g` candidate:

`semantic duplicate scan → mutable writer uniqueness → owner uniqueness → contract authority → schema/data authority → generated/manual repair → state-machine/policy/default/mapping duplication → filesystem responsibility → script/tool/workflow uniqueness → dead/unreachable → legacy/history/archive/backup/copy/temp → compatibility residue → unused dependency/export/config/route/script/workflow → test/fixture/mock residue → reachable old authority → undispositioned artifact scan`.

Every material hit must have a proven disposition.

## 8. Exact final candidate qualification

Pin one immutable `g` SHA and require:

```text
KNOWN_MATERIAL_ROOTS=0
KNOWN_MATERIAL_GAPS=0
KNOWN_MATERIAL_UNKNOWNS=0
UNDISPOSITIONED_FINDINGS=0
EVIDENCE_DEBT=0
UNMIGRATED_CONSUMERS=0
REACHABLE_OLD_AUTHORITIES=0
PARALLEL_TRUTHS=0
SHADOW_AUTHORITIES=0
DUPLICATE_MUTABLE_WRITERS=0
UNBOUNDED_COMPATIBILITY=0
MATERIAL_DEAD_STALE_OBSOLETE_RESIDUE=0
MATERIAL_UNUSED_SCRIPT_WORKFLOW_TOOLING=0
MATERIAL_UNUSED_DEPENDENCY_CONFIG_ROUTE=0
MATERIAL_FILESYSTEM_NOISE=0
CLEANUP_OBLIGATIONS=0
MATERIAL_REGRESSIONS=0
FRESH_BRANCH_WIDE_ADVERSARIAL_REAUDIT=PASS
NEGATIVE_SPACE=PASS
```

If any field is unknown, final qualification fails.

## 9. Final output

Only when the exact `g` candidate passes:

```text
G_RADICAL_CLEANUP_COMPLETE
EXACT_G_SHA=<immutable sha>
LEVEL_4_EVIDENCE_STATE=PASS
ROOT_CORRECTNESS_STATE=PASS
STRUCTURAL_RECONSTRUCTION_STATE=PASS
CANONICAL_UNIQUENESS_STATE=PASS
ZERO_PARALLEL_TRUTH_STATE=PASS
ZERO_RESIDUE_STATE=PASS
G_NOISE_BUDGET=ZERO_KNOWN_MATERIAL_NOISE
KNOWN_REMAINING_ROOTS=0
KNOWN_MATERIAL_GAPS=0
KNOWN_MATERIAL_UNKNOWNS=0
```

Do not emit `MERGE_READY` or `G_LEVEL4_CANDIDATE_READY`.

## 10. Freeze / stop boundary

After final output:

```text
FREEZE EXACT G SHA
DO NOT OPEN PR
DO NOT MERGE
DO NOT REBASE OR AUTO-SYNC
KEEP g ISOLATED
STOP ACTIVE CLEANUP CAMPAIGN
```

Any later decision involving another branch is a new, separately authorized campaign and is not implied by this plan.
