# Live Execution, Reconstruction, Cutover, Cleanup and Finishing

## 1. Execution contract

Live mutation begins from the unified loop in `00` after `02` proves the selected treatment frontier executable and `05` has emitted the portable Closure Unit declaration when selection/decomposition was required.

There is no separate execution phase and no mandatory prepared plan artifact.

Execution always begins from current live truth, never from stale plan assumptions:

```text
RE-RESOLVE TARGET / PR / HEAD
-> RECONCILE ACTIVE_WORKSET + VISIBLE CONCURRENT DELTA
-> REVALIDATE ONLY MATERIAL ASSUMPTIONS
-> CONFIRM SELECTED CLOSURE UNIT / HIGHEST EXECUTABLE ROOT
-> TREAT ACTUAL SOURCE-OF-DEFECT
-> VERIFY NEAREST INVALIDATED CLAIMS
-> INGEST NEW EVIDENCE
-> RE-DIAGNOSE IN MEMORY
-> RE-RANK
-> CONTINUE
```

New evidence that invalidates root/target/authority/migration/cutover/collision semantics stops only the affected cone. Re-enter `02`/`05` in memory and continue when safely derivable. Do not force the human through a preparation cycle or mandatory plan rewrite.

An optional task-local plan may support the executor but never governs live truth or progress.

## 2. Root-correct treatment sequence

For each proven root inside the selected Closure Unit:

```text
DEFINE CANONICAL TARGET
-> ACTUAL SOURCE-OF-DEFECT
-> CANONICAL OWNER / WRITE PATH
-> ALL MATERIAL WRITERS / READERS / CONSUMERS
-> IMPLEMENT OWNER FIRST
-> ENFORCE INVARIANTS
-> UPDATE DOMAIN/BACKEND
-> UPDATE CONTRACTS/EVENTS/GENERATED CLIENTS
-> MIGRATE DATA/SCHEMA/BACKFILL
-> MIGRATE SHARED BINDINGS/CONTROLLERS
-> MIGRATE ALL SURFACES/ACTIONS
-> MIGRATE JOBS/PROVIDERS/INTEGRATIONS
-> ALIGN AUTH/SECURITY/AUDIT
-> ALIGN RUNTIME/CONFIG/OBSERVABILITY
-> PROVE FAILURE/IDEMPOTENCY/CONCURRENCY/RECOVERY
-> PROVE CANONICAL READBACK
-> CUT OVER ALL CALLERS
-> PROVE REQUIRED PRE-EXISTING CORRECT BEHAVIOR
-> PROVE ZERO USE OF OLD AUTHORITY
-> DELETE/RETIRE SUPERSEDED REACHABLE PATHS
-> REPAIR REFERENCES / TESTS / CONFIG / GENERATED CONSUMERS
-> STRUCTURAL FINISHING
-> RE-RUN INVALIDATED TOOLS/EVIDENCE
-> ADVERSARIALLY RE-DIAGNOSE
```

If a root requires code/runtime/data/contract/schema/config mutation and none occurred at its proven Source-of-Fix, the root remains open. Planning/docs/comments/green-check manipulation count as zero treatment progress.

## 3. Cosmetic-treatment rejection

```text
COSMETIC / PRESENTATIONAL / LOCAL SYMPTOM TREATMENT
DOES NOT COUNT AS ROOT-CAUSE PROGRESS
WHEN A PROVEN HIGHER SOURCE-OF-DEFECT EXISTS.
```

The following are zero root-closure progress **unless they are necessary parts of a proven Source-of-Fix/migration/cutover/cleanup**:

`renaming | extracting helper | adding condition | fallback | wrapper | adapter | suppression | test-only special case | moving code without re-ownership | comment/doc cleanup | local duplication reduction | merely greening a check`.

```text
VISIBLE IMPROVEMENT != ROOT CORRECTION
LOCAL CLEANLINESS != SYSTEM CLEANLINESS
GREEN CHECK != SOURCE-OF-DEFECT REMOVED
```

