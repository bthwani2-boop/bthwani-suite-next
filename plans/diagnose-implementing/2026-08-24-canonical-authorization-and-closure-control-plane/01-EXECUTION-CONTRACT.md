# EXECUTE_CLOSE — Canonical Execution Contract

**STATUS:** `READY_FOR_EXECUTION`
**EXECUTION_READY:** `true`
**CLOSED:** `false`
**REPOSITORY:** `bthwani2-boop/bthwani-suite-next`
**BRANCH:** `c`
**AUDIT_TARGET_SHA:** `51a8482bc891ce904415eadc6c0bcf7168068fbc`

This file is executable handoff, not permission to bypass the orchestrator. `EXECUTE_CLOSE` must re-enter through `tools/prompting/bthwani-orchestrator/00-ORCHESTRATOR.md`, revalidate this handoff against the then-current branch, and execute the units below from highest root to lower exposed findings.

## 1. Entry gate before any Target System write

Before execution:

1. Pin current `origin/c` SHA.
2. Compare it against `AUDIT_TARGET_SHA`.
3. The only acceptable post-audit changes without re-auditing the Target System are the three files in this `PLAN_DIR`.
4. If any source, contract, migration, workflow, test, config, dependency, generated artifact, runtime file or governance truth changed after `AUDIT_TARGET_SHA`, re-audit that changed cone and update the handoff before mutating it.
5. Confirm `tools/prompting/bthwani-orchestrator/**` is unchanged and remains read-only.
6. Do not create or switch branches/worktrees automatically.

No treatment starts from a failing file/check. Start from the highest proven material owner and propagate canonical truth down through all affected consumers.

## 2. Non-negotiable execution laws

- No parallel applied-RBAC authority or writer.
- No dual-write migration as a permanent or normal cutover mechanism.
- No silent fallback, shim, alias, permanent compatibility layer, test-only fix, UI-only fix, backend-only fix or DB-only fix accepted as closure.
- No weakening Sonar/Semgrep/CodeQL/security policies merely to turn checks green.
- No deleting a canonical artifact before all real consumers have moved.
- No retaining a superseded artifact after its real consumers have moved.
- Documentation and tests record/prove the fix; they do not substitute for the fix.
- Every new abstraction/file/config/schema element must have `Necessary Purpose + Correct Owner + Real Consumer + Proven Value`.
- Every temporary cutover element must have one owner, a concrete exit condition, and mandatory same-effort removal once that condition is met.

## 3. Canonical cutover strategy

Use a **single-authority cutover**, not parallel truth:

1. Freeze the canonical semantic target: Identity owns applied RBAC; DSH owns approval/orchestration only.
2. Inventory every current writer/reader/consumer before changing the first one.
3. Establish/repair the canonical Identity write path, idempotency and write fences first.
4. Migrate DSH mutation requests to the canonical intent -> Identity mutation -> authoritative readback -> DSH finalization chain.
5. Migrate contracts and all readers/consumers to the canonical vocabulary/state semantics.
6. Backfill/reconcile historical data while the one canonical authority remains authoritative.
7. Enable/verify DB/domain fences that make superseded writers impossible.
8. Remove every old writer, route, schema path, alias, projection, cache, compatibility layer and dead artifact after the last consumer is proven migrated.
9. Only then run full exact-final-candidate verification and negative-space re-audit.

If temporary coexistence is technically unavoidable, only one side may retain write authority. The non-canonical side must be read/derived-only, explicitly temporary, and removed before closure.

---

# 4. Ordered execution units

## U001 — Freeze and enforce canonical authorization vocabulary/authority

**Owner:** Product truth + Identity.
**Depends on:** none.
**Primary source:** `governance/product/contracts/administration-roles-approvals-audit.product-truth.json` and Identity RBAC definitions/canonical access domain.

### Required work

