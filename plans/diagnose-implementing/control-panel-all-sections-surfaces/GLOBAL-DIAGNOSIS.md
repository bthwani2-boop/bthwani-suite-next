# Global diagnosis — Control Panel all sections and directly related surfaces

## Baseline and reconciliation

The existing package was created against branch `abbas` and SHA `69abee4dc54601fbf5a8ad8a5c486d708ee4ae39`, so its `READY` state was stale for the requested branch `BB`. Diagnosis began at `a93586e91d1850b1db77a5514be65472056ec655`; while evidence was being read, `BB` advanced to `de34ec33ff9ee52d0228a340453272d4e03ba7b1`. That delta changed governed Identity migration-amendment evidence and the migration-manifest drift gate, both directly relevant to the Control Panel authentication/session foundation, so `de34ec33ff9ee52d0228a340453272d4e03ba7b1` became the directly relevant pinned diagnosis baseline. The branch later advanced to `0916eb2500a0f6d83c47ed44124c02665f9cd0f9`; comparison showed changes in other diagnose packages, Mobile LAN tooling and closure-test expectations with no overlap in this package or its diagnosed Control Panel runtime/product-truth paths, so that delta was classified disjoint and preserved. Immediately before publication `BB` advanced again to `f28911467127c71c99a666a81558d723a6140444`. That later delta included a broader governed migration-amendment registration for runtime migration history and another package update. Because governed Identity, Workforce and DSH migration history is directly relevant to U002, U004/U005 and U006 whenever persistence changes, the migration-governance delta was treated as related evidence and reconciled rather than ignored. The updated package is rebuilt over the `f2891146…` repository tree, preserving all concurrent work.

## Confirmed structural gaps in the previous package

1. **Wrong branch/SHA binding.** `MANIFEST.json` and `START-HERE.md` named `abbas` and an obsolete SHA. Any implementation against them could modify the wrong candidate or claim evidence from a different repository state.
2. **Truth-owner ambiguity.** The old U001 stated broadly that DSH owned operational policy/configuration. Current PRD and Product Truth separate Identity, Platform Control, Providers, Workforce, DSH and WLT. A root-cause repair must modify the sovereign owner, not whichever Control Panel module displays the symptom.
3. **Missing direct owners.** Current `/dsh/platform` code calls Platform Control and Providers, and its live-health read model checks Platform Control, Identity, Providers, WLT and DSH. `core/platform-control` and `core/providers` were not explicit execution coverage, creating a hole behind a major Control Panel section.
4. **Incomplete runtime inventory.** The application root includes `layout.tsx`, `page.tsx`, `providers.tsx` and `src/styles`; the BFF includes auth plus DSH, Workforce, Platform Control and Providers proxy paths; server/session adapters and shell navigation are cross-cutting. The old package did not explicitly cover all of these foundation elements.
5. **Insufficient hidden-route precision.** The current route tree contains analytics operational detail, catalog governance, Partner detail/stores, Platform policies, and WLT payment-session/COD/ledger inspectors. Navigation alone is not a completeness proof.
6. **Insufficient canonical Product Truth binding.** Applicable Product Truth already defines strong constraints for Identity sessions, Administration, Platform change sets/executive read model, Partner/Store publication, Maps/privacy/provider health, Captain dispatch, Support/rescue and WLT financial movement/settlements/commissions. The previous package used broad domain descriptions where these stronger contracts should govern implementation and acceptance.
7. **Verification was too generic for final closure.** Product Truth requires runtime and visual evidence for several slices; financial work requires WLT boundary, idempotency/concurrency/reconciliation and independent financial/security review; protected administration/platform flows require separation of duties and independent approvals. TypeScript or Go success alone cannot close these concerns.

## Current Control Panel topology

The runtime exposes DSH sections `administration`, `analytics`, `catalogs`, `dashboard`, `hr`, `login`, `marketing`, `operations`, `partners`, `platform`, `support` and WLT section `finance`. The root shell is a composition layer. `services/dsh/frontend/control-panel` contains section modules plus non-navigation `carts`, `finance`, `maps`, `session.ts` and `shared/`. The WLT presentation source is `services/wlt/frontend/shared/dsh`; there is no separate WLT Control Panel truth tree to invent.

The platform screen is concrete evidence of multi-owner composition: it consumes Platform Control runtime/change/rollout state, Provider registry/health, Identity permissions, and aggregate health across Platform Control, Identity, Providers, WLT and DSH. Therefore Platform Control and Providers are direct dependencies, not unrelated expansion.

The WLT finance route imports the DSH Control Panel finance presentation, while the financial implementation uses WLT-owned shared/backend/database truth and a governed DSH-facing bridge. This is a presentation/orchestration boundary only: no DSH or frontend path may become an alternative ledger, wallet, settlement, commission or reconciliation owner.

## Root-cause execution model

Implementation is divided by sovereign boundary rather than by page count. U001 establishes trustworthy runtime composition and BFF/session transport. U002 closes authentication, session lifecycle and administration with Identity as identity/permission owner and DSH only for the approved administration projection/delegation. U003 closes Platform Control and Providers and prevents fake health/read-model truth. U004 closes DSH operational intervention/support/maps/dispatch with legal state transitions and scoped readback. U005 closes Partner/Store/catalog/marketing publication and direct Client/Partner/Field consequences. U006 closes Workforce/HR readiness without duplicating Identity or WLT. U007 closes WLT financial operations with WLT as exclusive monetary owner. U008 proves the final candidate across all directly affected surfaces and failure modes.

For every state-changing path, the implementation must prove authorization from trusted server context, object/business-scope isolation, expected-version/conflict behavior, idempotency identity and payload consistency where applicable, durable persistence, audit/evidence where required, response-loss recovery by canonical readback, and directly affected surface convergence. Search, filter, pagination and bulk operations must preserve the same scope rules as detail mutations.

Any Identity, Workforce, DSH or WLT persistence edit performed during implementation must preserve governed migration history. The final closure guard must reject unregistered historical digest drift; forward migration or accepted amendment evidence is required rather than rewriting applied history.

## Exclusion rule

A repository area is excluded only when pinned-head code, contracts, Product Truth, route bindings, persistence, registry and runtime evidence show no direct dependency from a Control Panel section or its required readback. A generic desire to improve another product area is not enough. Any later evidence proving a direct dependency reopens that area and requires package reconciliation before implementation continues.

## Evidence limitation

`docs/architecture.drawio` is empty on the pinned head and cannot prove architecture. The SMSM Control Panel/journey registries are derived completeness aids only. No runtime checks were executed by this GitHub-connector diagnosis; commands in unit verification files are required future evidence, not claimed results.
