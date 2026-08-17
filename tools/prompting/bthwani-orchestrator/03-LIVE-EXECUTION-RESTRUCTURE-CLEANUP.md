# Live Execution, Reconstruction, Cutover and Cleanup

## 1. Execution is live by default

In `EXECUTE_END_TO_END` and `EXECUTE_PROJECT_CLOSURE`, a proven executable root proceeds directly to treatment. No diagnosis package, planning package or repository task ledger is required first.

Internal ordering is necessary; repository planning artifacts are not default output.

## 2. Root-correct treatment

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

A material root is not treated until evidence supports:

```text
problem removed from actual implementation/runtime/data
+ correct canonical implementation exists
+ canonical owner/write path is enforced
+ affected writers/readers/consumers migrated
+ affected surfaces use corrected truth
+ contracts/data/runtime aligned
+ obsolete/parallel implementation no longer reachable/authoritative
+ runtime/readback proves intended behavior when required
+ structural cleanup completed in repository itself
```

Documentation may record this reality afterward; it cannot create it.

## 4. Smallest complete root-correct change

Prefer the least disruptive change that **fully eliminates the root** and reconciles the material blast radius.

Do not confuse root-cause treatment with rewriting everything. Preserve proven value.

Before creating a new concept prefer:

`REUSE → EXTEND → MERGE → MOVE_TO_OWNER → SPLIT → CREATE_NEW`.

If the architecture/design/data model/schema/contract/ownership/state/permission/integration boundary/dependency direction is proven wrong, refactor/redesign/rebuild as much as necessary. Do not preserve a wrong structure merely to keep the diff small.

## 5. Content-preserving reconstruction

For any materially affected artifact classify only after evidence:

`KEEP | HARDEN | MOVE | RENAME | MERGE | SPLIT | REFACTOR | MIGRATE | REGENERATE | REWRITE | REPLACE | DELETE`.

When code/UI/UX/assets/data contain proven value but live in the wrong context:

```text
PRESERVE PROVEN VALUE
→ FIX CONTEXT / OWNERSHIP
→ REPLACE WRONG BUSINESS/STATE/API BINDING
→ MIGRATE CONSUMERS
→ VERIFY FUNCTIONAL + VISUAL/OPERATIONAL PARITY AS APPLICABLE
→ DELETE SUPERSEDED WRAPPER/PATH
```

`KEEP BECAUSE IT EXISTS` and `DELETE BECAUSE IT LOOKS OLD` are both invalid.

Do not clean-room-rebuild pnpm/Expo/EAS/Metro/Next/Go/Docker/CI/runtime foundations merely because they are old if they are proven sound. Rebuild the wrong authority/context/architecture, not every line indiscriminately.

## 6. Semantic repository restructuring

Do not start from folder movement. Derive structure from meaning:

`Product Outcomes → Canonical Domain Owners → Capability Boundaries → Public Contracts → Data Ownership → Shared/Runtime Boundaries → Surface Composition → Directories/Files`.

A structural refactor is:

`SEMANTIC RE-OWNERSHIP + MOVE/RENAME + REWIRE + CLEANUP + VERIFY`.

Review each material element by:

`Domain → Ownership → Responsibility → Placement → Naming → Context → Dependencies → Consumers`.

Wrong placement/ownership is a real architectural defect when it creates ambiguity, duplication, incorrect dependency direction or misleading authority even if imports still compile.

## 7. Naming and context

Review materially affected:

`files | folders | functions | variables | types | classes | components | modules | packages | routes | services | contracts | models | configs | env vars | tests`.

Names should represent current responsibility and ownership. After rename/move:

`update all references → remove obsolete aliases when not required → prove old name/path no longer remains reachable/authoritative`.

## 8. Git is history; active tree is present truth

Do not keep superseded copies merely as backup/history through active paths or names such as `old`, `backup`, `final2`, `temp`, `legacy`, `deprecated`, or `archive` without a proven runtime/legal/migration requirement.

If an old version has no current responsibility, purpose, consumer, requirement or architectural reason, remove it after blast-radius proof. Git history is the default historical archive.

## 9. Canonical cutover

Universal cutover sequence:

```text
inventory current writers/readers/consumers
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

A new correct path beside an old reachable path is not closure. Never leave the system `half-old + half-new` as the intended final state.

## 10. Patch/workaround/parallel-truth policy

Final closure forbids known unjustified:

- symptom suppression without parent-root removal;
- hardcoded bypass/default masking incorrect state;
- catch-and-ignore of material failure;
- patch-around or temporary fix left as final state;
- duplicate endpoint/adapter/registry creating second truth;
- dual authoritative writer/read path;
- shadow state machine or surface-local business authority;
- UI-only authorization;
- permanent fallback to legacy behavior;
- reachable deprecated route/flow;
- half migration;
- test/guard/check weakening to manufacture green;
- TODO/FIXME/HACK substituting for closure.

## 11. Compatibility is a bounded migration contract

A temporary compatibility path is allowed only when a real mixed-version/rollout constraint requires it and it has:

```text
one semantic authority
explicit scope
owner
consumer list
observability
negative/failure behavior
expiry/removal condition
cutover proof
```

Compatibility must be non-authoritative where possible and removed as soon as the proven rollout requirement ends. Convenience is not a compatibility requirement.

## 12. Frontend/backend vertical execution

Treat one operational feature as one vertical system slice. Do not ship as final state:

- UI control with no real backend effect;
- backend endpoint with no required consumer;
- contract change without all required generated/manual consumer reconciliation;
- mutation without persisted canonical readback/refresh;
- authorization enforced only in UI;
- direct raw transport mapping that duplicates canonical business truth;
- divergent status/error/permission meaning across surfaces.

## 13. Governance synchronization

If treatment changes material semantics such as actor, role, authority, responsibility, journey, state, transition, invariant, API/data ownership or operational responsibility:

```text
IMPLEMENT SYSTEM CHANGE
→ PROVE BEHAVIOR/RUNTIME
→ ANALYZE GOVERNANCE IMPACT
→ RECONCILE AFFECTED GOVERNANCE
→ CROSS-CHECK GOVERNANCE ↔ SYSTEM
```

Never edit governance to describe an unfixed ideal. Never leave materially affected governance stale after a proven semantic change.

## 14. Data and migration treatment

When persistence changes:

- use forward deterministic corrective migrations;
- do not rewrite applied migration history merely to make history look clean;
- use expand/backfill/switch/contract when compatibility requires it;
- prove fresh install and supported upgrade path where material;
- enforce constraints/invariants/indexes/FKs/checks as applicable;
- handle duplicates/orphans/drift;
- consider locks/batching/concurrency/idempotency/restart;
- cut over old writers and readers;
- prove canonical readback;
- remove obsolete live authority only after safe cutover.

## 15. Required distributed/failure semantics

For jobs/events/providers/distributed mutation, prove materially applicable:

`stable identity | idempotency | correlation | duplicate/replay | out-of-order | retry/backoff | lease/DLQ | timeout/unknown result | restart | compensation | reconciliation | provider authentication/signature | terminal-state handling`.

For financial mutation, the financial canonical owner must derive and persist authoritative facts; callers/UI must not become parallel money authority.

## 16. Cleanup is treatment, not polish

Inspect at the necessary structural level:

`line → condition/branch → function/method → type/component/helper → file → file group → folder → module/package → service/surface → domain → route/contract/config/dependency/data/runtime path`.

Act on what is proven:

`dead | unreachable | stale | obsolete | superseded | duplicate | misplaced | unused | legacy | temporary | debug | workaround | fallback | parallel truth | unjustified compatibility | generated noise`.

For every suspicious artifact ask for:

`Responsibility + Purpose + Consumer + Requirement + Architectural Reason + Correct Owner/Placement`.

No static orphan/unused signal is deletion authority by itself. Prove references and runtime/semantic relevance first.

## 17. Reference integrity after structural change

After any `Delete/Rename/Move/Merge/Split/Refactor/Replace`, trace in both directions as materially applicable:

`imports | exports | re-exports | callers/callees | registrations | routes/navigation | contracts/schemas | configs/env | dependencies | tests/mocks/fixtures | docs/examples | build/CI entries | project scripts/manifests | generated references | runtime bindings`.

Do not leave broken imports, orphan references, stale exports, old paths/names, obsolete aliases, stale config keys, unused env variables/dependencies, tests for ended behavior, or project automation referring to removed paths.

## 18. Test integrity

Tests encode correct semantics; they must not redefine the problem to make the implementation green.

Forbidden:

- weakening/removing a valid test because it exposes a real defect;
- changing expected behavior merely to match wrong implementation;
- skip/disable/silence used to hide a required failure;
- mock/fixture used as final proof for a real runtime claim.

Correct sequence:

`determine correct semantics → fix implementation → update/add regression evidence → prove affected real behavior`.

If the test/check itself changes, prove it can still falsify the broken behavior and was not weakened to accept it.

## 19. Runtime freshness

Runtime proof is invalid if stale code/process/data may have produced it.

Before material runtime/E2E proof establish as applicable:

```text
source checkout/candidate identity
built artifact/image/bundle provenance
service/process/container freshness
schema/migration version
seed/fixture provenance
intended endpoint/config/environment
no stale server/container/process masking changes
```

Use unique scenario identifiers when helpful, capture pre-state, execute real path, and read canonical persisted post-state.

## 20. Reviewable mutation boundaries

Perform source mutations in coherent logical units. Before commit/push/ref movement inspect:

`intended files | unintended/foreign files | generated files | deletions | renames | migrations | contracts | runtime/config | tests`.

Do not blindly stage the whole workspace when that can include foreign changes. Preserve pre-existing/other-agent work and own only the intended delta/hunks.

## 21. Atomic/concurrent repository writes

Where the platform supports it, prefer an atomic multi-file commit built against the exact expected latest parent and a non-force fast-forward ref update.

If the target moves before final update:

`do not overwrite → re-resolve → classify delta → reconcile → rebuild affected candidate → reverify invalidated evidence`.

Never force-push merely to preserve an obsolete candidate.

## 22. Re-rank after each root

After coherent root treatment:

```text
read latest live truth
→ re-evaluate descendant findings
→ remove/disposition symptoms eliminated by the root
→ invalidate changed assumptions/evidence
→ discover newly exposed roots
→ rerank
→ choose next highest root
```

If a higher root appears while descendant work is underway, suspend affected lower work immediately. Sunk cost is not execution authority.

## 23. Orchestrator exclusion

During ordinary project execution the write set excludes `tools/prompting/bthwani-orchestrator/**` unless package maintenance is explicitly authorized by the human in the current invocation.

No script, workflow, guard, validator, CLI or hook may be introduced for the purpose of executing or checking this textual package itself.