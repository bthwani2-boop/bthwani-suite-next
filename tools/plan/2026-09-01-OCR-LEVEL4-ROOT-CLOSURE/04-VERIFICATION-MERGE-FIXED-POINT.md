# VERIFICATION / FIXED-POINT / MERGE BOUNDARY — `g`

## 0. Principle

`GREEN != CLOSED`.

Verification must prove the corrected system on an exact candidate and must also prove the absence of superseded authority, cleanup residue, parallel truth, and unmigrated consumers.

Evidence from a different SHA, PR merge commit, stale branch state, or historical run is context only unless the live orchestrator explicitly allows reuse.

## 1. Evidence ladder

Use evidence in this order where applicable:

1. static source/ownership proof;
2. focused unit/component tests;
3. schema/contract/generated consistency;
4. migration/backfill/readback proof;
5. runtime/integration tests;
6. product journey/device/browser evidence;
7. CI/security/scanner evidence;
8. negative-space structural audit;
9. exact-candidate repository qualification;
10. fresh adversarial re-audit.

Passing a lower layer never waives a materially invalidated higher layer.

## 2. Evidence-debt law

Every material invocation of tests, CI, scanners, runtime, review, or device evidence produces evidence that must be consumed.

Each finding/warning/failure/unexpected pass must be:

`PROVENANCE → VALIDATE/FALSIFY → DEDUPLICATE → MAP TO ROOT OR FALSE POSITIVE → ACT`.

No orphan finding and no success-only interpretation is allowed.

A failing job name is not a root cause. Diagnose the actual failing assertion/runtime state/schema/config/evidence path.

## 3. Current known evidence disposition

At the audit refresh pin `a86f546…`:

- no exact-candidate PR workflow run was returned through the available commit-run query;
- therefore exact-candidate CI state is `UNKNOWN_REQUIRES_PROOF`;
- PR/merge-context run `33574719348` is non-candidate evidence;
- runtime smoke and WLT database safety passing in that run are useful signals but not final qualification;
- DSH DB integration/clean-install, multiple backend jobs, and evidence aggregation being red are diagnosis inputs, not automatic root identities.

The execution session must resolve these unknowns from live evidence rather than copying historical pass/fail labels.

## 4. Per-root targeted verification

Before closing a root, verify the exact dimensions invalidated by that root.

Typical dimensions:

- source semantics;
- canonical owner/writer uniqueness;
- schema constraints;
- clean-install/bootstrap;
- existing-data migration/backfill;
- persisted readback;
- contract/generated parity;
- API/runtime behavior;
- all affected consumers;
- relevant product journeys;
- auth/security/privacy;
- concurrency/idempotency/recovery;
- accessibility/RTL/LTR when UI is affected;
- cleanup/deletion/reference absence.

Do not rerun the entire universe after every commit unless the root invalidates it.

## 5. Independent falsification

Every closure unit must attempt to disprove itself.

Examples:

- search for second writers;
- search for old path/import/route/config names;
- attempt missing/error/unknown states;
- exercise retry/duplicate/idempotent requests;
- compare runtime DTOs with generated contract;
- inspect clean-install vs upgraded DB state;
- inspect all surfaces for stale vocabulary/state logic;
- search for manual mappings/wrappers that escaped migration;
- search for dead files/packages after consumer cutover.

Closure requires failure of the falsification attempt to find a material contradiction.

## 6. Structural negative-space gate

Before root closure prove, where applicable:

```text
OLD_WRITERS=0
OLD_READERS=0
OLD_IMPORTS=0
OLD_REEXPORTS=0
OLD_ROUTES=0
OLD_CONFIG_REFS=0
OLD_RUNTIME_REACHABILITY=0
UNMIGRATED_CONSUMERS=0
UNEXPECTED_GENERATED_DIFF=0
UNBOUNDED_COMPATIBILITY=0
THIRD_AUTHORITY=0
EXPECTED_DELETIONS_MISSING=0
UNDISPOSITIONED_MATERIAL_ARTIFACTS=0
```

A functional pass with structural residue is not closure.

## 7. Root checkpoint and exact SHA

After targeted verification and falsification:

1. confirm remote `g` still equals the pinned parent;
2. create one coherent root commit;
3. push directly to `g`;
4. fetch/verify remote HEAD equals the pushed commit;
5. re-pin exact SHA;
6. ingest evidence;
7. invalidate stale claims affected by the change;
8. rerun only `FAILED ∪ INVALIDATED_BY_FIX ∪ NEWLY_REQUIRED` evidence;
9. rebuild/re-rank root graph.

If remote HEAD moves unexpectedly, the checkpoint is invalid until concurrency reconciliation is complete.

## 8. Queue exhaustion is not closure

When the root queue first becomes empty, do not declare success.

Run a fresh broad adversarial audit on the then-current exact `g` SHA covering:

- product/system behavior;
- data/schema/migrations/clean-install;
- contracts/generated bindings;
- runtime/config/topology;
- auth/security/privacy;
- concurrency/recovery/idempotency;
- five-surface journeys/UX/A11y/RTL;
- filesystem ownership;
- semantic duplicates;
- parallel/shadow truth;
- dead/stale/obsolete/legacy/temp residue;
- compatibility residue;
- unused dependencies/exports/routes/config;
- tests/fixtures/mocks tied to superseded behavior.

Any material finding reopens the graph.

## 9. Repository-wide canonical cleanliness sweep

Before final qualification run an explicit repository-wide sweep:

`semantic duplicate scan → writer uniqueness → owner uniqueness → contract authority → schema/data authority → generated/manual repair → state-machine/policy/default/mapping duplication → filesystem responsibility → dead/unreachable → legacy/history/archive/backup/copy/temp → compatibility residue → unused dependency/export/config/route → test/fixture/mock residue → reachable old authority`.

Every material hit must have a disposition.

## 10. Exact final candidate qualification

Pin one immutable `g` SHA and qualify all required dimensions against **that same SHA**.

Required final state:

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
MATERIAL_FILESYSTEM_NOISE=0
CLEANUP_OBLIGATIONS=0
MATERIAL_REGRESSIONS=0
FRESH_ADVERSARIAL_REAUDIT=PASS
```

If any field is unknown, final qualification fails.

## 11. Final output for `g`

Only when exact final candidate passes:

```text
G_LEVEL4_CANDIDATE_READY
EXACT_G_SHA=<immutable sha>
LEVEL_4_EVIDENCE_STATE=PASS
CANONICAL_UNIQUENESS_STATE=PASS
STRUCTURAL_CLOSURE_STATE=PASS
ZERO_RESIDUE_STATE=PASS
REPOSITORY_NOISE_BUDGET=ZERO_KNOWN_MATERIAL_NOISE
KNOWN_REMAINING_ROOTS=0
```

Do not emit this from a merge-context SHA if the candidate branch SHA differs.

## 12. `g → master` boundary

Merging `g` to `master` is outside the active cleanup/restructure loop.

After `G_LEVEL4_CANDIDATE_READY`:

1. integrate `g → master` through the repository's current master policy;
2. pin the resulting exact master SHA;
3. identify evidence invalidated by merge identity/delta;
4. requalify affected repository/runtime/journey/security/structural dimensions;
5. run fresh regression/negative-space checks;
6. only then decide whether master is the canonical final baseline.

Pre-merge evidence from `g` does not automatically prove a different master commit.
