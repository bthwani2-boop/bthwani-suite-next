# EXECUTION CONTRACT — Canonical Identity/DSH Authorization Final Closure

## Execution entry

`EXECUTE_CLOSE` must start by re-pinning branch `c` and revalidating all material assumptions from `00-AUDIT-TRUTH.md`. The plan is evidence/handoff, never Source of Truth and never a scope ceiling.

Do not mutate `tools/prompting/bthwani-orchestrator/**` in this execution. Do not merge PR `#284` until final closure criteria in `02-VERIFICATION-CLOSURE.md` are met.

## Ordered root treatment

### 1. RC1 — Rebuild the canonical mutation lifecycle as one coherent governed operation

Treat the highest proven root first. The correct design must make the following one coherent lifecycle:

`maker/checker request → durable canonical operation → claimed attempt → Identity idempotent mutation → canonical readback → governed request finalization → operation terminal state → user/read-model readback`

#### Required invariants

1. A governed request cannot be terminal `approved` while its canonical-operation bookkeeping is non-terminal because of an avoidable split transaction.
2. An operation cannot remain indefinitely retryable after its governed request is already terminal and canonically applied.
3. Every canonical mutation uses one stable operation identity/idempotency key across HTTP retries, process restart and worker replay.
4. Identity remains the sole authorization writer. DSH must not introduce a local fallback writer, shadow assignment, local role registry or compatibility truth.
5. Retry workers must have deterministic ownership/claim semantics safe for multiple DSH replicas.
6. Retry scheduling must be bounded/backed off for dependency failure; no 5-second unbounded hot loop.
7. Unknown-result windows are reconciled by canonical readback/idempotent replay, not by fabricating success or creating a second mutation identity.
8. Required audit history remains append-only/redacted and correlation/idempotency provenance is preserved.

#### Preferred root-correct treatment shape

The executor must choose the smallest design that satisfies the invariants after inspecting live schema/runtime. The expected treatment is:

- add a forward DSH migration if schema changes are required; never rewrite applied migrations;
- evolve `dsh_admin_canonical_mutation_intents` into a real outbox/saga operation record with explicit terminal/non-terminal semantics and, where needed, claim/lease metadata, attempt scheduling and last-error metadata;
- make request-finalization and operation-terminalization atomic in the same DSH transaction once canonical Identity readback proves the desired result;
- if a crash occurs after Identity success but before DSH finalization, allow another claimant to replay the same stable idempotency key and then atomically finalize both local states;
- use row locking/claiming appropriate for multi-replica execution (for example a transactional claim with `FOR UPDATE SKIP LOCKED` or an equivalent proven mechanism) rather than allowing all replicas to execute the same due row;
- implement bounded/exponential backoff with a sensible cap for retryable upstream failure, while distinguishing permanent/contract conflicts from retryable availability failures;
- reconcile pre-existing rows during migration/cutover: canonical readback plus request state must classify them as applied, retryable, terminal failed/conflicted or invalid; no stale orphan rows may be silently retained;
- ensure failure/recovery state is queryable through the governed administration read model/diagnostics without leaking secrets/PII;
- present operators with an unambiguous state such as `pending canonical application` / `reconciling` / `applied` / actionable terminal conflict as appropriate. Do not claim success before the committed governed + canonical readback state exists.

#### Writer/reader migration

- Writer: all role-definition/assignment/rollback approval paths must use the single canonical operation lifecycle.
- Worker: must consume only claimable due operations and finish through the same finalization function/path as synchronous execution; do not duplicate business transition logic.
- Readers: administration queues/diagnostics/readback must understand any newly explicit operation/reconciliation state.
- Consumers: control panel must map recovery states and retryable/terminal errors consistently; contracts/OpenAPI/types must be updated from their canonical owner and regenerated/rewired if generated bindings apply.

#### Cleanup required after cutover

Delete/simplify obsolete helpers or branches that represent the previous split lifecycle. Do not retain an old worker path as a fallback. Remove redundant scheduling/state fields only after all consumers are migrated and persisted rows reconciled.

### 2. RC2 — Eliminate residual authorization aliases and superseded helpers

Perform consumer/reference proof before deletion.

#### `platform.read` versus `platform:read`

- Establish the canonical platform permission action from live service/contract consumers.
- Migrate any legitimate consumer to that one spelling.
- Add a forward data migration/reconciliation if the stale action already exists in `identity_permission_vocabulary`, role permissions, direct grants or materialized projections.
- Rebuild/reconcile affected projections through the canonical Identity mechanism.
- Remove the stale vocabulary binding/action and remove the duplicate bootstrap permission from code/tests.
- Final invariant: one canonical action per capability; no permanent alias.

#### Legacy source-compatible RBAC helpers

Inventory callers of:

- Identity `PermissionEnforcer.UpsertRoleDefinition(...)` legacy helper.
- DSH `Client.GrantRole(...)` and `Client.RevokeRole(...)` legacy helpers.

For each:

- if a legitimate caller remains, migrate it to the explicit versioned/idempotent canonical API with a stable operation identity;
- otherwise delete the helper and stale tests/comments;
- do not leave `legacy-*` idempotency identity generators reachable merely for compatibility without a proven mixed-version dependency and explicit removal trigger.

### 3. Complete closure of the historical authorization cutover

