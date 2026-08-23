# 00 — AUDIT TRUTH

PLAN_ID: `canonical-authorization-lifecycle-contract-evidence-closure`
PACKAGE_REVISION: `13`
REPOSITORY: `bthwani2-boop/bthwani-suite-next`
TARGET_REF: `c`
STARTING_HEAD: `674db9adff75356fda220d4e1e7aca9f90c540d1`
PLANNED_HEAD: `674db9adff75356fda220d4e1e7aca9f90c540d1`
LAST_RECONCILED_HEAD: `674db9adff75356fda220d4e1e7aca9f90c540d1`
MASTER_AUDITED_HEAD: `ffc25c4d7799c36e876e2e0796551e6a50afcb9c`
AUDIT_TIMESTAMP: `2026-08-23T21:33:00+03:00`
PHASE: `AUDIT_PREPARE`
PRIMARY_FOCUS: `ALL`
STATUS: `READY_FOR_EXECUTION`

> The three PLAN_DIR artifacts are derived audit/handoff artifacts. Their delete/recreate commits occur after `PLANNED_HEAD` and do not change the Target System. `STEP-000` in `01-EXECUTION-CONTRACT.md` MUST re-resolve `c`, `master`, and PR #284 and classify every post-`PLANNED_HEAD` delta. Plan-only commits are admissible; any Target System delta invalidates this handoff until delta-reconciled.

## 1. Objective

Root-correct, end-to-end closure of the canonical Identity/DSH administration authorization system and PR #284, enforcing:

`One Material Truth -> One Canonical Source -> One Authority -> One Owner -> One Canonical Write Path -> Derived Consumers Only -> Zero Parallel Truth.`

The closure unit includes Product/Business/Operational semantics, approval and canonical-mutation lifecycle, RBAC authority, DSH orchestration, OpenAPI contracts, Control Panel consumers, persistence/reconciliation, runtime behavior, GitHub Actions trust boundaries, exact-final remote evidence, and merge readiness. `TEST PASS != FINISHED != CLOSED`.

## 2. Canonical authorities and invariants

### INV-AUTH-001 — Identity is the sole RBAC truth authority

Identity exclusively owns and canonically writes:
- actor identity/authentication;
- role definitions;
- canonical permission vocabulary;
- role-permission bindings;
- actor-role assignments/revocations;
- resolved authorization truth and canonical RBAC version semantics.

DSH MUST NOT recreate a local role registry, actor-role truth, permission registry, or alternate RBAC writer. Control Panel MUST NOT own or infer RBAC truth.

### INV-AUTH-002 — DSH Administration owns governed mutation orchestration, not RBAC truth

DSH exclusively owns the administration maker/checker ledger, separation-of-duties decision process, durable canonical-mutation intent, lease/retry/reconciliation/fencing metadata, administration audit/projection, and operator-facing lifecycle read model. Its only RBAC mutation path is the canonical Identity client followed by Identity readback and fenced DSH finalization.

Current source and migrations materially support this invariant: `dsh-1034` deletes the old DSH role registry and creates unique mutation intents; `dsh-1037` provides lease-generation fencing; canonical executor code performs Identity write/readback and transactional finalization.

### INV-AUTH-003 — Product truth owns lifecycle semantics

Approval decision state and mutation execution state are distinct material facts but have a constrained state matrix:

| Stage | Approval state | Execution state | Canonical meaning |
|---|---|---|---|
| created / awaiting review | `pending` | `not_started` | no canonical mutation has been accepted for execution |
| approved review accepted, execution outstanding | `pending` | `pending` / `reconciling` / `retryable_failure` / `terminal_failure` | maker/checker decision intent exists, but RBAC truth is not yet proven applied |
| canonical success | `approved` | `applied` | Identity mutation + canonical readback + fenced DSH finalization succeeded |
| rejected | `rejected` | `not_started` | no RBAC mutation is permitted |

