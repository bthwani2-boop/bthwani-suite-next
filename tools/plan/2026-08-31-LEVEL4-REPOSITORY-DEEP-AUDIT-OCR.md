# BThwani Repository-Wide Level-4 Deep Audit — `ocr`

> **Audit artifact, not a closure certificate.** This file records the evidence-bounded whole-repository audit requested for the unified multi-surface full stack. It must not be used to claim `CLOSED`, Level-4 fixed point, production readiness, or absence of unknown defects. Any execution campaign must re-pin live truth and re-diagnose before mutation.

## 0. Audit identity and immutable baseline

- Repository: `bthwani2-boop/bthwani-suite-next`
- Branch: `ocr`
- Audited HEAD before this audit-file mutation: `4da9ab0988ffd1f6f85c82802f3c27de5e7aa569`
- Audited tree: `424c4eaf32553e6620ac9e2132b641a6f2d7a74f`
- Base branch for current PR: `master`
- Base SHA observed for PR #349: `416336db7f42c7131e214bfe72d7e3eaf6353869`
- Branch delta at audit time: `37` commits ahead of that base, `0` behind.
- Current PR: `#349` — `fix(assurance): close CodeQL ingestion and security roots`
- Scope resolved from current human intent: `REPOSITORY`
- Completion horizon requested: `LEVEL_4`
- Canonical execution/closure authority: `tools/prompting/bthwani-orchestrator/00-ORCHESTRATOR.md`
- Orchestrator package revision on audited HEAD: `23`
- Loaded semantic owners: `00`–`05` plus all three material focus modules.

### Critical interpretation

The current request is an explicit audit/report intent. Per the live orchestrator, that authorizes deep diagnosis and root proof but **not repository remediation**. Therefore this artifact intentionally records roots, gaps, source-of-fix, affected cones, and closure obligations; it does not mutate product/runtime code.

## 1. Governing audit law

The audit applies the live orchestrator law rather than treating builds, scanners, files, branches, or reports as correctness authority:

1. One canonical truth/owner/writer per material concept.
2. Highest Proven Executable Root before symptoms.
3. Actual Source-of-Defect / Actual Source-of-Fix must be identified.
4. Scope anchors are not filesystem boundaries.
5. Derived projections are permitted only when subordinate, reconstructable, and unable to redefine truth independently.
6. Full affected cone includes writers/readers/consumers/data/contracts/runtime/security/recovery/UX/A11y/RTL/negative space.
7. Green CI, a scanner pass, or code existing on `master` does not equal closure.
8. Level-4 requires exact-candidate broad adversarial proof after the root queue first appears exhausted.

## 2. Finding confidence and severity

### Confidence

- **PROVEN** — directly established from exact audited-head repository content or exact GitHub metadata.
- **STRONGLY_INDICATED** — causal risk/path is directly visible, but one missing proof could still demonstrate a valid compensating mechanism.
- **PROOF_GAP / UNKNOWN** — material closure obligation has not been demonstrated for the exact candidate; this blocks a Level-4 claim but is not automatically a product defect.
- **EXCLUDED_FALSE_POSITIVE** — investigated and rejected.

### Severity

- **P0** — proven catastrophic integrity/security/data-loss/root-authority failure requiring immediate stop.
- **P1** — material systemic root or Level-4 blocker with broad blast radius.
- **P2** — material bounded defect/root or significant proof/recovery/UX gap.
- **P3** — cleanup/residue/maintainability debt with lower immediate operational risk.

No P0 is asserted in this audit without direct proof.

## 3. Material landscape — the actual system under audit

The repository is a unified multi-surface system, not a single DSH application:

### Product surfaces

- `apps/app-client`
- `apps/app-partner`
- `apps/app-captain`
- `apps/app-field`
- `apps/control-panel`

### Service domains

- `services/dsh`
- `services/wlt`

### Cross-cutting canonical domains

- `core/identity`
- `core/workforce`
- `core/providers`
- `core/platform-control`

### Shared/runtime/contract layers

- `shared/ui-kit`
- `shared/data-runtime`
- `shared/control-panel`
- `contracts`
- `infra`
- `governance`
- repository runtime/migration/tooling/evidence layers under `tools` and `.github`.

