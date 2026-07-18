import React from "react";
import { StyleSheet, View } from "react-native";
import { useIdentitySession } from "@bthwani/core-identity";
import {
  Badge,
  Button,
  Card,
  ListItem,
  ScrollScreen,
  StateView,
  Text,
  TextField,
  spacing,
} from "@bthwani/ui-kit";
import {
  fetchPartnerMasterProducts,
  fetchPartnerStoreAssortment,
  fetchPartnerTaxonomy,
  upsertPartnerStoreAssortmentOCC,
} from "../../shared/catalog";
import type {
  CentralCatalogDomain,
  CentralCatalogNode,
  MasterProduct,
  StoreAssortment,
} from "../../shared/catalog";

type Props = {
  readonly storeId: string;
};

export function PartnerCatalogManagementScreen({ storeId }: Props) {
  const identity = useIdentitySession();
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [domains, setDomains] = React.useState<readonly CentralCatalogDomain[]>([]);
  const [nodes, setNodes] = React.useState<readonly CentralCatalogNode[]>([]);
  const [masterProducts, setMasterProducts] = React.useState<readonly MasterProduct[]>([]);
  const [assortment, setAssortment] = React.useState<readonly StoreAssortment[]>([]);
  const [selectedProductId, setSelectedProductId] = React.useState("");
  const [price, setPrice] = React.useState("");
  const [note, setNote] = React.useState("");

  const loadData = React.useCallback(async () => {
    if (identity.state.kind !== "authenticated") return;
    setLoading(true);
    setError(null);
    try {
      const [taxonomy, products, currentAssortment] = await Promise.all([
        fetchPartnerTaxonomy(),
        fetchPartnerMasterProducts({ limit: 100 }),
        fetchPartnerStoreAssortment(storeId),
      ]);
      setDomains(taxonomy.domains);
      setNodes(taxonomy.nodes);
      setMasterProducts(products);
      setAssortment(currentAssortment);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "فشل تحميل بيانات الكتالوج المركزي.",
      );
    } finally {
      setLoading(false);
    }
  }, [identity.state.kind, storeId]);

  React.useEffect(() => {
    if (identity.state.kind === "authenticated") void loadData();
  }, [identity.state.kind, loadData]);

  const startEditing = (product: MasterProduct) => {
    const current = assortment.find(
      (item) => item.masterProductId === product.id,
    );
    setSelectedProductId(product.id);
    setPrice(current ? String(current.unitPrice) : "");
    setNote(current?.localNote ?? "");
  };

  const saveAssortment = async () => {
    const unitPrice = Number(price.trim());
    if (!selectedProductId || !Number.isFinite(unitPrice) || unitPrice < 0) {
      setError("أدخل سعراً صحيحاً للمنتج المركزي المحدد.");
      return;
    }

    const current = assortment.find(
      (item) => item.masterProductId === selectedProductId,
    );
    setSaving(true);
    setError(null);
    try {
      const saved = await upsertPartnerStoreAssortmentOCC(
        storeId,
        selectedProductId,
        {
          unitPrice,
          currency: "YER",
          available: current?.available ?? false,
          stockStatus: current?.stockStatus ?? "out_of_stock",
          localNote: note.trim(),
          customImageObjectKey: current?.customImageObjectKey ?? null,
          publicationStatus: current?.publicationStatus ?? "draft",
          expectedVersion: current?.version,
        },
      );
      setAssortment((items) => [
        ...items.filter(
          (item) => item.masterProductId !== saved.masterProductId,
        ),
        saved,
      ]);
      setSelectedProductId("");
      setPrice("");
      setNote("");
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "تعذر حفظ تشكيلة المتجر.",
      );
      await loadData();
    } finally {
      setSaving(false);
    }
  };

  if (identity.state.kind !== "authenticated") {
    return (
      <StateView
        title="تسجيل الدخول مطلوب"
        description="يرجى تسجيل الدخول بحساب الشريك للوصول إلى الكتالوج."
        tone="warning"
      />
    );
  }

  if (!storeId) {
    return (
      <StateView
        title="متجر غير محدد"
        description="اختر متجرًا محددًا قبل إدارة تشكيلته."
        tone="warning"
      />
    );
  }

  if (loading) {
    return <StateView title="جاري تحميل الكتالوج المركزي…" loading />;
  }

  if (error && assortment.length === 0 && masterProducts.length === 0) {
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

  const namesByProduct = new Map(
    masterProducts.map((product) => [product.id, product.canonicalNameAr]),
  );

  return (
    <ScrollScreen>
      <Card>
        <View style={styles.hero}>
          <View style={styles.headerRow}>
            <Text role="titleLg" align="start">
              كتالوج المتجر المركزي
            </Text>
            <Badge label="DSH" tone="info" />
          </View>
          <Text tone="secondary" align="start">
            المتجر المحدد: {storeId}
          </Text>
          <View style={styles.metrics}>
            <Badge label={`${domains.length} مجالات`} tone="neutral" />
            <Badge label={`${nodes.length} فئات`} tone="neutral" />
            <Badge
              label={`${masterProducts.length} منتجات مركزية`}
              tone="neutral"
            />
            <Badge
              label={`${assortment.length} في تشكيلة المتجر`}
              tone="neutral"
            />
          </View>
        </View>
      </Card>

      {error ? (
        <StateView
          title="تعذر إكمال آخر عملية"
          description={error}
          tone="danger"
          actionLabel="إعادة تحميل الحقيقة"
          onActionPress={loadData}
        />
      ) : null}

      <Text role="titleMd" align="start">
        المنتجات المركزية المتاحة
      </Text>
      <Card>
        {masterProducts.length === 0 ? (
          <View style={styles.section}>
            <Text tone="secondary" align="center">
              لا توجد منتجات مركزية معتمدة.
            </Text>
          </View>
        ) : (
          masterProducts.map((product) => {
            const linked = assortment.find(
              (item) => item.masterProductId === product.id,
            );
            return (
              <ListItem
                key={product.id}
                title={product.canonicalNameAr}
                subtitle={
                  linked
                    ? `${linked.unitPrice} ${linked.currency} — ${linked.publicationStatus}`
                    : "غير مضاف لتشكيلة المتجر"
                }
                trailing={
                  <Button
                    label={linked ? "تعديل" : "إضافة كمسودة"}
                    tone="secondary"
                    size="sm"
                    onPress={() => startEditing(product)}
                  />
                }
              />
            );
          })
        )}
      </Card>

      {selectedProductId ? (
        <Card>
          <View style={styles.section}>
            <Text role="titleMd" align="start">
              {namesByProduct.get(selectedProductId) ?? selectedProductId}
            </Text>
            <Text tone="secondary" align="start">
              الإضافة الجديدة تبدأ كمسودة غير متاحة وبحالة نفاد مخزون؛ يجب
              تفعيل التوفر والنشر في مسار منفصل محكوم.
            </Text>
            <TextField
              label="سعر المتجر (YER)"
              value={price}
              onChangeText={setPrice}
            />
            <TextField
              label="ملاحظة المتجر"
              value={note}
              onChangeText={setNote}
            />
            <View style={styles.actions}>
              <Button
                label="حفظ في تشكيلة المتجر"
                tone="primary"
                onPress={() => void saveAssortment()}
                disabled={saving}
              />
              <Button
                label="إلغاء"
                tone="ghost"
                onPress={() => {
                  setSelectedProductId("");
                  setPrice("");
                  setNote("");
                  setError(null);
                }}
                disabled={saving}
              />
            </View>
          </View>
        </Card>
      ) : null}

      <Text role="titleMd" align="start">
        تشكيلة المتجر الحالية
      </Text>
      <Card>
        {assortment.length === 0 ? (
          <View style={styles.section}>
            <Text tone="secondary" align="center">
              لا توجد منتجات مضافة بعد.
            </Text>
          </View>
        ) : (
          assortment.map((item) => (
            <ListItem
              key={item.id}
              title={
                namesByProduct.get(item.masterProductId) ??
                item.masterProductId
              }
              subtitle={`${item.unitPrice} ${item.currency} — ${item.publicationStatus}`}
              trailing={
                <Badge
                  label={item.available ? "متاح" : "موقوف"}
                  tone={item.available ? "success" : "warning"}
                />
              }
            />
          ))
        )}
      </Card>
    </ScrollScreen>
  );
}

const styles = StyleSheet.create({
  hero: { padding: spacing[4], gap: spacing[2] },
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
  section: { padding: spacing[4], gap: spacing[2] },
  actions: { flexDirection: "row-reverse", gap: spacing[2] },
});
