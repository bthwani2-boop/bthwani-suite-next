# Global diagnosis — Control Panel

## Boundary and evidence

The Control Panel is not a collection of independent pages. Pinned-head evidence shows a Next runtime split across `app`, `shell`, API/BFF routes and server-side code, while the sovereign DSH presentation lives under `services/dsh/frontend/control-panel`. The DSH service tree also contains operator modules such as carts, finance and maps that are not equivalent to top-level navigation sections. WLT does not expose a parallel `frontend/control-panel` root; its operator finance presentation is composed from `services/wlt/frontend/shared`. Therefore a route-only or navigation-only repair would be structurally incomplete and creating a new WLT Control Panel truth layer would be architectural drift.

The current route inventory contains all DSH sections: administration, analytics, catalogs, dashboard, hr, login, marketing, operations, partners, platform and support; WLT contributes finance. Every one is assessed as related. The directly affected Client, Partner, Captain and Field surfaces are included only where operator-controlled state is consumed or read back. Everything else remains outside execution scope unless new evidence proves a dependency.

## Root risks that must be closed during implementation

Authorization has to be decomposed into route authorization, object authorization and trusted business scope. UI visibility or a role check cannot substitute for server-side target authorization. Search, filters, pagination and bulk actions must preserve the same scope and must validate every target object. Session expiry, actor change, forbidden states and stale browser state must fail closed across visible and hidden routes.

Operator writes need one canonical owner. DSH owns operational Partner/Store/catalog/order/dispatch/support/serviceability facts; WLT owns monetary ledger, wallet, settlement, commission and COD facts. Control Panel, its BFF and mobile surfaces are consumers or governed writers, not new truth stores. Mutations require idempotency where retry is possible, concurrency/conflict behavior, durable audit context and canonical post-write readback. Response loss must be recoverable without unsafe duplicate effects.

The section registry adds mandatory state/control scenarios that must be applied rather than merely displayed: loading/success/empty/error/no-results/forbidden, authorization and trusted scope, search isolation, bulk safety, audit, session, conflict/idempotency, dependency degradation, response-loss recovery and RTL/accessibility. The journey registry is used to discover cross-surface consequences; it cannot override code, product contracts or canonical owners.

## Evidence limitations

`docs/architecture.drawio` is empty on the pinned head, so it cannot validate architecture. Static source inventory proves structure and relationships but not runtime authorization, transactionality, database invariants or user-visible convergence. Those remain explicit implementation verification obligations in the units.

## Target state

After implementation, every Control Panel section and hidden/detail operator flow must read and write through the correct canonical owner, enforce server-side authorization/scope, expose deterministic failure/readback behavior, leave durable audit evidence for sensitive changes, and converge with each directly affected surface. No unrelated application feature should be changed merely because it shares a repository.
