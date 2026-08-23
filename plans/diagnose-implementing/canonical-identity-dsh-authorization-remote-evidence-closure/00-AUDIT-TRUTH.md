# Canonical Identity / DSH Authorization + Remote Evidence — Audit Truth

PLAN_ID: `canonical-identity-dsh-authorization-remote-evidence-closure`  
PACKAGE_REVISION: `13`  
REPOSITORY: `bthwani2-boop/bthwani-suite-next`  
TARGET_REF: `c`  
PHASE: `AUDIT_PREPARE`  
AUDITED_TARGET_SOURCE_HEAD: `a19a9874961bc8a1d98f8b9b8cdfa1de476c0d33`  
PLAN_ARTIFACT_BASE_HEAD: `250313a7dc9a55c41f1f13e7a283770669e1ef4a`  
STATUS: `READY_FOR_EXECUTION`  
OBJECTIVE: `Root-correct end-to-end closure of canonical Identity/DSH authorization mutation authority and every materially required remote verification/evidence control path.`

## 1. Governing interpretation

This handoff was rebuilt from the current branch under `tools/prompting/bthwani-orchestrator/00-ORCHESTRATOR.md` package revision 13. `AUDIT_PREPARE` kept the Target System read-only. The only writes in this phase are retirement of superseded plan artifacts and creation of this exact three-file handoff.

`tools/prompting/bthwani-orchestrator/**` was not modified. No branch was created or switched. Plan-artifact commits after `AUDITED_TARGET_SOURCE_HEAD` are not Target-System treatment and must never be counted as Root-Cause progress.

The user-specified older handoffs `plans/diagnose-implementing/canonical-identity-dsh-authorization-final-closure/` and `plans/diagnose-implementing/2026-08-22-canonical-authorization-authority-e2e.md` were already absent before this package was created. The later competing handoff `plans/diagnose-implementing/canonical-identity-dsh-authorization-single-mutation-authority/` was deleted in full before this package was created.

## 2. Canonical Product/System Truth

The live governance contract `governance/product/contracts/administration-roles-approvals-audit.product-truth.json` establishes:

- Identity is the sole canonical owner of identity, authentication, role definitions, permission vocabulary, role-permission bindings, actor-role assignments and resolved authorization truth.
- DSH Administration owns the governed maker/checker operational workflow and its audit/reconciliation projection; it does not own a second authorization truth.
- Maker, beneficiary and checker are distinct for governed role changes. Rollback checker is also distinct from the original source checker.
- Direct role creation/assignment/revocation outside the governed approval path is forbidden.
- The Control Panel is a consumer/operator surface; it may display canonical success only after the owner truth is confirmed.
- One durable fact has one canonical owner. Durable intent/reconciliation state may exist only as orchestration truth, not as a parallel permission/assignment truth.

## 3. Highest proven live root — `RC-AUTH-EXEC-001`

**Severity:** `CRITICAL/HIGH`  
**Class:** Product/System/Semantic/Architectural  
**Current-source status:** `PROVEN_LIVE`

The DSH Administration approval paths and the canonical-intent worker both currently execute and finalize the same durable mutation obligation.

### Role assignment/revocation

`services/dsh/backend/internal/administration/approvals.go` currently:

1. validates maker/checker/beneficiary separation;
2. persists `role-assignment` canonical intent;
3. commits the request transaction;
4. directly calls Identity `GrantRoleWithIdempotency` or `RevokeRoleWithIdempotency`;
5. directly updates the approval request to `approved`;
6. directly updates the same intent to `applied`.

### Role definition

`services/dsh/backend/internal/administration/role_requests.go` currently:

1. persists `role-definition-upsert` intent;
2. commits;
3. directly calls Identity `UpsertRoleDefinition`;
4. performs canonical readback matching;
5. directly finalizes both DSH request and intent.

### Rollback

`services/dsh/backend/internal/administration/rollback.go` currently:

1. validates rollback separation, including original checker exclusion;
2. persists `role-rollback` intent;
3. commits;
4. directly performs the inverse Identity role mutation;
5. directly finalizes rollback request and intent.

### Parallel executor already exists

`services/dsh/backend/internal/administration/canonical_intents.go` separately owns:

- durable intent claiming via `FOR UPDATE SKIP LOCKED`;
- `lease_owner` / `lease_expires_at`;
- bounded exponential retry scheduling;
- canonical Identity pre-readback and post-readback;
- role assignment, rollback and role-definition reconciliation;
- DSH request finalization;
- marking the same intent `applied` or terminal/retryable failure.

Therefore there are two reachable execution/finalization authorities for one orchestration fact: synchronous review functions and the canonical intent reconciler. Remote idempotency mitigates some duplicate Identity effects but does not remove parallel local execution/finalization authority, stale-owner races, split finalization ownership, or crash-window ambiguity.

### Canonical target

```text
Review decision
-> persist one durable intent
-> acquire exactly one fenced intent execution claim
-> Identity canonical pre-readback
-> mutate only if required using stable request-derived idempotency
-> Identity canonical post-readback
-> atomically/fenced finalize DSH request + intent + audit
-> return canonical synchronous result or explicit retry/reconciliation state
```

The synchronous request path may invoke/await this one executor. It may not perform a second direct Identity mutation/finalization implementation beside it.

## 4. Live control-path root — `RC-OCR-TRUST-001`

**Severity:** `HIGH`  
**Class:** Security / CI trust boundary  
**Current-source status:** `PROVEN STRUCTURAL RISK; EXACT-CURRENT CODEQL CONFIRMATION MISSING`

CodeQL independently reported the same OpenCodeReview trust-boundary pattern on PR #300 and PR #304:

- cache poisoning through execution/setup after an untrusted candidate checkout;
- unsafe checkout of untrusted candidate code in a privileged workflow context.

The exact current `.github/workflows/open-code-review.yml` still accepts an exact candidate `head_sha`, checks out that candidate before Node/tool bootstrap, and runs with `copilot-requests: write`. It correctly loads review rules from the trusted base and treats diff/context as untrusted review data, but candidate checkout still precedes runtime/tool setup. A real PR #304 execution also showed setup-node package-manager cache behavior enabled after candidate checkout, materially corroborating the CodeQL risk model.

Canonical target: trusted workflow/tool bootstrap must be independent of candidate-controlled repository state. Candidate content/diff is inert review data only; it must not influence package-manager cache/bootstrap, tool installation, executable workflow instructions, or privileged token-bearing execution.

## 5. Live evidence-completeness root — `RC-EVIDENCE-COLLECTION-001`

**Severity:** `HIGH`  
**Class:** Verification / security control plane  
**Current-source status:** `PROVEN_LIVE`

Exact current `.github/workflows/security-remote.yml` runs these independent analyzers sequentially in one fail-fast job:

- Gitleaks
- OSV Scanner
- Trivy
- actionlint
- zizmor
- pinact
- ShellCheck
- Hadolint
- yamllint

A historical real Remote Security run demonstrates the consequence: Gitleaks, OSV and Trivy completed, actionlint failed, and subsequent independent analyzers did not run. A failed gate must remain fail-closed, but one analyzer failure must not suppress evidence from unrelated analyzers. Otherwise audit saturation cannot distinguish `not run` from `clean` and cannot extract all material outputs.

Canonical target: every canonical analyzer independently produces outcome/log/evidence; an aggregate result fails if any required analyzer fails. Evidence collection is complete even when the aggregate gate is red.

## 6. Closure gate — `RC-EXACT-EVIDENCE-001`

**Severity:** `HIGH closure gate`  
**Current-source status:** `PROVEN_MISSING`

For exact audited Target Source SHA `a19a9874961bc8a1d98f8b9b8cdfa1de476c0d33`:

- no PR-triggered workflow runs were returned for the exact SHA;
- no classic commit statuses were returned for the exact SHA.