The workspace declaration confirms these are materially connected workspaces. The branch delta from `master` changes hundreds of paths across DSH auth, administration, cart, catalog, checkout, dispatch, incidents, orders, partner flows, support, WLT boundaries/outboxes, contracts, multiple frontends, UI kit, runtime and assurance scripts. Therefore a narrow PR title is not the real affected cone.

---

# 4. Executive Root Graph / highest-priority queue

## R-01 — Exact-candidate Level-4 evidence is not commensurate with the actual 37-commit affected cone

- Severity: **P1**
- Confidence: **PROOF_GAP**
- Root class: verification/coverage/system closure
- Evidence:
  - `ocr` is 37 commits ahead of PR base `416336db...`.
  - The delta spans hundreds of backend, contract, frontend, runtime and assurance paths.
  - PR #349 description reports targeted local evidence (`assurance:self-test 98/98`, targeted runtime/security tests `30/30`) and explicitly states final closure remains subject to exact-candidate GitHub analysis evidence.
  - Sonar PR comment reports `0 New issues`, `0 Security Hotspots`, `80.0% Coverage on New Code`, `0.0% duplication on New Code`; this is change/delta evidence, not repository-wide Level-4 proof.
  - At the time checked, exact HEAD `4da9ab...` had no combined status entries.
- Why root, not symptom: any downstream claim that individual paths are closed is invalid if the exact-candidate proof envelope does not cover the actual changed cone and the Level-4 mandatory baselines.
- Actual source-of-fix: verification campaign and exact-candidate evidence binding for the material affected cone; **not** cosmetic CI repair.
- Affected cone: all changed product/service/contract/data/runtime/security/UX paths plus inherited consumers whose proof was invalidated.
- Required closure unit:
  1. re-pin exact candidate;
  2. materiality map for all 37-commit changes;
  3. targeted checks for each changed root plus fresh repository baselines;
  4. cross-role/surface/journey/runtime/data/recovery/security/UX evidence;
  5. fresh adversarial re-audit after first queue exhaustion.
- Disposition: **OPEN — blocks any Level-4 closure claim.**

## R-02 — DSH OpenAPI lint exception authority contains stale and material reference suppressions

- Severity: **P1**
- Confidence: **PROVEN**
- Root class: contract integrity / stale parallel assurance truth / cleanup
- Evidence:
  - `.redocly.lint-ignore.yaml` on exact audited HEAD suppresses `no-unresolved-refs` for material DSH finance paths.
  - The same ignore file contains a `services/dsh/contracts/dsh.cod-custody.openapi.yaml` section with multiple `no-unresolved-refs` suppressions.
  - Exact fetch of `services/dsh/contracts/dsh.cod-custody.openapi.yaml` on audited HEAD returns **404 / nonexistent**.
  - DSH contract README declares `dsh.openapi.yaml` the sovereign entry contract and says verification validates references, uniqueness, ownership, bundle drift and client regeneration.
- Why root, not symptom: stale or unresolved-reference suppressions weaken the sovereign contract's self-consistency and allow the linter configuration itself to retain obsolete contract topology.
- Actual source-of-defect: canonical modular DSH OpenAPI source + its lint-ignore debt/lifecycle.
- Actual source-of-fix: correct/remove invalid refs in canonical modules, migrate active paths to the true module, then delete obsolete ignore entries; regenerate bundle/client and verify ownership manifest.
- Canonical owner: `services/dsh/contracts` sovereign modular contract.
- Affected cone: OpenAPI entry/modules, manifests, generated bundle, generated TypeScript clients, backend API binding, frontend consumers, Schemathesis/contract tests, documentation.
- Required verification: zero material unresolved-ref suppressions, no ignore entries for nonexistent modules, compose/verify/generate clean on exact candidate, consumer binding proof.
- Disposition: **OPEN.**

## R-03 — DSH partner payout-readiness projection has an explicit post-WLT-mutation convergence failure state; independent reconciliation is not proven

- Severity: **P1/P2**
- Confidence: **STRONGLY_INDICATED / PROOF_GAP**
- Root class: distributed consistency / recovery
- Evidence:
  - DSH DB authority document correctly states WLT owns financial truth and DSH may keep only derived operational projections.
  - `services/dsh/backend/internal/http/payout_routes.go` forwards financial writes to WLT.
  - On partner payout-destination reads, DSH synchronizes the WLT-owned destination into a DSH partner readiness projection.
  - If WLT state changed but DSH projection synchronization fails, DSH returns `502 PAYOUT_PROJECTION_SYNC_FAILED` with the explicit condition that WLT changed while DSH did not converge and tells the caller to retry the read.
  - `partner/payout_projection.go` verifies every owned Partner row converges, which is good local integrity behavior, but this audit did not establish a durable asynchronous repair/reconciliation path for a failed post-WLT convergence.
