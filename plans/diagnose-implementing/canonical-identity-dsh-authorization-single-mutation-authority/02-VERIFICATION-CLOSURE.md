# Canonical Identity / DSH Authorization — Verification & Closure Contract

PLAN_ID: `canonical-identity-dsh-authorization-single-mutation-authority`  
REPOSITORY: `bthwani2-boop/bthwani-suite-next`  
TARGET_REF: `c`  
AUDITED_TARGET_SOURCE_HEAD: `cd03ac7e05e6b753c7a2faac326d2a07da269a4b`  
SOURCE_PHASE: `AUDIT_PREPARE`  
STATUS_AT_HANDOFF: `READY_FOR_EXECUTION`

This file defines the proof required after EXECUTE_CLOSE treatment. It does not itself assert `CLOSED`.

## 1. Exact-final-candidate law

After the **last** source/governance/contract/test/cleanup change in the affected cone, resolve one exact final candidate SHA `F` on branch `c`.

All closure evidence must be attributable to `F` or to an artifact generated from `F` with verifiable provenance. Historical green runs, older SHAs, plan-only commits, local manual checks, scanner configuration presence, or a previously passing PR are not final closure evidence.

If any source change occurs after evidence is collected, invalidate the affected evidence, repin `F`, and rerun the required verification.

## 2. Structural single-authority proof

On `F`, prove all of the following:

- only the canonical intent engine can execute Identity mutations for governed role assignment/revocation, role-definition upsert and rollback;
- `approvals.go`, `role_requests.go` and `rollback.go` contain no direct `GrantRoleWithIdempotency`, `RevokeRoleWithIdempotency` or `UpsertRoleDefinition` execution path;
- no duplicated raw SQL finalizer outside the canonical intent finalizer sets `dsh_admin_canonical_mutation_intents.status = 'applied'` for these flows;
- any non-leased `markCanonicalMutation` compatibility helper has zero consumers and is deleted, unless execution proves a distinct legitimate non-finalizing purpose; any survivor must be explicitly justified and cannot be an executor/finalizer;
- there is no second queue, shadow intent table, fallback executor, in-memory authority, feature-flagged legacy executor or dormant compatibility writer;
- synchronous review and the worker both enter the exact same claimed-intent reconciler/finalizer implementation;
- governance contains one durable single-executor invariant and no parallel task-specific authority.

A text search alone is insufficient where aliases/wrappers can hide execution; trace the reachable call graph from all three review use cases and the worker.

## 3. Lease and fencing verification

Prove transactionally and with tests:

1. only a valid current lease owner may finalize;
2. finalization checks owner identity and `lease_expires_at > NOW()` inside the same transaction as request/audit/intent writes;
3. a stale owner whose lease expired cannot update request status, write success audit, or mark intent applied after another owner reclaims it;
4. reclaim after expiry is possible and deterministic;
5. the per-intent execution deadline is materially shorter than the lease and leaves finalization headroom;
6. already-applied intents are handled idempotently without a second semantic finalization.

## 4. Concurrency and crash-window acceptance tests

The final candidate must prove these material scenarios for all applicable intent types:

### V-C01 — synchronous review vs worker race

Force review and worker to contend for the same newly persisted intent. Expected result:

- exactly one current lease owner executes/finalizes;
- the other path does not independently mutate/finalize;
- caller-visible outcome is consistent with canonical state;
- no duplicate success audit/finalization authority exists.

### V-C02 — stale owner reclaim

Let owner A acquire a lease, allow it to expire, then let owner B reclaim and finalize. Resume A afterward. Expected: A performs zero final writes.

### V-C03 — remote success / local interruption

Allow Identity mutation to converge, interrupt local finalization, then reconcile later. Expected: pre-readback sees canonical convergence, no duplicate semantic mutation is required, and the request/intent are finalized correctly.

### V-C04 — ambiguous remote outcome

Simulate timeout/connection loss after the remote request may have executed. Expected: canonical readback decides whether another mutation is needed; no blind duplicate mutation occurs.

### V-C05 — already-converged state

Identity already matches desired state before execution. Expected: remote mutation is skipped, post-readback/fenced finalization completes correctly.

### V-C06 — batch isolation

Claim multiple independent intents. Make the first one retryable or terminally fail. Expected: later claimed intents are still attempted/dispositioned in the same batch; the batch reports aggregate error without coupling their execution to the first item.

### V-C07 — invalid/poison intent

Malformed payload, source mismatch or forbidden SoD drift becomes terminal with durable reason and zero Identity mutation.

## 5. Product and SoD regression proof

Re-prove the existing domain invariants after restructuring:

- maker != beneficiary;
- checker != maker;
- checker != beneficiary;
- rollback maker != beneficiary;
- rollback checker != rollback maker;
- rollback checker != beneficiary;
- rollback checker != original source checker;
- direct use-case invocation cannot bypass these rules;
- rejected decisions remain local maker/checker outcomes and never create canonical mutation intents/effects.

Cover role assignment, revocation, role-definition mutation where applicable, and rollback.

## 6. End-to-End consumer / UX proof

For each affected Control Panel journey:

### Assignment / revocation / rollback

- user initiates/approves the governed operation;
- no success is shown before canonical Identity readback and fenced DSH finalization;
- after success, the affected canonical staff state is refreshed and reflects the new role truth;
- maker/checker queue is refreshed consistently;
- retryable/failed/reconciliation-required outcomes cannot render a false successful state.

