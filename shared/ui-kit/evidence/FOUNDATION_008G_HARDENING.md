# FOUNDATION-008G — Core Hardening

Status: VERIFIED

Evidence run: `tools/registry/runs/FOUNDATION-GATE-20260619-020609`

## Closed findings

- Typography variants now derive from `tokens/typography.ts`; control dimensions derive from sizing tokens.
- Text alignment resolves logical `start` and `end` against explicit RTL/LTR direction.
- `Text` no longer accepts arbitrary color strings; semantic tones are the public color contract.
- Button strips internal presentation props before forwarding and preserves computed disabled/loading accessibility state.
- Tamagui release-candidate typing compatibility is isolated in one internal adapter with no explicit `any`.
- Dialog, Sheet and horizontal ScrollView use the same typed compatibility boundary.
- Foundation gate is verify-only and no longer executes package installation.
- pnpm workspace disables implicit dependency installation before script execution.
- Compile contracts assert valid public usage and reject arbitrary text colors and domain-specific control props.
- Guards prevent unsafe Tamagui casts and token-value duplication from returning.

## Verification

- `pnpm run contracts:lint`: PASS
- `pnpm run guard:foundation`: PASS
- `pnpm run typecheck`: PASS
- `pnpm --dir shared/ui-kit typecheck:contracts`: PASS
- `git --no-pager diff --check`: PASS

## Remaining boundary

Visual provider integration, component harnesses, screenshots and real mobile/web screen adoption belong to subsequent stages. They are not claimed by 008G.
