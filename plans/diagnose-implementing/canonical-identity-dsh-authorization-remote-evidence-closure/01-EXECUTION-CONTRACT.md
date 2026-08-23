# Canonical Identity / DSH Authorization + Remote Evidence — Execution Contract

PLAN_ID: `canonical-identity-dsh-authorization-remote-evidence-closure`  
SOURCE_AUDIT_HEAD: `a19a9874961bc8a1d98f8b9b8cdfa1de476c0d33`  
PHASE_TO_EXECUTE: `EXECUTE_CLOSE`  
STATUS: `READY_FOR_EXECUTION`

## 1. Execution law

Execution must re-pin live branch `c` before the first Target-System write. Reuse this handoff only while its material assumptions remain valid. Any new source change invalidates only its affected cone and must be re-audited before mutation.

Treat roots in descending systemic order. Do not close a downstream symptom while a higher authority/root remains reachable. Do not create a second executor, queue, compatibility layer, permission vocabulary, review engine, or evidence authority.

No `CLOSED` state is legal until `02-VERIFICATION-CLOSURE.md` is satisfied on the exact final Source candidate after the last source mutation.

## 2. Root 1 — collapse authorization mutation to one canonical executor

### 2.1 Required ownership model

Keep these authorities:

- **Identity**: role definitions, permission vocabulary/bindings, actor-role assignments, effective authorization.
- **DSH Administration**: maker/checker request state, durable canonical mutation intent, orchestration/reconciliation, audit.
- **One DSH canonical intent executor/finalizer**: the sole implementation that crosses the Identity mutation boundary for a governed DSH request and finalizes its DSH workflow state.

Delete the current parallel implementation in synchronous review functions after all callers use the canonical executor.

### 2.2 Canonical execution API

Create/refactor one internal execution path that accepts the durable intent identity, claims/fences that exact intent and calls the existing reconciler logic. Both entry points must converge here:

1. synchronous review/request path after durable intent persistence;
2. background retry worker.

The synchronous path may wait for the canonical executor to complete, but it may not directly call `GrantRoleWithIdempotency`, `RevokeRoleWithIdempotency` or `UpsertRoleDefinition` as an independent execution implementation.

The canonical executor must support at least:

- `role-assignment`;
- `role-rollback`;
- `role-definition-upsert`.

### 2.3 Fenced claim semantics

Current `lease_owner` + expiry is insufficient unless finalization is fenced against stale ownership. Implement a durable execution generation/token that changes on every successful claim. Acceptable canonical forms include a monotonic `lease_generation` or unique `lease_token`, but there must be one authoritative field and no parallel fencing mechanism.

Claim requirements:

- lock/select due intent using database concurrency control;
- write owner + expiry + fencing generation/token atomically;
- return that exact fence to executor;
- only the owner holding the current fence may transition retry/terminal/applied state;
- request finalization must predicate on the same current fence in the same DB transaction;
- a stale executor whose lease expired or was superseded must fail to finalize even if its remote call later returns.

Do not rely on Identity idempotency as a substitute for local fencing.

### 2.4 Lease timing / renewal

Prove one of these root-correct invariants:

- lease lifetime is strictly longer than the bounded maximum Identity pre-readback + mutation + post-readback + local-finalization duration with safety margin; or
- the executor durably renews the same fenced lease while active.

A context timeout equal to lease duration without safety margin is not sufficient proof.

### 2.5 Canonical remote mutation behavior

For every intent:

1. validate payload against the durable source request;
2. validate maker/checker/beneficiary separation at the use-case/domain owner;
3. perform canonical Identity pre-readback;
4. if canonical truth already matches desired state, skip remote mutation and proceed to reconciliation;
5. otherwise call the canonical Identity API with stable request-derived idempotency;
6. perform canonical Identity post-readback;
7. fail/retry if readback does not converge;
8. atomically finalize DSH request + intent + audit under the same active fence.

No UI/local status may make a remote mutation successful by inference.

### 2.6 Retry and terminal classification

Retain bounded backoff, but classify failures semantically:

- Identity/network/unavailability/readback transient failures -> retryable;
- invalid durable payload/source mismatch/unsupported operation -> terminal and auditable;
- stale lease/fence -> executor aborts without mutating final state;
- optimistic request conflict after canonical mutation -> reconcile through canonical readback and the same intent, never create a second mutation path;
- missing source request or irreconcilable source corruption -> terminal/manual-repair state with explicit diagnostic evidence.

Do not convert uncertainty to success, and do not silently drop an intent.

### 2.7 Batch isolation

`RetryPendingCanonicalMutations` / worker processing must isolate independent intents. One retryable or terminally malformed intent must not abort the entire claimed batch before unrelated intents are dispositioned. Preserve per-intent failure evidence and aggregate operational diagnostics.

