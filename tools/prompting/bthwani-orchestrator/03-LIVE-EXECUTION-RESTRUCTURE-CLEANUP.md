# Live Execution, Reconstruction, Cutover and Cleanup

## 1. Execution is live by default

In `EXECUTE_END_TO_END` and `EXECUTE_PROJECT_CLOSURE`, a proven executable root proceeds directly to treatment. No diagnosis package or plan artifact is required first.

Internal ordering is permitted and necessary; repository planning artifacts are not default output.

## 2. Root-correct treatment

For every proven root:

```text
DEFINE PROVEN TARGET TRUTH
→ IDENTIFY CANONICAL OWNER / WRITE PATH
→ IMPLEMENT CANONICAL PATH
→ MIGRATE ALL MATERIAL WRITERS
→ MIGRATE ALL MATERIAL READERS
→ MIGRATE ALL MATERIAL CONSUMERS
→ MIGRATE DATA / CONTRACTS / GENERATED CLIENTS WHEN REQUIRED
→ UPDATE AFFECTED GOVERNANCE / POLICY / CONFIG / MANIFESTS
→ VERIFY CANONICAL READBACK / RUNTIME
→ REMOVE OR RETIRE SUPERSEDED PATHS
→ PROVE ZERO REACHABLE UNJUSTIFIED PARALLEL TRUTH
```

If the root requires source/runtime/data/contract mutation and no such mutation occurred, documentation changes cannot close it.

## 3. Smallest complete root-correct change

Prefer the least disruptive change that fully eliminates the root and reconciles the material blast radius.

Do not confuse “root-cause” with “rewrite everything”. Preserve proven value.

Priority before creating a new concept:

`REUSE → EXTEND → MERGE → MOVE_TO_OWNER → SPLIT → CREATE_NEW`.

## 4. Content-preserving reconstruction

When existing code/design/data is valuable but owned/placed incorrectly:

```text
PRESERVE PROVEN VALUE
→ FIX CONTEXT / OWNERSHIP
→ MIGRATE CONSUMERS
→ VERIFY BEHAVIOR / DESIGN / CONTRACTS
→ DELETE OR RETIRE SUPERSEDED PATH
```

Classify reconstruction targets using only as much vocabulary as needed:

`KEEP | HARDEN | MOVE | RENAME | MERGE | SPLIT | REFACTOR | MIGRATE | REGENERATE | REWRITE | REPLACE | DELETE`.

`KEEP BECAUSE IT EXISTS` is not a valid reason. `DELETE BECAUSE IT LOOKS OLD` is also not valid.

## 5. Semantic repository restructuring

Do not start with folder moves. Derive structure from meaning:

`Product Outcomes → Canonical Domain Owners → Capability Boundaries → Public Contracts → Data Ownership → Shared/Runtime Boundaries → Surface Composition → Directories/Files`.

A structural refactor is:

`SEMANTIC RE-OWNERSHIP + MOVE/RENAME + REWIRE + CLEANUP + VERIFY`.

Before moving/deleting a material artifact trace, as applicable:

`imports | exports | routes | navigation/mounting | generated consumers | API/contracts | data/migrations | runtime/config | tests | guards/CI | package/workspace scripts | governance references | human-facing design behavior`.

## 6. Canonical cutover

Universal cutover sequence:

```text
inventory current writers/readers/consumers
→ prove canonical owner
→ introduce/fix canonical replacement
→ migrate proven facts/data/state
→ switch writers
→ switch readers/consumers
→ remove dual-write / fallback / obsolete compatibility where no longer required
→ remove obsolete routes/storage/declarations/config/tests/docs references
→ zero-reference/reachability proof
→ runtime/readback proof
```

A new correct path beside an old reachable path is not closure.

## 7. Patch/workaround policy

Final closure forbids known unjustified:

- symptom suppression without parent-root removal;
- hardcoded bypass/default masking incorrect state;
- catch-and-ignore of a material failure;
- duplicate adapters/endpoints/registries creating second truth;
- permanent fallback to legacy behavior;
- indefinite compatibility shim with no justified mixed-version need/removal trigger;
- UI workaround for a backend/data/contract defect;
- half migration or dual writer left as the intended final state.

A temporary compatibility path is allowed only when it is materially required for a real rollout/mixed-version constraint, has one authority, preserves semantic correctness, and has a proven removal/cutover condition. It cannot be forgotten as “temporary”.

## 8. Frontend/backend vertical execution

Treat an operational feature as one vertical slice across all affected layers. Do not ship:

- UI control with no real backend effect;
- backend endpoint with no required consumer;
- contract change without generated/manual consumer reconciliation;
- state/data mutation without required readback/refresh;
- authorization only in UI;
- surface-local interpretation that contradicts canonical statuses/errors/permissions.

## 9. Governance synchronization is part of implementation

If treatment changes material semantics such as actor, role, authority, responsibility, journey, state, transition, invariant, API/data ownership or operational responsibility:

```text
IMPLEMENTATION
→ RUNTIME / BEHAVIOR PROOF
→ GOVERNANCE IMPACT ANALYSIS
→ GOVERNANCE RECONCILIATION
→ UPDATE AFFECTED GOVERNANCE
→ CROSS-CHECK GOVERNANCE ↔ SYSTEM
```

Do not edit governance merely to describe an unfixed implementation. Do not leave governance stale after a proven semantic change.

## 10. Cleanup is treatment, not polish

Continuously identify and prove:

`dead/stale code | duplicate implementations | obsolete configs | deprecated contracts | unused dependencies | orphan modules | legacy paths | temporary/debug artifacts | duplicate registries | generated noise | misplaced ownership | contradictory env/config | obsolete scripts`.

Cleanup flow:

`candidate → reference/dependency proof → runtime/semantic relevance proof → classify → migrate consumers/value if required → remove/merge/move → verify no regression/reachable stale truth`.

Never perform blind global deletion from static “unused” results alone.

## 11. Git/concurrency discipline

Work from the exact requested branch/ref and current live HEAD.

Before a material write batch:

`fetch/re-resolve latest → classify concurrent delta → reconcile affected cone`.

Concurrent delta is input, not instruction. Preserve unrelated work. Re-diagnose related semantic/authority changes before overwriting assumptions.

Never force-push or hard-reset newer foreign work unless the human explicitly and safely requests that irreversible behavior.

For local Git staging:

`inventory intended paths → allowlist → inspect diff → stage exact paths → inspect staged diff`.

Do not use blind `git add .` for governed changes.

## 12. Execution evidence stays lean

Do not generate command logs, screenshots, evidence packs, matrices or reports merely because previous frameworks did.

Prefer direct live code/runtime proof and concise reporting. Escalate evidence depth only to what the risk/claim requires.

## 13. Orchestrator package exclusion

During ordinary project execution, the write set explicitly excludes:

`tools/prompting/bthwani-orchestrator/**`.

The current human invocation may explicitly authorize package maintenance; such authorization is scoped only to that invocation and stated objective.