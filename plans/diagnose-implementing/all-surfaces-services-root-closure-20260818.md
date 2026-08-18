# AUDIT_PREPARE — All Surfaces / Services Root Closure — 2026-08-18

> Temporary diagnosis/execution record only. This file is **not** Product/System Truth and must be deleted only after final proven closure under `EXECUTE_CLOSE`.

## 0. Status and immutable audit baseline

- Repository: `bthwani2-boop/bthwani-suite-next`
- Branch: `b`
- Phase: `AUDIT_PREPARE`
- Audit authority entrypoint: `tools/prompting/bthwani-orchestrator/00-ORCHESTRATOR.md`
- Orchestrator package revision inspected: `6`
- Final read-only audit HEAD before plan creation: `8cb71a76d0e379ab4540ee8f1a67ffdb62a543d1`
- Earlier baselines reconciled during this audit: `32dd0d8313ec477de8526ea9a80c542b207e2353`, `273cc39526cc8e7c6422cf1cc842ad9cc7dedd45`, `5d5374f072ebf6721b8c4a06cfb5c55a653260b5`, `8f86656f502c5db8c17b4e9cb725bc1a9635227a`.
- `AUDIT_PREPARE` rule: no target-system treatment has been executed. This plan creation is the only allowed write in this phase.
- State after this file is created: `READY_FOR_EXECUTION`, subject to mandatory latest-HEAD re-audit at `EXECUTE_CLOSE`.

## 1. Resolved canonical Product decisions

Current owner instruction resolves the formerly pending Product decisions for this task. These decisions are execution authority; stale `PENDING` metadata is not permission to re-open them automatically.

1. **Identity / Activation / Sessions**
   - Identity exclusively owns actor accounts, canonical identifiers, authentication, activation and sessions.
   - Workforce supplies professional provisioning intent through trusted service APIs; Workforce never writes Identity persistence directly.
   - Trusted operator context is server-derived.
   - No surface-local authentication truth.
   - Exact provisioning retries may not expand role/permissions or mutate the fingerprint.

2. **Platform Change Sets**
   - `core/platform-control` governs only **live platform configuration explicitly requiring governance, maker-checker, audit, revision/conflict protection and rollback**.
   - It does not own secrets, build/compiler/dev-local config, dependency versions, DB migrations, or domain-owned business data.
   - Provider credentials/configuration/health remain Provider-owned where applicable.

3. **Representative Wallets / Reference Finance**
   - WLT is sole wallet/ledger financial truth.
   - Client/Partner/Captain/Field consume finance through authenticated DSH application facade/BFF.
   - Control Panel uses trusted operator context and bounded finance permissions.
   - No direct frontend-to-WLT authority and no local balance derivation.

4. **Settlements & Commissions**
   - DSH provides immutable operational evidence.
   - WLT alone applies retained/versioned financial policy, calculates authoritative amounts, owns ledger/settlement/commission/adjustment/reversal truth, and rejects caller authority over financial amounts.

5. **Awnak + SHEIN Special Requests**
   - One shared special-request lifecycle with type-specific rules.
   - DSH owns request/information-exchange truth; WLT owns payment truth; Dispatch owns assignment/proof/exceptions.
   - Required human surfaces: Client + Control Panel + Captain.
   - **Partner and Field are explicitly outside this journey.**

6. **Support / Incidents / Order Rescue**
   - DSH owns canonical support conversation, operational incident and order-rescue truth.
   - Actor-scoped support, append-only audit, one active rescue case per order.
   - WLT is visibility/reference-only from rescue unless a separately governed finance command is invoked through its own authority.

7. **Zones / SLA / Capacity / Delivery Modes**
   - DSH provides one deterministic/versioned operational policy decision/evaluator consumed consistently by Cart, Checkout, Order, Dispatch and affected surfaces.
   - Paused/disabled/exhausted/unavailable policy fails closed.
   - No local per-surface serviceability truth.

The surviving high-level platform authority is `governance/product/platform-model.yaml`, which at audit HEAD records `operationalTruth: DSH`, `financialTruth: WLT`, and `applicationFinancialAccess: DSH_FACADE_ONLY` and records Product Manager/Product Owner readiness as approved by current owner instruction.

## 2. Scope / blast radius

This execution package covers the complete affected cone, not a fixed file list:

- Product surfaces: `app-client`, `app-partner`, `app-captain`, `app-field`, `control-panel`.
- Tooling/non-product runtime composition: `apps/mobile` and runtime wrappers only where they own mobile capability/binding.
- Core contexts: `core/identity`, `core/workforce`, `core/platform-control`, `core/providers`.
- Services: `services/dsh`, `services/wlt`.
- Shared/runtime: `shared/**`, generated clients, data-runtime, UI/runtime binding where affected.
- Contracts: OpenAPI roots/modules/overlays, generated bundles/clients, manifests/registries and binding guards.
- Data: migrations, schemas, state transitions, reconciliation, idempotency, historical records, outbox/events/jobs.
- Runtime/config/infra: service startup, readiness, Docker/runtime profiles, exact-SHA runtime evidence.
- CI/control plane: affected routing, journey gates, backend/database verification, runtime proof, security/negative evidence.
- `governance/**`: always in impact analysis, but mutation only after canonical truth/root/blast are proven and only for the exact drift caused/exposed by the root correction.

## 3. Root-cause landscape and priority

### ROOT-01 — P0 — Live Parallel COD Financial Truth — OPEN

**Canonical truth:** captain-funded COD: wallet balance validation → reserve/authorization → assignment/handoff → release or deduct → settlement/reversal. No second cash-collection/remittance liability.

**Proven contradictory runtime:**
- WLT still exposes active COD collection/remittance routes.
- WLT COD state includes `pending_collection`, `collected`, `remitted` and collector types.
- Collection and remittance perform real ledger postings (`cash_in_transit`, `platform_payable`, `provider_clearing`) and transition financial state.
- DSH exposes authenticated captain `collect/remit`, partner custody/remit, and Control Panel COD reconciliation/readback through active contracts/surfaces.
- Commission eligibility still recognizes legacy `cod_collected`, so the parallel model leaks downstream into broader finance.

**Blast radius:** WLT ledger/state/data/reconciliation, DSH handlers/contracts, Captain, Partner, Control Panel, reports/read models, settlement/commission eligibility, cancellation/refund/reversal, retries and historical records.

**Root-correct treatment:**
1. Re-pin latest HEAD and inventory every COD writer, reader, job, report, API, generated client, UI action, DB table/index/state, ledger account/reference and event.
2. Define the sole canonical captain-funded state machine and all invariants for insufficient funds, cancellation, reassignment, retry/idempotency, duplicate events, partial failure, restart/offline recovery, dispute and reversal/refund.
3. Build a historical/current liability classification and reconciliation report before mutation.
4. Use migration discipline: expand canonical representation if required → backfill/map legacy records → reconcile → switch writers → switch readers → contract/delete legacy.
5. Cut WLT writers/readers first at the financial owner; then DSH facade/contracts; then Captain/Partner/Control Panel consumers.
6. Remove every ability to create new `collect/remit` liability before deleting legacy reads.
7. Migrate/remove downstream `cod_collected` commission/settlement assumptions.
8. Delete obsolete collect/remit routes, handlers, states, UI actions, compatibility aliases and reconciliation concepts only after zero live consumer is proven.
9. Retire obsolete ledger-account semantics only if no other valid financial journey consumes them.
10. Reconcile balances and historical invariants again after cutover.
11. Prove exact-candidate financial/runtime behavior with positive and adversarial tests; zero duplicate financial effect on retry.

**Closure invariant:** one COD economic event can produce only one canonical WLT financial representation and never a second remittance liability.

---

### ROOT-02 — P1 — Workforce ↔ Identity Provisioning Half-Cutover / Contract-Runtime Contradiction — OPEN

**Proven evidence:**
- `CreateFieldAgent` is already orchestration-first: receives business identity inputs, calls Identity trusted `Provision`, obtains Identity-owned `actorId`, writes Workforce profile, and compensates newly created Identity actor on local failure.
- `CreateCaptain` and basic `CreateEmployee` instead require caller-supplied pre-existing `actorId`.
- Sovereign leadership and department-employee service paths likewise assume a pre-provisioned `actorId`, then write Workforce and issue activation; commented rollback code remains.
- A generic `ProvisioningOrchestrator` with idempotency/compensation exists, but `/workforce/provisioning-cases` routes are entirely commented out while the frontend still exports clients that call those inactive routes.
- `workforce.sovereign-leadership.openapi.yaml` requires `phoneE164` for create leadership/department employee and does not define create `actorId`, while the Go input/service currently requires `ActorID`. This is a direct active contract↔runtime contradiction.
- Shared frontend types mirror the split: Field uses `username + phoneE164`; Captain/Employee use `actorId`.