### 2.8 Atomic finalization

For each operation type, consolidate finalization into one owner transaction. The transaction must include, where applicable:

- guarded request status/version update;
- guarded intent `applied`/retry/terminal transition;
- lease/fence release;
- audit append;
- any derived reconciliation metadata required for deterministic readback.

Delete duplicate direct-finalization SQL from `approvals.go`, `rollback.go`, `role_requests.go` after migration to this owner.

## 3. Data migration / reconciliation / cutover

Before deleting old behavior:

1. inventory existing `dsh_admin_canonical_mutation_intents` states, attempts, leases and corresponding source request statuses;
2. add the canonical fencing field through one migration if not already present;
3. backfill existing rows into an unambiguous safe state;
4. classify existing combinations such as `request=approved + intent!=applied` by canonical Identity readback rather than guessing;
5. clear/repair stale leases only under deterministic expiry/fence rules;
6. prove no live source request becomes unreachable after cutover;
7. switch synchronous consumers to the one executor;
8. switch worker to the same executor contract;
9. only then delete parallel direct execution/finalization code.

Migration must be forward-only and fail-closed. Do not retain permanent compatibility columns/state paths merely to ease cutover.

## 4. UX / API / consumer cutover

### 4.1 Synchronous API semantics

A successful API response for governed authorization mutation requires:

- canonical intent execution completed;
- canonical Identity post-readback matches desired role/definition truth;
- DSH request and intent finalized under the active fence.

If the operation is retryable/reconciliation-pending, return an explicit non-success/pending/reconciliation contract rather than pretending success. Preserve idempotent retry behavior for clients.

### 4.2 Control Panel

Affected administration surfaces must consume canonical server state and expose materially reachable states:

- pending/review required;
- executing/reconciliation pending if externally visible;
- retryable failure/unavailable;
- terminal failure requiring operator attention;
- rejected;
- approved only after canonical confirmation.

After successful role mutation, refresh the canonical role/staff/permission-derived state rather than mutating a local optimistic authority.

Remove any local-only success inference or stale role cache that can contradict Identity.

## 5. Root 2 — OpenCodeReview trusted execution boundary

### 5.1 Canonical trust invariant

The review engine, Node/runtime setup, package-manager cache/bootstrap and privileged Copilot token context must be determined exclusively by trusted workflow/default-base content. Candidate repository content is review data only.

### 5.2 Required restructuring

Restructure `.github/workflows/open-code-review.yml` so that:

1. trusted workflow source resolves base/head identifiers;
2. trusted runtime and pinned review tools are installed **before** candidate-controlled repository state can influence setup;
3. package-manager cache is disabled for the privileged review runtime, or is proven to depend only on trusted tool manifests; candidate package metadata/lockfiles may not key or populate it;
4. candidate commits are fetched/read as Git objects or isolated worktree/data after trusted bootstrap; do not execute candidate package scripts, actions, hooks, configs or binaries;
5. `.opencodereview/rule.json` remains loaded from the trusted base authority;
6. diff and resolved review context remain explicitly untrusted data;
7. Copilot built-in MCP/tools remain disabled for semantic review unless a separately proven minimal capability is required;
8. `copilot-requests` or replacement authentication is exposed only to the trusted host-review step and never to candidate-controlled execution;
9. workflow permissions are minimized per job where GitHub Actions permits it.

If the pinned actionlint version does not recognize a GitHub-supported `copilot-requests` permission, resolve the root by updating the canonical analyzer/toolchain to a version that understands the current GitHub permission model. If no supported analyzer version exists, redesign OCR authentication using a supported GitHub mechanism. Do not suppress a real trust-boundary check merely to make actionlint green.

### 5.3 Preserve evidence quality

OpenCodeReview remains fail-closed:

- scope resolution must succeed;
- if reviewable files > 0, host model must actually execute;
- normalized result must be valid structured JSON;
- `files_reviewed` must equal deterministic reviewable count;
- policy adjudication must complete;
- complete artifact/provenance must upload;
- engine failure/0 tokens may never be treated as zero findings.

## 6. Root 3 — complete Remote Security evidence without weakening fail-closed behavior

### 6.1 Current canonical analyzer set

Preserve the current canonical `c` tool set unless new current evidence proves a change is required:

- Gitleaks
- OSV Scanner
- Trivy
- actionlint
- zizmor
- pinact
- ShellCheck
- Hadolint
- yamllint

Do not import parallel-only Regal/Conftest policy machinery merely because PR #304 experimented with it.

### 6.2 Evidence-complete execution

Independent analyzers must execute independently. Preferred structures:

- separate jobs with final aggregate `needs` adjudication; or
- explicitly `continue-on-error` analyzer steps that each record outcome/log/evidence, followed by a guaranteed aggregate fail step.

