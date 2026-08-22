# Focus — Data, Contracts, Runtime, Security, Finance, Quality and Engineering Control-Path Efficiency

## 1. Purpose

Apply this module when proven scope includes data/database, contracts/API/events, runtime/infrastructure, security/auth, finance, testing/quality, operations, CI/tooling or engineering execution cost.

Do not split cross-boundary correctness into independent pseudo-projects when one root spans them.

## 2. Data ownership and database truth

Inspect canonical data owner, allowed writers/readers/projections, schema/model consistency, constraints/invariants, transactions, uniqueness/FKs/checks/indexes, fresh install and representative upgrade states, migration ordering/history, expand/backfill/switch/contract sequences, idempotency/concurrency/locking/batching, drift/duplicates/orphans/stale fields, restart/readback/roll-forward/rollback and old-writer elimination.

A successful migration command alone does not prove correct product state.

## 3. Migration law

Use forward corrective migrations. Do not rewrite applied migration history merely for cosmetic cleanliness.

For persisted authority changes prove as applicable:

`current owner → target owner/schema → forward migration → backfill/transform → real compatibility window → switch writers → switch readers → canonical readback → zero old authoritative writer → cleanup/contract phase`.

## 4. Contracts and APIs

Verify:

`canonical schema/OpenAPI/event → generated/manual client → caller/request → auth/authz → route/handler → domain command/query → persistence/event/provider → response/error semantics → persisted readback → all consumers`.

Look for schema/enum/null/error drift, ambiguous IDs/scopes, generated-client provenance mismatch, shadow endpoints, contract bypass, missing server auth, stale clients, missing idempotency/concurrency semantics and indefinite compatibility.

## 5. Events, jobs and providers

For asynchronous/external paths prove sender/receiver responsibility, identity, schema/version, durability/outbox when required, callback authenticity, ordering, idempotency/replay, retry/backoff/lease, DLQ/terminal handling, timeout/unknown result, restart, reconciliation, compensation and observability/correlation.

Provider timeout after possible commit is not equivalent to failure.

## 6. Runtime and infrastructure

Inspect service startup/readiness/health truthfulness, configuration/environment ownership, ports/endpoints/networking, Docker/container/process bindings, provider bindings, startup validation, hidden localhost/legacy fallback, jobs/events/queues/providers, mobile/control-panel boundaries, observability, failure/recovery/restart and release/rollback when in scope.

Discover current canonical project commands/configuration live; do not hard-code historical commands here.

## 7. Runtime freshness

Before trusting runtime proof establish enough candidate/artifact/process/schema/profile/endpoint/fixture/readback provenance to exclude stale execution.

## 8. Security and isolation

Treat security as an always-on impact lens and deepen when material:

`authentication | authorization | role/object/tenant/store/partner/actor scope | sessions/tokens | secrets | PII/privacy | input/output validation | injection | SSRF/path/file/upload | replay/idempotency | IDOR | rate/abuse | provider signature | service identity | auditability`.

UI visibility never substitutes for server authorization. Redact raw secrets/PII in evidence.

## 9. Finance and WLT

Prove the current canonical financial authority live. Verify where applicable:

`canonical ledger/fact owner | allowed writers | server-derived amount/identity | idempotency/correlation | state constraints | provider outcome binding | unknown-result reconciliation | compensation/reversal | restart/replay safety | canonical readback | maker-checker/step-up where governed | audit provenance`.

Forbidden final states include caller-authored money authority, parallel financial truth, best-effort required mutation, fake success before persisted readback and retry with new financial identity before reconciling unknown result.

## 10. Compatibility

Allow compatibility only for a real mixed-version/rollout dependency. Require one semantic authority, explicit consumer scope, bounded behavior, observability, owner, expiry/removal trigger and negative tests where material.

## 11. Protected/irreversible actions

Apply the authority gate in `01` before production-sensitive secret/PII/financial/destructive/infrastructure actions.

## 12. Testing and quality

Tests are evidence. Use focused unit/domain regression, integration/contract/database, generated-client consistency, cross-surface/journey, runtime/readback, security/isolation, migration fresh/upgrade, duplicate/replay/concurrency/restart and adversarial checks as relevant.