Forbidden semantic pairs include `approved` with any execution state other than `applied`, `rejected` with anything other than `not_started`, and any consumer treating review intent as applied RBAC truth.

Canonical execution vocabulary:
`not_started | pending | reconciling | retryable_failure | terminal_failure | applied`.

### INV-AUTH-004 — Diagnostics vocabulary has one canonical public meaning

Product Truth, OpenAPI, and TypeScript already agree on:
`healthy | attention`.

Therefore `healthy | degraded | unhealthy` emitted by the current HTTP runtime is non-canonical public vocabulary. Canonical target: public status is `healthy` when all governed dependencies are healthy, otherwise `attention`; component-level health facts remain available for diagnosis without creating another top-level vocabulary.

### INV-AUTH-005 — OpenAPI is the transport-contract authority

`services/dsh/contracts/dsh.administration.openapi.yaml` must own the exact request, success-response, lifecycle, diagnostics, and error schemas for Administration. Backend HTTP, generated/manual bindings, and Control Panel types are consumers. Handwritten frontend declarations may exist only when mechanically proven to conform to the OpenAPI authority; no independently maintained duplicate lifecycle/error vocabulary is allowed after cutover.

### INV-AUTH-006 — Control Panel is derived consumer/operator only

Control Panel may issue governed requests/reviews and render read models. It must not optimistically declare canonical success before readback. Current controller behavior invalidates/reloads after mutations and exposes canonical reconciliation/failure errors; preserve this behavior while eliminating duplicate contract authority.

### INV-AUTH-007 — Exact-final candidate is the only closure candidate

No prior run, parallel branch, earlier SHA, historical Sonar/CodeQL/Semgrep/OpenCodeReview result, or plan status can prove closure. Every required local/remote/platform proof must target the exact final SHA after the last Target System change and after reconciliation with the current `master`.

## 3. Proven evidence baseline

### 3.1 Branch / PR / integration

At audit saturation:
- branch `c`: `674db9adff75356fda220d4e1e7aca9f90c540d1`;
- `master`: `ffc25c4d7799c36e876e2e0796551e6a50afcb9c`;
- PR #284: open, draft, `mergeable=false`, head=`c`, base=`master`;
- PR #284 size: 101 commits, 257 changed files, +9,658 / -2,732.

The PR is therefore not a final merge candidate. The 257-file diff spans Identity, DSH, WLT, Control Panel/mobile/runtime, Docker, workflows/security/quality, tooling, plans, and orchestrator-related history. The causal authorization mutation cone is narrower than the PR verification envelope.

### 3.2 Exact-current verification evidence

For exact SHA `674db9ad...`:
- GitHub combined classic status contexts returned none;
- GitHub commit workflow-run lookup returned no PR-triggered runs;
- `.github/workflows/ci.yml` on both `c` and audited `master` declares `pull_request` and `push` triggers and immutable `${{ github.sha }}` checkout.

Cause of missing runs is not proven with the available connector surface. This is an execution/platform evidence gap, not permission to infer pass.

### 3.3 Security trust boundary

PR #284 has an unresolved GitHub Advanced Security review thread on `.github/workflows/remote-analysis-evidence.yml` for CodeQL `security/code-scanning/661`: checkout of untrusted code in a privileged `workflow_run` context.

Current source intends to checkout the repository default branch and executes the collector from that checkout; the inspected collector reads local trusted configuration and remote API evidence rather than executing target-branch code. Exploitability is therefore not proven. However, the workflow routes default-branch selection through a shell step output (`steps.target.outputs.default_branch`) before checkout. Canonical treatment is to remove this taint/authority ambiguity and bind trusted collector checkout directly to repository default-branch context. Suppression/dismissal without exact rerun proof is forbidden.

### 3.4 Lifecycle contract split

`governance/product/contracts/administration-roles-approvals-audit.product-truth.json` defines approval states but not canonical mutation execution lifecycle. OpenAPI contains `MutationExecutionStatus`, yet material review endpoints still use generic `200: type: object`, while Control Panel declares concrete response shapes manually.

