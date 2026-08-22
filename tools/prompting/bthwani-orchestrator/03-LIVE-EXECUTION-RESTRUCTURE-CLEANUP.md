# Live Execution, Reconstruction, Cutover and Cleanup

## 1. Execution is live by default

In `PHASE=EXECUTE_CLOSE`, a proven executable root proceeds directly to treatment. No diagnosis package, planning package or repository task ledger is required first.

When `EXECUTE_CLOSE` is explicitly supplied with a prepared `PLAN_DIR`, that directory is read-only handoff/evidence input under `01`; it does not replace current-truth revalidation and is never a writable execution target.

### 1.1 Prepared-handoff consumption protocol

When a valid prepared handoff is supplied:

```text
READ 00-AUDIT-TRUTH.md
→ READ 01-EXECUTION-CONTRACT.md
→ READ 02-VERIFICATION-CLOSURE.md
→ RE-RESOLVE CURRENT TARGET HEAD
→ CLASSIFY DELTA UNDER 01
→ REVALIDATE MATERIAL ROOT / AUTHORITY / TARGET / INVARIANT / MIGRATION / CUTOVER ASSUMPTIONS
→ RESOLVE CURRENT EXECUTION FRONTIER
→ MUTATE THE ACTUAL TARGET SYSTEM
```

Still-valid resolved decisions constrain execution; they do not authorize blind execution against stale truth. Local equivalent implementation choices may proceed within the freedom/change cone recorded under `01`/`02`.

If execution discovers new material evidence that changes a proven root, Canonical Truth, authority/ownership, domain/data/security boundary, invariant, public semantic contract, migration/cutover strategy or material blast radius:

```text
STOP THE AFFECTED EXECUTION CONE
→ PRESERVE VALID WORK/EVIDENCE
→ CAPTURE THE INVALIDATING EVIDENCE
→ DO NOT PATCH AROUND THE CONFLICT
→ RE-ENTER DIAGNOSIS/HANDOFF PREPARATION UNDER 02
→ RESUME ONLY AFTER READINESS IS RE-ESTABLISHED
```

Do not silently edit `PLAN_DIR` during `EXECUTE_CLOSE`. A handoff correction is preparation work; it is not treatment of the target system.

### 1.2 Prepared-execution velocity protocol

A prepared `R0/R1` handoff exists specifically to front-load reasoning. Do not spend execution time repeatedly rediscovering what the valid handoff already proved.

At execution start:

```text
READ + INDEX THE THREE CONTRACTS ONCE
→ BUILD CURRENT IN-MEMORY ROOT / STEP / DEPENDENCY / WRITE-SET FRONTIER
→ REVALIDATE HEAD + ONLY MATERIAL HANDOFF ASSUMPTIONS
→ EXECUTE COHERENT ROOT-CORRECT MUTATION BATCHES
→ RUN NEAREST AFFECTED PROOF AT COHERENT BOUNDARIES
→ REUSE STILL-VALID AUDIT EVIDENCE
→ BROADEN / RE-DIAGNOSE ONLY ON AN INVALIDATION OR NEW HIGHER-ROOT SIGNAL
→ RUN HEAVY CLAIM-APPROPRIATE FINAL/CUTOVER GATES WHEN REQUIRED
```

Forbidden execution-time drag without material cause:

`re-reading the entire plan before every file | restarting repository-wide discovery after each edit | rerunning every audit tool after every small mutation | rebuilding a root already proven and still valid | updating plan/status files as progress | serializing independent read-only checks | tiny per-file checkpoints that break one coherent treatment into bookkeeping`.

Use the hierarchy in `01 §14.2` to keep the primary coordinator focused: delegate independent read-only inspection, long-running applicable tools, negative-space searches and verification to subagents when available; continuously consume returned evidence while safe mutation continues. Target writes remain under the coordinator's collision/ref authority.

For `R2`, additional local engineering reasoning is expected, but it must stay inside the settled change cone. For any class, new material evidence—not elapsed time or model uncertainty—is what triggers broad re-diagnosis.

