# Software Delivery, Environment Promotion, and Release Policy

Status: ACTIVE_CANONICAL
Owner: Delivery / Release Governance
Applies to: all source changes, services, APIs, databases, infrastructure, web applications, native/mobile applications, CI/CD, release artifacts, staging environments, production environments, Apple App Store distribution, and Google Play distribution.

## 1. Purpose

This policy defines the mandatory lifecycle by which software moves from an engineering change to an externally released production version. It is intentionally independent of the repository's current maturity or hosting provider so it can be used later as a durable audit standard.

The canonical lifecycle is:

```text
REQUIREMENT / CHANGE INTENT
        ↓
LOCAL DEVELOPMENT
        ↓
LOCAL VERIFICATION
        ↓
REMOTE CI / SECURITY / QUALITY
        ↓
PULL REQUEST + REVIEW
        ↓
EXACT CANDIDATE CLOSURE
        ↓
PROTECTED INTEGRATION BRANCH
        ↓
RELEASE BUILD / PROVENANCE
        ↓
STAGING / PRE-PRODUCTION
        ↓
RELEASE READINESS GATE
        ↓
PRODUCTION DEPLOYMENT
        ↓
POST-DEPLOYMENT VERIFICATION
        ↓
STORE RELEASE / USER ROLLOUT WHERE APPLICABLE
        ↓
POST-RELEASE OBSERVATION
        ↓
CLOSED
```

A phase is not complete because a developer believes it is complete. A phase is complete only when its mandatory exit criteria are proven by current, attributable evidence for the exact candidate being promoted.

Documentation records and governs the process; documentation alone is never evidence that implementation, infrastructure, testing, security, deployment, or production readiness actually exists.

## 2. Normative language

The terms below are normative:

- **MUST / MUST NOT** — mandatory. Violation blocks promotion unless a formally authorized exception process defined by this policy applies.
- **SHOULD / SHOULD NOT** — expected default. Deviation requires an explicit, documented, evidence-based reason.
- **MAY** — optional when appropriate.

No statement such as "works on my machine", "CI was green earlier", "the same branch passed yesterday", "the documentation says production-ready", or "the store accepted a previous build" satisfies a MUST requirement without current evidence.

## 3. Authoritative policy relationships

This file owns delivery, promotion, release, environment-gate, and store-release policy.

It does not duplicate the canonical authority of:

- `governance/policies/engineering.md` for architecture, contracts, data, migrations, runtime engineering, quality, and cleanup;
- `governance/policies/security.md` for authentication, authorization, secrets, privacy, isolation, financial security, and security evidence;
- executable CI/workflow owners under `.github/**`;
- executable guards under `tools/**`;
- service/API/data contracts under their owning service/core trees.

Promotion MUST fail when an applicable requirement of those canonical policies is unresolved, even if this file does not restate the implementation detail.

## 4. External standards baseline

The policy SHOULD be interpreted consistently with the current stable versions of authoritative external standards and platform rules, including as applicable:

- NIST Secure Software Development Framework (SSDF), SP 800-218;
- SLSA supply-chain and provenance requirements;
- OWASP ASVS and relevant OWASP CI/CD, mobile, API, and supply-chain guidance;
- GitHub protected branches/rulesets, Actions security, Environments, OIDC, artifact attestations, and least-privilege guidance;
- Apple Developer, App Store Connect, App Review, TestFlight, privacy, signing, entitlement, SDK, and submission requirements;
- Google Play Developer Program, Play Console, target API, testing tracks, Play App Signing, Data safety, permissions, content, privacy, and release requirements.

External requirements change over time. Therefore:

> **EXT-001 — Every release MUST revalidate the platform/provider requirements that are current on the actual release date. A historical value copied into repository documentation MUST NOT override a newer official requirement.**

The official vendor/standards source takes precedence for changing platform requirements. Product semantics remain owned by BThwani governance and contracts.

## 5. Core delivery invariants

### DEL-001 — One source identity

Every promotion candidate MUST be identified by an immutable source identity, normally a full commit SHA. Branch names are routing labels, not immutable evidence identities.

### DEL-002 — Exact-candidate evidence

Evidence MUST be attributable to the exact candidate it proves. If source, base, merge candidate, build inputs, migration set, security-relevant configuration, or release artifact changes materially, affected evidence becomes stale and MUST be rerun.

### DEL-003 — Fail closed

Missing, stale, cancelled, ambiguous, or materially incomplete required evidence MUST NOT be interpreted as PASS.

### DEL-004 — No manual truth

No undocumented local change, server edit, database mutation, secret injection, package installation, generated file, environment tweak, or operator action may become a hidden prerequisite for build, test, staging, deployment, or release.

### DEL-005 — One release lineage

Every production release MUST be traceable through one canonical lineage:

```text
source SHA
→ build inputs
→ build execution
→ artifact/binary identity
→ provenance/SBOM as applicable
→ staging/pre-production evidence
→ approval
→ production/store release
→ post-release evidence
```

### DEL-006 — Build once where technically valid

For server, web, container, package, and other artifacts that can be promoted unchanged between environments, the artifact MUST be built once and the exact immutable digest promoted from staging to production.

A rebuild for production invalidates the staging claim for the previous artifact.

### DEL-007 — Native/mobile equivalence rule

Native mobile artifacts may legitimately differ between non-production and production when bundle/package identifiers, entitlements, signing identities, capabilities, store configuration, or other build-time platform inputs must differ.

In that case the project MUST NOT pretend that two different binaries are the same artifact. Instead it MUST prove:

- same approved source SHA;
- same locked dependency graph and canonical toolchain;
- same reviewed build recipe;
- explicit and audited environment-specific build inputs;
- no environment-specific business-logic fork;
- provenance for each binary;
- final production-configured binary tested through an appropriate pre-release distribution path before public release;
- no rebuild between final production-binary acceptance and store submission unless the new binary is requalified.

### DEL-008 — Environment is deployment state, not source truth

Local, staging, and production MUST NOT be represented by diverging copies of business code or long-lived environment branches containing unique product behavior. Environment differences MUST be expressed through governed configuration, credentials, infrastructure, scale, provider accounts, and controlled feature targeting.

### DEL-009 — No promotion with known material defect

A proven material defect within the effective release scope MUST block promotion. Staging and production are not locations for intentionally carrying unresolved root causes merely to see what happens.

### DEL-010 — Evidence types are not interchangeable

