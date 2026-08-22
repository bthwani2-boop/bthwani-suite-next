# EXECUTION CONTRACT — Canonical Identity/DSH Authorization Final Closure

## Execution entry

`EXECUTE_CLOSE` must begin by re-pinning branch `c`, PR `#284` head SHA, and current `master`, then revalidating all material assumptions from `00-AUDIT-TRUTH.md` against live source and runtime truth.

This plan is handoff/evidence only, never Source of Truth or a scope ceiling.

Do not mutate `tools/prompting/bthwani-orchestrator/**` in this objective. Do not merge PR `#284` until the complete closure contract in `02-VERIFICATION-CLOSURE.md` is satisfied.

## Ordered root treatment

### 1. RC0 — Enforce Product/Security separation-of-duties server-side

Treat this first because it is the highest proven semantic/security root.

Canonical invariants already owned by Product Truth:

- maker != beneficiary;
- maker != checker;
- beneficiary != checker;
- rollback maker != rollback checker;
- rollback beneficiary != rollback checker;
- rollback source/original checker != rollback checker.

Required treatment:

1. Introduce one small DSH Administration domain-level separation-of-duties validator/helper with explicit intent-specific inputs; do not scatter inconsistent checks across handlers/UI.
2. Apply it to role-assignment/revocation review and rollback review before any canonical mutation is enqueued or Identity is called.
3. Preserve existing role-definition self-review prohibition and verify whether role-definition beneficiary semantics are applicable; do not invent a beneficiary where the Product model has none.
4. Return stable domain errors distinguishable from generic validation/version/dependency failures and map them through the existing HTTP/contract/frontend error path.
5. Ensure worker/replay code cannot bypass the same invariants merely because a durable intent already exists. Persist the checker identity required for replay/audit only if not already sufficient; do not create a second authorization source.
6. Keep UI prevention as usability only; backend remains authoritative.
7. Add focused adversarial tests proving beneficiary review and original-checker rollback review are denied even when the actor otherwise has exact checker permission.

Acceptance for RC0:

- beneficiary cannot approve or reject their own role assignment/revocation;
- original source checker cannot approve or reject rollback of their own decision;
- rollback beneficiary cannot check rollback;
- maker/checker negative cases remain enforced;
- no alternate route, worker or direct domain caller bypasses the checks.

### 2. RC1 — Rebuild canonical mutation lifecycle as one coherent governed operation

Required coherent lifecycle:

`maker/checker request → durable canonical operation → deterministic claim → Identity idempotent mutation → canonical readback → atomic DSH request + operation finalization → user/read-model readback`

Required invariants:

1. A governed request cannot be terminal `approved` while required canonical-operation bookkeeping remains non-terminal because of split local transactions.
2. A canonical operation cannot remain indefinitely retryable after canonical success and governed finalization.
3. Every mutation keeps one stable operation identity/idempotency key across HTTP retries, worker replay and process restart.
4. Identity remains the sole role/permission mutation authority; no local fallback/shadow role writer may be introduced.
5. Multi-replica workers must have deterministic claim/lease ownership.
6. Retryable upstream failures use bounded/exponential scheduling with a cap; no unbounded 5-second hot loop.
7. Unknown-result windows are resolved by stable replay/canonical readback, not by fabricating success or minting a new mutation identity.
8. Permanent version/idempotency/contract conflicts become explicit terminal/actionable reconciliation states.
9. Audit history remains append-only/redacted and correlation/idempotency provenance is preserved.

Expected root-correct treatment shape after live reinspection:

- add only forward DSH migration(s) if schema changes are required; never rewrite applied migrations;
- evolve `dsh_admin_canonical_mutation_intents` into a real outbox/saga operation record with explicit non-terminal/terminal state, attempt scheduling and claim/lease metadata as needed;
- atomically finalize governed request status and canonical-operation terminal state inside one DSH transaction after Identity result/readback is proven;
- if Identity succeeded but DSH died before local finalization, replay the same idempotency key and close both local states deterministically;
- use row claim/locking semantics safe for multiple replicas, e.g. transactional claim with `FOR UPDATE SKIP LOCKED` or an equivalent proven mechanism;
- classify and reconcile all existing pending/failed/orphan rows during migration/cutover;
- expose privacy-safe reconciliation state/counts through governed administration readback/diagnostics;
- make synchronous and worker execution call the same finalization/business path rather than duplicating transition rules.