## 2. Root-correct treatment sequence

For every proven root:

```text
DEFINE PROVEN TARGET TRUTH
→ IDENTIFY ACTUAL SOURCE OF DEFECT
→ IDENTIFY CANONICAL OWNER / WRITE PATH
→ INVENTORY ALL MATERIAL WRITERS/READERS/CONSUMERS
→ IMPLEMENT CANONICAL OWNER FIRST
→ ENFORCE INVARIANTS
→ UPDATE DOMAIN/BACKEND
→ UPDATE CONTRACTS/EVENTS/GENERATED CLIENTS
→ MIGRATE DATA/SCHEMA/BACKFILL WHEN REQUIRED
→ MIGRATE SHARED BINDINGS/CONTROLLERS
→ MIGRATE ALL SURFACES/ACTIONS
→ MIGRATE JOBS/PROVIDERS/INTEGRATIONS
→ ALIGN AUTH/SECURITY/AUDIT
→ ALIGN RUNTIME/CONFIG/OBSERVABILITY
→ PROVE FAILURE/IDEMPOTENCY/CONCURRENCY/RECOVERY
→ PROVE CANONICAL READBACK
→ CUT OVER ALL CALLERS
→ PROVE REQUIRED PRE-EXISTING BEHAVIOR REMAINS VALID ACROSS THE AFFECTED CONE
→ PROVE ZERO USE OF OLD AUTHORITY
→ DELETE/RETIRE SUPERSEDED REACHABLE PATHS
→ CLASSIFY + RESOLVE MATERIALLY RELATED CLEANUP/DELETION OBLIGATIONS EXPOSED BY EXECUTION
→ REPAIR REFERENCES/CONSUMERS
→ VERIFY AFFECTED + BLAST-RADIUS BEHAVIOR
→ CLASSIFY NEWLY PROVEN MATERIAL KNOWLEDGE FOR DURABLE PROJECT MEMORY
→ RECONCILE / ENRICH AFFECTED GOVERNANCE WHEN REQUIRED
→ ADVERSARIALLY RE-DIAGNOSE ROOT
```

If a root requires source/runtime/data/contract/schema/config mutation and none occurred at the proven Source-of-Fix, planning/documentation/governance/report/comment edits cannot close it and count as zero treatment progress for that root. The root remains `OPEN`.

## 3. Definition of a real fix

A root is treated only when evidence supports:

```text
problem removed from actual implementation/runtime/data
+ correct canonical implementation exists
+ canonical owner/write path is enforced
+ affected writers/readers/consumers migrated
+ affected surfaces use corrected truth
+ contracts/data/runtime aligned
+ required previously correct affected behavior still works or was intentionally migrated
+ no unintended affected regression or partial cutover remains
+ obsolete/parallel implementation no longer authoritative/reachable
+ runtime/readback proves intended behavior when required
+ directly related structural cleanup is complete
```

## 4. Smallest complete root-correct change

Prefer the least disruptive change that fully eliminates the root and reconciles the material blast radius.

Before creating a new concept prefer:

`REUSE → EXTEND → MERGE → MOVE_TO_OWNER → SPLIT → CREATE_NEW`.

If architecture/design/data model/schema/contract/ownership/state/permission/integration boundary/dependency direction is proven wrong, refactor/redesign/rebuild as much as necessary. Do not preserve a wrong structure merely to keep the diff small.

## 5. Content-preserving reconstruction

Classify materially affected artifacts only after evidence:

`KEEP | HARDEN | MOVE | RENAME | MERGE | SPLIT | REFACTOR | MIGRATE | REGENERATE | REWRITE | REPLACE | DELETE`.

When code/UI/UX/assets/data contain proven value in the wrong context:

```text
PRESERVE PROVEN VALUE
→ FIX CONTEXT / OWNERSHIP
→ REPLACE WRONG BUSINESS/STATE/API BINDING
→ MIGRATE CONSUMERS
→ VERIFY FUNCTIONAL + VISUAL/OPERATIONAL PARITY AS APPLICABLE
→ DELETE SUPERSEDED WRAPPER/PATH
```

