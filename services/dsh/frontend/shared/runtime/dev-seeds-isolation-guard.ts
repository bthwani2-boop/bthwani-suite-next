// DEV_SEEDS_ISOLATION_GUARD
// Purpose: Track archived seed usage in runtime surfaces and prevent it
//          from becoming runtime truth.
//
// TRACKING: RETIRE_DEV_SEEDS_AFTER_RUNTIME_MEDIA_CLOSURE
//
// Classification:
//   DEV_ALLOWED          — seed use is intentional (snapshot/simulation/category tiles/storybook)
//   RUNTIME_VIOLATION_FIXED — was seed, now uses runtime API
//   RUNTIME_VIOLATION_PENDING — uses seed in a runtime path; needs migration to API
//   BLOCKED_WITH_REASON  — import blocked; reason documented
//
// Enforcement: The productionGuard() function below throws in non-dev environments
// when called with a seed-sourced value. Call it at seed resolution sites.


export type SeedEvidenceEntry = {
  readonly file: string;
  readonly classification: 'DEV_ALLOWED' | 'RUNTIME_VIOLATION_FIXED' | 'RUNTIME_VIOLATION_PENDING' | 'BLOCKED_WITH_REASON';
  readonly reason: string;
};

export const DSH_SEED_EVIDENCE: readonly SeedEvidenceEntry[] = [
  {
    file: 'dsh/frontend/shared/resolve-dsh-image-source.ts',
    classification: 'DEV_ALLOWED',
    reason: 'Source of truth for seed keys. Used only via resolveDshImageSource(). Not imported directly in runtime product/order/payment flows.',
  },
  {
    file: 'dsh/frontend/app-client/parts/home/HomeOrbitSections.tsx',
    classification: 'DEV_ALLOWED',
    reason: 'Category tiles use seed images (dsh.category.main/sub.*). No runtime category image API exists yet. Exit path: add GET /categories/{id}/media runtime endpoint.',
  },
  {
    file: 'dsh/frontend/app-client/shared/resolve-image-source.ts',
    classification: 'DEV_ALLOWED',
    reason: 'Re-exports resolveDshImageSource for category/banner fallback. Used only in category tile and banner fallback — not in product/order/payment flows.',
  },
  {
    file: 'dsh/frontend/app-client/shared/resolve-runtime-image-source.ts',
    classification: 'RUNTIME_VIOLATION_FIXED',
    reason: 'Active client store/cart/checkout image rendering now ignores dsh.* seed keys and only resolves runtime/public URLs or uploaded media objects.',
  },
  {
    file: 'dsh/frontend/app-partner/screens/ProductMediaScreen.tsx',
    classification: 'RUNTIME_VIOLATION_FIXED',
    reason: 'Was: manifest-key selector + POST /media (seed). Now: runtime createUploadIntent → PUT MinIO → completeUpload → listMediaAssets.',
  },
  {
    file: 'dsh/frontend/app-partner/Catalog/PartnerCatalogManagementScreen.tsx',
    classification: 'RUNTIME_VIOLATION_FIXED',
    reason: 'Was: resolveDshImageSource(item.mediaKey) for product thumbnails. Now: useEffect → listMedia({ owner_type: product, owner_id }) → public_url via dsh-media-api.client.ts. Falls back to emoji initial when no media uploaded.',
  },
  {
    file: 'dsh/frontend/app-partner/screens/PartnerHubScreen.tsx',
    classification: 'RUNTIME_VIOLATION_FIXED',
    reason: 'Was: resolveDshImageSource for StoreHero coverImage/logoImage. Now: useEffect → listMedia({ owner_type: store, owner_id }) → purpose=cover/logo public_url via dsh-media-api.client.ts. Falls back to undefined (StoreHero placeholder).',
  },
  {
    file: 'dsh/frontend/control-panel/catalogs/catalogs.data.ts',
    classification: 'DEV_ALLOWED',
    reason: 'Control-panel catalog view is snapshot/seed data only. Not a live runtime surface. Marked SNAPSHOT_ONLY.',
  },
  {
    file: 'dsh/frontend/control-panel/catalogs/catalogs.parts.tsx',
    classification: 'DEV_ALLOWED',
    reason: 'Uses resolveDshImageSource for snapshot catalog thumbnails. Not runtime product/order/payment flow.',
  },
  {
    file: 'archived-seed/media',
    classification: 'DEV_ALLOWED',
    reason: 'Pure snapshot/seed data file. Not imported by any runtime surface directly.',
  },
  {
    file: 'archived-seed/categories',
    classification: 'DEV_ALLOWED',
    reason: 'Category mediaKey fields are seed references used only for category tile rendering. Not in order/payment/product upload flows.',
  },
  {
    file: 'dsh/frontend/app-client/hooks/useDshClientMarketingState.ts',
    classification: 'RUNTIME_VIOLATION_FIXED',
    reason: 'Client marketing hook no longer reads snapshot marketing seeds. Until runtime marketing endpoints are wired, client home promos/shorts/growth render empty-state only.',
  },
  {
    file: 'dsh/frontend/app-client/screens/DshOrdersListScreen.tsx',
    classification: 'RUNTIME_VIOLATION_FIXED',
    reason: 'Orders list no longer defaults to defaultOrderListItems. Empty-state is shown until DSH API provides live order rows.',
  },
  {
    file: 'dsh/frontend/app-client/screens/parts/OrdersTrackingHelpers.tsx',
    classification: 'RUNTIME_VIOLATION_FIXED',
    reason: 'Removed fake support attachment behavior and disabled heartbeat progression in the client order journey. The view now stays runtime-safe and does not fabricate proof or live-tracking updates.',
  },
  {
    file: 'dsh/frontend/app-partner/screens/PartnerSupportScreen.tsx',
    classification: 'RUNTIME_VIOLATION_FIXED',
    reason: 'Partner support screen no longer renders local operational support cases. It now falls back to an empty runtime state until DSH API exposes live support queues.',
  },
  {
    file: 'dsh/frontend/app-client/parts/store/StoreMenuItemCard.tsx',
    classification: 'RUNTIME_VIOLATION_FIXED',
    reason: 'Product cards on the client store surface now resolve only runtime/public URLs; dsh.* seed keys fall back to the existing card placeholder.',
  },
  {
    file: 'dsh/frontend/app-client/shared/map-menu-item-to-product-card.ts',
    classification: 'RUNTIME_VIOLATION_FIXED',
    reason: 'Mapped product cards now avoid seed-key image resolution in active client commerce flows.',
  },
  {
    file: 'dsh/frontend/app-client/hooks/useStoreShellDerivedState.ts',
    classification: 'RUNTIME_VIOLATION_FIXED',
    reason: 'Client store shell cover/logo rendering now depends on runtime/public URLs only and falls back to the existing StoreHero placeholder.',
  },
  {
    file: 'dsh/frontend/app-client/hooks/useHomeDerivedStores.ts',
    classification: 'RUNTIME_VIOLATION_FIXED',
    reason: 'Client home store cards now treat dsh.* seed keys as non-runtime and render only runtime/public store media while category tiles remain on the approved path.',
  },
  {
    file: 'dsh/frontend/app-client/screens/CartScreen.tsx',
    classification: 'RUNTIME_VIOLATION_FIXED',
    reason: 'Cart recommendations and product modal now ignore seed keys and render only runtime/public product media, falling back to the existing empty visual state.',
  },
  {
    file: 'dsh/frontend/app-captain/dsh-captain.types.ts',
    classification: 'DEV_ALLOWED',
    reason: 'Re-exports operational status types from archived operational status seed. Type-only export — no runtime seed values. Exit: move type definitions to a pure types file.',
  },
  {
    file: 'dsh/frontend/app-captain/DshCaptainSurface.tsx',
    classification: 'RUNTIME_VIOLATION_FIXED',
    reason: 'FIXED 2026-06-13. Removed defaultDetailByOrderId (hardcoded order seeds), compactOrderChatSeed (hardcoded chat messages), captainDisplayName hardcoded string. activeOrderId now starts empty; activeSummary uses EMPTY_ORDER_SUMMARY; chat messages start as []; captainDisplayName is empty pending profile API.',
  },
  {
    file: 'archived-seed/dsh-finance',
    classification: 'RUNTIME_VIOLATION_FIXED',
    reason: 'DELETED 2026-06-12. All WLT finance screens now runtime-only. Adapter chain (dshFinanceFixture → wltDshFinanceFallback) removed. No runtime consumers remain.',
  },
  {
    file: 'archived-seed/finance',
    classification: 'RUNTIME_VIOLATION_FIXED',
    reason: 'DELETED 2026-06-12. WLT control-panel statement components (Captain/Partner/Field/AccountStatement/RefundLedger/SettlementCalendar/StoreSettlement) converted to runtime-only empty-state pattern.',
  },
  {
    file: 'archived-seed/wallet',
    classification: 'RUNTIME_VIOLATION_FIXED',
    reason: 'DELETED 2026-06-12. WltDshWalletControlCenter now uses buildRuntimeWalletRows(runtimeFinance) exclusively. DashFinanceRow type inlined in DailyReconciliationWorkbench.',
  },
  {
    file: 'wlt/frontend/dsh/control-panel/adapters/dshFinanceFixture.adapter.ts',
    classification: 'RUNTIME_VIOLATION_FIXED',
    reason: 'DELETED 2026-06-12. Was pass-through bridge from DSH data to WLT adapters. Entire adapter chain removed.',
  },
  {
    file: 'wlt/frontend/dsh/control-panel/adapters/wltDshFinanceFallback.adapter.ts',
    classification: 'RUNTIME_VIOLATION_FIXED',
    reason: 'DELETED 2026-06-12. All getFallback* wrappers removed. financeContracts.ts Block1+Block2 removed. App-level hooks/adapters (captain/field/partner/client) use inline zero-state + runtime API only.',
  },
];


