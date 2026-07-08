/**
 * InventoryCatalogScreen — Partner Surface
 *
 * Runtime truth: GET /stores/{store_id}/products via dsh-product-api.client.ts.
 * API unavailable means no runtime inventory list is rendered.
 *
 * Partner surface owns ONLY: stock, availability, preparationNote, internalNote, price override.
 * Catalog identity (name, category, publishStage) comes from the DSH backend — partners do not define it locally.
 */
import React from 'react';
import { Pressable, Image } from 'react-native';
// DshCanonicalProductCard: view-model shape expected by this screen.
// The new shared does not export this type directly; define it locally.
type DshCanonicalProductCard = {
  id: string;
  sourceRecordId?: string;
  storeId?: string;
  publishStage?: string;
  name: string;
  categoryId?: string;
  categoryLabel: string;
  priceLabel: string;
  stockCount?: number;
  isAvailable: boolean;
  mediaKey?: string;
  canonicalStoreId?: string;
  canonicalProductId?: string;
  sku?: string;
  gtin?: string;
  barcode?: string;
  manufacturerCode?: string;
  isCatalogOwned?: boolean;
  isPrivateStoreProduct?: boolean;
  catalogLinked?: boolean;
  source?: string;
  preparationNote?: string;
  internalNote?: string;
};
import { fetchPartnerStoreAssortment, fetchPartnerMasterProducts } from '../../shared/catalog';
import { useDshEntityMedia } from '../../shared/media/useDshEntityMedia';
import { PartnerCatalogReadinessPanel } from './PartnerCatalogReadinessPanel';
// The hierarchy filter below (domain/main-category/subcategory/facet) has no
// backing taxonomy anywhere in shared/catalog or the backend product API --
// GET /stores/{store_id}/products never returns these fields (see the
// liveItems mapping below), so these types/maps are intentionally left as
// plain string aliases with empty label maps rather than fabricated values.
// The rails derive their options purely from whatever real data is present,
// so with no data they render as a no-op "الكل" (all) selector.
type DshCatalogDomainId = string;
type DshCatalogMainCategoryId = string;
type DshCatalogSubcategoryId = string;
type DshProductFacetId = string;
const DOMAIN_LABELS: Record<string, string> = {};
const MAIN_CATEGORY_LABELS: Record<string, string> = {};
const SUBCATEGORY_LABELS: Record<string, string> = {};
const FACET_LABELS: Record<string, string> = {};
const DSH_OPERATIONAL_FACETS: readonly string[] = [];
function isDshOperationalFacet(_facet: string): boolean {
  return false;
}

import {
  Badge,
  BThwaniFilterRail,
  type BThwaniFilterRailItem,
  Box,
  Button,
  colorRoles,
  Chip,
  Icon,
  KeyValueList,
  type KeyValueItem,
  MobileScrollView,
  MobileStickyPrimaryAction,
  SearchField,
  SegmentedControl,
  StateView,
  Surface,
  Text,
  TextField,
  TopBar,
  resolveRowDirection,
  useDirection,
  useTheme,
  spacing,
  radius,
} from '@bthwani/ui-kit';
import { resolveDshControlPanelSectionLabel } from '../../shared/runtime/dsh-control-panel-governance.map';
import {
  type ApprovalRecord,
  type ApprovalStage,
  getAllApprovalRecords,
  isPartnerOwnedException,
  translateOwner,
  translateStage,
  translateEntityType,
} from '../../shared/partner';


// ── Light list model — only what is needed per row ────────────────────

type InventoryCatalogListItem = {
  ['name']: string;
} & {
  id: string;
  categoryLabel: string;
  domainId?: DshCatalogDomainId;
  mainCategoryId?: DshCatalogMainCategoryId;
  subcategoryId?: DshCatalogSubcategoryId;
  facetTags?: DshProductFacetId[];
  isPrivateStoreProduct: boolean;
  isCatalogOwned: boolean;
  catalogLinked: boolean;
  mediaKey?: string;
  priceLabel: string;
  stockCount: number;
  available: boolean;
  lowStock: boolean;
  publishStage?: string;
  reviewNeeded: boolean;
};

// ── Heavy detail model — computed on demand when item is expanded ─────

type InventoryCatalogItemDetail = {
  id: string;
  sku: string;
  gtin?: string;
  barcode?: string;
  manufacturerCode?: string;
  canonicalProductId?: string;
  canonicalStoreId?: string;
  sourceRecordId?: string;
  source?: string;
  preparationNote?: string;
  internalNote?: string;
};

type PartnerLocalOverride = {
  price: string;
  stock: string;
  available: boolean;
  preparationNote: string;
  internalNote: string;
};

// ── Hierarchy filter — single unified funnel ──────────────────────────

type ViewMode = 'cards' | 'dense-list';

type ActiveHierarchyFilter = {
  domainId?: DshCatalogDomainId | undefined;
  mainCategoryId?: DshCatalogMainCategoryId | undefined;
  subcategoryId?: DshCatalogSubcategoryId | undefined;
  facetTags?: DshProductFacetId[] | undefined;
};

function resolveNextActionLabel(stage: string | undefined, available: boolean, stockCount: number): string {
  if (stage === 'rejected') return 'إصلاح سبب الرفض';
  if (stage === 'needs-fix') return 'تطبيق التعديل المطلوب';
  if (stage === 'partner-submitted' || stage === 'field-submitted') return 'بانتظار مراجعة الشركاء';
  if (stage === 'partner-review' || stage === 'partner-approved') return 'بانتظار التسويق';
  if (stage === 'marketing-review' || stage === 'marketing-approved') return 'بانتظار اعتماد الكتالوج';
  if (stage === 'catalog-adopted') return 'بانتظار التفعيل للعميل';
  if (stage === 'client-visible') {
    if (!available || stockCount === 0) return 'موقوف — راجع التوفر';
    return 'ظاهر للعميل';
  }
  if (!available || stockCount === 0) return 'تحقق من التوفر';
  return 'راجع الحالة';
}

type InventoryCardStatusTone = 'default' | 'success' | 'warning' | 'danger';

function resolveInventoryCardStatus(item: InventoryCatalogListItem): {
  label: string;
  tone: InventoryCardStatusTone;
} {
  if (item.publishStage === 'rejected') {
    return { label: 'مرفوض', tone: 'danger' };
  }

  if (!item.available || item.stockCount === 0) {
    return { label: 'موقوف', tone: 'danger' };
  }

  if (item.publishStage === 'client-visible') {
    return { label: 'ظاهر للعميل', tone: 'success' };
  }

  return { label: 'يحتاج مراجعة', tone: 'warning' };
}

function resolveInventoryCardSummary(item: InventoryCatalogListItem) {
  return [
    item.isPrivateStoreProduct ? 'منتج خاص بالمتجر' : 'منتج مركزي',
    item.catalogLinked ? 'مرتبط بالكتالوج' : 'يحتاج مطابقة',
    item.lowStock && item.stockCount > 0 ? 'مخزون منخفض' : null,
  ].filter(Boolean).join(' · ');
}

// ── Unified filter application ────────────────────────────────────────

