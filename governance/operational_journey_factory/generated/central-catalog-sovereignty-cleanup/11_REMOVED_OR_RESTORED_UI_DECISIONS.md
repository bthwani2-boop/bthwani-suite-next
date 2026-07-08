# Removed or Restored UI Decisions Ledger

This document maps all visual items audited, stating whether they were retained, rebound, disabled, or removed.

## Audited Dashboard / Control Panel UI Items

### 1. Catalog Dashboard Tabs (13 Tabs Total)
- **Status**: Restored all 13 tabs to maintain visual integrity and prevent UI regression.
- **Classification**:
  - `REBIND_TO_CENTRAL`:
    1. **الفئات الرئيسية L1** (Domains) - bound to central domains.
    2. **شجرة التصنيفات L2-L4** (Nodes) - bound to central nodes.
    3. **الكتالوج المركزي L5** (Master Products) - bound to central master products.
    4. **اقتراحات المنتجات** (Proposals) - bound to the expanded 9-stage proposal pipeline.
    5. **سياسات العمولات** (Commission/Platform Policies) - bound to central policies.
    6. **تجاوزات الفروع** (Store Assortments) - bound to store assortment overrides.
    7. **بوابة النشر** (Publishing Gate) - bound to store visibility status.
  - `DISABLE_WITH_REASON` (Disabled with clear sovereignty reason):
    8. **الحملات التسويقية** (Marketing Campaigns) - "موقف مؤقتاً لربط الفئات بالكتالوج المركزي وسياسة النشر الموحدة".
    9. **تحليلات المخزون** (Stock Analytics) - "موقف مؤقتاً لربط الفئات بالكتالوج المركزي وسياسة النشر الموحدة".
    10. **تخصيص الفئات** (Custom Category Map) - "موقف مؤقتاً لربط الفئات بالكتالوج المركزي وسياسة النشر الموحدة".
    11. **الربط الخارجي** (External Integrations) - "موقف مؤقتاً لربط الفئات بالكتالوج المركزي وسياسة النشر الموحدة".
  - `KEEP_AS_PRESENTATION_ONLY`:
    12. **إحصائيات المنتجات** - visual cards showing counts of domains, master products, and active proposals.
    13. **جدول الأرشيف** - displays archived items without mutator buttons.

---

## Audited Partner App UI Items

### 1. Category Management Screen (`CategoryManagementScreen.tsx`)
- **Status**: Retained and rebranded.
- **Classification**: `REBIND_TO_CENTRAL` (read-only view of central L1-L4 taxonomy).

### 2. Inventory Catalog Screen (`InventoryCatalogScreen.tsx`)
- **Status**: Retained and rebound.
- **Classification**: `REBIND_TO_CENTRAL` (lists products from partner master catalog and assortments).

### 3. Product Edit / Proposal Screen (`ProductEditScreen.tsx`)
- **Status**: Retained and upgraded.
- **Classification**: `REBIND_TO_CENTRAL` + Policy Enforcement.
  - Automatically loads selected node's platform policy.
  - If `allowsProductProposal === false`, disables submit action and renders warning.
  - If `requiresBarcode === true`, enforces non-empty barcode input.

### 4. Product Overrides Screen (`ProductOverridesScreen.tsx`)
- **Status**: Retained and rebound.
- **Classification**: `REBIND_TO_CENTRAL` (manages branch-local price, stock, and status).

---

## Obsolete UI Noise Deleted

- `CatalogWorkspaceDrawers.tsx` (`DELETE_LEGACY_NOISE` - dead code).
- `CategoryControlRoom.tsx` (`DELETE_LEGACY_NOISE` - replaced by master category node tree).
