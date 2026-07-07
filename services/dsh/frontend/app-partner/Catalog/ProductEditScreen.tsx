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
  spacing,
  radius,
} from '@bthwani/ui-kit';
import {
  type DshProductIdentityApprovalStatus,
  getDshProductApprovalStatusLabel,
  type DshProductRecord,
  type DshCreateProductRequest,
  type DshUpdateProductRequest,
} from '../../shared/catalog/dsh-product-api.client';
import { getDshProductRuntimeClient } from '../../shared/runtime/ui-only-runtime-clients';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ProductEditScreenMode = 'create' | 'edit';

export type ProductEditScreenState =
  | 'form'      // Editable form — initial state
  | 'loading'   // Loading existing product (edit mode only)
  | 'saving'    // Saving in progress
  | 'saved'     // Save succeeded — read-only confirmation
  | 'error'     // Save or load failed
  | 'not_found' // Product ID not found (edit mode only)
  | 'offline';  // No network connection

export type ProductEditScreenProps = {
  /** Store ID — required for creating new products. */
  storeId: string;
  /** If provided: edit mode. If undefined: create mode. */
  productId?: string;
  /** Called when the user presses the back/cancel button. */
  onBack?: () => void;
  /** Called after a successful save with the saved record. */
  onSaved?: (record: DshProductRecord) => void;
};

// ─── Form state ───────────────────────────────────────────────────────────────

type ProductFormState = {
  name: string;
  sku: string;
  gtin: string;
  barcode: string;
  description: string;
  basePriceLabel: string;
  categoryId: string;
};

const emptyForm: ProductFormState = {
  name: '',
  sku: '',
  gtin: '',
  barcode: '',
  description: '',
  basePriceLabel: '',
  categoryId: '',
};

