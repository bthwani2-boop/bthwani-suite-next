# SINGLE-SESSION DIRECT-`g` EXECUTION PROTOCOL

## 0. Execution identity

```text
REPOSITORY=bthwani2-boop/bthwani-suite-next
TARGET_BRANCH=g
BRANCH_SCOPE=ENTIRE_CONTENT_OF_G_ONLY
OTHER_BRANCHES_SCOPE=OUT_OF_SCOPE
BRANCH_ROLE=ISOLATED_BRANCH_WIDE_RADICAL_CLEANUP_AND_DEEP_RESTRUCTURE
EXECUTION_MODE=SINGLE_SESSION_DIRECT_ON_TARGET
ACTIVE_MUTATION_SESSIONS=1
COMPLETION_LEVEL=LEVEL_4
PREDECLARED_FILE_SCOPE=NONE
PR_ALLOWED=NO
MERGE_ALLOWED=NO
PERIODIC_REBASE_OR_AUTOSYNC=NO
```

The campaign covers **everything that exists on branch `g`**. It does not authorize auditing, mutating, synchronizing, or restructuring `master`, `ocr`, or any other branch.

The single execution session is coordinator, root selector, mutation authority, migration/cutover authority, cleanup/deletion authority, commit/push authority, and exact-HEAD qualifier.

Read-only sub-agents/tools may run in parallel for discovery, inventory, review, falsification, evidence analysis, and negative-space search. They do not become mutation authorities.

## 1. Isolation law

Forbidden during this campaign:

- opening a PR from `g`;
- merging `g` into another branch;
- merging another branch into `g` unless a current proven root requires a narrow external intake;
- periodic rebase or auto-sync with `master`/`ocr`;
- treating mergeability with another branch as a design constraint;
- temporary mutation branches/worktrees;
- Session A/B/C execution partitioning;
- independent subsystem mutation lanes.

All material commits/pushes go directly to `g`.

## 2. Scope law — all of `g`, not selected files

There is no fixed file list and no predeclared subsystem boundary.

Every material artifact present on `g` may enter scope when evidence shows it is wrong, weak, duplicated, obsolete, stale, dead, misplaced, unreachable, superseded, noisy, or structurally non-canonical.

This includes:

`line → statement → symbol → function → type → component → file → directory → package → service/core/shared/app boundary → contract → generated binding → schema/data → migration/seed/bootstrap → runtime/config/env → script/tool/CLI → workflow/action → test/fixture/mock/snapshot → dependency/plugin → product journey`.

Current Root Graph entries are discovery seeds, not scope limits.

## 3. Start-of-session live pin

Before selecting or mutating a root:

1. fetch remote;
2. resolve exact `origin/g` SHA;
3. ensure execution baseline corresponds to that SHA or explicitly reconcile local delta;
4. load latest orchestrator `00` and routed `01–05` plus material focus modules;
5. load this plan package as subordinate context;
6. ingest visible external changes relevant to `g` only;
7. classify historical findings against live `g` source;
8. build one unified `g` Root Graph;
9. select highest proven executable root.

Do not copy OPEN/CLOSED/READY labels from an older SHA without revalidation.

## 4. Closure-objective declaration

