# Canonical Authorization Lifecycle + Exact Remote Evidence — Verification & Closure Contract

PLAN_ID: `canonical-authorization-lifecycle-contract-evidence-closure`  
REPOSITORY: `bthwani2-boop/bthwani-suite-next`  
TARGET_REF: `c`  
AUDITED_TARGET_SOURCE_HEAD: `57f6603c6e9fa15d2c406f454b9e20f566f30599`  
PRIMARY_ROOT: `RC-AUTH-CONTRACT-001`

## 1. Final-candidate law

Define `F` as the exact final **Source** SHA after the last material Target-System/source mutation.

All closure evidence must point to `F` or to an explicitly immutable artifact produced from `F`.

```text
OLD SHA != FINAL EVIDENCE
PLAN-ONLY SHA != SOURCE CANDIDATE
STALE PASS != FINAL PASS
PARALLEL-BRANCH PASS != FINAL PASS
CONFIGURED != RAN
RAN != COVERED
COVERED != CLEAN
SKIPPED != PASS
BLOCKED != PASS
0 FINDINGS + ENGINE FAILURE != PASS
```

If any source change occurs after a verification run, invalidate every tool result whose scope can be affected and rerun it on the new `F`.

No `CLOSED` declaration is valid before `F` is pinned and the acceptance criteria below are all satisfied.

## 2. Product/System semantic verification

### `V-PRODUCT-001`

The existing administration Product Truth must define, in one canonical owner:

- decision states `pending | approved | rejected`;
- execution states `not_started | pending | reconciling | retryable_failure | terminal_failure | applied`;
- the invariant `approved != applied`;
- the exact conditions for `applied`;
- owner boundaries: Identity RBAC truth vs DSH decision/intent/reconciliation/audit truth vs Control Panel consumption;
- failure/reconciliation meaning visible to the operator.

**Acceptance:** no separate governance file, implementation comment, UI type or workflow document is required to understand the canonical lifecycle meaning.

### `V-PRODUCT-002`

Search negative space for materially conflicting statements that equate approval with completed canonical mutation.

**Acceptance:** zero reachable/still-authoritative conflicting Product/System statement inside the affected cone.

## 3. OpenAPI / contract verification

### `V-CONTRACT-001`

All three governed review endpoints must have typed success/result schemas, not generic untyped objects.

**Acceptance:** role assignment/revocation, role-definition review and rollback review expose canonical decision and execution state consistently.

### `V-CONTRACT-002`

`MutationExecutionStatus` must have one canonical vocabulary only.

**Acceptance:** zero divergent endpoint-local enum or handwritten consumer enum that can drift from the canonical contract.

### `V-CONTRACT-003`

The API contract must explicitly model the real structured failure space, including where applicable:

- `400 INVALID_REQUEST`;
- `400 SEPARATION_OF_DUTIES_VIOLATION`;
- `401`;
- `403`;
- `404 NOT_FOUND`;
- `409 REQUEST_STATE_CONFLICT`;
- `409 CANONICAL_MUTATION_RECONCILING`;
- `409 CANONICAL_MUTATION_FAILED`;
- `503 IDENTITY_UNAVAILABLE`.

**Acceptance:** no material runtime outcome exists only in backend/frontend knowledge while missing from the canonical public/internal contract.

### `V-CONTRACT-004`

Generated/manual bindings must be synchronized from the canonical contract.

**Acceptance:** contract generation/integrity check passes; no stale generated binding or duplicate handwritten DTO remains in the affected cone.

## 4. Backend / executor verification

### `V-BACKEND-001 — one execution authority`

Search all affected backend code for direct Identity role mutation or role-definition mutation reachable from review paths.

**Acceptance:** governed execution flows only through the one canonical intent reconciler/finalizer.

Forbidden negative-space count:

- direct governed `GrantRoleWithIdempotency` outside canonical execution owner: `0`;
- direct governed `RevokeRoleWithIdempotency` outside canonical execution owner: `0`;
- direct governed role-definition mutation outside canonical execution owner: `0`;
- second local request/intent finalizer implementation: `0`;
- unleased direct fallback: `0`.

### `V-BACKEND-002 — fencing`

Concurrency tests must prove:

- synchronous review vs worker race yields one valid execution owner/finalizer;
- stale owner after lease expiry/reclaim cannot write applied/failure success state;
- lease generation mismatch blocks stale finalization;
- owner+generation+expiry are checked on finalization and failure transitions.

### `V-BACKEND-003 — unknown-result/recovery`

Prove:

- Identity mutation success + local interruption converges by canonical readback without duplicate semantic mutation;
- ambiguous remote timeout performs readback before retry;
- already-converged Identity state skips unnecessary mutation and finalizes correctly;
- retryable and terminal failures remain distinct;
- Identity unavailable never produces local-only applied success.