- Reconcile the Product Truth, Identity RBAC definitions, permissions, role names and surface/domain consumers into one semantic vocabulary.
- Ensure the canonical vocabulary is defined once at the owning layer and downstream layers derive/use it rather than redefining it.
- Identify every alias, renamed role, legacy permission, domain-local synonym and duplicated permission map in the affected cone.
- Classify each as canonical, derived presentation mapping, temporary migration input, or superseded deletion target.
- Preserve presentation labels/translations only when they are display-only and cannot authorize independently.

### Mandatory deletion/retirement

Delete/retire after consumer migration:

- duplicate role/permission constants with independent meaning;
- stale aliases whose sole purpose is compatibility with superseded semantics;
- duplicate frontend/server vocabulary maps that can make an authorization decision independently;
- generated artifacts that encode an obsolete vocabulary and can be regenerated from canonical sources.

### Exit proof

One canonical machine vocabulary exists; all authorization decisions reference it; no second semantic role/permission truth remains reachable.

---

## U002 — Make Identity the physically enforceable sole applied-RBAC writer

**Owner:** `core/identity`.
**Depends on:** U001.

### Required work

- Audit and converge `canonical_actor_access.go`, actor/employee/partner administration paths, repository transactions, RBAC definition boundary and related Identity HTTP paths.
- Ensure all applied authorization mutations flow through one canonical Identity transaction/write path.
- Enforce idempotency, concurrency control and stale-write rejection at the authoritative owner.
- Make canonical readback originate from the same authority/state that accepted the write.
- Review local bootstrap/operator provisioning and employee/partner access paths for bypasses; either route them through the same writer or remove them.
- Prove all externally callable Identity administration surfaces cannot bypass the canonical writer.

### Database obligations

Treat Identity migrations `identity-028` through `identity-037` as one ordered canonicalization chain. Verify their resulting constraints/functions/triggers/projections enforce, rather than merely describe, the canonical writer and vocabulary.

### Mandatory deletion/retirement

- direct repository/SQL mutation helpers outside the canonical writer;
- obsolete write-capable projections;
- superseded triggers/functions/columns/tables after migration;
- bootstrap/dev-only alternate authorization writers;
- stale code paths reachable from old API routes.

### Exit proof

A repository-wide write-path audit proves **zero applied-RBAC writers outside Identity's canonical writer** and DB/runtime fencing makes accidental reintroduction fail closed.

---

## U003 — Converge DSH Administration to orchestration-only authority

**Owner:** `services/dsh/backend/internal/administration`.
**Depends on:** U001, U002.

### Required work

- Converge role requests, approvals, rollback, canonical intents, leases and decision fencing into one DSH administration orchestration path.
- Ensure DSH records intent/decision/audit state but never treats it as independently applied authorization truth.
- Mutation sequence must be canonical and observable: validated administrative decision -> canonical mutation intent/lease/fence -> Identity mutation -> Identity authoritative readback -> DSH decision/audit finalization.
- Make retries idempotent and stale intents unable to finalize over newer decisions.
- Make failure/recovery explicit: a failed Identity mutation/readback cannot silently become a successful DSH applied state.
- Reconcile rollback semantics with the same writer/readback path; rollback cannot be a second direct writer.

### Database obligations

Treat DSH migrations `dsh-1033` through `dsh-1039` as one decision/fencing/reconciliation chain. Validate pending-change exclusion, mutation leases, fencing and audit reconciliation against real execution semantics.

### Mandatory deletion/retirement

- DSH direct applied-RBAC mutation code/SQL;
- old approval paths that finalize without Identity readback;
- duplicate mutation-intent or rollback writers;
- obsolete pending-role/decision tables, columns, triggers or routes after canonical migration;
- compatibility endpoints with no remaining consumer.

### Exit proof

Every DSH administrative mutation can be traced to one canonical intent and one Identity-applied state; final DSH state is a derived/audit projection confirmed by authoritative readback.

---

