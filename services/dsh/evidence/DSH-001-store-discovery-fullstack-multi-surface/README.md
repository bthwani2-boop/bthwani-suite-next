# DSH-001 Store Discovery — Full-Stack Multi-Surface Evidence

**Slice:** DSH-001_STORE_DISCOVERY_FULLSTACK_MULTI_SURFACE_COMPLETION  
**Branch:** starting-implementing-slices  
**Date:** 2026-06-22  
**Surfaces:** app-client (re-verified) + control-panel (new)

---

## Runtime Evidence

### DSH API Health
```
GET http://localhost:58080/dsh/health
→ 200 {"service":"dsh","status":"healthy","checkedAt":"2026-06-21T21:41:15.036771648Z"}
```

### Store List
```
GET http://localhost:58080/dsh/stores?limit=10&offset=0
→ 200 {total: 6, stores: [...6 stores...]}
  Stores: store-1005 (مطعم المدينة القديمة), store-1001 (أسواق حدة المركزية), store-1006 (صيدلية معين), ...
```

### Store Detail
```
GET http://localhost:58080/dsh/stores/store-1005
→ 200 {store: {id: "store-1005", displayName: "مطعم المدينة القديمة", status: "active",
         deliveryModes: ["delivery","pickup"], hasProBadge: true, hasCouponBadge: true, ...}}
```

### Control Panel — Stores Admin
```
GET http://localhost:13000/dsh/partners/stores
→ 200 (HTML, 16443 bytes)
  NEXT_PUBLIC_DSH_API_BASE_URL=http://localhost:58080
```

---

## File Structure

```
services/dsh/frontend/
  shared/
    _kernel/dsh-api-base-url.ts         ← unified URL resolver (NEXT_PUBLIC + EXPO_PUBLIC)
    store/                               ← renamed from store-discovery
      store-discovery.types.ts
      store-discovery.view-model.ts
      store-discovery.states.ts
      store-discovery.api.ts
      store-discovery.formatters.ts
      store-admin.view-model.ts          ← NEW: admin types + pure functions
      store-admin.api.ts                 ← NEW: admin API adapter
      index.ts
  control-panel/
    partners/
      stores/                            ← NEW: control-panel section/feature path
        StoreManagementScreen.tsx
        StoreAdminKpiStrip.tsx
        StoreAdminFilters.tsx
        StoreAdminStateView.tsx
        StoreAdminTable.tsx
        StoreDetailAdminPanel.tsx
        index.ts
  app-client/
    store-discovery/                     ← existing screens (re-verified)

apps/control-panel/runtime/src/app/
  page.tsx                               → redirect /dsh/partners/stores
  dsh/
    partners/
      stores/
        page.tsx                         ← StoreManagementScreen via ControlPanelShell
```

---

## Guards Passed

- `app-shell-control-panel-contract-gate` — PASS
- `no-financial-mutation-outside-wlt` — PASS
- `control-panel-design-gate` — PASS
- `guard-slice-master-matrix-v3` — PASS

## Typechecks Passed

- `pnpm --dir services/dsh typecheck` — 0 errors
- `pnpm --dir apps/control-panel/runtime typecheck` — 0 errors

## Tests

```
pnpm --dir services/dsh test
→ 82 pass / 0 fail
  Includes: control-panel-store-admin-state, control-panel-store-admin-view-model
```
