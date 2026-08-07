# Global diagnosis — App Field Multi-Surface Journey Diagnosis and Execution

Pinned baseline: `bthwani2-boop/bthwani-suite-next@abbas` at `f1f9664838ddac7dec5cd26cd5fe9dcfdcd84b14`.

## 1. Multi-surface diagnosis scope and method

The required surfaces are exactly `control-panel`, `app-client`, `app-partner`, `app-captain`, and `app-field`; each is assessed in every stage as a writer, reader, observer, permission boundary, downstream consumer, or evidenced non-participant.

The diagnosis starts from `app-field` but follows every inbound and outbound effect across all five product surfaces and every participating domain. It uses the repository's 107-journey registry, the twenty-four-slice contract, the final surface visions, the control-panel section registry, runtime composition, shared frontend brains, DSH and WLT contracts, backend handlers, persistence, events, integrations, tests, build tooling, and official upstream standards. No route, screen, page, tab, control, API, integration, or journey is accepted as complete merely because the field screen renders. The required proof is convergence of authoritative state and visible readback across every required surface on one SHA.

## 2. Repository architecture and truth ownership

Identity owns actors, authentication, sessions, devices, roles, and permissions. Workforce owns professional profiles, assignments, readiness, supervisors, shifts, regions, and employment status. DSH owns partner, store, catalog, assortment, field visits, readiness, escalation, fulfillment, delivery, and operational state. WLT is the only owner of ledger, balance, payment, COD, commission, debt, settlement, payout, and reconciliation facts. Shared frontend brains own controllers, adapters, view models, offline policies, and generated-client consumption. Product surfaces own composition, navigation, and visible state only. Every stage therefore includes the five surfaces and rejects handwritten parallel request/status/financial truth.

## 3. Current app-field composition and observable gaps

The runtime configures encrypted session storage, a device fingerprint, identity session, workforce profile gate, readiness gate, push registration, initial and resumed deep links, and a DSH surface. The DSH surface exposes stores, onboarding, partner progress, visits, checklists, verification, account, profile completion, history, finance, escalation, work queue, and product operations. Its offline queue carries correlation and idempotency keys for visit creation/completion, readiness checks, and escalation creation. The backend exposes materially richer business failures than the current controller presents; GPS freshness, accuracy, mocked location, geofence violation, incomplete checklist, missing evidence, open escalation, completed visit, and concurrent in-progress visit can collapse into a generic message. That is a cross-surface UX and contract-binding defect because operator and partner readers need the same reason codes and allowed next actions.

The field final vision additionally requires assignment-scoped map/list work, supervisor/shift/city visibility, drafts, evidence scanning and review, barcode lookup, product proposals, assortment and stock evidence, audits, incident handling, COD custody/handover, notification/support flows, assignment revalidation after reconnect, encrypted expiring offline records, conflict resolution without evidence loss, and proof that no local partner/catalog/finance truth exists. The present route inventory is evidence of composition, not proof that all vision capabilities are implemented or convergent.

## 4. Control-panel and other surface coverage

The live DSH control panel contains `administration`, `analytics`, `catalogs`, `dashboard`, `hr`, `login`, `marketing`, `operations`, `partners`, `platform`, and `support`; WLT contains `finance`. Each is included because field identity, assignment, partner onboarding, store readiness, catalog proposals, incidents, support, platform policy, analytics, and financial readback can originate from or terminate in those areas. The client, partner, and captain surfaces are included whenever they consume availability, partner/store/catalog state, delivery readiness, escalation outcome, COD, or financial projections affected by field actions. Absence of a direct button does not remove the obligation to verify downstream read models, permissions, stale-state handling, and non-disclosure.

## 5. Cross-surface journey model

For every related journey the enforced trace is:

`ACTOR → SURFACE ENTRY → SESSION AND TRUSTED CONTEXT → UI CONTROL → GENERATED CLIENT OPERATION → DSH FACADE → DOMAIN HANDLER → STATE MACHINE → DATABASE TRANSACTION → OUTBOX/EVENT/JOB/PROVIDER → READ MODEL → EVERY REQUIRED SURFACE → MANUAL AND AUTOMATED EVIDENCE`.

The positive path is insufficient. Denial, validation, blocked rules, repeated requests, concurrency, network loss before send, network loss after commit before response, provider outage, offline queue, reconnect, refresh, restart, reinstall, assignment revocation, policy change, and unknown-result lookup are mandatory.

## 6. UX, UI, flow, binding, API, and integration diagnosis

Every visible control requires a stable accessibility name, visibility and disabled rules from authoritative permissions/allowed actions, double-submit protection, explicit in-flight state, specific error reason, safe retry semantics, success readback, and cross-surface convergence. RTL Arabic, numeric and currency formatting, dates, large text, screen readers, keyboard/focus where applicable, touch targets, contrast, slow network, low memory, device rotation, denied permissions, background suspension, and release-build behavior are verification gates. Official Expo documentation requires development or release builds for real remote notification behavior, describes OS-controlled non-immediate background execution, and confirms persistent SQLite and encrypted key-value storage constraints. React Native accessibility, WCAG 2.2, and OWASP MASVS are supporting test baselines, not substitutes for repository truth.

## 7. Root causes and execution boundary

The material root risks are fragmented evidence across runtime, surface, shared brain, contract, backend, data, and governance; generic frontend error classification despite precise backend reasons; potential drift between final vision and live routes; non-proven generated-client authority; non-proven cross-surface readback; non-proven offline queue encryption, expiry, migration, corruption recovery, and revoked-assignment rejection; and non-proven WLT isolation for field finance/COD. All are in scope because they can produce false success, hidden operational divergence, unsafe retries, lost evidence, unauthorized action, or inconsistent state on another surface.

## 8. Residual uncertainty

Static repository evidence cannot prove physical Android/iOS permission behavior, real push credentials, provider delivery, background scheduling, device-vendor process killing, production-like latency, screen-reader output, app-store release configuration, real migration upgrade data, or operational approval. These remain explicit required checks in the final verification stage. The dossier may be marked ready for implementation, but final closure is forbidden until those checks pass on the same resulting SHA with retained evidence.