Static analysis does not prove runtime behavior. Unit tests do not prove deployment. A successful deployment job does not prove business health. Store acceptance does not prove application correctness or security. Each material claim requires the evidence class capable of proving it.

## 6. Lifecycle states

A release candidate SHOULD use the following conceptual states. Implementations may name them differently, but MUST preserve the semantics.

```text
CHANGE_IN_DEVELOPMENT
LOCAL_VERIFIED
REMOTE_VERIFIED
PR_CANDIDATE
EXACT_CANDIDATE_VERIFIED
INTEGRATED_SOURCE
RELEASE_ARTIFACT_READY
STAGING_ACCEPTED
PRODUCTION_APPROVED
PRODUCTION_DEPLOYED
PRODUCTION_VERIFIED
STORE_SUBMITTED            (native where applicable)
STORE_APPROVED             (native where applicable)
ROLLOUT_ACTIVE             (where applicable)
RELEASE_VERIFIED
CLOSED
```

No state may be inferred solely from a previous state; the entry evidence for the new state MUST exist.

## 7. Phase 0 — Requirement / change readiness

Development SHOULD NOT begin as an unbounded coding exercise.

Before implementation, the developer MUST establish enough context to determine the smallest complete working cone, including as applicable:

- intended outcome and acceptance criteria;
- authoritative Product/System owner;
- affected actors and permissions;
- writers/readers/consumers;
- APIs/contracts/events;
- database/schema/migration impact;
- financial or authorization impact;
- privacy/PII/location impact;
- provider/integration impact;
- runtime/configuration impact;
- web/mobile/native impact;
- backward compatibility and rollout risk;
- deletion/cutover needs;
- observability needs;
- likely release class and risk level.

A material unresolved product decision that can change system semantics MUST be resolved before the affected implementation is promoted.

## 8. Phase 1 — Local development

### 8.1 Purpose

Local development exists to create and debug a correct change quickly while preserving production-relevant semantics. Local is not required to duplicate production capacity, but it MUST NOT silently redefine business truth.

### 8.2 Source and branch hygiene

The developer MUST:

- work from the intended repository/ref;
- know the current base/source relationship before material work;
- avoid direct unreviewed work on the protected integration branch except through an explicitly authorized emergency path;
- keep tracked source coherent and reviewable;
- avoid committing local caches, databases, logs, screenshots, machine secrets, generated diagnostics, or machine-specific state unless such data is truly canonical source.

### 8.3 Reproducible toolchain

The repository MUST define one canonical authority for each build-critical tool/version. The local environment MUST conform to it.

As applicable this includes:

- Node.js;
- pnpm/npm/yarn;
- Go;
- Java/JDK/Gradle;
- Xcode/Swift;
- Android SDK/build tools;
- CocoaPods/Swift Package Manager;
- Expo/React Native tooling;
- container tooling;
- code generation tooling.

Dependency manifests and lockfiles MUST agree. Frozen/locked installation MUST succeed from a clean checkout before the candidate can leave local verification.

Unpinned global tooling or undeclared packages MUST NOT be required for the build to succeed.

### 8.4 Local configuration

Local configuration MAY use localhost, local databases, local object storage, mock/sandbox providers, development credentials, developer logging, and disposable seed data.

However:

- local-only configuration MUST be explicitly local;
- required configuration MUST fail closed when absent;
- production secrets MUST NOT be used locally by default;
- secrets MUST NOT be committed;
- localhost/dev endpoints MUST NOT leak into a production release path;
- a local mock MUST NOT silently replace an authoritative business rule;
- a mock/provider stub MUST implement only the contract needed for testing and MUST be clearly non-production.

### 8.5 Business-semantic parity

The following MUST remain semantically consistent across Local, Staging, and Production unless an explicit Product/System policy says otherwise:

- authentication meaning;
- authorization and ownership rules;
- state-machine legality;
- API/contract semantics;
- financial calculations and ledger ownership;
- idempotency rules;
- data ownership;
- transaction and consistency guarantees;
- privacy classification;
- error semantics that consumers depend on.

Local convenience MUST NOT use an `allowAll`, hidden bypass, shadow writer, duplicate state machine, or alternate financial truth that would invalidate production-like verification.

### 8.6 Local data

Local data SHOULD be disposable and synthetic.

Real production PII, credentials, precise location history, financial payloads, identity documents, and customer/provider secrets MUST NOT be copied into ordinary local development.

If production-derived data is exceptionally necessary for diagnosis, it MUST be minimized, authorized, sanitized/masked where possible, protected, time-bounded, and deleted after the authorized purpose.

### 8.7 Local database and migrations

When a change affects persistent data, the developer MUST prove as applicable:

- migration syntax and ordering;
- deterministic migration history;
- constraints and indexes;
- compatibility with existing data shape;
- idempotency/retry behavior where required;
- backfill correctness;
- concurrency behavior;
- old/new application compatibility during rollout;
- destructive-change safety;
- recovery or forward-fix strategy.

A manually edited local database is never sufficient migration evidence.

For risky schema transitions, use an expand/migrate/cutover/contract model rather than a destructive one-step replacement unless proven safe.

### 8.8 Local tests

The developer MUST run the smallest complete evidence set for the affected cone. Depending on impact it includes:

- formatter/linter;
- type checking;
- compilation/build;
- unit/domain tests;
- contract/schema tests;
- generated-client drift tests;
- migration/database tests;
- cross-service integration tests;
- frontend tests;
- mobile/static/native checks;
- runtime smoke;
- critical journey verification;
- accessibility/RTL/localization checks where affected;
- performance/resource checks where risk indicates;
- security/authorization tests where affected.

### 8.9 Negative-path verification

Material changes MUST test relevant failure paths, not only happy paths. Examples include:

- unauthenticated/unauthorized/forbidden access;
- cross-tenant/cross-scope access;
- invalid state transition;
- duplicate request;
- retry and idempotency;
- timeout;
- dependency outage;
- provider unknown outcome;
- database conflict;
- concurrent mutation;
- expired/revoked credential;
- malformed/untrusted input;
- partial failure/restart;
- offline/weak-network mobile behavior;
- payment/financial reconciliation mismatch where applicable.

### 8.10 Local clean-state proof

A candidate MUST NOT leave Local merely because it works in an already-mutated developer workspace.

The project MUST be able to reproduce the candidate from a documented clean state with the canonical source and declared prerequisites.