Do not clean-room rebuild sound pnpm/Expo/EAS/Metro/Next/Go/Docker/CI/runtime foundations merely because they are old.

## 6. Semantic repository restructuring

Derive structure from meaning:

`Product Outcomes → Canonical Domain Owners → Capability Boundaries → Public Contracts → Data Ownership → Shared/Runtime Boundaries → Surface Composition → Directories/Files`.

A structural refactor is:

`SEMANTIC RE-OWNERSHIP + MOVE/RENAME + REWIRE + CLEANUP + VERIFY`.

Review affected elements by:

`Domain → Ownership → Responsibility → Placement → Naming → Context → Dependencies → Consumers`.

Wrong placement/ownership is architectural debt when it creates ambiguity, duplication, incorrect dependency direction or misleading authority even if imports compile.

## 7. Naming, context and discoverability

Review materially affected files, folders, symbols, types, components, modules, packages, routes, services, contracts, models, configs, env vars and tests.

The final structure should let a new engineer/agent identify without guesswork:

`canonical owner | implementation path | contract | model | config | command | runtime path | source of truth`.

Ambiguity created by stale names, aliases, duplicate commands or multiple plausible paths is a defect when it can lead future work to the wrong authority.

After rename/move, update references and remove obsolete aliases when not required.

## 8. Git is history; active tree is present truth

Do not keep superseded active copies merely as backup/history (`old`, `backup`, `final2`, `temp`, `legacy`, `deprecated`, `archive`) without a proven runtime/legal/migration requirement. Git history is the default archive.

## 9. Canonical cutover

```text
inventory writers/readers/consumers
→ prove canonical owner
→ introduce/fix canonical replacement
→ migrate proven facts/data/state
→ switch writers
→ switch readers/consumers
→ establish canonical persisted readback
→ remove dual-write / fallback / obsolete compatibility
→ remove obsolete routes/storage/declarations/config/tests/docs references
→ prove zero authoritative/reachable old path
→ runtime/readback proof
```

A new correct path beside an old reachable path is not closure.

## 10. Compatibility

Temporary compatibility is allowed only for a real mixed-version/rollout need and must have:

`one semantic authority | explicit scope | owner | consumer list | observability | negative/failure behavior | expiry/removal condition | cutover proof`.

Convenience is not a compatibility requirement.

## 11. Frontend/backend vertical execution

Do not ship as final state:

- UI control with no real backend effect;
- backend endpoint missing a required consumer;
- contract change without required generated/manual consumer reconciliation;
- mutation without persisted canonical readback/refresh;
- authorization enforced only in UI;
- direct raw transport mapping duplicating canonical business truth;
- divergent state/error/permission meaning across surfaces.

## 12. Governance synchronization

If treatment changes material actor, authority, responsibility, journey, state, transition, invariant, API/data ownership or operational responsibility:

`IMPLEMENT SYSTEM CHANGE → PROVE BEHAVIOR/RUNTIME → ANALYZE GOVERNANCE IMPACT → RECONCILE AFFECTED GOVERNANCE → CROSS-CHECK GOVERNANCE ↔ SYSTEM`.

Governance reconciliation is not limited to changed semantics. If treatment/diagnosis proves a durable material Project/System truth that was already true but is missing, incomplete or materially ambiguous in governance, classify it under the progressive-clarification law and enrich its canonical governance home when the omission can mislead future work.

Do not edit governance to describe an unfixed ideal and do not leave materially affected governance stale or materially incomplete after proven truth is available. Every governance mutation must also pass the fail-closed governance-write gate owned by `focus/governance-product-design.md`.

## 13. Data and migration treatment

When persistence changes:

- use forward deterministic corrective migrations;
- do not rewrite applied migration history merely to make history look clean;
- use expand/backfill/switch/contract when compatibility requires it;
- prove fresh install and supported upgrade path where material;
- enforce constraints/invariants/indexes/FKs/checks as applicable;
- handle duplicates/orphans/drift;
- consider locks/batching/concurrency/idempotency/restart;
- cut over old writers/readers;
- prove canonical readback;
- remove obsolete live authority only after safe cutover.

