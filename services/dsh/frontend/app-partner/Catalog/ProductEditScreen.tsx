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
  spacing,
  radius,
  Surface,
} from '@bthwani/ui-kit';
import { createPartnerProductProposal, fetchPartnerTaxonomy } from '../../shared/catalog';
import type { CentralCatalogDomain, CentralCatalogNode } from '../../shared/catalog';

export type ProductEditScreenProps = {
  storeId: string;
  productId?: string;
  onBack?: () => void;
  onSaved?: (record: any) => void;
};

export function ProductEditScreen({
  storeId: _storeId,
  productId,
  onBack,
  onSaved,
}: ProductEditScreenProps) {
  const { direction } = useDirection();
  const theme = useTheme() as any;
  const isEditMode = !!productId;

  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);

  const [taxonomy, setTaxonomy] = React.useState<{
    domains: readonly CentralCatalogDomain[];
    nodes: readonly CentralCatalogNode[];
  } | null>(null);

  // Proposal form state
  const [proposedNameAr, setProposedNameAr] = React.useState('');
  const [proposedNameEn, setProposedNameEn] = React.useState('');
  const [selectedDomainId, setSelectedDomainId] = React.useState('');
  const [selectedNodeId, setSelectedNodeId] = React.useState('');
  const [brand, setBrand] = React.useState('');
  const [barcode, setBarcode] = React.useState('');

  React.useEffect(() => {
    setLoading(true);
    fetchPartnerTaxonomy()
      .then((data) => {
        setTaxonomy(data);
        if (data.domains.length > 0) {
          setSelectedDomainId(data.domains[0]!.id);
        }
      })
      .catch((err) => {
        setErrorMessage(err.message ?? 'فشل تحميل بيانات التصنيفات.');
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const handleCreateProposal = React.useCallback(async () => {
    if (!proposedNameAr.trim()) {
      setErrorMessage('الاسم العربي المقترح مطلوب.');
      return;
    }
    if (!selectedDomainId) {
      setErrorMessage('يجب اختيار فئة رئيسية.');
      return;
    }

    setSaving(true);
    setErrorMessage(null);
    try {
      const proposal = await createPartnerProductProposal({
        proposedNameAr: proposedNameAr.trim(),
        proposedNameEn: proposedNameEn.trim(),
        domainId: selectedDomainId,
        categoryNodeId: selectedNodeId || null,
        brand: brand.trim(),
        barcode: barcode.trim() || null,
        imageObjectKey: null,
        sourceSurface: 'app-partner',
      });
      setSuccessMessage('تم إرسال اقتراح المنتج بنجاح إلى قائمة مراجعة الإدارة.');
      onSaved?.(proposal);
    } catch (err: any) {
      setErrorMessage(err.message ?? 'فشل إرسال اقتراح المنتج.');
    } finally {
      setSaving(false);
    }
  }, [proposedNameAr, proposedNameEn, selectedDomainId, selectedNodeId, brand, barcode, onSaved]);

  if (loading) {
    return <StateView title="جاري تحميل البيانات..." loading />;
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
            <Text role="titleSm" align="start">
              {isEditMode ? 'تعديل تفاصيل المنتج' : 'اقتراح منتج جديد'}
            </Text>
            <Text role="bodySm" tone="muted" align="start">
              {isEditMode
                ? 'تفاصيل هوية المنتج تدار مركزياً من الكتالوج.'
                : 'اقتراح إضافة منتج جديد إلى كتالوج المنصة المركزي.'}
            </Text>
          </Box>
        </Box>

        {errorMessage && (
          <Surface tone="danger" padding={3} radiusToken="md">
            <Text role="bodySm" tone="danger" align="start">{errorMessage}</Text>
          </Surface>
        )}

        {successMessage && (
          <Surface tone="success" padding={3} radiusToken="md">
            <Text role="bodySm" tone="success" align="start">{successMessage}</Text>
            {onBack && (
              <Button label="العودة للكتالوج" tone="primary" size="sm" onPress={onBack} style={{ marginTop: spacing[2] }} />
            )}
          </Surface>
        )}

        {isEditMode ? (
          <Surface tone="warning" padding={4} gap={3} radiusToken="md">
            <Text role="bodyStrong" align="start">تنبيه سيادة الكتالوج</Text>
            <Text role="bodySm" tone="muted" align="start">
              وفقاً لقرار سيادة الكتالوج المركزي، لا يحق للمتجر أو الشريك تعديل تفاصيل هوية المنتج (الاسم، الماركة، الباركود، التصنيفات) محلياً.
            </Text>
            <Text role="bodySm" tone="muted" align="start">
              يمكنك تعديل الأسعار، التوفر، المخزون، والملاحظات المحلية للمنتج من صفحة التجاوزات المحلية المخصصة للفرع.
            </Text>
            {onBack && (
              <Button label="العودة وإدارة التوافر" tone="secondary" onPress={onBack} />
            )}
          </Surface>
        ) : (
          <Box gap={3}>
            <Text role="bodyStrong" align="start">تفاصيل المنتج المقترح</Text>

            <TextField
              label="اسم المنتج (عربي) *"
              value={proposedNameAr}
              onChangeText={setProposedNameAr}
              placeholder="مثال: حليب كامل الدسم 1 لتر"
              disabled={saving}
            />

            <TextField
              label="اسم المنتج (انجليزي)"
              value={proposedNameEn}
              onChangeText={setProposedNameEn}
              placeholder="Example: Milk Full Cream 1L"
              disabled={saving}
            />

            <TextField
              label="الماركة / العلامة التجارية"
              value={brand}
              onChangeText={setBrand}
              placeholder="مثال: المراعي"
              disabled={saving}
            />

            <TextField
              label="الباركود (إن وجد)"
              value={barcode}
              onChangeText={setBarcode}
              placeholder="مثال: 6281007011477"
              disabled={saving}
            />

            {/* Domain / L1 Selector */}
            <Box gap={1}>
              <Text role="bodySm" tone="muted" align="start">الفئة الرئيسية للكتالوج L1 *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <Box style={{ flexDirection: 'row', gap: spacing[2] }}>
                  {taxonomy?.domains.map((dom) => (
                    <Button
                      key={dom.id}
                      label={dom.nameAr}
                      tone={selectedDomainId === dom.id ? 'primary' : 'secondary'}
                      size="sm"
                      disabled={saving}
                      onPress={() => {
                        setSelectedDomainId(dom.id);
                        setSelectedNodeId('');
                      }}
                    />
                  ))}
                </Box>
              </ScrollView>
            </Box>

            {/* Category Node Selector */}
            {selectedDomainId && taxonomy && (
              <Box gap={1}>
                <Text role="bodySm" tone="muted" align="start">التصنيف الفرعي للكتالوج L2 / L3 (اختياري)</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <Box style={{ flexDirection: 'row', gap: spacing[2] }}>
                    <Button
                      label="بلا تصنيف فرعي"
                      tone={!selectedNodeId ? 'primary' : 'secondary'}
                      size="sm"
                      disabled={saving}
                      onPress={() => setSelectedNodeId('')}
                    />
                    {taxonomy.nodes
                      .filter((n) => n.domainId === selectedDomainId)
                      .map((node) => (
                        <Button
                          key={node.id}
                          label={node.nameAr}
                          tone={selectedNodeId === node.id ? 'primary' : 'secondary'}
                          size="sm"
                          disabled={saving}
                          onPress={() => setSelectedNodeId(node.id)}
                        />
                      ))}
                  </Box>
                </ScrollView>
              </Box>
            )}

            <Button
              label={saving ? 'جاري الإرسال...' : 'إرسال الاقتراح للمراجعة'}
              tone="primary"
              disabled={saving}
              onPress={handleCreateProposal}
              style={{ marginTop: spacing[4] }}
            />
          </Box>
        )}
      </Box>
    </ScrollView>
  );
}