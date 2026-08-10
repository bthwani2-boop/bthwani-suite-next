# Unit diagnosis — U005 / partners-catalogs-marketing-publication

## Inclusion reason

COV-009, COV-013 and COV-015 cover Catalogs, Marketing and Partners. COV-038 binds the Partner/Store Product Truth, COV-042 covers catalog governance and Partner nested routes, COV-045 captures the shared catalog/reels API used by Control Panel, and COV-043 limits cross-surface work to direct Client/Partner/Field consequences. These sections jointly govern whether a real Partner/Store and its catalog/discovery content can become visible to customers.

## Current behavior and observable defect

Partner onboarding and publication cross field evidence, operator review, Store ownership/readiness and Client visibility. Product Truth requires trusted server context, explicit Partner/Store business scope, version/conflict/idempotency rules and WLT-only payout destination truth. Catalog Control Panel code also reaches shared DSH catalog APIs for operator reels/media review, so catalog governance is not just a visible table. Marketing/discovery can gate visibility but must not become a second catalog or financial truth source. The previous package grouped these areas broadly without binding the strongest current owner and acceptance constraints, leaving room for optimistic publication or inconsistent list/detail/downstream state.

## Root cause

The structural failure mode is publication logic fragmented across pages and surfaces. If Partner status, Store readiness, catalog approval, marketing visibility or payout readiness is recomputed locally, one surface can report success while another still sees stale or invalid state. Another risk is treating raw payout data as DSH onboarding data even though WLT exclusively owns it.

## Correct truth owner and target architecture

DSH owns operational Partner/Store lifecycle, catalog state, serviceability/publication gates and governed discovery state. WLT owns raw payout destination and all financial truth; DSH may retain only approved references/masked compatibility values allowed by contract. Control Panel authorizes operator intent and reads canonical DSH results. App Partner, App Field and App Client are included only where Product Truth requires direct readback or evidence capture.

## Exact affected paths and symbols

`apps/control-panel/runtime/src/app/(shell)/dsh/{partners,catalogs,marketing}`, hidden Partner detail/stores and catalog governance routes, `services/dsh/frontend/control-panel/{partners,catalogs,marketing}`, `services/dsh/frontend/shared/catalog`, DSH Partner/Store/catalog/backend/contracts/database paths, and directly linked Client/Partner/Field publication/readiness adapters. Financial payout destination work is delegated to WLT and executed in U007.

## Risks, compatibility, migration, and removal impact

Partner/Store ownership, publication and catalog approvals are object-scope and concurrency sensitive. Generic onboarding must not silently reassign an owned Store. Bulk/search/filter operations must preserve authorization. Media/reel preview cannot bypass operator authorization. Remove local publication/readiness calculations only after canonical DSH readbacks are wired. Do not expand into unrelated Client, Partner or Field functionality merely because those apps share the repository.

## Evidence references

EV-010, EV-016, EV-020, EV-022, EV-024.
