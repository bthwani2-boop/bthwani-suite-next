// app-field — fast governed partner catalog setup.
// The field agent selects many approved master products, enters store-local
// prices/availability/description, and saves the batch in one governed request.
// Product identity, unit and measurement type always come from central catalog.
import React from 'react';
import { Pressable, View, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Badge,
  Button,
  Text,
  TextField,
  Header,
  StateView,
  spacing,
  radius,
  borders,
  colorRoles,
  Icon,
} from '@bthwani/ui-kit';
import { useFieldCatalogController } from '../../shared/partner';
import type { MasterProduct } from '../../shared/catalog/central-catalog.types';

export type DshFieldPartnerProductsScreenProps = {
  readonly partnerId: string;
  readonly onBack: () => void;
};

type StockStatus = 'in_stock' | 'low_stock' | 'out_of_stock';
type ProductDraft = {
  readonly price: string;
  readonly localDescription: string;
  readonly stockStatus: StockStatus;
};

const STOCK_STATUS_LABELS: Record<StockStatus, string> = {
  in_stock: 'متوفر',
  low_stock: 'كمية محدودة',
  out_of_stock: 'غير متوفر',
};

function emptyDraft(): ProductDraft {
  return { price: '', localDescription: '', stockStatus: 'in_stock' };
}

function centralMeasurementLabel(product: MasterProduct): string {
  const parts = [product.unit?.trim(), product.measurementType?.trim()].filter(Boolean);
  return parts.length ? parts.join(' · ') : 'الوحدة يحددها الكتالوج المركزي';
}

