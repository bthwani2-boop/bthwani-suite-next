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
import {
  fetchPartnerAssortmentPauses,
  fetchPartnerStoreAssortment,
  fetchPartnerMasterProducts,
  pausePartnerStoreAssortment,
  resumePartnerStoreAssortment,
} from '../../shared/catalog';
import type { AssortmentPauseState, StoreAssortment, MasterProduct } from '../../shared/catalog';
import { InventoryConfigurationModal } from './InventoryConfigurationModal';
import { PriceConfigurationModal } from './PriceConfigurationModal';

export type ProductControlsScreenProps = {
  storeId: string;
  productId: string;
  onBack?: () => void;
  onSaved?: () => void;
};

export type ProductControlsScreenState =
  | 'loading'
  | 'form'
  | 'error';

export function ProductControlsScreen({
  storeId,
  productId,
  onBack,
  onSaved,
}: ProductControlsScreenProps) {
  const { direction } = useDirection();
  const theme = useTheme() as any;

  const [screenState, setScreenState] = React.useState<ProductControlsScreenState>('loading');
  const [assortment, setAssortment] = React.useState<StoreAssortment | null>(null);
  const [pauseState, setPauseState] = React.useState<AssortmentPauseState | null>(null);
  const [masterProduct, setMasterProduct] = React.useState<MasterProduct | null>(null);
  const [pauseReason, setPauseReason] = React.useState('');
  const [pausedUntil, setPausedUntil] = React.useState('');
  const [pauseSaving, setPauseSaving] = React.useState(false);
  const [inventoryVisible, setInventoryVisible] = React.useState(false);
  const [priceVisible, setPriceVisible] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  const loadData = React.useCallback(async () => {
    setScreenState('loading');
    setErrorMessage(null);
    try {
      const [masterProducts, assortments, pauses] = await Promise.all([
        fetchPartnerMasterProducts({ search: productId, limit: 1 }),
        fetchPartnerStoreAssortment(storeId),
        fetchPartnerAssortmentPauses(storeId),
      ]);
      setMasterProduct(masterProducts.find((product) => product.id === productId) ?? null);
      setAssortment(assortments.find((item) => item.masterProductId === productId) ?? null);
      const pause = pauses.find((item) => item.masterProductId === productId) ?? null;
      setPauseState(pause);
      setPauseReason(pause?.reason ?? '');
      setPausedUntil(pause?.pausedUntil ?? '');
      setScreenState('form');
    } catch (err: any) {
      setErrorMessage(err.message ?? 'تعذر تحميل بيانات التحكم canonical للمنتج.');
      setScreenState('error');
    }
  }, [storeId, productId]);

  React.useEffect(() => {
    void loadData();
  }, [loadData]);

  const handlePause = React.useCallback(async () => {
    if (!pauseState || pauseReason.trim().length < 3) {
      setErrorMessage('حمّل التشكيلة واكتب سبباً واضحاً للإيقاف المؤقت.');
      return;
    }
    setPauseSaving(true);
    setErrorMessage(null);
    try {
      const result = await pausePartnerStoreAssortment(storeId, productId, {
        reason: pauseReason.trim(),
        pausedUntil: pausedUntil.trim() || null,
        expectedVersion: pauseState.version,
      });
      setAssortment(result.assortment);
      setPauseState(result.pause);
      onSaved?.();
    } catch (err: any) {
      setErrorMessage(err.message ?? 'تعذر إيقاف المنتج مؤقتاً.');
      await loadData();
    } finally {
      setPauseSaving(false);
    }
  }, [loadData, onSaved, pauseReason, pauseState, pausedUntil, productId, storeId]);

  const handleResume = React.useCallback(async () => {
    if (!pauseState) return;
    setPauseSaving(true);
    setErrorMessage(null);
    try {
      const result = await resumePartnerStoreAssortment(storeId, productId, pauseState.version);
      setAssortment(result.assortment);
      setPauseState(result.pause);
      setPauseReason('');
      setPausedUntil('');
      onSaved?.();
    } catch (err: any) {
      setErrorMessage(err.message ?? 'تعذر استئناف المنتج.');
      await loadData();
    } finally {
      setPauseSaving(false);
    }
  }, [loadData, onSaved, pauseState, productId, storeId]);

  if (screenState === 'loading') {
    return <StateView title="جارٍ تحميل أدوات الكتالوج canonical…" loading />;
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.background }}
      contentContainerStyle={{ paddingBottom: 160 }}
      keyboardShouldPersistTaps="handled"
    >
      <Box gap={4} style={{ padding: spacing[4] }}>
        <Box style={{ flexDirection: resolveRowDirection(direction), alignItems: 'center', gap: spacing[3] }}>
          {onBack && <Button label="رجوع" tone="ghost" size="sm" fullWidth={false} onPress={onBack} />}
          <Box style={{ flex: 1, minWidth: 0 }}>
            <Text role="titleSm" align="start">أدوات المنتج canonical</Text>
            <Text role="bodySm" tone="muted" align="start">
              السعر والمخزون يداران من مواردهما المعيارية؛ هذه الشاشة لا تملك نسخة تجارية موازية.
            </Text>
          </Box>
        </Box>

        {masterProduct && (
          <Surface tone="inset" padding={3} gap={2} radiusToken="md">
            <Text role="bodyStrong" align="start">هوية المنتج المركزي</Text>
            <Box style={{ flexDirection: resolveRowDirection(direction), gap: spacing[2], flexWrap: 'wrap' }}>
              <Text role="bodySm" align="start">{masterProduct.canonicalNameAr}</Text>
              {masterProduct.sku && <Text role="caption" tone="muted">SKU: {masterProduct.sku}</Text>}
            </Box>
          </Surface>
        )}

        <Divider />

        {errorMessage && (
          <Surface tone="danger" padding={3} radiusToken="md">
            <Text role="bodySm" tone="danger" align="start">{errorMessage}</Text>
            <Button label="إعادة المحاولة" tone="secondary" size="sm" fullWidth={false} onPress={() => void loadData()} />
          </Surface>
        )}

        {!assortment ? (
          <StateView
            title="المنتج غير مضاف إلى المتجر"
            description="أضف المنتج من إدارة الكتالوج أولاً، ثم افتح أدواته canonical لإدارة السعر والمخزون."
            tone="warning"
          />
        ) : (
          <>
            <Surface tone="raised" padding={3} gap={3} radiusToken="md">
              <Text role="bodyStrong" align="start">إسقاطات العرض الحالية (قراءة فقط)</Text>
              <Text role="bodySm" tone="muted" align="start">
                السعر: {assortment.unitPrice} {assortment.currency} · التوفر: {assortment.available ? 'متاح' : 'غير متاح'} · المخزون: {assortment.stockStatus}
              </Text>
              <Text role="caption" tone="muted" align="start">هذه القيم projections يقرأها الخادم من موارد السعر والمخزون المعيارية.</Text>
              <Box style={{ flexDirection: 'row', gap: spacing[2], flexWrap: 'wrap' }}>
                <Button label="إدارة المخزون" tone="primary" size="sm" fullWidth={false} onPress={() => setInventoryVisible(true)} />
                <Button label="إدارة الأسعار" tone="secondary" size="sm" fullWidth={false} onPress={() => setPriceVisible(true)} />
              </Box>
            </Surface>

            <Surface tone={pauseState?.paused ? 'warning' : 'inset'} padding={3} gap={3} radiusToken="md">
              <Text role="bodyStrong" align="start">الإيقاف المؤقت التشغيلي</Text>
              <Text role="bodySm" tone="muted" align="start">
                {pauseState?.paused
                  ? `المنتج موقوف مؤقتاً: ${pauseState.reason}`
                  : 'المنتج غير موقوف مؤقتاً. يتطلب الإيقاف سبباً وإصداراً مطابقاً للحقيقة.'}
              </Text>
              {pauseState?.pausedUntil ? <Text role="caption" tone="muted">حتى: {pauseState.pausedUntil}</Text> : null}
              {!pauseState?.paused ? (
                <>
                  <TextField
                    label="سبب الإيقاف"
                    value={pauseReason}
                    onChangeText={setPauseReason}
                    placeholder="مثال: نفاد مؤقت لدى المورد"
                    disabled={pauseSaving}
                  />
                  <TextField
                    label="وقت الاستئناف ISO (اختياري)"
                    value={pausedUntil}
                    onChangeText={setPausedUntil}
                    placeholder="2026-07-28T18:00:00Z"
                    disabled={pauseSaving}
                  />
                  <Button
                    label={pauseSaving ? 'جاري الإيقاف...' : 'إيقاف المنتج مؤقتاً'}
                    tone="danger"
                    disabled={pauseSaving || !pauseState || pauseReason.trim().length < 3}
                    onPress={() => void handlePause()}
                  />
                </>
              ) : (
                <Button
                  label={pauseSaving ? 'جاري الاستئناف...' : 'استئناف المنتج'}
                  tone="success"
                  disabled={pauseSaving}
                  onPress={() => void handleResume()}
                />
              )}
            </Surface>
          </>
        )}
      </Box>

      {assortment ? (
        <>
          <InventoryConfigurationModal
            visible={inventoryVisible}
            storeId={storeId}
            masterProductId={productId}
            onClose={() => setInventoryVisible(false)}
            onSave={() => {
              setInventoryVisible(false);
              void loadData();
              onSaved?.();
            }}
          />
          <PriceConfigurationModal
            visible={priceVisible}
            storeId={storeId}
            masterProductId={productId}
            onClose={() => setPriceVisible(false)}
            onSave={() => {
              setPriceVisible(false);
              void loadData();
              onSaved?.();
            }}
          />
        </>
      ) : null}
    </ScrollView>
  );
}
