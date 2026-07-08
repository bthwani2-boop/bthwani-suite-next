import React from "react";
import { StyleSheet, View, ScrollView } from "react-native";
import { useIdentitySession } from "@bthwani/core-identity";
import {
  Badge,
  Card,
  ListItem,
  ScrollScreen,
  StateView,
  Text,
  spacing,
} from "@bthwani/ui-kit";
import { fetchPartnerTaxonomy, fetchPartnerStoreAssortment } from "../../shared/catalog";
import type { CentralCatalogDomain, CentralCatalogNode, StoreAssortment } from "../../shared/catalog";

export function PartnerCatalogManagementScreen() {
  const identity = useIdentitySession();
  const storeId = identity.state.kind === "authenticated" ? (identity.state as any).storeId || "store-1001" : "store-1001";

  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [domains, setDomains] = React.useState<readonly CentralCatalogDomain[]>([]);
  const [nodes, setNodes] = React.useState<readonly CentralCatalogNode[]>([]);
  const [assortment, setAssortment] = React.useState<readonly StoreAssortment[]>([]);

  const loadData = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const taxonomy = await fetchPartnerTaxonomy();
      const ass = await fetchPartnerStoreAssortment(storeId);
      setDomains(taxonomy.domains);
      setNodes(taxonomy.nodes);
      setAssortment(ass);
    } catch (err: any) {
      setError(err.message ?? "فشل تحميل بيانات الكتالوج.");
    } finally {
      setLoading(false);
    }
  }, [storeId]);

  React.useEffect(() => {
    if (identity.state.kind === "authenticated") {
      void loadData();
    }
  }, [identity.state.kind, loadData]);

  if (identity.state.kind !== "authenticated") {
    return <StateView title="تسجيل الدخول مطلوب" description="يرجى تسجيل الدخول للوصول للكتالوج." tone="warning" />;
  }

  if (loading) {
    return <StateView title="جاري تحميل الكتالوج المركزي..." loading />;
  }

  if (error) {
    return (
      <StateView
        title="تعذر تحميل الكتالوج"
        description={error}
        tone="danger"
        actionLabel="إعادة المحاولة"
        onActionPress={loadData}
      />
    );
  }

  return (
    <ScrollScreen>
      <Card>
        <View style={styles.hero}>
          <View style={styles.headerRow}>
            <Text role="titleLg" align="start">كتالوج الفرع المركزي</Text>
            <Badge label="متصل" tone="info" />
          </View>
          <Text tone="secondary" align="start">المتجر: {storeId}</Text>
          <View style={styles.metrics}>
            <Badge label={`${domains.length} أقسام رئيسية معتمدة`} tone="neutral" />
            <Badge label={`${assortment.length} منتجات في تشكيلة الفرع`} tone="neutral" />
          </View>
        </View>
      </Card>

      <Text role="titleMd" align="start">الأقسام المتاحة</Text>
      <Card>
        {domains.length === 0 ? (
          <View style={styles.section}>
            <Text tone="secondary" align="center">لا توجد أقسام معرفة.</Text>
          </View>
        ) : (
          domains.map((dom) => (
            <ListItem
              key={dom.id}
              title={dom.nameAr}
              subtitle={dom.nameEn || "قسم رئيسي معتمد"}
              trailing={<Badge label={dom.isActive ? "نشط" : "متوقف"} tone={dom.isActive ? "success" : "neutral"} />}
            />
          ))
        )}
      </Card>

      <Text role="titleMd" align="start">تشكيلة المنتجات الحالية</Text>
      <Card>
        {assortment.length === 0 ? (
          <View style={styles.section}>
            <Text tone="secondary" align="center">لا توجد منتجات مضافة لتشكيلة هذا الفرع.</Text>
          </View>
        ) : (
          assortment.map((item) => (
            <ListItem
              key={item.id}
              title={`منتج مركزي: ${item.masterProductId}`}
              subtitle={`السعر المحلي: ${item.unitPrice} YER`}
              trailing={<Badge label={item.available ? "متاح للطلب" : "موقوف"} tone={item.available ? "success" : "warning"} />}
            />
          ))
        )}
      </Card>
    </ScrollScreen>
  );
}

const styles = StyleSheet.create({
  hero: {
    padding: spacing[4],
    gap: spacing[2],
  },
  headerRow: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing[2],
  },
  metrics: {
    flexDirection: "row-reverse",
    flexWrap: "wrap",
    gap: spacing[2],
  },
  section: {
    padding: spacing[4],
    gap: spacing[2],
  },
});