Backend exposes structured runtime errors including `IDENTITY_UNAVAILABLE`, `CANONICAL_MUTATION_FAILED`, `CANONICAL_MUTATION_RECONCILING`, `REQUEST_STATE_CONFLICT`, `SEPARATION_OF_DUTIES_VIOLATION`, `NOT_FOUND`, and `INVALID_REQUEST`, but material review operations do not canonically enumerate the full response/error semantics in OpenAPI.

### 3.5 Direct-response lifecycle defect

At least two rejection paths return non-canonical empty execution state in their direct review response:
- role-assignment rejection sets `status=rejected` but does not set `ExecutionStatus=not_started` before return;
- role-definition rejection has the same defect.

Rollback rejection explicitly sets `not_started`, proving inconsistent runtime semantics among three equivalent governed review journeys.

### 3.6 Diagnostics parallel truth

Product Truth + OpenAPI + TypeScript define diagnostics `healthy | attention`. Current HTTP diagnostics runtime computes/returns `healthy | degraded | unhealthy`. This is a proven public Contract/Runtime parallel truth.

### 3.7 Persistence and reconciliation

`dsh-1034_admin_canonical_mutation_intents.sql`:
- drops legacy DSH role registry after name cutover;
- removes legacy role UUID links;
- creates unique `(operation_type, request_id)` durable intent;
- persists pending/failed/applied execution state.

`dsh-1037_admin_canonical_mutation_fencing.sql`:
- adds monotonic `lease_generation` fencing;
- invalidates expired claims;
- requeues unapplied non-terminal rows for readback/reconciliation.

`dsh-1038_admin_audit_reconciliation.sql` reconstructs only missing lifecycle audit events from canonical maker/checker rows.

No second DB truth source is currently proven necessary. Any new migration is conditional on finding persisted impossible state pairs during execution reconciliation.

## 4. Highest seven material roots / closure blockers

| Rank | ID | Severity / status | Root / blocker | Required disposition |
|---|---|---|---|---|
| 1 | `RC-ADMIN-SEMANTIC-CONTRACT-001` | HIGH SYSTEMIC / PROVEN_LIVE | Product/OpenAPI/runtime/frontend do not share one complete Administration semantic contract: execution lifecycle absent from Product Truth, review responses generic in OpenAPI, manual TS response authority, rejection paths can emit empty execution state, diagnostics runtime vocabulary contradicts Product/OpenAPI/TS. | Root-correct canonicalization Product -> OpenAPI -> backend/runtime -> derived frontend; delete generic/duplicate vocabulary. |
| 2 | `RC-REMOTE-TRUST-001` | CRITICAL CLOSURE BLOCKER / PROVEN | unresolved CodeQL trust-boundary finding in privileged remote-analysis workflow; step-output indirection obscures trusted default-branch checkout. | bind checkout directly to trusted repository default-branch context; exact CodeQL/security rerun; resolve thread only after proof. |
| 3 | `RC-PR-INTEGRATION-001` | CRITICAL / PROVEN | PR #284 is draft and `mergeable=false`; current master is not yet proven integrated into final candidate. | reconcile existing `c` with current master root-correctly; no new branch; any conflict changes invalidate old verification. |
| 4 | `RC-EXACT-EVIDENCE-001` | CRITICAL / PROVEN | exact current SHA has no PR-triggered workflow evidence and no classic status contexts despite tracked CI triggers. | produce complete exact-final remote evidence set; missing/pending/stale evidence is FAIL. |
| 5 | `RC-PR-SCOPE-001` | HIGH / PROVEN | #284 is a 101-commit/257-file mega-PR; causal authorization cone is smaller than merge verification envelope. | do not blindly revert valid accumulated work; classify changes, keep semantic mutation cone minimal, but verify entire final PR envelope. |
| 6 | `RC-HANDOFF-STALE-001` | HIGH / PROVEN | prior `READY_FOR_EXECUTION` package was pinned to `57f6603...`, far behind audited `674db9ad...`. | old three artifacts are DELETE_REQUIRED and replaced by this package; execution starts with exact delta reconciliation. |
| 7 | `RC-MERGE-GATE-001` | HIGH / MISSING PLATFORM PROOF | `master` reports protected=true, but returned branch-protection payload has required-status enforcement off/empty; separate ruleset existence is not proven by the available endpoint. | require live platform ruleset/required-check proof when available plus explicit fail-closed exact evidence matrix; never merge because UI merely lacks red. |