## 14. Distributed/failure semantics

For jobs/events/providers/distributed mutation, prove materially applicable:

`stable identity | idempotency | correlation | duplicate/replay | out-of-order | retry/backoff | lease/DLQ | timeout/unknown result | restart | compensation | reconciliation | provider authentication/signature | terminal-state handling`.

For financial mutation, the financial canonical owner derives/persists authoritative facts; callers/UI do not become parallel money authority.

## 15. Engineering-control-path root treatment

When the proven root is slowness, duplicated validation, orchestration/CI/tooling overhead, repeated scanning, excessive process fan-out or avoidable regeneration, treatment is evidence-driven:

```text
BASELINE BEFORE
→ TRACE INVOCATIONS / FAN-OUT / SCANS / I/O / CACHE / NETWORK / RUNTIME WORK
→ PROVE COST ROOT
→ REMOVE / MERGE / ROUTE / CACHE / NARROW / REORDER AS CORRECT
→ VERIFY REQUIRED ASSURANCE WAS NOT WEAKENED
→ MEASURE THE SAME SCENARIO AFTER
→ PROVE NO MATERIAL COST WAS MERELY SHIFTED ELSEWHERE
```

Do not claim a performance/tooling root closed merely because code is shorter or one command appears faster. Before/after evidence must use comparable inputs and identify what assurance remains preserved.

## 16. Cleanup is treatment, not polish

Apply the root-cause closure continuity invariant owned by `00`: cleanup/deletion obligations proven in preparation and materially related obligations newly exposed by live execution belong to the same Root-Cause Closure. A newly exposed related residue must be classified and resolved; it cannot be ignored because it was absent from the prepared deletion manifest.

Inspect at the necessary structural level:

`line → condition/branch → function/method → type/component/helper → file → file group → folder → module/package → service/surface → domain → route/contract/config/dependency/data/runtime/tooling path`.

Act on what is proven:

`dead | unreachable | stale | obsolete | superseded | duplicate | misplaced | unused | legacy | temporary | debug | workaround | fallback | parallel truth | unjustified compatibility | generated noise`.

For every suspicious artifact require a defensible:

`Necessary Purpose + Correct Owner + Real Consumer + Requirement + Proven Value + Correct Placement/Architectural Reason`.

Static orphan/unused output is evidence, not deletion authority **by itself**. Deletion authority is established by the proof/disposition process in `02 §20.2` or by equivalent live proof during direct execution.

Once an ordinary repository artifact inside the authorized working cone is proven `DELETE_REQUIRED`, deletion is mandatory treatment after its recorded prerequisites are satisfied. It does not require a second human confirmation merely because the operation is a file/code deletion; Git is the repository history. The executor may defer/skip it only when new material evidence invalidates the disposition, a recorded prerequisite is not yet satisfied, the artifact is foreign/outside the authorized cone, or a genuinely protected/irreversible platform action under `01` is involved.

```text
PROVEN DELETE_REQUIRED + PREREQUISITES SATISFIED
→ DELETE
→ REPAIR REFERENCES / CONFIG / TESTS / GENERATED CONSUMERS
→ PROVE ZERO REACHABILITY / ZERO REQUIRED VALUE LOSS

NO-DELETE BIAS ≠ SAFETY.
UNCLASSIFIED MATERIAL CLEANUP RESIDUE = ROOT STILL OPEN.
UNEXECUTED DELETE_REQUIRED = ROOT/CLEANUP STILL OPEN.
UNVERIFIED CLEANUP/DELETION OUTCOME = ROOT STILL OPEN.
```

Do not silently downgrade `DELETE_REQUIRED` to `KEEP`, leave a duplicate file “just in case”, rename residue to `legacy/old/archive`, or retain a superseded wrapper as a fallback. If evidence changes, stop/reclassify through the canonical diagnosis path; otherwise execute the deletion. Directly related cleanup is part of root treatment and must not be deferred as “later polish”, a separate task, or a future cleanup campaign.

