import React from 'react';
import { ScrollView } from 'react-native';
import {
  Box,
  Button,
  StateView,
  Text,
  resolveRowDirection,
  useDirection,
  useTheme,
  spacing,
  radius,
} from '@bthwani/ui-kit';
import { fetchPartnerTaxonomy } from '../../shared/catalog';
import type { CentralCatalogDomain, CentralCatalogNode } from '../../shared/catalog';

export type CategoryManagementScreenProps = {
  storeId: string;
  onBack?: () => void;
};

export function CategoryManagementScreen({
  storeId: _storeId,
  onBack,
}: CategoryManagementScreenProps) {
  const { direction } = useDirection();
  const theme = useTheme() as any;

  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [data, setData] = React.useState<{
    domains: readonly CentralCatalogDomain[];
    nodes: readonly CentralCatalogNode[];
  } | null>(null);

  const loadTaxonomy = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const taxonomy = await fetchPartnerTaxonomy();
      setData(taxonomy);
    } catch (err: any) {
      setError(err.message ?? 'فشل تحميل هيكلية الفئات المركزية.');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void loadTaxonomy();
  }, [loadTaxonomy]);

  if (loading) {
    return <StateView title="جارٍ تحميل هيكلية الفئات…" loading />;
  }

  if (error || !data) {
    return (
      <StateView
        title="حدث خطأ غير متوقع"
        description={error ?? 'فشل تحميل قائمة الفئات.'}
        actionLabel="إعادة المحاولة"
        onActionPress={loadTaxonomy}
      />
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.background }}
      contentContainerStyle={{ paddingBottom: 160 }}
    >
      <Box gap={4} style={{ padding: spacing[4] }}>
        {/* Header */}
        <Box style={{ flexDirection: resolveRowDirection(direction), alignItems: 'center', gap: spacing[3] }}>
          {onBack && (
            <Button label="رجوع" tone="ghost" size="sm" fullWidth={false} onPress={onBack} />
          )}
          <Box style={{ flex: 1, minWidth: 0 }}>
            <Text role="titleSm" align="start">هيكلية الفئات المركزية</Text>
            <Text role="bodySm" tone="muted" align="start">
              الهيكل الهرمي الموحد للفئات والمنتجات على مستوى المنصة.
            </Text>
          </Box>
        </Box>

        {/* Informative Banner */}
        <Box
          style={{
            backgroundColor: theme.brand + '18',
            borderRadius: radius.xs,
            padding: spacing[3],
            borderStartWidth: 3,
            borderStartColor: theme.brand,
          }}
        >
          <Text role="caption" tone="muted" align="start">
            ملاحظة سيادية: الفئات والتقسيمات معتمدة مركزياً من إدارة المنصة وهي للقراءة فقط. لا يمكن للشركاء إضافة أو تعديل الفئات محلياً.
          </Text>
        </Box>

        <Box gap={3}>
          <Text role="bodyStrong" align="start">قائمة التصنيفات المعتمدة</Text>
          {data.domains.map((domain) => {
            const domainNodes = data.nodes.filter((node) => node.domainId === domain.id);
            return (
              <Box
                key={domain.id}
                style={{
                  padding: spacing[3],
                  backgroundColor: theme.line + '08',
                  borderRadius: radius.xs,
                  gap: spacing[2],
                }}
              >
                <Box style={{ flexDirection: resolveRowDirection(direction), justifyContent: 'space-between' }}>
                  <Text role="bodyStrong" align="start">📁 {domain.nameAr}</Text>
                  <Text role="caption" tone="muted">مستوى L1</Text>
                </Box>
                {domainNodes.length === 0 ? (
                  <Text role="caption" tone="muted" align="start" style={{ paddingStart: spacing[4] }}>
                    لا توجد فئات فرعية مدرجة تحت هذا القسم حالياً.
                  </Text>
                ) : (
                  domainNodes.map((node) => (
                    <Box
                      key={node.id}
                      style={{
                        paddingStart: spacing[4],
                        paddingVertical: spacing[1],
                        borderStartWidth: 2,
                        borderStartColor: theme.line,
                      }}
                    >
                      <Text role="bodySm" align="start">🔹 {node.nameAr} ({node.level === "BUSINESS_SUBDOMAIN" ? "L2" : node.level === "PRODUCT_MAIN_CLASS" ? "L3" : "L4"})</Text>
                    </Box>
                  ))
                )}
              </Box>
            );
          })}
        </Box>
      </Box>
    </ScrollView>
  );
}