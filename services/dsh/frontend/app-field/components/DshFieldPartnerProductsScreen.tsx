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
  const [proposeImageKey, setProposeImageKey] = React.useState('');
  const [proposeError, setProposeError] = React.useState<string | undefined>(undefined);
  // The proposal form's domain/node choice is intentionally decoupled from
  // selectedDomainId/selectedNodeId (which drive browsing/search below). The
  // proposal form must start with no domain selected and force an explicit
  // choice — it must never inherit the auto-selected browsing domain.
  const [proposeDomainId, setProposeDomainId] = React.useState('');
  const [proposeNodeId, setProposeNodeId] = React.useState('');

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

  const startProposeWithSearch = () => {
    setProposeNameAr(searchText.trim());
    setProposeDomainId(selectedDomainId); // Pre-select current domain for convenience
    setProposeNodeId(selectedNodeId);
    setShowProposeForm(true);
  };

  const handlePropose = async () => {
    if (!proposeNameAr.trim()) {
      setProposeError('اسم المنتج مطلوب لإرسال الاقتراح');
      return;
    }
    if (!proposeDomainId) {
      setProposeError('اختر القسم أولاً');
      return;
    }
    setProposeError(undefined);

    // Only send a node that actually belongs to the chosen proposal domain
    const matchedNode = proposeNodes.find((node) => node.id === proposeNodeId);
    const categoryNodeId = matchedNode && matchedNode.domainId === proposeDomainId ? matchedNode.id : null;

    const proposal = await proposeNewProduct({
      proposedNameAr: proposeNameAr.trim(),
      proposedNameEn: proposeNameEn.trim(),
      domainId: proposeDomainId,
      categoryNodeId,
      brand: proposeBrand.trim(),
      barcode: null,
      imageObjectKey: proposeImageKey.trim() || null,
    });
    if (proposal) {
      setProposeNameAr('');
      setProposeNameEn('');
      setProposeBrand('');
      setProposeImageKey('');
      setProposeDomainId('');
      setProposeNodeId('');
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
  const activeDomains = taxonomyState.kind === 'success' ? taxonomyState.domains.filter((d) => d.isActive) : [];
  const proposeNodes = taxonomyState.kind === 'success'
    ? taxonomyState.nodes.filter((node) => node.domainId === proposeDomainId && node.isActive)
    : [];

  return (
    <View style={{ flex: 1, backgroundColor: colorRoles.surfaceBase }}>
      <Header title="منتجات المتجر" subtitle="اختر من كتالوج المنصة الموحّد أو اقترح منتجاً جديداً" />

      {/* ── Search Input (Always at top, sticky outside ScrollView) ── */}
      <View style={{ padding: spacing[4], paddingBottom: spacing[2], gap: spacing[2], borderBottomWidth: 1, borderBottomColor: colorRoles.borderSubtle, backgroundColor: colorRoles.surfaceBase, zIndex: 10 }}>
        <View style={{ flexDirection: 'row-reverse', gap: spacing[2], alignItems: 'flex-end' }}>
          <View style={{ flex: 1 }}>
            <TextField
              label="بحث في منتجات الكتالوج"
              value={searchText}
              onChangeText={setSearchText}
              placeholder="ابحث بالاسم أو الباركود"
            />
          </View>
          <Button label="بحث" tone="secondary" onPress={() => void handleSearch()} disabled={masterProductsState.kind === 'loading'} />
        </View>
        <Text role="caption" tone="muted" style={{ textAlign: 'right' }}>
          اربط منتجات المتجر بكتالوج المنصة الموحّد. المنتجات ستُضاف لمتجر الشريك.
        </Text>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: spacing[4], gap: spacing[4], paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Horizontal Taxonomy Chips ── */}
        <View style={{ gap: spacing[3] }}>
          {taxonomyState.kind === 'error' ? (
            <StateView tone="danger" title="تعذر تحميل الفئات المركزية" description={taxonomyState.message} />
          ) : taxonomyState.kind === 'success' ? (
            <View style={{ gap: spacing[3] }}>
              <View style={{ gap: spacing[2] }}>
                <Text role="bodyStrong" style={{ textAlign: 'right', color: colorRoles.textPrimary }}>المجال المركزي</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing[2], flexDirection: 'row-reverse', paddingHorizontal: 2 }}>
                  {taxonomyState.domains.filter((domain) => domain.isActive).map((domain) => (
                    <Button
                      key={domain.id}
                      label={domain.nameAr}
                      size="sm"
                      pill={true}
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
                </ScrollView>
              </View>

              {visibleNodes.length > 0 && (
                <View style={{ gap: spacing[2] }}>
                  <Text role="bodyStrong" style={{ textAlign: 'right', color: colorRoles.textPrimary }}>الفئة المركزية</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing[2], flexDirection: 'row-reverse', paddingHorizontal: 2 }}>
                    <Button
                      label="الكل"
                      size="sm"
                      pill={true}
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
                        size="sm"
                        pill={true}
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
                  </ScrollView>
                </View>
              )}
            </View>
          ) : null}
        </View>

        <View style={{ height: 1, backgroundColor: colorRoles.borderSubtle }} />

        {/* ── Product List ── */}
        <View style={{ gap: spacing[3] }}>
          <View style={{ flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text role="bodyStrong" style={{ textAlign: 'right', color: colorRoles.textPrimary }}>
              {`منتجات الكتالوج (${masterProducts.length})`}
            </Text>
          </View>

          {masterProductsState.kind === 'loading' ? (
            <StateView loading title="جاري البحث…" />
          ) : masterProducts.length === 0 ? (
            <View
              style={{
                paddingVertical: spacing[5],
                paddingHorizontal: spacing[4],
                gap: spacing[4],
                borderWidth: 1.5,
                borderStyle: 'dashed',
                borderColor: colorRoles.borderStrong,
                borderRadius: radius.md,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: colorRoles.surfaceMuted,
              }}
            >
              <Icon name="search-outline" size={32} tone="muted" />
              <View style={{ alignItems: 'center', gap: spacing[1] }}>
                <Text role="bodyStrong" tone="muted" style={{ textAlign: 'center' }}>
                  لا توجد نتائج مطابقة في الكتالوج الموحد
                </Text>
                {searchText.trim() && (
                  <Text role="caption" tone="muted" style={{ textAlign: 'center' }}>
                    لم يتم العثور على "{searchText}"
                  </Text>
                )}
              </View>
              {searchText.trim() && (
                <Button 
                  label="اقترح كمنتج جديد" 
                  tone="primary" 
                  onPress={startProposeWithSearch} 
                  leading={<Icon name="add-circle-outline" size={18} />}
                />
              )}
            </View>
          ) : (
            <View style={{ gap: spacing[3] }}>
              {masterProducts.map((product) => {
                const linked = assortmentItems.find((a) => a.masterProductId === product.id);
                const isLinking = linkingId === product.id;
                return (
                  <View
                    key={product.id}
                    style={{
                      padding: spacing[3],
                      borderWidth: isLinking ? 2 : borders.hairline,
                      borderColor: isLinking ? colorRoles.borderStrong : colorRoles.borderSubtle,
                      borderRadius: radius.md,
                      backgroundColor: isLinking ? colorRoles.surfaceMuted : colorRoles.surfaceBase,
                      gap: spacing[2],
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 1 },
                      shadowOpacity: 0.05,
                      shadowRadius: 2,
                      elevation: 1,
                    }}
                  >
                    <View style={{ flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text role="bodyStrong" style={{ textAlign: 'right', color: colorRoles.textPrimary, flex: 1 }}>
                        {product.canonicalNameAr}
                      </Text>
                      {!isLinking && (
                        <Pressable onPress={() => startLinking(product)} style={{ padding: 4 }}>
                          <Icon name={linked ? 'pencil-outline' : 'add-circle-outline'} size={24} tone={linked ? 'brand' : 'muted'} />
                        </Pressable>
                      )}
                    </View>

                    {isLinking ? (
                      <View style={{ gap: spacing[3], marginTop: spacing[1] }}>
                        <TextField
                          label="السعر"
                          value={linkPrice}
                          onChangeText={setLinkPrice}
                          placeholder="مثال: 1500"
                          {...(linkError ? { error: linkError } : {})}
                        />
                        <TextField label="ملاحظة محلية" value={linkNote} onChangeText={setLinkNote} placeholder="اختياري" />
                        <View style={{ gap: spacing[2] }}>
                          <Text role="caption" style={{ textAlign: 'right' }}>حالة المخزون</Text>
                          <View style={{ flexDirection: 'row-reverse', gap: spacing[2], flexWrap: 'wrap' }}>
                            {(['in_stock', 'low_stock', 'out_of_stock'] as const).map((stock) => (
                              <Button
                                key={stock}
                                label={STOCK_STATUS_LABELS[stock]}
                                size="sm"
                                pill={true}
                                tone={linkStock === stock ? (stock === 'in_stock' ? 'success' : stock === 'low_stock' ? 'brand' : 'danger') : 'ghost'}
                                onPress={() => setLinkStock(stock)}
                              />
                            ))}
                          </View>
                        </View>
                        <View style={{ flexDirection: 'row-reverse', gap: spacing[2], paddingTop: spacing[2] }}>
                          <Button
                            label="حفظ الارتباط"
                            tone="primary"
                            onPress={() => void handleSaveLink(product.id)}
                            disabled={actionState.kind === 'submitting'}
                            style={{ flex: 1 }}
                          />
                          <Button label="إلغاء" tone="ghost" onPress={() => setLinkingId(null)} />
                        </View>
                      </View>
                    ) : linked ? (
                      <View style={{ gap: spacing[1] }}>
                        <Text role="bodySm" tone="success" style={{ textAlign: 'right', fontWeight: 'bold' }}>
                          {`${linked.unitPrice} ${linked.currency}`}
                        </Text>
                        <Text role="caption" tone="muted" style={{ textAlign: 'right' }}>
                          {STOCK_STATUS_LABELS[linked.stockStatus]}
                        </Text>
                      </View>
                    ) : (
                      <Text role="bodySm" tone="muted" style={{ textAlign: 'right' }}>
                        غير مرتبط لمتجر الشريك بعد
                      </Text>
                    )}
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {/* ── Proposal Form Card ── */}
        <View style={{ height: 1, backgroundColor: colorRoles.borderSubtle, marginVertical: spacing[2] }} />

        <View style={{ backgroundColor: colorRoles.surfaceMuted, padding: spacing[4], borderRadius: radius.lg, gap: spacing[3], borderWidth: borders.hairline, borderColor: colorRoles.borderSubtle }}>
          <Pressable onPress={() => setShowProposeForm((v) => !v)} style={{ flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text role="bodyStrong" style={{ textAlign: 'right', color: colorRoles.textPrimary }}>
              {showProposeForm ? 'إلغاء اقتراح منتج جديد' : 'المنتج غير موجود؟ اقترح منتجاً جديداً'}
            </Text>
            <Icon name={showProposeForm ? 'chevron-up-outline' : 'chevron-down-outline'} size={20} tone="muted" />
          </Pressable>

          {showProposeForm && (
            <View style={{ gap: spacing[3], marginTop: spacing[2] }}>
              <Text role="caption" tone="muted" style={{ textAlign: 'right' }}>
                يُرسل الاقتراح لمراجعة قسم الكتالوج ولا يمكن إضافته للمتجر مباشرة قبل اعتماده من الإدارة.
              </Text>

              <View style={{ gap: spacing[2] }}>
                <Text role="bodyStrong" style={{ textAlign: 'right' }}>القسم *</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing[2], flexDirection: 'row-reverse' }}>
                  {activeDomains.map((domain) => (
                    <Button
                      key={domain.id}
                      label={domain.nameAr}
                      size="sm"
                      pill={true}
                      tone={proposeDomainId === domain.id ? 'primary' : 'ghost'}
                      onPress={() => {
                        setProposeDomainId(domain.id);
                        setProposeNodeId('');
                        if (domain.id) setProposeError(undefined);
                      }}
                    />
                  ))}
                </ScrollView>
              </View>

              {proposeDomainId && proposeNodes.length > 0 && (
                <View style={{ gap: spacing[2] }}>
                  <Text role="bodyStrong" style={{ textAlign: 'right' }}>الفئة (اختياري)</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing[2], flexDirection: 'row-reverse' }}>
                    <Button
                      label="بدون فئة محددة"
                      size="sm"
                      pill={true}
                      tone={proposeNodeId ? 'ghost' : 'primary'}
                      onPress={() => setProposeNodeId('')}
                    />
                    {proposeNodes.map((node) => (
                      <Button
                        key={node.id}
                        label={node.nameAr}
                        size="sm"
                        pill={true}
                        tone={proposeNodeId === node.id ? 'primary' : 'ghost'}
                        onPress={() => setProposeNodeId(node.id)}
                      />
                    ))}
                  </ScrollView>
                </View>
              )}

              {proposeError && (
                <Text role="bodySm" tone="danger" style={{ textAlign: 'right', backgroundColor: colorRoles.surfaceMuted, padding: spacing[2], borderRadius: radius.sm }}>
                  {proposeError}
                </Text>
              )}

              <TextField
                label="اسم المنتج (عربي)"
                value={proposeNameAr}
                onChangeText={(val) => {
                  setProposeNameAr(val);
                  if (val.trim()) setProposeError(undefined);
                }}
                placeholder="مثال: برجر دجاج كلاسيك"
              />
              <TextField
                label="اسم المنتج (إنجليزي)"
                value={proposeNameEn}
                onChangeText={setProposeNameEn}
                placeholder="اختياري"
              />
              <TextField label="العلامة التجارية" value={proposeBrand} onChangeText={setProposeBrand} placeholder="اختياري" />
              <TextField
                label="معرف الصورة في DAM (اختياري)"
                value={proposeImageKey}
                onChangeText={setProposeImageKey}
                placeholder="Asset ID من الكاميرا / مكتبة DAM"
              />
              <Button
                label="إرسال الاقتراح للمراجعة"
                tone="primary"
                onPress={() => void handlePropose()}
                disabled={actionState.kind === 'submitting'}
              />
            </View>
          )}
        </View>

        {/* ── Proposals List ── */}
        {proposals.length > 0 && (
          <View style={{ gap: spacing[2], marginTop: spacing[2] }}>
            <Text role="bodyStrong" style={{ textAlign: 'right' }}>
              {`الاقتراحات المرسلة (${proposals.length})`}
            </Text>
            {proposals.map((proposal) => (
              <View
                key={proposal.id}
                style={{
                  padding: spacing[3],
                  borderWidth: borders.hairline,
                  borderColor: colorRoles.borderSubtle,
                  borderRadius: radius.md,
                  backgroundColor: colorRoles.surfaceBase,
                  flexDirection: 'row-reverse',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <Text role="bodyStrong" style={{ textAlign: 'right', flex: 1 }}>{proposal.proposedNameAr}</Text>
                <View style={{ backgroundColor: colorRoles.surfaceMuted, paddingHorizontal: spacing[2], paddingVertical: 2, borderRadius: radius.round }}>
                  <Text role="caption" tone="action" style={{ textAlign: 'right', fontWeight: 'bold' }}>مُرسل للمراجعة</Text>
                </View>
              </View>
            ))}
          </View>
        )}
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
        <Button label="رجوع للوراء" tone="secondary" onPress={onBack} style={{ width: '100%' }} />
      </View>
    </View>
  );
}
