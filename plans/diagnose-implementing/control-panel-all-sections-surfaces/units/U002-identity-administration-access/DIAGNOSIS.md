# Unit diagnosis — U002 / identity-administration-access

## Inclusion reason

COV-007 and COV-012 are the Administration and Login sections; COV-029, COV-036 and COV-046 bind them to Identity Product Truth and the newly strengthened governed migration history. COV-020, COV-022, COV-023 and COV-025 prove that shell, auth BFF, server cookies and shared Control Panel session code are part of the same access path. All mobile surfaces appear only for direct identity/session compatibility because Identity is shared across the product.

## Current behavior and observable defect

The previous package blurred DSH policy/configuration ownership with Identity/Platform ownership. Current Product Truth states that Identity is the only actor/session owner, while Administration has a governed projection/control plane that may delegate lifecycle operations to sovereign owners. Login includes activation/dev-session/runtime configuration plus API routes for activate, login, logout, refresh and session. A repair confined to the visible login page or Administration tables could therefore leave refresh rotation, revocation, permission enforcement, trusted context or object authorization broken.

The BB baseline also contains a fresh Identity migration-governance repair: an immutable historical migration digest required an accepted amendment path and the drift gate was strengthened. Any future Identity persistence edit in this unit must preserve that forward-only governance instead of rewriting historical state.

## Root cause

The structural risk is ownership conflation: presentation-level roles/permissions/session state can be mistaken for authoritative authorization, and DSH administration projections can be mistaken for Identity truth. This enables stale sessions, broad role bypass, client-selected context, cross-object exposure or migrations that look self-consistent on clean installs but conflict with existing databases.

## Correct truth owner and target architecture

Identity owns actor identifiers, credentials, activation, roles/permissions, access/refresh sessions, revocation and trusted identity context. DSH may own its approved Administration projection/audit/workflow facts but must delegate sovereign mutations. Workforce remains separate. Server-side authorization must combine explicit permission plus object/business/trusted scope where applicable. Refresh rotates atomically, logout/deactivation revoke, and browsers never define trusted context.

## Exact affected paths and symbols

`apps/control-panel/runtime/src/app/(shell)/dsh/{login,administration}`, auth routes under `src/app/api/auth`, `src/server/session-cookies.ts`, Control Panel session/shared/administration modules, `core/identity/{backend,clients,contracts,database}`, directly delegated DSH administration backend/database paths, and governed Identity migration manifest/amendment guard paths.

## Risks, compatibility, migration, and removal impact

This is security-sensitive and migration-sensitive. Preserve active compatible sessions only when contractually valid; never weaken revocation or permission checks to avoid operator disruption. Historical immutable migrations must not be edited without governed forward evidence. Role/permission changes can affect all surfaces, so compatibility checks are direct but unrelated mobile feature work remains excluded. Protected Administration approvals cannot be self-approved by the implementer.

## Evidence references

EV-005, EV-009, EV-013, EV-014, EV-024.