## U004 — Cut over contracts, generated bindings and all consumers

**Owners:** Identity contracts + DSH contracts; consuming owners derive only.
**Depends on:** U001-U003.

### Required work

- Reconcile Identity OpenAPI contracts, DSH administration contracts, common schemas, contract registry entries and generated bindings to the one canonical vocabulary/authority model.
- Remove contract fields/states implying that DSH owns applied RBAC if the canonical truth is Identity-owned.
- Preserve explicit workflow/audit states that are genuinely DSH-owned, clearly separated from applied authorization state.
- Regenerate all derived artifacts from canonical contracts; never hand-edit generated output as the authority.
- Migrate control-panel administration API/types/controllers/screens, operations permission hooks, partner/store/workforce readers, runtime HTTP clients and all other affected consumers.
- Ensure frontend state is a presentation/interaction projection, not a parallel permission authority.
- Ensure caches/projections are invalidated/rebuilt from canonical readback and cannot authorize autonomously.

### Mandatory deletion/retirement

- obsolete contract schemas/fields/enums;
- stale generated clients/types;
- duplicate frontend permission maps/state machines;
- old endpoints and adapters after last consumer migration;
- unreachable route handlers/components/tests representing old semantics.

### Exit proof

Contract registry and consumer inventory show one semantic model from Product/Identity through DSH and all surfaces, with no missing consumer or contract drift.

---

## U005 — Reconcile/backfill data and prove canonical cutover

**Owners:** Identity for applied state; DSH for orchestration/audit state.
**Depends on:** U002-U004.

### Required work

- Run/validate the ordered migration chains on a controlled database candidate representative of affected data.
- Backfill legacy role/permission/state representations to canonical vocabulary.
- Reconcile DSH decision/audit rows with authoritative Identity applied state.
- Detect duplicates, orphans, impossible transitions, stale leases/intents, unfinalized decisions and conflicting historical projections.
- Repair data from its owning canonical authority; do not invent a reconciliation table that becomes a new permanent truth.
- Prove retry/idempotency and concurrent decision behavior.

### Required invariants

- one applied state per actor/scope under canonical uniqueness rules;
- no pending/stale DSH mutation can override a newer fenced decision;
- DSH readback equality with Identity for every affected finalized decision;
- backfill is repeat-safe;
- migration rollback/recovery behavior is explicit and does not re-enable superseded writers.

### Mandatory deletion/retirement

After successful cutover and consumer proof, drop/retire all legacy data structures with no canonical read/write consumer. No `legacy_*`, shadow copy, compatibility projection or duplicate cache remains merely as insurance.

### Exit proof

Reconciliation reports zero material mismatch/orphan/conflict and post-cutover writes/readbacks traverse only the canonical paths.

---

## U006 — Mandatory repository cleanup after authorization cutover

**Owner:** each owning domain; integration authority coordinates deletion.
**Depends on:** U001-U005.

This unit is not polish. It is part of the treatment.

### Required sweep

Search the entire affected cone and negative space for:

- old role/permission names and aliases;
- superseded endpoints/routes;
- duplicate writers/readers;
- dead helpers/modules/components;
- stale migrations/schema artifacts no longer needed in a forward-only history versus runtime schema objects that must actually be dropped;
- orphan tests/mocks/fixtures;
- unused packages/dependencies;
- compatibility shims/adapters;
- duplicate caches/projections;
- stale docs/config/generated artifacts;
- TODO/fallback branches that preserve obsolete behavior.

For migrations already part of immutable deployed history, do **not** delete history merely for cosmetic cleanup; instead remove the runtime residue via a correct forward migration when historical migration retention is necessary for reconstructability. Delete migration files only where repository migration policy proves they are not canonical history and not needed to build any supported database state.

### Exit proof

Every surviving material artifact has necessary purpose, correct owner, real consumer and proven value. Every proven superseded artifact is deleted/retired in the same execution.

---