Therefore no SonarQube, CodeQL, Semgrep, OpenCodeReview, Remote Security, CI or lockfile result may currently be counted as an exact-current PASS. Historical and parallel-candidate evidence below is diagnostic input only.

## 7. Remote-tool evidence ledger — actual outputs analyzed

### 7.1 SonarQube Cloud

**Run `32605132576`, issue #306, source `33f12d90bc4c55f210f3bf22ed9eed1a7dd6d1bc`: `STALE_FAIL`.**

Actual job decomposition proves:

- ownership resolution: PASS;
- Sonar token validation: PASS;
- Node scope/coverage preparation: PASS;
- governed DB provisioning/migrations: PASS;
- `Generate affected Go coverage reports`: **FAIL**;
- Sonar scanner step: **SKIPPED**.

The issue-level remote command also records the run as failure. This run produced no valid Quality Gate for that candidate.

The exact current source has since replaced the earlier invalid coverage approach with one legacy `go test ./... -coverprofile=<raw>` per module, checks for executable records, validates with `go tool cover -func`, normalizes module paths, validates the normalized profile again, and only then passes `**/.sonar/coverage.out` to Sonar. Thus the old coverage-generation defect is `SOURCE_FIXED / EXACT_REMOTE_REVERIFY_REQUIRED`, not a currently proven live source root.

Other Sonar evidence must remain separate:

- PR #300 and PR #301 had Sonar Quality Gate PASS on different older candidates, with zero new issues reported; these are `STALE_PASS` only.
- PR #304 on divergent head `ca774bef...` had **Quality Gate FAILED** because Security Rating on New Code was `B` while the gate required `A`; this is `PARALLEL_CANDIDATE_FINDING_NEEDS_REVALIDATION`, not proof that current `c` is B.

### 7.2 CodeQL

- Issue #297 `codeql-full`, candidate `b2077e079922e3491e9dfb128bf123c9be7671a1`, run `32600874220`: `STALE_PASS`.
- PR #284 historical finding on `.github/workflows/remote-analysis-evidence.yml`: privileged/untrusted checkout. Exact current source now obtains collector logic from the trusted default branch, so this is `SOURCE_FIXED / EXACT_REVERIFY_REQUIRED`.
- PR #300 and PR #304 independently reported OpenCodeReview cache-poisoning / unsafe-checkout findings. Because the current workflow still retains the structurally relevant ordering and privileges, these findings remain material to `RC-OCR-TRUST-001` until exact-current CodeQL proves the corrected final design.

### 7.3 Semgrep

Parallel PR #304 merge-candidate run `32605227229`:

- exact candidate materialized;
- Semgrep `1.172.0`;
- `p/default` + `p/security-audit`;
- 243 rules;
- 14 changed targets;
- final result: **0 findings / 0 blocking**;
- artifact ID `9483950508`.

Verdict: `PARALLEL_MERGE_CANDIDATE_PASS`. It is useful evidence that the configured engine can run, but it is not evidence for current `c` or the future final candidate.

### 7.4 OpenCodeReview

Older PR #301 run `32602076128`:

- review scope resolved;
- engine endpoint returned `410 Gone` during GitHub Models retirement;
- 10 reviewable files;
- result status failed;
- 0 comments / 0 tokens because semantic review did not execute;
- fail-closed policy failed.

Verdict: `ENGINE_FAILURE`; **zero findings is not a clean review**.

Newer parallel PR #304 run `32605227245`:

- Copilot CLI path executed successfully;
- 12/12 reviewable files reviewed;
- 0 findings across critical/high/medium/low;
- complete evidence artifact ID `9483955173`.

Verdict: `PARALLEL_CANDIDATE_PASS`. It proves the new engine path can execute, but does not close current `c`. The run also materially corroborated the package-manager-cache concern described in `RC-OCR-TRUST-001`.

### 7.5 Remote Security

Historical run `32603966329` on `6f5c675...`: aggregate FAIL.

Actual outputs before truncation:

