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

Project tools are **evidence producers, reviewers, remediation mechanisms or evidence aggregators**. They are never Product/System Truth, never orchestration authority and never permission to replace root-correct treatment with a green check.

The tool set is discovered and revalidated from the exact live target. A name listed here defines the intended responsibility boundary; it does not prove that the tool is installed, connected, configured, enabled, current or applicable on a particular candidate.

### 18.1 Core routing law

For every materially applicable assurance concern:

```text
DERIVE ASSURANCE NEED FROM THE PROVEN WORKING CONE
→ DISCOVER CURRENT CANONICAL TOOL / CONTROL LIVE
→ PROVE INSTALLATION / CONFIGURATION / TRIGGER / SCOPE AS RELEVANT
→ BIND EXECUTION TO EXACT CANDIDATE SHA / REF / ARTIFACT
→ RUN OR READ THE MINIMUM COMPLETE APPLICABLE ASSURANCE SET
→ CLASSIFY FINDINGS BY MATERIAL EFFECT AND ROOT CAUSE
→ DEDUPLICATE CROSS-TOOL SYMPTOMS WITHOUT LOSING CORROBORATION
→ TREAT THE HIGHEST PROVEN ROOT IN THE ACTUAL SYSTEM
→ RE-RUN ONLY INVALIDATED / APPLICABLE ASSURANCE
→ READ BACK REMOTE EVIDENCE WHEN THE CLAIM DEPENDS ON REMOTE STATE
→ CLOSE ONLY FROM FINAL-CANDIDATE EVIDENCE
```

Do **not** mechanically run every tool on every objective. Completeness means every material assurance concern is covered by its correct authority, not maximum invocation count.

### 18.2 Canonical responsibility map

The expected project control set is routed as follows. Availability and activation must still be proven live before relying on any row.

| Assurance concern | Canonical tool/control | Intended responsibility | Authority class |
| --- | --- | --- | --- |
| Deep source security / data-flow SAST | CodeQL | Deep supported-language and GitHub Actions security analysis | Blocking security evidence when applicable |
| Fast/custom/diff-aware SAST | Semgrep Code Remote | Fast project-specific static analysis and PR/diff findings | **Conditional capability; not active evidence until remote integration is proven live** |
| Code quality / maintainability / coverage | SonarQube Cloud | Quality, reliability, maintainability, coverage and configured security analysis | Blocking remote quality evidence when applicable |
| Secrets | Gitleaks | Secret detection | Canonical secret-scanning evidence |
| Dependency vulnerability intelligence | OSV Scanner | Known vulnerable dependency detection | Canonical dependency-vulnerability evidence |
| Supply-chain / repository / container/config security | Trivy | Complementary supply-chain, dependency, image/config security where configured | Complementary security evidence |
| New dependency admission on PR | GitHub Dependency Review | Reject newly introduced vulnerable dependencies under governed severity policy | PR admission gate |
| Dependency determinism | Lockfile Integrity | Frozen-lockfile reproducibility and rejection of source mutation during verification | Determinism/integrity gate |
| GitHub Actions correctness | actionlint | Workflow syntax and semantic correctness | Workflow correctness evidence |
| GitHub Actions security | zizmor | Workflow trust-boundary/security analysis | Workflow security evidence |
| Immutable GitHub Actions references | pinact | Verify governed action SHA pinning | Supply-chain integrity evidence |
| Shell correctness | ShellCheck | Shell script/static correctness | Language-specific quality evidence |
| Dockerfile quality | Hadolint | Dockerfile correctness/quality | Container-build quality evidence |
| YAML correctness | yamllint | YAML formatting/structural quality under project policy | Configuration quality evidence |
| Semantic/deep review | OpenCodeReview | Rule-guided semantic, architectural, cross-boundary and negative-space review | Review evidence; **not a remote CI gate unless proven live as one** |
| Automated dependency maintenance | Dependabot | Propose dependency updates/remediation | Asynchronous remediation mechanism, not proof of safety |
| CodeQL metadata hygiene | CodeQL Metadata Hygiene | Retire proven stale/obsolete CodeQL analysis metadata and preserve canonical analysis identity | Hygiene control subordinate to CodeQL, not a scanner |
| Final remote read-back | Remote Analysis Evidence | Aggregate/read back declared remote analysis for an exact live candidate and reject stale/superseded evidence | Evidence aggregator/gate, not a scanner |