The final workflow must still fail if any required analyzer fails. The change is evidence completeness, not permissiveness.

Every analyzer must record at least:

- tool/version;
- exact candidate SHA;
- scope/targets where material;
- outcome;
- findings summary;
- raw/log artifact or durable job log provenance.

The aggregate result must distinguish `PASS`, `FAIL`, `NOT_RUN`, `BLOCKED`, and intentional `N/A_PROVEN` rather than collapsing missing execution into pass.

## 7. SonarQube current-source disposition

Do **not** reintroduce the historical covdata workaround. Current source uses one valid Go coverprofile per module and `go tool cover -func` validation before scanner.

At execution time:

1. preserve this single canonical coverage representation;
2. run exact-candidate remote Sonar after final source changes;
3. if Go coverage generation reproduces a failure, inspect the exact failing module/log and fix that root rather than bypassing coverage;
4. scanner must execute only with validated non-empty coverage reports;
5. Quality Gate result and issue/security-hotspot details must be retrieved and analyzed, not inferred from workflow success.

A stale PR #300/#301 pass or PR #304 Security Rating B must not be copied onto current `c` without exact evidence.

## 8. Source-fixed residues — final cutover obligations

Even though current source shows these previous roots repaired, final execution must prove zero residual consumers/data before closure:

- no `platform.read` authorization alias; canonical survivor is `platform:read`;
- no obsolete `legacy-grant:` / `legacy-revoke:` helper path or hidden idempotency authority;
- no broad-role authorization bypass in administration;
- no old readiness `latest migration` duplicated constant/query path;
- no privileged candidate-owned collector path in Remote Analysis Evidence;
- no old GitHub Models OpenCodeReview engine path;
- no duplicate authorization executor/finalizer code after cutover.

If a residual reference is discovered in the affected cone, migrate its real consumer/data first, then delete the obsolete path in the same Root-Cause Closure.

## 9. Required tests during execution

At minimum add/repair focused tests proving:

### Authorization / orchestration

- maker != beneficiary != checker pairwise;
- rollback checker != original source checker;
- direct use-case call cannot bypass separation;
- synchronous review and worker use the same executor implementation;
- two concurrent workers cannot own the same fence;
- synchronous execution racing a worker cannot double-finalize;
- stale executor cannot finalize after lease expiry/reclaim;
- Identity mutation succeeds then local transaction fails -> retry/reconciliation converges without duplicate authority;
- local request remains pending while remote succeeded -> readback converges and finalizes;
- Identity unavailable -> bounded retry, no false success;
- post-mutation readback mismatch -> no approval success;
- one failed intent does not block unrelated batch intents;
- terminal malformed intent is auditable and does not retry forever.

### OCR trust

- candidate `package.json`/lockfile cannot change privileged Node/tool bootstrap/cache behavior;
- candidate cannot replace trusted rule file;
- exact head/base provenance is enforced;
- no candidate code executes during semantic review preparation;
- failed host/model/normalizer/policy/artifact produces fail-closed result.

### Remote Security

- force one analyzer to fail and prove all other independent analyzers still execute/record outcomes;
- aggregate remains failed;
- missing analyzer output is itself a failure unless `N/A_PROVEN` by canonical scope.

## 10. Execution ordering / safe parallelism

Safe independent work may proceed in parallel after live-head revalidation:

- authorization single-executor implementation + DB migration/tests;
- OCR trust-boundary restructuring;
- Remote Security evidence-completeness restructuring.

Use one integration authority on branch `c`. Revalidate collisions before each write. Sonar/CodeQL/Semgrep/OCR/security/CI exact-candidate runs happen after the final relevant source mutation, not before as substitute evidence.

If any tool exposes a higher Product/System/Semantic root, preempt only the dependent cone, update the live treatment, and continue independent proven work.

## 11. Prohibited execution outcomes

The following are not acceptable fixes:

- keeping synchronous direct mutation as fallback beside worker reconciliation;
- adding a second queue or second retry state machine;
- extending lease duration without fencing and calling the race closed;
- swallowing finalization errors after remote success;
- optimistic UI success before canonical readback;
- disabling CodeQL/actionlint findings without resolving the trust boundary;
- disabling package cache warnings while candidate state still controls trusted bootstrap;
- removing a security analyzer because it fails;
- fail-fast Remote Security that hides later analyzer outputs;
- accepting a stale/different-SHA scanner result;
- bypassing Sonar coverage or Quality Gate;
- importing parallel-branch toolchain residue as new canonical truth without current evidence;
- documentation-only closure.

## 12. Completion handoff

After implementation, migration, consumer cutover, cleanup and exact-candidate tool execution, evaluate only `02-VERIFICATION-CLOSURE.md` against the final Source candidate. No implementation claim is complete merely because code compiles/tests locally or because a historical tool result is green.