export function DshFieldPartnerProductsScreen({ partnerId, onBack }: DshFieldPartnerProductsScreenProps) {
  const insets = useSafeAreaInsets();
  const {
    storeState,
    taxonomyState,
    masterProductsState,
    actionState,
    assortmentItems,
    proposals,
    searchMasterProducts,
    linkMasterProductsBatch,
    proposeNewProduct,
  } = useFieldCatalogController(partnerId);

  const [searchText, setSearchText] = React.useState('');
  const [selectedDomainId, setSelectedDomainId] = React.useState('');
  const [selectedNodeId, setSelectedNodeId] = React.useState('');
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  const [drafts, setDrafts] = React.useState<Record<string, ProductDraft>>({});
  const [rowErrors, setRowErrors] = React.useState<Record<string, string | undefined>>({});
  const [batchMessage, setBatchMessage] = React.useState<string | null>(null);
  const [batchTone, setBatchTone] = React.useState<'success' | 'warning' | 'danger'>('success');

  const [showProposeForm, setShowProposeForm] = React.useState(false);
  const [proposeNameAr, setProposeNameAr] = React.useState('');
  const [proposeNameEn, setProposeNameEn] = React.useState('');
  const [proposeBrand, setProposeBrand] = React.useState('');
  const [proposeError, setProposeError] = React.useState<string | undefined>();
  const [proposeDomainId, setProposeDomainId] = React.useState('');
  const [proposeNodeId, setProposeNodeId] = React.useState('');

  React.useEffect(() => {
    if (taxonomyState.kind !== 'success' || selectedDomainId) return;
    const firstDomainId = taxonomyState.domains.find((domain) => domain.isActive)?.id ?? '';
    setSelectedDomainId(firstDomainId);
    void searchMasterProducts(firstDomainId ? { domainId: firstDomainId } : undefined);
  }, [taxonomyState, selectedDomainId, searchMasterProducts]);

  const masterProducts = masterProductsState.kind === 'success' ? masterProductsState.items : [];
  const activeDomains = taxonomyState.kind === 'success' ? taxonomyState.domains.filter((domain) => domain.isActive) : [];
  const visibleNodes = taxonomyState.kind === 'success'
    ? taxonomyState.nodes.filter((node) => node.domainId === selectedDomainId && node.isActive)
    : [];
  const proposeNodes = taxonomyState.kind === 'success'
    ? taxonomyState.nodes.filter((node) => node.domainId === proposeDomainId && node.isActive)
    : [];

  const draftForProduct = React.useCallback((productId: string): ProductDraft => {
    const draft = drafts[productId];
    if (draft) return draft;
    const existing = assortmentItems.find((item) => item.masterProductId === productId);
    return existing
      ? {
          price: String(existing.unitPrice),
          localDescription: existing.localNote ?? '',
          stockStatus: existing.stockStatus,
        }
      : emptyDraft();
  }, [drafts, assortmentItems]);

  const ensureDraft = React.useCallback((productId: string) => {
    setDrafts((current) => {
      if (current[productId]) return current;
      const existing = assortmentItems.find((item) => item.masterProductId === productId);
      return {
        ...current,
        [productId]: existing
          ? {
              price: String(existing.unitPrice),
              localDescription: existing.localNote ?? '',
              stockStatus: existing.stockStatus,
            }
          : emptyDraft(),
      };
    });
  }, [assortmentItems]);

  const toggleSelected = (productId: string) => {
    ensureDraft(productId);
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(productId)) next.delete(productId);
      else next.add(productId);
      return next;
    });
    setBatchMessage(null);
  };

  const updateDraft = (productId: string, patch: Partial<ProductDraft>) => {
    setDrafts((current) => ({ ...current, [productId]: { ...draftForProduct(productId), ...patch } }));
    setRowErrors((current) => ({ ...current, [productId]: undefined }));
    setBatchMessage(null);
  };

  const selectAllVisible = () => {
    for (const product of masterProducts) ensureDraft(product.id);
    setSelectedIds(new Set(masterProducts.map((product) => product.id)));
    setBatchMessage(null);
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
    setRowErrors({});
    setBatchMessage(null);
  };

  const handleSearch = async () => {
    await searchMasterProducts({
      ...(searchText.trim() ? { search: searchText.trim() } : {}),
      ...(selectedDomainId ? { domainId: selectedDomainId } : {}),
      ...(selectedNodeId ? { categoryNodeId: selectedNodeId } : {}),
    });
  };

  const handleBatchSave = async () => {
    const selectedProducts = masterProducts.filter((product) => selectedIds.has(product.id));
    const nextErrors: Record<string, string | undefined> = {};
    const validItems = selectedProducts.flatMap((product) => {
      const draft = draftForProduct(product.id);
      const price = Number(draft.price.trim());
      if (!draft.price.trim() || !Number.isFinite(price) || price < 0) {
        nextErrors[product.id] = 'أدخل سعرًا صحيحًا';
        return [];
      }
      return [{
        masterProductId: product.id,
        input: {
          unitPrice: price,
          currency: 'YER',
          available: draft.stockStatus !== 'out_of_stock',
          stockStatus: draft.stockStatus,
          localNote: draft.localDescription.trim(),
        },
      }];
    });

    setRowErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      setBatchTone('warning');
      setBatchMessage('أكمل الأسعار الصحيحة لجميع المنتجات المحددة قبل الحفظ.');
      return;
    }
    if (validItems.length === 0) return;

    const summary = await linkMasterProductsBatch(validItems);
    const savedIds = new Set(
      summary.results.filter((result) => result.status === 'saved').map((result) => result.masterProductId),
    );
    setSelectedIds((current) => new Set([...current].filter((id) => !savedIds.has(id))));
    const failedErrors: Record<string, string | undefined> = {};
    for (const result of summary.results) {
      if (result.status === 'failed') {
        failedErrors[result.masterProductId] = result.code === 'CONFLICT'
          ? 'تغير المنتج بعد تحميله. أعد المحاولة بعد تحديث البيانات.'
          : result.message ?? 'تعذر حفظ المنتج';
      }
    }
    setRowErrors(failedErrors);

    if (summary.failed === 0) {
      setBatchTone('success');
      setBatchMessage(`تم حفظ ${summary.succeeded} منتج وربطها بمتجر الشريك.`);
    } else if (summary.succeeded > 0) {
      setBatchTone('warning');
      setBatchMessage(`تم حفظ ${summary.succeeded} منتج، وتعذر حفظ ${summary.failed}. بقيت الصفوف الفاشلة محددة لإعادة المحاولة.`);
    } else {
      setBatchTone('danger');
      setBatchMessage('تعذر حفظ المنتجات المحددة. راجع الأخطاء الظاهرة في الصفوف.');
    }
  };

  const startProposeWithSearch = () => {
    setProposeNameAr(searchText.trim());
    setProposeDomainId(selectedDomainId);
    setProposeNodeId(selectedNodeId);
    setShowProposeForm(true);
  };

  const handlePropose = async () => {
    if (!proposeNameAr.trim()) {
      setProposeError('اسم المنتج مطلوب');
      return;
    }
    if (!proposeDomainId) {
      setProposeError('اختر القسم المركزي أولًا');
      return;
    }
    const matchedNode = proposeNodes.find((node) => node.id === proposeNodeId);
    const proposal = await proposeNewProduct({
      proposedNameAr: proposeNameAr.trim(),
      proposedNameEn: proposeNameEn.trim(),
      domainId: proposeDomainId,
      categoryNodeId: matchedNode?.domainId === proposeDomainId ? matchedNode.id : null,
      brand: proposeBrand.trim(),
      barcode: null,
      imageObjectKey: null,
    });
    if (!proposal) {
      setProposeError('تعذر إرسال الاقتراح. تحقق من سياسة الفئة ثم أعد المحاولة.');
      return;
    }
    setProposeNameAr('');
    setProposeNameEn('');
    setProposeBrand('');
    setProposeDomainId('');
    setProposeNodeId('');
    setProposeError(undefined);
    setShowProposeForm(false);
  };

  if (storeState.kind === 'loading' || storeState.kind === 'idle') {
    return <StateView loading title="جاري تحميل متجر الشريك…" />;
  }
  if (storeState.kind === 'error') {
    return <StateView tone="danger" title="تعذر التحميل" description={storeState.message} actionLabel="رجوع" onActionPress={onBack} />;
  }

  return (
    <View style={{ flex: 1, backgroundColor: colorRoles.surfaceBase }}>
      <Header title="إعداد منتجات المتجر" subtitle="اختيار جماعي من الكتالوج المركزي وحفظ الأسعار دفعة واحدة" />

      <View style={{ padding: spacing[4], paddingBottom: spacing[2], gap: spacing[2], borderBottomWidth: 1, borderBottomColor: colorRoles.borderSubtle }}>
        <View style={{ flexDirection: 'row-reverse', gap: spacing[2], alignItems: 'flex-end' }}>
          <View style={{ flex: 1 }}>
            <TextField label="بحث في الكتالوج المركزي" value={searchText} onChangeText={setSearchText} placeholder="الاسم أو الباركود" />
          </View>
          <Button label="بحث" tone="secondary" onPress={() => void handleSearch()} disabled={masterProductsState.kind === 'loading'} />
        </View>
        <View style={{ flexDirection: 'row-reverse', flexWrap: 'wrap', gap: spacing[2], alignItems: 'center' }}>
          <Button label="تحديد كل الظاهر" size="sm" tone="ghost" onPress={selectAllVisible} disabled={masterProducts.length === 0} />
          <Button label="إلغاء التحديد" size="sm" tone="ghost" onPress={clearSelection} disabled={selectedIds.size === 0} />
          <Badge label={`${selectedIds.size} محدد`} tone={selectedIds.size ? 'brand' : 'neutral'} />
        </View>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: spacing[4], gap: spacing[4], paddingBottom: 140 }} showsVerticalScrollIndicator={false}>
        <View style={{ gap: spacing[3] }}>
          {taxonomyState.kind === 'error' ? (
            <StateView tone="danger" title="تعذر تحميل الفئات المركزية" description={taxonomyState.message} />
          ) : taxonomyState.kind === 'success' ? (
            <>
              <Text role="bodyStrong" style={{ textAlign: 'right' }}>المجال المركزي</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing[2], flexDirection: 'row-reverse' }}>
                {activeDomains.map((domain) => (
                  <Button
                    key={domain.id}
                    label={domain.nameAr}
                    size="sm"
                    pill
                    tone={selectedDomainId === domain.id ? 'primary' : 'ghost'}
                    onPress={() => {
                      setSelectedDomainId(domain.id);
                      setSelectedNodeId('');
                      clearSelection();
                      void searchMasterProducts({ domainId: domain.id, ...(searchText.trim() ? { search: searchText.trim() } : {}) });
                    }}
                  />
                ))}
              </ScrollView>
              {visibleNodes.length ? (
                <>
                  <Text role="bodyStrong" style={{ textAlign: 'right' }}>الفئة المركزية</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing[2], flexDirection: 'row-reverse' }}>
                    <Button
                      label="الكل"
                      size="sm"
                      pill
                      tone={selectedNodeId ? 'ghost' : 'primary'}
                      onPress={() => {
                        setSelectedNodeId('');
                        clearSelection();
                        void searchMasterProducts({ domainId: selectedDomainId, ...(searchText.trim() ? { search: searchText.trim() } : {}) });
                      }}
                    />
                    {visibleNodes.map((node) => (
                      <Button
                        key={node.id}
                        label={node.nameAr}
                        size="sm"
                        pill
                        tone={selectedNodeId === node.id ? 'primary' : 'ghost'}
                        onPress={() => {
                          setSelectedNodeId(node.id);
                          clearSelection();
                          void searchMasterProducts({ domainId: selectedDomainId, categoryNodeId: node.id, ...(searchText.trim() ? { search: searchText.trim() } : {}) });
                        }}
                      />
                    ))}
                  </ScrollView>
                </>
              ) : null}
            </>
          ) : null}
        </View>

        {actionState.kind === 'error' ? <StateView tone="warning" title="تعذر إكمال بعض العمليات" description={actionState.message} /> : null}
        {batchMessage ? <StateView tone={batchTone} title={batchTone === 'success' ? 'تم الحفظ' : 'نتيجة الحفظ الجماعي'} description={batchMessage} /> : null}

        <View style={{ gap: spacing[3] }}>
          <Text role="bodyStrong" style={{ textAlign: 'right' }}>{`منتجات الكتالوج (${masterProducts.length})`}</Text>
          {masterProductsState.kind === 'loading' ? (
            <StateView loading title="جاري تحميل المنتجات…" />
          ) : masterProducts.length === 0 ? (
            <View style={{ padding: spacing[5], gap: spacing[3], borderWidth: 1.5, borderStyle: 'dashed', borderColor: colorRoles.borderStrong, borderRadius: radius.md, alignItems: 'center' }}>
              <Icon name="search-outline" size={32} tone="muted" />
              <Text role="bodyStrong" tone="muted" style={{ textAlign: 'center' }}>لا توجد نتائج مطابقة</Text>
              {searchText.trim() ? <Button label="اقتراح منتج جديد" tone="primary" onPress={startProposeWithSearch} /> : null}
            </View>
          ) : masterProducts.map((product) => {
            const selected = selectedIds.has(product.id);
            const linked = assortmentItems.find((item) => item.masterProductId === product.id);
            const draft = draftForProduct(product.id);
            const error = rowErrors[product.id];
            return (
              <View
                key={product.id}
                style={{
                  padding: spacing[3],
                  borderWidth: selected ? 2 : borders.hairline,
                  borderColor: error ? colorRoles.danger : selected ? colorRoles.brandAction : colorRoles.borderSubtle,
                  borderRadius: radius.md,
                  backgroundColor: selected ? colorRoles.brandActionSoft : colorRoles.surfaceBase,
                  gap: spacing[3],
                }}
              >
                <Pressable onPress={() => toggleSelected(product.id)} style={{ flexDirection: 'row-reverse', gap: spacing[2], alignItems: 'center' }}>
                  <Icon name={selected ? 'checkbox' : 'square-outline'} size={24} tone={selected ? 'brand' : 'muted'} />
                  <View style={{ flex: 1, alignItems: 'flex-end', gap: 2 }}>
                    <Text role="bodyStrong" style={{ textAlign: 'right' }}>{product.canonicalNameAr}</Text>
                    <Text role="caption" tone="muted" style={{ textAlign: 'right' }}>{centralMeasurementLabel(product)}</Text>
                  </View>
                  {linked ? <Badge label="مرتبط" tone="success" /> : null}
                </Pressable>

                {selected ? (
                  <View style={{ gap: spacing[3] }}>
                    <TextField
                      label={`السعر (${centralMeasurementLabel(product)})`}
                      value={draft.price}
                      onChangeText={(price) => updateDraft(product.id, { price })}
                      placeholder="مثال: 1500"
                      {...(error ? { error } : {})}
                    />
                    <TextField
                      label="وصف المتجر للمنتج"
                      value={draft.localDescription}
                      onChangeText={(localDescription) => updateDraft(product.id, { localDescription })}
                      placeholder="اختياري: طازج يوميًا، تحضير خاص، أو وصف محلي"
                      multiline
                    />
                    <View style={{ gap: spacing[2] }}>
                      <Text role="caption" style={{ textAlign: 'right' }}>حالة المخزون</Text>
                      <View style={{ flexDirection: 'row-reverse', flexWrap: 'wrap', gap: spacing[2] }}>
                        {(Object.keys(STOCK_STATUS_LABELS) as StockStatus[]).map((status) => (
                          <Button
                            key={status}
                            label={STOCK_STATUS_LABELS[status]}
                            size="sm"
                            pill
                            tone={draft.stockStatus === status ? (status === 'in_stock' ? 'success' : status === 'out_of_stock' ? 'danger' : 'brand') : 'ghost'}
                            onPress={() => updateDraft(product.id, { stockStatus: status })}
                          />
                        ))}
                      </View>
                    </View>
                  </View>
                ) : linked ? (
                  <View style={{ alignItems: 'flex-end', gap: 2 }}>
                    <Text role="bodySm" tone="success">{linked.unitPrice} {linked.currency}</Text>
                    <Text role="caption" tone="muted">{STOCK_STATUS_LABELS[linked.stockStatus]}</Text>
                    {linked.localNote ? <Text role="caption" tone="muted">{linked.localNote}</Text> : null}
                  </View>
                ) : (
                  <Text role="caption" tone="muted" style={{ textAlign: 'right' }}>حدده لإدخال السعر وإضافته مع المجموعة.</Text>
                )}
              </View>
            );
          })}
        </View>

        <View style={{ height: 1, backgroundColor: colorRoles.borderSubtle }} />
        <View style={{ backgroundColor: colorRoles.surfaceMuted, padding: spacing[4], borderRadius: radius.lg, gap: spacing[3], borderWidth: borders.hairline, borderColor: colorRoles.borderSubtle }}>
          <Pressable onPress={() => setShowProposeForm((value) => !value)} style={{ flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text role="bodyStrong" style={{ textAlign: 'right' }}>{showProposeForm ? 'إغلاق اقتراح المنتج' : 'المنتج غير موجود؟ أرسله للمراجعة'}</Text>
            <Icon name={showProposeForm ? 'chevron-up-outline' : 'chevron-down-outline'} size={20} tone="muted" />
          </Pressable>
          {showProposeForm ? (
            <View style={{ gap: spacing[3] }}>
              <Text role="caption" tone="muted" style={{ textAlign: 'right' }}>
                الاقتراح لا يصبح منتجًا قابلًا للبيع حتى تعتمده إدارة الكتالوج المركزي.
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing[2], flexDirection: 'row-reverse' }}>
                {activeDomains.map((domain) => (
                  <Button
                    key={domain.id}
                    label={domain.nameAr}
                    size="sm"
                    pill
                    tone={proposeDomainId === domain.id ? 'primary' : 'ghost'}
                    onPress={() => { setProposeDomainId(domain.id); setProposeNodeId(''); setProposeError(undefined); }}
                  />
                ))}
              </ScrollView>
              {proposeDomainId && proposeNodes.length ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing[2], flexDirection: 'row-reverse' }}>
                  <Button label="بدون فئة فرعية" size="sm" pill tone={proposeNodeId ? 'ghost' : 'primary'} onPress={() => setProposeNodeId('')} />
                  {proposeNodes.map((node) => (
                    <Button key={node.id} label={node.nameAr} size="sm" pill tone={proposeNodeId === node.id ? 'primary' : 'ghost'} onPress={() => setProposeNodeId(node.id)} />
                  ))}
                </ScrollView>
              ) : null}
              {proposeError ? <Text role="bodySm" tone="danger" style={{ textAlign: 'right' }}>{proposeError}</Text> : null}
              <TextField label="اسم المنتج بالعربية" value={proposeNameAr} onChangeText={setProposeNameAr} />
              <TextField label="اسم المنتج بالإنجليزية" value={proposeNameEn} onChangeText={setProposeNameEn} placeholder="اختياري" />
              <TextField label="العلامة التجارية" value={proposeBrand} onChangeText={setProposeBrand} placeholder="اختياري" />
              <Button label="إرسال الاقتراح للمراجعة" tone="primary" onPress={() => void handlePropose()} disabled={actionState.kind === 'submitting'} />
            </View>
          ) : null}
        </View>

        {proposals.length ? (
          <View style={{ gap: spacing[2] }}>
            <Text role="bodyStrong" style={{ textAlign: 'right' }}>{`الاقتراحات المرسلة (${proposals.length})`}</Text>
            {proposals.map((proposal) => (
              <View key={proposal.id} style={{ padding: spacing[3], borderWidth: borders.hairline, borderColor: colorRoles.borderSubtle, borderRadius: radius.md, flexDirection: 'row-reverse', gap: spacing[2] }}>
                <Text role="bodyStrong" style={{ flex: 1, textAlign: 'right' }}>{proposal.proposedNameAr}</Text>
                <Badge label="قيد المراجعة" tone="warning" />
              </View>
            ))}
          </View>
        ) : null}
      </ScrollView>

      <View style={{ padding: spacing[3], paddingBottom: spacing[3] + insets.bottom, borderTopWidth: 1, borderTopColor: colorRoles.borderSubtle, backgroundColor: colorRoles.surfaceBase, gap: spacing[2] }}>
        {selectedIds.size > 0 ? (
          <Button
            label={actionState.kind === 'submitting' ? 'جارٍ حفظ المجموعة…' : `حفظ ${selectedIds.size} منتج`}
            tone="primary"
            onPress={() => void handleBatchSave()}
            disabled={actionState.kind === 'submitting'}
            fullWidth
          />
        ) : null}
        <Button label="رجوع" tone="secondary" onPress={onBack} fullWidth />
      </View>
    </View>
  );
}