The local exit claim SHOULD be equivalent to:

```text
clean source
+ canonical toolchain
+ locked dependency install
+ required generation
+ required migrations
+ affected tests
+ affected runtime/journey proof
= LOCAL_VERIFIED
```

### 8.11 Local exit gate

Local exit is blocked by any of the following:

- incomplete implementation;
- known material TODO/workaround/fallback;
- duplicate/shadow authority introduced or left unresolved in scope;
- dependency/lockfile drift;
- undeclared local prerequisite;
- failing applicable test/build/lint/typecheck;
- unresolved migration/data risk;
- material security/privacy finding;
- material runtime behavior not proven where runtime is affected;
- stale local evidence after a material change.

## 9. Phase 2 — Remote CI, security, and quality qualification

### 9.1 Purpose

Remote CI independently determines whether the candidate is reproducible outside the developer's machine and whether repository-defined engineering/security/quality invariants hold.

### 9.2 CI requirements

CI MUST:

- checkout the intended immutable candidate;
- avoid mutating tracked source as part of verification;
- use locked/pinned dependencies and toolchains;
- use least-privilege permissions;
- pin third-party workflow actions to immutable references according to repository policy;
- isolate untrusted PR code from privileged credentials;
- fail closed when required evidence is cancelled, missing, stale, or ambiguous;
- avoid hidden manual prerequisites;
- expose enough job identity/logging to diagnose failure;
- use concurrency/cancellation without misclassifying cancelled required work as PASS.

### 9.3 Affected versus full verification

Affected verification SHOULD be the normal iteration path when applicability is proven. Full/deep verification MUST run when required by risk, shared-authority changes, closure policy, or verification-system changes.

Skipping a check requires positive evidence that it is not applicable; absence of detection is not enough for high-risk domains.

### 9.4 Security and quality

Applicable remote qualification MUST cover the repository's current required controls, which may include:

- SAST/CodeQL;
- dependency review and known-vulnerability scanning;
- secret scanning;
- Semgrep or equivalent policy analysis;
- container/image scanning;
- infrastructure/workflow security analysis;
- license/policy validation;
- Sonar or equivalent quality gate;
- contract and database safety checks;
- supply-chain integrity checks.

A tool being configured is not proof that a scan actually ran successfully on the candidate.

### 9.5 Remote exit gate

All required remote checks for the candidate MUST be PASS. Required `FAIL`, `ERROR`, `CANCELLED`, unresolved `PENDING`, or missing evidence blocks promotion.

## 10. Phase 3 — Pull request and review

### 10.1 PR purpose

A pull request is an integration/release-candidate review boundary, not merely a Git transport mechanism.

### 10.2 PR content

The PR SHOULD make material review possible by describing as applicable:

- what changed and why;
- root cause or authoritative design intent;
- affected domain/surfaces;
- API/contract changes;
- data/migration/backfill changes;
- security/privacy/financial implications;
- runtime/config/provider changes;
- native/mobile implications;
- compatibility/rollout impact;
- deletion/cutover performed;
- evidence performed;
- rollback/recovery considerations.

### 10.3 Review requirements

The protected integration branch MUST enforce appropriate review and required-check policy.

At minimum:

- unresolved requested changes block merge;
- unresolved material review threads block merge;
- stale approval after a material candidate change MUST NOT be treated as approval of the new candidate;
- code-owner approval MUST be used for security-, finance-, release-, infrastructure-, or domain-owned paths when multiple qualified owners exist;
- self-review MUST NOT be presented as independent review.

If the project currently has only one authorized maintainer, it MUST NOT invent a fake independent human approval. Instead machine-verifiable gates become even more important, and any absence of independent review must remain explicit.

### 10.4 Exact merge candidate

Before merge, the project MUST establish the candidate identity needed to prove integration compatibility, normally including:

```text
PR number
head SHA
base SHA
merge candidate/resulting integration identity
```

If base or head movement changes the candidate, affected evidence and approvals MUST be reconsidered/rerun.

## 11. Phase 4 — Integration branch and release source

### 11.1 Protected source

The canonical release source MUST come from an authorized protected integration/release authority, normally the protected default branch or an explicitly governed immutable release tag derived from it.

Arbitrary feature branches MUST NOT possess direct production deployment authority.

### 11.2 Post-merge verification

When merge semantics, generated merge commits, integration movement, or policy risk can change the tested result, the resulting integrated source MUST receive the required post-merge verification before release build.

### 11.3 Source integrity

The release source identity MUST be recorded in the release record. Where signing/verified commits or tags are part of repository policy, verification MUST be checked rather than assumed.

## 12. Phase 5 — Release build and software supply chain

### 12.1 Build isolation

Release builds MUST occur in a controlled, repeatable environment. Production release artifacts MUST NOT be built from an untracked developer workspace.

### 12.2 Locked inputs

Build-critical inputs MUST be attributable, including as applicable:

- source SHA;
- dependency lockfiles;
- compiler/toolchain versions;
- base-image digest;
- build scripts/workflows;
- generated contracts/code inputs;
- build-time environment inputs;
- native signing/configuration inputs.

Mutable tags such as `latest` MUST NOT serve as the canonical artifact identity.

### 12.3 Artifact identity

Every release artifact MUST have an immutable identity such as:

- container digest;
- package checksum;
- signed binary hash;
- store build identifier tied to a binary checksum/provenance record.

Human-friendly semantic versions/tags MAY be aliases, but they do not replace immutable identity.

### 12.4 Provenance and SBOM

Release artifacts SHOULD have machine-verifiable provenance and an SBOM; for production-critical services and native releases they are expected unless a documented platform limitation prevents it.

Provenance SHOULD identify:

- source repository/ref/SHA;
- build workflow/system;
- build inputs/materials;
- builder identity;
- artifact digest;
- build time;
- relevant environment/build-profile identity.

### 12.5 Signing and attestation

Where supported, production artifacts SHOULD be signed/attested and verification SHOULD happen before deployment/promotion.

Signing keys and attestation authority MUST be access-controlled and MUST NOT be embedded in source or broadly exposed to developer workflows.

### 12.6 Release artifact security

Before staging/production promotion, the final artifact class MUST undergo applicable scanning for:

- known vulnerable packages;
- embedded secrets;
- unexpected binaries/files;
- container/image vulnerabilities;
- prohibited/debug tooling;
- malware/platform validation where applicable.

### 12.7 Release artifact exit gate

