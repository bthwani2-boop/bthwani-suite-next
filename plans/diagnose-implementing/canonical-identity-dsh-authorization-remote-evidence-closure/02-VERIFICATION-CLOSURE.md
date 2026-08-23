# Canonical Identity / DSH Authorization + Remote Evidence — Verification & Closure Contract

PLAN_ID: `canonical-identity-dsh-authorization-remote-evidence-closure`  
SOURCE_AUDIT_HEAD: `a19a9874961bc8a1d98f8b9b8cdfa1de476c0d33`  
PHASE_TO_VERIFY: `EXECUTE_CLOSE`  
STATUS: `READY_FOR_EXECUTION`

## 1. Closure authority

`CLOSED` is forbidden until all material claims below are proven against one exact **FINAL_SOURCE_CANDIDATE_SHA** captured after the last Target-System source mutation.

Plan creation/deletion commits are evidence artifacts and are not substitutes for target-source proof. Historical passes, stale PR runs, parallel-branch runs, local-only tests, workflow configuration, or a green aggregate job without inspected outputs are insufficient.

Every final remote result must identify:

- exact source SHA;
- workflow/run/job identity;
- tool/version where material;
- effective scope/targets;
- actual outcome and findings;
- artifact/log provenance where produced;
- freshness after the final source change.

## 2. Canonical Product/System proof

Final re-audit must prove:

- Identity is the only role/permission/actor-role authorization truth owner;
- DSH Administration owns maker/checker workflow and durable mutation orchestration only;
- there is exactly one reachable implementation that executes/finalizes each canonical mutation intent;
- all synchronous and background consumers converge on that implementation;
- no local DSH state is treated as authorization truth;
- Control Panel success is derived from canonical Identity readback plus fenced DSH finalization;
- no higher Product/System/Semantic root was exposed by execution or final tools.

## 3. Authorization execution acceptance matrix

All must pass on final source:

| Claim | Required proof |
|---|---|
| One executor | code/reference audit shows no direct review-path Identity writer or duplicate finalizer beside canonical intent executor |
| One current owner | DB claim/fence test prevents two workers or worker+synchronous execution from owning same generation |
| Stale-owner safety | expired/superseded executor cannot mark request/intent applied or write approval audit |
| Remote idempotency | retry/crash after Identity mutation converges without duplicate semantic mutation |
| Canonical readback | pre/post Identity readback determines desired state and blocks false success |
| Atomic finalization | request + intent + audit transition under one active fence/transaction |
| Retry reachability | approved/pending/retry combinations cannot strand an unapplied obligation |
| Batch isolation | one failed/malformed/retryable intent does not suppress unrelated intent processing |
| Separation of duties | maker, beneficiary, checker distinct; rollback checker also differs from original checker |
| Direct-call safety | domain/use-case invocation cannot bypass separation or canonical executor |

Run focused unit/integration/DB concurrency tests and affected end-to-end journeys. Any flaky/non-deterministic concurrency proof is not acceptance.

## 4. Database / migration / reconciliation proof

Before closure, inspect live test/runtime migration behavior and prove:

- schema includes exactly one canonical fencing mechanism for mutation intents;
- migration is applied through the governed migration owner;
- no obsolete lease/fence state remains reachable;
- existing intent rows are reconciled/backfilled deterministically;
- no `request=approved + intent!=applied` residue remains without canonical reconciliation disposition;
- no permanently pending intent is hidden by future `next_attempt_at`, stale lease, terminal flag mismatch, or missing source request;
- no duplicate pending request constraint/regression is introduced;
- rollback/source approval links and audit history remain intact;
- rollback never deletes source history;
- no destructive cleanup loses required audit/business value.

If production-like data is unavailable in CI, prove the migration/reconciliation algorithm against representative fixtures including every reachable legacy state combination.

## 5. API / UX / consumer proof

Verify the affected Control Panel and API journey end-to-end:

1. maker creates role-definition or actor-role request;
2. checker queue exposes it only with exact permission;
3. forbidden maker/beneficiary/self-review combinations fail;
4. checker approval enters canonical intent execution;
5. Identity canonical state converges;
6. DSH request/intent/audit finalizes under current fence;
7. API success is emitted only after convergence;
8. Control Panel refreshes canonical roles/staff/permission-derived state;
9. retryable Identity outage produces explicit non-success/reconciliation behavior;
10. recovery executes the same intent, not a fallback mutation path;
11. rollback uses the same executor and independent checker invariant.

Negative-space UI proof must show no optimistic local role authority and no stale local success after canonical failure/readback mismatch.