## 5. Owner / writer / reader / consumer matrix

| Material truth | Canonical owner/source | Canonical writer | Readers / derived consumers | Forbidden parallel authority |
|---|---|---|---|---|
| RBAC role definitions / permissions / assignments | Identity | Identity RBAC endpoints/repository | DSH Administration, Control Panel, runtime authorization | DSH local role registry, Control Panel role truth |
| maker/checker request decision | DSH Administration request tables | DSH Administration review use cases | OpenAPI/HTTP, audit, Control Panel | UI-local approval, second workflow state |
| canonical mutation execution | DSH intent + canonical Identity readback/finalizer | one DSH canonical intent executor calling Identity | DSH request read model, HTTP, Control Panel | synchronous alternate Identity writer, duplicate queue/executor |
| execution lifecycle vocabulary/state matrix | Product Truth -> OpenAPI | product/contract owner during execution | Go models/runtime, TS generated/derived types, UI | manual independent enums/mappings |
| diagnostics top-level vocabulary | Product Truth -> OpenAPI | Administration diagnostics runtime conforming to contract | Control Panel | runtime-only degraded/unhealthy vocabulary |
| audit projection | DSH Administration audit ledger | governed transaction/finalizer/reconciliation migration | Control Panel/audit readers | editable/shadow audit log |
| PR merge truth | GitHub PR + current branch/base | repository platform | CI/quality/security/merge operator | stale local SHA or historical status |

## 6. Effective scope / affected cone

### MUST_MUTATE in EXECUTE_CLOSE

1. Product semantic authority:
   - `governance/product/contracts/administration-roles-approvals-audit.product-truth.json`.
2. DSH Administration transport contract:
   - `services/dsh/contracts/dsh.administration.openapi.yaml` and canonical generated/validation outputs required by repository convention.
3. DSH Administration backend/HTTP where necessary to conform:
   - review response lifecycle semantics;
   - diagnostics public vocabulary;
   - exact structured error/result mapping;
   - regression tests around canonical intent/readback/fencing.
4. DSH shared Administration frontend + Control Panel consumers required to migrate to canonical contract authority without duplicate truth.
5. Persistence only if execution reconciliation proves an impossible persisted state not representable/recoverable by current schema.
6. `.github/workflows/remote-analysis-evidence.yml` and immediately related collector/gates only where needed to close `RC-REMOTE-TRUST-001` and exact-evidence authority.
7. PR #284 metadata/body/review state and repository verification surfaces required for exact-final green proof.

### READ_ONLY / MUST_REMAIN_NEGATIVE-SPACE-CLOSED unless contradiction appears

- Identity RBAC authority implementation and migrations already establishing sole RBAC ownership;
- current canonical DSH intent executor architecture, leasing/generation fencing, Identity post-readback, atomic finalization;
- unrelated commerce/order/catalog/finance/workforce/mobile product semantics;
- `tools/prompting/bthwani-orchestrator/**` absolutely read-only.

### Verification envelope

Because PR #284 currently includes 257 changed files, exact-final regression/security/quality verification MUST cover the whole merge candidate, even when the source mutation cone stays narrow.

## 7. Artifact disposition / residue obligations

