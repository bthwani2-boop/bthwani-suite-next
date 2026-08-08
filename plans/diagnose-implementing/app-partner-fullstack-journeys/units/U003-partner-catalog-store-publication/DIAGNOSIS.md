# Diagnosis — U003 partner-catalog-store-publication

## Inclusion reason

Partner inventory/catalog management is connected directly to central catalog identity, Store assortment/price/stock/media proposals, DSH Store settings and publication/serviceability gates. Client discovery is a required readback after publication. Control-panel Catalogs, the Partner-related Marketing visibility gates and Platform serviceability slices therefore enter this unit; unrelated campaigns, loyalty and subscriptions do not.

## Current behavior and observable defect

The Partner route registry exposes catalog, product edit, category, media and override screens. The Partner guard rejects default available/in-stock truth, missing selected Store scope and local catalog fallback. `MarketingDashboardScreen` contains a `VisibilityGatesSection`, and the PRD requires one central catalog with no surface-local publication truth. Static guard success still cannot prove that Partner changes persist through central catalog/DSH contracts and that Store/serviceability/marketing gates prevent premature client visibility.

## Root cause and target architecture

Canonical product/category identity belongs to the central catalog owner; DSH owns Store assortment/publication/serviceability state; Media owns governed binaries where assigned. Partner intent must flow through shared catalog contracts and Store-authorized backend handlers, persist once, and be read by Partner/operator/client without duplicated categories/products or optimistic stock/publication. Marketing may gate visibility but must not become a second Store/catalog owner.

## Exact affected paths and symbols

Affected paths include `services/dsh/frontend/app-partner/catalog`, shared catalog code, control-panel `catalogs`, Partner-related `marketing` visibility gates, `platform` serviceability, DSH central-catalog/backend/database/contracts and app-client discovery readback. Key symbols include `PartnerCatalogManagementScreen`, `ProductEditScreen`, `ProductMediaScreen`, `ProductOverridesScreen`, `VisibilityGatesSection`, and `resolveDshStoreClientVisibility`.

## Risks and evidence

Do not reintroduce local categories/products, default new assortment to available/in-stock, publish an unready Store, or expand into unrelated marketing programs. Media upload failure, retry/idempotency, stale OCC, cross-Store product overrides and client readback must be tested. Evidence: `EV-003`, `EV-013`, `EV-015`, `EV-026`.
