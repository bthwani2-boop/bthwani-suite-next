# 05 — REVERIFY, REDIAGNOSE AND REPEAT

## Purpose

Prevent the campaign from becoming a one-pass rewrite or a mechanical march through old findings.

After each coherent Closure Unit, update live truth and select the next unit from the **new** structure.

## Campaign sequencing authority

This plan continues to own the `g` campaign sequence after every Closure Unit. The live orchestrator remains applicable only as the cross-cutting source of root-correctness, affected-cone, exact-HEAD, evidence, migration/cutover, verification, and closure invariants.

Do not hand sequencing back to generic `AUTO/NEXT` or a historical queue after a commit. The next root must be derived from the refreshed:

`CURRENT_G_MODEL → CANONICAL_G_TARGET → STRUCTURAL_DELTA → DYNAMIC_ROOT_GRAPH`.

## Step 8 — verify and checkpoint the completed root

Before commit:

- run targeted tests/checks for invalidated claims;
- prove migration/backfill/readback where material;
- prove contract/generated parity;
- review canonical naming/path/topology for the affected cone;
- confirm expected deletions and old-path removals;
- run reference and negative-space searches;
- perform structural ownership review;
- independently attempt to falsify closure;
- confirm no unrelated accidental diff.

Immediately before push require:

`EXPECTED_REMOTE_G_SHA == ACTUAL_REMOTE_G_SHA`.

Then:

`COMMIT ONE COHERENT CLOSURE UNIT → PUSH DIRECTLY TO g → FETCH → VERIFY REMOTE HEAD == PUSHED SHA → RE-PIN`.

No force push.

## Step 9 — refresh structural truth

After every closure, do not simply pick the next historical finding.

Refresh all affected portions of:

```text
CURRENT_G_MODEL
CANONICAL_G_TARGET
CURRENT_TO_CANONICAL_STRUCTURAL_DELTA
DYNAMIC_ROOT_GRAPH
EVIDENCE_VALIDITY
```

At minimum:

`RE-PIN → INGEST NEW EVIDENCE → UPDATE CURRENT MODEL → INVALIDATE TARGET ASSUMPTIONS AFFECTED BY CHANGE → RECHECK CANONICAL TARGET → UPDATE STRUCTURAL DELTA → RE-SYNTHESIZE CAUSAL ROOTS → RE-RANK`.

## Re-baseline triggers

Perform a broader partial/full re-census when a closure changes or discovers any material:

- top-level/major package topology;
- canonical owner or major responsibility boundary;
- shared/core/service ownership;
- major data/schema authority;
- contract/generated authority;
- runtime/config composition;
- dependency direction/cycles;
- script/workflow/tooling authority;
- a higher structural root capable of invalidating current ranking.

If the object of comparison materially changed, stale Current/Canonical/Delta evidence cannot be reused unchanged.

## Root preemption law

If re-diagnosis proves a higher root that invalidates descendant treatment:

`STOP DESCENDANT QUEUE → PROMOTE HIGHER ROOT → REDEFINE CANONICAL TARGET/AFFECTED CONE → EXECUTE HIGHER ROOT`.

Do not keep fixing descendants because they were already listed.

## Historical probe law remains active

Old findings remain evidence only. After each closure they may become:

`PROMOTED LIVE ROOT | DESCENDANT OF HIGHER ROOT | SUPERSEDED | FALSE_POSITIVE | EVIDENCE_ONLY`.

They never become a static queue.

## Repeat condition

If the dynamic Root Graph still contains a proven executable root:

`RETURN TO 03 → SELECT HIGHEST PROVEN CAUSAL ROOT → EXECUTE 03/04 → VERIFY → RETURN HERE`.

Continue until the **dynamic** Root Graph first reaches zero.

## Queue zero is not completion

The first time the dynamic graph appears empty, do not emit completion.

Transition to `06-FINAL-ADVERSARIAL-QUALIFICATION.md` for a fresh branch-wide re-census and exact fixed-point proof.
