# Unit diagnosis — U001 / control-panel-runtime-foundation

## Inclusion reason

This unit closes the composition layer shared by every Control Panel section. Coverage COV-001, COV-002, COV-019 through COV-025, and COV-041 proves that root bootstrap, providers, global styles, shell/navigation, BFF/API routes, server proxy/session code and DSH Control Panel shared/session/navigation modules are direct runtime dependencies. A page-level repair cannot be trusted if this layer selects the wrong upstream, leaks client-controlled context, restores stale sessions, hides forbidden states, or renders misleading global UI.

## Current behavior and observable defect

The current application is more than `(shell)` routes: `src/app` has root layout/page/providers, `src/styles` exists, `src/shell` owns navigation/top-bar/shell behavior, `src/app/api` contains auth and service proxies, and `src/server` owns BFF/session-cookie handling. The previous package did not make all of these explicit, so an executor could declare all sections complete while leaving the shared foundation unverified. The BFF also has specific routes for DSH, Workforce, Platform Control and Providers plus Identity auth, making upstream allowlisting and trusted-header/cookie behavior a first-order concern.

## Root cause

The structural cause was a route-section model of the Control Panel rather than a runtime-composition model. That obscured common dependencies and encouraged symptom repairs inside individual screens. The correct target has one explicit Control Panel composition boundary that transports authenticated intent to sovereign owners without creating authorization, business, platform or financial truth locally.

## Correct truth owner and target architecture

The Control Panel runtime owns composition, navigation, presentation and BFF transport only. Identity owns session/actor truth; domain services own their facts. Server-derived context and secure session cookies must be the only trust path. Service routing must be explicit and fail closed. Global providers/styles must not embed mock/fallback domain truth. The target is a deterministic foundation on which every later unit can prove owner-specific behavior.

## Exact affected paths and symbols

`apps/control-panel/runtime/src/app/{layout.tsx,page.tsx,providers.tsx}`, `apps/control-panel/runtime/src/app/(shell)/layout.tsx`, `apps/control-panel/runtime/src/styles`, `apps/control-panel/runtime/src/shell`, `apps/control-panel/runtime/src/app/api`, `apps/control-panel/runtime/src/server`, `services/dsh/frontend/control-panel/{session.ts,navigation.ts,shared}` and the package/runtime configuration consumed by them.

## Risks, compatibility, migration, and removal impact

A foundation change can invalidate every section simultaneously. Preserve cookie/session security, service allowlists, error classifications, RTL/layout behavior and generated-client boundaries. Delete duplicate routing/session/fallback code only after all callers migrate. No domain database migration belongs here unless tracing proves the defect is actually in a sovereign owner, in which case move that work to the corresponding later unit.

## Evidence references

EV-002, EV-003, EV-004, EV-007, EV-008, EV-009, EV-010, EV-022, EV-024.