## 6. Zero-residue search and deletion proof

Final repository + affected data search must prove zero reachable residue for:

- direct `GrantRoleWithIdempotency` / `RevokeRoleWithIdempotency` / `UpsertRoleDefinition` calls from governed review functions outside the canonical executor owner;
- duplicated request+intent finalization SQL;
- obsolete executor/helper/retry paths;
- `legacy-grant:` / `legacy-revoke:` compatibility keys/helpers;
- raw `platform.read` authorization alias or persisted binding/session bootstrap residue; canonical survivor is `platform:read`;
- broad operator-role authorization bypass for administration operations;
- old GitHub Models OpenCodeReview engine path;
- candidate-controlled privileged OCR bootstrap/cache path;
- old readiness logic that duplicates the latest migration manifest head;
- stale/dead plan directories competing with this handoff.

A search result is not deletion authority by itself. Classify each material hit as live consumer, canonical owner, generated derivative, migration residue or obsolete path; migrate value before deletion.

## 7. SonarQube Cloud — mandatory exact-final proof

Run SonarQube Cloud on `FINAL_SOURCE_CANDIDATE_SHA` after the last source change.

Required evidence:

- exact immutable checkout matches final SHA;
- affected/full coverage routing is correct;
- every required Node coverage suite completes and produces non-empty valid LCOV;
- every required Go module uses one valid `go test ./... -coverprofile` report;
- raw and normalized Go reports pass `go tool cover -func` validation;
- scanner step actually executes — `skipped` is failure of closure;
- Sonar task completes;
- Quality Gate is `OK`;
- Security Rating on New Code meets gate (`A` where configured);
- all new issues, accepted issues, security hotspots, duplications and coverage values are extracted and reviewed;
- zero known material Sonar finding remains in Effective Scope.

Do not count issue #306 run `32605132576`: it failed during Go coverage generation and scanner was skipped. Do not count PR #300/#301 historical passes or PR #304 divergent Security Rating B as final evidence.

If exact-final Sonar fails, retrieve failing job/log/Quality Gate details and treat the actual failure as a live root. No coverage bypass, empty report, scanner skip or Quality Gate waiver is permitted as closure.

## 8. CodeQL — mandatory exact-final proof

Run CodeQL on final source SHA and inspect actual alerts.

Required:

- analysis completes for all configured languages/scopes;
- exact final SHA provenance is available;
- no unresolved critical/high/material alert in Effective Scope;
- specifically verify OpenCodeReview no longer triggers the repeated cache-poisoning / unsafe-untrusted-checkout pattern seen on PR #300 and #304;
- verify Remote Analysis Evidence does not reintroduce privileged candidate-owned collector execution;
- review dismissals/suppressions, if any, for valid evidence and current applicability.

A stale `codeql-full` success such as run `32600874220` is not final evidence.

## 9. Semgrep — mandatory exact-final proof

Run canonical Semgrep on final source SHA.

Required:

- pinned configured Semgrep version/rules load successfully;
- expected changed/full target set is covered;
- parsing coverage is complete enough that material files are not silently skipped;
- result artifact/provenance is retained;
- zero blocking/material finding remains in Effective Scope.

Parallel PR #304 run `32605227229` with 243 rules, 14 targets and 0 findings proves engine viability only. It cannot close final source.

## 10. OpenCodeReview — mandatory exact-final semantic proof

Run OpenCodeReview on the exact final source against the correct trusted base.

Required evidence:

- candidate SHA and base SHA are exact and recorded;
- trusted rules come from trusted base/default authority;
- trusted runtime/tool bootstrap is not candidate-controlled;
- candidate package metadata cannot control privileged package-manager cache/setup;
- host semantic engine actually executes when reviewable file count > 0;
- engine/tool failure cannot normalize to clean result;
- `files_reviewed == reviewable_files`;
- normalized result JSON is valid;
- every comment/path/line is grounded in reviewable scope;
- policy adjudication completes;
- artifact + provenance upload succeeds;
- all critical/high/material semantic findings are resolved or proven false with source evidence.

Explicit rejection cases:

- old run `32602076128`: engine returned `410`, 0 tokens/comments; **not clean**;
- parallel run `32605227245`: reviewed 12/12 and found 0 findings, but different candidate; **not final evidence**.

## 11. Remote Security — mandatory complete-output proof

Run exact-final Remote Security with evidence-complete independent analyzers.

For each current canonical analyzer, require a recorded outcome and actual output:

