# 05 — REVERIFY, REDIAGNOSE AND REPEAT

## Purpose

After each coherent Closure Unit, verify the result, refresh affected truth, continue discovery, and choose the next highest proven executable root.

Do not turn historical findings into a static queue and do not require a complete repository-wide model before every next root.

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

A full branch-wide Current/Canonical/Delta/Root Graph rebuild is **not mandatory after every root**.

Broaden the re-census when a closure or new evidence changes a material top-level topology, canonical owner, major data/schema authority, contract/generated authority, runtime/config composition, dependency direction, tooling authority, or reveals a higher root capable of invalidating current treatment.

## Next-root rule

The next root may execute when it passes the `ROOT-CORRECT EXECUTION GATE` from `00`:

```text
PINNED
CANONICAL_OWNER_CONFIRMED
CAUSAL_ROOT_PROVEN
COMPLETE_AFFECTED_CONE_MAPPED
FINAL_STATE_CONFIRMED
MIGRATION_CUTOVER_CLEANUP_DEFINED
VERIFICATION_DEFINED
```

Unrelated uncensused repository areas do not block that root unless they can materially change its owner, Source-of-Fix, affected cone, cutover direction, or causal rank.

## Root preemption law

If re-diagnosis proves a higher root that invalidates descendant treatment:

`STOP DESCENDANT QUEUE → PROMOTE HIGHER ROOT → REDEFINE CANONICAL TARGET/AFFECTED CONE → EXECUTE HIGHER ROOT WHEN GATE PASSES`.

## Historical probe law

Old findings remain evidence only. They may become:

`PROMOTED LIVE ROOT | DESCENDANT OF HIGHER ROOT | SUPERSEDED | FALSE_POSITIVE | EVIDENCE_ONLY`.

They never become a static queue.

## Repeat condition

If at least one proven executable root exists, return to `03`, close the highest currently proven causal root, verify, and return here.

Continue branch-wide census/discovery throughout the campaign so newly exposed roots can be promoted as evidence becomes sufficient.

## Final transition

When no proven executable root remains, do **not** declare completion from queue state alone.

Transition to `06-FINAL-ADVERSARIAL-QUALIFICATION.md` for the fresh complete branch-wide re-census and exact fixed-point proof. Any material finding from that final qualification reopens execution at `03`.
