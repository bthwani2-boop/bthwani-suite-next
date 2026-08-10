# Diagnosis — U008 partner-analytics-commercial-readback

## Inclusion reason

Partner analytics and commercial summary are Partner-facing read models over operational/financial owners and therefore belong in the Partner closure boundary. The control-panel Analytics section is included only as a compatible reader of the same DSH operational facts; analytics cannot become a second order, Store or financial truth. Financial figures, if shown, must be WLT-backed projections rather than frontend/DSH calculations.

## Concrete defect — selected Store is not bound to Partner performance request

`PartnerAnalyticsInsightsPanel` receives `canonicalStoreId`, displays the selected Store name and states that the operational scope is that Store, but calls `fetchPartnerPerformance(period)` without passing the selected Store. The shared analytics API sends only `/dsh/partner/analytics/performance?period=...`. The backend `handlePartnerPerformance` independently resolves a `storeID` through `partnerStore` and passes that ID to `GetPartnerPerformance`; the selected UI Store ID is not an input to the operation. The platform model permits a Partner to manage multiple Stores, so the current request cannot be proven to describe the Store selected in the Partner UI. This is a real semantic/scoping defect, not merely a missing prop.

## Root cause and target architecture

The root cause is a mismatch between surface semantics (“selected Store performance”) and the analytics contract (“Partner performance resolved to a Store by backend helper”). The fix must be made at the contract/authorization boundary: either accept selected Store intent and authorize it server-side against the Partner before computing analytics, or explicitly define the endpoint/read model as Partner-wide aggregation and change the UI/copy accordingly. Never trust an arbitrary Store ID as authorization. Operational metrics remain DSH-derived read models with source/freshness/window semantics; financial metrics remain WLT-backed.

## Exact affected paths and symbols

`services/dsh/frontend/app-partner/account/PartnerAnalyticsInsightsPanel.tsx`, `PartnerCommercialSummaryScreen.tsx`, `services/dsh/frontend/shared/analytics/analytics.api.ts`, control-panel Analytics consumers, `services/dsh/backend/internal/http/analytics.go`, analytics domain/database queries and relevant OpenAPI contracts. Key symbols: `AnalyticsInsightsPanel`, `fetchPartnerPerformance`, `handlePartnerPerformance`, `GetPartnerPerformance`, `canonicalStoreId`, `partnerStore` and `PartnerCommercialSummaryScreen`.

## Risks and evidence

Test Partner with multiple Stores, unauthorized Store intent, one-Store compatibility, period/window boundaries, empty vs stale/partial/error data, refresh/restart and any WLT-backed financial projection. Do not turn missing data into zero or allow analytics to mutate operational/financial truth. Evidence: `EV-003`, `EV-025`, `EV-029`, `EV-030`.
