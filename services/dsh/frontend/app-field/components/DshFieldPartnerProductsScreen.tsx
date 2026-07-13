// app-field — DshFieldPartnerProductsScreen
// Lets the field agent stock a partner's auto-created draft store from the
// sovereign central catalog: browse taxonomy + master products, link a
// chosen master product to the store's assortment (price/availability/stock
// status only — never a free-form name or price), and propose a new master
// product when nothing matches. Proposals are submitted for review and are
// never immediately addable to the store — a proposal only becomes linkable
// once catalog governance adopts it into a master product.
import React from 'react';
import { Pressable, View, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
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

const STOCK_STATUS_LABELS: Record<'in_stock' | 'low_stock' | 'out_of_stock', string> = {
  in_stock: 'متوفر',
  low_stock: 'متوفر بكمية محدودة',
  out_of_stock: 'غير متوفر',
};

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
    linkMasterProduct,
    proposeNewProduct,
  } = useFieldCatalogController(partnerId);

  const [searchText, setSearchText] = React.useState('');
  const [selectedDomainId, setSelectedDomainId] = React.useState('');
  const [selectedNodeId, setSelectedNodeId] = React.useState('');
  const [linkingId, setLinkingId] = React.useState<string | null>(null);
  const [linkPrice, setLinkPrice] = React.useState('');
  const [linkNote, setLinkNote] = React.useState('');
  const [linkStock, setLinkStock] = React.useState<'in_stock' | 'low_stock' | 'out_of_stock'>('in_stock');
  const [linkError, setLinkError] = React.useState<string | undefined>(undefined);

  const [showProposeForm, setShowProposeForm] = React.useState(false);
  const [proposeNameAr, setProposeNameAr] = React.useState('');
  const [proposeNameEn, setProposeNameEn] = React.useState('');
  const [proposeBrand, setProposeBrand] = React.useState('');
  const [proposeError, setProposeError] = React.useState<string | undefined>(undefined);

  React.useEffect(() => {
    if (taxonomyState.kind === 'success' && !selectedDomainId) {
      const firstDomainId = taxonomyState.domains.filter(d => d.isActive)[0]?.id ?? '';
      setSelectedDomainId(firstDomainId);
      if (firstDomainId) {
        void searchMasterProducts({ domainId: firstDomainId });
      } else {
        void searchMasterProducts();
      }
    }
  }, [taxonomyState, selectedDomainId, searchMasterProducts]);

  const handleSearch = async () => {
    await searchMasterProducts({
      ...(searchText.trim() ? { search: searchText.trim() } : {}),
      ...(selectedDomainId ? { domainId: selectedDomainId } : {}),
      ...(selectedNodeId ? { categoryNodeId: selectedNodeId } : {}),
    });
  };

  const startLinking = (product: MasterProduct) => {
    const existing = assortmentItems.find((a) => a.masterProductId === product.id);
    setLinkingId(product.id);
    setLinkPrice(existing ? String(existing.unitPrice) : '');
    setLinkNote(existing?.localNote ?? '');
    setLinkStock(existing?.stockStatus ?? 'in_stock');
    setLinkError(undefined);
  };

  const handleSaveLink = async (masterProductId: string) => {
    const priceNumber = Number(linkPrice.trim());
    if (!linkPrice.trim() || Number.isNaN(priceNumber) || priceNumber < 0) {
      setLinkError('أدخل سعراً صحيحاً');
      return;
    }
    setLinkError(undefined);

    const ok = await linkMasterProduct(masterProductId, {
      unitPrice: priceNumber,
      currency: 'YER',
      available: linkStock !== 'out_of_stock',
      stockStatus: linkStock,
      localNote: linkNote.trim(),
    });
    if (ok) setLinkingId(null);
  };

  const handlePropose = async () => {
    if (!proposeNameAr.trim()) {
      setProposeError('اسم المنتج مطلوب لإرسال الاقتراح');
      return;
    }
    setProposeError(undefined);

    const domainId = selectedDomainId;
    if (!domainId) {
      setProposeError('لا يوجد تصنيف متاح حالياً لإرسال الاقتراح');
      return;
    }

    const proposal = await proposeNewProduct({
      proposedNameAr: proposeNameAr.trim(),
      proposedNameEn: proposeNameEn.trim(),
      domainId,
      categoryNodeId: selectedNodeId || null,
      brand: proposeBrand.trim(),
      barcode: null,
    });
    if (proposal) {
      setProposeNameAr('');
      setProposeNameEn('');
      setProposeBrand('');
      setShowProposeForm(false);
    }
  };

  if (storeState.kind === 'loading' || storeState.kind === 'idle') {
    return <StateView loading title="جاري تحميل متجر الشريك…" />;
  }
  if (storeState.kind === 'error') {
    return <StateView tone="danger" title="تعذر التحميل" description={storeState.message} actionLabel="رجوع" onActionPress={onBack} />;
  }

  const masterProducts = masterProductsState.kind === 'success' ? masterProductsState.items : [];
  const visibleNodes = taxonomyState.kind === 'success'
    ? taxonomyState.nodes.filter((node) => node.domainId === selectedDomainId && node.isActive)
    : [];

  return (
    <View style={{ flex: 1, backgroundColor: colorRoles.surfaceBase }}>
      <Header title="منتجات المتجر" subtitle="اختر من كتالوج المنصة الموحّد أو اقترح منتجاً جديداً" />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: spacing[4], gap: spacing[4], paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ alignItems: 'flex-end', gap: spacing[1] }}>
          <Text role="caption" tone="muted" style={{ textAlign: 'right' }}>
            اربط منتجات المتجر بكتالوج المنصة الموحّد. لن تظهر هذه المنتجات لدى العميل قبل اعتماد كتالوج المتجر.
          </Text>
        </View>

        <View style={{ height: 1, backgroundColor: colorRoles.borderSubtle }} />

        <View style={{ gap: spacing[2] }}>
          {taxonomyState.kind === 'error' ? (
            <StateView tone="danger" title="تعذر تحميل الفئات المركزية" description={taxonomyState.message} />
          ) : taxonomyState.kind === 'success' ? (
            <>
              <Text role="bodyStrong" style={{ textAlign: 'right' }}>المجال المركزي</Text>
              {taxonomyState.domains.filter((domain) => domain.isActive).map((domain) => (
                <Button
                  key={domain.id}
                  label={domain.nameAr}
                  tone={selectedDomainId === domain.id ? 'primary' : 'ghost'}
                  onPress={() => {
                    setSelectedDomainId(domain.id);
                    setSelectedNodeId('');
                    void searchMasterProducts({
                      domainId: domain.id,
                      ...(searchText.trim() ? { search: searchText.trim() } : {}),
                    });
                  }}
                />
              ))}
              {visibleNodes.length > 0 && (
                <>
                  <Text role="bodyStrong" style={{ textAlign: 'right' }}>الفئة المركزية</Text>
                  <Button
                    label="كل فئات المجال"
                    tone={selectedNodeId ? 'ghost' : 'primary'}
                    onPress={() => {
                      setSelectedNodeId('');
                      void searchMasterProducts({
                        domainId: selectedDomainId,
                        ...(searchText.trim() ? { search: searchText.trim() } : {}),
                      });
                    }}
                  />
                  {visibleNodes.map((node) => (
                    <Button
                      key={node.id}
                      label={node.nameAr}
                      tone={selectedNodeId === node.id ? 'primary' : 'ghost'}
                      onPress={() => {
                        setSelectedNodeId(node.id);
                        void searchMasterProducts({
                          domainId: selectedDomainId,
                          categoryNodeId: node.id,
                          ...(searchText.trim() ? { search: searchText.trim() } : {}),
                        });
                      }}
                    />
                  ))}
                </>
              )}
            </>
          ) : null}
          <TextField
            label="بحث في منتجات الكتالوج"
            value={searchText}
            onChangeText={setSearchText}
            placeholder="ابحث بالاسم أو الباركود"
          />
          <Button label="بحث" tone="secondary" onPress={() => void handleSearch()} disabled={masterProductsState.kind === 'loading'} />
        </View>

        <View style={{ gap: spacing[3] }}>
          <View style={{ gap: spacing[1], alignItems: 'flex-end' }}>
            <Text role="bodyStrong" style={{ textAlign: 'right' }}>
              {`منتجات الكتالوج (${masterProducts.length})`}
            </Text>
          </View>

          {masterProductsState.kind === 'loading' ? (
            <StateView loading title="جاري البحث…" />
          ) : masterProducts.length === 0 ? (
            <View
              style={{
                paddingVertical: spacing[4],
                gap: spacing[2],
                borderWidth: 1.5,
                borderStyle: 'dashed',
                borderColor: colorRoles.borderStrong,
                borderRadius: radius.md,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon name="basket-outline" size={32} tone="muted" />
              <Text role="bodyStrong" tone="muted" style={{ textAlign: 'center' }}>
                لا توجد نتائج مطابقة
              </Text>
            </View>
          ) : (
            <View style={{ gap: spacing[2] }}>
              {masterProducts.map((product) => {
                const linked = assortmentItems.find((a) => a.masterProductId === product.id);
                return (
                  <View
                    key={product.id}
                    style={{
                      padding: spacing[3],
                      borderWidth: borders.hairline,
                      borderColor: colorRoles.borderStrong,
                      borderRadius: radius.sm,
                      backgroundColor: colorRoles.surfaceBase,
                      gap: spacing[2],
                    }}
                  >
                    <View style={{ flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text role="bodyStrong" style={{ textAlign: 'right', color: colorRoles.textPrimary }}>
                        {product.canonicalNameAr}
                      </Text>
                      {linkingId !== product.id && (
                        <Pressable onPress={() => startLinking(product)}>
                          <Icon name={linked ? 'pencil-outline' : 'add-circle-outline'} size={18} tone="muted" />
                        </Pressable>
                      )}
                    </View>

                    {linkingId === product.id ? (
                      <View style={{ gap: spacing[2] }}>
                        <TextField
                          label="السعر"
                          value={linkPrice}
                          onChangeText={setLinkPrice}
                          placeholder="مثال: 1500"
                          {...(linkError ? { error: linkError } : {})}
                        />
                        <TextField label="ملاحظة محلية" value={linkNote} onChangeText={setLinkNote} placeholder="اختياري" />
                        <View style={{ flexDirection: 'row-reverse', gap: spacing[2] }}>
                          {(['in_stock', 'low_stock', 'out_of_stock'] as const).map((stock) => (
                            <Pressable key={stock} onPress={() => setLinkStock(stock)}>
                              <Text
                                role="bodySm"
                                tone={linkStock === stock ? 'success' : 'muted'}
                                style={{ textAlign: 'right', fontWeight: linkStock === stock ? 'bold' : 'normal' }}
                              >
                                {STOCK_STATUS_LABELS[stock]}
                              </Text>
                            </Pressable>
                          ))}
                        </View>
                        <View style={{ flexDirection: 'row-reverse', gap: spacing[2] }}>
                          <Button
                            label="حفظ"
                            tone="success"
                            onPress={() => void handleSaveLink(product.id)}
                            disabled={actionState.kind === 'submitting'}
                          />
                          <Button label="إلغاء" tone="ghost" onPress={() => setLinkingId(null)} />
                        </View>
                      </View>
                    ) : linked ? (
                      <View style={{ gap: spacing[1] }}>
                        <Text role="bodySm" tone="success" style={{ textAlign: 'right' }}>
                          {`${linked.unitPrice} ${linked.currency}`}
                        </Text>
                        <Text role="caption" tone="muted" style={{ textAlign: 'right' }}>
                          {STOCK_STATUS_LABELS[linked.stockStatus]}
                        </Text>
                      </View>
                    ) : (
                      <Text role="bodySm" tone="muted" style={{ textAlign: 'right' }}>
                        غير مضاف لمتجر الشريك بعد
                      </Text>
                    )}
                  </View>
                );
              })}
            </View>
          )}
        </View>

        <View style={{ height: 1, backgroundColor: colorRoles.borderSubtle }} />

        <View style={{ backgroundColor: colorRoles.surfaceMuted, padding: spacing[3], borderRadius: radius.md, gap: spacing[3] }}>
          <Pressable onPress={() => setShowProposeForm((v) => !v)}>
            <Text role="titleSm" style={{ textAlign: 'right', fontWeight: 'bold' }}>
              {showProposeForm ? 'إلغاء اقتراح منتج جديد' : 'المنتج غير موجود؟ اقترح منتجاً جديداً'}
            </Text>
          </Pressable>

          {showProposeForm && (
            <View style={{ gap: spacing[2] }}>
              <Text role="caption" tone="muted" style={{ textAlign: 'right' }}>
                يُرسل الاقتراح لمراجعة قسم الكتالوج ولا يمكن إضافته للمتجر مباشرة قبل اعتماده.
              </Text>
              <TextField
                label="اسم المنتج (عربي)"
                value={proposeNameAr}
                onChangeText={(val) => {
                  setProposeNameAr(val);
                  if (val.trim()) setProposeError(undefined);
                }}
                {...(proposeError ? { error: proposeError } : {})}
                placeholder="مثال: برجر دجاج كلاسيك"
              />
              <TextField
                label="اسم المنتج (إنجليزي)"
                value={proposeNameEn}
                onChangeText={setProposeNameEn}
                placeholder="اختياري"
              />
              <TextField label="العلامة التجارية" value={proposeBrand} onChangeText={setProposeBrand} placeholder="اختياري" />
              <Button
                label="إرسال الاقتراح للمراجعة"
                tone="primary"
                onPress={() => void handlePropose()}
                disabled={actionState.kind === 'submitting'}
              />
            </View>
          )}

          {proposals.length > 0 && (
            <View style={{ gap: spacing[2] }}>
              <Text role="bodyStrong" style={{ textAlign: 'right' }}>
                {`الاقتراحات المرسلة (${proposals.length})`}
              </Text>
              {proposals.map((proposal) => (
                <View
                  key={proposal.id}
                  style={{
                    padding: spacing[2],
                    borderWidth: borders.hairline,
                    borderColor: colorRoles.borderSubtle,
                    borderRadius: radius.sm,
                  }}
                >
                  <Text role="bodySm" style={{ textAlign: 'right' }}>{proposal.proposedNameAr}</Text>
                  <Text role="caption" tone="muted" style={{ textAlign: 'right' }}>مُرسل للمراجعة</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      <View
        style={{
          padding: spacing[3],
          paddingBottom: spacing[3] + insets.bottom,
          borderTopWidth: 1,
          borderTopColor: colorRoles.borderSubtle,
          backgroundColor: colorRoles.surfaceBase,
        }}
      >
        <Button label="رجوع" tone="secondary" onPress={onBack} style={{ width: '100%' }} />
      </View>
    </View>
  );
}