| Artifact/residue | Classification | Obligation |
|---|---|---|
| prior three PLAN_DIR files pinned to stale source | STALE/SUPERSEDED | `DELETE_REQUIRED` -> replaced by this package (performed in AUDIT_PREPARE) |
| generic OpenAPI review `200 object` responses | PARALLEL/INCOMPLETE CONTRACT | `DELETE_REQUIRED` after typed response replacement |
| manual frontend lifecycle/response/error vocabulary that independently owns semantics | DUPLICATE TRUTH | `MIGRATE_REQUIRED`, then `DELETE/DERIVE_REQUIRED` |
| public runtime diagnostics `degraded/unhealthy` | PARALLEL TRUTH | `DELETE_REQUIRED`; canonical public state becomes `attention` |
| rejected role-assignment/role-definition direct response with empty execution state | SEMANTIC DEFECT | `FIX_REQUIRED` -> `not_started` |
| workflow default-branch shell-output trust indirection | SECURITY/TRUST AMBIGUITY | `DELETE_REQUIRED` -> direct trusted repository context |
| unresolved CodeQL review thread | OPEN MATERIAL FINDING | remain unresolved until exact fixed-SHA CodeQL proof, then resolve |
| stale PR body claims such as unstaged residue | STALE METADATA | `UPDATE_REQUIRED` before merge readiness |
| historical/parallel CI/Sonar/CodeQL/Semgrep/OCR evidence | STALE EVIDENCE | diagnostic only; cannot satisfy closure |
| old DSH local role registry | LEGACY TRUTH | already removed by migration; negative-space proof required |

## 8. Negative-space obligations

Execution and closure must prove absence of:
- any direct DSH RBAC writer outside the canonical intent executor;
- any DSH role/permission registry acting as authority;
- any UI/client code interpreting `approved` as success without canonical applied/readback semantics;
- any response path emitting empty/unknown execution status;
- any alternate execution-state or diagnostics vocabulary;
- any generic review success schema after typed cutover;
- any stale compatibility alias/fallback preserving old semantics;
- any second queue/worker/synchronous path capable of the same Identity mutation;
- any approved request lacking applied canonical intent/readback, or rejected request with executable intent;
- any unresolved material PR review/security/quality finding;
- any required exact-final evidence missing, pending, stale, or tied to a different SHA.

## 9. Decision ledger

`NO OPEN MATERIAL DECISION_REQUIRED` at handoff saturation.

Resolved by existing authority/evidence:
- diagnostics target is `healthy | attention` because Product Truth + OpenAPI + TS agree and runtime is the outlier;
- Identity remains RBAC authority; DSH remains orchestration/projection owner;
- approval/execution pair matrix follows current canonical finalization behavior and prevents false applied semantics;
- no new persistent truth table is justified.

Execution MUST stop and return to AUDIT_PREPARE if current `master` reconciliation, a new branch delta, or runtime/data inspection exposes a materially different owner/authority or requires a product choice not encoded here.

## 10. Capability/evidence ledger

- GitHub connector: authoritative for live branch/PR/files/reviews/status/workflow-run evidence and repository metadata.
- API Response Cleaner: used to normalize current PR metadata without changing it.
- Atlassian Rovo: attempted; environment returned 403/not installed, therefore no usable project authority.
- Linear: searched; no matching #284/canonical-authorization artifact, therefore no planning authority.
- GitHub Advanced Security/CodeQL: live unresolved review finding available through PR review thread; exact post-fix rerun still required.
- Other listed plugins/tools: not elevated to authority where no direct connected or material evidence source was available; they may be used selectively in EXECUTE_CLOSE/VERIFY if they materially validate their specialty.

## 11. Audit saturation / handoff rule

This package is `READY_FOR_EXECUTION` because the material source defects, canonical owners, treatment order, affected cone, cleanup obligations, migration/reconciliation conditions, and exact-final closure gates are deterministic without further product rediscovery.

It is NOT `CLOSED`, PR #284 is NOT merge-ready, and no Target System fix has been performed in this phase.