**Root:** professional provisioning has multiple competing orchestration semantics and an unfinished cutover. Identity ownership is conceptually correct, but consumer/API/runtime paths disagree about how a professional actor is provisioned and linked.

**Canonical target:**
- One Workforce-managed professional provisioning orchestration for Field/Captain/Employee/Department Employee/Sovereign Leadership.
- Workforce derives allowed Identity role/surface from `workforceKind`/journey server-side; caller cannot supply an arbitrary Identity role or use raw `actorId` as provisioning authority.
- Workforce calls Identity’s trusted exact-fingerprint provisioning API; Identity remains sole persistence/auth owner.
- One idempotency fingerprint, conflict semantics, retry/recovery and compensation strategy.
- Workforce writes only professional/employment/accreditation/assignment/governance truth after the Identity actor is canonically resolved.
- Activation issuance occurs only after professional profile/readiness prerequisites.
- Existing legitimate actor linkage is migrated through an explicit, verified linking/reconciliation path rather than silently accepted raw IDs.

**Treatment:**
1. Inventory every active Workforce creation endpoint, OpenAPI schema, frontend/control-panel form, generated client, Identity internal call and existing data linkage.
2. Select the **minimum necessary internal orchestration implementation**: reuse/refactor one existing orchestrator rather than maintaining both direct service flows and an external saga API.
3. Make contracts and runtime identical for creation inputs and returned readback.
4. Migrate Field/Captain/Employee/Leadership consumers to the one orchestration.
5. Preserve department scopes, permission-bundle references, supervisor validation, workforce codes, operational core and readiness rules.
6. Reconcile existing profiles against Identity actor role/context/fingerprint; fail closed on conflict.
7. Remove or internalize `/workforce/provisioning-cases`; remove dangling frontend functions if the external case API has no product requirement.
8. Remove commented rollback/dead saga code and duplicate creation functions only after all consumers move.
9. Audit `/workforce/employees` versus `/workforce/department-employees`; keep only a uniquely required contract/route, otherwise merge/delete the legacy duplicate after proving zero consumers.
10. Regenerate/bind Workforce OpenAPI clients and verify control-panel + captain + field activation/readiness end-to-end.

**Closure invariant:** one professional provisioning request resolves exactly one Identity actor and one compatible Workforce profile under one trusted context, with no raw-ID shortcut, duplicate saga, dangling route or contract/runtime drift.

---

### ROOT-03 — P1 — Mobile Native Capability Ownership Migration Incomplete — OPEN

The recent branch work removed former quarantine metadata/guards, but did **not** complete ownership migration:
- `services/dsh/package.json` still declares React Native/Expo/native dependencies.
- DSH mobile surface source still directly imports native implementations such as `expo-location`.
- `tools/mobile/mobile-apps.manifest.json` explicitly models native capabilities per app runtime, and `apps/app-* /runtime` already owns the app dependency sets.
- Current `fullstack-boundary-gate` intentionally recognizes `services/dsh/frontend/app-*` as mobile surface roots, so the goal is **not** to move every product screen out of DSH. The problem is dependency/capability ownership and runtime implementation coupling.

**Canonical target:**
- Product/domain/surface logic may remain in its correct DSH frontend owner.
- Native implementation capabilities are owned by the consuming `apps/app-*/runtime` composition boundary.
- DSH shared/domain code consumes typed platform/mobile capability interfaces or injected adapters, not implementation ownership that forces DSH package-wide native dependencies.
- Each app declares only native capabilities it truly consumes; no duplicated or stale dependency declarations.

**Treatment:**
1. Inventory every direct native import under DSH and classify: surface-specific legitimate capability, shared/domain leak, dead import, or adapter candidate.
2. Map each import to the current mobile capability manifest and real app consumer.
3. Move native implementation/wrapper ownership to app runtime where necessary; inject stable typed adapters into DSH surface/domain code.
4. Keep direct surface-native implementation only if the packaging/runtime ownership model proves it does not force DSH workspace dependency ownership; otherwise relocate the implementation boundary.
5. Remove DSH native dependency declarations one by one only after their last DSH-owned resolution need disappears.
6. Reconcile `shared/data-runtime` native adapters similarly: retain only capabilities with a proven cross-app runtime purpose; no hidden global native owner.
7. Verify Metro, Expo config, dev-client, typecheck, native build/export and runtime behavior for all four mobile apps.
8. Delete obsolete quarantine/deprecation compatibility code rather than restoring old accounting as a workaround.

