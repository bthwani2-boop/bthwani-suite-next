# Live Execution, Reconstruction, Cutover and Cleanup

## 1. Execution is live by default

In `EXECUTE_END_TO_END` and `EXECUTE_PROJECT_CLOSURE`, a proven executable root proceeds directly to treatment. No diagnosis package, planning package or repository task ledger is required first.

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
→ PROVE ZERO USE OF OLD AUTHORITY
→ DELETE/RETIRE SUPERSEDED REACHABLE PATHS
→ REPAIR REFERENCES/CONSUMERS
→ VERIFY AFFECTED + BLAST-RADIUS BEHAVIOR
→ ADVERSARIALLY RE-DIAGNOSE ROOT
```

If a root requires source/runtime/data/contract mutation and none occurred, documentation cannot close it.

## 3. Definition of a real fix

A root is treated only when evidence supports:

```text
problem removed from actual implementation/runtime/data
+ correct canonical implementation exists
+ canonical owner/write path is enforced
+ affected writers/readers/consumers migrated
+ affected surfaces use corrected truth
+ contracts/data/runtime aligned
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

Do not edit governance to describe an unfixed ideal and do not leave materially affected governance stale after a proven semantic change.

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

Inspect at the necessary structural level:

`line → condition/branch → function/method → type/component/helper → file → file group → folder → module/package → service/surface → domain → route/contract/config/dependency/data/runtime/tooling path`.

Act on what is proven:

`dead | unreachable | stale | obsolete | superseded | duplicate | misplaced | unused | legacy | temporary | debug | workaround | fallback | parallel truth | unjustified compatibility | generated noise`.

For every suspicious artifact ask for:

`Responsibility + Purpose + Consumer + Requirement + Architectural Reason + Correct Owner/Placement`.

Static orphan/unused output is evidence, not deletion authority.

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

## 19. Runtime freshness

Runtime proof is invalid if stale code/process/data may have produced it. Establish as applicable:

`source/candidate identity | artifact/image/bundle provenance | process/container freshness | schema/migration version | seed/fixture provenance | intended endpoint/config/environment | canonical post-state readback`.

## 20. Reviewable mutation boundaries

Perform mutations in coherent logical units. Before commit/push/ref movement inspect intended files, foreign files, generated files, deletions, renames, migrations, contracts, runtime/config and tests.

Do not blindly stage the whole workspace where it can capture foreign work. Own exact intended paths/hunks.

## 21. Atomic/concurrent repository writes

Where supported, prefer an atomic multi-file commit built against the exact expected latest parent and a non-force fast-forward ref update.

If target moves:

`do not overwrite → re-resolve → classify delta under 01 → reconcile → rebuild affected candidate → reverify invalidated evidence`.

## 22. Re-rank after each root

After coherent root treatment:

`read latest live truth → re-evaluate descendant findings → disposition symptoms eliminated by root → invalidate changed assumptions/evidence → discover newly exposed roots → rerank → choose next highest root`.

If a higher root appears, suspend affected lower work immediately. Sunk cost is not execution authority.

Package protection/independence remains governed solely by `00-ORCHESTRATOR.md`.
