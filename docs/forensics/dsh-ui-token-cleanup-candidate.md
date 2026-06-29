# DSH UI Token Cleanup Candidates

These UI files and scripts were modified in the total closure branch to resolve raw hex colors and color role bindings, but have been deferred to a later PR to minimize visual risk and keep the salvage PR focused.

| File | Change type | Guard addressed | Risk | Decision |
|---|---|---|---|---|
| `services/dsh/frontend/app-captain/DshCaptainRouteRenderer.tsx` | raw-hex-cleanup | `guard:ui-kit-token-binding` | LOW (aesthetic only) | `KEEP_LATER_PR` |
| `services/dsh/frontend/app-captain/account/DshCaptainOperationsScreen.tsx` | raw-hex-cleanup | `guard:ui-kit-token-binding` | LOW (aesthetic only) | `KEEP_LATER_PR` |
| `services/dsh/frontend/app-captain/components/BottomNavBar.tsx` | raw-hex-cleanup | `guard:ui-kit-token-binding` | LOW (aesthetic only) | `KEEP_LATER_PR` |
| `services/dsh/frontend/app-captain/components/MobileWorkspaceHeader.tsx` | raw-hex-cleanup | `guard:ui-kit-token-binding` | LOW (aesthetic only) | `KEEP_LATER_PR` |
| `services/dsh/frontend/app-captain/components/ModernPremiumHeader.tsx` | raw-hex-cleanup | `guard:ui-kit-token-binding` | LOW (aesthetic only) | `KEEP_LATER_PR` |
| `services/dsh/frontend/app-client/DshClientSurface.tsx` | raw-hex-cleanup | `guard:ui-kit-token-binding` | LOW (aesthetic only) | `KEEP_LATER_PR` |
| `services/wlt/frontend/app-client/payment/PaymentDecisionSection.tsx` | raw-hex-cleanup | `guard:ui-kit-token-binding` | LOW (aesthetic only) | `KEEP_LATER_PR` |
| `shared/ui-kit/src/components/Box/Box.tsx` | raw-hex-cleanup | `guard:ui-kit-token-binding` | LOW (aesthetic only) | `KEEP_LATER_PR` |
| `tools/scripts/fix-missing-color-roles.mjs` | formatting-only | None | None | `KEEP_LATER_PR` |
| `tools/scripts/fix-raw-hex.mjs` | formatting-only | None | None | `KEEP_LATER_PR` |
| `tools/scripts/fix-use-client.mjs` | formatting-only | None | None | `KEEP_LATER_PR` |
| `tools/scripts/run-slice-gate.ps1` | formatting-only | None | None | `KEEP_LATER_PR` |
