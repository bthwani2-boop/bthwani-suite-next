// app-field — DshFieldPartnerProductsScreen
// Trial products the field agent collects for a partner's auto-created draft
// store while onboarding. Prices here are local reference text for display
// within the DSH catalog only — never a real WLT financial link.
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
import { useFieldPartnerProductsController } from '../../shared/partner';

export type DshFieldPartnerProductsScreenProps = {
  readonly partnerId: string;
  readonly onBack: () => void;
};

export function DshFieldPartnerProductsScreen({ partnerId, onBack }: DshFieldPartnerProductsScreenProps) {
  const insets = useSafeAreaInsets();
  const { state, actionState, createProduct, updateProduct } = useFieldPartnerProductsController(partnerId);

  const [newProductName, setNewProductName] = React.useState('');
  const [newProductPrice, setNewProductPrice] = React.useState('');
  const [errorName, setErrorName] = React.useState<string | undefined>(undefined);
  const [errorPrice, setErrorPrice] = React.useState<string | undefined>(undefined);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editPrice, setEditPrice] = React.useState('');

  const handleAddProduct = async () => {
    if (!newProductName.trim()) {
      setErrorName('اسم المنتج مطلوب لإضافته للقائمة');
      return;
    }
    setErrorName(undefined);

    if (!newProductPrice.trim()) {
      setErrorPrice('السعر المرجعي مطلوب');
      return;
    }
    setErrorPrice(undefined);

    const ok = await createProduct({ name: newProductName.trim(), priceReference: newProductPrice.trim() });
    if (ok) {
      setNewProductName('');
      setNewProductPrice('');
    }
  };

  const handleSavePrice = async (productId: string) => {
    const product = state.kind === 'success' ? state.products.find((p) => p.id === productId) : undefined;
    if (!product) return;
    const ok = await updateProduct(productId, { name: product.name, priceReference: editPrice.trim() });
    if (ok) setEditingId(null);
  };

  if (state.kind === 'loading' || state.kind === 'idle') {
    return <StateView loading title="جاري تحميل منتجات الشريك…" />;
  }
  if (state.kind === 'error') {
    return <StateView tone="danger" title="تعذر التحميل" description={state.message} actionLabel="رجوع" onActionPress={onBack} />;
  }

  const items = state.products;

  return (
    <View style={{ flex: 1, backgroundColor: colorRoles.surfaceBase }}>
      <Header title="المنتجات التجريبية" subtitle="منتجات أوّلية للشريك أثناء الانضمام" />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: spacing[4], gap: spacing[4], paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ alignItems: 'flex-end', gap: spacing[1] }}>
          <Text role="caption" tone="muted" style={{ textAlign: 'right' }}>
            هذه منتجات تجريبية تدخل ضمن كتالوج الشريك ليراجعه قسم الشركاء لاحقاً، ولن تظهر لدى العميل قبل الاعتماد.
          </Text>
        </View>

        <View style={{ height: 1, backgroundColor: colorRoles.borderSubtle }} />

        <View style={{ backgroundColor: colorRoles.surfaceMuted, padding: spacing[3], borderRadius: radius.md, gap: spacing[3] }}>
          <Text role="titleSm" style={{ textAlign: 'right', fontWeight: 'bold' }}>إضافة منتج جديد</Text>

          <TextField
            label="اسم المنتج"
            value={newProductName}
            onChangeText={(val) => {
              setNewProductName(val);
              if (val.trim()) setErrorName(undefined);
            }}
            {...(errorName ? { error: errorName } : {})}
            placeholder="مثال: برجر دجاج كلاسيك، حليب طازج"
          />

          <TextField
            label="السعر المرجعي (وصفي)"
            value={newProductPrice}
            onChangeText={(val) => {
              setNewProductPrice(val);
              if (val.trim()) setErrorPrice(undefined);
            }}
            {...(errorPrice ? { error: errorPrice } : {})}
            placeholder="مثال: حوالي 1500 ريال حسب الشريك"
          />

          <Button
            label="إضافة المنتج للقائمة"
            tone="primary"
            onPress={() => void handleAddProduct()}
            disabled={actionState.kind === 'submitting'}
            style={{ marginTop: spacing[2] }}
          />
        </View>

        <View style={{ gap: spacing[3] }}>
          <View style={{ gap: spacing[1], alignItems: 'flex-end' }}>
            <Text role="bodyStrong" style={{ textAlign: 'right' }}>
              {`المنتجات المضافة (${items.length})`}
            </Text>
          </View>

          {items.length === 0 ? (
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
                لا توجد منتجات مضافة بعد
              </Text>
            </View>
          ) : (
            <View style={{ gap: spacing[2] }}>
              {items.map((item) => (
                <View
                  key={item.id}
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
                      {item.name}
                    </Text>
                    {editingId !== item.id && (
                      <Pressable
                        onPress={() => {
                          setEditingId(item.id);
                          setEditPrice(item.priceReference);
                        }}
                      >
                        <Icon name="pencil-outline" size={18} tone="muted" />
                      </Pressable>
                    )}
                  </View>

                  {editingId === item.id ? (
                    <View style={{ gap: spacing[2] }}>
                      <TextField value={editPrice} onChangeText={setEditPrice} placeholder="السعر المرجعي" />
                      <View style={{ flexDirection: 'row-reverse', gap: spacing[2] }}>
                        <Button label="حفظ" tone="success" onPress={() => void handleSavePrice(item.id)} disabled={actionState.kind === 'submitting'} />
                        <Button label="إلغاء" tone="ghost" onPress={() => setEditingId(null)} />
                      </View>
                    </View>
                  ) : (
                    <Text role="bodySm" tone="success" style={{ textAlign: 'right' }}>
                      {item.priceReference}
                    </Text>
                  )}
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

export default DshFieldPartnerProductsScreen;