Apply the Treatment Adequacy Gate owned by `02` before accepting material writes as progress.

## 4. Real-fix contract

A root is treated only when evidence supports:

```text
actual cause removed from implementation/runtime/data
+ canonical implementation exists
+ canonical owner/write path enforced
+ affected writers/readers/consumers migrated
+ contracts/data/runtime aligned
+ required affected behavior preserved or intentionally migrated
+ no half cutover / unintended affected regression
+ obsolete/parallel implementation no longer authoritative/reachable
+ directly related structural cleanup complete
```

Smallest complete root-correct change is preferred. Smallest does not mean local. Complete does not mean rewrite everything.

## 5. Semantic restructuring

Derive structure from meaning:

`Product Capability -> Canonical Owner -> Responsibility -> Domain Boundary -> Public Contract -> Data Ownership -> Dependency Direction -> Runtime Boundary -> Surface Composition -> Directory -> File`.

A file move alone is not architecture cleanup.

Structural treatment may require:

`HARDEN | REFACTOR | MOVE | RENAME | MERGE | SPLIT | REWRITE | REGENERATE | DELETE`.

Preserve proven value, not accidental structure.

## 6. Directory and artifact completion

Inspect the necessary hierarchy:

`symbol -> function -> type/component -> file -> file family -> directory -> package/module -> service/surface -> domain`.

Every materially affected remaining artifact must satisfy the structural completion contract from `02`.

Mixed/unowned junk drawers, misleading ownership, pass-through layers, stale aliases and duplicated semantic authorities are findings, not style preferences.

### 6.1 Pass-through abstraction rule

A wrapper/adapter/helper/facade must own unique material value such as transformation, policy, protocol boundary, state, compatibility, security or orchestration.

If it merely forwards calls/state and creates no unique justified boundary, classify it for inline/merge/delete after consumer proof.

### 6.2 Generic-container rule

Names like `utils`, `shared`, `common`, `helpers`, `legacy`, `old`, `archive`, `temp`, `backup` are not forbidden by name. A generic container with unrelated responsibilities or no canonical owner is a structural finding requiring reownership/split/merge/delete as proven.

## 7. Canonical cutover

```text
inventory writers/readers/consumers
-> prove canonical owner
-> introduce/fix canonical implementation
-> migrate facts/data/state
-> switch writers
-> switch readers/consumers
-> establish canonical persisted readback
-> remove dual-write / fallback / obsolete compatibility
-> remove obsolete routes/storage/declarations/config/tests/docs references
-> prove zero authoritative/reachable old path
```

A new correct path beside an old reachable authority is not closure.

## 8. Compatibility/legacy/fallback law

Any reachable `legacy | compat | fallback | v1 | old | deprecated | temporary | migration bridge` path must have:

`Owner | Real Consumer | Reason | One Canonical Authority | Start Condition | Expiry/Cutover Condition | Observability | Removal Trigger`.

Without these, it is `DELETE_REQUIRED` once safe prerequisites are proven.

Convenience is not a compatibility requirement.

## 9. Generated outputs

Apply `02` Generated-Output Law:

`authoritative generator/schema/template/input -> fix -> regenerate -> verify consumers`.

Do not directly patch generated output to make a check green unless that output is proven authoritative by design.

## 10. Data/migration treatment

When persistence changes:

- use forward deterministic corrective migrations;
- do not rewrite applied migration history for cosmetic cleanliness;
- expand/backfill/switch/contract when real compatibility requires it;
- prove fresh install and supported upgrade where material;
- enforce invariants/constraints/indexes/FKs/checks as applicable;
- handle duplicates/orphans/drift;
- prove idempotency/restart/readback;
- cut over old writers/readers;
- remove obsolete authority after safe cutover.

## 11. Reference integrity

After `Delete/Rename/Move/Merge/Split/Refactor/Replace`, trace materially relevant:

`imports | exports | re-exports | callers/callees | registrations | routes/navigation | contracts/schemas | configs/env | dependencies | tests/mocks/fixtures | docs/examples | build/CI entries | scripts/manifests | generated references | runtime bindings`.