- What is **not** claimed: DSH is **not** proven to duplicate WLT financial master truth. The code explicitly preserves WLT as owner.
- Actual source-of-fix if gap is confirmed: authoritative WLT→DSH projection/reconciliation mechanism with durable retry/idempotency/backpressure/observability, not a UI retry workaround.
- Affected cone: partner readiness, payout destination read path, WLT finance boundary, DSH derived projection, onboarding/readiness gates, operational UX and recovery.
- Required proof to close as N/A: show a durable reconciler/outbox/subscriber/repair job that deterministically repairs this exact projection and prove failure/replay/restart behavior.
- Disposition: **OPEN PROOF GAP; upgrade to proven defect if no durable reconciler exists.**

## R-04 — Shared control-panel UI owner bypasses TypeScript safety with file-wide `any` suppression and an explicit `@ts-ignore`

- Severity: **P2**
- Confidence: **PROVEN**
- Root class: shared architecture/type contract
- Evidence in `shared/ui-kit/src/web/control-panel.tsx`:
  - `/* eslint-disable @typescript-eslint/no-explicit-any */`
  - repeated `as any` casts on shared styles;
  - explicit `// @ts-ignore` before `hoverStyle`.
- Why root: this is a shared UI owner consumed across the control-panel surface; suppressing the type boundary at the shared owner propagates uncertainty to every consumer and can hide incompatible primitive props rather than fixing the shared contract once.
- Actual source-of-fix: the UI-kit primitive/style/hover prop typings and the web control-panel composition, not call-site casts.
- Affected cone: shared UI-kit exports, control panel consumers, typecheck/build, web interaction behavior.
- Closure obligation: remove broad suppression by fixing canonical primitive typings, then exact typecheck/test/render proof.
- Disposition: **OPEN.**

## R-05 — Shared UI control-panel primitives bypass the existing localization authority and expose an ignored public prop

- Severity: **P2**
- Confidence: **PROVEN**
- Root class: UX/i18n/API contract
- Evidence:
  - `shared/ui-kit/src/locales.ts` provides a centralized Arabic localization tree including control-panel UI strings.
  - `shared/ui-kit/src/web/control-panel.tsx` nevertheless hardcodes user-visible English strings including `vs last period`, `Reject`, `Approve`, and `No pending decisions`.
  - `WebControlPanelRailProps` declares `onToggleCollapse?: () => void`, but the implementation does not consume/use the callback.
- Root diagnosis:
  - user-visible copy has two competing writer paths: centralized locale data and literal shared-component strings;
  - the public component contract advertises behavior that the implementation ignores.
- Actual source-of-fix: shared UI-kit component APIs + canonical localization access, not downstream per-screen translations.
- Affected cone: control-panel shared cards/queues/rail, RTL/language switching, tests/snapshots, consumer expectations.
- Required verification: Arabic/English parity, direction switching, keyboard/focus and callback behavior, no literal translatable copy in shared primitives unless explicitly nonlocalized.
- Disposition: **OPEN.**

## R-06 — Cross-surface/cross-role proof does not yet cover the changed product cone

- Severity: **P2**
- Confidence: **PROOF_GAP**
- Root class: journey/system verification
- Evidence:
  - branch changes include app-client, app-field, app-partner and control-panel product code plus shared UI-kit and backend behavior that also affects captain/other consumers.
  - Available PR evidence is predominantly static/targeted and does not constitute rendered/live cross-role journey proof for all materially changed flows.
- Required Level-4 proof: client↔partner↔field↔captain↔operator handoffs, positive/error/empty/offline/retry/permission/denial states, data transitions and recovery.
- Disposition: **OPEN PROOF GAP.**

## R-07 — Fresh exact-head security/static-analysis re-ingestion remains unproven after the final security-related commit