A capability may be replaced only after proving the replacement covers its required responsibility with equal or stronger assurance and after all callers, checks, rules, secrets, required statuses and evidence consumers are migrated.

### 18.3 Applicability router

Route from changed semantics and proven blast radius, not filename alone. File classes are evidence hints, never scope ceilings.

Typical routing includes:

- application/backend/frontend source change → supported CodeQL scope + SonarQube scope + semantic review; Semgrep Code only when its live remote capability is proven and applicable;
- GitHub Actions change → actionlint + zizmor + pinact + applicable CodeQL Actions analysis + semantic trust-boundary review;
- dependency manifest/lockfile change → OSV Scanner + Trivy where applicable + GitHub Dependency Review on PR + Lockfile Integrity; Dependabot is maintenance context, not verification;
- secret-sensitive/config/auth change → Gitleaks plus the relevant code/security authorities and adversarial authorization/isolation proof;
- Docker/container change → Hadolint + Trivy plus runtime/security verification materially required by the change;
- shell change → ShellCheck plus any security/runtime review implied by what the script can mutate or expose;
- YAML/config change → yamllint plus the domain-specific authority for the configuration being changed;
- architecture, authority, contracts, migrations, finance, lifecycle or cross-surface semantic change → OpenCodeReview may provide review evidence, but executable tests/runtime/data/contract proof remain mandatory;
- final closure that depends on remote CodeQL/Sonar or other declared remote authorities → perform exact-candidate remote read-back through the canonical evidence path rather than trusting an earlier job summary.

When several tools overlap, preserve only **proven complementary value**. One root may explain findings from multiple tools; fix it once at the correct owner and re-run every affected authority.

### 18.4 Evidence contract and provenance

Material tool evidence used for a decision or closure must establish enough provenance to answer, as applicable:

```text
tool/control identity
assurance responsibility
installation/integration/configuration state
exact source SHA/ref or immutable artifact identity
rules/query/profile/config revision or discoverable provenance
trigger/event and effective analyzed scope
run/check/status/artifact identifier or reproducible local invocation provenance
result and material findings
suppression/exclusion state
collection/read-back time and freshness
whether the evidence is blocking, advisory, review, remediation or aggregation
```

Evidence for a superseded SHA, stale configuration, different branch, incomplete scope, failed collector or unknown rule set cannot prove the final candidate.

Cross-tool agreement raises confidence but does not transform correlated tools into independent Product Truth. Cross-tool disagreement is a finding to diagnose, not a reason to choose the greener result.

### 18.5 Finding normalization and root treatment

Do not create separate execution tracks merely because different scanners reported the same defect.

Normalize materially relevant findings by affected authority/asset, semantic defect, exploit/failure condition, consumer impact and likely causal root. Then:

```text
RAW FINDINGS
→ VALIDATE / FALSIFY
→ GROUP CORRELATED SYMPTOMS
→ IDENTIFY DISTINCT MATERIAL ROOTS
→ RANK ROOTS BY SYSTEMIC LEVERAGE / RISK
→ FIX ACTUAL OWNER
→ MIGRATE / CUT OVER / CLEAN WHEN REQUIRED
→ RE-RUN INVALIDATED AUTHORITIES
→ VERIFY NEGATIVE SPACE
```

A tool-specific workaround is invalid when the underlying defect remains reachable.

### 18.6 Suppression, ignore and exclusion are fail-closed

No finding may be silenced merely to make CI green.

Any material suppression/ignore/exclusion must prove all applicable items:

- the finding is a demonstrated false positive or an explicitly authorized intentional condition;
- the scope is the smallest exact scope that excludes only the proven condition;
- the correct owner and rationale are identifiable;
- no safer root-correct treatment is reasonably available now;
- no affected writer/reader/consumer/security path is hidden by the suppression;
- the suppression does not weaken another canonical authority;
- expiry/removal trigger or durable justification exists when the condition is not permanent;
- final verification proves the suppression itself did not create material negative space.

Broad path exclusions, severity downgrades, disabled rules, `continue-on-error`, ignored exit codes or non-blocking conversions require the same proof when they can alter closure semantics.

### 18.7 Activation, onboarding and retirement

