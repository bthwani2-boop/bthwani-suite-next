# 05 — REVERIFY, EXACT-HEAD CI, REDIAGNOSE, AND REPEAT

## Purpose

After each coherent Closure Unit, verify exact results, push safely, obtain trusted Exact-HEAD CI evidence, rebuild branch-wide truth, and select the next root only from the refreshed model.

## Pre-push verification

Before commit/push:

```text
TARGETED_VERIFY=PASS
MIGRATION_BACKFILL_READBACK=PASS_OR_NA
CONTRACT_GENERATED_PARITY=PASS_OR_NA
ARTIFACT_DISPOSITIONS_REALIZED=PASS
DIRECTORY_PACKAGE_VERDICTS_REALIZED=PASS
WINNER_LOSER_ELIMINATION=PASS_OR_NA
FILE_LEVEL_FINISHING=PASS
EXPECTED_DELETIONS=PASS
OLD_REFERENCE_SEARCH=PASS
NEGATIVE_SPACE=PASS
INDEPENDENT_FALSIFICATION=PASS
NO_UNRELATED_ACCIDENTAL_DIFF=PASS
```

Immediately before push require:

`EXPECTED_REMOTE_G_SHA == ACTUAL_REMOTE_G_SHA`.

If false:

`FETCH → COMPARE → IDENTIFY OVERLAP → INVALIDATE AFFECTED EVIDENCE → RE-PIN → RE-DIAGNOSE → REAPPLY ONLY IF STILL VALID`.

No force push.

## Commit / push / exact-head evidence

`COMMIT ONE COHERENT CLOSURE UNIT → PUSH g → FETCH → VERIFY REMOTE HEAD → PIN EXACT PUSHED SHA`.

Then obtain trusted Exact-HEAD CI evidence for that pushed SHA. The trusted workflow definition remains outside the candidate where required by repository trust policy.

```text
CI_ROLE=EVIDENCE_ONLY
CI_FAILURE_AS_AUTOMATIC_ROOT=NO
STALE_SHA_CI_EVIDENCE=INVALID
```

Normal material closure may use affected routing. Escalate to full-scope verification when topology, major package boundaries, canonical ownership, shared/core/service boundaries, schema/migrations, contracts/generated, runtime/config, dependency direction, CI control plane, security boundary, infra topology, or cross-surface contract changes materially.

## Evidence ingestion

For every material CI/test/scanner/runtime result:

`INGEST → VERIFY ACTUAL HEAD SHA/BASE/WORKFLOW PROVENANCE → DEDUPLICATE → CORRELATE TO CURRENT g/CANONICAL g/DELTA → IDENTIFY CAUSAL PARENT → UPDATE EVIDENCE VALIDITY`.

`CI FAILURE != EXECUTION ROOT`.

## Mandatory branch-wide refresh

After every root and before every next material mutation:

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
→ RE-SYNTHESIZE/RANK ROOT GRAPH
```

Any newly introduced or exposed artifact begins `UNJUSTIFIED_UNTIL_PROVEN`.

No next root may execute while:

```text
UNREVIEWED_TRACKED_ARTIFACTS>0
UNDISPOSITIONED_MATERIAL_ARTIFACTS>0
UNRESOLVED_DIRECTORY_PACKAGE_VERDICTS>0
UNRESOLVED_SEMANTIC_AUTHORITIES>0
```

## Re-baseline triggers

Immediately broaden invalidation if a closure changes top-level topology, package boundaries, canonical owner/writer, `core/shared/service` ownership, data/schema authority, contract/generated authority, runtime/config composition, dependency direction, tooling/workflow authority, or exposes a higher structural root.

## Next-root law

Do not return to Orchestrator AUTO/NEXT or historical order.

The next root comes only from:

`REFRESHED CURRENT g → REFRESHED CANONICAL g → REFRESHED STRUCTURAL DELTA → REFRESHED DYNAMIC ROOT GRAPH`.

If new evidence proves a higher root that invalidates descendant treatment:

`STOP DESCENDANT WORK → PROMOTE HIGHER ROOT → REBUILD TARGET/AFFECTED CONE → EXECUTE ONLY AFTER GATES PASS`.

## Repeat condition

While at least one proven executable root remains:

`SELECT HIGHEST ROOT → RECONSTRUCT → MIGRATE/CUTOVER → DELETE LOSERS/GARBAGE → FINISH FILES/DIRECTORIES → VERIFY → PUSH → EXACT-HEAD CI → RE-CENSUS → RE-RANK`.

When the root graph first becomes empty, do not declare completion. Transition to `06`.