**Closure invariant:** every native capability has one justified runtime owner and real consumers; DSH domain/shared package does not become a parallel native runtime owner.

---

### ROOT-04 — P2 — Silent ETA Approximation Fallback — OPEN

`services/dsh/backend/internal/cart/serviceability.go` currently asks the maps route-duration provider, then silently substitutes straight-line distance × `3 min/km` when the provider is absent/errors/returns no duration.

The DSH operational policy decision itself is canonical and fail-closed; this finding is specifically the ETA readback. Current Product/owner rules forbid silent fallback, and Maps Product Truth forbids runtime fallback from establishing map/service-area/privacy truth.

**Canonical target:**
- Serviceability remains governed by canonical DSH operational policy.
- Route ETA is provider-backed when available.
- Provider failure produces an explicit `ETA_UNAVAILABLE/DEGRADED` state with provenance, never a silently authoritative-looking estimate.
- A local estimator may exist only after explicit Product requirement and must be visibly typed/provenanced as an estimate, not a hidden fallback.

**Treatment:** remove silent substitution; propagate explicit degraded/unavailable state through API/view-model/all affected surfaces; verify provider failure/recovery and no change to canonical serviceability.

---

### FINDING-05 — Candidate-bound evidence not proven — OPEN GATE, NOT SOURCE ROOT

For audited candidate SHAs, GitHub connector evidence exposed no commit statuses or PR-triggered workflow runs. Current CI architecture is phase-aware and structurally coherent, but **same-SHA closure evidence is not currently proven**.

At final execution closure, exact candidate evidence must bind:
- commit SHA and built artifacts;
- contract/generated-client integrity;
- applicable Node/Go/database checks;
- migrations and reconciliation;
- runtime profile/probes with `sourceSha == candidate SHA`;
- journey and negative-path evidence;
- security checks and independent QA/Product acceptance where required.

Wrong/stale/missing SHA evidence = fail closed. Build/test success alone is not closure.

---

### FINDING-06 — Derived coverage/contract representation drift — OPEN, DEPENDENT

Examples observed during audit:
- DSH capability map can report `runtime-verified` while `closureState: FIX_REQUIRED`; this is valid separation, but some base surface lists are stale and extensions partially override them.
- Support/incident/rescue contracts include overlapping/placeholder versus detailed rescue declarations that must have one canonical operation definition in the composed bundle.
- Special Requests implementation is present and aligned with the approved actor model, while contract packaging is modular rather than a standalone `dsh.special-requests.openapi.yaml` on branch `b`; exact composed-bundle binding must be proved, not inferred from default-branch search.

**Treatment:** after source roots/cutovers, reconcile derived capability maps, contract manifests/modules/overlays, generated clients and route bindings from canonical owners. Delete duplicate/placeholder declarations only after composed contract and every consumer are proven.

---

### FINDING-07 — Governance disposition / drift — HOLD UNTIL SOURCE FIXES PROVE IT

Governance is impact-analyzed but not automatic truth.

Current dispositions:
- Deletion of stale duplicate `bthwani-platform-model.product-truth.json` is **not** to be reversed; `governance/product/platform-model.yaml` survives as the current high-level authority.
- Product decisions 1–7 above are approved by current owner instruction for this task. Reconcile stale `PENDING` Product metadata only where the exact governance field is proven to record that Product authority; do **not** self-grant QA/security/release/production approval.
- Narrow Platform Change Set wording/metadata to governed live non-secret platform configuration if an over-broad declaration still remains after execution re-audit.
- COD contracts/governance/read models must reflect only captain-funded COD after the real financial cutover, never before it.
- Do not restore deleted guards merely because they existed historically. For each guard use `invariant → owner → caller → CI → unique value`; keep/merge/replace/delete accordingly.
- Derived maps/registries are updated only after their source truth and consumers are corrected.

`UNCERTAINTY = NO GOVERNANCE WRITE` remains mandatory.

## 4. Areas re-audited and currently aligned / not promoted as roots

### Settlements & Commissions
Current inspected flow broadly matches the approved authority: DSH sends operational delivered-order evidence; WLT resolves payment/refund truth, retained policy version and computes gross/fee/net. Generic commission creation rebinds amount basis to WLT-owned payment truth. The material defect here is downstream legacy COD eligibility (`cod_collected`), so finance remediation remains anchored at ROOT-01 rather than creating a second competing root.