### 3. RC2 — Remove residual aliases and superseded RBAC helpers

#### `platform.read` vs `platform:read`

- prove the live canonical spelling from actual consumers;
- migrate any legitimate consumer to one action;
- forward-migrate/reconcile stale vocabulary, role bindings, direct grants and projections if persisted;
- remove the stale bootstrap permission and stale tests/comments;
- final invariant: one capability → one canonical action.

#### Legacy RBAC helpers

Inventory all callers of:

- Identity `PermissionEnforcer.UpsertRoleDefinition(...)` legacy helper;
- DSH `Client.GrantRole(...)` and `Client.RevokeRole(...)` legacy helpers.

Migrate legitimate callers to explicit versioned/idempotent APIs with stable operation identity, or delete the wrappers if zero legitimate callers remain. Do not preserve `legacy-*` operation IDs merely as indefinite compatibility.

### 4. Re-prove the historical Identity/DSH authorization cutover

Do not rewrite working treatment; re-audit it:

- Identity owns exact vocabulary, role definitions, actor-role assignments and resolution;
- DSH has no local role registry/authority;
- broad `administration.read/manage/approve` vocabulary/bindings/consumers are absent after migration;
- every administration endpoint has exact server-side authorization;
- all separation-of-duties invariants now hold server-side;
- payout verify/deactivate remain WLT-financial operations with DSH only routing/enforcing exact authorization;
- UI never owns role/permission truth or fabricates post-mutation success.

## Data migration and reconciliation contract

For every persisted change use:

`forward expand → classify existing rows → deterministic backfill/reconcile → switch writer/worker/readers → canonical readback → prove zero old writer → contract/delete obsolete path`

Required upgrade fixtures:

- no canonical intents;
- retryable pending/failed intents;
- Identity already succeeded while request remains pending;
- request approved while intent remains non-applied;
- stale/malformed/unknown operation payload/type;
- old alias vocabulary/grants;
- source approval where rollback original-checker identity must remain available for the new separation check.

Fresh install and representative upgrade must converge to the same invariants.

## Contract/API/frontend contract

For role definition, assignment/revocation and rollback, trace:

`UI → controller → API contract → exact auth → separation-of-duties → DSH durable operation → Identity canonical writer → canonical readback → DSH terminal model → UI readback`.

Required UX semantics:

- distinct permission denial vs separation-of-duties denial vs version conflict vs dependency failure vs reconciling vs terminal failure vs success;
- submitting state prevents duplicate clicks;
- queued/reconciling work is not reported as terminal success or generic terminal failure;
- canonical refresh after terminal success;
- no local optimistic role/permission state;
- existing Arabic/RTL/accessibility and component-system behavior preserved.

If contracts/error enums/types change, update their canonical owner and regenerate/rebind derived clients through repository-owned tooling; do not hand-edit generated truth.

## Testing contract

Add focused tests at minimum for:

### Separation-of-duties

1. maker cannot review own assignment/revocation request;
2. beneficiary cannot review their assignment/revocation request;
3. rollback maker cannot review own rollback request;
4. rollback beneficiary cannot review rollback;
5. original source checker cannot review rollback;
6. unrelated exact-permission checker can review;
7. negative checks apply on both approve and reject decisions.

### Lifecycle/reconciliation

8. Identity unavailable → durable retry with bounded backoff;
9. restart before Identity call → worker applies once;
10. Identity success then process dies before DSH finalization → same replay result and exactly-once local finalization;
11. request/operation terminal state cannot diverge;
12. two workers cannot concurrently own one claim;
13. stale lease recovers safely;
14. permanent conflict stops hot retry with actionable state;
15. role-definition, assignment and rollback all use same lifecycle invariants;
16. migration reconciles representative legacy/orphan rows.

## Security and privacy contract

