# VERIFICATION & CLOSURE — Canonical Identity/DSH Authorization Final Closure

## Closure law

`GREEN != CLOSED`.

`CLOSED` is permitted only for the exact final candidate after the **last target-system write**, after a fresh affected-cone/negative-space re-audit, and after both pre-merge PR evidence and post-merge landed-master readback are coherent.

Record final candidate identity:

- branch/ref;
- exact commit SHA;
- PR `#284` head SHA;
- current base/master SHA;
- migration/schema/runtime provenance;
- generated contract/client provenance;
- CI/CodeQL/Sonar/Remote Security/semantic review run identities and freshness;
- post-merge landed `master` SHA and Remote Analysis Evidence identity.

Any target-system write after evidence collection invalidates affected evidence and requires re-pin/re-run.

## A. Canonical ownership proof

Prove:

- Identity is the only permission vocabulary, role-definition, actor-role assignment/revocation and resolved-authorization authority;
- DSH Administration owns governed workflow/projection/audit only;
- WLT remains financial truth for payout effects;
- no local UI/backend/database shadow authorization truth is reachable.

Evidence authority: durable governance + source/schema inspection + focused runtime/readback + negative caller/import/route/schema searches.

## B. Separation-of-duties proof — RC0

Prove server-side for approve **and reject** paths:

1. maker cannot review own assignment/revocation request;
2. beneficiary cannot review own assignment/revocation request;
3. unrelated checker with exact permission can review;
4. rollback maker cannot review own rollback request;
5. rollback beneficiary cannot review rollback;
6. original source checker cannot review rollback;
7. unrelated rollback checker with exact permission can review;
8. worker/replay/direct domain caller cannot bypass the same checks;
9. wrong surface / missing exact permission still fails before mutation;
10. failure response is distinct and does not enqueue or call Identity.

Product Truth explicitly owns these negatives; passing UI behavior is not sufficient evidence.

## C. Canonical operation lifecycle/recovery proof — RC1

Required scenarios through DB/integration/runtime tests:

1. normal synchronous success → governed request and operation become terminal consistently and Identity readback matches;
2. Identity unavailable before mutation → local operation remains non-terminal with bounded retry schedule, no fake success;
3. process restart after operation persistence but before Identity call → worker resumes with same idempotency identity;
4. Identity commits but response is uncertain → replay/readback reconciles without a new effective mutation identity;
5. Identity succeeds then DSH dies before local finalization → later replay obtains same result and atomically finalizes request + operation exactly once;
6. failure in local finalization cannot produce durable `approved request + unjustified non-terminal operation` residue;
7. two DSH worker instances cannot concurrently own the same due operation;
8. worker death/stale lease is recoverable;
9. retryable dependency failure uses bounded backoff, not repeated 5-second hot retry;
10. permanent version/idempotency/contract conflict becomes explicit terminal/actionable reconciliation state;
11. existing orphan rows are classified/reconciled with zero unexplained residue;
12. role definition, assignment/revocation and rollback all obey the same lifecycle invariants.

Database assertions after proof:

- zero approved governed requests with required operation left unjustifiably non-terminal;
- zero due operations permanently unclaimable;
- zero simultaneous active claims for one operation;
- zero unknown/malformed operation types silently retrying;
- retry/terminal constraints valid;
- canonical readback matches governed terminal state.

## D. Migration proof

Run both fresh-install and representative upgrade.

Representative upgrade must include:

- pre-`identity-028` broad administration bindings;
- pre-cutover local DSH role references;
- existing pending/failed canonical operations;
- Identity-already-applied/request-pending window;
- approved-request/non-applied-operation orphan window;
- stale permission alias if proven obsolete;
- persisted source checker needed for rollback separation.

Verify:

- `identity-028..031` invariants remain valid;
- `dsh-1033..1035` remain valid;
- new migrations are forward-only/registered/idempotent according to repository policy;
- old `dsh_admin_roles`/`role_id` authority absent;
- broad administration vocabulary/bindings absent;
- direct projection writes rejected;
- role versions/idempotency survive upgrade;
- fresh and upgraded DBs converge to identical canonical invariants.

