# Captain Premium Visual Surgery Evidence

This document records the visual design surgery performed on the Captain application in `bthwani-suite-next`.

## Source Remote References
- **DONOR_REMOTE**: `bthwani2-boop/bthwani-suite` (main)
- **NEW_REMOTE**: `bthwani2-boop/bthwani-suite-next` (master)
- **Latest PR**: `#5 Starting implementing slices`
- **Merge Commit**: `c026fd1957a2e8f6ba1851c60f9b9d315ea0968d`

## Visual Diagnosis (Donor vs. New App)
- **Purpose**: Dissected the donor's mobile layout intent (map layer + bottom sheet order panel + bottom nav bar). Rebuilt this as a clean, highly optimized Captain Operating Experience in the new app, matching the roles and controller contracts.
- **Hierarchy**: Spacing and readability have been greatly improved. Spacing tokens (`spacing[4]`, etc.) are used instead of hardcoded numbers.
- **Layout**: Renders a premium unified interface.
- **States**: Includes unauthenticated, standby/no active mission, offered task, to store, arrived store, picked up, arrived customer, OTP verification, delivered, offline, and GPS location disabled.
- **RTL**: Complete RTL alignment with correct text directions, right-aligned lists, and left-aligned chevrons/actions.
- **Accessibility**: High-contrast states, readable labels, and distinct color representations for statuses.
- **Performance**: High performance with direct lightweight rendering. No heavy maps or animation dependencies.

## Ownership Decisions & Donor Extraction
- **Dsh Shared (`services/dsh/frontend/shared`)**: Maintained `useCaptainDeliveryController` and `useStoreRoleContextController` as the sovereign brain.
- **UI Surface (`services/dsh/frontend/app-captain`)**: Re-built `DshCaptainSurface.tsx` to handle layout and rendering only.
- **WLT Shared (`services/wlt/frontend/shared/dsh`)**: Read-only display data only; no mutations permitted.
- **Donor patterns used**: Layout density, pickup checks, OTP validation, and order details.
- **Donor patterns rejected**: Stale local state machines, inline mock overrides, and deprecated shell components.

## Files Changed
- `C:/bthwani-suite-next/apps/app-captain/runtime/src/App.tsx`: Updated to render the unified surface.
- `C:/bthwani-suite-next/services/dsh/frontend/app-captain/DshCaptainSurface.tsx`: Refactored to represent the full 2026 Operating Experience.

## Verification
- **Typecheck**: `pnpm --dir apps/app-captain/runtime typecheck` -> **PASS**
- **Ownership Guard**: `pnpm run guard:dsh-frontend-shared-ownership` -> **PASS**
- **Docker status**: Running healthy.
