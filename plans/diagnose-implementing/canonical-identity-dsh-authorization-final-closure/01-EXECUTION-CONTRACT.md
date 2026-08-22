# Canonical Identity / DSH Authorization — Execution Contract

PLAN_ID: `canonical-identity-dsh-authorization-final-closure`  
REPOSITORY: `bthwani2-boop/bthwani-suite-next`  
TARGET_REF: `c`  
AUDITED_SOURCE_HEAD: `262a80ad889963e8d950178c075b3272176e2b5c`  
PHASE_TO_EXECUTE: `EXECUTE_CLOSE`  
SOURCE_OF_TRUTH: `00-AUDIT-TRUTH.md`  
BRANCH_RULE: `Execute on branch c only; do not create an implementation branch.`

## 1. Execution law

At `EXECUTE_CLOSE` start:

1. resolve the newest real `c` HEAD;
2. reread `tools/prompting/bthwani-orchestrator/00-ORCHESTRATOR.md` and governed modules from that exact HEAD;
3. compare the new HEAD to `AUDITED_SOURCE_HEAD`;
4. prove that any intervening changes are only plan-document mutations or re-audit every material source delta before writing source;
5. pin one candidate SHA and keep all mutation/evidence tied to it;
6. fix the highest proven root from its canonical owner, migrate all consumers, verify, re-audit, re-rank, and repeat;
7. after the final source change, rerun every required exact-candidate verification tool; any later source mutation invalidates those results and requires rerun.

No `CLOSED` status is legal while a material finding, unexecuted migration, old authority, failed/missing exact-candidate tool, unresolved PR review, or unproven negative-space condition remains.

## 2. Parallelism and integration authority

One integration authority owns branch `c`. Parallel work is allowed only for independently writable cones with no file/data/schema collision.

The first safe parallel lanes are:

- **Lane A — verification infrastructure:** repair the proven Sonar Go coverage blocker in `.github/workflows/sonarqube.yml` and its focused tests/validation;
- **Lane B — authorization SoD:** repair maker/beneficiary/checker invariants in DSH administration and focused tests.

Do not parallelize schema/state-machine changes with other mutations in the same DSH administration/data cone. Lane B must merge into the single integration trunk before RC-1 lifecycle restructuring begins if there is any shared file collision.

## 3. Batch A — repair Sonar remote verification blocker first

### Source of fix

`.github/workflows/sonarqube.yml` and only helper/test files already justified by that workflow.

### Required treatment

1. Remove the invalid conversion path that concatenates `go test -coverprofile` legacy text files and feeds them to `go tool covdata textfmt`.
2. Choose exactly one valid Go coverage representation:
   - use a single valid legacy coverprofile if repository/module topology permits a correct unified command; or
   - generate real covdata directories via `GOCOVERDIR` and convert them with `go tool covdata textfmt`.
3. If multiple profiles must be combined, preserve exactly one `mode:` header and merge only data rows with deterministic, collision-free paths; never key temporary files only by package basename.
4. Assert that the resulting report exists and is non-empty.
5. Parse/validate it with the relevant Go coverage tool before the Sonar scanner.
6. Keep all failures fail-closed; do not skip Go coverage, mark it continue-on-error, substitute an empty report, or downgrade the Quality Gate.
7. Run Sonar remotely on the exact candidate and record:
   - workflow/run identity;
   - resolved candidate SHA;
   - project key;
   - scanner completion;
   - coverage import evidence;
   - Quality Gate status and conditions;
   - issues/hotspots materially affecting this cone.

### Exit criterion

The historical failure mechanism is no longer reachable and a fresh exact-candidate Sonar run reaches the scanner and Quality Gate successfully. If Sonar reveals a material product/source finding, that finding preempts closure and is routed to its real source owner.

## 4. Batch B — RC-0 Separation of Duties

### Source of fix

`services/dsh/backend/internal/administration` domain/use-case layer. HTTP and UI may consume the rule but cannot own it.

### Required invariant

Create or centralize one semantic validation path for governed authorization mutation actor relationships. It must enforce:

#### Assignment / role mutation

- maker != beneficiary;
- checker != maker;
- checker != beneficiary.

#### Rollback / revocation

- rollback maker != beneficiary;
- rollback checker != rollback maker;
- rollback checker != beneficiary;
- rollback checker != original source checker.

### Required treatment

1. Apply the invariant before any remote Identity mutation is possible.
2. Return one explicit domain error/classification that HTTP maps consistently.
3. Ensure rejection leaves no mutation intent and no partial local transition.
4. Add focused negative tests for every forbidden equality and positive tests for valid independent actors.
5. Verify direct use-case invocation, not only HTTP/UI flows.
6. Update frontend action availability/error feedback only if the current UI can expose an action that the backend will now reject; backend remains authoritative.

