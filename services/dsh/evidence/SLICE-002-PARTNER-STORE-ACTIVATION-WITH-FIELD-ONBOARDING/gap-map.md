# Gap Map: SLICE-002_PARTNER_STORE_ACTIVATION_WITH_FIELD_ONBOARDING

| Current File | Current Owner | Expected Owner | Donor Reference | Decision | Missing Work | Verification |
|--------------|---------------|----------------|-----------------|----------|--------------|--------------|
| `services/dsh/backend/internal/partner` | Backend (Go) | Backend (Go) | `dsh/frontend/shared/stores/partner/` | REWRITE_FROM_DONOR_RULES | None (Implemented) | `go test ./...` |
| `services/dsh/contracts/dsh.openapi.yaml` | Contracts | Contracts | `dsh.openapi.yaml` | EXTEND_CANONICAL | None (Implemented) | `pnpm run contracts:lint` |
| `services/dsh/frontend/shared/partner` | Shared Brain | Shared Brain | `dsh/frontend/shared/stores/partner/` | REFACTOR_TO_SHARED | None (Implemented) | `pnpm typecheck` |
| `services/dsh/frontend/shared/field-onboarding` | Shared Brain | Shared Brain | `dsh/frontend/app-field/partner-intake/` | REFACTOR_TO_SHARED | None (Implemented) | `pnpm typecheck` |
| `services/dsh/frontend/app-field/onboarding` | app-field UI | app-field UI | `dsh/frontend/app-field/partner-intake/` | MOVE_TO_OWNER | None (Implemented) | Compile check |
| `services/dsh/frontend/control-panel/partners` | control-panel UI | control-panel UI | `control-panel/operations/PartnerStoresScreen.tsx` | MOVE_TO_OWNER | None (Implemented) | Compile check |
| `services/dsh/frontend/app-partner/onboarding` | app-partner UI | app-partner UI | `app-partner/onboarding/` | MOVE_TO_OWNER | None (Implemented) | Compile check |
| `services/dsh/frontend/app-client/store` | app-client UI | app-client UI | `app-client/store/` | KEEP_ACTIVE | None (Implemented) | Compile check |
| `services/dsh/frontend/app-captain/store` | app-captain UI | app-captain UI | `app-captain/store/` | KEEP_ACTIVE | None (Implemented) | Compile check |
| `services/wlt/frontend/shared/dsh` | WLT Boundary | WLT Boundary | `wlt/frontend/shared/dsh/` | KEEP_ACTIVE | None (Implemented) | `pnpm run guard:wlt-dsh-frontend-shared-ownership` |