- Severity: **P2**
- Confidence: **PROOF_GAP**
- Root class: security evidence freshness
- Evidence:
  - GitHub Advanced Security previously commented on `tools/dev/local-workforce-provisioning.mjs`: `File data in outbound network request`.
  - Latest audited commit is specifically `fix(dev): stop logging local request payloads` and modifies that file plus tests.
  - Exact current file now validates local API URLs before fetch and no longer provides proof that the old finding still applies.
  - Therefore the prior finding cannot be blindly carried forward **or** silently considered closed; exact-head CodeQL evidence is required.
- Actual source-of-fix if finding remains: local provisioning request/data boundary, not CodeQL configuration.
- Disposition: **OPEN proof freshness obligation.**

## R-08 — Contract/evidence configuration retains stale historical residue beyond active topology

- Severity: **P3**, except material unresolved refs already elevated in R-02
- Confidence: **PROVEN**
- Evidence:
  - `.redocly.lint-ignore.yaml` has entries for nonexistent contract modules.
  - `.gitleaksignore` contains exact immutable historical fingerprints, including references to files no longer present in current topology.
- Important distinction:
  - `.trivyignore` contains no active CVE suppressions and is **not** a proven security hole.
  - `.gitleaksignore` uses exact fingerprints rather than broad path/rule suppression, so it is not classified as a security bypass; only stale cleanup residue is noted.
- Disposition: **OPEN cleanup debt; low risk except where it overlaps R-02.**

## R-09 — Recovery/replay proof for heavily modified DSH↔WLT sagas/outboxes is not available at Level-4 breadth

- Severity: **P2**
- Confidence: **PROOF_GAP**
- Root class: reliability/data consistency
- Evidence from 37-commit delta includes modifications in:
  - checkout finance outbox;
  - checkout payment saga;
  - operational outbox;
  - order cancellation/return flows;
  - WLT proxy/facade clients;
  - promotion funding outbox;
  - partner WLT outbox;
  - WLT event handling;
  - payout/settlement-adjacent paths.
- Closure obligation: prove duplicate delivery, reordering, process crash, partial commit, downstream timeout, replay after restart, poison message, and reconciliation semantics for every materially changed financial/operational handoff.
- Disposition: **OPEN PROOF GAP.**

## R-10 — Full UX/A11y/RTL negative-space verification remains unproven across five surfaces

- Severity: **P2**
- Confidence: **PROOF_GAP**, with localized concrete defect in R-05
- Root class: product quality
- Evidence:
  - shared UI-kit and multiple app/control-panel screens changed;
  - concrete mixed localization exists in the shared UI owner;
  - no exact-candidate evidence reviewed here proves comprehensive focus order, keyboard use, screen-reader labels, touch targets, reduced motion, Arabic RTL layout, loading/error/empty/offline/retry parity and responsive behavior across all affected surfaces.
- Disposition: **OPEN PROOF GAP.**

---

# 5. A–Z repository defect/gap inventory

This section is deliberately exhaustive by **category**. A letter without a proven code defect records the material unknown/proof obligation instead of inventing a finding.

## A — Authority / Architecture / Accessibility

- **PROVEN:** sovereign DSH contract is documented, but its linter exception file retains stale topology and material unresolved-ref suppressions (R-02).
- **PROVEN:** shared control-panel UI has a type-contract bypass at its canonical shared owner (R-04).
- **PROOF_GAP:** accessibility baselines across all five surfaces are not proven for exact candidate.
- **Required:** one owner/writer map for identity, workforce, DSH operational state, WLT financial state, platform-control and provider configuration, with derived projections explicitly subordinate.

## B — Boundaries / Build / Blast radius

- **PROVEN context:** actual `ocr` blast radius is hundreds of changed paths across product and infrastructure, not a narrowly bounded scanner patch.
- **PROOF_GAP:** verification evidence reviewed is not proportional to this blast radius (R-01).
- **Excluded:** root run scripts correctly target existing `apps/app-*` paths; no path mismatch exists.

## C — Contracts / Canonicality / Cleanup

- **PROVEN:** Redocly ignores include material `no-unresolved-refs` suppressions and nonexistent module residue.
- **PROVEN:** DSH README defines a sovereign modular source and generated bundle; generated artifacts must remain derived only.
- **Required:** remove stale contract lanes/ignore entries after canonical cutover; verify generated-client provenance and backend/frontend bindings.

## D — Data / Drift / Dead or duplicate state