Re-audit the already-treated historical root instead of rewriting it:

- Identity owns exact vocabulary, role definitions, grants and resolution.
- DSH has no local role registry/table/authority.
- broad `administration.read/manage/approve` consumers/bindings are absent after migration;
- every administration endpoint has exact server-side authorization;
- maker/checker/beneficiary and rollback-separation invariants hold server-side regardless of UI visibility;
- payout verify/deactivate remain WLT-financial operations with DSH only enforcing exact authorization and routing;
- no screen/client owns permission truth or fabricates post-mutation success.

If a material missing writer/reader/consumer is discovered, expand only through that proven relation and treat the actual owner; do not create a repository sweep.

## Data migration and reconciliation contract

For every persisted change follow:

`expand/forward migration → classify existing rows → backfill/reconcile → switch writer → switch worker/readers → canonical readback → prove zero old writer → contract/remove obsolete path`

Required upgrade cases include:

- DB with no pending canonical intents;
- DB with retryable pending/failed intents;
- request still pending after Identity already succeeded;
- request approved but intent non-applied (the proven orphan window);
- stale/invalid operation type or malformed payload;
- old alias vocabulary/grants if present.

Fresh install and representative upgrade must converge to the same invariants.

## Security and authorization contract

- Fail closed when Identity is unavailable for authorization checks.
- No broad operator bypass.
- Preserve exact service/surface/action/scope semantics.
- Preserve self-grant/self-review/beneficiary/original-checker rollback prohibitions.
- Internal service authentication and trusted operator context remain server-owned.
- Do not expose operation payloads, phone/document/session/secret data in diagnostics/audit/errors.
- Replays and concurrent workers must not create duplicate role mutations or a new effective grant/revoke identity.

## UX contract

For each maker/checker/recovery journey the surface must have:

- clear entry/context and exact allowed actions;
- client validation that matches, but never replaces, backend validation;
- submitting/loading state preventing duplicate clicks;
- distinct denied, validation, conflict/stale, Identity unavailable, reconciling/queued, terminal failure and success/readback states where materially applicable;
- no generic error that conceals an operation known to be durably queued for retry;
- canonical refresh/readback after terminal success;
- no local optimistic role/permission truth;
- Arabic/RTL and existing component-system consistency preserved.

## Testing to add during treatment

At minimum add focused tests proving:

1. intent persisted + Identity unavailable → retry scheduled with bounded backoff;
2. restart before Identity call → worker applies once;
3. Identity succeeds then process fails before DSH finalization → replay returns same Identity result and finalizes exactly once;
4. DSH request finalization + intent terminal state cannot diverge;
5. two workers/replicas cannot concurrently own the same claim;
6. stale lease is safely recoverable if a worker dies;
7. permanent version/idempotency conflict becomes a clear terminal/reconciliation state rather than hot retry;
8. role definition, assignment and rollback all use the same lifecycle invariants;
9. exact permission denial and maker/checker negative cases remain intact;
10. migration reconciles representative legacy/orphan rows.

## Repository and artifact disposition

- **KEEP/EVOLVE:** canonical Identity RBAC normalized graph, operation ledger, DSH maker/checker records, canonical mutation operation/outbox, exact permission gate, governed UI/controllers/contracts.
- **DELETE_REQUIRED after proof:** stale permission alias(es), superseded legacy RBAC convenience helpers, obsolete split-intent lifecycle branches, obsolete tests/comments/references, any reachable broad administration vocabulary path.
- **TEMPORARY:** this plan directory. Its retirement at final closure is governed by the Orchestrator; do not use it as a progress database.
- **PROTECTED / NO MUTATION:** `tools/prompting/bthwani-orchestrator/**`.

## Dependency ordering and safe parallelism

Safe parallel work is limited to independent evidence/test preparation that does not create two writers for the same files/state. RC1 schema/domain/worker contract is the parent and must be stabilized before UI recovery semantics and cleanup. RC2 consumer inventory may be investigated in parallel but destructive cleanup occurs only after consumer proof. One branch push owner must reconcile concurrent deltas before final push.

## PR / master integration contract

Use existing PR `#284`; do not create a duplicate.

Before declaring it ready:

1. re-pin its `head_sha` to the exact final candidate;
2. ensure it is mergeable against current `master` without unauthorized Orchestrator mutation;
3. resolve any still-live protected Orchestrator divergence only through a separately authorized Orchestrator-maintenance path, never by opportunistic conflict resolution in this objective;
4. obtain exact-candidate CI/security/quality and independent review evidence;
5. keep draft status until the complete closure gate passes;
6. merge only with expected-head SHA protection after `CLOSED` is proven.

## Per-root acceptance

- **RC1 accepted only when:** no reachable split transition can create request/intent divergence; all historical operation rows reconcile; retry is multi-replica safe and bounded; UI/read model represents recovery truth; crash/restart/concurrency tests pass.
- **RC2 accepted only when:** one vocabulary per capability and zero unjustified legacy helper consumers/references remain.
- **Historical cutover accepted only when:** every affected writer/reader/consumer is on Identity canonical authority and zero broad/local/shadow authorization path remains.
- **Integration accepted only when:** PR exact final SHA has trustworthy remote evidence, review closure and authorized conflict state suitable for merge.
