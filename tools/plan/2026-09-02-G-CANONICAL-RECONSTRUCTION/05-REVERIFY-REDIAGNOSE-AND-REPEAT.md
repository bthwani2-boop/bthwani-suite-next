# 05 — REVERIFY, EXACT-HEAD CI, REDIAGNOSE, AND REPEAT

## Purpose

After each coherent Closure Unit or fast-garbage checkpoint, verify exact results, push safely, obtain trusted Exact-HEAD CI evidence when material, refresh branch-wide truth including end-to-end parity, and select the next structural root only from the refreshed model.

## Fast-garbage checkpoint flow

For `DELETE_NOW` batches discovered during census or execution:

```text
PROVE LOW-RISK GARBAGE
→ DELETE NOW
→ SEARCH REFERENCES AGAIN
→ RUN AFFECTED VERIFICATION
→ CONFIRM NO PRODUCT/DATA/CONTRACT/RUNTIME/END-TO-END AUTHORITY CHANGED
→ COMMIT COHERENT FAST-CLEANUP BATCH
→ PUSH g
→ VERIFY REMOTE SHA
→ RE-PIN
→ REFRESH AFFECTED CENSUS/LEDGER/CAPABILITY MAP WHEN RELEVANT
```

Do not require full Root Graph selection for this lane. Do not force one commit per line/file; batch coherent nearby garbage. If deletion changes or exposes material semantic authority, ownership, contract/data/runtime behavior, required consumer behavior, or a vertical parity gap, stop the fast lane and return to the complete structural baseline.

## Structural-root pre-push verification

Before commit/push:

```text
TARGETED_VERIFY=PASS
MIGRATION_BACKFILL_READBACK=PASS_OR_NA
CONTRACT_GENERATED_PARITY=PASS_OR_NA
END_TO_END_PARITY=PASS_OR_NA
ARTIFACT_DISPOSITIONS_REALIZED=PASS
DIRECTORY_PACKAGE_VERDICTS_REALIZED=PASS
WINNER_LOSER_ELIMINATION=PASS_OR_NA
FILE_LEVEL_FINISHING=PASS
SCREEN_FLOW_FINISHING=PASS_OR_NA
EXPECTED_DELETIONS=PASS
OLD_REFERENCE_SEARCH=PASS
NEGATIVE_SPACE=PASS
INDEPENDENT_FALSIFICATION=PASS
NO_UNRELATED_ACCIDENTAL_DIFF=PASS
```

Immediately before every push require:

`EXPECTED_REMOTE_G_SHA == ACTUAL_REMOTE_G_SHA`.

If false:

`FETCH → COMPARE → IDENTIFY OVERLAP → INVALIDATE AFFECTED EVIDENCE → RE-PIN → RE-DIAGNOSE → REAPPLY ONLY IF STILL VALID`.

No force push.

## Commit / push / exact-head evidence

For structural roots:

`COMMIT ONE COHERENT CLOSURE UNIT → PUSH g → FETCH → VERIFY REMOTE HEAD → PIN EXACT PUSHED SHA → OBTAIN TRUSTED EXACT-HEAD CI`.

For fast-garbage-only checkpoints, run the minimum affected verification plus trusted Exact-HEAD CI when the repository routing considers the change material or when deletion touches build/runtime/tooling/dependency/API/generated/frontend routing graphs. CI remains evidence only.

```text
CI_ROLE=EVIDENCE_ONLY
CI_FAILURE_AS_AUTOMATIC_ROOT=NO
STALE_SHA_CI_EVIDENCE=INVALID
```

Escalate structural closures to full-scope verification when topology, package boundaries, canonical ownership, shared/core/service boundaries, schema/migrations, APIs/events/contracts/generated, frontend data/bindings/screens, runtime/config, dependency direction, CI control plane, security boundary, infra topology, or cross-surface contracts change materially.

## Evidence ingestion

For every material CI/test/scanner/runtime/UI result:

`INGEST → VERIFY ACTUAL HEAD SHA/BASE/WORKFLOW PROVENANCE → DEDUPLICATE → CORRELATE TO CURRENT g/CANONICAL g/DELTA/E2E MATRIX → IDENTIFY CAUSAL PARENT → UPDATE EVIDENCE VALIDITY`.

`CI FAILURE != EXECUTION ROOT`.

## Mandatory branch-wide refresh after structural roots

After every structural root and before every next structural mutation:

```text
RE-PIN
→ FULL TRACKED-TREE RE-CENSUS
→ REFRESH ARTIFACT DISPOSITION LEDGER
→ REFRESH SEMANTIC AUTHORITY REGISTRY
→ REFRESH DIRECTORY/PACKAGE VERDICTS
→ REFRESH CURRENT g
→ RECHECK CANONICAL g
→ REFRESH WINNER/LOSER MAP
→ REFRESH STRUCTURAL DELTA
→ REFRESH COMPLETE END-TO-END CAPABILITY/JOURNEY MATRIX
→ RECLASSIFY ALL PARITY GAPS INTO STRUCTURAL DELTA
→ RE-SYNTHESIZE/RANK ROOT GRAPH
```

After a proven fast-garbage-only checkpoint, refresh the affected inventory and any dependency/reachability/capability surfaces that could have changed; a full rebuild is required if deletion exposes material structural, semantic, or vertical-parity changes.

Any newly introduced or newly exposed artifact begins `UNJUSTIFIED_UNTIL_PROVEN`.

No next structural root may execute while:

```text
UNREVIEWED_TRACKED_ARTIFACTS>0
UNDISPOSITIONED_MATERIAL_ARTIFACTS>0
UNRESOLVED_DIRECTORY_PACKAGE_VERDICTS>0
UNRESOLVED_SEMANTIC_AUTHORITIES>0
UNMAPPED_MATERIAL_CAPABILITIES>0
UNRESOLVED_E2E_PARITY_GAPS>0
```

## Next-root law

Do not return to Orchestrator AUTO/NEXT or historical order.

The next structural root comes only from:

`REFRESHED CURRENT g → REFRESHED CANONICAL g → REFRESHED STRUCTURAL DELTA + E2E PARITY MATRIX → REFRESHED DYNAMIC ROOT GRAPH`.

If new evidence proves a higher root that invalidates descendant treatment:

`STOP DESCENDANT WORK → PROMOTE HIGHER ROOT → REBUILD TARGET/AFFECTED CONE/VERTICAL SLICE → EXECUTE ONLY AFTER GATES PASS`.

## Repeat condition

While at least one proven executable structural root remains:

`SELECT HIGHEST ROOT → RECONSTRUCT → MIGRATE/CUTOVER → RESTORE E2E PARITY → DELETE LOSERS/GARBAGE → FINISH FILES/DIRECTORIES/SCREENS → VERIFY → PUSH → EXACT-HEAD CI → RE-CENSUS → RE-RANK`.

During all phases, proven low-risk unused/unneeded artifacts may continue through the fast deletion lane.

When the root graph first becomes empty, do not declare completion. Transition to `06`.
