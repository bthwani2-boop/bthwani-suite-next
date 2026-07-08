# Tabs, Buttons & Icons Audit

## Audit Ledger

| Component / Screen | Element Name | Element Type | Binding Status | Target/Action | Disabled Reason |
|---|---|---|---|---|---|
| CatalogDashboardScreen | Tab 1: BUSINESS_DOMAIN | Tab | Bound | GET /operator/domains | - |
| CatalogDashboardScreen | Tab 2: BUSINESS_SUBDOMAIN | Tab | Bound | GET /operator/nodes | - |
| CatalogDashboardScreen | Tab 3: PRODUCT_MAIN_CLASS | Tab | Bound | GET /operator/nodes | - |
| CatalogDashboardScreen | Tab 4: PRODUCT_SUB_CLASS | Tab | Bound | GET /operator/nodes | - |
| CatalogDashboardScreen | Tab 5: MASTER_PRODUCT | Tab | Bound | GET /operator/master-products | - |
| CatalogDashboardScreen | Tab 6: Proposals | Tab | Bound | GET /operator/product-proposals | - |
| CatalogDashboardScreen | Tab 7: Policies | Tab | Bound | GET /operator/platform-policies | - |
| CatalogDashboardScreen | Tab 8: Store Assortment | Tab | Bound | GET /operator/stores/{id}/assortment | - |
| CatalogDashboardScreen | Tab 9: Publishing | Tab | Disabled | None | "متاح للقراءة والتحقق فقط" |
| CategoryManagementScreen | Category forms | Form | Disabled | None | "الفئات مركزية وتدار من لوحة التحكم فقط" |
| ProductEditScreen | Save / Create Product | Button | Pivot | Proposals | "لا يمكن للمتاجر إنشاء منتجات مباشرة" |