function applyHierarchyFilter(
  items: InventoryCatalogListItem[],
  filter: ActiveHierarchyFilter,
): InventoryCatalogListItem[] {
  if (!filter.domainId && !filter.mainCategoryId && !filter.subcategoryId && !filter.facetTags?.length) {
    return items;
  }
  return items.filter((item) => {
    if (filter.domainId && item.domainId !== filter.domainId) return false;
    if (filter.mainCategoryId && item.mainCategoryId !== filter.mainCategoryId) return false;
    if (filter.subcategoryId && item.subcategoryId !== filter.subcategoryId) return false;
    if (filter.facetTags?.length) {
      for (const f of filter.facetTags) {
        if (!isDshOperationalFacet(f)) {
          if (!item.facetTags?.includes(f)) return false;
        } else {
          if (f === 'low-stock' && !item.lowStock) return false;
          if (f === 'unavailable' && item.available) return false;
          if (f === 'not-linked' && item.catalogLinked) return false;
          if (f === 'client-visible' && item.publishStage !== 'client-visible') return false;
          if (f === 'needs-review' && !item.reviewNeeded) return false;
          if (f === 'private-store' && !item.isPrivateStoreProduct) return false;
          if (f === 'canonical' && item.isPrivateStoreProduct) return false;
          if (f === 'rejected' && item.publishStage !== 'rejected') return false;
          if (f === 'pending-marketing' && item.publishStage !== 'marketing-review') return false;
          if (f === 'pending-catalog' && item.publishStage !== 'catalog-adopted') return false;
        }
      }
    }
    return true;
  });
}

// ── List data (light model) + detail lookup ───────────────────────────
// Identity (name, mediaKey, categoryLabel) sourced from central data via adapter.
// Partner-local fields (stock, price, availability) remain surface-owned.

type InventoryCatalogDetailMap = Record<string, InventoryCatalogItemDetail>;

const DETAIL_LOOKUP: InventoryCatalogDetailMap = {};

function getItemDetail(id: string): InventoryCatalogItemDetail | undefined {
  return DETAIL_LOOKUP[id];
}

function findDetailByLookupCode(barcode: string): InventoryCatalogItemDetail | undefined {
  const normalizedCode = barcode.trim().toLowerCase();
  if (!normalizedCode) {
    return undefined;
  }

  return Object.values(DETAIL_LOOKUP).find((detail) => {
    const lookupCodes = [detail.barcode, detail.gtin, detail.sku].filter(
      (value): value is string => Boolean(value),
    );
    return lookupCodes.some((value) => value.trim().toLowerCase() === normalizedCode);
  });
}

function mapApiStatusToPublishStage(approvalStatus: string): string {
  switch (approvalStatus) {
    case 'client_visible': return 'client-visible';
    case 'catalog_adopted': return 'catalog-adopted';
    case 'marketing_review': return 'marketing-review';
    case 'partner_review': return 'partner-review';
    case 'partner_submitted': return 'partner-submitted';
    case 'rejected': return 'rejected';
    case 'needs_fix': return 'needs-fix';
    default: return approvalStatus;
  }
}

// ── Search state helper ───────────────────────────────────────────────

type SearchMatchState = 'catalog-match' | 'needs-match' | 'not-in-catalog' | 'duplicate';

function matchesInventorySearch(item: InventoryCatalogListItem, query: string): boolean {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return true;
  }

  const detail = DETAIL_LOOKUP[item.id];
  const searchTokens = [
    item.name,
    item.categoryLabel,
    detail?.sku,
    detail?.gtin,
    detail?.barcode,
  ].filter((value): value is string => Boolean(value));

  return searchTokens.some((value) => value.trim().toLowerCase().includes(normalizedQuery));
}

function detectSearchMatch(
  items: InventoryCatalogListItem[],
  query: string,
): SearchMatchState {
  if (!query.trim()) return 'catalog-match';
  const results = items.filter((item) => matchesInventorySearch(item, query));

  if (results.length === 0) return 'not-in-catalog';

  let hasDupe = false;
  const nameSet = new Set<string>();
  for (const item of results) {
    const key = item.name.toLowerCase();
    if (nameSet.has(key)) { hasDupe = true; break; }
    nameSet.add(key);
  }
  if (hasDupe) return 'duplicate';

  if (results.some((item) => item.catalogLinked)) return 'catalog-match';
  return 'needs-match';
}

// ── Hierarchy rail helpers ────────────────────────────────────────────

function getAvailableDomains(items: InventoryCatalogListItem[]): DshCatalogDomainId[] {
  const seen = new Set<DshCatalogDomainId>();
  items.forEach((item) => { if (item.domainId) seen.add(item.domainId); });
  return Array.from(seen);
}

function getAvailableMainCategories(items: InventoryCatalogListItem[], domainId?: DshCatalogDomainId): DshCatalogMainCategoryId[] {
  const seen = new Set<DshCatalogMainCategoryId>();
  items.forEach((item) => {
    if (item.mainCategoryId && (!domainId || item.domainId === domainId)) seen.add(item.mainCategoryId);
  });
  return Array.from(seen);
}

function getAvailableSubcategories(
  items: InventoryCatalogListItem[],
  domainId?: DshCatalogDomainId,
  mainCategoryId?: DshCatalogMainCategoryId,
): DshCatalogSubcategoryId[] {
  const seen = new Set<DshCatalogSubcategoryId>();
  items.forEach((item) => {
    if (item.subcategoryId && (!domainId || item.domainId === domainId) && (!mainCategoryId || item.mainCategoryId === mainCategoryId)) {
      seen.add(item.subcategoryId);
    }
  });
  return Array.from(seen);
}

function getAvailableProductFacets(items: InventoryCatalogListItem[]): DshProductFacetId[] {
  const seen = new Set<DshProductFacetId>();
  items.forEach((item) => { item.facetTags?.forEach((f) => seen.add(f)); });
  return Array.from(seen);
}

// ── Store Readiness Gate ──────────────────────────────────────────────
// Store readiness (partner_readiness) is a publication gate owned by control-panel
// store governance. app-partner renders the gate status read-only and never mutates it.
function StoreReadinessGate({ storeId: _storeId }: { storeId: string }) {
  const { direction } = useDirection();

  return (
    <Surface tone="default" padding={2} gap={2} border>
      <Box style={{ flexDirection: resolveRowDirection(direction), alignItems: 'center', gap: spacing[2] }}>
        <Box style={{ flex: 1, gap: 2 }}>
          <Text role="bodyStrong" align={direction === 'rtl' ? 'end' : 'start'}>
            جاهزية المتجر للعميل
          </Text>
          <Text role="caption" tone="muted" align={direction === 'rtl' ? 'end' : 'start'}>
            تُدار جاهزية الظهور للعميل من لوحة التحكم ضمن بوابات النشر — لا يملك تطبيق الشريك تفعيلها أو إيقافها.
          </Text>
        </Box>
      </Box>
    </Surface>
  );
}

// ── Props ─────────────────────────────────────────────────────────────

type InventoryCatalogContentProps = {
  storeName: string;
  branchLabel: string;
  activeZoneLabel: string;
  todayHoursLabel: string;
  canonicalStoreId?: string;
  onNavigateToProductEdit?: (productId?: string) => void;
  onNavigateToCategoryManagement?: () => void;
  onNavigateToProductMedia?: (productId: string) => void;
  onNavigateToProductOverrides?: (productId: string) => void;
};

export type InventoryCatalogScreenProps = InventoryCatalogContentProps & {
  onBack?: () => void;
};

// ── Unified hierarchy filter rail ─────────────────────────────────────

