# U001 — authority-scope-inventory

## Objective
Freeze a Captain-only full-stack impact map, explicit exclusions and authoritative truth ownership before any implementation change.

## Truth owner
Current task + governance/Product Truth; DSH owns operational Captain truth, WLT owns financial truth, Identity/Workforce own authentication/profile gates.

## Diagnosis
This unit exists because the Captain path cannot be closed from a single screen. It must trace the authoritative write/read owner through shared adapters, contracts, backend state, persistence and only the downstream surfaces that are directly affected. The package deliberately distinguishes **absence of candidate-bound proof** from a proven code defect: where current source already implements a behavior, execution first verifies it against the applicable Product Truth and changes code only when the evidence reveals a mismatch. Where a concrete mismatch is already visible—most notably Captain commission readback—the task names that gap directly.

The unit must preserve trusted actor context, idempotency/correlation, legal state transitions, refresh/restart readback and strict tenant/actor isolation. UI state, local storage, derived planning files and historical evidence cannot become authoritative operational or financial truth. Any implementation that changes a canonical contract must migrate every Captain-specific consumer and rerun invalidated evidence on the same final candidate.

## Planned work
- Build the authoritative Captain impact graph: Relevant Captain behavior is distributed across runtime, DSH shared/frontend/backend/contracts/data, Workforce/Identity, WLT and cross-surface readers; the requested architecture.drawio is empty. Target: One bounded graph exists from app-captain through shared adapters/contracts/backend/persistence to only the surfaces affected by Captain state.
- Lock non-Captain exclusions: The repository contains broad DSH/WLT capabilities that share infrastructure but are not part of Captain journeys. Target: Future implementation cannot expand from Captain into unrelated product areas by proximity or shared folder membership.

## Boundaries
Affected surfaces: app-captain, control-panel, app-client, app-partner. Dependencies: none. Journeys/capabilities: Captain scope foundation, J102 captain dispatch, J105 store-captain handoff, PARTNER_FLEET_CONNECTION, SUPPORT_INCIDENTS_ORDER_RESCUE, SETTLEMENTS_COMMISSIONS. Unrelated sections remain out of scope unless a new direct dependency is proven and `COVERAGE.json` is updated before implementation.

## Closure rule
Do not mark this unit done from static inspection alone when persisted, cross-surface, security, runtime or financial behavior is involved. Execute the linked verification checks after the final relevant write and record exact resulting SHA/evidence in `RESULT.json`.