`RELEASE_ARTIFACT_READY` requires:

- approved integrated source;
- reproducible/controlled build completion;
- immutable artifact identity;
- required scans PASS;
- provenance/SBOM/signature requirements satisfied;
- no known material release blocker.

## 13. Environment model

### 13.1 Local

Local is optimized for development and diagnosis.

Permitted differences from production include reduced scale, localhost/LAN, disposable state, local emulators, sandbox providers, synthetic data, verbose diagnostics, and developer tooling.

Local MUST preserve business semantics and contract behavior sufficiently for meaningful engineering proof.

### 13.2 Staging / pre-production

Staging is a production rehearsal environment, not a shared developer sandbox.

Staging MUST be isolated from production in credentials and data. It SHOULD match production in all properties that can materially change runtime behavior, including as applicable:

- process/container model;
- runtime versions;
- deployment mechanism;
- ingress/TLS model;
- database engine/version family;
- migration mechanism;
- cache/queue semantics;
- object-storage contract;
- secret-injection mechanism;
- auth/service-identity model;
- observability;
- network boundaries;
- provider integration mode using staging/sandbox accounts;
- feature-flag engine;
- release artifact class.

Staging MAY use smaller capacity, different domains, synthetic/sanitized data, shorter retention, sandbox provider accounts, and reduced replicas if those differences do not invalidate the required proof.

### 13.3 Production

Production is the live user/business environment.

Production MUST use hardened configuration, least privilege, controlled ingress/egress, protected secrets, production provider identities, production data controls, production observability, backup/recovery controls, and approved immutable release artifacts.

Production MUST NOT depend on development shims, dev-only fallback behavior, local mocks, default credentials, debug servers, hot reload, or undocumented manual source edits.

## 14. Configuration governance

### 14.1 Configuration schema versus values

The project MUST distinguish:

- canonical configuration schema/contract — which settings exist, their type, meaning, requiredness, and security classification;
- environment-scoped values — the actual Local/Staging/Production values.

Do not create competing `.env` files or configuration layers that independently redefine the same material truth.

### 14.2 Production configuration

Production configuration MUST be validated before rollout. Required missing/invalid values MUST fail closed.

Environment configuration MUST NOT change core business semantics merely to bypass a production failure.

### 14.3 Feature flags

Feature definitions and ownership MUST be canonical. Environment targeting MAY differ.

Flags MUST NOT become permanent shadow architectures. Risky flags require owner, purpose, default, rollback behavior, observability, and removal criteria.

## 15. Secrets, identity, and deployment credentials

### 15.1 Secret isolation

Local, staging, and production credentials MUST be separately scoped. Staging MUST NOT be able to read production secrets merely because both are non-local environments.

### 15.2 Secret storage

Production secrets MUST be held by an approved secret manager/platform secure store and injected at runtime/build time only where necessary.

They MUST NOT be committed to Git, embedded in mobile/web client bundles, printed in logs, written into public artifacts, or copied into documentation.

### 15.3 CI/cloud authentication

Where the deployment/cloud provider supports federated identity/OIDC, CI/CD SHOULD use short-lived federated credentials instead of long-lived static cloud keys.

### 15.4 Least privilege

Build identity, deployment identity, runtime service identity, migration identity, database identity, store submission identity, and operator identity SHOULD be separated where their permissions differ materially.

## 16. Database promotion and migration policy

### 16.1 Migration authority

Production schema changes MUST be executed through one governed migration path. Ad hoc console SQL is not a normal deployment mechanism.

Application runtime identities SHOULD NOT possess unrestricted DDL privileges merely because a migration tool needs them.

### 16.2 Migration rehearsal

Any migration whose correctness depends on existing state MUST be rehearsed against a representative production-like schema/data shape before production.

### 16.3 Compatibility window

During rolling/canary deployment, migrations MUST preserve compatibility for the versions that can coexist unless downtime is an explicitly approved release property.

### 16.4 Destructive changes

Destructive/narrowing changes MUST prove:

- no remaining consumer dependency;
- data disposition/retention requirements;
- backfill/cutover completion;
- operational recovery implications;
- legal/audit/financial retention obligations.

### 16.5 Backup and restore

For stateful production changes, backup status alone is not sufficient. The release process MUST know whether restore/PITR is operationally viable for the affected failure class.

## 17. Staging admission gate

A candidate MUST NOT enter staging as a release candidate until all applicable requirements below are satisfied:

```text
source identity fixed
+ local verification PASS
+ remote CI PASS
+ required security PASS
+ required quality PASS
+ required reviews resolved
+ exact-candidate freshness proven
+ protected integration completed
+ release artifact/binary produced by controlled build
+ immutable artifact/binary identity recorded
+ required artifact scan PASS
+ provenance/SBOM/signature requirements satisfied
+ no unresolved material finding
```

Staging MAY receive earlier experimental builds for engineering purposes, but such deployments MUST be clearly classified as experiments and MUST NOT be called `STAGING_ACCEPTED`, `RELEASE_CANDIDATE`, or production evidence.

## 18. Staging verification

### 18.1 Deployment proof

Staging MUST prove the deployment mechanism itself, not only the application after manual repair.

### 18.2 Runtime health

Applicable services MUST prove:

- startup;
- liveness;
- readiness;
- dependency connectivity;
- graceful shutdown/restart;
- configuration loading;
- migration compatibility;
- service discovery/routing;
- TLS/ingress where applicable.

### 18.3 End-to-end journeys

All materially affected critical journeys MUST be exercised end-to-end using staging-safe identities/data.

A journey proof SHOULD follow the actual ownership chain rather than only call isolated endpoints.

### 18.4 Failure behavior

Staging MUST exercise representative failure modes for high-risk changes, including provider outage, timeout, retry, duplicate delivery, invalid authorization, concurrent mutation, process restart, and partial dependency failure where applicable.

### 18.5 Observability proof

The deployed candidate MUST be identifiable in logs/metrics/traces by release/source/artifact identity.

Staging MUST verify that required dashboards, alerts, traces, error capture, and correlation IDs actually receive the candidate's signals.

### 18.6 Performance/capacity

Changes with material performance risk MUST be tested against defined budgets or representative load. A release MUST NOT move to production with an unexplained performance regression or resource-exhaustion risk.

### 18.7 Security/runtime validation

Runtime authorization, isolation, session, provider-signature, CORS/network, secret, and sensitive-operation claims MUST receive runtime/integration proof where affected.