function HierarchyFilterRail({
  filter,
  onChange,
  items,
}: {
  filter: ActiveHierarchyFilter;
  onChange: (update: Partial<ActiveHierarchyFilter>) => void;
  items: InventoryCatalogListItem[];
}) {
  const { direction } = useDirection();
  const availableDomains = getAvailableDomains(items);
  const availableMainCategories = getAvailableMainCategories(items, filter.domainId);
  const availableSubcategories = getAvailableSubcategories(items, filter.domainId, filter.mainCategoryId);
  const hierarchyScopedItems = applyHierarchyFilter(items, {
    domainId: filter.domainId,
    mainCategoryId: filter.mainCategoryId,
    subcategoryId: filter.subcategoryId,
  });
  const availableProductFacets = getAvailableProductFacets(hierarchyScopedItems);

  const hasActiveFilters = Boolean(filter.domainId || filter.mainCategoryId || filter.subcategoryId || filter.facetTags?.length);

  const activeFacetTags = filter.facetTags ?? [];
  const activeSummaryParts = [
    filter.domainId ? DOMAIN_LABELS[filter.domainId] : null,
    filter.mainCategoryId ? MAIN_CATEGORY_LABELS[filter.mainCategoryId] : null,
    filter.subcategoryId ? SUBCATEGORY_LABELS[filter.subcategoryId] : null,
    filter.facetTags?.length ? `${filter.facetTags.length} فلتر` : null,
  ].filter(Boolean);
  const showActiveSummary = activeSummaryParts.length > 1 || activeFacetTags.length > 0;
  const domainRailItems: BThwaniFilterRailItem[] = [
    { value: 'all', label: 'الكل' },
    ...availableDomains.map((domainId) => ({ value: domainId, label: DOMAIN_LABELS[domainId] ?? domainId })),
  ];
  const mainCategoryRailItems: BThwaniFilterRailItem[] = [
    { value: 'all', label: 'الكل' },
    ...availableMainCategories.map((mainCategoryId) => ({ value: mainCategoryId, label: MAIN_CATEGORY_LABELS[mainCategoryId] ?? mainCategoryId })),
  ];
  const subcategoryRailItems: BThwaniFilterRailItem[] = [
    { value: 'all', label: 'الكل' },
    ...availableSubcategories.map((subcategoryId) => ({ value: subcategoryId, label: SUBCATEGORY_LABELS[subcategoryId] ?? subcategoryId })),
  ];
  const facetRailItems: BThwaniFilterRailItem[] = [
    { value: 'all', label: 'الكل' },
    ...[...DSH_OPERATIONAL_FACETS, ...availableProductFacets].map((facetId) => ({ value: facetId, label: FACET_LABELS[facetId] ?? facetId })),
  ];

  function selectFacet(facetId: string) {
    onChange({ facetTags: facetId === 'all' ? undefined : [facetId] });
  }

  return (
    <Box gap={1}>
      <Box style={{ flexDirection: resolveRowDirection(direction), alignItems: 'center', gap: 6 }}>
        <Text role="caption" tone="muted" style={{ minWidth: 46 }}>الأقسام</Text>
        <Box style={{ flex: 1, minWidth: 0 }}>
          <BThwaniFilterRail
            items={domainRailItems}
            value={filter.domainId ?? 'all'}
            onValueChange={(value) =>
              onChange({
                domainId: value === 'all' ? undefined : value,
                mainCategoryId: undefined,
                subcategoryId: undefined,
              })
            }
          />
        </Box>
      </Box>

      {filter.domainId && availableMainCategories.length > 0 ? (
        <Box style={{ flexDirection: resolveRowDirection(direction), alignItems: 'center', gap: 6 }}>
          <Text role="caption" tone="muted" style={{ minWidth: 46 }}>الرئيسية</Text>
          <Box style={{ flex: 1, minWidth: 0 }}>
            <BThwaniFilterRail
              items={mainCategoryRailItems}
              value={filter.mainCategoryId ?? 'all'}
              onValueChange={(value) =>
                onChange({
                  mainCategoryId: value === 'all' ? undefined : value,
                  subcategoryId: undefined,
                })
              }
            />
          </Box>
        </Box>
      ) : null}

      {filter.mainCategoryId && availableSubcategories.length > 0 ? (
        <Box style={{ flexDirection: resolveRowDirection(direction), alignItems: 'center', gap: 6 }}>
          <Text role="caption" tone="muted" style={{ minWidth: 46 }}>الفرعية</Text>
          <Box style={{ flex: 1, minWidth: 0 }}>
            <BThwaniFilterRail
              items={subcategoryRailItems}
              value={filter.subcategoryId ?? 'all'}
              onValueChange={(value) =>
                onChange({
                  subcategoryId: value === 'all' ? undefined : value,
                })
              }
            />
          </Box>
        </Box>
      ) : null}

      {facetRailItems.length > 1 ? (
        <Box style={{ flexDirection: resolveRowDirection(direction), alignItems: 'center', gap: 6 }}>
          <Text role="caption" tone="muted" style={{ minWidth: 46 }}>الحالة</Text>
          <Box style={{ flex: 1, minWidth: 0 }}>
            <BThwaniFilterRail
              items={facetRailItems}
              value={activeFacetTags[0] ?? 'all'}
              onValueChange={selectFacet}
            />
          </Box>
        </Box>
      ) : null}

      {hasActiveFilters && showActiveSummary ? (
        <Box style={{ flexDirection: resolveRowDirection(direction), alignItems: 'center', gap: 6, paddingHorizontal: spacing[1] }}>
          <Text role="caption" tone="muted" numberOfLines={1} style={{ flex: 1 }}>
            {activeSummaryParts.join(' › ')}
          </Text>
          <Button
            label="مسح الكل"
            size="sm"
            tone="secondary"
            fullWidth={false}
            onPress={() => onChange({ domainId: undefined, mainCategoryId: undefined, subcategoryId: undefined, facetTags: undefined })}
          />
        </Box>
      ) : null}
    </Box>
  );
}

// ── Help block ────────────────────────────────────────────────────────

function HelpBlock() {
  const [open, setOpen] = React.useState(false);
  const { direction } = useDirection();

  return (
    <Surface tone="inset" padding={1} gap={open ? 1 : 0} border={false}>
      <Box style={{ flexDirection: resolveRowDirection(direction), alignItems: 'center', gap: spacing[2] }}>
        <Text role="caption" tone="muted" style={{ flex: 1 }} align={direction === 'rtl' ? 'end' : 'start'}>
          كيف أضيف منتجاً؟
        </Text>
        <Button
          label={open ? 'إخفاء' : 'عرض الخطوات'}
          size="sm"
          tone="secondary"
          fullWidth={false}
          onPress={() => setOpen((v) => !v)}
        />
      </Box>
      {open ? (
        <Box gap={1}>
          <Text role="caption" tone="muted" align={direction === 'rtl' ? 'end' : 'start'}>١. ابحث أولاً بـ SKU أو GTIN أو الباركود أو الاسم.</Text>
          <Text role="caption" tone="muted" align={direction === 'rtl' ? 'end' : 'start'}>٢. طابق مع المنتج القياسي في الكتالوج المركزي.</Text>
          <Text role="caption" tone="muted" align={direction === 'rtl' ? 'end' : 'start'}>٣. عدّل السعر والتوفر والمخزون محلياً فقط.</Text>
          <Text role="caption" tone="muted" align={direction === 'rtl' ? 'end' : 'start'}>٤. أرسل للمراجعة إذا المنتج غير موجود في الكتالوج.</Text>
        </Box>
      ) : null}
    </Surface>
  );
}

// ── Inline local edit ─────────────────────────────────────────────────

