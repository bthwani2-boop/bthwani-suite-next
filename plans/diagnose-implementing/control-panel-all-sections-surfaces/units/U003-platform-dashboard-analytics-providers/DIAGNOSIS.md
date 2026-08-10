# Unit diagnosis — U003 / platform-dashboard-analytics-providers

## Inclusion reason

COV-008, COV-010 and COV-016 cover Analytics, Dashboard and Platform. COV-031 and COV-032 add the previously missing Platform Control and Providers owners; COV-028 includes map-provider/operator composition; COV-037 binds the platform Product Truth; COV-042 covers operational analytics and Platform policies hidden/detail routes. The current Platform dashboard explicitly consumes Platform Control, Providers and Identity permissions and displays health for Platform Control, Identity, Providers, WLT and DSH.

## Current behavior and observable defect

The old package assigned broad policy/configuration responsibility to DSH and omitted `core/platform-control` and `core/providers`. That could lead to UI-local or DSH-local mutation of platform variables, provider configuration or rollout state even though current Product Truth names Platform Control and Providers as sovereign owners. Dashboard/Analytics are read models and can also create a second defect class: false green health, zero/fresh-looking KPIs, or locally recomputed state when an upstream is stale/unavailable/unauthorized.

## Root cause

The structural cause is treating a section label as a domain owner. `/dsh/platform` is a composition surface over several services. Analytics and dashboard likewise aggregate projections rather than owning source facts. Root-cause closure therefore requires following each control/read model to its assigned owner and making freshness, partial availability and permission restrictions visible instead of replacing them with optimistic defaults.

## Correct truth owner and target architecture

Platform Control owns governed variables, flags, change sets, effective runtime configuration, rollout lifecycle and platform audit assigned by contract. Providers owns provider registration/capabilities/connection policy and secrets remain server-side. DSH owns only DSH operational facts. Identity supplies operator permission context. WLT supplies financial health/readback only. Dashboard/Analytics consume authoritative owners and expose freshness/partial states; they never manufacture domain truth.

## Exact affected paths and symbols

`apps/control-panel/runtime/src/app/(shell)/dsh/{platform,dashboard,analytics}`, `src/app/api/{platform-control,providers}`, `services/dsh/frontend/control-panel/{platform,dashboard,analytics,maps}`, `core/platform-control`, `core/providers`, relevant DSH projection/health paths, and applicable Product Truth contracts.

## Risks, compatibility, migration, and removal impact

Platform mutations are protected and may require maker-checker, revision gates, health-gated rollout, durable audit and rollback snapshots. Provider secrets must not reach the browser. Analytics changes must preserve metric semantics and freshness metadata. Remove legacy local config/provider/health truth only after generated clients and callers migrate. Mobile surfaces are not added merely because they consume effective platform outcomes; Platform Product Truth explicitly keeps sovereign controls out of mobile surfaces.

## Evidence references

EV-011, EV-012, EV-018, EV-022, EV-024.