- Gitleaks: scanned ~11,345 commits / ~113.31 MB; no leaks found;
- OSV: scanned seven targets; two `image-size` advisories filtered only under the repository's documented no-fixed-upstream guard; no remaining known vulnerabilities;
- Trivy: 0 vulnerabilities on seven lock/module targets;
- actionlint: failed on two ShellCheck `SC2209` findings in the then-current Semgrep workflow;
- later analyzers did not execute because the job was fail-fast.

Parallel PR #304 enhanced collector run `32605227244` demonstrated full independent evidence collection:

- Gitleaks PASS;
- OSV PASS;
- Trivy PASS;
- zizmor PASS;
- pinact PASS;
- ShellCheck PASS;
- Hadolint PASS;
- actionlint FAIL (`copilot-requests` recognition plus `SC2015` in OpenCodeReview);
- yamllint FAIL across multiple YAML files;
- Regal FAIL and Conftest FAIL on parse error in `policy/docker/compose_test.rego`;
- evidence artifact ID `9483977495`.

The Regal/Conftest policy file is absent from exact current `c`, so those two findings are `PARALLEL_ONLY`, not current defects. Current canonical Remote Security does include yamllint but remains sequential, so complete current output is still unproven.

### 7.6 CI and lockfile evidence

Issue #298 `ci-full`, old candidate `b2077e0...`, run `32601043818`: FAIL. Historical failures included runtime proof, contract/binding integrity, Node deep verification, journey gate enforcement and DSH backend. One concrete DSH backend failure was a readiness test duplicating the latest migration manifest head. Exact current `readiness_test.go` now explicitly forbids that duplicated migration-head implementation and validates schema invariants instead. Verdict: `HISTORICAL_FAILURE / SOURCE_FIXED_FOR_PROVEN_READINESS_ROOT / EXACT_CURRENT_CI_REQUIRED`.

Issue #296 lockfile-integrity on the same old candidate, run `32600810413`: PASS. Verdict: `STALE_PASS`.

## 8. Source-fixed / superseded findings that must not be re-promoted without evidence

- Incomplete maker/checker/beneficiary separation: current use-case owners enforce role and rollback separation; keep negative tests, but it is no longer the highest live root.
- `platform.read` alias: exact local Identity operator authority uses `platform:read`; current tests explicitly reject `Action: "platform.read"`; final zero-reference/data proof still required.
- legacy hidden role grant/revoke idempotency wrappers: exact inspected DSH auth client exposes explicit `GrantRoleWithIdempotency` / `RevokeRoleWithIdempotency`; final zero-reference proof still required.
- historical DSH readiness latest-migration duplication: current source replaced it with invariant-based readiness.
- historical Remote Analysis Evidence privileged checkout: current collector source is trusted/default-branch owned; exact CodeQL rerun required.
- old OpenCodeReview GitHub Models `410` path: current source uses Copilot CLI; exact-current execution remains required.
- PR #304 Regal/Conftest Rego parse failures: parallel-only policy path absent from current `c`.

## 9. Effective Scope / Affected Cone

The smallest complete proven cone contains:

- `services/dsh/backend/internal/administration/**`;
- materially related DSH administration HTTP handlers, worker startup and tests;
- `services/dsh/backend/internal/auth/**` Identity RBAC client boundary;
- Identity RBAC owner endpoints/vocabulary and any migration/data reconciliation required by changed contracts;
- DSH DB schema/migrations for approval requests, rollback requests and canonical mutation intents;
- Control Panel role/approval/rollback/staff readback and success/retry/reconciliation UX;
- `.github/workflows/open-code-review.yml`;
- `.github/workflows/security-remote.yml`;
- `.github/workflows/sonarqube.yml` only for exact verification and any newly reproduced defect;
- `.github/workflows/semgrep.yml`, CodeQL/remote-analysis evidence paths and CI/lockfile control paths only where required to produce authoritative final evidence;
- generated bindings/contracts/tests only if a changed canonical contract requires them.

A repository sweep is not authorized merely because tools scan repository-wide. Scope expands only through proven consumers, trust boundaries, data relations or final-evidence requirements.