- **PROOF_GAP:** no Level-4 proof currently demonstrates zero stale consumers/projections after the broad branch changes.
- **STRONGLY_INDICATED:** WLT→DSH partner payout projection requires explicit durable reconciliation proof.
- **Required:** migration/backfill/reconciliation evidence plus negative-space query checks for duplicates/orphans and old writer reachability.

## E — Evidence / Errors / Exact candidate

- **PROVEN:** previous workflow display/status naming could not be trusted as candidate provenance by itself; a run whose title referenced an `ocr` SHA actually executed on `master` SHA `416336db...` and was cancelled. Those runtime failures were correctly excluded from this audit.
- **PROOF_GAP:** current exact-head final evidence set is incomplete/absent for Level-4.
- **Rule:** evidence must bind candidate SHA, source ref, execution identity and scope.

## F — Fallbacks / Fragmentation / Failure recovery

- **PROVEN concrete state:** payout projection API has an explicit failure where WLT changed and DSH did not converge.
- **PROOF_GAP:** durable recovery is not proven; caller retry must not be the only repair mechanism.
- **Required:** no fallback may become a second truth or hide failed cutover.

## G — Governance / Generated artifacts

- **PROVEN:** orchestrator revision 23 is the canonical closure authority; `.agents/**` adapters cannot close work.
- **PROOF_GAP:** generated OpenAPI/client artifacts must be regenerated and compared after contract cleanup.
- **P3 residue:** stale ignore metadata should be deleted when no longer materially justified.

## H — Handoffs / Hardcoded UX

- **PROVEN:** hardcoded English strings exist inside shared control-panel UI despite centralized locales.
- **PROOF_GAP:** cross-service and cross-role handoffs affected by branch changes lack complete exact-candidate live proof.

## I — Identity / Infrastructure / i18n

- **PROVEN context:** `core/identity`, `core/workforce`, `core/providers`, and `core/platform-control` are distinct material domains.
- **PROVEN i18n defect:** shared UI localization authority is bypassed by literal English strings (R-05).
- **PROOF_GAP:** cross-domain authorization/operator-context isolation needs exact-candidate baseline because many DSH auth/context paths changed.

## J — Journeys

- **PROOF_GAP:** Level-4 end-to-end evidence is missing for all materially impacted journeys, especially checkout/payment, dispatch/handoff, partner readiness, field workflows, support and administration.
- **Required:** journey proof must include state transitions, actors, permissions, negative paths, retry/recovery and durable data effects.

## K — Keys / Secrets / Sensitive data

- **Not proven defective:** `.trivyignore` has no active vulnerability suppressions.
- **Not proven defective:** `.gitleaksignore` uses exact fingerprints, not broad ignore rules.
- **PROOF_GAP:** latest local-provisioning security fix requires fresh exact-head CodeQL/security evidence.

## L — Legacy / Localization

- **PROVEN:** stale configuration references exist for removed/nonexistent files/modules.
- **PROVEN:** localization parallel writer exists in shared UI literals vs centralized locale source.
- **Required:** legacy artifacts remain only if historically necessary and unreachable as active authority.

## M — Migrations / Monorepo materiality

- **PROVEN architecture:** DSH DB docs designate manifest-driven migrations as only executable schema authority and explicitly forbid parallel schema engines.
- **PROOF_GAP:** broad branch changes require re-validation of migration manifest coverage, checksums, backfills, old-ledger reconciliation and WLT/DSH schema compatibility on exact candidate.

## N — Negative space / Null / Empty / Offline

- **PROOF_GAP:** exact-candidate proof has not established all affected surfaces' empty/error/offline/permission-denied/retry states.
- **Required:** negative-space re-audit must search for old routes, stale consumers, duplicate writers, orphan data, dead feature flags and unreachable cleanup residue.

## O — Ownership / OpenAPI / Observability

- **PROVEN:** DSH/WLT ownership boundary is explicitly documented and payout path forwards financial writes to WLT.
- **PROVEN OpenAPI debt:** R-02.
- **PROOF_GAP observability:** failure/replay/reconciliation visibility across modified outboxes/sagas is not demonstrated at Level-4 breadth.

## P — Permissions / Privacy / Performance

- **PROOF_GAP:** authorization and operator-context changes across many backend files require cross-role allow/deny proof.
- **PROOF_GAP:** privacy-sensitive changed paths such as client-address privacy and local provisioning require fresh security evidence.
- **PROOF_GAP:** performance/load/queue/backpressure effects of changed catalog/dispatch/outbox flows are not proven.