A listed tool becomes an active evidence authority only after its real integration is proven end-to-end: correct account/repository ownership where external, least-required permissions, canonical configuration, intended event/scope routing, exact-candidate execution, discoverable results and correct blocking/advisory semantics.

Specific invariants:

- **Semgrep Code Remote** is a planned/conditional SAST capability until its official remote integration, repository access, scans and result path are proven. Do not claim Semgrep coverage before that proof.
- **Semgrep Secrets** and **Semgrep Supply Chain** are not default canonical authorities while Gitleaks and OSV/Trivy already own those responsibilities; adopting them requires a proven material coverage gap and a no-duplicate-authority migration design.
- **OpenCodeReview** remains semantic review tooling unless a separate live remote gate is explicitly proven; its rule output cannot substitute for tests, runtime or scanner evidence.
- **Dependabot** proposes remediation; an update PR still passes the same applicable verification authorities as any other change.
- **CodeQL Metadata Hygiene** may mutate only proven obsolete CodeQL metadata under its live-target safety rules; it cannot redefine analysis results.
- **Remote Analysis Evidence** may aggregate only evidence it can prove for the exact target. It cannot manufacture missing evidence or convert unavailable/failed upstream analysis into success.

Retiring or replacing a tool requires complete consumer cleanup as applicable:

`workflow/config/rules → secrets/variables/app installation → required checks/statuses → scripts/wrappers → documentation/governance references → evidence collectors → stale metadata/artifacts → all callers/consumers`.

Do not leave inert configuration or a registered external app as shadow authority after cutover.

### 18.8 Efficiency and scheduling

Use the **smallest complete assurance set** for the candidate.

Prefer, where semantics permit:

- cheap deterministic checks early;
- independent remote/deep analyses in maximum-safe parallelism;
- affected routing before full-workspace execution, with full scans for default-branch/scheduled/high-risk cases where governed;
- push-vs-PR deduplication when one event already owns equivalent verification;
- reuse of valid immutable exact-candidate evidence instead of ceremonial re-execution;
- one evidence read-back layer instead of several collectors re-querying the same remote truth;
- no local duplication of a remote-only authority merely to obtain the same result sooner.

Performance optimization may change ordering, routing, caching or fan-out only when assurance strength is preserved or improved.

### 18.9 Tool failure and external blockers

Distinguish:

```text
FINDING = tool successfully proved a material problem
TOOL_FAILURE = applicable tool could not produce trustworthy evidence
NOT_APPLICABLE = material responsibility genuinely does not apply
EXTERNAL_BLOCKER = required external authority/evidence is unavailable and cannot be repaired from the current execution context
STALE_EVIDENCE = evidence exists but does not bind to the final candidate/configuration
```

Never convert `TOOL_FAILURE`, `EXTERNAL_BLOCKER` or `STALE_EVIDENCE` into a pass. They block only the dependent claim/cone; independent proven work continues under the governing lifecycle.

### 18.10 Addition of new tools

Do not add another scanner/reviewer/automation because it is popular or because more tools appear safer.

Before adoption prove:

```text
MATERIAL COVERAGE GAP
→ EXISTING AUTHORITIES CANNOT ADEQUATELY CLOSE IT
→ CANDIDATE TOOL PROVIDES UNIQUE OR MATERIALly STRONGER ASSURANCE
→ OVERLAP / COST / FALSE-POSITIVE / PERMISSION / DATA-EXPOSURE IMPACT UNDERSTOOD
→ CANONICAL RESPONSIBILITY BOUNDARY DEFINED
→ INTEGRATION + FAILURE + RETIREMENT MODEL DEFINED
→ END-TO-END PILOT PROVES VALUE
```

If unique value is not proven, do not add the tool. Prefer strengthening or correctly routing an existing authority.

## 19. Closure for this focus

Close only when canonical data/contract/runtime/security/finance truth is consistent through materially affected consumers, migration/cutover and failure/recovery are proven, runtime provenance matches the claim, obsolete authority is removed, verification strength matches risk, every materially applicable tool/control has trustworthy final-candidate evidence or a legitimate dependent-cone blocker is reported, unresolved tool findings have been traced to and treated at their real roots, suppressions satisfy the fail-closed proof above, remote read-back is complete when required, and any engineering-control-path root has comparable before/after evidence with preserved assurance and no material cost shift.

Package independence/self-validation rules remain governed solely by `00-ORCHESTRATOR.md`.