## 10. Writer / Reader / Consumer ownership map

| Truth / obligation | Canonical owner | Legitimate writer | Readers / consumers | Forbidden parallel authority |
|---|---|---|---|---|
| Role definitions / permissions / actor-role assignments | Identity | Identity RBAC APIs | DSH admin, sessions, Control Panel | DSH-local authorization registry |
| Maker/checker request and audit | DSH Administration | governed DSH use cases | Control Panel, audit/diagnostics | UI-only approval truth |
| Canonical mutation intent/reconciliation | DSH Administration | one fenced canonical executor | worker + synchronous requester | separate direct executor/finalizer |
| User-visible authorization success | canonical owner readback + finalized DSH workflow | derived only | Control Panel | local-only success inference |
| Semantic review evidence | OpenCodeReview governed remote workflow | trusted reviewer runtime | closure gate | zero-token/failed-engine result treated as clean |
| Static/security evidence | each scanner's governed remote execution | scanner workflow | closure gate | stale/different-SHA pass |
| Aggregate security verdict | Remote Security result owner | evidence aggregator | closure gate | fail-fast truncation treated as complete evidence |

## 11. Negative Space / cleanup obligations

`EXECUTE_CLOSE` must prove all of the following:

- no synchronous review path performs direct Identity authorization mutation outside the one canonical intent executor;
- no duplicated request/intent finalization SQL remains reachable;
- no stale/expired lease owner can finalize after a newer owner claims the intent;
- no two workers or worker+synchronous request can own the same execution generation;
- no retryable intent becomes unreachable because the request already moved to `approved`;
- one malformed/retryable intent does not abort unrelated claimed intents;
- no UI success appears before canonical Identity readback and fenced local finalization;
- no candidate-controlled package metadata/cache/bootstrap executes in privileged OpenCodeReview setup;
- every canonical Remote Security analyzer runs and records evidence even when another analyzer fails;
- no failed/unexecuted OCR engine is interpreted as zero findings;
- no historical, parallel-branch or different-SHA scanner pass is accepted as final evidence;
- no `platform.read`, legacy grant/revoke wrapper, dead direct executor, obsolete finalizer or redundant compatibility path remains in the affected cone after cutover;
- no old or competing plan directory remains beside this handoff.

## 12. Settled material decisions

1. Identity remains the single authorization Source of Truth.
2. DSH Administration remains the maker/checker and durable mutation-orchestration owner.
3. Exactly one canonical, fenced executor/finalizer owns each DSH canonical mutation intent; synchronous and background entry points share it.
4. Stable request-derived idempotency remains required at the Identity boundary.
5. Canonical readback is required before successful workflow/UI completion.
6. OpenCodeReview bootstrap/tool execution is trusted-source owned; candidate content is data only.
7. Remote Security remains fail-closed, but independent analyzers must all finish evidence collection before aggregate adjudication.
8. Parallel-branch-only Regal/Conftest policy additions are not imported into current `c` merely because a parallel experiment used them.
9. Sonar's historical Go coverage defect is treated as source-fixed, but no final closure is allowed without an exact final-candidate remote Sonar execution.
10. No new implementation branch is created; execution remains on human-selected branch `c` unless the human later explicitly changes that authority.
11. Exact-final-candidate evidence after the last Source change is mandatory across all materially applicable verification tools.

There are no unresolved material `DECISION_REQUIRED` items.

## 13. AUDIT_PREPARE stop condition

The highest current roots, canonical target, affected cone, writers/readers/consumers, migration/cutover/deletion obligations, tool-output history, current-vs-stale-vs-parallel classifications and exact verification gates are sufficiently proven to make execution deterministic without material rediscovery.

The next legal phase is `EXECUTE_CLOSE` using the other two contracts in this directory, after first re-pinning live branch `c` and invalidating only any cone changed after `AUDITED_TARGET_SOURCE_HEAD`.

`READY_FOR_EXECUTION`