## Q — Quality / Query semantics

- **PROVEN:** shared UI owner has intentional type-system escapes.
- **PROOF_GAP:** DB query invariants, transaction boundaries, lock/race behavior and query-plan regressions need exact-candidate evidence for changed high-contention flows.

## R — Runtime / Reliability / Recovery / RTL

- **PROOF_GAP:** repository-wide runtime baseline on the exact final candidate is not established by the reviewed evidence.
- **PROOF_GAP:** crash/restart/replay/reconciliation for changed sagas/outboxes.
- **PROVEN localized issue:** mixed localization exists; RTL logic exists in some shared components, so the defect is not “no RTL” but incomplete proof and copy-authority drift.

## S — Security / Schemas / Shadow truth / State machines

- **PROOF_GAP:** fresh exact-head CodeQL/static-analysis evidence after the last fix.
- **PROVEN contract residue:** stale Redocly entries.
- **Required:** prove no state-machine transition is independently authored in UI, service, DB and contract with divergent rules.

## T — Tests / Transitions / Types / Tool evidence

- **PROVEN:** branch has targeted tests and Sonar new-code evidence, but that cannot substitute for Level-4 system proof.
- **PROVEN type defect:** `@ts-ignore` + file-wide `no-explicit-any` suppression in shared owner.
- **Search observation, not exhaustive proof:** no obvious `test.skip` / `describe.skip` hits were found in repository code search during this audit.

## U — UX / Unused or misleading APIs

- **PROVEN:** `WebControlPanelRailProps.onToggleCollapse` is declared but ignored by the implementation.
- **PROVEN:** shared control-panel components emit untranslated literals.
- **PROOF_GAP:** rendered behavior across breakpoints, keyboard, focus, screen-reader and reduced-motion modes.

## V — Verification / Version and provenance drift

- **PROOF_GAP:** exact-head status/evidence closure missing at audit time.
- **PROVEN caution:** a status/run display string containing candidate SHA is not sufficient provenance; actual run `head_sha` must match.
- **Required:** invalidate only proof affected by each mutation, rerun failed/invalidated/newly-required obligations.

## W — Writers / Workflows

- **Required audit rule:** every material state must have one canonical writer; outboxes/projections may not become independent authorities.
- **PROOF_GAP:** all writers/readers affected by the 37-commit branch have not yet been proven migrated/cut over under one complete repository baseline.
- **Workflow note:** workflow health is evidence only; do not “fix CI” instead of product/root defects.

## X — Cross-role / Cross-surface

- **PROOF_GAP:** complete interaction matrix across Client, Partner, Captain, Field and Control Panel is not proven for the exact candidate.
- **Required:** role boundaries, denial behavior, object scope, operator context, handoff sequencing and stale-session/device cases.

## Y — YAML / Configuration truth

- **PROVEN:** `.redocly.lint-ignore.yaml` contains stale nonexistent-file entries and material lint suppressions.
- **Required:** config values/rules must have one canonical source; generated/derived YAML may not silently become authority.

## Z — Zero-residue fixed point

- **NOT REACHED / NOT PROVEN.**
- Level-4 requires:
  - no known material root;
  - no unresolved unknown in claimed scope;
  - no parallel/shadow writer;
  - no stale/unmigrated consumer;
  - no required cleanup residue;
  - exact-candidate broad baselines;
  - fresh adversarial re-audit after queue exhaustion;
  - material recovery/security/UX/A11y/RTL negative-space proof.

---

# 6. Detailed canonical-source and affected-cone matrix

