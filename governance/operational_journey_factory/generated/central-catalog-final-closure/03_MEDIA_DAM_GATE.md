# Media DAM Gate

- Database table `dsh_catalog_assets` holds asset records with statuses: `draft`, `uploaded`, `pending_review`, `approved`, `rejected`, `archived`.
- Database table `dsh_catalog_asset_links` binds assets to entities (domains, nodes, master products, proposals, etc.) with roles like `canonical_product_image`.
- Frontend uploads assets using `uploadAndLinkAsset` from [central-catalog.media.ts](file:///C:/bthwani-suite-next/services/dsh/frontend/shared/catalog/central-catalog.media.ts).
- Alt text and review decisions (Approve/Reject) mapped in [CatalogDashboardScreen.tsx](file:///C:/bthwani-suite-next/services/dsh/frontend/control-panel/catalogs/CatalogDashboardScreen.tsx).
