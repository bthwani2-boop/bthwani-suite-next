# VERIFICATION & CLOSURE — Canonical Identity/DSH Authorization Final Closure

## Closure law

`GREEN != CLOSED`.

`CLOSED` is permitted only for the **exact final candidate after the last target-system write** and only after the complete affected cone and its negative space are re-audited. Build, typecheck, unit tests, SonarQube, CodeQL, a healthy screen or a single runtime smoke test are evidence components, never closure by themselves.

The executor must retain a final candidate identity:

- branch/ref;
- exact commit SHA;
- PR `#284` head SHA;
- database/migration state used for runtime proof;
- relevant generated/contract provenance;
- remote workflow/run identities and freshness.

Any later target-system write invalidates affected evidence and requires re-pin/re-run.

## Acceptance claims and evidence authorities

### A. Canonical ownership

Prove:

- Identity is the only role/permission vocabulary, role-definition, actor-role grant/revoke and permission-resolution authority.
- DSH Administration owns governed workflow/projection/audit only.
- WLT remains financial truth for payout effects.
- no local UI/backend/database shadow authorization truth is reachable.

Evidence: governance owner + source inspection + database schema/migrations + focused runtime/readback + negative reference/reachability search.

### B. Exact authorization and separation of duties

Prove every materially affected endpoint/journey uses exact `dsh/control-panel/action/scope` authorization and server-side maker/checker rules.

Required negatives include:

- unauthenticated;
- wrong surface;
- missing exact permission;
- broad role label without exact permission;
- maker reviewing own request;
- beneficiary/self-grant path;
- wrong/stale expected version;
- rollback reviewer equal to maker or prohibited prior decision actor where governed;
- unknown/inactive role;
- direct projection/local table write attempt.

### C. RC1 canonical mutation lifecycle

Prove the final design through database/integration/runtime tests, not code inspection alone.

Required scenarios:

1. **Normal synchronous success:** intent/operation and request become terminal consistently; canonical Identity readback matches.
2. **Identity unavailable before mutation:** durable local operation remains non-terminal with bounded retry schedule; no fake success.
3. **Process restart after local intent commit:** worker resumes with same idempotency identity and applies once.
4. **Identity commits, response/result becomes uncertain:** replay/readback reconciles without creating a new authorization mutation identity.
5. **Identity succeeds, DSH dies before local finalization:** subsequent worker obtains same canonical result and atomically closes governed request + operation.
6. **Failure in local terminalization:** transaction design prevents `approved + non-applied-intent` divergence, or deterministic reconciliation proves it cannot remain orphaned.
7. **Two worker instances:** only one active claim for a due operation; no duplicate external execution beyond safe idempotent replay.
8. **Worker dies while holding a claim:** expired/stale claim is safely recoverable.
9. **Retryable dependency failure:** observable bounded backoff; no hot loop every 5 seconds indefinitely.
10. **Permanent conflict/invalid payload:** becomes an explicit terminal/actionable state; no infinite retry.
11. **Existing orphan rows:** migration/reconciliation closes or classifies all of them with zero unexplained residue.
12. **Role definition, role assignment/revocation and rollback:** all satisfy the same lifecycle invariants.

Database assertions after proof:

- zero terminal governed requests whose corresponding required operation remains unjustifiably non-terminal;
- zero due operations permanently unclaimable;
- zero duplicate active claims for one operation;
- zero malformed/unknown operation types left silently retrying;
- retry metadata and terminal state obey constraints.

### D. Migration proof

Run both:

- fresh database install through all Identity/DSH migrations;
- representative upgrade from a pre-cutover state with broad administration permissions, old DSH role references and representative canonical-intent states.

Verify:

- `identity-028..031` invariants remain valid;
- `dsh-1033..1035` invariants remain valid;
- any new forward migration is ordered/idempotent as governed;
- broad administration bindings/vocabulary are absent after cutover;
- old `dsh_admin_roles`/`role_id` authority is absent;
- projection write fences reject unauthorized direct writes;
- role versions/idempotency ledger survive upgrade;
- stale vocabulary alias rows/grants are migrated/deleted if RC2 confirms them obsolete;
- fresh and upgraded databases converge to the same canonical truth.

### E. Contract and frontend proof

Trace end-to-end for role definition, role assignment/revocation and rollback:

`UI action → controller → API contract → exact authorization → DSH domain → durable operation → Identity canonical writer → canonical readback → DSH terminal read model → UI readback`.

Prove:

- contracts/types match actual error/state semantics;
- no stale generated/manual client bypass exists;
- loading/denied/empty/error/conflict/reconciling/success states are clear;
- duplicate click is prevented while submitting;
- queued/reconciliation state is not presented as terminal failure or terminal success;
- canonical refresh/readback occurs after success;
- Arabic/RTL/accessibility behavior materially touched by the change remains correct;
- no local permission/status mapping invents business truth.

### F. Residue/deletion proof

Before deleting, inventory imports/callers/routes/contracts/tests/runtime references. After cutover prove zero legitimate references/reachability for all removed paths.