- Gitleaks: complete intended history/scope, zero unresolved secret leak;
- OSV Scanner: enumerate findings/exclusions; no unresolved known material vulnerability;
- Trivy: inspect every configured lock/module target; zero unresolved material vulnerability;
- actionlint: PASS on current workflow syntax/expressions/shell integration;
- zizmor: PASS/no unresolved workflow security finding;
- pinact: all required GitHub Actions pinned under canonical policy;
- ShellCheck: zero unresolved material shell defect;
- Hadolint: zero unresolved material Dockerfile defect;
- yamllint: canonical YAML policy passes or every intentional exception is owner-governed and non-material.

The final aggregate must fail if any required analyzer fails or does not run. One analyzer failure must not prevent independent analyzers from generating outputs.

Historical run `32603966329` is diagnostic only: Gitleaks/OSV/Trivy ran clean, then actionlint failed and later outputs were truncated. Parallel PR #304 run `32605227244` demonstrates full evidence collection but includes parallel-only Regal/Conftest policy and is not final evidence.

Regal/Conftest are not mandatory merely because that parallel branch used them; add them only if current canonical policy/tool ownership deliberately adopts them during execution, in which case they become subject to the same exact-final proof and cannot remain parse-broken.

## 12. CI / contracts / runtime / database proof

Run all materially affected canonical CI gates on final source, including where applicable:

- Node build/typecheck/test/deep verification;
- Go tests for affected services;
- contracts materialization/integrity/generated binding checks;
- DSH schema/migration/seed gates;
- Identity schema/RBAC tests;
- runtime/readiness/smoke gates;
- authorization administration journey tests;
- control-panel tests;
- journey-gate enforcement;
- lockfile integrity;
- dependency review where configured.

The stale `ci-full` run `32601043818` cannot be used. Re-test the source-fixed readiness behavior that no longer duplicates the latest migration manifest head.

All required jobs must be green on the exact final source or explicitly `N/A_PROVEN` by canonical scope. `skipped` caused by an upstream failure is not `N/A`.

## 13. Tool-evidence adjudication rules

For every tool:

```text
CONFIGURED != RAN
RAN != COVERED_REQUIRED_SCOPE
WORKFLOW_SUCCESS != CLEAN_FINDINGS
0 FINDINGS + ENGINE FAILURE != PASS
STALE SHA PASS != FINAL PASS
PARALLEL BRANCH PASS != CURRENT PASS
MISSING OUTPUT != PASS
SKIPPED DUE TO FAILURE != N/A
```

Classify final evidence only as:

- `PASS_EXACT_FINAL`;
- `FAIL_EXACT_FINAL`;
- `BLOCKED`;
- `N/A_PROVEN`.

No `STALE_PASS`, `PARALLEL_PASS`, `SOURCE_FIXED_UNRUN`, or `UNKNOWN` may remain at closure.

## 14. Security / quality negative space

Re-audit for conditions tools may miss individually:

- privileged workflow token exposed to untrusted candidate execution;
- cache poisoning across branch/PR candidates;
- unpinned/mutable third-party action/tool acquisition;
- scanner exclusions that silently widen beyond documented necessity;
- vulnerability ignore without fixed-upstream/repository guard evidence;
- generated contract drift masked by stale generated files;
- runtime readiness checks coupled to copied constants rather than invariants;
- tests that pass by reproducing implementation rather than product truth;
- workflows that report aggregate pass while a required analyzer never ran;
- artifacts generated for one SHA but adjudicated against another.

## 15. Governance reconciliation

After actual system truth is fixed and proven, classify governance impact.

Update governance only if execution establishes a durable Product/System/Policy truth whose absence would materially mislead future work. Do not copy implementation details, transient run IDs, tool logs or plan status into governance. Governance must remain durable memory, not execution ledger.

If existing governance already correctly states Identity ownership, DSH projection/orchestration and maker-checker invariants, no redundant governance rewrite is required.

## 16. Final re-diagnosis and closure gate

After all treatment and exact-final tools:

1. re-audit the Effective Scope and all exposed relations;
2. re-run negative-space searches;
3. re-rank any remaining findings by highest root;
4. treat every still-material root;
5. repeat exact-final evidence after any new source change;
6. prove zero required deletion/cleanup obligation remains;
7. prove zero parallel truth/authority/writer remains;
8. prove zero missing consumer / partial migration remains;
9. prove zero workaround/fallback-as-fix remains;
10. prove zero known material finding remains in the Effective Scope.

Only then may `CLOSED` be asserted.

Until then, the valid handoff state is:

`READY_FOR_EXECUTION`
