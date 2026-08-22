# AUDIT TRUTH — Canonical Identity/DSH Authorization Final Closure

## Invocation snapshot

- Repository: `bthwani2-boop/bthwani-suite-next`
- Branch: `c`
- Phase: `AUDIT_PREPARE`
- Target-system audit SHA: `02dd5cc5122909093946ef1dc200cf0848ccb2f1`
- Orchestrator package at audited SHA: revision `12`
- Pull request: `#284` (`c` → `master`), open draft during audit
- `tools/prompting/bthwani-orchestrator/**` is protected/read-only for this objective.
- Target-system code remained read-only during this phase. Only this mandatory temporary handoff directory was written.

## Canonical Product/System truth

1. Identity is the sole authority for actor identity, role/permission vocabulary, role definitions, actor-role assignments and resolved authorization.
2. DSH Administration owns maker/checker workflow, approval/rollback records, audit/projection/read models and delegation to sovereign owners; it must not own parallel authorization truth.
3. Administration authorization is exact and surface-scoped: `service=dsh`, `surface=control-panel`, exact action and governed scope. Broad role labels/umbrella permissions are not authorization.
4. Maker, beneficiary and checker are distinct for staff role changes. Rollback checker must also be distinct from the original decision checker.
5. A rollback is an independently approved inverse decision and never deletes source approval/audit history.
6. Successful UX state must equal committed canonical readback. Dependency failure, reconciliation and unknown-result windows are real product states.
7. WLT remains financial truth for payout effects; DSH only owns operational routing/authorization around those integrations.

Primary durable truth owners inspected: `governance/product/PRD.md`, `governance/product/platform-model.yaml`, `governance/product/contracts/administration-roles-approvals-audit.product-truth.json`.

## Effective working cone deeply audited

- Identity RBAC/domain/http boundaries, normalized permission graph and projection fences.
- Identity migrations `identity-028..031`.
- DSH role-definition, staff role assignment/revocation and rollback workflows.
- DSH canonical mutation intent lifecycle/worker/runtime startup.
- DSH migrations `dsh-1033..1035`.
- Exact DSH administration permission gate and materially connected payout exact-permission consumers.
- Control-panel administration role-definition/assignment/rollback queues, shared controller/API path and session permission gates.
- Administration OpenAPI/contract path.
- PR #284 integration state and changed cone.
- SonarQube Cloud, CodeQL, Remote Security, Remote Analysis Evidence and OpenCodeReview configuration/authority paths.

Unrelated domains/surfaces were not repository-swept. They enter scope only through a proven writer/reader/consumer, contract, data, runtime, authority, security or regression relation.

## Already materially corrected at audited SHA

- `requireAdministrationPermission` resolves trusted Identity authorization and requires an exact action; no broad operator-role bypass was found.
- `identity-028` migrates legacy broad administration grants to exact actions and removes broad vocabulary/bindings.
- Identity permission resolution reads normalized RBAC tables rather than projection JSON as authority.
- `identity-029..031` add idempotency/version controls and database fences against direct projection writes.
- `dsh-1033` cuts persisted DSH administration role references from local `role_id` to canonical `role_name` and drops `dsh_admin_roles`.
- DSH role-definition requests validate actions against Identity-owned vocabulary.
- Role-definition/assignment/rollback paths use stable idempotency keys against Identity.
- Control-panel role-definition UI no longer owns a hard-coded permission vocabulary.
- Administration queues implement meaningful loading/error/empty/submitting states and canonical reloads after successful calls.

These treatments materially close the historical split-authority problem, but the roots below still forbid `CLOSED`.

## Root Landscape

### RC0 — CRITICAL/HIGH — Separation-of-duties Product Truth is not fully enforced server-side

Durable Product Truth explicitly forbids:

- maker self-approval;
- beneficiary approval;
- original checker approving rollback;
- and states that maker, beneficiary and checker are distinct for role assignments, with rollback checker also distinct from original decision checker.

Current backend proof:

- `CreateRoleAssignmentApproval` correctly forbids maker == beneficiary.
- `ReviewRoleAssignmentApproval` only rejects `requested_by == actorID`; it does **not** reject reviewer == `target_actor_id`. Therefore the beneficiary can approve/reject their own role assignment/revocation if they possess the checker permission.
- `ReviewRollbackRequest` only rejects rollback maker == reviewer. It loads `target_actor_id` and `source.reviewed_by` (`SourceApprovedBy`) but does **not** reject reviewer == beneficiary or reviewer == original source checker.
- The UI labels the reviewer as independent but does not itself encode beneficiary/original-checker separation. Even if it did, UI gating could never substitute for backend enforcement.
- The inspected DSH administration test directory contains no focused tests proving these required negative paths.

