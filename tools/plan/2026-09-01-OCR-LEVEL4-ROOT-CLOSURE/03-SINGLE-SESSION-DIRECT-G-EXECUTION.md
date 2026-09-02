# SINGLE-SESSION DIRECT-`g` EXECUTION PROTOCOL

## 0. Execution identity

```text
REPOSITORY=bthwani2-boop/bthwani-suite-next
TARGET_BRANCH=g
BRANCH_ROLE=DEDICATED_RADICAL_CLEANUP_AND_DEEP_RESTRUCTURE
EXECUTION_MODE=SINGLE_SESSION_DIRECT_ON_TARGET
ACTIVE_MUTATION_SESSIONS=1
COMPLETION_LEVEL=LEVEL_4
```

The single execution session is simultaneously:

- coordinator;
- root selector;
- mutation authority;
- migration/cutover authority;
- cleanup/deletion authority;
- commit/push authority;
- exact-HEAD qualifier.

Read-only sub-agents/tools may run in parallel for discovery, inventory, review, falsification, evidence analysis, and negative-space search. They do not become independent mutation authorities.

## 1. No parallel mutation lanes

Forbidden during this campaign:

- Session A/B/C execution partitioning;
- temporary root branches;
- parallel mutation worktrees;
- independent subsystem ownership lanes;
- separate commits/pushes from sub-agents;
- cherry-pick queues between execution sessions;
- splitting one causal root because it crosses backend/data/contracts/apps/infra.

If one root crosses many repository areas, one session completes the whole cone.

## 2. Start-of-session live pin

Before selecting or mutating a root:

1. fetch remote;
2. resolve exact `origin/g` SHA;
3. ensure local baseline corresponds to that SHA or explicitly understand any local delta;
4. load latest live orchestrator `00` and routed `01–05` plus material focus modules;
5. load this plan package as subordinate context;
6. ingest visible external work;
7. classify historical roots against live source;
8. build one unified root graph;
9. select highest proven executable root.

Do not carry forward `CLOSED`, `OPEN`, or `READY` labels from a previous SHA without revalidation.

## 3. Closure-objective declaration

Before material mutation, record:

```text
ROOT_ID=
PINNED_REMOTE_G_SHA=
SEVERITY=
ACTUAL_SOURCE_OF_DEFECT=
LOCAL_OR_STRUCTURAL=
TARGET_CANONICAL_STRUCTURE=
ACTUAL_SOURCE_OF_FIX=
CANONICAL_OWNER=
CANONICAL_WRITER=
COMPLETE_AFFECTED_CONE=
WRITER_INVENTORY=
READER_CONSUMER_INVENTORY=
DATA_INVENTORY=
CONTRACT_GENERATED_IMPACT=
RUNTIME_CONFIG_IMPACT=
TEST_FIXTURE_MOCK_IMPACT=
DEPENDENCY_IMPACT=
MIGRATION_BACKFILL_RECONCILIATION=
CUTOVER=
OLD_AUTHORITY_TO_DELETE=
FILES_DIRS_PACKAGES_TO_REHOME_MERGE_SPLIT_DELETE=
NEGATIVE_SPACE_SEARCH=
TARGETED_VERIFICATION=
EVIDENCE_INVALIDATION=
REMOTE_HEAD_CONCURRENCY_RISK=
REOPEN_CONDITIONS=
```

This is a diagnosis checkpoint, not a human approval gate.

## 4. Local-vs-structural decision

Before changing code, determine whether the root is local or structural.

Use local refactor/fix only when:

- canonical owner/writer is already correct;
- no parallel authority exists;
- affected cone is genuinely local;
- fixing the implementation does not preserve a defective model.

Escalate to structural reconstruction when:

- repeated descendants share one cause;
- duplicate owners/writers exist;
- wrappers/mappers/adapters accumulate around the same meaning;
- old/new implementations coexist;
- contract/schema/runtime vocabulary diverges;
- compatibility dominates the shape;
- folder/package boundaries hide or duplicate responsibility;
- a smaller canonical target is easier to reason about and verify.

Structural execution order:

`PROVE COMMON ROOT → DEFINE MINIMUM CANONICAL TARGET → RESTRUCTURE/REWRITE SOURCE → MIGRATE COMPLETE CONE → CUT OVER → DELETE DEFECTIVE STRUCTURE → PROVE ZERO RESIDUE`.

## 5. Full restructuring authority on `g`

When required by the proven root, the session may:

- rewrite functions/types/modules/components;
- replace whole internal APIs;
- move/rename file families;
- merge or delete directories/packages;
- split mixed-responsibility modules;
- change contracts and regenerate clients;
- change schema and migrate/backfill data;
- replace runtime/config composition;
- remove obsolete tests/fixtures/mocks/dependencies;
- delete entire superseded implementations after cutover;
- restructure product journey/state ownership across surfaces.