### Support / Incidents / Order Rescue
DSH owns rescue records/events; DB has a partial unique active-order constraint; WLT reference-only behavior is modeled. Retain semantics, consolidate contract duplication/placeholder fragments only if proven in the composed bundle.

### Zones / SLA / Capacity / Delivery Mode
A canonical operational evaluator is present and serviceability fails closed on missing/paused/exhausted policy. Preserve it. Verify that Cart/Checkout/Order/Dispatch and all affected surfaces consume the same result after execution. ETA fallback is separately ROOT-04.

### Awnak + SHEIN
One shared Special Request model exists with Awnak/SHEIN types, DSH operational lifecycle, WLT references and dispatch linkage. Preserve Client + Control Panel + Captain. Partner/Field must remain excluded unless a later explicit Product decision changes the model.

### Platform-Control vs Providers
No proven authority collision: Platform-Control Change Sets are technically centered on runtime variable/feature-flag mutation with sensitive-value restrictions; Providers owns external provider configuration/credentials/health. Preserve and simplify this seam; no global “all config” Platform-Control ownership.

### Identity operator-context bypass / direct WLT bypass / branch-b protection / apps-mobile surface
No current evidence promotes these historical suspicions to roots:
- no proven Identity operator-context bypass from the previously inspected behavior;
- `@bthwani/wlt/dsh` naming alone is not proof of direct WLT bypass;
- branch `b` being unprotected is not itself the final-integration policy violation previously suspected;
- `apps/mobile` is tooling/runtime composition, not a sixth product surface.

## 5. Corrections to the historical attached audit

The previous audit was useful evidence but is not inherited as truth.

- **Confirmed:** live COD parallel financial truth.
- **Confirmed but refined:** native/runtime ownership cleanup is incomplete; newer commits removed quarantine accounting without fully removing native ownership/coupling.
- **Corrected:** “Workforce lacks Product Truth” is not the root. Workforce has active sovereign contracts; the actual root is provisioning/contract/runtime half-cutover.
- **Superseded:** broad guard/control-plane instability is not a root by default. Recent removal of old verification sets/foundation aliases is coherent with the current `journey-profiles.json` + `run-journey-gate.ps1` model. Re-open only on a concrete dangling caller or missing invariant.
- **Confirmed as closure gate:** exact candidate evidence remains unproven for inspected SHAs.
- **Corrected:** WLT DB exists; readiness evidence is distinct from database existence.

## 6. Root execution order under EXECUTE_CLOSE

At `EXECUTE_CLOSE`, do not execute this file blindly. Re-pin latest HEAD, compare against the plan audit SHA, classify all foreign delta and re-rank.

Default priority unless new evidence proves a higher root:

1. **ROOT-01 COD financial truth cutover and historical reconciliation.**
2. Re-audit WLT finance globally after COD removal: wallet, ledger, payment intent/session, capture, refund, reversal, top-up, payout/withdrawal, settlement, commission, reconciliation, idempotency/outbox/events.
3. **ROOT-02 Workforce/Identity professional provisioning unification and contract/runtime cutover.**
4. **ROOT-03 native capability ownership migration and DSH/shared dependency cleanup.**
5. **ROOT-04 ETA fallback removal / explicit degraded semantics.**
6. Reconcile dependent contracts/generated clients/capability maps/support-special-request packaging and governance dispositions.
7. Run full multisurface/multiservice verification and adversarial re-audit; any newly exposed material root is re-ranked and executed before closure.

No lower root may be “closed” by hiding its symptom while a higher writer/authority root remains live.

## 7. Required end-to-end preservation / regression matrix

Every canonical change must prove required behavior across:

- Client: auth/session, stores/catalog/cart/checkout/orders/tracking/special requests/support/wallet readback/addresses/serviceability.
- Partner: auth, store/catalog/order/commercial/finance readback/support; **no Awnak/SHEIN role**; remove old COD remit only through canonical finance cutover.
- Captain: auth/Workforce readiness, availability/dispatch/pickup/delivery/proof, finance, canonical captain-funded COD, special-request dispatch.
- Field: auth/Workforce readiness/profile/assignments/visits/catalog/onboarding/finance; **no Awnak/SHEIN role**.
- Control Panel: Identity/Workforce administration, governed config, operations/rescue/special requests, financial readback/operator mutations, audit.
- Identity, Workforce, DSH, WLT, Platform-Control, Providers: availability, failure/recovery, trusted context, idempotency, permissions and data isolation.

Any broken required consumer means the originating root remains OPEN.

