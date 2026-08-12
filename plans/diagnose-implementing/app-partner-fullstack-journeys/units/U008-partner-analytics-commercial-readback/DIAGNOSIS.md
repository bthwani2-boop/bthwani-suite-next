# U008 — Partner analytics and commercial readback

## Objective

Eliminate the current selected-Store analytics ambiguity and close Partner operational/commercial read models as explicitly scoped, server-authorized, provenance/freshness-aware projections that never become operational or financial truth.

## Current diagnosis

The previously identified root cause is still present on `BB@f48d27e09e17dffaa471f394a46cd2878d3c1d86`.

`PartnerAnalyticsInsightsPanel` accepts `storeName` and optional `canonicalStoreId`. Its effect reloads when `canonicalStoreId` changes, labels the view `ملخص الأداء — {storeName}`, describes the data as Store-scoped, and prints `النطاق التشغيلي: {canonicalStoreId ...}`.

However `fetchPartnerPerformance(period)` sends only:

`GET /dsh/partner/analytics/performance?period=...`

It does not send selected Store intent. Backend `handlePartnerPerformance` independently calls `partnerStore(w,r)` to obtain a Store and passes that `storeID` to `analytics.GetPartnerPerformance`.

Therefore, for a Partner with multiple Stores, the Store shown by the Partner UI and the Store used by the backend are not bound by one explicit contract. Merely including `canonicalStoreId` in a React dependency causes refetch, but does not change the request or prove the returned metrics belong to that selected Store.

This is a contract/semantic defect, not a copy defect.

## Required root-cause decision

Choose exactly one current Product/API semantic and make every layer agree:

### Option A — selected-Store analytics

- selected Store intent becomes an explicit request field/query parameter;
- DSH re-authorizes it against the authenticated Partner before any analytics query;
- cross-Store/unauthorized intent fails closed without leaking ownership/details;
- OpenAPI/generated client/backend tests and Partner/operator consumers align.

### Option B — Partner-wide/default canonical analytics

- endpoint is explicitly Partner-wide or explicitly canonical-default-Store;
- Partner UI stops claiming metrics belong to the currently selected Store;
- `canonicalStoreId` presentation/dependency that falsely implies scope is removed;
- multi-Store aggregation/default semantics are documented and tested.

Do not solve this by changing only the label, adding a local filter, reloading more often or trusting client Store ID without server authorization.

## Read-model integrity

After scope correction, U008 must also prove:

- metric period/window and generated/freshness timestamp are truthful;
- loading/empty/partial/offline/error are distinct from numeric zero;
- missing/stale operational data does not render as current success;
- financial/commercial metrics use WLT-backed facts where financial truth is involved and preserve currency/unit/provenance;
- analytics cannot mutate operational or financial state;
- control-panel analytics compatibility changes only when the same contract/read model is actually affected.

## Closure rule

U008 requires API/contract/backend/client alignment, multi-Store authorization negatives, type/build tests, affected analytics backend tests, runtime Partner readback and cleanup of the abandoned semantic (unused parameter/route/schema/copy) after the chosen model is implemented. The mismatch remains OPEN until the backend result and displayed scope are provably the same semantic.
