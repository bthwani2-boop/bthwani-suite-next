import React from 'react';
import { ScrollView, Alert } from 'react-native';
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
  type DshCategoryRecord,
  type DshCreateCategoryRequest,
  type DshUpdateCategoryRequest,
} from '../../shared/catalog/dsh-product-api.client';
import { getDshProductRuntimeClient } from '../../shared/runtime/ui-only-runtime-clients';

// ─── Types ────────────────────────────────────────────────────────────────────

export type CategoryScreenState =
  | 'loading'   // Fetching categories
  | 'list'      // Category tree listing
  | 'create'    // Add new category form
  | 'edit'      // Edit existing category form
  | 'saving'    // Processing create/update/delete
  | 'error'     // General error
  | 'offline';  // Network error

type CategoryFormState = {
  name: string;
  parentId: string;
  description: string;
};

const emptyForm: CategoryFormState = {
  name: '',
  parentId: '',
  description: '',
};

export type CategoryManagementScreenProps = {
  storeId: string;
  onBack?: () => void;
};

// ─── Tree Helper ──────────────────────────────────────────────────────────────

type FlatTreeNode = {
  category: DshCategoryRecord;
  depth: number;
};

function buildFlatTree(categories: readonly DshCategoryRecord[]): FlatTreeNode[] {
  const map = new Map<string, DshCategoryRecord>();
  for (const cat of categories) {
    map.set(cat.id, cat);
  }

  const getDepth = (id: string, visited = new Set<string>()): number => {
    if (visited.has(id)) return 0;
    visited.add(id);
    const cat = map.get(id);
    if (!cat || !cat.parent_id) return 0;
    return 1 + getDepth(cat.parent_id, visited);
  };

  const roots = categories.filter(c => !c.parent_id);
  const result: FlatTreeNode[] = [];

  const visit = (cat: DshCategoryRecord, depth: number, visited = new Set<string>()) => {
    if (visited.has(cat.id)) return;
    visited.add(cat.id);
    result.push({ category: cat, depth });
    const children = categories.filter(c => c.parent_id === cat.id);
    for (const child of children) {
      visit(child, depth + 1, visited);
    }
  };

  for (const root of roots) {
    visit(root, 0);
  }

  const visitedIds = new Set(result.map(r => r.category.id));
  for (const cat of categories) {
    if (!visitedIds.has(cat.id)) {
      result.push({ category: cat, depth: getDepth(cat.id) });
    }
  }

  return result;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CategoryManagementScreen({
  storeId,
  onBack,
}: CategoryManagementScreenProps) {
  const { direction } = useDirection();
  const { theme } = useTheme();

  const [screenState, setScreenState] = React.useState<CategoryScreenState>('loading');
  const [categories, setCategories] = React.useState<readonly DshCategoryRecord[]>([]);
  const [editingCategory, setEditingCategory] = React.useState<DshCategoryRecord | null>(null);
  const [form, setForm] = React.useState<CategoryFormState>(emptyForm);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  const client = React.useMemo(
    () => getDshProductRuntimeClient(),
    [],
  );

  const loadCategories = React.useCallback(async () => {
    setScreenState('loading');
    setErrorMessage(null);
    try {
      const resp = await client.listCategories(storeId, { limit: 100 });
      setCategories(resp.categories);
      setScreenState('list');
    } catch (err: unknown) {
      const isOffline =
        typeof err === 'object' &&
        err !== null &&
        (err as { kind?: unknown }).kind === 'offline';
      setScreenState(isOffline ? 'offline' : 'error');
    }
  }, [client, storeId]);

  React.useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const handleStartCreate = React.useCallback(() => {
    setForm(emptyForm);
    setEditingCategory(null);
    setScreenState('create');
  }, []);

  const handleStartEdit = React.useCallback((category: DshCategoryRecord) => {
    setForm({
      name: category.name,
      parentId: category.parent_id ?? '',
      description: category.description ?? '',
    });
    setEditingCategory(category);
    setScreenState('edit');
  }, []);

  const handleCancelForm = React.useCallback(() => {
    setForm(emptyForm);
    setEditingCategory(null);
    setScreenState('list');
    setErrorMessage(null);
  }, []);

  const setField = React.useCallback(
    (key: keyof CategoryFormState) => (value: string) =>
      setForm((prev) => ({ ...prev, [key]: value })),
    [],
  );

  const handleSave = React.useCallback(async () => {
    const name = form.name.trim();
    if (!name) {
      setErrorMessage('اسم الفئة مطلوب.');
      return;
    }

    setScreenState('saving');
    setErrorMessage(null);

    try {
      if (editingCategory === null) {
        const req: DshCreateCategoryRequest = {
          name,
          parent_id: form.parentId.trim() || undefined,
          description: form.description.trim() || undefined,
        };
        await client.createCategory(storeId, req);
      } else {
        const req: DshUpdateCategoryRequest = {
          name,
          parent_id: form.parentId.trim() || undefined,
          description: form.description.trim() || undefined,
        };
        await client.updateCategory(editingCategory.id, req);
      }

      // Reload list
      const resp = await client.listCategories(storeId, { limit: 100 });
      setCategories(resp.categories);
      setForm(emptyForm);
      setEditingCategory(null);
      setScreenState('list');
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
      setScreenState(editingCategory === null ? 'create' : 'edit');
    }
  }, [client, form, editingCategory, storeId]);

  const handleDelete = React.useCallback(async () => {
    if (!editingCategory) return;

    setScreenState('saving');
    setErrorMessage(null);

    try {
      await client.deleteCategory(editingCategory.id);
      // Reload list
      const resp = await client.listCategories(storeId, { limit: 100 });
      setCategories(resp.categories);
      setForm(emptyForm);
      setEditingCategory(null);
      setScreenState('list');
    } catch (err: unknown) {
      const isOffline =
        typeof err === 'object' &&
        err !== null &&
        (err as { kind?: unknown }).kind === 'offline';
      setErrorMessage(
        isOffline
          ? 'لا يوجد اتصال بالشبكة — تحقق من الاتصال وأعد المحاولة.'
          : 'فشل حذف الفئة — أعد المحاولة.',
      );
      setScreenState('edit');
    }
  }, [client, editingCategory, storeId]);

  // ── Loading state ──────────────────────────────────────────────────────────
  if (screenState === 'loading') {
    return <StateView kind="loading" title="جارٍ تحميل الفئات…" />;
  }

  // ── Offline state ──────────────────────────────────────────────────────────
  if (screenState === 'offline') {
    return <StateView stateId="offline" actionLabel="إعادة المحاولة" onActionPress={loadCategories} />;
  }

  // ── Error state ────────────────────────────────────────────────────────────
  if (screenState === 'error') {
    return <StateView stateId="recoverableError" title="حدث خطأ غير متوقع" description="فشل تحميل قائمة الفئات. يرجى التحقق من الخادم وإعادة المحاولة." actionLabel="إعادة المحاولة" onActionPress={loadCategories} />;
  }

  const flatTree = buildFlatTree(categories);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.background }}
      contentContainerStyle={{ paddingBottom: 160 }}
      keyboardShouldPersistTaps="handled"
    >
      <Box gap={4} style={{ padding: spacing[4] }}>

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <Box style={{ flexDirection: resolveRowDirection(direction), alignItems: 'center', gap: spacing[3] }}>
          {onBack && (screenState === 'list') ? (
            <Button label="رجوع" tone="ghost" size="sm" fullWidth={false} onPress={onBack} />
          ) : null}
          <Box style={{ flex: 1, minWidth: 0 }}>
            <Text role="titleSm" align="start">هيكلية الفئات</Text>
            <Text role="bodySm" tone="muted" align="start">
              تنظيم وتصنيف منتجات المتجر في فئات وفئات فرعية هرمية.
            </Text>
          </Box>
        </Box>

        {/* ── WLT / Finance Notice ───────────────────────────────────────── */}
        <Box
          style={{
            backgroundColor: theme.line + '18',
            borderRadius: radius.xs2,
            padding: spacing[3],
            borderStartWidth: 3,
            borderStartColor: theme.brand,
          }}
        >
          <Text role="caption" tone="muted" align="start">
            ملاحظة: هذا الهيكل لتنظيم الكتالوج داخل المتجر فقط. العمليات المالية والنسب والمحفظة تخضع لـ WLT بالكامل.
          </Text>
        </Box>

        {/* ── Error message banner ───────────────────────────────────────── */}
        {errorMessage ? (
          <Box
            style={{
              backgroundColor: theme.danger + '15',
              borderRadius: radius.xs2,
              padding: spacing[3],
              borderStartWidth: 3,
              borderStartColor: theme.danger,
            }}
          >
            <Text role="bodySm" tone="danger" align="start">{errorMessage}</Text>
          </Box>
        ) : null}

        {/* ── LIST VIEW ──────────────────────────────────────────────────── */}
        {screenState === 'list' && (
          <Box gap={4}>
            <Box style={{ flexDirection: resolveRowDirection(direction), justifyContent: 'space-between', alignItems: 'center' }}>
              <Text role="bodyStrong" align="start">قائمة الفئات الهرمية</Text>
              <Button label="إضافة فئة" tone="primary" size="sm" fullWidth={false} onPress={handleStartCreate} />
            </Box>

            {flatTree.length === 0 ? (
              <Box style={{ padding: spacing[8], alignItems: 'center', gap: spacing[3] }}>
                <Text role="bodySm" tone="muted" align="center">لا توجد فئات حالياً. ابدأ بإضافة فئة جديدة للمتجر.</Text>
                <Button label="إضافة أول فئة" tone="secondary" size="sm" onPress={handleStartCreate} />
              </Box>
            ) : (
              <Box gap={2}>
                {flatTree.map(({ category, depth }) => (
                  <Box
                    key={category.id}
                    style={{
                      flexDirection: resolveRowDirection(direction),
                      alignItems: 'center',
                      padding: spacing[3],
                      backgroundColor: theme.line + '08',
                      borderRadius: radius.xs2,
                      marginRight: direction === 'rtl' ? depth * 20 : 0,
                      marginLeft: direction === 'ltr' ? depth * 20 : 0,
                      borderStartWidth: depth > 0 ? 2 : 0,
                      borderStartColor: theme.brand + '77',
                    }}
                  >
                    <Box style={{ flex: 1 }}>
                      <Text role="bodyStrong" align="start">
                        {depth > 0 ? '↳ ' : ''}{category.name}
                      </Text>
                      {category.description ? (
                        <Text role="caption" tone="muted" align="start" style={{ marginTop: 2 }}>
                          {category.description}
                        </Text>
                      ) : null}
                    </Box>
                    <Button
                      label="تعديل"
                      tone="ghost"
                      size="sm"
                      fullWidth={false}
                      onPress={() => handleStartEdit(category)}
                    />
                  </Box>
                ))}
              </Box>
            )}
          </Box>
        )}

        {/* ── CREATE / EDIT FORM VIEW ────────────────────────────────────── */}
        {(screenState === 'create' || screenState === 'edit') && (
          <Box gap={4}>
            <Box style={{ flexDirection: resolveRowDirection(direction), justifyContent: 'space-between', alignItems: 'center' }}>
              <Text role="bodyStrong" align="start">
                {screenState === 'create' ? 'إضافة فئة جديدة' : `تعديل الفئة: ${editingCategory?.name}`}
              </Text>
              <Button label="إلغاء" tone="ghost" size="sm" fullWidth={false} onPress={handleCancelForm} />
            </Box>

            <TextField
              id="category-form-name"
              label="اسم الفئة *"
              value={form.name}
              onChangeText={setField('name')}
              placeholder="مثال: مشروبات وعصائر"
            />

            <TextField
              id="category-form-description"
              label="وصف الفئة"
              value={form.description}
              onChangeText={setField('description')}
              placeholder="وصف مختصر للقسم يظهر للمتصفحين"
              multiline
            />

            {/* Parent selector buttons */}
            <Box gap={2}>
              <Text role="bodySm" tone="muted" align="start">الفئة الأب (لإدراجها كفئة فرعية)</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexDirection: resolveRowDirection(direction) }}>
                <Box style={{ flexDirection: 'row', gap: spacing[2] }}>
                  <Button
                    label="بلا فئة أب (رئيسية)"
                    tone={!form.parentId ? 'primary' : 'secondary'}
                    size="sm"
                    fullWidth={false}
                    onPress={() => setField('parentId')('')}
                  />
                  {categories
                    .filter(c => c.id !== editingCategory?.id) // Cannot be parent of itself
                    .map((c) => (
                      <Button
                        key={c.id}
                        label={c.name}
                        tone={form.parentId === c.id ? 'primary' : 'secondary'}
                        size="sm"
                        fullWidth={false}
                        onPress={() => setField('parentId')(c.id)}
                      />
                    ))}
                </Box>
              </ScrollView>
            </Box>

            {screenState === 'edit' && editingCategory && (
              <Box style={{ marginTop: spacing[4] }}>
                <Text role="caption" tone="danger" align="start" style={{ marginBottom: spacing[2] }}>
                  تنبيه: سيؤدي حذف الفئة إلى فك ارتباط المنتجات المنتمية إليها تلقائياً.
                </Text>
                <Button
                  label="حذف هذه الفئة"
                  tone="danger"
                  size="sm"
                  onPress={handleDelete}
                />
              </Box>
            )}
          </Box>
        )}

        {/* ── SAVING / LOADING SPINNER STUB ──────────────────────────────── */}
        {screenState === 'saving' && (
          <Box style={{ padding: spacing[6], alignItems: 'center' }}>
            <Text role="bodyStrong" tone="muted" align="center">جارٍ الحفظ والمزامنة…</Text>
          </Box>
        )}

      </Box>

      {/* ── Sticky save action for form ──────────────────────────────────── */}
      {(screenState === 'create' || screenState === 'edit') && (
        <MobileStickyPrimaryAction
          label={screenState === 'create' ? 'إنشاء الفئة الجديدة' : 'حفظ التعديلات'}
          helperText="سيتم تحديث الكتالوج وقوائم المنتجات فور الحفظ."
          onPress={handleSave}
        />
      )}
    </ScrollView>
  );
}

export default CategoryManagementScreen;