## 8. Data / migration / cutover law

For every persistence semantic change:

`discover → classify → expand if needed → backfill/migrate → reconcile → switch writers → switch readers → verify → contract/delete`.

Never:
- reinterpret historical finance silently;
- delete an old column/state/table before proving every reader migrated;
- dual-write indefinitely;
- accept a stale generated client as compatibility truth;
- use fallback to keep an incomplete migration appearing functional.

Financial migrations require before/after reconciliation and balancing proof. Identity/Workforce linkage migration requires actor/context/role/profile integrity proof.

## 9. Minimum necessary complexity / cleanup obligations

For every affected item at `line → branch → function → symbol → file → group → folder → package → service/surface/domain`, prove:

`Necessary Purpose + Correct Owner + Real Consumer + Requirement + Proven Value + Correct Placement`.

Otherwise simplify/flatten/consolidate/move/delete.

Mandatory affected-scope cleanup includes, after cutover:
- COD collect/remit handlers/routes/contracts/states/readbacks/aliases/dead reconciliation semantics;
- dangling Workforce provisioning-case frontend functions if the external API is removed;
- disabled/commented provisioning routes and commented rollback code;
- duplicate/legacy employee creation endpoints if no unique Product consumer remains;
- stale raw-actorId creation models after canonical Identity provisioning migration;
- DSH/shared native dependency declarations and adapters without a real owner/consumer;
- silent ETA approximation fallback;
- duplicate/placeholder support/rescue contract definitions;
- stale capability map entries, generated artifacts, imports/exports/references;
- affected TODO/FIXME/HACK/workaround/fallback/compatibility code with no remaining requirement.

Do not delete complexity that protects a proven invariant such as idempotency, optimistic locking, maker-checker, ledger balancing, trusted context, append-only audit, migration safety or offline/retry correctness.

## 10. Verification and closure gates

A root can become `PROVEN_CLOSED` only after all applicable proof succeeds on the same final candidate:

1. Latest-HEAD reconciliation and exact scope inventory.
2. Contract composition/lint/registry/generated-client provenance/binding.
3. Typecheck/lint/test/build for all affected Node projects and mobile runtime checks.
4. Go unit + integration/database tests for Identity/Workforce/DSH/WLT/Platform-Control/Providers as affected.
5. Migration manifest/schema/database tests and real migration from representative pre-change data.
6. COD pre/post reconciliation and ledger invariants; retry/duplicate/reversal/adversarial cases.
7. Workforce provisioning concurrency/idempotency/compensation/cross-context/role-fingerprint tests.
8. Runtime readiness and failure/recovery probes; no false-ready.
9. All five product surfaces: positive, unavailable, forbidden, conflict, stale-version, offline/recovery and cross-surface readback states.
10. Mobile device/runtime proof for affected native capabilities.
11. Security/authorization/isolation/secret/PII negative tests.
12. Exact runtime `sourceSha` equals final candidate SHA.
13. Negative-space searches proving no legacy writer/reader/route/import/contract/symbol remains.
14. Independent Product/QA/security evidence where contract requires it; execution agent must not manufacture protected approval.
15. Re-audit/re-diagnose/re-rank after every root cutover. Newly exposed material findings join this package and must close before final closure.

Build/test green, the original plan being exhausted, or one surface appearing fixed is never sufficient.

## 11. Final closure protocol

Only when every material Root/Finding/Decision/Dependency/Consumer/Migration/Cutover/Regression/Cleanup/Verification/Governance Drift/Legacy/Parallel Truth/Unjustified Complexity item is `PROVEN_CLOSED` or `N/A_PROVEN`:

1. Reconcile and record final evidence.
2. Delete this PLAN_FILE as the **last mutable bookkeeping write**.
3. Pin a new `FINAL_CANDIDATE` after plan deletion.
4. Perform final read-only `Audit + Inspect + Diagnose + Analyze + Negative Space + Adversarial Re-check` on that exact SHA.
5. If any material issue appears, state `OPEN` and resume root loop; otherwise state `CLOSED`.

## 12. Current readiness declaration

- Material Product decisions required to prepare execution: **RESOLVED**.
- Target-system mutation in AUDIT_PREPARE: **NONE**.
- Material roots prepared with canonical treatment: **YES**.
- Exact candidate production/runtime acceptance: **NOT YET PROVEN** and intentionally deferred to `EXECUTE_CLOSE` verification.
- Phase result: **READY_FOR_EXECUTION**.