Required searches/checks include, as applicable:

- broad DSH admin actions: `administration.read`, `administration.manage`, `administration.approve`;
- local role authority: `dsh_admin_roles`, obsolete `role_id` fields/FKs;
- stale permission alias such as `platform.read` if canonical proof chooses `platform:read`;
- `legacy-grant:`, `legacy-revoke:`, `legacy-role-definition:` and their convenience wrappers;
- old split worker/finalization helpers superseded by RC1 treatment;
- stale OpenAPI/client/type names and removed schema references;
- TODO/FIXME/HACK or compatibility comments introduced/retained specifically to postpone this cutover.

A text search alone is not deletion authority; combine it with caller/import/route/schema/runtime reasoning.

## Focused test/verification stack

Use the smallest complete applicable set, then expand on failure:

- Identity Go unit/integration/database tests for RBAC definitions, vocabulary, idempotency, projection fences and permission resolution.
- DSH Go unit/integration/database tests for administration request states, canonical operations, worker claim/backoff/reconciliation, audit and exact permissions.
- OpenAPI/contract/provenance/generated-client consistency checks used by the repository.
- Control-panel typecheck/tests and journey-level interaction tests for affected administration surfaces.
- Runtime migration/startup/readiness proof with fresh candidate processes and schema provenance.
- Security/isolation adversarial tests for exact permission/maker-checker/replay/concurrency paths.
- Any repository guards that own affected contract/scope/provenance claims.

Do not weaken, suppress or exclude a failing check to obtain green. Validate whether a finding is material/false-positive and fix the real owner.

## Remote assurance on exact final SHA

On PR `#284`, require trustworthy current-SHA evidence for every materially applicable authority:

- **CodeQL** — deep/data-flow SAST for affected Go/JS/TS and applicable workflow analysis.
- **SonarQube Cloud** — quality/maintainability/coverage/security findings and quality gate for the same candidate.
- **Remote Security** — Gitleaks, OSV Scanner, Trivy and applicable workflow/config linters/security controls (`actionlint`, `zizmor`, `pinact`, ShellCheck, Hadolint, yamllint) through the canonical workflow.
- **Remote Analysis Evidence** — same-SHA readback/aggregation according to its governed role; it is not a replacement scanner.
- **Semantic/architecture review** — use the repository's proven OpenCodeReview/independent review path if enabled and exact-candidate evidence is obtainable; otherwise independent human/agent PR review must still close material review findings.

For every remote result record enough provenance to prove tool responsibility, effective scope, exact SHA, config/rules, run identity, conclusion/findings, freshness and suppression state.

At audit time there was no admissible current-SHA remote completion or PR review to reuse; final execution must obtain fresh evidence.

## PR and branch closure

Before ready-for-review or merge:

1. `c` HEAD equals the declared final candidate.
2. PR `#284` head SHA equals that candidate.
3. Compare against current `master`; classify every concurrent delta.
4. PR is mergeable without unauthorized conflict treatment.
5. No unresolved material review thread/finding remains.
6. Protected `tools/prompting/bthwani-orchestrator/**` divergence is either absent or resolved by an explicitly authorized Orchestrator-maintenance action outside this objective. Do not resolve it opportunistically here.
7. Required checks are successful and correspond to the exact candidate.
8. Only after the system closure below is proven may the draft PR be marked ready and merged, using expected-head SHA protection.

## Final re-audit / negative-space gate

After all treatment and after the last write:

`RE-PIN FINAL SHA → AUDIT → INSPECT → DIAGNOSE → ANALYZE affected cone → inspect negative space → re-rank roots`

Reconfirm:

- canonical ownership and authority boundaries;
- all writers/readers/consumers migrated;
- all request/operation states and transitions coherent;
- all failure/recovery/restart/concurrency paths proven;
- contracts and persisted data agree;
- no partial migration or stale runtime/process/artifact;
- no parallel authority/truth;
- no broken/orphan state;
- no known material finding;
- no unjustified compatibility/fallback/legacy residue;
- no regression in materially touched project-frame invariants;
- governance is reconciled only if newly proven durable truth requires it.

If a new material root appears, `CLOSED` is forbidden: rank it, treat the highest proven root and repeat.

## Closed-state definition

Only report `CLOSED` when all of the following are simultaneously true on the exact final candidate:

- RC1 lifecycle and recovery invariants are proven end-to-end;
- RC2 aliases/legacy helpers are either proven necessary with bounded compatibility or removed after consumer migration (the default target is removal);
- historical Identity/DSH authorization cutover has zero material missing writer/reader/consumer;
- DB fresh/upgrade and representative runtime readback pass;
- UI reflects operational truth including recovery;
- exact permission/security/separation-of-duties negatives pass;
- remote applicable assurance and independent review have no unresolved material finding;
- PR `#284` is clean/mergeable against current `master` without unauthorized Orchestrator mutation;
- final re-audit finds no known material defect or unjustified residue inside the Effective Scope.

Until then the correct state is not `CLOSED`.