Do not use a focused check to claim broad closure it cannot prove.

## 13. Failure and recovery are product behavior

Cover applicable invalid, denied, wrong role/scope, forbidden state, not found, stale/conflict, duplicate/replay, race, partial failure, dependency/provider/database/network failure, timeout/unknown result, retry/backoff, offline/reconnect, restart, compensation and reconciliation.

## 14. Mobile and control-panel runtime concerns

Mobile: native permissions, deep links, push, maps/location, SecureStore/session, offline/reconnect, build/OTA/EAS/env/runtime transport, physical-device/emulator proof limits.

Control Panel: route/object auth, trusted scope, server/client boundary, search isolation, bulk operations, audit/session/error/readback, responsive/RTL/localization/accessibility.

## 15. Engineering control-path efficiency

Treat developer/agent execution paths as first-class system paths when they materially affect delivery speed, correctness or maintainability.

Candidate surfaces include:

`guards | scripts | CI jobs | workflow routers | registries | policies | skills | prompting adapters | hooks | Nx/graph discovery | generators | postinstall | watchers | wrappers | runtime bootstrap/reset | scanners | repeated verification layers`.

For the affected scenario measure/trace as applicable:

```text
wall-clock duration
invocation count
child-process fan-out
repository scans / glob breadth
parsing / hashing / dependency-discovery repetition
disk I/O
network operations
DB/runtime startup/reset work
regeneration/materialization
cache hit/miss and cache invalidation
same-input repeated work
full-workspace work triggered by affected-only change
nested aggregate commands executing the same assurance twice
```

Then execute:

```text
MEASURE BASELINE
→ TRACE CALL GRAPH / TRIGGERS
→ PROVE ROOT COST
→ IDENTIFY UNIQUE ASSURANCE OF EACH LAYER
→ REMOVE / MERGE / ROUTE / CACHE / NARROW / REORDER
→ VERIFY ASSURANCE/CORRECTNESS DID NOT DECREASE
→ MEASURE SAME SCENARIO AGAIN
→ PROVE NO MATERIAL COST SHIFT
```

`COMPLEXITY WITHOUT PROVEN UNIQUE VALUE = REMOVE OR SIMPLIFY.`

Do not adopt rigid numeric laws such as “exactly one registry” when the domain genuinely needs more than one authority boundary. The invariant is one canonical owner per concept and no duplicated assurance/cost without proven value.

## 16. Control-path anti-patterns

Explicitly inspect for:

- nested aggregate scripts that invoke already-included checks;
- full workspace verification by default when affected proof is sufficient;
- the same repository parsing/hash/graph construction repeated in one execution;
- duplicated workflow + local guard enforcement of the same claim without distinct value;
- multiple routers/registries answering the same question;
- generators that materialize outputs during read-only verification;
- cache invalidation that makes caching ceremonial;
- “green” speedups achieved by skipping required assurance;
- moving expensive work from local to CI (or vice versa) without reducing total cost;
- policy/guard layers that only assert the existence/text of another policy rather than a project property.

## 17. Quality/performance and supply chain

Inspect correctness/operability impacts such as excessive coupling, inefficient/unbounded queries, missing pagination/cache semantics, flaky checks, config drift, unused dependencies, unsafe retries, observability gaps, resource leaks, lockfile integrity, unsupported/duplicate dependencies, vulnerability/licensing policy where governed, secret leakage, action/tool pinning and removed-path references.

Do not silence scanners or weaken checks to obtain green; prove false positives or fix the root.

## 18. Tool routing and evidence authority

Tools are evidence/review/remediation controls, never Product/System Truth or orchestration authority.

```text
ASSURANCE NEED FROM WORKING CONE
→ DISCOVER LIVE CANONICAL CAPABILITY
→ PROVE ENABLEMENT + EFFECTIVE SCOPE
→ RUN/READ MINIMUM COMPLETE APPLICABLE SET ON EXACT CANDIDATE
→ NORMALIZE FINDINGS
→ PROVE/RANK ROOTS
→ FIX ACTUAL OWNER ONCE
→ RE-RUN ONLY INVALIDATED AUTHORITIES
→ REMOTE READ-BACK WHEN REQUIRED
→ CLOSE FROM FINAL-CANDIDATE EVIDENCE
```