function InlineLocalEdit({
  item,
  detail,
  override,
  onChange,
  onApply,
}: {
  item: InventoryCatalogListItem;
  detail?: InventoryCatalogItemDetail | undefined;
  override: PartnerLocalOverride;
  onChange: (field: keyof PartnerLocalOverride, value: string | boolean) => void;
  onApply: () => void;
}) {
  const { direction } = useDirection();
  const isRejected = item.publishStage === 'rejected';
  const isNeedsFix = item.publishStage === 'needs-fix';

  return (
    <Surface tone="inset" padding={2} gap={2} border={false}>
      {/* Canonical/private badge — shown here in expanded state */}
      <Chip
        label={item.isPrivateStoreProduct ? 'منتج خاص بالمتجر' : 'منتج مركزي'}

        selected
      />

      {item.isCatalogOwned ? (
        <Surface tone="info" padding={2} gap={0} border={false}>
          <Text role="bodySm" tone="info" align={direction === 'rtl' ? 'end' : 'start'}>
            الاسم والصورة والفئة من الكتالوج المركزي — لا يمكن تعديلها.
          </Text>
        </Surface>
      ) : null}

      {isNeedsFix && detail?.internalNote ? (
        <Surface tone="warning" padding={2} gap={0} border={false}>
          <Text role="bodySm" tone="warning" align={direction === 'rtl' ? 'end' : 'start'}>
            التعديل المطلوب: {detail.internalNote}
          </Text>
        </Surface>
      ) : null}

      {isRejected ? (
        <Surface tone="danger" padding={2} gap={0} border={false}>
          <Text role="bodySm" tone="danger" align={direction === 'rtl' ? 'end' : 'start'}>
            المنتج مرفوض: {detail?.internalNote ?? 'يرجى مراجعة سبب الرفض قبل إعادة التقديم.'}
          </Text>
        </Surface>
      ) : null}

      <TextField
        label="السعر"
        value={override.price}
        onChangeText={(v: string) => onChange('price', v)}
        placeholder="18.00"      />
      <TextField
        label="المخزون"
        value={override.stock}
        onChangeText={(v: string) => onChange('stock', v)}
        placeholder="42"      />
      <TextField
        label="ملاحظة داخلية"
        value={override.internalNote}
        onChangeText={(v: string) => onChange('internalNote', v)}
        placeholder="ملاحظة للفريق الداخلي فقط"
      />
      <Box style={{ flexDirection: resolveRowDirection(direction), flexWrap: 'wrap', gap: 6 }}>
        <Button
          label={override.available ? 'التوفر: متاح' : 'التوفر: موقوف'}
          tone={override.available ? 'success' : 'danger'}
          size="sm"
          fullWidth={false}
          onPress={() => onChange('available', !override.available)}
        />

        {isRejected ? (
          <Button
            label="إصلاح سبب الرفض وإعادة التقديم"
            tone="danger"
            size="sm"
            fullWidth={false}
            onPress={onApply}
          />
        ) : (
          <Button
            label="تطبيق التعديل المحلي"
            tone="secondary"
            size="sm"
            fullWidth={false}
            onPress={onApply}
          />
        )}
      </Box>
    </Surface>
  );
}

// ── Dense list row — clean, fast, 5000+ friendly ──────────────────────

function DenseListRow({
  item,
  isEditExpanded,
  onToggleEdit,
  override,
  onOverrideChange,
  onApplyOverride,
}: {
  item: InventoryCatalogListItem;
  isEditExpanded: boolean;
  onToggleEdit: () => void;
  override: PartnerLocalOverride;
  onOverrideChange: (field: keyof PartnerLocalOverride, value: string | boolean) => void;
  onApplyOverride: () => void;
}) {
  const { direction } = useDirection();
  const theme = useTheme() as any;
  const cardStatus = resolveInventoryCardStatus(item);
  const isRejected = item.publishStage === 'rejected';
  const isNeedsFix = item.publishStage === 'needs-fix';
  const stockTone = item.lowStock ? 'warning' : item.available && item.stockCount > 0 ? 'success' : 'danger';
  const borderColor = isRejected ? theme.danger : isNeedsFix ? theme.warning : theme.line;
  const detail = isEditExpanded ? getItemDetail(item.id) : undefined;
  const denseStatusTone = cardStatus.tone === 'default' ? 'muted' : cardStatus.tone;
  const stockLabel = item.stockCount === 0
    ? 'نفد'
    : item.lowStock
      ? `منخفض · ${item.stockCount}`
      : `المخزون ${item.stockCount}`;

  return (
    <Surface
      tone="default"
      padding={1}
      gap={isEditExpanded ? 1 : 0}
      border
      style={{ borderColor, minHeight: 84 }}
    >
      <Box style={{ flexDirection: resolveRowDirection(direction), alignItems: 'stretch', gap: spacing[2] }}>
        <Box
          style={{
            flex: 1.45,
            minWidth: 0,
            justifyContent: 'center',
            alignItems: direction === 'rtl' ? 'flex-end' : 'flex-start',
            gap: 2,
          }}
        >
          <Text
            role="bodyStrong"
            numberOfLines={1}
            align={direction === 'rtl' ? 'end' : 'start'}
          >
            {item.name}
          </Text>
          <Text
            role="caption"
            tone="muted"
            numberOfLines={1}
            align={direction === 'rtl' ? 'end' : 'start'}
          >
            {item.categoryLabel}
          </Text>
        </Box>

        <Box
          style={{
            minWidth: 88,
            justifyContent: 'center',
            alignItems: 'center',
            gap: 2,
          }}
        >
          <Text role="bodySm" tone="action" numberOfLines={1}>{item.priceLabel}</Text>
          <Text role="caption" tone={stockTone} numberOfLines={1}>{stockLabel}</Text>
        </Box>

        <Box
          style={{
            minWidth: 78,
            justifyContent: 'center',
            alignItems: 'center',
            gap: spacing[1],
          }}
        >
          <Text role="caption" tone={denseStatusTone} numberOfLines={1} align="center">
            {cardStatus.label}
          </Text>
          <Button
            label="تعديل"
            size="sm"
            tone={isEditExpanded ? 'secondary' : 'primary'}
            fullWidth={false}
            onPress={onToggleEdit}
          />
        </Box>
      </Box>

      {/* Expanded: local edit with detail */}
      {isEditExpanded ? (
        <InlineLocalEdit
          item={item}
          detail={detail}
          override={override}
          onChange={onOverrideChange}
          onApply={onApplyOverride}
        />
      ) : null}
    </Surface>
  );
}

// ── Product card adapter + on-demand details ──────────────────────────