### 18.8 Staging data

Production data SHOULD NOT be copied verbatim into staging. Use synthetic or sanitized/masked representative datasets unless an explicitly authorized case requires otherwise.

### 18.9 Rollback/recovery rehearsal

Before production, the project MUST know the recovery strategy for the release. For high-risk releases, staging SHOULD prove rollback or forward-recovery execution rather than merely document it.

### 18.10 Staging acceptance record

`STAGING_ACCEPTED` evidence SHOULD identify at least:

```text
source SHA
artifact/binary identity
build/provenance identity
configuration revision/profile
migration set/revision
deployment identifier/time
runtime verification result
journey verification result
security result
performance result when applicable
observability result
rollback/recovery result
approver/release authority when applicable
```

## 19. Production readiness gate

No production deployment may start until all applicable conditions are PASS:

- staging/pre-production acceptance exists for the candidate or an explicitly justified equivalent final-native qualification exists;
- candidate/artifact identity has not changed since qualification;
- production configuration is validated;
- production secrets/identities are available and scoped;
- migration preflight is complete;
- backup/recovery posture is healthy for affected state;
- rollback/forward-recovery target is known;
- monitoring/alerts are ready;
- provider production credentials/endpoints are validated without leaking secrets;
- capacity/resource requirements are reviewed;
- release notes/operator notes exist where needed;
- required approval exists;
- no concurrent conflicting production deployment is active;
- current external platform/store requirements have been revalidated where applicable.

## 20. Production deployment

### 20.1 Deployment authority

Production deployment MUST run through one canonical deployment authority. Manual SSH/source-copy/server-edit workflows MUST NOT be the normal release path.

### 20.2 Concurrency

Only one conflicting deployment may mutate the same production release target at a time. Deployment systems MUST use appropriate locking/concurrency controls.

### 20.3 Deployment strategy

Use a strategy appropriate to risk and platform:

- rolling;
- canary;
- blue/green;
- controlled all-at-once only when justified by architecture/risk.

High-risk financial, authorization, or broad platform changes SHOULD use progressively observable rollout where technically possible.

### 20.4 Health and readiness

A new instance/version MUST NOT receive normal production traffic until required readiness conditions pass.

### 20.5 Migration ordering

The release must explicitly define whether migrations occur before, during, or after application rollout. Ordering MUST preserve required compatibility and recovery behavior.

### 20.6 Deployment failure

Failure to reach required health/readiness, unexplained migration failure, severe security signal, or critical business-probe failure MUST stop or roll back the rollout according to the release plan.

## 21. Post-deployment verification

A successful deployment command is not release success.

Production verification MUST include as applicable:

### Technical probes

- liveness/readiness;
- TLS/routing;
- dependency connectivity;
- database/cache/queue health;
- error rate;
- latency;
- resource saturation;
- crash/restart rate;
- provider failure rate.

### Business probes

Use production-safe synthetic/read-only/minimally mutating probes for critical user/business journeys when feasible.

### Security probes

Confirm sensitive authorization, service identity, webhook/provider, and secret/config boundaries affected by the release.

### Observability

Verify logs, metrics, traces, error reporting, alerts, and release correlation.

### Observation window

The release SHOULD define an observation window appropriate to risk. A rollout MUST NOT be declared fully verified while material release health is still unknown.

## 22. Rollback and forward recovery

### 22.1 Immutable rollback

For promotable server/web/container artifacts, preferred rollback is redeployment of the previous known-good immutable artifact, not a fresh rebuild from an old Git ref.

### 22.2 Database-aware rollback

Application rollback and database rollback are different operations. The release MUST NOT claim rollback safety unless schema/data compatibility supports it.

### 22.3 Mobile rollback limitation

Public native mobile binaries cannot generally be forcibly rolled back on every user device. Therefore mobile release recovery MUST rely on some combination of:

- pausing/stopping staged/phased rollout;
- disabling a risky server-side feature through governed feature control;
- preserving API backward compatibility;
- shipping an expedited hotfix/new store version;
- removing availability only when operational/legal trade-offs justify it;
- server-side mitigation that does not create a shadow business truth.

This limitation makes backward-compatible backend/API rollout especially important for mobile clients.

## 23. Emergency / break-glass releases

An emergency path MAY reduce normal latency, but MUST NOT erase traceability, security, or exact-candidate identity.

Emergency release requirements:

- incident/severity justification;
- smallest safe change;
- source/artifact identity;
- minimum non-negotiable tests and security checks;
- authorized release owner;
- explicit risks accepted;
- controlled production rollout;
- post-deploy verification;
- prompt follow-up review/retrospective;
- restoration of any temporarily deferred evidence;
- no permanent bypass left enabled.

An emergency label MUST NOT become a routine mechanism for skipping inconvenient controls.

## 24. Web release requirements

For browser/web applications:

- production builds MUST exclude dev tooling/debug configuration not intended for users;
- public environment variables MUST be classified as public and contain no secrets;
- source maps, if produced, MUST be handled according to privacy/security policy and SHOULD be private when they expose sensitive source/context;
- asset caching/versioning MUST prevent incompatible stale clients where material;
- CSP/security headers/CORS/cookie/session behavior MUST be verified where applicable;
- CDN/cache invalidation behavior MUST be deterministic;
- frontend and backend compatibility MUST be preserved during rolling deploys;
- critical browser/device/accessibility/RTL behavior MUST be tested when affected.

## 25. Native/mobile release governance — common requirements

This section applies to iOS/iPadOS and Android applications, including Expo/React Native applications.

### MOB-001 — Stable application identity

Production `bundleIdentifier` / Android `applicationId` (package name) MUST be governed and MUST NOT be changed casually. Staging/development identities SHOULD be distinct when isolation is required.

### MOB-002 — Monotonic versioning

Production release version/build identifiers MUST satisfy the platform's monotonic/version uniqueness rules. A submitted binary MUST be traceable to source SHA and build identity.

### MOB-003 — Signing separation

Development, staging, upload, and production signing credentials MUST be managed according to platform capability and least privilege. Production signing material MUST NOT be committed to source or broadly distributed to developer machines when managed signing can avoid it.

### MOB-004 — No server secret in client

Mobile binaries are untrusted client artifacts. No server secret, privileged API credential, database credential, private signing material, or administrative provider token may be embedded in them.

### MOB-005 — Permission minimization