## E. Contract/frontend proof

Trace all three governed journeys:

`UI → controller → API contract → exact authorization → separation-of-duties → DSH operation → Identity writer → canonical readback → DSH terminal/read model → UI readback`.

Prove:

- contract/error/status semantics match runtime;
- no handwritten/generated client drift;
- no stale route binding;
- loading/empty/denied/validation/separation/conflict/dependency/reconciling/terminal-failure/success states are clear;
- duplicate click prevented;
- queued/reconciling is neither fake success nor generic terminal failure;
- canonical refresh/readback after success;
- Arabic/RTL/accessibility materially touched remains correct;
- frontend never owns permission/role/operation truth.

## F. Residue/deletion proof — RC2

Before deletion, inventory callers/imports/routes/contracts/tests/runtime references. After cutover prove zero legitimate reachability for removed paths.

Required searches/checks include:

- broad actions `administration.read`, `administration.manage`, `administration.approve`;
- local role authority `dsh_admin_roles`, obsolete `role_id` fields/FKs;
- stale permission spelling such as `platform.read` if canonical action is `platform:read`;
- `legacy-grant:`, `legacy-revoke:`, `legacy-role-definition:` and their wrappers;
- superseded split-operation worker/finalization helpers;
- stale OpenAPI/client/type/schema names;
- TODO/FIXME/HACK/compatibility comments that merely defer this cutover.

Text search alone is not deletion authority; combine it with reachability and persisted-data proof.

## Focused local/CI verification stack

Use smallest complete applicable set, expanding only on failure/evidence gap:

- Identity Go unit/integration/database tests for RBAC definition, vocabulary, idempotency, projection fences and permission resolution;
- DSH Go unit/integration/database tests for separation-of-duties, request states, canonical operation lifecycle, worker claim/backoff/reconciliation, audit and exact permissions;
- OpenAPI/contract/provenance/generated-client consistency checks;
- control-panel typecheck/tests and affected administration interaction/journey tests;
- fresh migration/startup/readiness/runtime proof;
- security/isolation adversarial tests for exact permission, separation, replay and concurrency;
- repository-owned scope/binding/provenance guards.

Do not weaken/suppress/exclude a failing applicable check merely to obtain green.

## Deep tool assurance — exact PR head before merge

### CodeQL

Canonical source: `.github/workflows/codeql.yml`.

Require:

- immutable checkout SHA = PR head;
- affected language/module scope is correct for diff;
- applicable JS/TS, Go and Actions jobs succeed;
- `security-extended` analysis completes;
- no unresolved material CodeQL alert tied to candidate remains;
- analysis-key hygiene is not confused with security closure.

A green workflow with unresolved candidate alert is not closure.

### SonarQube Cloud

Canonical sources: `.github/workflows/sonarqube.yml` + `sonar-project.properties`.

Require:

- scanner revision exactly equals PR head;
- `sonar.qualitygate.wait=true` behavior is effective;
- Quality Gate = `OK`;
- inspect unresolved issues, severity/impacts, bugs/vulnerabilities/code smells, coverage, duplicated-line density, ratings and security hotspots;
- zero unresolved material vulnerability/blocker/critical/high-impact issue;
- zero unreviewed material hotspot;
- existing suppressions are only accepted if still grounded and not used to hide this change.

### Remote Security

Canonical source: `.github/workflows/security-remote.yml`.

Require successful exact-candidate results for:

- remote analysis authority/config validation;
- Gitleaks;
- OSV Scanner;
- Trivy;
- actionlint;
- zizmor;
- pinact verify;
- ShellCheck;
- Hadolint;
- yamllint.

Inspect failed job logs and root cause; rerun only after proving failure is transient or after treatment. Never retry repeatedly to mask deterministic failure.

### OpenCodeReview

Canonical policy/rules: `.agents/tools/open-code-review.md`, `.opencodereview/rule.json`.

Require, if execution backend is available:

- exact base/head pinned;
- deterministic included/excluded file list recorded;
- rules applied to workflows/contracts/migrations/DSH/tests/frontend/security/concurrency/idempotency as applicable;
- grounded Critical/High/Medium issues closed;
- result treated as advisory, not self-approval.

If OCR cannot execute in the current host, record the limitation and obtain equivalent independent semantic review; do not claim OCR success.

### CodeRabbit / Codex Security

Use when execution backend is actually available:

- CodeRabbit for independent PR semantic review;
- Codex Security diff scan for security coverage of every changed source file and validated candidates.

Do not attribute manual findings to those tools.

## Independent review proof

At least one reviewer/agent/tool independent of the implementation author must review the exact final diff. All material review threads/findings must be resolved or explicitly proven false/non-applicable with evidence.

No independent review result was available during `AUDIT_PREPARE`; final execution must obtain fresh evidence.

## PR #284 pre-merge gate

Before marking ready/merging:

1. `c` HEAD == declared final candidate;
2. PR head SHA == candidate;
3. compare with live `master`; classify concurrent delta;
4. mergeable state is clean without unauthorized Orchestrator conflict handling;
5. no unresolved material review threads/findings;
6. exact-head CI/CodeQL/Sonar/Remote Security/semantic review requirements above pass;
7. protected `tools/prompting/bthwani-orchestrator/**` divergence is absent or handled through separately authorized Orchestrator maintenance;
8. final affected-cone + negative-space re-audit on candidate finds no material root;
9. merge uses expected-head SHA protection.

## Post-merge landed-master gate

`Remote Analysis Evidence` is intentionally branch-`push`/default-branch readback authority and can skip a development push when an open PR owns verification. Therefore it is **post-merge landed-SHA evidence**, not a replacement for pre-merge PR checks.

After merge:

1. pin exact landed `master` SHA;
2. require the canonical branch workflows for that SHA (`BThwani Contextual CI`, CodeQL, SonarQube Cloud, Remote Security);
3. run/read `Remote Analysis Evidence` for landed `master` SHA;
4. require collector policy `PASS`:
   - CodeQL exact-SHA analysis complete and no open alerts;
   - Sonar latest revision == landed SHA;
   - Quality Gate `OK`;
   - zero material unresolved Sonar issues;
   - zero unreviewed hotspots;
   - required workflow conclusions success;
5. if landed readback fails or reveals a material issue, `CLOSED` is forbidden/revoked and treatment resumes.

## Final re-audit / negative space

After the last treatment write and again after landing:

`RE-PIN → AUDIT → INSPECT → DIAGNOSE → ANALYZE affected cone → NEGATIVE SPACE → RE-RANK ROOTS`.

Reconfirm:

- authority boundaries;
- all writers/readers/consumers migrated;
- separation invariants;
- lifecycle/retry/restart/concurrency/recovery invariants;
- contract/data/readback agreement;
- no partial migration/stale process/artifact;
- no parallel authority/truth;
- no orphan/broken state;
- no known material finding;
- no unjustified compatibility/fallback/legacy residue;
- no regression in materially touched project-frame invariants.

Any new material root forbids `CLOSED` and restarts ordered treatment.

## Closed-state definition

Report `CLOSED` only when all are simultaneously true:

- RC0 separation-of-duties proven end-to-end and adversarially;
- RC1 lifecycle/recovery/multi-replica invariants proven;
- RC2 stale aliases/legacy helpers removed or bounded by a proven temporary external dependency with explicit retirement trigger;
- historical Identity/DSH cutover has zero missing writer/reader/consumer;
- fresh/upgrade DB and representative runtime readback pass;
- UX reflects operational/recovery truth;
- exact permission/security/privacy negatives pass;
- exact PR-head CodeQL/Sonar/Remote Security/semantic review have no unresolved material finding;
- PR #284 is mergeable/clean against current master without unauthorized Orchestrator mutation;
- merge occurs with expected-head protection;
- exact landed-master Remote Analysis Evidence passes;
- final re-audit finds no known material defect or unjustified residue in Effective Scope.

Until all are true, the correct state is not `CLOSED`.