function InventoryCatalogCardPanel({
  item,
  detail,
  expanded,
  showDetails,
  showReadiness,
  onToggleEdit,
  onToggleDetails,
  onToggleReadiness,
  override,
  onOverrideChange,
  onApplyOverride,
  onSendForReview,
  onMatchCatalog,
  onEditIdentity,
  onEditMedia,
  onEditOverrides,
}: {
  item: InventoryCatalogListItem;
  detail?: InventoryCatalogItemDetail | undefined;
  expanded: boolean;
  showDetails: boolean;
  showReadiness: boolean;
  onToggleEdit: () => void;
  onToggleDetails: () => void;
  onToggleReadiness: () => void;
  override: PartnerLocalOverride;
  onOverrideChange: (field: keyof PartnerLocalOverride, value: string | boolean) => void;
  onApplyOverride: () => void;
  onSendForReview: () => void;
  onMatchCatalog: () => void;
  onEditIdentity?: (() => void) | undefined;
  onEditMedia?: (() => void) | undefined;
  onEditOverrides?: (() => void) | undefined;
}) {
  const { direction } = useDirection();

  const _mediaState = useDshEntityMedia(item.id, 'product');
  const _productMedia = _mediaState.kind === 'ready' ? _mediaState.assets : [];
  const thumbnailUrl = React.useMemo(() => {
    const asset = _productMedia.find((a) => a.status === 'uploaded' && a.purpose === 'primary')
      ?? _productMedia.find((a) => a.status === 'uploaded');
    return asset?.public_url ?? undefined;
  }, [_productMedia]);

  const isRejected = item.publishStage === 'rejected';
  const isNeedsFix = item.publishStage === 'needs-fix';
  const isPanelOpen = expanded || showDetails;
  const cardStatus = resolveInventoryCardStatus(item);
  const [partnerRecord, setPartnerRecord] = React.useState<ApprovalRecord | undefined>(undefined);
  React.useEffect(() => {
    if (!isPanelOpen) return;
    let cancelled = false;
    getAllApprovalRecords().then((records) => {
      if (cancelled) return;
      setPartnerRecord(records.find((record) => record.id === item.id || record.title.includes(item.name)));
    });
    return () => { cancelled = true; };
  }, [isPanelOpen, item.id, item.name]);

  const fixReason = partnerRecord?.metadata?.requiredFix ?? detail?.internalNote;
  const rejectReason = partnerRecord?.metadata?.rejectionReason ?? detail?.internalNote;
  const nextAction = resolveNextActionLabel(item.publishStage, item.available, item.stockCount);
  const summaryLine = resolveInventoryCardSummary(item);
  const detailItems: KeyValueItem[] = [
    ...(detail?.sku ? [{ label: 'SKU', value: detail.sku }] : []),
    ...(detail?.gtin ? [{ label: 'GTIN', value: detail.gtin }] : []),
    ...(detail?.barcode ? [{ label: 'الباركود', value: detail.barcode }] : []),
    ...(detail?.manufacturerCode ? [{ label: 'رمز المُصنِّع', value: detail.manufacturerCode }] : []),
    ...(detail?.sourceRecordId ? [{ label: 'مرجع المصدر', value: detail.sourceRecordId }] : []),
    ...(detail?.canonicalProductId ? [{ label: 'معرف المنتج المركزي', value: detail.canonicalProductId }] : []),
    ...(detail?.canonicalStoreId ? [{ label: 'معرف المتجر المركزي', value: detail.canonicalStoreId }] : []),
    ...(detail?.source ? [{ label: 'مصدر الإدخال', value: translateOwner(detail.source) }] : []),
    {
      label: 'ملكية الوسائط',
      value: item.isCatalogOwned ? 'كتالوج مركزي' : isPartnerOwnedException(item.publishStage as ApprovalStage) ? 'استثناء شريك' : 'بحاجة مراجعة',
      tone: (item.isCatalogOwned ? 'info' : 'warning') as 'info' | 'warning',
    },
  ].filter((entry) => entry.value);

  return (
    <Box gap={1}>
      <Pressable onPress={onToggleDetails} testID={`inventory-product-card-${item.id}`}>
        <Box layoutDirection="row" gap={2} padding={2} style={{ alignItems: 'center' }}>
          <Box style={{ width: 44, height: 44, borderRadius: radius.sm, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', backgroundColor: colorRoles.surfaceInset }}>
            {thumbnailUrl ? (
              <Image source={{ uri: thumbnailUrl }} style={{ width: 44, height: 44 }} alt="" />
            ) : (
              <Text role="titleMd">{item.name.slice(0, 1)}</Text>
            )}
          </Box>
          <Box gap={0} style={{ flex: 1 }}>
            <Text role="bodyStrong" numberOfLines={1}>{item.name}</Text>
            <Text role="caption" tone="muted" numberOfLines={1}>{nextAction}</Text>
            <Text role="caption" tone="muted" numberOfLines={1}>{item.categoryLabel}</Text>
          </Box>
          <Box gap={1} style={{ alignItems: 'flex-end' }}>
            <Text role="bodyStrong">{item.priceLabel}</Text>
            <Badge label={cardStatus.label} tone={cardStatus.tone === 'default' ? 'neutral' : cardStatus.tone} />
          </Box>
        </Box>
      </Pressable>

      {isPanelOpen ? (
        <Surface tone="inset" padding={2} gap={2} border={false}>
          {summaryLine ? (
            <Text role="caption" tone="muted" align={direction === 'rtl' ? 'end' : 'start'}>
              {summaryLine}
            </Text>
          ) : null}

          {isRejected && rejectReason ? (
            <Surface tone="danger" padding={1} gap={0} border={false}>
              <Text role="bodySm" tone="danger" align={direction === 'rtl' ? 'end' : 'start'}>
                سبب الرفض: {rejectReason}
              </Text>
            </Surface>
          ) : null}

          {isNeedsFix && fixReason ? (
            <Surface tone="warning" padding={1} gap={0} border={false}>
              <Text role="bodySm" tone="warning" align={direction === 'rtl' ? 'end' : 'start'}>
                التعديل المطلوب: {fixReason}
              </Text>
            </Surface>
          ) : null}

          <Box style={{ flexDirection: resolveRowDirection(direction), flexWrap: 'wrap', gap: spacing[1] }}>
            <Button
              label={expanded ? 'إخفاء التعديل' : 'تعديل محلي'}
              size="sm"
              tone={expanded ? 'secondary' : 'primary'}
              fullWidth={false}
              onPress={onToggleEdit}
              disabled={isRejected && !expanded}
            />
            <Button
              label={showDetails ? 'إخفاء التفاصيل' : 'عرض التفاصيل'}
              size="sm"
              tone="secondary"
              fullWidth={false}
              onPress={onToggleDetails}
            />
            <Button
              label="الجاهزية للنشر"
              size="sm"
              tone="secondary"
              fullWidth={false}
              accessibilityLabel={`عرض جاهزية النشر لـ ${item.name}`}
              onPress={onToggleReadiness}
            />
            {onEditIdentity ? (
              <Button
                label="تعديل الهوية"
                size="sm"
                tone="secondary"
                fullWidth={false}
                onPress={onEditIdentity}
              />
            ) : null}
            {onEditMedia ? (
              <Button
                label="إدارة الوسائط"
                size="sm"
                tone="secondary"
                fullWidth={false}
                onPress={onEditMedia}
              />
            ) : null}
            {onEditOverrides ? (
              <Button
                label="تعديل الأسعار والتوفر"
                size="sm"
                tone="secondary"
                fullWidth={false}
                onPress={onEditOverrides}
              />
            ) : null}
            {!item.catalogLinked ? (
              <Button label="مطابقة بالكتالوج" size="sm" tone="secondary" fullWidth={false} onPress={onMatchCatalog} />
            ) : null}
            {item.reviewNeeded && !isRejected ? (
              <Button label="إرسال للمراجعة" size="sm" tone="secondary" fullWidth={false} onPress={onSendForReview} />
            ) : null}
          </Box>

          {expanded ? (
            <InlineLocalEdit
              item={item}
              detail={detail}
              override={override}
              onChange={onOverrideChange}
              onApply={onApplyOverride}
            />
          ) : null}

          {showReadiness ? (
            <PartnerCatalogReadinessPanel
              productId={item.id}
              productName={item.name}
              {...(item.publishStage !== undefined ? { publishStage: item.publishStage } : {})}
              available={item.available}
              stockCount={item.stockCount}
              onClose={onToggleReadiness}
            />
          ) : null}
          {showDetails && detail ? (
            <Surface tone="default" padding={2} gap={1} border={false}>
              <KeyValueList dense items={detailItems} />
              {partnerRecord?.auditTrail?.length ? (
                <Box gap={1}>
                  <Text role="caption" tone="muted" align={direction === 'rtl' ? 'end' : 'start'}>سجل المراحل:</Text>
                  {partnerRecord.auditTrail.map((entry, idx) => (
                    <Text key={idx} role="caption" tone="muted" align={direction === 'rtl' ? 'end' : 'start'}>
                      {translateStage(entry.fromStage)} → {translateStage(entry.toStage)} · {translateOwner(entry.owner)}
                    </Text>
                  ))}
                </Box>
              ) : null}
            </Surface>
          ) : null}
        </Surface>
      ) : null}
    </Box>
  );
}

// ── Main content ──────────────────────────────────────────────────────

function InventoryCatalogContent({
  storeName: _storeName,
  branchLabel,
  activeZoneLabel: _activeZoneLabel,
  todayHoursLabel: _todayHoursLabel,
  canonicalStoreId = 'store-1001',
  onNavigateToProductEdit,
  onNavigateToProductMedia,
  onNavigateToProductOverrides,
}: InventoryCatalogContentProps) {
  const { direction } = useDirection();
  const [query, setQuery] = React.useState('');
  const [filter, setFilter] = React.useState<ActiveHierarchyFilter>({});
  const [viewMode, setViewMode] = React.useState<ViewMode>('dense-list');
  const [items, setItems] = React.useState<InventoryCatalogListItem[]>([]);

  // Fetch live products from GET /stores/{store_id}/products
  React.useEffect(() => {
    if (!canonicalStoreId) return;
    let cancelled = false;
    Promise.all([
      fetchPartnerStoreAssortment(canonicalStoreId),
      fetchPartnerMasterProducts({ limit: 100 })
    ])
      .then(([assortments, masterProducts]) => {
        if (cancelled) return;
        const liveItems = assortments.map((a: any): InventoryCatalogListItem => {
          const mp = masterProducts.find((p) => p.id === a.masterProductId);
          return {
            id: a.masterProductId,
            name: mp?.canonicalNameAr ?? `منتج مركزي ${a.masterProductId}`,
            categoryLabel: mp?.categoryNodeId ?? 'بدون تصنيف',
            isPrivateStoreProduct: false,
            isCatalogOwned: true,
            catalogLinked: true,
            priceLabel: `${a.unitPrice} YER`,
            stockCount: a.stockStatus === 'in_stock' ? 100 : a.stockStatus === 'low_stock' ? 2 : 0,
            available: a.available,
            lowStock: a.stockStatus === 'low_stock',
            publishStage: a.publicationStatus,
            reviewNeeded: false,
          };
        });
        setItems(liveItems);
      })
      .catch(() => {
        if (cancelled) return;
        setItems([]);
        setToolMessage('تعذر تحميل كتالوج المنتجات المركزي.');
      });
    return () => { cancelled = true; };
  }, [canonicalStoreId]);

  const [expandedEditId, setExpandedEditId] = React.useState<string | null>(null);
  const [expandedDetailsId, setExpandedDetailsId] = React.useState<string | null>(null);
  const [readinessOpenId, setReadinessOpenId] = React.useState<string | null>(null);
  const [overrides, setOverrides] = React.useState<Record<string, PartnerLocalOverride>>({});
  const [lastSavedLabel, setLastSavedLabel] = React.useState<string | null>(null);
  const [toolMessage, setToolMessage] = React.useState<string | null>(null);
  const [bulkPrice, setBulkPrice] = React.useState<{ kind: 'percent' | 'fixed'; value: string } | null>(null);
  const [bulkPreviewMessage, setBulkPreviewMessage] = React.useState<string | null>(null);

  const totalProducts = items.length;
  const lowStockCount = items.filter((item) => item.lowStock).length;
  const reviewCount = items.filter((item) => item.reviewNeeded).length;
  const notLinkedCount = items.filter((item) => !item.catalogLinked).length;
  const clientVisibleCount = items.filter((item) => item.publishStage === 'client-visible').length;
  const kpiItems = [
    { label: 'المنتجات', value: String(totalProducts), tone: 'action' as const },
    { label: 'منخفض', value: String(lowStockCount), tone: lowStockCount > 0 ? 'warning' as const : 'success' as const },
    { label: 'مراجعة', value: String(reviewCount), tone: reviewCount > 0 ? 'warning' as const : 'success' as const },
    { label: 'غير مرتبط', value: String(notLinkedCount), tone: notLinkedCount > 0 ? 'danger' as const : 'success' as const },
    { label: 'ظاهر', value: String(clientVisibleCount), tone: 'success' as const },
  ];

  const searchMatchState = React.useMemo(
    () => detectSearchMatch(items, query),
    [items, query],
  );

  const filteredItems = React.useMemo(() => {
    const normalizedQuery = query.trim();
    const searched = normalizedQuery
      ? items.filter((item) => matchesInventorySearch(item, normalizedQuery))
      : items;
    return applyHierarchyFilter(searched, filter);
  }, [items, query, filter]);

  function getOverride(item: InventoryCatalogListItem): PartnerLocalOverride {
    return overrides[item.id] ?? {
      price: item.priceLabel.replace(/[^0-9.]/g, '').trim(),
      stock: String(item.stockCount),
      available: item.available,
      preparationNote: '',
      internalNote: '',
    };
  }

  const handleOverrideChange = React.useCallback(
    (id: string, field: keyof PartnerLocalOverride, value: string | boolean) => {
      setOverrides((prev) => ({
        ...prev,
        [id]: { ...(prev[id] ?? {}), [field]: value } as PartnerLocalOverride,
      }));
    },
    [],
  );

  const handleApplyOverride = React.useCallback(
    (item: InventoryCatalogListItem) => {
      const override = overrides[item.id];
      if (!override) return;
      const parsedStock = Number(override.stock.replace(/[^0-9]/g, ''));
      const cleanedPrice = override.price.replace(/[^0-9.]/g, '').trim();
      const resolvedPrice = cleanedPrice.length > 0 ? `${Number(cleanedPrice).toFixed(2)} ر.ي` : item.priceLabel;
      const normalizedStock = Number.isFinite(parsedStock) ? parsedStock : item.stockCount;
      setItems((current) =>
        current.map((p) =>
          p.id === item.id
            ? {
                ...p,
                priceLabel: resolvedPrice,
                stockCount: normalizedStock,
                available: override.available,
                lowStock: normalizedStock <= 3,
                reviewNeeded: normalizedStock <= 3 || !override.available || !p.catalogLinked,
              }
            : p,
        ),
      );
      setLastSavedLabel(new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }));
      setExpandedEditId(null);
      setToolMessage(`تم تطبيق التعديل المحلي على ${item.name}.`);
    },
    [overrides],
  );

  const handleSendForReview = React.useCallback((item: InventoryCatalogListItem) => {
    setToolMessage(`تم إرسال ${item.name} للمراجعة — سيظهر في قائمة انتظار الشركاء.`);
  }, []);

  const handleMatchCatalog = React.useCallback((item: InventoryCatalogListItem) => {
    setToolMessage(`ابدأ البحث بـ SKU أو GTIN لمطابقة ${item.name} مع الكتالوج المركزي.`);
  }, []);

  const handleBarcodeScanPreviewResult = React.useCallback((barcode: string) => {
    const barcodeBridgeMessage = 'ماسح الباركود سيتم ربطه بالقدرة المشتركة في المرحلة التالية.';
    const normalizedCode = barcode.trim();

    if (!normalizedCode) {
      setToolMessage(barcodeBridgeMessage);
      return;
    }

    const matchedDetail = findDetailByLookupCode(normalizedCode);
    const matchedItem = matchedDetail ? items.find((candidate) => candidate.id === matchedDetail.id) : undefined;
    setQuery(normalizedCode);

    if (matchedItem) {
      setToolMessage(`${barcodeBridgeMessage} تمت معاينة الرمز محلياً لـ ${matchedItem.name} بدون تشغيل الماسح بعد.`);
      return;
    }

    setToolMessage(`${barcodeBridgeMessage} لا توجد مطابقة حالية لهذا الرمز في المعاينة.`);
  }, [items]);

  const publishLabel = reviewCount > 0 || lowStockCount > 0 ? 'مراجعة ونشر التغييرات' : 'حفظ تحديثات المخزون';

  return (
    <Box gap={2}>

      {/* Store readiness gate — wires PATCH /stores/{id}/partner-readiness */}
      {canonicalStoreId ? <StoreReadinessGate storeId={canonicalStoreId} /> : null}

      {/* Summary tiles */}
      <Surface tone="raised" padding={1} gap={0} border={false}>
        <Box style={{ flexDirection: resolveRowDirection(direction), flexWrap: 'wrap', alignItems: 'center', columnGap: 10, rowGap: spacing[1] }}>
          {kpiItems.map((item, index) => (
            <Box
              key={item.label}
              style={{ flexDirection: resolveRowDirection(direction), alignItems: 'center', gap: spacing[1] }}
            >
              <Text role="caption" tone="muted" numberOfLines={1}>{item.label}</Text>
              <Text role="label" tone={item.tone} numberOfLines={1}>{item.value}</Text>
              {index < kpiItems.length - 1 ? <Text role="caption" tone="muted">|</Text> : null}
            </Box>
          ))}
        </Box>
      </Surface>

      {/* Search */}
      <Surface tone="raised" padding={1} gap={1}>
        <SearchField
          value={query}
          onChangeText={setQuery}
          placeholder="اسم المنتج، SKU، GTIN، الباركود"
        />
        <Box style={{ flexDirection: resolveRowDirection(direction), flexWrap: 'wrap', gap: spacing[1] }}>
          <Button label="مسح باركود" tone="secondary" size="sm" fullWidth={false}
            onPress={() => handleBarcodeScanPreviewResult(query)} />
          <Button label="إدخال جماعي" tone="secondary" size="sm" fullWidth={false}
            onPress={() => setToolMessage('تم فتح مسار الإدخال الجماعي — Excel/CSV.')} />
          <Button label="منتج جديد" tone="secondary" size="sm" fullWidth={false}
            onPress={() => setToolMessage('ابدأ من الكتالوج المركزي قبل إنشاء مسودة جديدة.')} />
        </Box>
        {query.trim() ? (
          <Surface
            tone={searchMatchState === 'duplicate' || searchMatchState === 'needs-match' ? 'warning' : searchMatchState === 'not-in-catalog' ? 'danger' : 'inset'}
            padding={2} gap={0} border={false}
          >
            <Text
              role="bodySm"
              tone={searchMatchState === 'duplicate' || searchMatchState === 'needs-match' ? 'warning' : searchMatchState === 'not-in-catalog' ? 'danger' : 'muted'}
              align={direction === 'rtl' ? 'end' : 'start'}
            >
              {searchMatchState === 'catalog-match' && <Text role="bodySm" tone="muted">مطابق بالكتالوج</Text>}
              {searchMatchState === 'needs-match' && <Text role="bodySm" tone="muted">يحتاج مطابقة بالكتالوج المركزي</Text>}
              {searchMatchState === 'not-in-catalog' && <Text role="bodySm" tone="muted">غير موجود في الكتالوج — أرسل طلب إضافة</Text>}
              {searchMatchState === 'duplicate' && <Text role="bodySm" tone="muted">تكرار محتمل — راجع الاسم</Text>}
            </Text>
          </Surface>
        ) : null}
      </Surface>

      {/* Tool message */}
      {toolMessage ? (
        <Surface tone="inset" padding={1} gap={0} border={false}>
          <Text role="bodySm" tone="muted" align={direction === 'rtl' ? 'end' : 'start'}>{toolMessage}</Text>
        </Surface>
      ) : null}

      {/* Help */}
      <HelpBlock />

      {/* Unified filter funnel */}
      <HierarchyFilterRail filter={filter} onChange={(update) => setFilter((prev) => ({ ...prev, ...update }))} items={items} />

      {/* View mode + result count */}
      <Box style={{ flexDirection: resolveRowDirection(direction), alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
        <Text role="label" tone="muted">{filteredItems.length} منتج</Text>
        <SegmentedControl
          value={viewMode}
          onValueChange={(v) => setViewMode(v as ViewMode)}
          items={[
            { value: 'cards', label: 'بطاقات' },
            { value: 'dense-list', label: 'قائمة كثيفة' },
          ]}
        />
      </Box>

      {/* Product stream */}
      <Box gap={1}>
        {filteredItems.length === 0 ? (
          <StateView
            title="لا توجد نتائج مطابقة"
            description="جرّب اسم مختلفاً أو صفّح الفلاتر."
            actionLabel="إعادة ضبط الفلتر والبحث"
            onActionPress={() => { setQuery(''); setFilter({}); }}
          />
        ) : viewMode === 'dense-list' ? (
          filteredItems.map((item) => (
            <DenseListRow
              key={item.id}
              item={item}
              isEditExpanded={expandedEditId === item.id}
              onToggleEdit={() => setExpandedEditId((prev) => (prev === item.id ? null : item.id))}
              override={getOverride(item)}
              onOverrideChange={(field, value) => handleOverrideChange(item.id, field, value)}
              onApplyOverride={() => handleApplyOverride(item)}
            />
          ))
        ) : (
          filteredItems.map((item) => {
            const isExpanded = expandedEditId === item.id;
            const isShowingDetails = expandedDetailsId === item.id;
            const cardDetail = (isExpanded || isShowingDetails) ? getItemDetail(item.id) : undefined;
            return (
              <InventoryCatalogCardPanel
                key={item.id}
                item={item}
                detail={cardDetail}
                expanded={isExpanded}
                showDetails={isShowingDetails}
                onToggleEdit={() => setExpandedEditId((prev) => (prev === item.id ? null : item.id))}
                onToggleDetails={() => setExpandedDetailsId((prev) => (prev === item.id ? null : item.id))}
                showReadiness={readinessOpenId === item.id}
                onToggleReadiness={() => setReadinessOpenId((prev) => (prev === item.id ? null : item.id))}
                override={getOverride(item)}
                onOverrideChange={(field, value) => handleOverrideChange(item.id, field, value)}
                onApplyOverride={() => handleApplyOverride(item)}
                onSendForReview={() => handleSendForReview(item)}
                onMatchCatalog={() => handleMatchCatalog(item)}
                onEditIdentity={onNavigateToProductEdit ? () => onNavigateToProductEdit(item.id) : undefined}
                onEditMedia={onNavigateToProductMedia ? () => onNavigateToProductMedia(item.id) : undefined}
                onEditOverrides={onNavigateToProductOverrides ? () => onNavigateToProductOverrides(item.id) : undefined}
              />
            );
          })
        )}
      </Box>

      {/* Bulk actions */}
      <Surface tone="raised" padding={2} gap={2}>
        <Text role="label" tone="muted" align={direction === 'rtl' ? 'end' : 'start'}>إجراءات جماعية</Text>
        <Box style={{ flexDirection: resolveRowDirection(direction), flexWrap: 'wrap', gap: 6 }}>
          <Button
            label={bulkPrice ? 'إلغاء تحديث الأسعار' : 'تحديث أسعار جماعي'}
            size="sm"
            tone={bulkPrice ? 'danger' : 'secondary'}
            fullWidth={false}
            onPress={() => { setBulkPrice(bulkPrice ? null : { kind: 'percent', value: '' }); setBulkPreviewMessage(null); }}
          />
          <Button label="استيراد Excel/CSV" size="sm" tone="secondary" fullWidth={false}
            onPress={() => setToolMessage('تم فتح مسار الاستيراد.')} />
          <Button label="مراجعة غير المطابقة" size="sm" tone="secondary" fullWidth={false}
            onPress={() => { setFilter({ facetTags: ['not-linked'] }); setToolMessage('عرض المنتجات غير المرتبطة بالكتالوج.'); }} />
          <Button label="مراجعة المنتجات الخاصة" size="sm" tone="secondary" fullWidth={false}
            onPress={() => { setFilter({ facetTags: ['private-store'] }); setToolMessage('عرض المنتجات الخاصة بالمتجر.'); }} />
        </Box>

        {bulkPrice ? (
          <Surface tone="inset" padding={2} gap={2} border={false}>
            <Text role="bodySm" tone="muted" align={direction === 'rtl' ? 'end' : 'start'}>
              تحديث أسعار المنتجات ضمن الفلتر الحالي — تطبيق محلي (preview فقط)
            </Text>
            <Box style={{ flexDirection: resolveRowDirection(direction), gap: 6 }}>
              <Button label="نسبة مئوية %" size="sm" tone={bulkPrice.kind === 'percent' ? 'brand' : 'secondary'} fullWidth={false}
                onPress={() => setBulkPrice({ ...bulkPrice, kind: 'percent' })} />
              <Button label="مبلغ ثابت ر.ي" size="sm" tone={bulkPrice.kind === 'fixed' ? 'brand' : 'secondary'} fullWidth={false}
                onPress={() => setBulkPrice({ ...bulkPrice, kind: 'fixed' })} />
            </Box>
            <TextField
              label={bulkPrice.kind === 'percent' ? 'نسبة الزيادة/النقص (مثال: +10 أو -5)' : 'المبلغ المضاف/المطروح (مثال: +2 أو -1.5)'}
              value={bulkPrice.value}
              onChangeText={(v: string) => { setBulkPrice({ ...bulkPrice, value: v }); setBulkPreviewMessage(null); }}
              placeholder={bulkPrice.kind === 'percent' ? '+10' : '+2.00'}            />
            <Button
              label="معاينة التغييرات قبل التطبيق"
              tone="secondary"
              fullWidth={false}
              onPress={() => {
                const rawVal = parseFloat(bulkPrice.value.replace(/[^0-9.\-]/g, ''));
                if (Number.isNaN(rawVal)) { setBulkPreviewMessage('أدخل قيمة صحيحة أولاً.'); return; }
                const eligible = filteredItems.filter((item) => !item.isCatalogOwned);
                const excluded = filteredItems.filter((item) => item.isCatalogOwned);
                const sign = rawVal >= 0 ? '+' : '';
                const summary = bulkPrice.kind === 'percent' ? `${sign}${rawVal}%` : `${sign}${rawVal.toFixed(2)} ر.ي`;
                setBulkPreviewMessage(
                  `المتأثرة: ${eligible.length} منتج | التغيير: ${summary} على كل سعر | المستثناة: ${excluded.length} منتج مركزي (الأسعار مقفلة) | تطبيق محلي فقط.`,
                );
              }}
            />
            {bulkPreviewMessage ? (
              <Surface tone="warning" padding={2} gap={0} border={false}>
                <Text role="bodySm" tone="warning" align={direction === 'rtl' ? 'end' : 'start'}>{bulkPreviewMessage}</Text>
              </Surface>
            ) : null}
            {bulkPreviewMessage && !bulkPreviewMessage.startsWith('أدخل') ? (
              <Button
                label="تطبيق التعديل المحلي على المنتجات المتأثرة"
                tone="primary"
                fullWidth={false}
                onPress={() => {
                  const rawVal = parseFloat(bulkPrice.value.replace(/[^0-9.\-]/g, ''));
                  if (Number.isNaN(rawVal)) return;
                  setItems((current) =>
                    current.map((item) => {
                      if (item.isCatalogOwned || !filteredItems.some((f) => f.id === item.id)) return item;
                      const currentNum = parseFloat(item.priceLabel.replace(/[^0-9.]/g, ''));
                      if (!Number.isFinite(currentNum)) return item;
                      const newPrice = bulkPrice.kind === 'percent' ? currentNum * (1 + rawVal / 100) : currentNum + rawVal;
                      return { ...item, priceLabel: `${Math.max(0, newPrice).toFixed(2)} ر.ي` };
                    }),
                  );
                  setLastSavedLabel(new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }));
                  setBulkPrice(null);
                  setBulkPreviewMessage(null);
                  setToolMessage('تم تطبيق تحديث الأسعار الجماعي على المنتجات المؤهلة.');
                }}
              />
            ) : null}
          </Surface>
        ) : null}
      </Surface>

      <MobileStickyPrimaryAction
        label={publishLabel}
        helperText={lastSavedLabel ? `آخر حفظ: ${lastSavedLabel}` : `${branchLabel} — الكتالوج المركزي هو المرجع.`}
        onPress={() => setLastSavedLabel(new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }))}
      />
    </Box>
  );
}

