# Unit diagnosis — U006 / workforce-hr-readiness

## Inclusion reason

COV-011 is the HR section; COV-029 and COV-030 bind Identity and Workforce owners; COV-033 covers DSH operational consumption; COV-043 limits direct cross-surface work to Captain/Field consequences. The PRD explicitly separates Identity from Workforce: Identity proves who the actor is and what permissions they hold, while Workforce owns employment profile, status, supervisor, shift, affiliation and readiness. HR cannot be closed correctly by editing a DSH screen alone.

## Current behavior and observable defect

The Control Panel HR surface includes people/profiles/provisioning/readiness/assignments/shifts/scopes/documents. Captain and Field access can depend on an Identity actor plus a valid Workforce profile/readiness state and DSH operational assignment. If these layers are conflated, a session may be valid while employment is missing/suspended, or a DSH-local profile may duplicate Workforce and drift. The prior package grouped HR and WLT finance into one unit, obscuring their unrelated sovereign ownership and making a shortcut likely.

## Root cause

The structural cause is treating “actor profile” as one record. Authentication, employment/readiness, operational assignment and finance are separate facts with separate owners. A local HR model or UI-only readiness gate can hide missing Workforce persistence and allow a valid Identity session to reach an unauthorized operational surface.

## Correct truth owner and target architecture

Workforce owns employment/workforce profile, employment status/type, supervisor, shift, affiliation, evidence and readiness. Identity owns actor/session/role/permission. DSH owns operational store/area/assignment facts only where its contract assigns them, referenced by actor identity. WLT owns wallet/commission/payout truth. HR orchestrates authorized provisioning without duplicating any of those owners. Captain/Field direct surfaces gate on canonical server state rather than local profile assumptions.

## Exact affected paths and symbols

`apps/control-panel/runtime/src/app/(shell)/dsh/hr`, `src/app/api/workforce`, `services/dsh/frontend/control-panel/hr`, `core/workforce/{backend,clients,contracts,database}`, `core/identity` for actor/session linkage, DSH assignment/scope consumers, and direct Captain/Field readiness/profile adapters.

## Risks, compatibility, migration, and removal impact

Workforce changes affect access and personal data. Enforce least privilege and object scope, preserve separation between employment and authentication, and avoid copying financial fields into Workforce. Data migration must be forward-only and retain authoritative actor linkage. Remove legacy DSH/local HR profile/readiness remnants only after all direct consumers use Workforce. Do not pull unrelated Captain/Field operational features into this unit.

## Evidence references

EV-002, EV-009, EV-013, EV-015, EV-024.
