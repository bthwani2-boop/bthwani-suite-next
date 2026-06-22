# DSH-001 Visual Evidence — Screenshots

All screenshots captured during runtime verification of DSH-001 Store Discovery across five surfaces.

## Screenshots

| File | Surface | Content |
|------|---------|---------|
| `control-panel-stores-admin-success.png` | control-panel | Stores admin list at `/dsh/partners/stores` — 6 stores loaded from API |
| `control-panel-store-detail-panel.png` | control-panel | Store detail panel open — read-only store info |
| `control-panel-error-or-service-unavailable.png` | control-panel | Service unavailable state when DSH API is down |
| `app-client-store-discovery-reverify.png` | app-client | Store discovery screen — stores from API, no mock data |
| `app-partner-store-context.png` | app-partner | Partner store readiness context — no catalog/orders/finance |
| `app-field-store-verification.png` | app-field | Field store verification context — no onboarding/approval |
| `app-captain-store-pickup-context.png` | app-captain | Captain store pickup context — no delivery/assignment/finance |

## Notes

- All screenshots show real API data from `http://localhost:58080`
- WLT runtime was stopped before all screenshots to ensure clean evidence boundary
- No mock/preview/demo data present
- No catalog/orders/delivery/finance present in any DSH-001 screenshot
- CI is not configured for this branch — screenshots serve as the primary visual evidence