### `V-BACKEND-004 — SoD and request state`

Regression tests must cover maker/checker/beneficiary separation, rollback original-checker exclusion, request version conflicts and not-found behavior.

## 5. Data / database verification

### `V-DATA-001`

Inspect current request/intent persistence for every material state combination.

**Acceptance:** one consistent persisted orchestration truth exists; no orphan/ambiguous combination requires a hidden third lifecycle meaning.

### `V-DATA-002`

Where historical data can predate canonical execution semantics, reconcile/read back representative approved requests against Identity truth.

**Acceptance:** no known material row is treated as canonically applied solely because local approval says `approved` when Identity truth disagrees.

### `V-DATA-003`

If no schema change is implemented, explicitly prove existing schema can represent the complete target lifecycle.

If a migration/backfill becomes necessary, prove fresh install, supported upgrade, deterministic backfill/reconciliation, restart/idempotency and zero old-writer reachability before closure.

## 6. Control Panel / UX verification

### `V-UI-001`

The operator must see materially distinct outcomes for:

- applied success;
- reconciling/in progress;
- retryable failure;
- terminal failure;
- Identity unavailable;
- state/version conflict.

**Acceptance:** no optimistic UI state displays canonical success before applied readback.

### `V-UI-002`

The consumer must use structured canonical error codes/statuses, not message substring matching.

**Acceptance:** zero material error semantic duplicated in ad-hoc UI string parsing.

### `V-UI-003`

After applied success:

- assignment/revocation/rollback refreshes affected canonical staff state plus required workflow/audit/diagnostic projections;
- role-definition success refreshes the canonical roles state plus required workflow/audit/diagnostic projections.

**Acceptance:** later readback from the owner agrees with the displayed state.

## 7. Cleanup / negative-space verification

### `V-CLEAN-001`

Prove zero material residue after cutover:

- stale generic review success schema;
- duplicate lifecycle enums;
- duplicate transport error maps;
- direct legacy executor/finalizer path;
- second queue/lifecycle authority;
- silent direct fallback;
- stale `approved == applied` assertion/comment/test;
- obsolete compatibility wrapper retained only “for safety”;
- dead helper created by migration;
- stale plan package capable of misleading later execution.

### `V-CLEAN-002`

Re-run zero-reference searches for previously closed signals:

- legacy `platform.read` permission alias;
- superseded hidden role grant/revoke wrappers;
- direct governed Identity mutation from review paths;
- duplicate `applied` finalization SQL outside canonical owner.

Any reachable material survivor must be classified and treated before closure.

## 8. Exact-final remote tool evidence

For every applicable tool below record at minimum:

`tool/workflow | exact SHA/ref | run/check ID | actual jobs/steps executed | artifact/provenance | findings | skipped/blocked components | final conclusion`.

A workflow title or green aggregate alone is not sufficient evidence.

### `CE-SONAR-001 — SonarQube Cloud`

Required on `F`:

- Sonar token/config validation succeeds;
- affected Node coverage completes if applicable;
- every affected Go module produces a non-empty valid coverprofile;
- raw and normalized Go coverage pass `go tool cover -func` validation;
- **Sonar scanner step actually executes**;
- analysis uploads successfully;
- Quality Gate result is retrieved and PASS;
- Security Rating on New Code meets required `A` where the gate requires A;
- zero unresolved material Sonar findings within scope;
- no coverage exclusion/suppression introduced merely to make the gate green.

Historical run `32605132576`, where coverage failed and scanner was skipped, is explicitly invalid as final evidence.

### `CE-CODEQL-001 — CodeQL`

Required on `F`:

- GitHub Actions analysis completes;
- JavaScript/TypeScript analysis completes when affected/applicable;
- all applicable Go module analyses complete;
- aggregate result passes;
- zero known material code-scanning findings in the affected cone;
- historical OpenCodeReview cache-poisoning/unsafe-checkout findings do not recur.

Any skipped language/module must have explicit `N/A_PROVEN` routing evidence.

### `CE-SEMGREP-001 — Semgrep`

Required on `F`:

- exact candidate is materialized;
- configured rule packs execute;
- engine exit/output is valid;
- evidence JSON/summary/artifact exists;
- policy enforcement executes;
- zero blocking/material findings.

The parallel artifact `9483950508` is diagnostic only and cannot satisfy this criterion.

### `CE-OCR-001 — OpenCodeReview`

Required on `F`:

- trusted review engine bootstrap succeeds;
- provider/Copilot execution succeeds;
- every selected reviewable file is actually completed or explicitly and legitimately excluded;
- normalized semantic findings and provenance are produced;
- artifact is retained;
- zero material findings after adjudication.

Fail closed if:

- provider returns 4xx/5xx;
- review status is failed;
- all/any required file reviews fail;
- token/provider evidence shows no actual model execution where one was required;
- artifact/evidence is missing.

Historical OCR run `32602076128` proves why `0 findings` with engine failure is invalid. The later parallel artifact `9483955173` proves the engine path can run but is not final evidence.

### `CE-SECURITY-001 — Remote Security`

Every required analyzer in the current matrix must independently produce outcome + log/JSON/artifact on `F`:

- Gitleaks;
- OSV Scanner;
- Trivy;
- actionlint;
- zizmor;
- pinact;
- ShellCheck;
- Hadolint;
- yamllint.

Acceptance:

- no analyzer silently skipped because another failed;
- no analyzer `BLOCKED` by toolchain installation;
- every required analyzer concludes PASS;
- aggregate gate PASS;
- zero unresolved material secrets/vulnerabilities/workflow/container/YAML findings;
- every vulnerability suppression/exclusion is current, narrowly justified and backed by owner-correct mitigation where applicable.

Historical run `32603966329` is evidence of the old partial/fail-fast problem only, not final security proof.

### `CE-DEPENDENCY-001 — Dependency Review`

When applicable to the final diff:

- exact base/head are correct;
- fail-closed threshold is enforced;
- no disallowed vulnerability/license/material dependency finding remains.

If not triggered/applicable, record explicit routing evidence rather than silence.

### `CE-LOCKFILE-001 — Lockfile Integrity`

When package/lockfile cone is affected:

- frozen install succeeds;
- canonical lockfile/install state does not mutate tracked files;
- dependency graph remains deterministic.

Old run `32600810413` is stale and cannot satisfy final evidence.

### `CE-CI-001 — Contextual/full/runtime/journey CI`

Run the canonical CI breadth implied by the final change cone.

At minimum prove:

- contract/OpenAPI integrity;
- DSH backend tests;
- affected Node/control-panel verification;
- generated binding integrity;
- runtime/readiness proof where changed semantics require it;
- journey/administration semantic tests where routed.

No historical failing or passing CI result is carried forward after final source mutation.

### `CE-REMOTE-EVIDENCE-001 — Remote Analysis Evidence`

The repository's canonical evidence aggregator/readback must point to exact live `F`, reject superseded candidates, and report the actual underlying tool evidence rather than manufacturing a PASS from missing checks.

## 9. Falsifiable acceptance criteria

### `AC-001 — One semantic lifecycle truth`

Product Truth, OpenAPI, backend, generated/manual bindings and Control Panel use the same decision/execution state meanings.

### `AC-002 — One mutation execution authority`

Exactly one canonical reconciler/finalizer is reachable for governed Identity mutations.

### `AC-003 — Complete cutover`

Every affected writer/reader/consumer has migrated; zero material old contract or local semantic truth remains reachable.

### `AC-004 — Canonical readback`

Applied success is backed by Identity canonical post-readback and fenced DSH finalization; affected UI later readback matches owner truth.

### `AC-005 — Failure/recovery correctness`

Reconciliation, retryable failure, terminal failure, unknown result, Identity unavailability and request conflicts remain distinct and test-proven.

### `AC-006 — Zero material residue`

`Dead/Stale/Duplicate/Orphan/Obsolete/Superseded/Parallel-Truth` residue proven inside the cone has been deleted/migrated/reconciled and reference integrity is clean.

### `AC-007 — Exact-final tool evidence`

All applicable SonarQube, CodeQL, Semgrep, OpenCodeReview, Remote Security, dependency, lockfile and CI evidence is complete on `F` with actual outputs inspected.

### `AC-008 — Zero known material findings`

No known material Product/System/Contract/Backend/Frontend/Data/Runtime/Security/Quality finding remains open in the effective scope.

## 10. Closure prohibition

The following states are explicitly **not CLOSED**:

- contract compiles but Product Truth is stale;
- backend tests pass but OpenAPI is generic/incomplete;
- UI works but displays approved as applied before owner readback;
- Sonar workflow is green because scanner was skipped;
- CodeQL is green on an older SHA;
- Semgrep/OCR passed on a divergent PR candidate;
- OCR says zero findings while engine/provider failed;
- Remote Security has clean Gitleaks/OSV/Trivy but later analyzers skipped;
- one exact-final tool is missing/blocked/unread;
- a material cleanup obligation remains;
- any old authority/path remains reachable;
- final evidence predates the last source mutation.

Closure is valid only when the exact final source candidate demonstrates:

`ONE CANONICAL PRODUCT/SYSTEM TRUTH + ONE OWNER PER FACT + COMPLETE CONSUMER CUTOVER + ZERO PARALLEL AUTHORITY + ZERO KNOWN MATERIAL FINDINGS + ZERO MATERIAL RESIDUE + EXACT-FINAL REMOTE EVIDENCE`.
