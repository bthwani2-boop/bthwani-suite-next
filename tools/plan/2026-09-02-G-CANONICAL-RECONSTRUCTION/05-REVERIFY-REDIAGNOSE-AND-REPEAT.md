# 05 — REVERIFY, REDIAGNOSE AND REPEAT

## Purpose

After each coherent Closure Unit, verify the result, rebuild the complete branch-wide truth model, continue discovery, and choose the next highest proven executable root.

Do not turn historical findings into a static queue; every next root requires a complete repository-wide model before selection or mutation.

## Verify and checkpoint the completed root

Before closure/commit:

- run targeted tests/checks for invalidated claims;
- prove migration/backfill/readback where material;
- prove contract/generated parity where material;
- confirm canonical owner/writer/name/path/topology in the affected cone;
- confirm required deletions and old-path removals;
- run reference and negative-space searches;
- independently attempt to falsify closure;
- confirm no unrelated accidental diff.

Immediately before push require:

`EXPECTED_REMOTE_G_SHA == ACTUAL_REMOTE_G_SHA`.

Then:

`COMMIT COHERENT CLOSURE UNIT → PUSH DIRECTLY TO g → FETCH → VERIFY REMOTE HEAD → RE-PIN`.

No force push.

## Refresh only what changed or can invalidate the next decision

After every closure:

```text
RE-PIN
→ INGEST NEW EVIDENCE
→ REFRESH AFFECTED CURRENT STATE
→ REFRESH AFFECTED CANONICAL TARGET
→ REFRESH AFFECTED STRUCTURAL DELTA
→ CONTINUE BRANCH-WIDE DISCOVERY
→ RE-DIAGNOSE ROOT CANDIDATES
```

A full branch-wide Current/Canonical/Delta/Root Graph rebuild is mandatory after every root and before any next material mutation. No stale or affected-cone-only model may authorize the next root.

The complete re-census is always required. Broaden and invalidate it immediately when a closure or new evidence changes material topology, canonical owner, data/schema authority, contract/generated authority, runtime/config composition, dependency direction, tooling authority, or reveals a higher root capable of invalidating current treatment.

## Next-root rule

The next root may execute only after `01`→`02`→complete true Root Graph synthesis/ranking refresh has passed, and it also passes the `ROOT-CORRECT EXECUTION GATE` from `00`:

```text
PINNED
PRE_MUTATION_RECONSTRUCTION_BASELINE=PASS
COMPLETE_BRANCH_WIDE_CENSUS=PASS
CURRENT_G_COMPLETE=PASS
CANONICAL_G_COMPLETE=PASS
STRUCTURAL_DELTA_COMPLETE=PASS
TRUE_ROOT_GRAPH_SYNTHESIZED_AND_RANKED=PASS
CANONICAL_OWNER_CONFIRMED
CAUSAL_ROOT_PROVEN
COMPLETE_AFFECTED_CONE_MAPPED
FINAL_STATE_CONFIRMED
MIGRATION_CUTOVER_CLEANUP_DEFINED
VERIFICATION_DEFINED
```

Any uncensused material repository area blocks that root. Only explicitly proven non-material or out-of-scope content may be excluded from the baseline.

## Root preemption law

If re-diagnosis proves a higher root that invalidates descendant treatment:

`STOP DESCENDANT QUEUE → PROMOTE HIGHER ROOT → REDEFINE CANONICAL TARGET/AFFECTED CONE → EXECUTE HIGHER ROOT WHEN GATE PASSES`.

## Historical probe law

Old findings remain evidence only. They may become:

`PROMOTED LIVE ROOT | DESCENDANT OF HIGHER ROOT | SUPERSEDED | FALSE_POSITIVE | EVIDENCE_ONLY`.

They never become a static queue.

## Repeat condition

If at least one proven executable root exists, return to `01`, rebuild the complete census/current/canonical/delta model, return to `03`, close the highest ranked causal root, verify, and return here.

Continue branch-wide census/discovery throughout the campaign; newly exposed roots must be inserted into a refreshed complete Root Graph and reranked before any mutation.

## Final transition

When no proven executable root remains, do **not** declare completion from queue state alone.

Transition to `06-FINAL-ADVERSARIAL-QUALIFICATION.md` for the fresh complete branch-wide re-census and exact fixed-point proof. Any material finding from that final qualification reopens execution at `03`.
