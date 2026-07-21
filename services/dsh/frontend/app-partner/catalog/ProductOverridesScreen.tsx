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
  upsertPartnerStoreAssortmentOCC,
  fetchPartnerMasterProducts,
  pausePartnerStoreAssortment,
  resumePartnerStoreAssortment,
} from '../../shared/catalog';
import type { AssortmentPauseState, StoreAssortment, MasterProduct } from '../../shared/catalog';

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
  const [pauseState, setPauseState] = React.useState<AssortmentPauseState | null>(null);
  const [masterProduct, setMasterProduct] = React.useState<MasterProduct | null>(null);
  const [unitPrice, setUnitPrice] = React.useState('');
  const [stockStatus, setStockStatus] = React.useState<"in_stock" | "low_stock" | "out_of_stock">('in_stock');
  const [available, setAvailable] = React.useState(true);
  const [localNote, setLocalNote] = React.useState('');
  const [pauseReason, setPauseReason] = React.useState('');
  const [pausedUntil, setPausedUntil] = React.useState('');
  const [pauseSaving, setPauseSaving] = React.useState(false);
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
      const mp = masterProducts.find((product) => product.id === productId);
      if (mp) setMasterProduct(mp);

      const match = assortments.find((item) => item.masterProductId === productId) ?? null;
      const pause = pauses.find((item) => item.masterProductId === productId) ?? null;
      setAssortment(match);
      setPauseState(pause);
      if (match) {
        setUnitPrice(String(match.unitPrice));
        setStockStatus(match.stockStatus);
        setAvailable(match.available);
        setLocalNote(match.localNote);
      } else {
        setUnitPrice('0.00');
        setStockStatus('in_stock');
        setAvailable(true);
        setLocalNote('');
      }
      setPauseReason(pause?.reason ?? '');
      setPausedUntil(pause?.pausedUntil ?? '');
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
      const saved = await upsertPartnerStoreAssortmentOCC(storeId, productId, {
        unitPrice: priceNum,
        currency: assortment?.currency ?? 'YER',
        available,
        stockStatus,
        localNote,
        customImageObjectKey: assortment?.customImageObjectKey ?? null,
        publicationStatus: assortment?.publicationStatus ?? 'draft',
        expectedVersion: assortment?.version,
      });
      setAssortment(saved);
      setPauseState((current) => current ? { ...current, version: saved.version } : current);
      setScreenState('saved');
      onSaved?.();
    } catch (err: any) {
      setErrorMessage(err.message ?? 'فشل حفظ التجاوزات المحلية للمنتج.');
      setScreenState('error');
      await loadData();
    }
  }, [storeId, productId, unitPrice, available, stockStatus, localNote, assortment, onSaved, loadData]);

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
      setAvailable(result.assortment.available);
    } catch (err: any) {
      setErrorMessage(err.message ?? 'تعذر إيقاف المنتج مؤقتاً.');
      await loadData();
    } finally {
      setPauseSaving(false);
    }
  }, [loadData, pauseReason, pauseState, pausedUntil, productId, storeId]);

  const handleResume = React.useCallback(async () => {
    if (!pauseState) return;
    setPauseSaving(true);
    setErrorMessage(null);
    try {
      const result = await resumePartnerStoreAssortment(storeId, productId, pauseState.version);
      setAssortment(result.assortment);
      setPauseState(result.pause);
      setAvailable(result.assortment.available);
      setPauseReason('');
      setPausedUntil('');
    } catch (err: any) {
      setErrorMessage(err.message ?? 'تعذر استئناف المنتج.');
      await loadData();
    } finally {
      setPauseSaving(false);
    }
  }, [loadData, pauseState, productId, storeId]);

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
        <Box style={{ flexDirection: resolveRowDirection(direction), alignItems: 'center', gap: spacing[3] }}>
          {onBack && (
            <Button label="رجوع" tone="ghost" size="sm" fullWidth={false} onPress={onBack} />
          )}
          <Box style={{ flex: 1, minWidth: 0 }}>
            <Text role="titleSm" align="start">تعديل الأسعار والتوفر</Text>
            <Text role="bodySm" tone="muted" align="start">
              السعر والمخزون محليان للمتجر، بينما هوية المنتج والخصائص والبدائل مركزية.
            </Text>
          </Box>
        </Box>

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

        {errorMessage && (
          <Surface tone="danger" padding={3} radiusToken="md">
            <Text role="bodySm" tone="danger" align="start">{errorMessage}</Text>
            <Button label="إعادة المحاولة" tone="secondary" size="sm" fullWidth={false} onPress={loadData} />
          </Surface>
        )}

        {screenState === 'saved' && (
          <Surface tone="success" padding={3} radiusToken="md">
            <Text role="bodyStrong" tone="success" align="start">تم حفظ التجاوزات المحلية بنجاح</Text>
            {onBack && <Button label="العودة للكتالوج" tone="primary" size="sm" fullWidth={false} onPress={onBack} style={{ marginTop: spacing[2] }} />}
          </Surface>
        )}

        {screenState !== 'saved' && (
          <Box gap={3}>
            <Text role="bodyStrong" align="start">القيم المحلية المعدلة</Text>

            <TextField
              label="تجاوز السعر المحلي (ر.ي)"
              value={unitPrice}
              onChangeText={setUnitPrice}
              placeholder="مثال: 15.00"
              disabled={screenState === 'saving' || pauseState?.paused === true}
            />

            <TextField
              label="ملاحظة محلية"
              value={localNote}
              onChangeText={setLocalNote}
              placeholder="مثال: عروض نهاية الأسبوع للفرع"
              disabled={screenState === 'saving'}
            />

            <Box gap={1}>
              <Text role="bodySm" tone="muted" align="start">حالة المخزون المحلية</Text>
              <Box style={{ flexDirection: 'row', gap: spacing[2] }}>
                <Button label="متوفر" tone={stockStatus === 'in_stock' ? 'primary' : 'secondary'} size="sm" onPress={() => setStockStatus('in_stock')} />
                <Button label="منخفض" tone={stockStatus === 'low_stock' ? 'primary' : 'secondary'} size="sm" onPress={() => setStockStatus('low_stock')} />
                <Button label="نفد" tone={stockStatus === 'out_of_stock' ? 'primary' : 'secondary'} size="sm" onPress={() => setStockStatus('out_of_stock')} />
              </Box>
            </Box>

            <Box style={{ flexDirection: resolveRowDirection(direction), alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing[2] }}>
              <Box style={{ gap: 2 }}>
                <Text role="bodyStrong" align="start">حالة التوفر المحلية</Text>
                <Text role="caption" tone="muted" align="start">الإيقاف المؤقت المحكوم أدناه مستقل عن التوفر الدائم.</Text>
              </Box>
              <Button
                label={available ? 'متاح للطلب' : 'غير متوفر'}
                tone={available ? 'success' : 'danger'}
                size="sm"
                fullWidth={false}
                disabled={screenState === 'saving' || pauseState?.paused === true}
                onPress={() => setAvailable(!available)}
              />
            </Box>

            <Button
              label={screenState === 'saving' ? 'جاري الحفظ...' : 'حفظ التجاوزات'}
              tone="primary"
              disabled={screenState === 'saving' || pauseState?.paused === true}
              onPress={handleSave}
            />
          </Box>
        )}

        <Divider />

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
                placeholder="2026-07-22T12:00:00+03:00"
                disabled={pauseSaving}
              />
              <Button
                label={pauseSaving ? 'جاري الإيقاف...' : 'إيقاف المنتج مؤقتاً'}
                tone="danger"
                disabled={pauseSaving || !pauseState || pauseReason.trim().length < 3}
                onPress={handlePause}
              />
            </>
          ) : (
            <Button
              label={pauseSaving ? 'جاري الاستئناف...' : 'استئناف المنتج'}
              tone="success"
              disabled={pauseSaving}
              onPress={handleResume}
            />
          )}
        </Surface>
      </Box>
    </ScrollView>
  );
}