This is a direct Product/Security invariant breach and ranks above lifecycle reliability because an actor can pass authorization yet violate the governed approval model.

**Required treatment direction:** centralize server-side separation checks in the DSH Administration domain boundary used by synchronous and replay paths; do not duplicate them only in handlers/UI. Add explicit stable domain errors and adversarial tests for beneficiary approval and original-checker rollback review.

### RC1 — HIGH — Canonical mutation lifecycle can diverge from governed request state

Proven root: one operational fact is split across non-atomic DSH transitions: governed request status and `dsh_admin_canonical_mutation_intents.status`.

Evidence:

- Role-definition/assignment/rollback approval persists intent, calls Identity, commits DSH request as `approved`, then separately calls `markCanonicalMutation(..., "applied")`.
- The final mark error is ignored.
- A successful Identity mutation plus successful request finalization can therefore leave intent `pending`/`failed`.
- Retry worker selects non-applied intents but replay functions require the associated request to remain `pending`; an already `approved` request can be skipped indefinitely while the intent remains non-terminal.
- Failure sets `next_attempt_at=NOW()` and worker runs every 5 seconds; no bounded/exponential backoff was found.
- Intent selection has no durable claim/lease/`SKIP LOCKED` ownership. Every DSH process starts the worker, so multiple replicas may process the same due intent concurrently.
- Identity's idempotency ledger makes upstream replay safe, so the root is not missing Identity idempotency; it is DSH lifecycle/transaction/reconciliation ownership.
- No focused DSH administration tests were found for crash-after-Identity-success, restart, multi-replica claim, orphan intent or bounded retry cases.

Operational impact: orphan/stale bookkeeping, hot retry/duplicate work, ambiguous recovery/readback and inability to prove every approved decision has a closed reconciliation record.

### RC2 — MEDIUM — Residual parallel/legacy authorization vocabulary and helper paths

- `local_operator_permissions.go` states aliases must not create multiple authorization vocabularies yet persists both `platform:read` and `platform.read`; `platform_local_bootstrap.go` uses the colon form, making the dot form a high-confidence stale alias candidate pending final consumer proof.
- DSH auth client still exposes source-compatible `GrantRole`/`RevokeRole` helpers synthesizing `legacy-grant:*` / `legacy-revoke:*` idempotency identities.
- Identity still exposes a legacy role-definition helper synthesizing `legacy-role-definition:*`.

Final closure requires caller/reachability proof followed by migration or deletion. Permanent compatibility aliases are not an acceptable end state without a proven external mixed-version dependency and explicit retirement trigger.

### RC3 — CLOSURE/INTEGRATION BLOCKER — Exact-candidate remote evidence and protected branch divergence

- Existing PR `#284` is the correct single PR channel; no duplicate PR is required.
- During audit it remained draft and `mergeable=false`.
- `c` contains protected Orchestrator history that diverges from current `master`; this objective has no authority to resolve that package opportunistically.
- No independent PR review submissions/threads were available during audit.

Tool/evidence architecture was inspected deeply:

#### CodeQL

- Canonical `.github/workflows/codeql.yml` pins checkout to `github.sha`, detects affected JS/TS, Go modules and Actions, and runs `security-extended` queries.
- Go analysis builds each affected module; Actions analysis is separate.
- `codeql-hygiene.yml` is a default-branch metadata cleanup workflow and is not PR product evidence.
- A successful CodeQL workflow is not enough by itself: final closure must also prove no open material CodeQL alerts for the exact candidate/landed SHA.

#### SonarQube Cloud

- `.github/workflows/sonarqube.yml` checks out immutable SHA, computes affected scope, materializes contracts, provisions governed DBs and executes Go/Node coverage before scan.
- `sonar-project.properties` sets `sonar.qualitygate.wait=true`; therefore the scanner is configured to fail on a failed Quality Gate rather than fire-and-forget.
- Sonar sources exclude generated/vendor/build artifacts and intentionally keep handwritten product roots in scope.
- Existing issue suppressions are explicit; they must be revalidated if touched but are not automatically accepted as proof for new findings.
- Final evidence must include exact revision, Quality Gate, unresolved material issues, coverage/duplication measures and unreviewed security hotspots.