## U007 — Correct the canonical Realtime/Redis behavior exposed by Contextual CI

**Owner:** canonical realtime/runtime publish boundary identified by the failing contract.
**Depends on:** authorization units only when shared code/data actually intersects; otherwise may execute in parallel after root ownership is confirmed.

### Required work

- Reproduce the exact Realtime/Redis contract failure from run `32761500147` on the implementation candidate.
- Trace the failing assertion from contract -> public runtime semantics -> publisher/service -> Redis interaction -> failure/recovery behavior.
- Determine the canonical semantic requirement from implementation owners/contracts and existing runtime consumers, not from a desire to satisfy the test mechanically.
- Correct the owner so all consumers see the same failure/recovery/idempotency semantics.
- Keep Redis failure observable where correctness requires it; do not swallow errors or create a local-memory/silent fallback that becomes parallel delivery truth.
- Update tests only after the canonical runtime behavior is fixed and only where the test itself encoded superseded truth.

### Exit proof

The exact failing contract passes for the correct reason, runtime failure/recovery behavior is explicit, and no fallback/duplicate delivery authority was introduced.

---

## U008 — Repair remote analysis/control-plane authority without weakening evidence

**Owner:** `.github/workflows/**` + canonical remote-analysis scripts/guards.
**Depends on:** may run in parallel with independent product units, subject to single integration authority.

### A. Semgrep evidence normalization

- Preserve Semgrep raw JSON/stderr artifact at exact candidate SHA/base.
- Replace the overly narrow one-string tool-limitation classifier with deterministic structural classification of known engine conditions.
- Each raw `.errors[]` condition must land in exactly one auditable disposition: proven tool limitation, genuine/unknown engine error, or other explicitly defined engine category.
- Keep actual `.results[]` findings separate from engine conditions.
- `allRawFindingsAccounted=true` is allowed only when cardinality/reconciliation proves nothing was dropped.
- Unknown engine conditions remain blocking; known limitations remain visible evidence, not hidden success.
- Add contract tests for the normalizer/policy using representative raw conditions so schema drift cannot silently reopen the bug.

### B. Workflow security findings

- Reduce `.github/workflows/ci.yml` permissions to the least permissions required by each workflow/job; prefer job-scoped permissions where appropriate.
- Correct all four actionlint `SC2209` findings in `ci.yml`/`semgrep.yml` using unambiguous shell assignment/execution semantics.
- Re-run zizmor/actionlint against the exact updated candidate.

### C. Authority hygiene

- Preserve exact-SHA checkout and branch-agnostic PR/ref semantics.
- Preserve one owner per scanner responsibility; do not duplicate Sonar, CodeQL, Semgrep or security analysis through shadow workflows.
- Keep OpenCodeReview delegation explicit: workflow context/preparation is not a false claim that semantic host-agent review was performed.
- Any aggregate evidence workflow must consume raw/normalized evidence; it cannot synthesize a green result without underlying evidence.

### Mandatory deletion/retirement

Remove duplicate/obsolete classifier branches, permissions, shell constructs, shadow analysis/status logic and legacy schema handling after all producers/consumers use the canonical evidence schema.

### Exit proof

Semgrep produces zero unaccounted raw conditions, zizmor/actionlint pass, exact-SHA/branch-agnostic ownership remains intact, and no gate has been weakened.

---

## U009 — Diagnose and close SonarQube material findings at code owner

**Owner:** code/config owner responsible for each Sonar finding.
**Depends on:** execute after or alongside the source units that may naturally remove findings; re-scan only the integrated candidate.

### Required work

- Retrieve the exact SonarQube Cloud failure/quality-gate evidence for the candidate.
- Group findings by root cause and owner, not one ticket per symptom.
- Fix implementation design/duplication/reliability/security/maintainability issues at the highest common owner.
- Remove code that becomes dead or redundant after root fixes rather than adding suppressions.
- Use exclusion/suppression only for a demonstrable false positive or non-source/generated scope, documented with evidence and the narrowest possible scope.