| Root | Source-of-defect / proof gap | Actual source-of-fix | Canonical owner/writer | Material affected cone |
|---|---|---|---|---|
| R-01 | Candidate proof envelope smaller than actual branch cone | exact-candidate verification campaign | orchestrator `04` for closure; domain owners for fixes | all 37-commit changed roots + invalidated consumers |
| R-02 | DSH modular contract + stale lint-ignore lifecycle | sovereign DSH OpenAPI modules/manifest, then cleanup ignore | `services/dsh/contracts` | bundle, clients, backend binding, frontends, contract/runtime tests |
| R-03 | projection convergence/recovery uncertainty | durable WLT→DSH projection/reconciler if absent | WLT financial master + DSH subordinate readiness projection | payout destination, partner readiness/onboarding, retries/recovery |
| R-04 | shared UI type contract bypass | UI-kit primitive/web typings | `shared/ui-kit` | control panel shared consumers, build/typecheck/render |
| R-05 | localized copy split + ignored rail callback | shared UI component API + locale owner | `shared/ui-kit/src/locales.ts` + canonical components | control panel language/RTL/interaction consumers |
| R-06 | incomplete journey proof | exact-candidate live journey verification | each product/domain owner; closure authority remains orchestrator | five surfaces + backend/data handoffs |
| R-07 | stale security evidence after last mutation | product/dev request boundary if finding persists; rerun evidence | source code owner, not scanner | local provisioning + security evidence |
| R-08 | stale historical config residue | delete/reconcile obsolete config entries | owning config/contract layer | lint/evidence maintainability and false topology |
| R-09 | failure/replay coverage unknown | saga/outbox canonical owners | DSH/WLT domain owners | finance/order/dispatch/support handoffs |
| R-10 | incomplete UX/A11y/RTL proof | shared primitives + affected screens | UI-kit + owning surface | all materially affected rendered surfaces |

---

# 7. Material areas requiring a fresh execution campaign

The next execution invocation must not use this file as an implementation recipe without re-diagnosis. It should reconstruct and rank the live Root Graph, then close causally complete units. At minimum the following material regions must be explicitly disposed as `FIX_REQUIRED`, `N/A_PROVEN`, or closed with evidence:

1. DSH OpenAPI sovereign entry/modules/manifests/generated clients.
2. Identity/operator-context/auth and cross-role authorization changes.
3. Catalog source-of-truth, product proposals, assets, assortment, pricing and publication.
4. Cart/checkout snapshots, payment saga, WLT handoff and cancellation/return recovery.
5. Dispatch assignment, delivery exceptions, captain/store handoff and proof completion.
6. Partner onboarding/readiness and payout destination projection convergence.
7. Field workload/visits/readiness and finance-facing boundaries.
8. WLT proxy/outbox/settlement/payout/reconciliation behavior.
9. Support/incidents/notifications/operational outbox.
10. Control Panel administration/catalog/marketing/platform/maps.
11. Shared UI-kit type, localization, RTL and accessibility authority.
12. All five product surfaces' rendered/live positive and negative states.
13. Database migration/seed/manifest consistency and negative-space data audit.
14. Security/privacy/sensitive logging/network/file boundaries.
15. Recovery after process restart, duplicate message, timeout, partial failure and replay.

---

# 8. Evidence-producer ingestion and corrections

## GitHub PR / branch evidence

- PR #349 is open with head `ocr` and base `master`.
- At audit time the branch was 37 commits ahead of the observed base.
- The branch moved once during this audit from `38a29b4f...` to `4da9ab098...`; the audit was re-pinned before artifact creation.
- The move was one commit touching only `tools/dev/local-workforce-provisioning.mjs` and its test.

## Sonar

- PR comment: Quality Gate passed, 0 new issues, 0 accepted issues, 0 security hotspots, 80% coverage on new code, 0% duplication on new code.
- Disposition: useful delta evidence; **not** repository/system closure authority.

## CodeQL / GitHub Advanced Security

- Previous candidate comment: file data in outbound network request at local workforce provisioning.
- Latest audited commit targets local request payload logging and modifies the reported path.
- Disposition: do not carry old finding forward blindly; require fresh exact-head analysis and consume its disposition.

## Misbound-looking workflow/status evidence

A previously observed `BThwani / Change Verification` status pointed to run `33435242394`, whose display title mentioned an `ocr` SHA. Direct run metadata proved its actual `head_branch=master`, `head_sha=416336db...`, event `workflow_dispatch`, conclusion `cancelled`. Therefore its runtime/node failures are **not** attributed to `ocr` in this audit.

This is a required evidence-handling lesson: names/labels are not provenance; immutable run SHA/ref is.

---

# 9. Explicit false positives excluded

The following were investigated and are **not** listed as project disasters:

1. **App runtime path mismatch** — false. Root scripts reference `apps/app-client`, `app-partner`, `app-captain`, `app-field`, and those directories exist exactly.
2. **Trivy suppressing vulnerabilities** — unsupported. `.trivyignore` has comments only and no active CVE/rule exceptions.
3. **Gitleaks broadly suppressing secret paths/rules** — unsupported. Current ignore style uses exact immutable fingerprints; stale historical fingerprints are cleanup residue, not proof of a live bypass.
4. **Old master workflow runtime failures proving `ocr` is broken** — false attribution; excluded after checking actual run SHA.
5. **Presence of `legacy` in migration names proving active legacy authority** — unsupported. Historical migration naming can be legitimate. Active reachability/writer evidence is required before calling it a defect.
6. **Presence of `fallback` strings proving parallel truth** — unsupported. A fallback is a defect only when it masks a required authoritative failure/cutover or creates another writer/truth.
7. **DSH owning WLT financial truth** — not proven; current documented/code boundary keeps WLT as financial owner and DSH projection subordinate.

---

# 10. Mandatory Level-4 closure evidence still required

A final candidate may be declared fixed-point only after the live `04-VERIFY-REDIAGNOSE-CLOSE.md` obligations are satisfied. For this repository-scale scope that necessarily includes, where material:

- exact SHA/ref provenance;
- repository topology and source-of-truth map;
- targeted unit/contract/integration/database verification;
- generated artifact/client provenance;
- backend route/contract/consumer binding;
- runtime bootstrap/readiness/smoke;
- cross-service DSH/WLT/core handoffs;
- migration/backfill/reconciliation correctness;
- restart/replay/recovery/failure injection;
- authorization/object-scope/operator-context negative paths;
- security/privacy/static analysis consumed to root disposition;
- rendered web/mobile journey evidence;
- loading/error/empty/offline/retry states;
- keyboard/focus/screen-reader/touch/reduced-motion proof;
- Arabic/English and RTL/LTR proof;
- performance/backpressure/resource-risk proof for material hot paths;
- negative-space search for stale routes, consumers, writers, flags, projections and dead compatibility;
- cleanup/deletion proof;
- fresh broad adversarial re-audit **after** first Root Queue exhaustion.

Any material new root discovered by these baselines reopens the Root Graph. Green build/tests/CI alone is insufficient.

---

# 11. Prioritized next-root order for a future execution invocation

This is a diagnostic ranking, not pre-authorization to mutate:

1. **R-02 DSH contract integrity / stale unresolved-reference suppressions** — directly proven, canonical source identifiable, broad consumer leverage.
2. **R-03 projection recovery/reconciliation proof** — determine if durable reconciler exists; fix at authoritative handoff if absent.
3. **R-04/R-05 shared UI-kit owner defects** — one shared fix removes repeated type/i18n/API drift across consumers.
4. **R-09 saga/outbox recovery baselines** — high consequence due financial/operational transitions.
5. **R-06/R-10 cross-surface journey and UX/A11y/RTL proof** — expose remaining product roots after foundational owners are corrected.
6. **R-07 fresh exact-head security analysis** — consume actual latest findings and re-rank roots.
7. **R-01 final Level-4 broad baselines and adversarial re-audit** — only after all discovered executable roots are closed.

If any new evidence proves a higher causal parent, preempt/re-rank according to the orchestrator rather than following this static order mechanically.

---

# 12. Audit conclusion

The repository on audited candidate `4da9ab0988ffd1f6f85c82802f3c27de5e7aa569` **cannot be certified Level-4 closed from the evidence reviewed**.

The strongest directly proven defects are:

- stale/material OpenAPI lint exception debt, including ignore topology pointing at a nonexistent DSH contract module;
- a shared UI owner that deliberately bypasses TypeScript safety;
- a shared UI localization authority split with hardcoded English literals;
- a public UI prop whose advertised callback is ignored.

The highest-consequence unresolved proof areas are:

- exact-candidate verification breadth versus the real 37-commit/hundreds-of-path affected cone;
- deterministic recovery/reconciliation for WLT→DSH derived payout readiness state;
- crash/replay/reconciliation across heavily changed saga/outbox paths;
- fresh exact-head security evidence;
- cross-role/cross-surface live journeys and Level-4 UX/A11y/RTL/negative-space baselines.

No statement in this file converts a `PROOF_GAP` into a defect without evidence, and no scanner/tool result is treated as closure authority. The next execution must re-pin current HEAD, consume any new evidence, rebuild/re-rank the Root Graph, and close roots causally until the mandatory fresh Level-4 fixed-point audit proves zero material residue or a legitimate stop state.
