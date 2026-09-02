# Single-Session Direct-on-`ocr` Execution Model

## Decision

This campaign uses **exactly one material execution session** and writes **directly to branch `ocr`**.

```text
ONE EXECUTION SESSION
→ ONE LIVE ROOT GRAPH
→ ONE ACTIVE CLOSURE UNIT AT A TIME
→ DIRECT MUTATION ON ocr
→ TARGETED VERIFICATION
→ NEGATIVE-SPACE FALSIFICATION
→ COMMIT
→ PUSH
→ VERIFY REMOTE HEAD
→ RE-PIN
→ RE-DIAGNOSE / RE-RANK
→ NEXT HIGHEST PROVEN ROOT
```

Explicitly forbidden for this campaign:

- Session A / Session B / Session C partitioning;
- temporary execution branches;
- execution worktrees for parallel lanes;
- concurrent material mutation agents;
- cherry-pick/integration queues between execution sessions;
- subsystem ownership partitions that truncate a root's affected cone.

Read-only tools, searches, scanners and verification processes may be used from the same execution session. They do not become independent mutation authorities.

---

# 1. Execution identity

Every material mutation starts from this live identity:

```text
REPOSITORY: bthwani2-boop/bthwani-suite-next
TARGET_BRANCH: ocr
EXECUTION_MODE: SINGLE_SESSION_DIRECT_ON_TARGET
ACTIVE_MUTATION_SESSIONS: 1
COMPLETION_LEVEL: LEVEL_4
PINNED_REMOTE_OCR_SHA: <exact current remote SHA>
ACTIVE_WORKSET: <declared external work only; NONE if none>
```

The live `tools/prompting/bthwani-orchestrator/00-ORCHESTRATOR.md` and its routed live modules remain the canonical execution authority. This plan is evidence/context only.

Before the first mutation and after every push:

1. fetch `origin`;
2. resolve exact remote `ocr` SHA;
3. verify the local execution baseline matches that SHA before starting a new Closure Unit;
4. ingest any intervening delta;
5. invalidate stale assumptions/evidence;
6. re-diagnose and re-rank.

No force push and no destructive reset are part of this protocol.

---

# 2. One active causally complete Closure Unit

The single session owns repository-wide execution authority, but it still mutates **one highest-proven causally complete root at a time**.

Do not split a root merely because its affected cone crosses directories. For example:

```text
backend/domain
→ database/migration
→ API contract
→ generated client
→ shared/runtime adapter
→ app consumer
→ persisted readback
→ cleanup/deletion
```

may be one Closure Unit when all steps are causally required for the root to disappear.

Do not batch unrelated roots into one commit merely because one session can touch the whole repository.

---

# 3. Mandatory pre-mutation root record

Before editing, record and prove:

```text
ROOT_ID
SEVERITY
PINNED_REMOTE_OCR_SHA
ACTUAL_SOURCE_OF_DEFECT
ACTUAL_SOURCE_OF_FIX
CANONICAL_OWNER
CANONICAL_WRITER
AFFECTED_CONE
WRITER_INVENTORY
READER_CONSUMER_INVENTORY
DATA_INVENTORY
CONTRACT/GENERATED IMPACT
MIGRATION_BACKFILL_RECONCILIATION
CUTOVER
EXPECTED_DELETIONS
NEGATIVE_SPACE_SEARCH
TARGETED_VERIFICATION
EVIDENCE_INVALIDATION
REMOTE_HEAD_CONCURRENCY_RISK
FIXED_POINT_REOPEN_CONDITIONS
```

If the actual highest root is not proven, continue diagnosis; do not mutate a descendant symptom.

---

# 4. Root treatment order inside the same session

Use this order unless live evidence proves a stronger causal sequence:

```text
Canonical Source First
→ Canonical Writer(s)
→ Storage/Data Migration
→ Contract / Schema
→ Regenerate Derived Clients/Types
→ Readers / Consumers
→ Runtime Binding
→ Product Journey
→ Cutover
→ Disable Old Writes
→ Prove Zero Old Reads/Writes/Imports/Routes
→ Delete Superseded Authority
→ Structural/Naming Cleanup
→ Targeted Verification
→ Independent Negative-Space Falsification
```

There is no cross-session handoff. If a root requires backend, DB, contract, generated code, frontend and shared changes, the same session completes the full affected cone before declaring the root closed.

---

# 5. Exact-HEAD concurrency lock

Single-session execution removes internal write collisions, but it does **not** remove external branch movement risk.

Immediately before committing/pushing a Closure Unit:

```text
expected_remote_ocr_sha == actual_remote_ocr_sha
```

If true, continue.

If false:

```text
fetch
→ compare intervening remote delta
→ identify semantic/path overlap
→ invalidate affected diagnosis/evidence
→ re-pin to new origin/ocr
→ safely reapply/rebase only if the root remains valid
→ re-run targeted proof
```

Never push stale assumptions merely because Git can merge text. Never force-push over intervening remote work.

If external work overlaps the same canonical owner or affected cone, that external work becomes part of `ACTIVE_WORKSET` and must be reconciled before mutation resumes.

---

# 6. Per-root commit/push checkpoint

A coherent Closure Unit is not complete until all of the following occur:

1. targeted falsifying verification passes;
2. independent negative-space structural search finds no old authority/residue required by the root;
3. migrations/backfills/readback are proven where applicable;
4. generated boundaries are regenerated and unexpected diff is zero where applicable;
5. expected deletions are completed;
6. repository diff contains no unrelated accidental changes;
7. remote `ocr` still equals the pinned parent;
8. one coherent root commit is created;
9. commit is pushed directly to `ocr`;
10. remote `ocr` HEAD is fetched/verified to equal the pushed commit SHA;
11. exact SHA is re-pinned;
12. all evidence invalidated by the mutation is reclassified;
13. Root Graph is re-diagnosed/re-ranked before the next mutation.

A local green state without remote exact-SHA verification is not a completed checkpoint.

---

# 7. No subsystem execution lanes

The former three-lane split is abolished.

Do **not** reserve these as separate mutation authorities:

```text
Backend/Data lane
Contracts/Shared/Infra lane
Product/UX lane
```

They are dimensions of one affected cone, not session boundaries.

Examples:

- Serviceability root may require DSH policy/data → contract → generated client → Client/Partner/Field/Control Panel migration → Cart cleanup in one serial Closure Unit.
- Dispatch contract root may require runtime serializer/domain → OpenAPI → regeneration → all surface consumers → deletion of manual repair DTOs in one serial Closure Unit.
- WLT root may require DB/ledger/provider semantics → contract → DSH references → control-panel/client readback → cleanup in one serial Closure Unit.

The session follows causality, not folder ownership.

---

# 8. Falsification remains mandatory despite one session

A single executor must still challenge its own fix using a method different from the implementation path.

Examples:

- code fix → structural grep/semantic duplicate search;
- migration fix → fresh install + supported upgrade + persisted readback;
- contract fix → regeneration + serializer/router parity + negative search for manual repairs;
- UI fix → rendered/device/browser negative states + accessibility/RTL checks;
- ownership fix → repository-wide writer/reader inventory after deletion.

The absence of a second execution session is not permission to skip independent falsification.

---

# 9. Root completion record

Before moving to the next root, the same session records:

```text
Pinned parent SHA
Final root commit SHA
Remote ocr verification SHA
Actual Source-of-Defect
Actual Source-of-Fix
Canonical owner/writer
Files changed
Migrations/backfills/reconciliation
Consumers migrated
Files/paths/contracts/routes/writers/readers deleted
Negative-space searches performed
Targeted verification performed
Evidence invalidated/reused with provenance
Known remaining root children
Newly discovered roots
```

`Known remaining root children` may be nonzero only if they are genuinely independent descendants no longer required for the just-closed root. They return to the live queue and are re-ranked; they are not deferred as cleanup debt.

---

# 10. Stop / preemption conditions

Immediately stop descendant mutation and re-diagnose if evidence proves:

- a higher canonical owner than assumed;
- another active writer changes the migration design;
- contract/runtime mismatch invalidates consumer work;
- an unmodeled data migration/backfill requirement;
- remote `ocr` moved;
- a supposedly removed authority is still reachable;
- a required value would be lost by deletion/cutover;
- a green test contradicts persisted/runtime/product truth.

Because the same session owns the whole repository affected cone, an internal “handoff required” is not an acceptable final state. Only genuinely external dependencies outside repository authority may be reported as blockers, with exact evidence.

---

# 11. Final fixed-point boundary

The session remains on `ocr` throughout root-correct closure and exact-candidate qualification.

It does not switch mutation work to `master` while material roots remain open.

The `ocr` campaign may emit:

```text
MERGE_READY
EXACT_OCR_SHA=<immutable SHA>
LEVEL_4_EVIDENCE_STATE=PASS
ZERO_RESIDUE_STATE=PASS
KNOWN_REMAINING_ROOTS=0
```

only after the fresh independent adversarial repository re-audit on that exact SHA finds no material Root/Gap/Unknown/Unmigrated Consumer/Reachable Old Authority/Parallel Truth/Cleanup residue/regression.

Any subsequent `ocr → master` integration is a separate post-qualification boundary under `04-VERIFICATION-MERGE-FIXED-POINT.md`; the resulting exact `master` SHA must be requalified according to evidence invalidation rules.
