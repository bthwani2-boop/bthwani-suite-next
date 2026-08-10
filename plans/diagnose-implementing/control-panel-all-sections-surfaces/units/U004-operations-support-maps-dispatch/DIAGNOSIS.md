# Unit diagnosis — U004 / operations-support-maps-dispatch

## Inclusion reason

COV-014 and COV-017 are Operations and Support, while COV-026 and COV-028 capture non-navigation cart diagnostics and maps. COV-032/COV-033 bind Providers and DSH owner stacks; COV-039 binds Support/Rescue, Maps/Privacy and Captain Dispatch Product Truth; COV-043 restricts cross-surface work to direct Client/Partner/Captain consequences. These flows contain the highest concentration of operator intervention, conflict, assignment, custody and recovery semantics outside finance.

## Current behavior and observable defect

Operations spans orders, dispatch, tracking, handoff/custody, exceptions, rescue and cart diagnostics. Support spans actor-owned tickets/messages, governed incidents and order rescue. Maps/service-area controls combine Providers external resolution with DSH service-area/address/privacy truth. Product Truth explicitly forbids local-only rescue state, stale overwrite, duplicate active rescue, cross-actor support leakage, direct provider calls from client, fake map/provider truth and DSH financial mutation. A screen-by-screen patch can easily make the operator UI look fixed while leaving the owner state machine or affected Captain/Client/Partner surface inconsistent.

## Root cause

The structural risk is intervention logic duplicated at presentation/adaptor level rather than enforced as DSH state machines and database invariants. Another root risk is mixed ownership in maps: Providers owns provider capability while DSH owns service area/address/privacy. Dispatch also consumes WLT financial eligibility only as a governed reference and must not mutate balance/commission locally.

## Correct truth owner and target architecture

DSH owns order/dispatch/support/rescue/custody/service-area/address/privacy operational truth. Providers owns external map-provider registration/capabilities. Identity supplies actor/operator trust. WLT is read/reference-only unless an explicit WLT-owned financial operation is invoked. All operator mutations use expected state/version, idempotency/correlation where required, append audit/evidence, and return canonical readback. Direct Client/Partner/Captain surfaces consume only their authorized projections.

## Exact affected paths and symbols

`apps/control-panel/runtime/src/app/(shell)/dsh/{operations,support}`, `services/dsh/frontend/control-panel/{operations,support,carts,maps,platform map sections}`, DSH shared order/support/map controllers, DSH backend/contracts/database order/dispatch/support/service-area/address/privacy paths, `core/providers` for provider capability, and directly linked Client/Partner/Captain readbacks.

## Risks, compatibility, migration, and removal impact

Operational mutations are concurrency-sensitive. Never fix duplicate assignment/rescue/custody by disabling UI buttons alone. Preserve idempotency identity across response loss, reject stale state and prevent cross-scope enumeration. Privacy paths must not expose address PII in audit. DSH must not create WLT effects. Remove legacy local arrays/mock/rescue/provider fallbacks only after canonical owner bindings and recovery states are proven.

## Evidence references

EV-017, EV-018, EV-019, EV-022, EV-024.