No stale alias/config/env/dependency/test may remain merely because compilation succeeds.

## 12. Dependency/config/script hygiene

Within the affected cone, inspect:

`unused package | duplicate package responsibility | obsolete version bridge | stale script | dead npm/pnpm command | orphan workspace declaration | unused env var | obsolete feature flag | unused Docker stage | dead workflow/config | stale generated binding`.

Material proven residue is treated in the same root closure.

## 13. Test integrity and cleanup

Correct sequence:

`determine correct semantics -> fix system -> update/add falsifiable regression evidence -> remove obsolete test residue -> verify real behavior`.

Forbidden: weakening/removing a valid test to fit wrong implementation, skip/disable/silence to obtain green, or test-only compatibility hacks as final state.

After semantic change, classify obsolete/duplicate tests, dead fixtures, stale mocks, snapshots and tests for deleted behavior. Valid failing test -> fix system, not test expectations.

## 14. Runtime/distributed correctness

Prove as applicable:

`candidate/process/schema/config freshness | idempotency | correlation | duplicate/replay | ordering | retry/backoff | timeout/unknown result | restart | compensation | reconciliation | provider authentication/signature | canonical persisted readback`.

For financial mutation, callers/UI never become parallel money authority.

## 15. Cleanup is treatment, not polish

Act on proven:

`dead | unreachable | stale | obsolete | superseded | duplicate | misplaced | unused | legacy | temporary | debug | workaround | fallback | parallel truth | unjustified compatibility | generated noise`.

```text
PROVEN DELETE_REQUIRED + PREREQUISITES SATISFIED
-> DELETE
-> REPAIR REFERENCES/CONFIG/TESTS/GENERATED CONSUMERS
-> PROVE ZERO REACHABILITY + ZERO REQUIRED VALUE LOSS
```

`NO-DELETE BIAS != SAFETY`.

Do not downgrade `DELETE_REQUIRED` to KEEP because deletion feels risky. New evidence may legitimately reclassify it; executor preference may not.

## 16. Repository Finishing Pass

Before the Final Candidate, execute this **within the proven affected cone**:

```text
ROOTS TREATED
-> FILE/FOLDER/PACKAGE OWNERSHIP
-> SEMANTIC + TEXTUAL DUPLICATION
-> DEAD/STALE/LEGACY/SUPERSEDED PATHS
-> WRAPPERS/INDIRECTION
-> NAMING/PLACEMENT
-> DEPENDENCY DIRECTION
-> CONFIG/ENV/FLAGS/SCRIPTS/DEPENDENCIES
-> TESTS/FIXTURES/MOCKS/SNAPSHOTS
-> GENERATED OUTPUTS
-> MISLEADING DOCS/COMMENTS/EXAMPLES
-> REFERENCE INTEGRITY
-> NEGATIVE SPACE
-> FINAL CANDIDATE
```

This is not a separate cleanup phase; it is a required closure property of each treated root.

## 17. Self-driving failure loop

Tool/runtime/check failures encountered during execution are ingested under `02`:

```text
FAILURE
-> PROVENANCE
-> CLASSIFY TOOL CONDITION / FINDING
-> CLUSTER WITH EXISTING ROOTS
-> if higher root emerges: preempt affected descendant work
-> if executable: treat actual owner
-> rerun invalidated evidence
-> continue
```

Do not ask the human what to do with a derivable deterministic failure. Human interaction is reserved for legitimate stop states owned by `00`.

## 18. Git/ref mutation safety

Before every material write batch and ref movement:

```text
re-resolve live target/PR HEAD
-> classify concurrent delta under 01
-> re-check ACTIVE_WORKSET collision assumptions when relevant
-> build on latest reconciled parent
-> preserve foreign work
-> no force push
```

For remote atomic Git writes, build one candidate commit from the latest exact parent/tree, re-resolve target immediately before ref movement and update only by non-force fast-forward. If the target moved, reconcile/rebuild/reverify; never overwrite.