Requested platform permissions/capabilities/entitlements MUST be limited to current product need, declared accurately in platform metadata, and tested for denied/restricted states.

### MOB-006 — Privacy declarations match reality

Store privacy/data declarations MUST match actual code, SDK behavior, network traffic, analytics, advertising, diagnostics, location, contact, device, payment, account, and third-party data handling.

A form completed from memory without technical verification is not acceptable evidence.

### MOB-007 — Third-party SDK governance

Every release MUST account for SDKs that can change privacy, tracking, permissions, signing, required-reason/API declarations, background execution, advertising identifiers, or store policy compliance.

### MOB-008 — Runtime compatibility

Backend APIs MUST remain compatible with currently supported public mobile versions through the required rollout/support window. A backend deployment MUST NOT assume that all users instantly install the newest mobile binary.

### MOB-009 — Final production binary qualification

The production-configured binary to be publicly released MUST receive pre-release testing through an appropriate platform distribution path. If the final binary is rebuilt after qualification, it is a new candidate and affected evidence MUST be rerun.

### MOB-010 — Store release is a separate gate

A binary being technically correct does not mean it is store-submission ready. Store metadata, privacy declarations, legal/account state, age/content ratings, screenshots, app access, policy declarations, and reviewer information are part of the release gate.

## 26. Apple App Store / TestFlight release policy

Apple rules change; every submission MUST revalidate current Apple requirements from official Apple Developer/App Store Connect sources on the submission date.

### 26.1 Apple account and authority

Before release, verify:

- Apple Developer Program membership is active;
- App Store Connect agreements are accepted as applicable;
- tax/banking agreements are complete when paid apps/IAP require them;
- user roles follow least privilege;
- App Store Connect API keys or signing credentials are scoped and protected;
- the app record and bundle identifier are correct.

### 26.2 Apple build prerequisites

The release MUST verify current Apple minimum Xcode/SDK submission requirements. Do not hardcode an old SDK threshold as durable policy.

The build MUST validate:

- production bundle identifier;
- marketing version/build number;
- supported OS/device targets;
- entitlements/capabilities;
- provisioning/signing/distribution identity;
- push notification/environment entitlement when used;
- Associated Domains/Universal Links when used;
- background modes when used;
- Keychain/App Groups when used;
- encryption/export-compliance implications;
- privacy usage-description strings for requested protected resources;
- architecture/binary validation.

### 26.3 Apple privacy manifest / Required Reason APIs

The final app and applicable third-party SDKs MUST satisfy current Apple privacy-manifest and Required Reason API rules.

The release process MUST inspect the final dependency/native binary set, not only application source, because third-party SDKs can trigger manifest/signature requirements.

Declared reasons MUST reflect actual allowed use and MUST NOT be used to justify fingerprinting or undeclared tracking.

### 26.4 App privacy and tracking

App Store privacy answers MUST match actual collection/sharing practices of both first-party code and third-party SDKs.

If tracking or IDFA-related behavior exists, the release MUST verify current AppTrackingTransparency and platform policy requirements and the actual runtime behavior for consent/denial.

### 26.5 TestFlight qualification

Before App Review, production release candidates SHOULD be distributed through TestFlight when technically appropriate.

The final build MUST receive representative real-device testing covering as applicable:

- fresh install;
- upgrade from supported previous production version;
- authentication/session restore/revocation;
- notifications/deep links;
- background/foreground lifecycle;
- offline/weak network;
- permission denied/limited states;
- camera/location/maps/media capabilities;
- critical business journeys;
- crash-free startup;
- accessibility/RTL/localization;
- production-compatible backend/API behavior.

External TestFlight distribution MAY require Beta App Review according to current Apple rules; the release process MUST check current requirements.

### 26.6 App Store metadata gate

Before submission, verify all applicable App Store Connect metadata, including:

- app name/subtitle/description/keywords;
- category;
- screenshots/previews that accurately represent current behavior;
- support URL;
- privacy policy URL;
- marketing URL if used;
- age rating questionnaire;
- copyright;
- pricing/tax category/territories;
- app privacy declarations;
- review contact information;
- review notes explaining non-obvious flows/capabilities;
- demo/test credentials or review-access instructions where login is required;
- encryption/export-compliance information;
- content rights/licensing declarations;
- in-app purchases/subscriptions/events/assets included in the submission as applicable.

Reviewer credentials MUST be scoped test/review credentials, not personal developer or production-admin credentials.

### 26.7 App Review submission

Only the accepted production binary identity may be selected for submission. If a different build is selected, qualification must follow that build.

The release record MUST retain:

- source SHA;
- binary/build identifier;
- submission/version identity;
- relevant test evidence;
- App Review submission date/status;
- material review communications/issues;
- final approval/release decision.

### 26.8 Apple release strategy

For updates, phased release SHOULD be considered for risk-managed rollout. The release owner MUST understand that users may still manually download the update and that phased release is not absolute isolation.

When phased release is used, monitor technical and business health between phases and pause when predefined rollback/stop criteria are met.

### 26.9 Apple rejection handling

A rejection MUST be treated as evidence against the submitted candidate or metadata/policy package. Do not bypass the issue by making misleading metadata or reviewer-only behavior.

Any binary change made to resolve rejection creates a new binary candidate requiring affected requalification.

### 26.10 Apple post-release

After availability begins, monitor as applicable:

- crashes/hangs;
- launch failures;
- App Store analytics;
- authentication/session errors;
- API compatibility;
- notification/deep-link behavior;
- critical business metrics;
- customer support signals/reviews;
- privacy/security incidents.

A severe mobile regression triggers pause/mitigation/hotfix according to the recovery policy.

## 27. Google Play release policy

Google Play rules change; every release MUST revalidate current Google Play Developer Program and Play Console requirements on the submission date.

### 27.1 Google Play account and authority

Verify:

- developer account is active and verified;
- required identity/account verification is complete;
- Play Console users/permissions are least privilege;
- payments/merchant settings are complete when monetization requires them;
- production access eligibility has been satisfied for the account type;
- the correct application/package record is used.

For account classes subject to mandatory pre-production testing or production-access review, those current requirements MUST be satisfied before public release.

### 27.2 Android build prerequisites

The release MUST verify current Google Play target API policy and platform deadlines on each submission date.

The final Android release MUST validate as applicable:

- production `applicationId`/package;
- versionCode/versionName monotonicity;
- targetSdk/minSdk/compileSdk compatibility;
- Android App Bundle (AAB) requirements;
- 64-bit/native ABI requirements when applicable;
- manifest permissions/features;
- exported components and intent filters;
- deep/app links;
- notification behavior;
- background execution restrictions;
- foreground service declarations;
- exact-alarm/special-access requirements where used;
- location/background-location policy where used;
- storage/media permissions;
- billing/in-app purchase integration where used;
- signing/upload key configuration.

### 27.3 Play App Signing

New/eligible apps SHOULD use Play App Signing according to current Google policy. Upload keys and app-signing keys MUST be treated as distinct authorities where supported.

Upload keys MUST be protected and rotated/recovered through the approved process if compromised. The app signing key must not be handled as an ordinary developer credential.

### 27.4 Testing tracks

The project SHOULD use the Play testing tracks intentionally:

- internal testing for fast trusted-team distribution;
- closed testing for controlled pre-release groups;
- open testing when appropriate and eligible;
- production for public release.

The final production-configured AAB SHOULD be exercised in an appropriate pre-release Play track before public rollout where the account/application model permits.

If Play Console allows promotion of the exact tested release artifact to production, prefer promotion rather than rebuilding.

### 27.5 Pre-launch/device testing

The candidate SHOULD use Play pre-launch/device reports and representative physical-device testing where useful. Failures that indicate a material real-user defect MUST be resolved before production.

Testing MUST include as applicable:

- clean install;
- upgrade from supported prior release;
- process death/restart;
- background/foreground transitions;
- permission denied/limited states;
- notification/deep links;
- device/OS diversity;
- RTL/localization/accessibility;
- weak/offline network;
- critical journeys;
- crash/ANR behavior.

### 27.6 Play Data safety and privacy

The Google Play Data safety form and privacy policy MUST accurately describe actual data collection, sharing, security, deletion, and third-party SDK behavior.

The release process MUST review actual code/dependencies/network behavior against the declaration when data handling changes.

### 27.7 Play app content/policy declarations

Before submission/rollout, verify all applicable Play Console declarations and content, including:

- privacy policy;
- Data safety;
- content rating;
- target audience/children/families rules where applicable;
- ads declaration;
- app access/reviewer login instructions;
- sensitive permissions/declaration forms;
- financial/health/government/news or other special-category declarations where applicable;
- account deletion requirements where accounts are created, according to current policy;
- store listing text/screenshots/graphics;
- countries/regions/pricing;
- in-app products/subscriptions;
- policy status and unresolved warnings/errors.

Store metadata MUST represent actual functionality and MUST NOT be misleading.

### 27.8 Production rollout

The production release MUST use a deliberate rollout strategy. Staged rollout SHOULD be used for material-risk updates when supported.

During staged rollout, monitor:

- crash/ANR rate;
- startup/installation failures;
- backend/API errors;
- authentication failures;
- payment/order/financial metrics where affected;
- support signals and reviews;
- performance/regression signals.

Predefined stop criteria SHOULD trigger rollout halt or mitigation.

### 27.9 Google rejection/policy issue handling

A rejected release or policy violation MUST be diagnosed at the real code/SDK/metadata/policy root. A changed AAB is a new candidate requiring affected requalification.

Do not use misleading declarations, hidden reviewer behavior, or post-review remote activation to evade store policy.

### 27.10 Google post-release

After rollout begins, monitor Play Console vitals and internal observability. Release closure requires acceptable production health, not merely status `Available` in the store.

## 28. OTA / over-the-air update policy for React Native / Expo or equivalent

If the platform supports OTA delivery of JavaScript/assets/configuration, OTA is a production deployment mechanism and MUST be governed as such.

### OTA-001 — Compatibility boundary

An OTA update MUST be compatible with the installed native runtime/build. Runtime/version policy MUST prevent delivery of incompatible JS/native expectations.

### OTA-002 — Same gates

OTA MUST NOT bypass source review, CI, security, quality, exact-candidate evidence, release authority, or post-deploy monitoring merely because no store review is required.

### OTA-003 — No policy evasion

OTA MUST NOT be used to introduce functionality that requires store review/metadata/permission changes while intentionally bypassing Apple/Google policy.

### OTA-004 — Rollback

OTA delivery MUST have a deterministic rollback/republish strategy and compatibility with server/API versions.

### OTA-005 — Channel isolation

Development, staging, and production OTA channels MUST be access-controlled and correctly mapped to the intended native runtime/application identity.

## 29. Release records and auditability

Every production/store release MUST have a durable release record in an approved canonical system. The record MAY be GitHub Release/deployment metadata, a release database, or another governed system, but there MUST be only one authoritative record for the release identity.

The record SHOULD include as applicable:

```text
release ID/version
source SHA
base/integration identity
artifact/container digest(s)
native binary/build identifiers
SBOM/provenance/attestation references
migration revisions
configuration profile/revision
staging/pre-production evidence
security/quality evidence
approvals
production deployment identifier/time
store submission identifiers/status
rollout strategy
previous known-good release
rollback/forward-recovery reference
post-release verification result
known accepted residual risks, if any
```

Do not commit duplicate logs/screenshots/reports merely to create an archive when the authoritative system already retains them.

## 30. Audit framework

This policy is designed to audit the current system at any future time.

Each applicable control MUST be classified as exactly one of:

- `PASS` — current evidence proves compliance;
- `FAIL` — current evidence proves non-compliance;
- `NEEDS_EVIDENCE` — compliance cannot be proven with fresh evidence;
- `N/A_PROVEN` — the control is demonstrably not applicable to the audited scope.

`UNKNOWN`, silence, missing workflow, missing environment, missing artifact, or undocumented manual practice MUST NOT be converted to PASS.

### 30.1 Audit evidence hierarchy

Prefer evidence in this order according to the claim:

1. live platform/provider state;
2. actual deployed artifact/binary identity;
3. same-candidate runtime evidence;
4. CI/build/store execution evidence;
5. executable configuration/contracts/source;
6. durable policy/documentation;
7. human assertion only as context, never sole proof of a technical control.

### 30.2 Freshness

Audit evidence MUST state its candidate/time/context. Evidence is stale if a later material change can alter the claim.

### 30.3 Audit dimensions

A comprehensive release audit SHOULD classify at least:

- source/branch protection;
- dependency/toolchain reproducibility;
- architecture/contracts;
- database/migrations;
- tests/critical journeys;
- security/privacy;
- CI trust boundary;
- artifact/supply chain;
- configuration/secrets;
- staging parity/isolation;
- production infrastructure;
- deployment authority;
- observability/SLOs;
- backup/recovery;
- mobile signing/build/distribution;
- Apple compliance/submission;
- Google Play compliance/submission;
- OTA governance;
- post-release health.

### 30.4 Audit result must not overclaim

Examples:

```text
CI configured ≠ CI passed
Docker Compose exists ≠ production infrastructure exists
production architecture document exists ≠ production deployed
TestFlight build exists ≠ App Store ready
Play internal test exists ≠ production access/production readiness
store approval ≠ business/runtime correctness
backup configured ≠ restore proven
artifact tag exists ≠ immutable digest/provenance proven
```

## 31. Universal promotion stop conditions

Any applicable condition below blocks promotion until resolved or legitimately classified `N/A_PROVEN`:

- required check failed/cancelled/missing/pending beyond valid execution state;
- stale source/base/merge/artifact evidence;
- merge conflict or unresolved material review request;
- known critical/high material security issue without formally authorized risk treatment;
- secret exposure;
- dependency/lockfile inconsistency;
- unreproducible build;
- unreviewed generated artifact drift;
- failing affected test or critical journey;
- unknown database migration/data impact;
- unsafe destructive migration;
- missing required production secret/config;
- default/dev credential in production path;
- localhost/dev/mock dependency in production path;
- production business behavior dependent on a dev shim;
- missing immutable artifact/binary identity;
- missing provenance required by release class;
- staging did not prove the artifact/equivalent production binary lineage;
- production rollback/recovery unknown for a high-risk change;
- failed health/readiness/business probes;
- monitoring/alerts unavailable for a change that requires them;
- unresolved App Store/Google Play policy blocker;
- inaccurate privacy/data declaration;
- unqualified rebuilt mobile binary;
- expired/invalid signing/account agreement;
- current platform SDK/target API requirement not satisfied;
- required store testing/production-access prerequisite not satisfied;
- release authority or approval missing.

## 32. Minimum evidence by transition

### Local Development → Local Verified

MUST prove:

```text
implementation complete
+ clean reproducible setup
+ locked dependencies
+ affected static/tests
+ affected contracts/data
+ affected runtime/journey proof
+ no known material in-scope defect
```

### Local Verified → PR/Remote Verified

MUST prove:

```text
immutable source candidate
+ independent remote CI
+ required security/quality
+ no privileged/untracked developer dependency
```

### PR Candidate → Integrated Source

MUST prove:

```text
required reviews
+ required checks
+ resolved material threads
+ exact head/base/candidate freshness
+ protected merge authority
```

### Integrated Source → Release Artifact Ready

MUST prove:

```text
controlled build
+ immutable artifact/binary identity
+ scan
+ provenance/SBOM/signing requirements
```

### Release Artifact Ready → Staging Accepted

MUST prove:

```text
deployability
+ migration
+ runtime
+ critical E2E
+ failure behavior as required
+ security/runtime
+ observability
+ performance as required
+ recovery/rollback readiness
```

### Staging Accepted → Production Approved

MUST prove:

```text
same artifact or explicitly governed native-equivalent lineage
+ production config/secrets/IAM
+ backup/recovery readiness
+ current external platform requirements
+ approval
+ no material blocker
```

### Production Approved → Production Verified

MUST prove:

```text
controlled rollout
+ health/readiness
+ migration success
+ technical/business/security probes
+ monitoring/alerts
+ observation window appropriate to risk
```

### Production Binary → Apple/Google Public Release

MUST additionally prove:

```text
final production binary qualified
+ signing/account authority valid
+ current SDK/target API requirements
+ store metadata/privacy/content declarations
+ reviewer access
+ testing-track/TestFlight evidence as applicable
+ store policy checks
+ release strategy
```

### Public Release → Closed

MUST prove:

```text
store/platform availability as intended
+ rollout health
+ crash/error/business metrics acceptable
+ no unresolved material release regression
+ release record complete
```

## 33. Reference comparison — Local vs Staging vs Production

| Control area | Local | Staging / Pre-production | Production |
|---|---|---|---|
| Primary purpose | development/diagnosis | production rehearsal/release proof | real-user/business service |
| Source changes | allowed | prohibited as release repair | prohibited |
| Artifact | dev builds allowed | controlled immutable candidate | same immutable promotable artifact where valid |
| Native binary | dev/staging binary | qualified final-equivalent/final production binary | approved signed production binary |
| Data | synthetic/disposable | synthetic or sanitized | real governed data |
| Production PII | normally prohibited | prohibited unless specifically authorized/sanitized | governed |
| Secrets | local dev only | staging-only secure store | production secure store |
| Credentials | scoped dev | isolated staging | least-privilege production |
| Providers | mock/sandbox | sandbox/staging | live production |
| Database | local/disposable | isolated production-like | managed/hardened/backup-protected |
| TLS | optional where purely local | required when network-equivalent | required |
| Networking | developer-friendly | production-like isolation | hardened/least privilege |
| Debug tooling | allowed | limited | absent unless explicitly secure operational tooling |
| Hot reload | allowed | no | no |
| Seed data | allowed | curated test data | no dev seed |
| Runtime observability | useful | mandatory for release claims | mandatory |
| Alerts | developer/team | testable | operational escalation |
| Rollback | reset/restart | rehearsal | deterministic operational recovery |
| Manual source edit | developer iteration | invalidates release evidence | forbidden |
| Store distribution | dev build | TestFlight/testing tracks | App Store/Play production |

## 34. Periodic governance review

At least before material changes to release infrastructure and periodically as platform rules evolve, the release owner SHOULD re-evaluate this policy against current NIST/OWASP/SLSA/GitHub/Apple/Google requirements.

When an external requirement changes, update the smallest canonical policy/control necessary. Do not create a parallel release guide that competes with this file.

## 35. Closure principle

The strongest rule of this policy is:

> **A release may advance only when the exact thing being promoted is known, the evidence required for that promotion is fresh and applicable, the next environment cannot silently change the product truth, and there is a controlled recovery path if the release is wrong.**

The canonical target is not "all checks green". The target is a traceable, reproducible, secure, reviewable, deployable, observable, recoverable release whose source, artifact/binary, configuration, migration, environment, store submission, and runtime outcome all belong to one coherent release lineage.
