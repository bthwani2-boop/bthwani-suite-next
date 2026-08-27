# Focus — Data, Contracts, Runtime, Security, Quality, CI and Tool Evidence

## 1. Purpose

Apply when scope includes data/database, contracts/API/events, runtime/infrastructure, security/auth, finance, testing/quality, CI/tooling, remote analysis or engineering control-path cost.

Do not split one cross-boundary root into independent pseudo-projects.

## 2. Data ownership and migrations

Inspect canonical data owner, allowed writers/readers/projections, schema/model consistency, constraints/invariants, transactions, uniqueness/FKs/checks/indexes, fresh install, representative upgrade states, migration ordering/history, backfill/cutover, idempotency/concurrency/locking/batching, duplicates/orphans/drift, restart/readback and old-writer elimination.

Use forward corrective migrations. Do not rewrite applied migration history for cosmetic cleanliness.

Persisted authority change:

`current owner -> target owner/schema -> forward migration -> backfill -> real compatibility window -> switch writers -> switch readers -> canonical readback -> zero old authoritative writer -> cleanup`.

## 3. Contracts and generated bindings

Trace:

`canonical schema/OpenAPI/event -> generated/manual client -> caller -> auth/authz -> handler -> domain -> persistence/event/provider -> response/error -> persisted readback -> all consumers`.

Look for enum/null/error drift, ambiguous IDs/scopes, generated provenance mismatch, shadow endpoints, contract bypass, stale clients and indefinite compatibility.

Generated outputs follow the Source-of-Fix law in `02`: fix generator/schema/template/authoritative input first, then regenerate.

## 4. Runtime and infrastructure

Inspect startup/readiness/health truthfulness, environment/config ownership, ports/endpoints/networking, containers/processes, provider bindings, startup validation, hidden localhost/legacy fallback, jobs/events/queues/providers, observability, failure/recovery/restart and release/rollback when material.

Runtime proof requires candidate/artifact/process/schema/profile/endpoint/fixture/readback provenance sufficient to exclude stale execution.

## 5. Security and isolation

Always consider and deepen when material:

`authentication | authorization | role/object/tenant/store/partner/actor scope | sessions/tokens | secrets | PII/privacy | validation | injection | SSRF/path/file/upload | replay/idempotency | IDOR | rate/abuse | provider signature | service identity | auditability`.

UI visibility never substitutes for server authorization. Redact secrets/PII in evidence.

## 6. Finance

Prove canonical financial authority live. Verify server-derived amounts/identity, idempotency/correlation, state constraints, provider outcome binding, unknown-result reconciliation, compensation/reversal, replay/restart safety, canonical readback and maker-checker/step-up where governed.

Caller-authored money authority and parallel financial truth are forbidden final states.

## 7. Testing and quality

Tests are falsifiable evidence, not Product Truth. Use focused unit/domain, integration/contract/database, generated consistency, journey, runtime/readback, security/isolation, migration, concurrency/restart and adversarial checks as relevant.

Do not weaken/skip valid tests or scanners to obtain green.

## 8. Engineering control-path efficiency

Treat CI/tooling execution paths as first-class system paths when they materially affect correctness, reliability or delivery cost.

Inspect:

`workflow routers | scripts | registries | guards | generators | Nx/graph discovery | postinstall | scanners | repeated verification | runtime bootstrap/reset | wrappers | fan-out | repeated parsing/hash/graph work | unnecessary full-workspace scans | cache invalidation`.

Treatment:

`measure/trace -> prove cost root -> remove/merge/route/cache/narrow/reorder -> preserve assurance -> measure same scenario -> prove no cost shift`.

`COMPLEXITY WITHOUT PROVEN UNIQUE VALUE = REMOVE OR SIMPLIFY`.

## 9. Tools are sensors/analyzers, not Product/System authority

Canonical lifecycle:

```text
ASSURANCE NEED
-> DISCOVER LIVE CAPABILITY
-> PROVE ENABLEMENT + EFFECTIVE SCOPE
-> RUN/READ ON EXACT CANDIDATE
-> INGEST RAW OUTPUT
-> NORMALIZE FINDINGS + EXECUTION/COVERAGE WARNINGS
-> VALIDATE/FALSIFY/CORRELATE/DEDUPLICATE
-> ROOT-CAUSE UNDER 02
-> FIX ACTUAL OWNER
-> RERUN INVALIDATED ANALYSIS
-> REMOTE READ-BACK WHEN THAT PLATFORM IS THE FINAL AUTHORITY
-> FINAL GATE ONLY AFTER FINDING LIFECYCLE IS COMPLETE
```

```text
GREEN != CLOSED
MULTIPLE TOOL FINDINGS != MULTIPLE ROOTS
SCANNER SUCCESS != COMPLETE ANALYSIS IF COVERAGE/PARSER WARNINGS ARE MATERIAL
```

Every material raw finding uses the disposition invariant in `02`.

## 10. Current preferred responsibility mapping — verify live

These are preferred/current capability mappings **only when proven installed/enabled/applicable**; the durable authority is the assurance responsibility, not the tool brand.

| Assurance responsibility | Current preferred capability when live-proven |
| --- | --- |
| Deep/data-flow SAST | CodeQL |
| Fast/custom/diff SAST | Semgrep Remote |
| Quality/coverage/maintainability | SonarQube Cloud |
| Semantic/architecture review | OpenCodeReview / host agent review |
| Secrets | Gitleaks |
| Dependency CVEs | OSV Scanner |
| Supply chain/config/container | Trivy |
| PR dependency admission | GitHub Dependency Review |
| Lockfile determinism | Lockfile Integrity |
| GitHub Actions correctness/security | actionlint / zizmor / pinact as applicable |
| Shell/Docker/YAML | ShellCheck / Hadolint / yamllint as applicable |
| Dependency maintenance | Dependabot |
| Final repository-platform evidence | PR Closure Evidence / remote analysis read-back |

`LISTED != INSTALLED != ENABLED != APPLICABLE`.

Adding/replacing/retiring a tool requires proof of unique assurance value, overlap/cost/permission/data-exposure impact, migration of configs/secrets/apps/callers/evidence consumers and cleanup of shadow/inert integration residue.

## 11. Remote evidence authority

Where Sonar/CodeQL/Semgrep/GitHub checks or another repository platform is governed as the final analysis authority, closure requires exact-candidate remote execution/read-back.

Local CLI/MCP/manual analysis may support diagnosis but cannot satisfy a required remote check/status/analysis authority.

```text
REMOTE CONFIG PRESENT != REMOTE EXECUTION
REMOTE JOB GREEN != MATERIAL FINDINGS DISPOSITIONED
OLD REMOTE RESULT != CURRENT PR/SHA RESULT
```

If a scanner step never ran because an upstream build/coverage/provisioning step failed, classify the missing execution under `02`; do not substitute an older scan.

## 12. PR/CI execution context

PR-scoped tools must consume or prove one canonical execution identity:

`PR_NUMBER | HEAD_REF | HEAD_SHA | BASE_REF | BASE_SHA | MERGE_BASE_SHA when material | event owner | affected/full closure scope`.

No analyzer may use “latest PR”, branch name similarity, old PR body text or same workflow name as current-PR identity.

Source branch with open PR -> PR verification owns analysis. Push-only evidence for that same source branch must not compete as a second PR authority.

Post-merge canonical-trunk analysis is a different evidence class from PR closure evidence.

## 13. Development verification vs closure verification

During active iteration:

`affected/deep verification` is appropriate when it safely covers the changed/affected cone.

Before Ready/merge:

`full materially applicable PR closure verification` must run on the exact current PR head and include every closure-required analyzer/evidence source. A heavy affected run is not automatically a full closure run.

`READY_FOR_REVIEW` should be a consequence of closure readiness, not a trigger that is hoped to prove it afterward.

## 14. OpenCodeReview / agent semantic review

A workflow that prepares deterministic review context does not itself prove semantic review completion.

Distinguish:

`OCR_CONTEXT_READY` from `OCR_SEMANTIC_REVIEW_COMPLETE`.

