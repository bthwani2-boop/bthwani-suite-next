import React from 'react';
import { ScrollView } from 'react-native';
import {
  Box,
  Button,
  Chip,
  Divider,
  MobileStickyPrimaryAction,
  StateView,
  Text,
  TextField,
  resolveRowDirection,
  useDirection,
  useTheme,
  Surface,
  spacing,
} from '@bthwani/ui-kit';
import {
  type DshProductRecord,
  type DshCatalogOverrideInput,
} from '../../shared/catalog/dsh-product-api.client';
import { getDshProductRuntimeClient } from '../../shared/runtime/ui-only-runtime-clients';

export type ProductOverridesScreenProps = {
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

type OverridesFormState = {
  priceOverride: string;
  stockOverride: string;
  availableOverride: boolean;
};

export function ProductOverridesScreen({
  productId,
  onBack,
  onSaved,
}: ProductOverridesScreenProps) {
  const { direction } = useDirection();
  const { theme } = useTheme();

  const [screenState, setScreenState] = React.useState<ProductOverridesScreenState>('loading');
  const [product, setProduct] = React.useState<DshProductRecord | null>(null);
  const [form, setForm] = React.useState<OverridesFormState>({
    priceOverride: '',
    stockOverride: '',
    availableOverride: true,
  });
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  const client = React.useMemo(
    () => getDshProductRuntimeClient(),
    [],
  );

  const loadProduct = React.useCallback(async () => {
    setScreenState('loading');
    setErrorMessage(null);
    try {
      const record = await client.getProduct(productId);
      setProduct(record);
      setForm({
        priceOverride: record.price_override ?? '',
        stockOverride: record.stock_override !== undefined && record.stock_override !== null ? String(record.stock_override) : '',
        availableOverride: record.available_override ?? true,
      });
      setScreenState('form');
    } catch (err: unknown) {
      const isOffline =
        typeof err === 'object' &&
        err !== null &&
        (err as { kind?: unknown }).kind === 'offline';
      setErrorMessage(
        isOffline
          ? 'لا يوجد اتصال بالشبكة — تحقق من الاتصال وأعد المحاولة.'
          : 'تعذر تحميل تفاصيل المنتج لتعديل التجاوزات.',
      );
      setScreenState(isOffline ? 'offline' : 'error');
    }
  }, [client, productId]);

  React.useEffect(() => {
    loadProduct();
  }, [loadProduct]);

  const handleSave = React.useCallback(async () => {
    if (!product) return;
    setScreenState('saving');
    setErrorMessage(null);

    const priceOverrideTrimmed = form.priceOverride.trim();
    const stockOverrideTrimmed = form.stockOverride.trim();

    const priceOverride = priceOverrideTrimmed || undefined;
    const stockOverride = stockOverrideTrimmed ? parseInt(stockOverrideTrimmed, 10) : undefined;
    const availableOverride = form.availableOverride;

    const reqInput: DshCatalogOverrideInput = {
      product_id: productId,
      price_override: priceOverride,
      stock_override: stockOverride,
      available_override: availableOverride,
    };

    try {
      await client.updateCatalogOverrides(product.store_id, {
        overrides: [reqInput],
      });
      setScreenState('saved');
      onSaved?.();
    } catch (err: unknown) {
      const isOffline =
        typeof err === 'object' &&
        err !== null &&
        (err as { kind?: unknown }).kind === 'offline';
      setErrorMessage(
        isOffline
          ? 'لا يوجد اتصال بالشبكة — تعذر حفظ التجاوزات المحلية.'
          : 'فشل حفظ التجاوزات المحلية للمنتج. يرجى التحقق من المدخلات.',
      );
      setScreenState('error');
    }
  }, [client, form, product, productId, onSaved]);

  const handleRetry = React.useCallback(() => {
    loadProduct();
  }, [loadProduct]);

  const handleEditAgain = React.useCallback(() => {
    setScreenState('form');
  }, []);

  const isRTL = direction === 'rtl';

  if (screenState === 'loading') {
    return <StateView kind="loading" title="جارٍ تحميل تفاصيل الكتالوج والتجاوزات…" />;
  }

  if (screenState === 'offline') {
    return <StateView stateId="offline" actionLabel="إعادة المحاولة" onActionPress={handleRetry} />;
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
        {product && (
          <Surface tone="inset" padding={3} gap={2} radiusToken="md">
            <Text role="bodyStrong" align="start">هوية المنتج المركزي</Text>
            <Box style={{ flexDirection: resolveRowDirection(direction), gap: spacing[2], flexWrap: 'wrap' }}>
              <Chip label={product.name} selected />
              <Chip label={`السعر المركزي: ${product.base_price_label}`} />
              {product.sku && <Chip label={`SKU: ${product.sku}`} />}
            </Box>
            <Text role="caption" tone="muted" align="start" style={{ marginTop: spacing[1] }}>
              * هوية المنتج والوسائط مملوكة مركزياً للكتالوج. الأسعار والتوافر المعدلة هنا لا تؤثر على الكتالوج العام.
            </Text>
          </Surface>
        )}

        <Divider />

        {/* Error Banner */}
        {errorMessage && (
          <Surface tone="danger" padding={3} gap={2} radiusToken="md">
            <Text role="bodySm" tone="danger" align="start">{errorMessage}</Text>
            <Button label="إعادة المحاولة" tone="secondary" size="sm" fullWidth={false} onPress={handleRetry} />
          </Surface>
        )}

        {/* Success Confirmation */}
        {screenState === 'saved' && (
          <Surface tone="success" padding={3} gap={2} radiusToken="md">
            <Text role="bodyStrong" tone="success" align="start">تم حفظ التجاوزات المحلية بنجاح</Text>
            <Text role="bodySm" tone="muted" align="start">
              تنعكس التحديثات الحالية على منتجات هذا الفرع في واجهة المتجر.
            </Text>
            <Box style={{ flexDirection: resolveRowDirection(direction), gap: spacing[2] }}>
              <Button label="تعديل مجدداً" tone="secondary" size="sm" fullWidth={false} onPress={handleEditAgain} />
              {onBack && <Button label="العودة للكتالوج" tone="primary" size="sm" fullWidth={false} onPress={onBack} />}
            </Box>
          </Surface>
        )}

        {/* Form Fields */}
        {screenState !== 'saved' && (
          <Box gap={3}>
            <Text role="bodyStrong" align="start">القيم المحلية المعدلة</Text>

            <TextField
              label="تجاوز السعر المحلي (ر.ي)"
              value={form.priceOverride}
              onChangeText={(v) => setForm((prev) => ({ ...prev, priceOverride: v }))}
              placeholder="مثال: 15.00"
              keyboardType="decimal-pad"
              style={{ textAlign: 'left' }}
              editable={screenState !== 'saving'}
            />

            <TextField
              label="تجاوز كمية المخزون"
              value={form.stockOverride}
              onChangeText={(v) => setForm((prev) => ({ ...prev, stockOverride: v.replace(/[^0-9]/g, '') }))}
              placeholder="مثال: 100"
              keyboardType="numeric"
              style={{ textAlign: 'left' }}
              editable={screenState !== 'saving'}
            />

            <Box style={{ flexDirection: resolveRowDirection(direction), alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing[2] }}>
              <Box style={{ gap: 2 }}>
                <Text role="bodyStrong" align="start">حالة التوفر المحلية</Text>
                <Text role="caption" tone="muted" align="start">تحديد ما إذا كان هذا المنتج متاحاً للشراء في هذا الفرع</Text>
              </Box>
              <Button
                label={form.availableOverride ? 'متاح للطلب' : 'غير متوفر مؤقتاً'}
                tone={form.availableOverride ? 'success' : 'danger'}
                size="sm"
                fullWidth={false}
                disabled={screenState === 'saving'}
                onPress={() => setForm((prev) => ({ ...prev, availableOverride: !prev.availableOverride }))}
              />
            </Box>
          </Box>
        )}
      </Box>

      {/* Sticky Save Action */}
      {screenState !== 'saved' && (
        <MobileStickyPrimaryAction
          label={screenState === 'saving' ? 'جاري الحفظ والتحقق...' : 'حفظ التجاوزات المحلية'}
          helperText="سيتم حفظ هذه القيم لفرعك الحالي وتطبيقها مباشرة."
          disabled={screenState === 'saving'}
          onPress={handleSave}
        />
      )}
    </ScrollView>
  );
}

export default ProductOverridesScreen;
