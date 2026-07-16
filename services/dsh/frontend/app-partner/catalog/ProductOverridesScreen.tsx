import React from 'react';
import { ScrollView } from 'react-native';
import {
  Box,
  Button,
  StateView,
  Text,
  TextField,
  resolveRowDirection,
  useDirection,
  useTheme,
  Surface,
  spacing,
  Divider,
} from '@bthwani/ui-kit';
import { fetchPartnerStoreAssortment, upsertPartnerStoreAssortment, fetchPartnerMasterProducts } from '../../shared/catalog';
import type { StoreAssortment, MasterProduct } from '../../shared/catalog';

export type ProductOverridesScreenProps = {
  storeId: string;
  productId: string;
  onBack?: () => void;
  onSaved?: () => void;
};

export type ProductOverridesScreenState =
  | 'loading'
  | 'form'
  | 'saving'
  | 'saved'
  | 'error'
  | 'offline';

export function ProductOverridesScreen({
  storeId,
  productId,
  onBack,
  onSaved,
}: ProductOverridesScreenProps) {
  const { direction } = useDirection();
  const theme = useTheme() as any;

  const [screenState, setScreenState] = React.useState<ProductOverridesScreenState>('loading');
  const [assortment, setAssortment] = React.useState<StoreAssortment | null>(null);
  const [masterProduct, setMasterProduct] = React.useState<MasterProduct | null>(null);
  const [unitPrice, setUnitPrice] = React.useState('');
  const [stockStatus, setStockStatus] = React.useState<"in_stock" | "low_stock" | "out_of_stock">('in_stock');
  const [available, setAvailable] = React.useState(true);
  const [localNote, setLocalNote] = React.useState('');
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  const loadData = React.useCallback(async () => {
    setScreenState('loading');
    setErrorMessage(null);
    try {
      // 1. Fetch partner master products to find canonical name
      const masterProducts = await fetchPartnerMasterProducts({ search: productId, limit: 1 });
      const mp = masterProducts.find((p) => p.id === productId);
      if (mp) {
        setMasterProduct(mp);
      }

      // 2. Fetch partner assortment for storeId
      const assortments = await fetchPartnerStoreAssortment(storeId);
      const match = assortments.find((a) => a.masterProductId === productId);
      if (match) {
        setAssortment(match);
        setUnitPrice(String(match.unitPrice));
        setStockStatus(match.stockStatus);
        setAvailable(match.available);
        setLocalNote(match.localNote);
      } else {
        // Default values if no assortment exists yet
        setUnitPrice('0.00');
        setStockStatus('in_stock');
        setAvailable(true);
        setLocalNote('');
      }
      setScreenState('form');
    } catch (err: any) {
      setErrorMessage(err.message ?? 'تعذر تحميل تفاصيل المنتج والتجاوزات المحلية.');
      setScreenState('error');
    }
  }, [storeId, productId]);

  React.useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleSave = React.useCallback(async () => {
    setScreenState('saving');
    setErrorMessage(null);
    try {
      const priceNum = parseFloat(unitPrice) || 0.0;
      await upsertPartnerStoreAssortment(storeId, productId, {
        unitPrice: priceNum,
        currency: assortment?.currency ?? 'YER',
        available,
        stockStatus,
        localNote,
        customImageObjectKey: assortment?.customImageObjectKey ?? null,
        publicationStatus: assortment?.publicationStatus ?? 'client_visible',
      });
      setScreenState('saved');
      onSaved?.();
    } catch (err: any) {
      setErrorMessage(err.message ?? 'فشل حفظ التجاوزات المحلية للمنتج.');
      setScreenState('error');
    }
  }, [storeId, productId, unitPrice, available, stockStatus, localNote, assortment, onSaved]);

  if (screenState === 'loading') {
    return <StateView title="جارٍ تحميل تفاصيل الكتالوج والتجاوزات…" loading />;
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.background }}
      contentContainerStyle={{ paddingBottom: 160 }}
      keyboardShouldPersistTaps="handled"
    >
      <Box gap={4} style={{ padding: spacing[4] }}>
        {/* Header */}
        <Box style={{ flexDirection: resolveRowDirection(direction), alignItems: 'center', gap: spacing[3] }}>
          {onBack && (
            <Button label="رجوع" tone="ghost" size="sm" fullWidth={false} onPress={onBack} />
          )}
          <Box style={{ flex: 1, minWidth: 0 }}>
            <Text role="titleSm" align="start">تعديل الأسعار والتوفر</Text>
            <Text role="bodySm" tone="muted" align="start">
              تجاوز السعر وحالة التوفر والمخزون لفرع المتجر الحالي محلياً فقط.
            </Text>
          </Box>
        </Box>

        {/* Product Central Metadata View */}
        {masterProduct && (
          <Surface tone="inset" padding={3} gap={2} radiusToken="md">
            <Text role="bodyStrong" align="start">هوية المنتج المركزي</Text>
            <Box style={{ flexDirection: resolveRowDirection(direction), gap: spacing[2], flexWrap: 'wrap' }}>
              <Text role="bodySm" align="start">📦 {masterProduct.canonicalNameAr}</Text>
              {masterProduct.sku && <Text role="caption" tone="muted">SKU: {masterProduct.sku}</Text>}
            </Box>
          </Surface>
        )}

        <Divider />

        {/* Error Banner */}
        {errorMessage && (
          <Surface tone="danger" padding={3} radiusToken="md">
            <Text role="bodySm" tone="danger" align="start">{errorMessage}</Text>
            <Button label="إعادة المحاولة" tone="secondary" size="sm" fullWidth={false} onPress={loadData} />
          </Surface>
        )}

        {/* Success Confirmation */}
        {screenState === 'saved' && (
          <Surface tone="success" padding={3} radiusToken="md">
            <Text role="bodyStrong" tone="success" align="start">تم حفظ التجاوزات المحلية بنجاح</Text>
            {onBack && <Button label="العودة للكتالوج" tone="primary" size="sm" fullWidth={false} onPress={onBack} style={{ marginTop: spacing[2] }} />}
          </Surface>
        )}

        {/* Form Fields */}
        {screenState !== 'saved' && (
          <Box gap={3}>
            <Text role="bodyStrong" align="start">القيم المحلية المعدلة</Text>

            <TextField
              label="تجاوز السعر المحلي (ر.ي)"
              value={unitPrice}
              onChangeText={setUnitPrice}
              placeholder="مثال: 15.00"
              disabled={screenState === 'saving'}
            />

            <TextField
              label="ملاحظة محلية"
              value={localNote}
              onChangeText={setLocalNote}
              placeholder="مثال: عروض نهاية الأسبوع للفرع"
              disabled={screenState === 'saving'}
            />

            {/* Stock status toggles */}
            <Box gap={1}>
              <Text role="bodySm" tone="muted" align="start">حالة المخزون المحلية</Text>
              <Box style={{ flexDirection: 'row', gap: spacing[2] }}>
                <Button
                  label="متوفر"
                  tone={stockStatus === 'in_stock' ? 'primary' : 'secondary'}
                  size="sm"
                  onPress={() => setStockStatus('in_stock')}
                />
                <Button
                  label="منخفض"
                  tone={stockStatus === 'low_stock' ? 'primary' : 'secondary'}
                  size="sm"
                  onPress={() => setStockStatus('low_stock')}
                />
                <Button
                  label="نفد"
                  tone={stockStatus === 'out_of_stock' ? 'primary' : 'secondary'}
                  size="sm"
                  onPress={() => setStockStatus('out_of_stock')}
                />
              </Box>
            </Box>

            <Box style={{ flexDirection: resolveRowDirection(direction), alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing[2] }}>
              <Box style={{ gap: 2 }}>
                <Text role="bodyStrong" align="start">حالة التوفر المحلية</Text>
                <Text role="caption" tone="muted" align="start">تحديد ما إذا كان هذا المنتج متاحاً للطلب بالفرع</Text>
              </Box>
              <Button
                label={available ? 'متاح للطلب' : 'غير متوفر مؤقتاً'}
                tone={available ? 'success' : 'danger'}
                size="sm"
                fullWidth={false}
                disabled={screenState === 'saving'}
                onPress={() => setAvailable(!available)}
              />
            </Box>

            <Button
              label={screenState === 'saving' ? 'جاري الحفظ...' : 'حفظ التجاوزات'}
              tone="primary"
              disabled={screenState === 'saving'}
              onPress={handleSave}
            />
          </Box>
        )}
      </Box>
    </ScrollView>
  );
}