When semantic review is required, bind review to `PR_NUMBER + HEAD_SHA + context/run/artifact + reviewer provenance + findings + dispositions/root mappings`.

Review output is evidence/hypothesis, not automatic truth.

## 15. Suppressions

Never silence a material finding merely to obtain green. Material suppression requires proven false positive or explicitly authorized intentional condition, narrow scope, correct owner/rationale, proof no required path is hidden and expiry/removal trigger when temporary.

The executing agent may not self-authorize a material intentional suppression.

## 16. Tool/CI failure treatment in the unified loop

Apply `02` classification:

- broken workflow/tool config -> usually `EXECUTION_FINDING`;
- unavailable nonessential final analyzer with sufficient diagnostic alternatives -> `DEGRADED_EVIDENCE`, closure obligation retained;
- truly indispensable missing evidence for root/target/Source-of-Fix -> `DIAGNOSIS_BLOCKER` for that dependent treatment cone;
- irrelevant capability -> `NOT_APPLICABLE`.

Tool failure does not create a separate preparation phase, does not require a plan handoff and does not stop other sufficiently proven independent treatment. Under mutation-authorized intent, diagnose/treat/rerun in the same unified loop unless a legitimate `00` stop state applies.

## 17. Closure for this focus

Close only when materially affected data/contract/runtime/security/quality truth is consistent through consumers, migrations/cutovers/failure paths are proven, remote authority evidence is current where required, all material tool outputs are accounted/dispositioned, suppressions satisfy policy, obsolete authority/tooling residue is removed and control-path changes preserve assurance without shifting hidden cost.

## 18. Operational assurance, privacy, resilience and supply-chain lenses

When routed as materially applicable by `01`, deepen this focus using the claim-specific verification selector in `04` rather than a generic checklist.

### 18.1 Observability and operational truth

A material failure mode must have a proven way to be recognized when operations/recovery depend on detecting it. Inspect the smallest useful combination of:

`health/readiness truthfulness | structured logs | metrics | traces/correlation | failure/degradation signals | queue/job visibility | reconciliation/drift signals | alertability/diagnostic value`.

Do not create telemetry without a consumer or decision value. Do not allow silent fake-success or healthy status while a material dependency/path is broken.

### 18.2 Privacy and data lifecycle

For materially handled personal/sensitive data, trace:

`data element -> purpose -> canonical owner -> allowed actors/scopes -> collection/minimization -> storage -> transport -> logs/evidence exposure -> retention -> redaction/masking -> export/share -> deletion/reconciliation`.

Security controls do not by themselves prove appropriate data collection, purpose, retention or deletion semantics.

### 18.3 Backup, restore and disaster recovery

When durable-data risk is material, schema/migration success is insufficient. Establish the applicable recovery claim: backup source/identity, restorability, representative restore/recovery evidence, partial migration/backfill recovery, and RPO/RTO only where an authorized operational requirement exists. Do not invent numeric recovery targets.

### 18.4 Performance, capacity and resilience

For material hot paths or bounded resources, inspect latency/capacity/error expectations, timeout/retry budgets, backpressure, pools/connections, queues/caches, CPU/memory, query plans/N+1, payload/pagination and provider quotas. Do not invent SLO numbers; absence of a required performance/reliability contract is itself a finding when the system cannot be operated safely without one.

### 18.5 Supply chain and provenance

When dependencies, lockfiles, build tooling, generated artifacts, containers, CI actions, release pipelines or native signing/build inputs change, prove locked/authorized sources, reproducibility, artifact/source identity and applicable provenance/attestation/SBOM requirements under live repository/delivery policy. External frameworks and scanners are evidence sources; they do not create BThwani Product Truth.

### 18.6 Assurance standards are mutable external evidence

Use current authoritative external standards/platform requirements when external research is allowed and materially needed. Do not hard-code mutable version numbers into this package as eternal truth. Examples may include current NIST secure-development/privacy guidance, OWASP ASVS/MASVS/MASTG, SLSA, platform store policies and reliability guidance. Repository policy may pin a requirement separately when it intentionally owns that durable choice.