### Exit proof

SonarQube Cloud analysis completes successfully and the project/PR quality gate passes on the exact integrated candidate with no unresolved material finding hidden by configuration.

---

## U010 — Integrated final cutover, deletion and re-audit

**Owner:** single integration authority.
**Depends on:** U001-U009.

### Required work

1. Integrate all units onto the existing target branch without creating autonomous truth or conflicting parallel implementations.
2. Re-run writer/reader/consumer inventory after the last functional change.
3. Perform final migrations/backfill/reconciliation.
4. Delete all superseded artifacts identified by U006/U008 and any newly exposed residue.
5. Regenerate canonical generated artifacts.
6. Pin a **FINAL_CANDIDATE_SHA only after the last write and deletion**.
7. Execute `02-VERIFICATION-CLOSURE.md` against that exact SHA.
8. If verification or negative-space audit exposes a new material root, reopen the appropriate unit, fix it, perform mandatory cleanup again, and pin a new final candidate.

`CLOSED` is forbidden before U010 and the complete closure contract pass.

---

# 5. Dependency and parallelism model

Safe parallelism is allowed only where ownership cones do not collide:

- U001 -> U002 -> U003 establishes the semantic/write spine and should be serialized at integration boundaries.
- U004 follows the stable canonical spine; different consumer surfaces may migrate in parallel with one integration authority.
- U005 follows writer/contract convergence.
- U006 follows consumer cutover and runs again after any later material change.
- U007 can run independently if the realtime cone does not touch authorization files/data.
- U008 can run independently from product code, except changes to shared CI scripts must be centrally integrated.
- U009 diagnosis can run in parallel, but final Sonar closure must scan the integrated candidate.
- U010 is serialized and authoritative.

Parallel workers may inspect and propose independently; they may not create competing canonical writers, duplicate implementations or divergent schema/contract truths.

# 6. Execution evidence record required per unit

Every unit must record:

- exact input SHA;
- root cause and owner;
- files/schema/contracts/data actually changed;
- writers/readers/consumers migrated;
- migration/backfill/reconciliation performed;
- artifacts deleted/retired and why;
- tests/runtime/scanners executed;
- exact output SHA;
- remaining material findings, if any;
- negative-space checks performed;
- `CLOSED_FOR_UNIT` only when no material residue remains in that unit's effective scope.

A unit that merely makes its check green without this evidence is incomplete.

# 7. Fail-closed stop conditions

Stop and re-diagnose rather than patch if any of the following occurs:

- a second applied-RBAC writer is discovered;
- Product Truth and Identity implementation disagree materially;
- a migration requires preserving dual authority beyond a bounded read-only compatibility interval;
- data reconciliation cannot establish which authority owns conflicting state;
- a scanner shows raw evidence that the current normalizer cannot account for;
- Sonar/CodeQL/Semgrep/security findings reveal a higher common root than the unit being treated;
- a test requires behavior that conflicts with canonical product/runtime truth;
- deleting a supposed legacy artifact reveals a real unmigrated consumer;
- branch drift includes Target System changes not covered by this audit.

In all such cases, return to root diagnosis, expand only the proven affected cone, update the plan evidence if material, then continue.

# 8. Completion condition for EXECUTE_CLOSE

Implementation is only a **Final Candidate** when:

- all units are materially complete;
- all consumers are cut over;
- all data is reconciled;
- superseded reality is deleted;
- no parallel writer/authority remains;
- no fallback/compatibility debt remains without proven necessity and an unexpired exit condition;
- no known material finding remains;
- the final SHA is pinned after the last modification/deletion;
- the complete verification and negative-space re-audit in `02-VERIFICATION-CLOSURE.md` passes.

Only then may the orchestrator evaluate `CLOSED`. Until that proof exists, status remains `NOT CLOSED`.