## 17. Reference integrity after structural change

After `Delete/Rename/Move/Merge/Split/Refactor/Replace`, trace materially relevant:

`imports | exports | re-exports | callers/callees | registrations | routes/navigation | contracts/schemas | configs/env | dependencies | tests/mocks/fixtures | docs/examples | build/CI entries | project scripts/manifests | generated references | runtime bindings`.

Do not leave broken/orphan/stale references, obsolete aliases/config keys/env vars/dependencies, tests for ended behavior or automation referring to removed paths.

## 18. Test integrity

Tests encode correct semantics; they must not redefine the problem to make implementation green.

Forbidden: weakening/removing a valid test, changing expected behavior to match wrong implementation, skip/disable/silence hiding required failure, or mock/fixture used as final proof of a real runtime claim.

Correct sequence:

`determine correct semantics → fix implementation → update/add regression evidence → prove affected real behavior`.

If a test/check itself changes, prove it can still falsify the broken behavior and was not weakened.

Existing tests are evidence sources, not the definition of correctness. Missing coverage does not make a missing behavior safe.

## 19. Runtime freshness

Runtime proof is invalid if stale code/process/data may have produced it. Establish as applicable:

`source/candidate identity | artifact/image/bundle provenance | process/container freshness | schema/migration version | seed/fixture provenance | intended endpoint/config/environment | canonical post-state readback`.

## 20. Workspace and staging hygiene

Before local mutation when a working tree is involved, record as applicable:

```text
current workspace/branch/ref
pre-existing tracked and untracked changes
intended paths/symbols/hunks
known foreign/concurrent ownership
```

Foreign/pre-existing change is not this agent's change. Path ownership alone is insufficient because another writer may own a different hunk in the same file.

When broad commands may capture or destroy foreign work, they are forbidden by default:

```text
git add .
git add -A
git commit -a
git checkout -- .
git restore .
git reset --hard
git clean -fd
```

Before every local commit:

```text
inventory working tree
→ allowlist exact owned paths/hunks
→ stage explicit paths/hunks
→ inspect staged diff
→ inspect untracked/foreign delta again
→ commit one coherent logical boundary
```

Do not weaken this discipline merely because execution is `DIRECT_ON_TARGET`.

## 21. Reviewable mutation boundaries

Perform mutations in coherent logical units. Before commit/push/ref movement inspect intended files, foreign files, generated files, deletions, renames, migrations, contracts, runtime/config and tests.

Own exact intended paths/hunks and prove that unrelated/foreign work is excluded.

## 22. Atomic/concurrent repository writes

Where supported, prefer an atomic multi-file commit built against the exact expected latest parent and a non-force fast-forward ref update.

For GitHub/API multi-file writes, a per-file content SHA is not a branch-head compare-and-swap. Prefer:

```text
resolve latest head
→ create blobs/tree against exact base
→ create commit with exact expected parent
→ re-resolve target ref
→ non-force fast-forward ref update
```

If target moves:

`do not overwrite → re-resolve → classify delta under 01 → reconcile → rebuild affected candidate → reverify invalidated evidence`.

Partial multi-file writes are not closure; reconcile or complete them safely.

## 23. Adaptive root loop to saturation

After each coherent root treatment, continue from current live truth rather than an old task list:

```text
READ LATEST LIVE TRUTH
→ VERIFY TREATED ROOT
→ RE-AUDIT / RE-INSPECT / RE-DIAGNOSE / RE-ANALYZE AFFECTED CONE
→ DISPOSITION RESOLVED OR OBSOLETE DESCENDANT FINDINGS
→ DISCOVER NEWLY EXPOSED MATERIAL FINDINGS/ROOTS
→ UPDATE BLAST RADIUS / CONSUMERS / GOVERNANCE IMPACT / DURABLE-TRUTH CLARITY IMPACT
→ RE-RANK
→ SELECT HIGHEST PROVEN ROOT
→ REPEAT
```