### Exit criterion

No valid execution path permits self-benefit approval or non-independent rollback review, including direct use-case calls and retries.

## 5. Batch C — RC-1 Canonical mutation lifecycle redesign in place

### Architectural constraint

Do not add a second queue, alternate mutation table, permanent compatibility processor, or shadow state machine. Repair the existing DSH authorization orchestration into one coherent lifecycle.

### Required semantic states

The exact names may follow repository conventions, but the lifecycle must distinguish the following semantic facts durably:

1. **accepted/pending application** — local governed request and stable operation idempotency exist;
2. **claimed** — one worker/caller owns a bounded lease for the attempt;
3. **remote applied / readback pending or confirmed** — Identity mutation has succeeded or canonical readback proves desired truth;
4. **local finalized** — governed request/audit projection reflects the canonical result;
5. **retryable failure** — attempt failed with next eligible time and retained cause;
6. **terminal/manual-reconciliation-required** only for explicitly non-retryable conditions with auditable cause;
7. **complete/applied** — remote canonical truth and local governed projection are reconciled.

Do not encode success as a status that can be reached before the remote canonical result is proven.

### Claim / lease contract

Implement durable exclusivity using the repository's PostgreSQL model, for example a transactional claim with `FOR UPDATE SKIP LOCKED` plus persisted lease/claim metadata. The final implementation must prove:

- one due operation has at most one live owner;
- crash/restart causes an expired claim to become safely recoverable;
- a stale worker cannot finalize after losing ownership;
- worker concurrency does not duplicate local transitions;
- stable remote idempotency prevents duplicate Identity side effects.

### Retry contract

1. Classify transient vs terminal conflicts explicitly.
2. Persist attempt count and last failure class/details suitable for operations without leaking secrets.
3. Use bounded exponential backoff with jitter or an equivalent deterministic governed policy; never reschedule all failures at `NOW()`.
4. Set an upper policy for retry/terminal escalation that does not silently drop an operation.
5. Preserve recovery after process restart.

### Crash-window reconciliation

Explicitly cover and test:

- crash before remote call;
- remote call times out but may have applied;
- remote applied, process crashes before local request finalization;
- local request finalized, intent-completion update fails;
- Identity unavailable across repeated attempts;
- request/version changed while operation is in flight;
- worker loses lease during slow remote call.

Canonical Identity readback must decide ambiguous remote outcomes. Never issue a compensating opposite mutation merely to guess what happened.

### Request/intention convergence

The worker must not require `request.status = pending` as the only way to reconcile an existing intent. If a local request is already approved but the intent is not complete, the system must be able to prove Identity truth and converge the intent/local projection rather than orphaning the operation.

Where local request finalization and intent transition share the same PostgreSQL database, make their local state transition atomic in one transaction where semantically possible. The remote Identity operation remains outside that transaction and is bridged by durable idempotent orchestration/readback.

### Data migration / backfill

If schema columns/states are added:

1. create forward migration under the canonical existing migration authority;
2. classify every existing intent/request row into the new state machine deterministically;
3. backfill next-attempt/lease/reconciliation fields without inventing success;
4. treat ambiguous existing `approved + intent != applied` rows as reconciliation-required until Identity readback proves truth;
5. add constraints/indexes supporting unique operation identity, valid states, due-work lookup, and claim semantics;
6. prove migration from fresh DB and from representative pre-change schema/data;
7. do not leave old state values/readers/writers reachable after cutover.

### Exit criterion

Every reachable local/remote crash window converges to one canonical result without duplicate authority, retry storm, orphaned intent, or false success.

## 6. Batch D — RC-2 Authorization vocabulary and helper cutover

### Canonical survivor

`platform:read` is the sole surviving Platform Control read capability.

### Consumer migration

Inventory exact references at the execution HEAD across:

- Identity permission vocabulary/bootstrap;
- Identity role-permission bindings and persisted actor/session projections where applicable;
- Platform Control backend;
- Control Panel runtime/navigation/platform screens;
- DSH authorization/session test fixtures;
- contracts/generated clients only if they contain the literal capability;
- seed/test data.

Migrate every legitimate `platform.read` reference to `platform:read`. If a persisted vocabulary row/binding exists for `platform.read`, backfill bindings to the canonical vocabulary entry before deletion. Reconcile actor/session projections through the canonical Identity mechanism rather than mutating client state independently.

After all consumers have moved and readback is proven:

- delete `platform.read` from bootstrap/vocabulary/bindings/data;
- prove no duplicate alias remains.

### Legacy grant/revoke wrappers