const ALLOWED_SEED_CONTEXTS = [
  'snapshot', 'seed', 'simulation', 'storybook', 'dev', 'fallback', 'test',
  'category', 'catalog', 'control-panel',
] as const;

type DshRuntimeProcessLike = { env?: Record<string, string | undefined> };
const runtimeProcess = (globalThis as { process?: DshRuntimeProcessLike }).process;


/**
 * Guards against seed data leaking into production runtime paths.
 * Call at sites where a seed-sourced value is resolved.
 * No-ops in dev environments. Throws in production if __DEV__ is false.
 *
 * Usage:
 *   guardDevSeed('app-client/screens/HomeScreen.tsx', 'category-tile-fallback');
 */
function guardDevSeed(callerFile: string, context: string): void {
  const _devGlobal = (globalThis as Record<string, unknown>).__DEV__;
  const isDevEnv: boolean =
    _devGlobal !== undefined
      ? Boolean(_devGlobal)
      : runtimeProcess?.env?.NODE_ENV !== 'production';

  if (!isDevEnv) {
    const allowed = ALLOWED_SEED_CONTEXTS.some((ctx) => context.toLowerCase().includes(ctx));
    if (!allowed) {
      throw new Error(
        `[DEV_SEEDS_ISOLATION_GUARD] Seed data used in production runtime path.\n` +
        `  caller: ${callerFile}\n` +
        `  context: ${context}\n` +
        `  Fix: replace seed source with runtime API (dsh-media-api.client.ts).`,
      );
    }
  }
}

/**
 * Returns evidence summary for diagnostic reporting.
 */
function getSeedEvidenceSummary(): {
  devAllowed: number;
  violationsFixed: number;
  violationsPending: number;
  blocked: number;
} {
  return DSH_SEED_EVIDENCE.reduce(
    (acc, e) => {
      if (e.classification === 'DEV_ALLOWED') acc.devAllowed++;
      else if (e.classification === 'RUNTIME_VIOLATION_FIXED') acc.violationsFixed++;
      else if (e.classification === 'RUNTIME_VIOLATION_PENDING') acc.violationsPending++;
      else if (e.classification === 'BLOCKED_WITH_REASON') acc.blocked++;
      return acc;
    },
    { devAllowed: 0, violationsFixed: 0, violationsPending: 0, blocked: 0 },
  );
}