The loop continues until all original material findings plus all materially related findings exposed by treatment, migrations, consumers, cleanup, governance impact or durable-truth clarification are `PROVEN_CLOSED` or `NOT_APPLICABLE_WITH_PROOF`. Ending the original list, obtaining a green build/test, or removing the visible symptom is not saturation.

For a still-valid prepared `R0/R1` handoff, “re-audit/re-diagnose” here means the **smallest affected revalidation capable of detecting invalidation**, not a mandatory restart of the expensive `AUDIT_PREPARE` discovery/tool-saturation pass. Reuse valid evidence and broaden only when the result exposes a new higher root, contradiction, authority change, unexpected blast radius, or failed assumption.

Do not repeat the same loop without material progress; repeated related symptoms require upstream re-diagnosis under `02` rather than a patch loop. If a higher root appears, suspend affected lower work immediately. Sunk cost is not execution authority.

## 24. Minimum necessary complexity

The target state should use the simplest proven-correct design that satisfies the actual requirements. For materially affected `Layer | Abstraction | Wrapper | Adapter | Indirection | State/Flow | Config | Script | Dependency | File | Folder`, require a necessary purpose, correct owner, real consumer and proven correctness/assurance/operational value.

If a simpler design preserves required product semantics, invariants, security, reliability, data integrity, performance and real compatibility needs, use `SIMPLIFY | FLATTEN | CONSOLIDATE | MOVE_TO_OWNER | REMOVE | RESTRUCTURE` as appropriate. Do not retain complexity because it already works, and do not remove complexity merely because simpler code looks cleaner.

> **WORKING ≠ JUSTIFIED; COMPLEX ≠ ROBUST; PREFER THE SIMPLEST PROVEN-CORRECT DESIGN.**

## 25. End-to-end continuity and no partial cutover

A local correction is not a system correction. Any root treatment, migration, restructure or cutover must account for every materially affected owner, writer, reader, consumer, contract/API/event, data path, job/provider, runtime/config path and required surface/journey before the old path is retired.

```text
LOCAL FIX ≠ SYSTEM FIX
ONE SURFACE PASS ≠ END-TO-END PASS
CANONICAL CHANGE WITHOUT ALL AFFECTED CONSUMERS MIGRATED = INCOMPLETE
```

Preserve proven-valid behavior unless the Canonical Target intentionally changes it; intentional change requires explicit migration of every affected consumer to the new semantics. No unintended regression, missing consumer, partial migration or half cutover may be deferred as a separate future bug. If a treatment causes an affected app/service/journey to fail because migration or propagation was incomplete, the original root remains `OPEN` and treatment continues through the same blast-radius cone.

## 26. Progressive governance clarification after proven work

Every material root treatment or diagnosis may improve the platform's durable project memory, but governance enrichment occurs only after the relevant truth is proven.

```text
DISCOVER MATERIAL FACT
→ PROVE / DISPROVE
→ FIX ACTUAL SYSTEM FIRST WHEN WRONG
→ VERIFY ACTUAL SYSTEM / READBACK WHEN REQUIRED
→ CLASSIFY KNOWLEDGE UNDER 01 / GOVERNANCE FOCUS
→ IF PROVEN + DURABLE + MATERIAL + REUSABLE AND GOVERNANCE-WORTHY:
     RECONCILE / ENRICH THE SMALLEST EXISTING CANONICAL GOVERNANCE OWNER
→ CROSS-CHECK GOVERNANCE ↔ SYSTEM ↔ PROJECT FRAME
```

This requirement applies both when treatment changes durable semantics and when work merely reveals an already-existing durable Project/System truth that governance failed to capture clearly.

Do not copy task state, implementation detail, SHAs, bug lists, transient runtime facts or speculative model completion into governance. Do not create a new governance artifact when `PRD.md`, `platform-model.yaml`, an existing Product Truth contract or an existing policy can own the durable truth cleanly.

Package protection/independence remains governed solely by `00-ORCHESTRATOR.md`.