// ── Screen shell ──────────────────────────────────────────────────────

export function InventoryCatalogScreen({ onBack, canonicalStoreId = 'store-1001', ...props }: InventoryCatalogScreenProps) {
  const { direction } = useDirection();
  return (
    <MobileScrollView fill padding={2} gap={2} contentContainerStyle={{ paddingBottom: 120 }}>
      <TopBar
        variant="secondary"
        title="كتالوج المخزون"
        style={{ marginHorizontal: -16, marginTop: -16 }}
      />
      <Surface tone="inset" padding={3} gap={2}>
        <Text role="bodyStrong" style={{ textAlign: 'right' }}>
          حوكمة الكتالوج
        </Text>
        <Text role="bodySm" tone="muted" style={{ textAlign: 'right' }}>
          المالك المركزي هو {resolveDshControlPanelSectionLabel('catalogs')}. يعدل الشريك السعر والمخزون والتوفر محليًا فقط، بينما الهوية والباركود والنشر وتعارضات الميديا تُراجع on-demand داخل لوحة التحكم.
        </Text>
      </Surface>

      <Box style={{ flexDirection: resolveRowDirection(direction), gap: spacing[2], justifyContent: 'flex-start', marginVertical: 4 }}>
        {props.onNavigateToCategoryManagement ? (
          <Button
            label="إدارة هيكلية الفئات"
            tone="secondary"
            size="sm"
            fullWidth={false}
            onPress={props.onNavigateToCategoryManagement}
          />
        ) : null}
        {props.onNavigateToProductEdit ? (
          <Button
            label="إضافة منتج جديد"
            tone="primary"
            size="sm"
            fullWidth={false}
            onPress={() => props.onNavigateToProductEdit?.()}
          />
        ) : null}
      </Box>

      <InventoryCatalogContent canonicalStoreId={canonicalStoreId} {...props} />
    </MobileScrollView>
  );
}

// export default InventoryCatalogScreen; // Unused default export