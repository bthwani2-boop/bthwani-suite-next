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
  fetchPartnerStoreAssortmentCommercial,
  fetchPartnerStoreAssortment,
  fetchPartnerMasterProducts,
  getCurrentStoreAssortmentPrice,
  getStoreAssortmentStockStatus,
  isStoreAssortmentAvailable,
  pausePartnerStoreAssortment,
  resumePartnerStoreAssortment,
} from '../../shared/catalog';
import type {
  AssortmentPauseState,
  StoreAssortment,
  StoreAssortmentCommercialReadback,
  MasterProduct,
} from '../../shared/catalog';
import { InventoryConfigurationModal } from './InventoryConfigurationModal';
import { PriceConfigurationModal } from './PriceConfigurationModal';

export type ProductControlsScreenProps = {
  readonly storeId: string;
  readonly productId: string;
  readonly onBack?: () => void;
  readonly onSaved?: () => void;
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
  const [commercial, setCommercial] = React.useState<StoreAssortmentCommercialReadback | null>(null);
  const [pauseState, setPauseState] = React.useState<AssortmentPauseState | null>(null);
  const [masterProduct, setMasterProduct] = React.useState<MasterProduct | null>(null);
  const [pauseReason, setPauseReason] = React.useState('');
  const [pausedUntil, setPausedUntil] = React.useState('');
  const [pauseSaving, setPauseSaving] = React.useState(false);
  const [inventoryVisible, setInventoryVisible] = React.useState(false);
  const [priceVisible, setPriceVisible] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const mountedRef = React.useRef(true);
  const requestSeqRef = React.useRef(0);
  const scopeKey = `${storeId}:${productId}`;
  const scopeKeyRef = React.useRef(scopeKey);
  scopeKeyRef.current = scopeKey;

  React.useEffect(() => () => {
    mountedRef.current = false;
    requestSeqRef.current += 1;
  }, []);

  const loadData = React.useCallback(async () => {
    const requestSeq = ++requestSeqRef.current;
    const requestScopeKey = scopeKey;
    const isCurrentRequest = () => mountedRef.current
      && requestSeq === requestSeqRef.current
      && requestScopeKey === scopeKeyRef.current;
    setScreenState('loading');
    setErrorMessage(null);
    try {
      const [masterProducts, assortments, pauses] = await Promise.all([
        fetchPartnerMasterProducts({ search: productId, limit: 1 }),
        fetchPartnerStoreAssortment(storeId),
        fetchPartnerAssortmentPauses(storeId),
      ]);
      if (!isCurrentRequest()) return;
      const readbackAssortment = assortments.find((item) => item.masterProductId === productId) ?? null;
      const readbackCommercial = readbackAssortment
        ? await fetchPartnerStoreAssortmentCommercial(storeId, productId)
        : null;
      if (!isCurrentRequest()) return;
      setMasterProduct(masterProducts.find((product) => product.id === productId) ?? null);
      setAssortment(readbackAssortment);
      setCommercial(readbackCommercial);
      const pause = pauses.find((item) => item.masterProductId === productId) ?? null;
      setPauseState(pause);
      setPauseReason(pause?.reason ?? '');
      setPausedUntil(pause?.pausedUntil ?? '');
      setScreenState('form');
    } catch (err: any) {
      if (!isCurrentRequest()) return;
      setErrorMessage(err.message ?? 'تعذر تحميل بيانات التحكم canonical للمنتج.');
      setScreenState('error');
    }
  }, [scopeKey, storeId, productId]);

  React.useEffect(() => {
    void loadData();
  }, [loadData]);

  const handlePause = React.useCallback(async () => {
    if (!pauseState || pauseReason.trim().length < 3) {
      setErrorMessage('حمّل التشكيلة واكتب سبباً واضحاً للإيقاف المؤقت.');
      return;
    }
    const operationScopeKey = scopeKey;
    setPauseSaving(true);
    setErrorMessage(null);
    try {
      const result = await pausePartnerStoreAssortment(storeId, productId, {
        reason: pauseReason.trim(),
        pausedUntil: pausedUntil.trim() || null,
        expectedVersion: pauseState.version,
      });
      const [assortments, pauses] = await Promise.all([
        fetchPartnerStoreAssortment(storeId),
        fetchPartnerAssortmentPauses(storeId),
      ]);
      if (!mountedRef.current || operationScopeKey !== scopeKeyRef.current) return;
      const readbackAssortment = assortments.find((item) => item.masterProductId === productId);
      const readbackPause = pauses.find((item) => item.masterProductId === productId);
      const readbackCommercial = readbackAssortment
        ? await fetchPartnerStoreAssortmentCommercial(storeId, productId)
        : null;
      if (!mountedRef.current || operationScopeKey !== scopeKeyRef.current) return;
      if (!readbackAssortment || !readbackPause
        || !readbackCommercial
        || readbackAssortment.id !== result.assortment.id
        || readbackAssortment.version !== result.assortment.version
        || readbackPause.version !== result.pause.version
        || !readbackPause.paused
        || readbackPause.reason !== result.pause.reason
        || readbackPause.pausedUntil !== result.pause.pausedUntil) {
        throw new Error('لم تتطابق قراءة الإيقاف اللاحقة مع الطلب؛ لم يُعتمد التغيير.');
      }
      setAssortment(readbackAssortment);
      setCommercial(readbackCommercial);
      setPauseState(readbackPause);
      onSaved?.();
    } catch (err: any) {
      if (!mountedRef.current || operationScopeKey !== scopeKeyRef.current) return;
      setErrorMessage(err.message ?? 'تعذر إيقاف المنتج مؤقتاً.');
      await loadData();
    } finally {
      if (mountedRef.current && operationScopeKey === scopeKeyRef.current) setPauseSaving(false);
    }
  }, [loadData, onSaved, pauseReason, pauseState, pausedUntil, productId, scopeKey, storeId]);

  const handleResume = React.useCallback(async () => {
    if (!pauseState) return;
    const operationScopeKey = scopeKey;
    setPauseSaving(true);
    setErrorMessage(null);
    try {
      const result = await resumePartnerStoreAssortment(storeId, productId, pauseState.version);
      const [assortments, pauses] = await Promise.all([
        fetchPartnerStoreAssortment(storeId),
        fetchPartnerAssortmentPauses(storeId),
      ]);
      if (!mountedRef.current || operationScopeKey !== scopeKeyRef.current) return;
      const readbackAssortment = assortments.find((item) => item.masterProductId === productId);
      const readbackPause = pauses.find((item) => item.masterProductId === productId);
      const readbackCommercial = readbackAssortment
        ? await fetchPartnerStoreAssortmentCommercial(storeId, productId)
        : null;
      if (!mountedRef.current || operationScopeKey !== scopeKeyRef.current) return;
      if (!readbackAssortment || !readbackPause
        || !readbackCommercial
        || readbackAssortment.id !== result.assortment.id
        || readbackAssortment.version !== result.assortment.version
        || readbackPause.version !== result.pause.version
        || readbackPause.paused
        || readbackPause.reason !== result.pause.reason
        || readbackPause.pausedUntil !== result.pause.pausedUntil) {
        throw new Error('لم تتطابق قراءة الاستئناف اللاحقة مع الطلب؛ لم يُعتمد التغيير.');
      }
      setAssortment(readbackAssortment);
      setCommercial(readbackCommercial);
      setPauseState(readbackPause);
      setPauseReason('');
      setPausedUntil('');
      onSaved?.();
    } catch (err: any) {
      if (!mountedRef.current || operationScopeKey !== scopeKeyRef.current) return;
      setErrorMessage(err.message ?? 'تعذر استئناف المنتج.');
      await loadData();
    } finally {
      if (mountedRef.current && operationScopeKey === scopeKeyRef.current) setPauseSaving(false);
    }
  }, [loadData, onSaved, pauseState, productId, scopeKey, storeId]);

  const currentPrice = getCurrentStoreAssortmentPrice(commercial ?? undefined);
  const available = commercial ? isStoreAssortmentAvailable(commercial.inventory) : undefined;
  const stockStatus = commercial ? getStoreAssortmentStockStatus(commercial.inventory) : undefined;

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
              {commercial && currentPrice && stockStatus && available !== undefined ? (
                <Text role="bodySm" tone="muted" align="start">
                  السعر: {currentPrice.amountMinor} {currentPrice.currency} (بالوحدة الصغرى) · التوفر: {available ? 'متاح' : 'غير متاح'} · المخزون: {stockStatus}
                </Text>
              ) : (
                <Text role="bodySm" tone="warning" align="start">
                  لا توجد قراءة تجارية معيارية مكتملة لهذا المنتج.
                </Text>
              )}
              <Text role="caption" tone="muted" align="start">تُقرأ هذه القيم مباشرة من موارد السعر والمخزون المعيارية.</Text>
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