Before material mutation record:

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
SCRIPT_WORKFLOW_TOOLING_IMPACT=
TEST_FIXTURE_MOCK_IMPACT=
DEPENDENCY_IMPACT=
MIGRATION_BACKFILL_RECONCILIATION=
CUTOVER=
OLD_AUTHORITY_TO_DELETE=
FILES_DIRS_PACKAGES_SCRIPTS_CONFIG_TESTS_DEPS_TO_REHOME_MERGE_SPLIT_DELETE=
NEGATIVE_SPACE_SEARCH=
TARGETED_VERIFICATION=
EVIDENCE_INVALIDATION=
REMOTE_HEAD_CONCURRENCY_RISK=
REOPEN_CONDITIONS=
```

This is a diagnosis checkpoint, not a human approval gate.

## 5. Local-vs-structural decision

Use local treatment only when canonical owner/writer is already correct, no parallel authority exists, affected cone is genuinely local, and the change does not preserve a defective model.

Escalate to structural reconstruction when repeated descendants share one cause, duplicate owners/writers exist, wrappers/mappers/adapters accumulate, old/new implementations coexist, contract/schema/runtime vocabulary diverges, compatibility dominates the structure, or package/folder boundaries duplicate responsibility.

Structural order:

`PROVE COMMON ROOT → DEFINE MINIMUM CANONICAL TARGET → RESTRUCTURE/REWRITE SOURCE → MIGRATE COMPLETE CONE → CUT OVER → DELETE DEFECTIVE STRUCTURE → DELETE RESIDUE → PROVE ZERO REACHABILITY`.

## 6. Full restructuring/deletion authority inside `g`

When required by a proven root, the session may:

- rewrite functions/types/modules/components;
- replace whole internal APIs;
- move/rename file families or directory trees;
- merge/delete directories/packages;
- split mixed-responsibility modules;
- change contracts and regenerate clients;
- change schema and migrate/backfill/reconcile data;
- replace runtime/config composition;
- consolidate/delete scripts, CLI helpers, workflows, actions, hooks, tooling, configs;
- remove obsolete tests/fixtures/mocks/snapshots/dependencies/plugins;
- delete entire superseded implementations after cutover;
- restructure product journey/state ownership across surfaces.

No minimal-diff requirement exists. The requirement is the smallest causally complete canonical solution.

## 7. Old artifact law

Every old/legacy/stale file, folder, script, workflow, config, package, test, fixture, mock, dependency, generated artifact, copy/backup/temp file, or compatibility shell on `g` must prove one of:

`CANONICAL_REQUIRED`
`DERIVED_REQUIRED`
`GENERATED_REQUIRED`
`CURRENT_RUNTIME_OR_TOOLING_CONSUMER`
`SUPPORTED_MIGRATION_WITH_REMOVAL_TRIGGER`
`REQUIRED_EVIDENCE`.

If none is proven:

`DELETE`.

Git history is the archive. `g` must not retain obsolete artifacts as an archive.

## 8. Canonical treatment order

1. canonical semantics/source;
2. canonical writer;
3. storage/schema/data migration;
4. canonical contract;
5. generated regeneration;
6. all readers;
7. all consumers;
8. runtime/config/tooling binding;
9. product journey/state;
10. cutover;
11. disable old writes;
12. prove zero old reads/imports/routes/config/script/workflow/runtime reachability;
13. delete superseded authority;
14. delete filesystem/tooling/config/test/dependency residue;
15. targeted verification;
16. independent negative-space falsification.

Do not add a new canonical layer while leaving the old authority reachable.

## 9. Exact-HEAD concurrency lock

Before every coherent commit/push:

```text
EXPECTED_REMOTE_G_SHA == ACTUAL_REMOTE_G_SHA
```

If equality fails:

`FETCH → COMPARE INTERVENING DELTA → IDENTIFY OVERLAP → INVALIDATE AFFECTED DIAGNOSIS/EVIDENCE → RE-PIN → RE-DIAGNOSE → SAFELY REAPPLY ONLY IF STILL VALID → RERUN INVALIDATED PROOF`.

Never force push.

## 10. Per-root verification checkpoint

Before commit:

- targeted tests/checks;
- migration/backfill/readback proof;
- generated parity where applicable;
- all expected deletions complete;
- reference/negative-space searches clean;
- no unrelated accidental diff;
- structural ownership review;
- independent falsification.

Then:

`COMMIT ONE COHERENT ROOT → PUSH DIRECTLY TO g → FETCH/VERIFY REMOTE HEAD → RE-PIN → INGEST EVIDENCE → INVALIDATE AFFECTED CLAIMS → RERUN FAILED/INVALIDATED/NEWLY_REQUIRED EVIDENCE → REBUILD/RE-RANK G ROOT GRAPH`.

## 11. Campaign end states

Valid end states:

### `CONTINUE`
Open executable roots remain.

### `BLOCKED_PROVEN_EXTERNAL`
A genuinely external dependency blocks a material root and no safe action on `g` can resolve it.

### `G_RADICAL_CLEANUP_COMPLETE`
All known material roots/gaps/unknowns/residue on the entire content of `g` are zero and exact-candidate qualification is complete.

After this state:

`FREEZE EXACT G SHA → DO NOT OPEN PR → DO NOT MERGE → KEEP g ISOLATED → STOP`.

Any future integration decision is a separate campaign.