### Role definition

- success follows canonical role-definition readback + fenced finalization;
- canonical roles state is refreshed after success;
- workflow queue is refreshed consistently;
- stale local role state cannot masquerade as canonical success.

Prove frontend state behavior, API contract behavior and backend state semantics match the same meaning.

## 7. Data / database proof

Using the final schema and final candidate behavior, prove:

- every reachable nonterminal intent is reclaimable or scheduled for retry;
- no approved source request is permanently paired with an unreachable non-applied intent;
- no intent can remain owned forever after executor death;
- no two active executors can legitimately own/finalize the same intent simultaneously;
- terminal failures are explicit and distinguishable from retryable failures;
- canonical request/audit/intent final success is atomic;
- no data backfill/migration is required for existing rows, or if live data proves one is required, execute and verify it before closure;
- no orphan/duplicate/obsolete orchestration state introduced by the old dual-executor architecture remains inside the affected data cone.

## 8. Negative-space / residue audit

After implementation and tests are green, re-audit the affected cone specifically for residue:

- `GrantRoleWithIdempotency` direct governed execution outside the canonical intent engine: `0`;
- `RevokeRoleWithIdempotency` direct governed execution outside the canonical intent engine: `0`;
- `UpsertRoleDefinition` direct governed execution outside the canonical intent engine: `0`;
- duplicate intent-applied SQL/finalizer: `0`;
- second queue/lifecycle/authority: `0`;
- direct fallback when claim/lease fails: `0`;
- silent fallback or optimistic local-only success: `0`;
- dead/unused compatibility executor/helper exposed by cutover: `0`;
- missing staff/roles consumer refresh within the affected journeys: `0`;
- stale governance statement capable of recreating dual authority: `0`.

Any material survivor must be treated or explicitly proven `N/A`/necessary before closure.

## 9. Test / build verification

Run the strongest materially applicable verification for the final candidate, including at minimum:

- focused Go tests for DSH administration canonical intent, maker/checker, retry, lease and concurrency behavior;
- wider DSH backend test suite sufficient to catch affected auth/HTTP/runtime regressions;
- race/concurrency testing where the implementation can be exercised deterministically;
- database/migration validation relevant to current intent schema and any changed SQL;
- affected Control Panel unit/integration tests, typecheck and build;
- contract/generated binding verification if any API type/response changes;
- runtime smoke/journey checks if execution changes runtime scheduling/worker behavior.

A test-pass state is necessary evidence but is not structural closure by itself.

## 10. Exact-candidate remote quality/security evidence

On final candidate `F`, obtain and inspect the materially applicable remote evidence, not merely workflow definitions:

- canonical CI/build/test checks;
- CodeQL;
- SonarQube analysis and Quality Gate, including a valid non-empty Go coverage artifact if coverage is in scope;
- Semgrep;
- Remote Security controls materially applicable to the changed cone;
- OpenCodeReview semantic review;
- dependency/lockfile/integrity gates if triggered by the final changes;
- PR/review evidence where the repository workflow requires it.

For every required remote tool record:

- exact SHA / checked ref;
- run/check identity;
- conclusion;
- freshness after last source mutation;
- material findings and their disposition;
- any suppression/exclusion and proof it is justified.

No historical/different-SHA result counts toward final closure.

## 11. Governance verification

After source treatment is proven:

- the existing canonical administration product-truth owner states one authorization intent execution/finalization authority;
- it preserves Identity as RBAC authority and DSH as maker/checker/orchestration authority;
- no separate task document or duplicate governance contract competes with it;
- implementation and governance agree on synchronous review semantics, durable intent ownership, lease fencing and canonical readback.

## 12. Plan-artifact topology verification

Before leaving AUDIT_PREPARE and again before final closure, prove:

- `plans/diagnose-implementing/2026-08-22-canonical-authorization-authority-e2e.md` is absent;
- `plans/diagnose-implementing/canonical-identity-dsh-authorization-final-closure/` is absent;
- `plans/diagnose-implementing/canonical-identity-dsh-authorization-single-mutation-authority/` contains exactly:
  - `00-AUDIT-TRUTH.md`
  - `01-EXECUTION-CONTRACT.md`
  - `02-VERIFICATION-CLOSURE.md`
- there are no parallel per-root/per-agent/evidence/status plan artifacts created for this same handoff.

## 13. CLOSED gate

`CLOSED` is forbidden until the **exact final candidate after the last change** proves all of the following simultaneously:

- one canonical Identity RBAC truth;
- one DSH governed intent execution/finalization authority;
- zero reachable parallel/shadow/duplicate executor or finalizer;
- complete migration of review paths and worker to the same reconciler;
- valid lease fencing including stale-owner exclusion;
- correct crash/unknown-outcome reconciliation;
- complete affected consumer readback/refresh;
- zero material cleanup/legacy/workaround residue;
- zero missing affected writer/reader/consumer;
- governance reconciled;
- exact-candidate CI/security/quality evidence accepted;
- zero known material findings inside the Effective Scope after final re-audit.

If any item fails, remain in EXECUTE_CLOSE and continue from the highest remaining material root. `WORKING` or `TEST_PASS` is not `CLOSED`.

## 14. AUDIT_PREPARE handoff state

The treatment path and its verification are deterministic enough to execute without material rediscovery, subject only to the mandatory live HEAD revalidation at EXECUTE_CLOSE start.

`READY_FOR_EXECUTION`