Inventory all callers of convenience wrappers that synthesize `legacy-grant:` / `legacy-revoke:`. Migrate them to explicit-idempotency APIs using operation/request-derived stable idempotency keys. Then delete the wrappers and any tests/comments built around the legacy path.

No permanent alias, deprecated wrapper, dual-read, or dual-write period remains after the atomic cutover.

### Exit criterion

Search plus runtime/readback evidence proves one vocabulary and one grant/revoke API path.

## 7. Batch E — UX / contract truth propagation

Only after domain/lifecycle truth is correct, align affected Control Panel/API behavior.

For the governed authorization journeys, prove each state has accurate:

- entry/context;
- allowed actions;
- maker/checker eligibility;
- validation feedback;
- applying/progress indication;
- retryable failure and recovery;
- reconciliation-required state if materially reachable;
- success after canonical readback;
- later readback after refresh/relogin;
- unavailable/Identity outage behavior.

No frontend state may manufacture role assignment success. No backend response may claim terminal success before the canonical transition. If API schema must expose operation/reconciliation state, update the canonical contract first and regenerate all generated bindings, then migrate all consumers in the same batch.

## 8. Batch F — security and quality affected-cone re-audit

After source treatment, inspect the exact affected cone for:

- authorization bypasses and confused-deputy paths;
- operator-context trust boundary;
- idempotency/replay behavior;
- race/concurrency hazards;
- SQL constraints/transaction boundaries;
- sensitive audit/log leakage;
- stale compatibility code;
- unreachable/dead states;
- performance of due-intent indexes and worker queries;
- frontend inaccessible/ambiguous failure states where material.

Any higher-root material finding discovered here preempts the current order and is fixed from its owner before proceeding.

## 9. Batch G — exact-final-candidate remote evidence

After the **last source change**, pin `FINAL_CANDIDATE_SHA` and do not accept any result for another SHA.

Run the materially required governed remote toolchain. At minimum for this task:

1. canonical CI/build/typecheck/tests relevant to affected services/surfaces;
2. CodeQL;
3. Semgrep;
4. SonarQube Cloud;
5. Remote Security including applicable Gitleaks, OSV, Trivy, actionlint, zizmor, pinact, ShellCheck, Hadolint, yamllint and governed policy checks;
6. Dependency Review and lockfile integrity when dependency/lockfile scope or governing baseline requires it;
7. OpenCodeReview semantic review;
8. CodeRabbit/PR review evidence if it is part of the active PR completion contract;
9. runtime/journey verification for Identity + DSH + Control Panel affected flows.

For each tool record:

- tool/workflow name;
- run ID/URL identity;
- resolved ref and exact SHA;
- effective scope/mode;
- conclusion;
- findings/suppressions;
- artifact/provenance evidence;
- freshness after last source mutation.

A tool failure is not waived because another scanner is green. Diagnose its first material failure from logs, fix the source/tooling root, produce a new candidate SHA, then rerun all evidence invalidated by that source change.

## 10. PR / integration contract

The active PR was `#284` during audit and was draft/non-mergeable. Execute phase must not assume that remains true.

Before integration:

1. verify PR head exactly equals `FINAL_CANDIDATE_SHA`;
2. verify base is the intended current `master`;
3. inspect all unresolved review threads/comments and classify each material item;
4. prove required checks/evidence are green for the exact head;
5. prove mergeability after updating/reconciling with current base if required;
6. do not merge merely to obtain a green default-branch run;
7. after merge, verify the resulting default-branch candidate and rerun post-merge checks required by governance;
8. only then allow final closure bookkeeping.

Branch `c` is not protected at audit time, so protection cannot be treated as an enforcement guarantee. The execution contract itself must remain fail-closed.

## 11. Mandatory cleanup after cutover

Delete within the proven scope after consumers migrate:

- `platform.read` alias and bindings/data residue;
- legacy grant/revoke wrappers and their legacy idempotency-key path;
- old mutation lifecycle branches/states/queries made unreachable by the new state machine;
- duplicate helper functions or fallback retry paths;
- stale tests/fixtures that encode superseded behavior;
- comments/documentation that still describe the old truth.

Do not retain any of these “for safety”. Safety is provided by migration, readback, tests, and exact-candidate evidence, not parallel truth.

## 12. Re-audit loop

After each root batch:

`AUDIT -> INSPECT -> DIAGNOSE -> ANALYZE -> VERIFY -> RE-AUDIT AFFECTED CONE + NEGATIVE SPACE -> RE-RANK`

If the original root exposes a higher Product/System/Semantic/Architectural root, preempt lower work and fix the higher source first.

Stop only at the state defined by `02-VERIFICATION-CLOSURE.md`. Until all closure evidence exists, the legal status is not `CLOSED`.