function formFromRecord(r: DshProductRecord): ProductFormState {
  return {
    name: r.name,
    sku: r.sku ?? '',
    gtin: r.gtin ?? '',
    barcode: r.barcode ?? '',
    description: r.description ?? '',
    basePriceLabel: r.base_price_label,
    categoryId: r.category_id ?? '',
  };
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ProductEditScreen({
  storeId,
  productId,
  onBack,
  onSaved,
}: ProductEditScreenProps) {
  const { direction } = useDirection();
  const theme = useTheme() as any;
  const mode: ProductEditScreenMode = productId ? 'edit' : 'create';

  const [screenState, setScreenState] = React.useState<ProductEditScreenState>(
    mode === 'edit' ? 'loading' : 'form',
  );
  const [form, setForm] = React.useState<ProductFormState>(emptyForm);
  const [savedRecord, setSavedRecord] = React.useState<DshProductRecord | null>(null);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [approvalStatus, setApprovalStatus] = React.useState<DshProductIdentityApprovalStatus>('partner_submitted');

  const client = React.useMemo(
    () => getDshProductRuntimeClient(),
    [],
  );

  // Load existing product in edit mode
  React.useEffect(() => {
    if (mode !== 'edit' || !productId) return;
    let cancelled = false;
    setScreenState('loading');

    client
      .getProduct(productId)
      .then((record: any) => {
        if (cancelled) return;
        setForm(formFromRecord(record));
        setApprovalStatus(record.approval_status);
        setScreenState('form');
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const isOffline =
          typeof err === 'object' &&
          err !== null &&
          (err as { kind?: unknown }).kind === 'offline';
        const isNotFound =
          typeof err === 'object' &&
          err !== null &&
          (err as { kind?: unknown; status?: unknown }).kind === 'http' &&
          (err as { status: number }).status === 404;
        if (isNotFound) {
          setScreenState('not_found');
        } else if (isOffline) {
          setScreenState('offline');
        } else {
          setErrorMessage('تعذّر تحميل المنتج — تحقق من الاتصال وأعد المحاولة.');
          setScreenState('error');
        }
      });

    return () => {
      cancelled = true;
    };
  }, [client, mode, productId]);

  const setField = React.useCallback(
    (key: keyof ProductFormState) => (value: string) =>
      setForm((prev) => ({ ...prev, [key]: value })),
    [],
  );

  const handleSave = React.useCallback(async () => {
    const name = form.name.trim();
    if (!name) {
      setErrorMessage('اسم المنتج مطلوب.');
      return;
    }

    setScreenState('saving');
    setErrorMessage(null);

    try {
      let record: DshProductRecord;

      if (mode === 'create') {
        const req: DshCreateProductRequest = {
          name,
          base_price_label: form.basePriceLabel.trim(),
          ...(form.sku.trim() ? { sku: form.sku.trim() } : {}),
          ...(form.gtin.trim() ? { gtin: form.gtin.trim() } : {}),
          ...(form.barcode.trim() ? { barcode: form.barcode.trim() } : {}),
          ...(form.description.trim() ? { description: form.description.trim() } : {}),
          ...(form.categoryId.trim() ? { category_id: form.categoryId.trim() } : {}),
        };
        record = await client.createProduct(storeId, req);
      } else {
        const req: DshUpdateProductRequest = {
          name,
          base_price_label: form.basePriceLabel.trim() || undefined,
          ...(form.sku.trim() ? { sku: form.sku.trim() } : {}),
          ...(form.gtin.trim() ? { gtin: form.gtin.trim() } : {}),
          ...(form.barcode.trim() ? { barcode: form.barcode.trim() } : {}),
          ...(form.description.trim() ? { description: form.description.trim() } : {}),
          ...(form.categoryId.trim() ? { category_id: form.categoryId.trim() } : {}),
        };
        record = await client.updateProduct(productId!, req);
      }

      setSavedRecord(record);
      setApprovalStatus(record.approval_status);
      setScreenState('saved');
      onSaved?.(record);
    } catch (err: unknown) {
      const isOffline =
        typeof err === 'object' &&
        err !== null &&
        (err as { kind?: unknown }).kind === 'offline';
      setErrorMessage(
        isOffline
          ? 'لا يوجد اتصال بالشبكة — تحقق من الاتصال وأعد المحاولة.'
          : 'فشل الحفظ — تحقق من البيانات وأعد المحاولة.',
      );
      setScreenState('error');
    }
  }, [client, form, mode, productId, storeId, onSaved]);

  const handleRetry = React.useCallback(() => {
    setErrorMessage(null);
    setScreenState(mode === 'edit' && savedRecord === null ? 'loading' : 'form');
  }, [mode, savedRecord]);

  const handleEditAgain = React.useCallback(() => {
    setScreenState('form');
  }, []);

  const isReadOnly = screenState === 'saved' || screenState === 'saving';

  // ── Loading state ──────────────────────────────────────────────────────────
  if (screenState === 'loading') {
    return <StateView title="جارٍ تحميل بيانات المنتج…" loading />;
  }

  // ── Not-found state ────────────────────────────────────────────────────────
  if (screenState === 'not_found') {
    return <StateView title="المنتج غير موجود" description="لم يُعثر على المنتج المطلوب. قد يكون محذوفاً أو أن الرابط غير صحيح." actionLabel={onBack ? 'العودة' : undefined} onActionPress={onBack} />;
  }

  // ── Offline state ──────────────────────────────────────────────────────────
  if (screenState === 'offline') {
    return <StateView title="تعذر الاتصال" tone="danger" actionLabel="إعادة المحاولة" onActionPress={handleRetry} />;
  }

  // ── Main form / saved / error states ──────────────────────────────────────
  const modeTitle = mode === 'create' ? 'إضافة منتج جديد' : 'تعديل هوية المنتج';
  const approvalLabel = getDshProductApprovalStatusLabel(approvalStatus);
  // approvalTone intentionally omitted — Chip does not support tone in this ui-kit version

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.background }}
      contentContainerStyle={{ paddingBottom: 160 }}
      keyboardShouldPersistTaps="handled"
    >
      <Box gap={4} style={{ padding: spacing[4] }}>

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <Box style={{ flexDirection: resolveRowDirection(direction), alignItems: 'center', gap: spacing[3] }}>
          {onBack ? (
            <Button label="رجوع" tone="ghost" size="sm" fullWidth={false} onPress={onBack} />
          ) : null}
          <Box style={{ flex: 1, minWidth: 0 }}>
            <Text role="titleSm" align="start">{modeTitle}</Text>
            <Text role="bodySm" tone="muted" align="start">
              {mode === 'create'
                ? 'أدخل بيانات هوية المنتج وأرسله للمراجعة.'
                : 'عدّل بيانات هوية المنتج — التغييرات تُرسل للمراجعة فور الحفظ.'}
            </Text>
          </Box>
        </Box>

        {/* ── Approval status badge (edit mode only) ─────────────────────── */}
        {mode === 'edit' ? (
          <Box style={{ flexDirection: resolveRowDirection(direction), gap: spacing[2], flexWrap: 'wrap' }}>
            <Chip label={`حالة الاعتماد: ${approvalLabel}`} selected />
            {savedRecord ? (
              <Chip label={`معرف المنتج: ${savedRecord.id}`} />
            ) : productId ? (
              <Chip label={`معرف المنتج: ${productId}`} />
            ) : null}
          </Box>
        ) : null}

        {/* ── WLT boundary notice ─────────────────────────────────────────── */}
        <Box
          style={{
            backgroundColor: theme.line + '18',
            borderRadius: radius.xs,
            padding: spacing[3],
            borderStartWidth: 3,
            borderStartColor: theme.brand,
          }}
        >
          <Text role="caption" tone="muted" align="start">
            ملاحظة: السعر المُدخل هو تسمية عرض فقط (مثل: ١٢٥ ر.س). لا تحدث أي تغييرات مالية داخل هذه الشاشة — المحفظة والتسويات ملك WLT.
          </Text>
        </Box>

        <Divider />

        {/* ── Error banner ────────────────────────────────────────────────── */}
        {errorMessage ? (
          <Box
            style={{
              backgroundColor: theme.danger + '15',
              borderRadius: radius.xs,
              padding: spacing[3],
              borderStartWidth: 3,
              borderStartColor: theme.danger,
              gap: spacing[2],
            }}
          >
            <Text role="bodySm" tone="danger" align="start">
              {errorMessage}
            </Text>
            <Button
              label="إعادة المحاولة"
              tone="secondary"
              size="sm"
              fullWidth={false}
              onPress={handleRetry}
            />
          </Box>
        ) : null}

        {/* ── Saved confirmation ──────────────────────────────────────────── */}
        {screenState === 'saved' && savedRecord ? (
          <Box
            style={{
              backgroundColor: theme.success + '15',
              borderRadius: radius.xs,
              padding: spacing[3],
              borderStartWidth: 3,
              borderStartColor: theme.success,
              gap: spacing[2],
            }}
          >
            <Text role="bodyStrong" tone="success" align="start">
              {mode === 'create' ? 'تم إنشاء المنتج بنجاح' : 'تم تحديث المنتج بنجاح'}
            </Text>
            <Text role="bodySm" tone="muted" align="start">
              حالة الاعتماد: {getDshProductApprovalStatusLabel(savedRecord.approval_status)}
            </Text>
            <Button
              label="تعديل مرة أخرى"
              tone="secondary"
              size="sm"
              fullWidth={false}
              onPress={handleEditAgain}
            />
          </Box>
        ) : null}

        {/* ── Form fields ─────────────────────────────────────────────────── */}
        <Box gap={3}>
          <Text role="bodyStrong" align="start">هوية المنتج الأساسية</Text>

          <TextField
            id="product-edit-name"
            label="اسم المنتج *"
            value={form.name}
            onChangeText={setField('name')}
            placeholder="مثال: مياه معدنية نقية 500 مل"
            disabled={isReadOnly}
          />

          <TextField
            id="product-edit-base-price"
            label="تسمية السعر (عرض فقط)"
            value={form.basePriceLabel}
            onChangeText={setField('basePriceLabel')}
            placeholder="مثال: ٢.٥٠ ر.س"
            disabled={isReadOnly}
          />

          <TextField
            id="product-edit-description"
            label="وصف المنتج"
            value={form.description}
            onChangeText={setField('description')}
            placeholder="وصف مختصر يساعد في التعريف والمراجعة"
            multiline
            disabled={isReadOnly}
          />
        </Box>

        <Divider />

        <Box gap={3}>
          <Text role="bodyStrong" align="start">معرّفات الكتالوج</Text>
          <Text role="bodySm" tone="muted" align="start">
            يُستخدم أحد هذه المعرفات لمطابقة المنتج مع الكتالوج المركزي.
          </Text>

          <TextField
            id="product-edit-sku"
            label="رمز SKU"
            value={form.sku}
            onChangeText={setField('sku')}
            placeholder="رمز تتبع المنتج الداخلي"
            disabled={isReadOnly}
          />

          <TextField
            id="product-edit-gtin"
            label="GTIN / رقم المنتج العالمي"
            value={form.gtin}
            onChangeText={setField('gtin')}
            placeholder="رقم EAN-13 أو UPC"
            disabled={isReadOnly}
          />

          <TextField
            id="product-edit-barcode"
            label="قيمة الباركود"
            value={form.barcode}
            onChangeText={setField('barcode')}
            placeholder="EAN-13 / Code-128 / QR"
            disabled={isReadOnly}
          />

          <TextField
            id="product-edit-category"
            label="معرف الفئة"
            value={form.categoryId}
            onChangeText={setField('categoryId')}
            placeholder="مثال: cat-beverages-water"
            disabled={isReadOnly}
          />
        </Box>

        <Divider />

        {/* ── Approval pipeline note ──────────────────────────────────────── */}
        <Box gap={2}>
          <Text role="bodyStrong" align="start">مسار الاعتماد</Text>
          <Text role="bodySm" tone="muted" align="start">
            بعد الحفظ، يُرسل المنتج تلقائياً إلى قائمة مراجعة الكتالوج بحالة «مُقدَّم من الشريك». لا يظهر للعملاء إلا بعد اكتمال مسار الاعتماد الكامل.
          </Text>
          <Box style={{ flexDirection: resolveRowDirection(direction), flexWrap: 'wrap', gap: 6 }}>
            {([
              'partner_submitted',
              'partner_review',
              'partner_approved',
              'marketing_review',
              'catalog_adopted',
              'client_visible',
            ] as const).map((step) => (
              <Chip
                key={step}
                label={getDshProductApprovalStatusLabel(step)}
                selected={step === approvalStatus}
              />
            ))}
          </Box>
        </Box>

      </Box>

      {/* ── Sticky save action ───────────────────────────────────────────── */}
      {screenState !== 'saved' ? (
        <MobileStickyPrimaryAction
          label={
            screenState === 'saving'
              ? 'جارٍ الحفظ…'
              : mode === 'create'
              ? 'إرسال المنتج للمراجعة'
              : 'حفظ التعديلات'
          }
          helperText={
            screenState === 'saving'
              ? 'يرجى الانتظار…'
              : 'سيُرسل المنتج فور الضغط إلى قائمة مراجعة الكتالوج.'
          }
          onPress={handleSave}
        />
      ) : null}
    </ScrollView>
  );
}

// export default ProductEditScreen; // Unused default export