#### Remote Security

- Canonical workflow is fail-closed and runs Gitleaks, OSV Scanner, Trivy, actionlint, zizmor, pinact, ShellCheck, Hadolint and yamllint, plus authority/config checks for remote Sonar/CodeQL.
- This is supporting security evidence; it does not replace Product Truth or semantic review.

#### Remote Analysis Evidence

- Collector verifies exact branch SHA, re-reads CodeQL analyses/alerts and Sonar revision/Quality Gate/issues/hotspots, normalizes material findings and fails policy on open CodeQL alerts, failed Sonar gate, material Sonar issues or unreviewed hotspots.
- Important topology fact: workflow is branch-`push` evidence and intentionally skips non-default branch push collection when an open PR owns verification. Therefore it is **not** sufficient as a pre-merge PR check for #284.
- Closure must use two stages: exact PR-head scanner/review evidence before merge, then exact landed `master` SHA Remote Analysis Evidence after merge/readback.

#### OpenCodeReview

- Repository has a real tool policy at `.agents/tools/open-code-review.md` and deterministic rules at `.opencodereview/rule.json` covering workflows, contracts, migrations, DSH, tests, frontend, security, concurrency, idempotency and negative paths.
- Policy states OCR is advisory and owns no approval authority.
- No repository workflow/reference was found proving OCR automatically runs on PR #284, and no OCR result was available during this audit.
- A local attempt to install/run OCR in the analysis environment exceeded the execution window; this is **not** treated as a negative finding. Final execution must obtain an actual bounded OCR review or equivalent independent semantic review on the exact final PR diff and preserve its provenance.

#### CodeRabbit / Codex Security

- Installed plugin skills were inspected. CodeRabbit is suitable for PR semantic review, and Codex Security diff-scan methodology requires every changed source file and candidate to be accounted for.
- This host did not expose their execution backends as direct scan tools; therefore no result is being falsely claimed. They remain optional independent evidence sources if available in the execution host.

## UX / recovery finding coupled to RC1

The API communicates canonical mutation failure while keeping a request pending, but the control panel surfaces a generic action error and normal pending queue. Administration diagnostics do not expose reconciliation backlog/operation state. A durable retry/reconciliation workflow must be visibly distinguishable from terminal failure/success without exposing sensitive payloads.

## Writers / readers / consumers inventory

Canonical writers:
- Identity normalized RBAC/version/idempotency writer.
- DSH Administration workflow/audit/canonical-operation records only.

Readers:
- Identity resolved-permission reader over normalized graph/direct grants.
- DSH exact permission gate over trusted Identity context.
- DSH administration projections over Identity canonical APIs.
- Control-panel controllers over governed DSH endpoints.

Material consumers:
- role-definition request/review;
- staff role assignment/revocation request/review;
- rollback request/review;
- diagnostics/audit;
- exact authorization consumers including payout verify/deactivate routing;
- canonical mutation worker;
- PR/CI/security/quality/semantic review evidence path.

## Negative space already checked

- no local DSH role registry remains after migration design;
- no broad operator bypass in exact permission gate;
- no hard-coded role-definition permission list in inspected UI;
- Identity runtime permissions do not use projection JSON as authority;
- broad administration vocabulary is migrated/deleted by `identity-028`;
- Identity idempotency permits safe replay, so another shadow writer is unjustified;
- no backend proof currently enforces beneficiary/original-checker review prohibitions;
- no focused DSH administration lifecycle/separation tests were found beyond audit-oriented coverage inspected;
- no independent PR semantic review result was available to reuse.

## Governance disposition

No new governance owner is needed: the Product Truth already states the missing separation invariants. Execution must implement them and only reconcile durable governance if implementation proves a genuinely new cross-service invariant not already owned.

## Branch/race and continuity

- Re-pin `c` before `EXECUTE_CLOSE` and after every final write/push.
- Classify concurrent delta as disjoint / related / overlapping / conflict / authority change.
- Protected Orchestrator divergence is outside mutation authority.
- Plan commits after target-system audit SHA are bookkeeping only and must not be treated as Source of Truth.

## Handoff readiness

No unresolved `DECISION_REQUIRED` changes the treatment. Ordered execution is deterministic: **RC0 separation-of-duties → RC1 lifecycle/reconciliation → RC2 residue cleanup → RC3 exact-candidate/PR/master evidence and integration**. Revalidate live HEAD first.