There is no minimal-diff requirement. The requirement is the **smallest causally complete canonical solution**.

Do not rewrite healthy canonical code for style only.

## 6. Canonical treatment order

For every proven root, prefer this sequence:

1. canonical source/semantics;
2. canonical writer(s);
3. storage/schema/data migration;
4. canonical contract;
5. generated regeneration;
6. all readers;
7. all consumers;
8. runtime/config binding;
9. product journey/state;
10. cutover;
11. disable old writes;
12. prove zero old reads/imports/routes/config/runtime reachability;
13. delete superseded authority;
14. delete structural/filesystem residue;
15. targeted verification;
16. independent negative-space falsification.

Do not add a new canonical layer while leaving the old authority reachable.

## 7. One meaning / one writer

Every material concept must converge to:

`ONE MATERIAL MEANING → ONE CANONICAL OWNER → ONE CANONICAL MUTATION PATH → DERIVED READERS/PROJECTIONS ONLY`.

Projections/caches/read models may exist only if subordinate, reconstructable, and unable to redefine truth.

Explicitly reject:

`UNKNOWN == READY`, `MISSING == EMPTY`, `ERROR == EMPTY`, `UNAVAILABLE == ZERO`, `UNPROVEN == FALSE`, or fabricated successful state from missing data.

## 8. Data migration discipline

For schema/data roots:

- prove target schema/constraints;
- ensure clean-install/bootstrap yields target state;
- migrate existing data;
- reconcile and read back;
- handle partial failure/idempotency where material;
- cut over writers/readers;
- remove old mutable storage after zero consumers;
- verify no dual-write permanent state remains.

A schema change without clean-install + existing-data proof is incomplete.

## 9. Contract/generated discipline

Generated output is derived, never the source of fix.

If a frontend/runtime layer repairs generated DTOs manually:

`FIX AUTHORITATIVE SEMANTICS → FIX CANONICAL CONTRACT → REGENERATE → MIGRATE CONSUMERS → DELETE REPAIR LAYER`.

Direct generated edits are forbidden as final treatment.

## 10. Cleanup during execution

Cleanup happens inside the active closure unit, not in a later cleanup sprint.

After migration/cutover:

- delete old writer/reader paths;
- remove imports/exports/re-exports;
- delete stale routes/config/defaults;
- remove superseded files/directories/packages;
- remove obsolete tests/fixtures/mocks;
- remove unused dependencies/plugins/scripts;
- search old vocabulary/path names and semantic duplicates;
- verify no pass-through wrapper preserves the old authority.

If replacement/consolidation closes with `OLD_AUTHORITY_TO_DELETE=NONE`, perform a closure-suspicion re-audit.

## 11. Exact-HEAD concurrency lock

Before every coherent commit/push:

```text
EXPECTED_REMOTE_G_SHA == ACTUAL_REMOTE_G_SHA
```

If equality fails:

`FETCH → COMPARE INTERVENING DELTA → IDENTIFY OVERLAP → INVALIDATE AFFECTED DIAGNOSIS/EVIDENCE → RE-PIN → RE-DIAGNOSE → SAFELY REAPPLY/REBASE IF STILL VALID → RERUN INVALIDATED PROOF`.

Never force push.

## 12. Per-root verification checkpoint

Before commit:

- targeted tests/checks for changed semantics;
- migration/backfill/readback proof;
- generated parity/zero unexpected diff where applicable;
- all expected deletions complete;
- reference/negative-space search clean;
- no unrelated accidental diff;
- structural ownership review;
- independent falsification of closure claim.

Then:

`COMMIT ONE COHERENT ROOT → PUSH DIRECTLY TO g → FETCH/VERIFY REMOTE HEAD == PUSHED COMMIT → RE-PIN → INGEST EVIDENCE → INVALIDATE AFFECTED CLAIMS → RERUN FAILED/INVALIDATED/NEWLY_REQUIRED EVIDENCE → REBUILD/RE-RANK ROOT GRAPH`.

Do not run full expensive CI blindly after every tiny edit. Run evidence proportionate to what the root invalidated, then perform exact-candidate qualification at the required boundary.

## 13. Root preemption

If execution proves a higher upstream root than the one currently being treated:

`PAUSE DESCENDANT MUTATION → RECORD EVIDENCE → RE-RANK → TREAT HIGHER ROOT FIRST`.

Do not continue patching descendants after the upstream structural defect is known.

## 14. Session end states

Valid end states are only:

### `CONTINUE`
Open executable roots remain.

### `BLOCKED_PROVEN_EXTERNAL`
A genuinely external dependency beyond repository authority blocks a material root, with exact blocker evidence and no safe repository action available.

### `G_LEVEL4_CANDIDATE_READY`
All known material roots/gaps/unknowns/residue are zero and exact-candidate qualification is complete.

Internal inconvenience, large diff size, many consumers, or difficult restructuring are not valid blockers on `g`.