Do not run every tool blindly. `LISTED ≠ INSTALLED ≠ ENABLED ≠ APPLICABLE`, and `GREEN ≠ CLOSED`.

### 18.1 Responsibility map

| Concern | Canonical capability |
| --- | --- |
| Deep/data-flow SAST | CodeQL |
| Fast/custom/diff SAST | Semgrep Code Remote |
| Quality/coverage/maintainability | SonarQube Cloud |
| Secrets | Gitleaks |
| Dependency CVEs | OSV Scanner |
| Supply chain/config/container | Trivy |
| PR dependency admission | GitHub Dependency Review |
| Lockfile determinism | Lockfile Integrity |
| GitHub Actions correctness | actionlint |
| GitHub Actions security | zizmor |
| Immutable Action pins | pinact |
| Shell | ShellCheck |
| Dockerfile | Hadolint |
| YAML | yamllint |
| Semantic/architecture review | OpenCodeReview |
| Dependency maintenance | Dependabot |
| CodeQL stale metadata | CodeQL Metadata Hygiene |
| Final remote evidence | Remote Analysis Evidence |

Semgrep Code Remote is conditional until its official remote integration and exact-candidate result path are proven live. OpenCodeReview is semantic review unless a remote gate is separately proven. Dependabot is remediation, CodeQL Metadata Hygiene is subordinate hygiene, and Remote Analysis Evidence is an aggregator/read-back gate—not scanners.

### 18.2 Applicability and evidence

Route by changed semantics + proven blast radius, not filename alone. Typical sets:

- source behavior → CodeQL + SonarQube + semantic review + proven/applicable Semgrep;
- GitHub Actions → actionlint + zizmor + pinact + applicable CodeQL Actions;
- dependencies/lockfile → OSV + applicable Trivy + Dependency Review on PR + Lockfile Integrity;
- Docker/runtime/config → applicable Hadolint/Trivy/language-specific checks + required runtime proof.

Material tool evidence must establish enough provenance for its claim: `tool/control + responsibility + effective scope + exact SHA/ref/artifact + relevant config/rules provenance + run/check/artifact identity + result/findings + freshness + suppression state`.

Superseded, stale, differently scoped, failed or unproven execution is not PASS.

### 18.3 Findings, suppression and lifecycle

`MULTIPLE TOOL FINDINGS ≠ MULTIPLE ROOTS.` Validate/falsify, correlate and deduplicate symptoms, prove distinct material roots, fix each actual owner once, then rerun every invalidated authority.

Suppression/ignore/exclusion is fail-closed: never silence a material finding merely to obtain green. A material suppression requires a proven false positive or authorized intentional condition, the narrowest exact scope, correct owner/rationale, no safer root-correct treatment, no hidden affected path or weakened authority, and an expiry/removal condition when temporary.

Adding, replacing or retiring a tool requires proof of unique/materially stronger assurance, overlap/cost/permissions/data-exposure impact, one responsibility boundary, integration/failure model, migration of checks/config/secrets/apps/callers/evidence consumers, and final negative-space verification. Do not leave inert configuration, stale metadata or external app registration as shadow authority.

## 19. Closure for this focus

Close only when canonical data/contract/runtime/security/finance truth is consistent through materially affected consumers, migration/cutover and failure/recovery are proven, runtime provenance matches the claim, obsolete authority is removed, verification strength matches risk, all materially applicable assurance has trustworthy final-candidate evidence or a legitimate dependent-cone blocker is reported, unresolved tool findings are treated at their real roots, suppressions satisfy the fail-closed law, remote read-back is complete when required, and any engineering-control-path root has comparable before/after evidence with preserved assurance and no material cost shift.

Package independence/self-validation rules remain governed solely by `00-ORCHESTRATOR.md`.