- fail closed when Identity authorization dependency is unavailable;
- no broad role/operator bypass;
- exact service/surface/action/scope remains enforced;
- no direct projection/local-role write;
- no sensitive operation payload, phone/document/session/secret value appears in audit/diagnostics/errors;
- replay/concurrency cannot create duplicate effective grants/revokes;
- self/beneficiary/original-checker prohibitions are enforced in the domain, not presentation only.

## Tool/evidence execution contract

Use tools selectively as evidence authorities, never as Product Truth.

### CodeQL

- run canonical `.github/workflows/codeql.yml` on exact final PR head;
- require all applicable language analyses to succeed;
- inspect/open-alert evidence, not workflow conclusion alone;
- no unresolved material exact-candidate CodeQL alert may remain.

### SonarQube Cloud

- run canonical `.github/workflows/sonarqube.yml` on exact final PR head;
- require exact revision and `Quality Gate = OK` (`sonar.qualitygate.wait=true` is canonical config);
- inspect unresolved issues, material impacts, coverage, duplication and security hotspots;
- every material issue/hotspot must be fixed or proven false/non-applicable with grounded evidence, never silently suppressed to obtain green.

### Remote Security

Require successful exact-candidate run of canonical `security-remote.yml`: Gitleaks, OSV, Trivy, actionlint, zizmor, pinact, ShellCheck, Hadolint, yamllint and analysis-authority/config checks.

### OpenCodeReview / semantic review

- pin exact PR diff/base/head;
- apply `.opencodereview/rule.json` bounded rules;
- record included/excluded paths and grounded Critical/High/Medium issues;
- OCR remains advisory and cannot self-approve the author's work;
- if OCR execution is unavailable in the host, obtain an equivalent independent semantic review and record the limitation; do not fabricate an OCR result.

### CodeRabbit / Codex Security

Use if execution backend is available. Treat CodeRabbit as independent semantic PR review and Codex Security as diff security coverage. Never relabel manual review as those tools.

## Repository/artifact disposition

KEEP/EVOLVE:
- Identity normalized RBAC and operation ledger;
- DSH maker/checker/audit records;
- one canonical DSH operation/outbox lifecycle;
- exact permission gate;
- governed contracts/controllers/UI.

DELETE_REQUIRED after proof:
- stale permission alias(es);
- superseded legacy RBAC convenience helpers;
- obsolete split-intent lifecycle branches/helpers;
- stale tests/comments/contract names;
- any reachable broad/local/shadow authorization path.

TEMPORARY:
- this three-file handoff directory; retire it only according to Orchestrator closure rules.

PROTECTED:
- `tools/prompting/bthwani-orchestrator/**`.

## Safe parallelism

- RC0 backend invariant/test work precedes UX-only adjustments.
- RC1 schema/domain/worker contract is one overlapping work unit with one writer.
- RC2 consumer discovery may run in parallel read-only; destructive cleanup follows proof.
- remote scanners/reviews may run in parallel on one immutable candidate.
- one integration/push owner reconciles all concurrent deltas before final push.

## PR/master integration contract

Use existing PR `#284` only.

Before ready/merge:

1. PR head equals declared final candidate SHA;
2. compare against current `master` and classify concurrent delta;
3. PR is mergeable without unauthorized Orchestrator conflict resolution;
4. exact PR-head CI + CodeQL + Sonar + Remote Security + semantic review evidence is closed;
5. all material review threads/findings are resolved;
6. merge uses `expected_head_sha` protection;
7. after merge, re-pin landed `master` SHA and run/read **Remote Analysis Evidence** there because that workflow is branch-push/default-branch readback authority, not a substitute for pre-merge PR evidence;
8. if landed-SHA readback reveals a material issue, `CLOSED` is revoked/forbidden and treatment resumes.

## Per-root acceptance

- RC0: all Product Truth separation invariants are enforced server-side with negative tests and no bypass.
- RC1: no request/operation divergence, no unowned duplicate workers, bounded retry, historical rows reconciled, recovery visible.
- RC2: one canonical vocabulary per capability and zero unjustified legacy helper consumer/reachability.
- Historical cutover: every writer/reader/consumer uses Identity canonical authority with no broad/local/shadow truth.
- Integration: exact PR-head evidence is clean, PR is mergeable, and exact landed-master evidence is clean after merge.
