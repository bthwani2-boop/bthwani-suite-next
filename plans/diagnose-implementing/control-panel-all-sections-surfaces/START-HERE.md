# Control Panel all sections and directly related surfaces — execution entry

This package is a derived implementation plan for `bthwani2-boop/bthwani-suite-next` on branch `BB`. Its directly relevant diagnosis baseline is `de34ec33ff9ee52d0228a340453272d4e03ba7b1`: while diagnosis was in progress the branch advanced from `a93586e91d1850b1db77a5514be65472056ec655` with a governed Identity migration-history repair, which is directly relevant to Control Panel authentication/session behavior and was therefore absorbed into the baseline. The branch later advanced through `0916eb2500a0f6d83c47ed44124c02665f9cd0f9`; that delta was disjoint from this package and was preserved. Immediately before publication, `BB` advanced again to `f28911467127c71c99a666a81558d723a6140444`; comparison showed a broader governed migration-amendment update covering runtime migration history plus changes to another diagnose package. The migration-governance part is directly relevant to Identity, Workforce and DSH paths in this package, so it was reconciled and the package was rebuilt on the `f2891146…` tree. No concurrent change was overwritten or force-applied.

## Scope boundary

The primary surface is `apps/control-panel/runtime`. Every current Control Panel section is in scope: DSH `administration`, `analytics`, `catalogs`, `dashboard`, `hr`, `login`, `marketing`, `operations`, `partners`, `platform`, `support`, plus WLT `finance`. Hidden/detail routes, root bootstrap/providers/styles, shell/navigation, BFF/API/server/session code, `services/dsh/frontend/control-panel`, and directly reached sovereign owners are also in scope.

Non-Control-Panel surfaces are included only when a Control Panel action or read model has a proven direct consequence there. No unrelated mobile feature, website/webapp area, deployment activity, or product domain may be pulled in merely for completeness.

## Sovereign ownership

Identity owns actors, credentials, roles/permissions, sessions and trusted identity context. Workforce owns employment/workforce profiles and readiness. Platform Control owns governed platform configuration/change sets/rollouts. Providers owns provider registry/capability/connection policy. DSH owns operational commerce, Partner/Store, catalog consumption/publication, order/dispatch/support/service-area truth. WLT exclusively owns wallets, ledger, payment/refund/COD financial effects, commissions, payouts, settlements and reconciliation. Control Panel composes and operates these owners; it does not become a parallel truth source.

## Execution order

Execute `EXECUTION-ORDER.json` exactly. U001 closes the runtime/BFF foundation first. U002 closes Identity and Administration. U003 closes Platform Control, Providers, dashboard and analytics. U004 closes operations/support/maps/cart diagnostics. U005 closes Partner/Store/catalog/marketing publication. U006 closes Workforce/HR. U007 closes WLT finance. U008 is a same-candidate cross-surface closure gate.

Every mutation must be traced UI → shared controller/adapter → contract/generated client → sovereign backend → persistence/event/integration → canonical readback → directly affected surfaces. Fix the earliest incorrect owner or invariant; do not mask downstream symptoms.

## Mandatory package validation

Run from repository root before implementation begins and again after any package edit:

`node plans/diagnose-implementing/validate-package.mjs plans/diagnose-implementing/control-panel-all-sections-surfaces --strict`

A successful structural validator is necessary but not sufficient for product closure. Runtime, database, security/isolation, financial, visual/accessibility and independent approval evidence remain required where the applicable Product Truth requires them.
