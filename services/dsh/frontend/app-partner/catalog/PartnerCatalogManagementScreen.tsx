import React, { useState } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { useIdentitySession } from "@bthwani/core-identity";
import {
  Badge,
  Button,
  Card,
  Header,
  ScrollScreen,
  StateView,
  Text,
  TextField,
  spacing,
  radius,
} from "@bthwani/ui-kit";
import { usePartnerCatalogController } from "../../shared/catalog";
import {
  PARTNER_CATALOG_TABS,
  buildCatalogProductRowViewModel,
  buildCatalogCategoryViewModel,
  filterProductsByQuery,
  filterCategoriesByQuery,
  type PartnerCatalogTabId,
} from "../../shared/catalog";
import type { CatalogProduct, CatalogCategory } from "../../shared/catalog";

// ─── Types re-exported from registry ─────────────────────────────────────────
type CatalogTab = PartnerCatalogTabId;

// ─── Product Row ─────────────────────────────────────────────────────────────

function ProductRow({ product }: { product: CatalogProduct }) {
  const vm = buildCatalogProductRowViewModel(product);
  return (
    <View style={styles.productRow}>
      <View style={styles.productThumb}>
        {vm.primaryImageUrl ? null : <Text style={{ fontSize: 20 }}>📦</Text>}
      </View>
      <View style={styles.productInfo}>
        <Text role="body" style={styles.productName}>{vm.name}</Text>
        <Text role="caption" tone="muted" style={styles.productSku}>SKU: {vm.sku}</Text>
        {vm.description ? (
          <Text role="caption" tone="muted" style={styles.productDesc} numberOfLines={1}>
            {vm.description}
          </Text>
        ) : null}
        {vm.unitLabel ? (
          <Text role="caption" tone="muted" style={styles.productDesc}>{vm.unitLabel}</Text>
        ) : null}
      </View>
      <View style={styles.productBadges}>
        <Badge label={vm.statusLabel} tone={vm.statusTone} />
        <Badge label={vm.stockLabel} tone={vm.stockTone} />
        {vm.hasDiscount && vm.discountLabel ? (
          <Badge label={vm.discountLabel} tone="info" />
        ) : null}
        <Text role="caption" style={styles.productPrice}>{vm.priceReference}</Text>
      </View>
    </View>
  );
}

// ─── Category Row ─────────────────────────────────────────────────────────────

function CategoryRow({ category }: { category: CatalogCategory }) {
  const vm = buildCatalogCategoryViewModel(category);
  return (
    <View style={styles.categoryRow}>
      <View style={styles.categoryIcon}>
        <Text style={{ fontSize: 18 }}>🗂</Text>
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text role="body" style={styles.categoryName}>{vm.name}</Text>
        {vm.description ? (
          <Text role="caption" tone="muted" style={{ textAlign: "right" }}>{vm.description}</Text>
        ) : null}
      </View>
      <Badge label={vm.statusLabel} tone={vm.statusTone} />
    </View>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

export function PartnerCatalogManagementScreen() {
  const identity = useIdentitySession();
  const controller = usePartnerCatalogController(identity.state.kind);

  const [activeTab, setActiveTab] = useState<CatalogTab>("products");
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [isAddingCategory, setIsAddingCategory] = useState(false);

  // Add Product form state
  const [productName, setProductName] = useState("");
  const [sku, setSku] = useState("");
  const [priceReference, setPriceReference] = useState("");
  const [productDesc, setProductDesc] = useState("");

  // Add Category form state
  const [categoryName, setCategoryName] = useState("");
  const [categoryDesc, setCategoryDesc] = useState("");

  if (identity.state.kind !== "authenticated") {
    return (
      <StateView
        title="تسجيل الدخول مطلوب"
        description="يجب تسجيل دخولك كشريك للوصول لإدارة الكتالوج."
      />
    );
  }

  if (controller.state.kind === "loading") {
    return <StateView title="جاري تحميل كتالوج المتجر…" loading />;
  }

  if (controller.state.kind === "permission_denied") {
    return (
      <StateView
        title="لا تملك صلاحية إدارة الكتالوج"
        description="تأكد من أنك مسجّل كشريك نشط ومرتبط بمتجر."
      />
    );
  }

  if (controller.state.kind === "error") {
    return (
      <StateView
        title="تعذر تحميل الكتالوج"
        description={controller.state.message}
        actionLabel="إعادة المحاولة"
        onActionPress={controller.retry}
      />
    );
  }

  const categories = controller.state.kind === "success" ? [...controller.state.catalog.categories] : [];
  const products = controller.state.kind === "success" ? [...controller.state.catalog.products] : [];
  const storeId = controller.state.kind === "success" ? controller.state.catalog.storeId : undefined;

  // Use registry filter functions — no inline logic in the UI surface
  const filteredProducts = filterProductsByQuery(products, searchQuery);
  const filteredCategories = filterCategoriesByQuery(categories, searchQuery);

  const handleSubmitCatalog = () => {
    if (products.length > 0) void controller.submit();
  };

  return (
    <ScrollScreen>
      <Header
        title="إدارة الكتالوج"
        subtitle={storeId ? `المتجر: ${storeId}` : "إدارة منتجاتك وفئاتك"}
      />

      {/* KPI row */}
      <View style={styles.kpiRow}>
        <View style={styles.kpiCard}>
          <Text role="titleMd" style={styles.kpiValue}>{products.length}</Text>
          <Text role="caption" tone="muted" style={styles.kpiLabel}>منتج</Text>
        </View>
        <View style={styles.kpiCard}>
          <Text role="titleMd" style={styles.kpiValue}>{categories.length}</Text>
          <Text role="caption" tone="muted" style={styles.kpiLabel}>فئة</Text>
        </View>
        <View style={styles.kpiCard}>
          <Text role="titleMd" style={styles.kpiValue}>
            {products.filter((p) => p.isActive).length}
          </Text>
          <Text role="caption" tone="muted" style={styles.kpiLabel}>نشط</Text>
        </View>
      </View>

      {/* Tab Bar — from registry */}
      <View style={styles.tabBar}>
        {PARTNER_CATALOG_TABS.map((tab) => (
          <TouchableOpacity
            key={tab.id}
            style={[styles.tab, activeTab === tab.id && styles.tabActive]}
            onPress={() => setActiveTab(tab.id)}
          >
            <Text style={[styles.tabText, activeTab === tab.id && styles.tabTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Search */}
      <View style={styles.searchRow}>
        <TextField
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="بحث بالاسم أو SKU…"
        />
      </View>

      {/* ── Products Tab ─────────────────────────────────────────────────── */}
      {activeTab === "products" && (
        <View style={styles.tabContent}>
          <View style={styles.actionHeader}>
            <Text role="titleSm" style={styles.sectionTitle}>
              المنتجات ({filteredProducts.length})
            </Text>
            <Button
              label={isAddingProduct ? "إلغاء" : "إضافة منتج"}
              tone={isAddingProduct ? "ghost" : "primary"}
              onPress={() => setIsAddingProduct((v) => !v)}
            />
          </View>

          {isAddingProduct && (
            <Card style={styles.formCard}>
              <Text role="titleSm" style={styles.sectionTitle}>منتج جديد</Text>
              <TextField
                label="اسم المنتج"
                value={productName}
                onChangeText={setProductName}
                placeholder="اسم المنتج"
              />
              <TextField
                label="SKU"
                value={sku}
                onChangeText={setSku}
                placeholder="رمز المنتج"
              />
              <TextField
                label="مرجع السعر (WLT)"
                value={priceReference}
                onChangeText={setPriceReference}
                placeholder="مرجع السعر"
              />
              <TextField
                label="الوصف"
                value={productDesc}
                onChangeText={setProductDesc}
                placeholder="وصف مختصر"
              />
              <Button
                label="حفظ المنتج"
                disabled={
                  !productName.trim() || !sku.trim() || !priceReference.trim() ||
                  controller.action === "submitting"
                }
                onPress={() => {
                  void controller.createProduct({
                    categoryId: categories[0]?.id ?? null,
                    name: productName.trim(),
                    description: productDesc.trim(),
                    sku: sku.trim(),
                    priceReference: priceReference.trim(),
                  });
                  setProductName("");
                  setSku("");
                  setPriceReference("");
                  setProductDesc("");
                  setIsAddingProduct(false);
                }}
              />
            </Card>
          )}

          {filteredProducts.length === 0 ? (
            <StateView
              title="لا توجد منتجات"
              description={
                searchQuery.trim()
                  ? `لا توجد نتائج لـ "${searchQuery}"`
                  : "ابدأ بإضافة أول منتج لمتجرك."
              }
            />
          ) : (
            <Card style={styles.listCard}>
              {filteredProducts.map((p, i) => (
                <View key={p.id}>
                  <ProductRow product={p} />
                  {i < filteredProducts.length - 1 && <View style={styles.divider} />}
                </View>
              ))}
            </Card>
          )}
        </View>
      )}

      {/* ── Categories Tab ───────────────────────────────────────────────── */}
      {activeTab === "categories" && (
        <View style={styles.tabContent}>
          <View style={styles.actionHeader}>
            <Text role="titleSm" style={styles.sectionTitle}>
              الفئات ({filteredCategories.length})
            </Text>
            <Button
              label={isAddingCategory ? "إلغاء" : "إضافة فئة"}
              tone={isAddingCategory ? "ghost" : "primary"}
              onPress={() => setIsAddingCategory((v) => !v)}
            />
          </View>

          {isAddingCategory && (
            <Card style={styles.formCard}>
              <Text role="titleSm" style={styles.sectionTitle}>فئة جديدة</Text>
              <TextField
                label="اسم الفئة"
                value={categoryName}
                onChangeText={setCategoryName}
                placeholder="مثال: الوجبات الرئيسية"
              />
              <TextField
                label="الوصف"
                value={categoryDesc}
                onChangeText={setCategoryDesc}
                placeholder="وصف الفئة"
              />
              <Button
                label="حفظ الفئة"
                disabled={
                  categoryName.trim().length === 0 || controller.action === "submitting"
                }
                onPress={() => {
                  void controller.createCategory({
                    name: categoryName.trim(),
                    description: categoryDesc.trim(),
                    sortOrder: categories.length + 1,
                  });
                  setCategoryName("");
                  setCategoryDesc("");
                  setIsAddingCategory(false);
                }}
              />
            </Card>
          )}

          {filteredCategories.length === 0 ? (
            <StateView
              title="لا توجد فئات"
              description="أضف فئة لتنظيم منتجاتك."
            />
          ) : (
            <Card style={styles.listCard}>
              {filteredCategories.map((c, i) => (
                <View key={c.id}>
                  <CategoryRow category={c} />
                  {i < filteredCategories.length - 1 && <View style={styles.divider} />}
                </View>
              ))}
            </Card>
          )}
        </View>
      )}

      {/* ── Submissions Tab ──────────────────────────────────────────────── */}
      {activeTab === "submissions" && (
        <View style={styles.tabContent}>
          <Text role="titleSm" style={[styles.sectionTitle, { marginBottom: spacing[2] }]}>
            حالة الإرسال للاعتماد
          </Text>
          <Card style={styles.submitCard}>
            <Text role="body" style={{ textAlign: "right", color: "#475569", marginBottom: spacing[3] }}>
              بعد إضافة منتجاتك وفئاتك، أرسل الكتالوج للاعتماد من لوحة التحكم المركزية.
            </Text>
            <Button
              label="إرسال الكتالوج للاعتماد"
              tone="success"
              disabled={products.length === 0 || controller.action === "submitting"}
              onPress={handleSubmitCatalog}
            />
            {controller.action === "error" && (
              <Text tone="danger" style={{ marginTop: spacing[2], textAlign: "right" }}>
                تعذر حفظ التغيير. أعد تحميل النسخة وحاول مجددًا.
              </Text>
            )}
          </Card>
        </View>
      )}
    </ScrollScreen>
  );
}

const styles = StyleSheet.create({
  kpiRow: {
    flexDirection: "row-reverse",
    gap: spacing[3],
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
  },
  kpiCard: {
    flex: 1,
    backgroundColor: "#FFF",
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: spacing[3],
    alignItems: "center",
    gap: spacing[1],
  },
  kpiValue: {
    fontWeight: "800",
    color: "#FF500D",
    fontSize: 22,
  },
  kpiLabel: {
    color: "#64748B",
    textAlign: "center",
  },
  tabBar: {
    flexDirection: "row-reverse",
    backgroundColor: "#FFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    paddingHorizontal: spacing[4],
  },
  tab: {
    flex: 1,
    paddingVertical: spacing[3],
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabActive: {
    borderBottomColor: "#FF500D",
  },
  tabText: {
    fontSize: 13,
    color: "#64748B",
    fontWeight: "600",
    textAlign: "center",
  },
  tabTextActive: {
    color: "#FF500D",
    fontWeight: "700",
  },
  searchRow: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
  },
  tabContent: {
    padding: spacing[4],
    gap: spacing[3],
  },
  actionHeader: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing[2],
  },
  sectionTitle: {
    fontWeight: "700",
    color: "#1E293B",
    textAlign: "right",
  },
  formCard: {
    padding: spacing[4],
    gap: spacing[3],
    backgroundColor: "#FFF",
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: spacing[3],
  },
  listCard: {
    backgroundColor: "#FFF",
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    overflow: "hidden",
  },
  productRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    padding: spacing[4],
    gap: spacing[3],
  },
  productThumb: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
  },
  productInfo: {
    flex: 1,
    gap: 2,
  },
  productName: {
    fontWeight: "600",
    color: "#1E293B",
    textAlign: "right",
  },
  productSku: {
    textAlign: "right",
    fontFamily: "monospace",
    fontSize: 11,
  },
  productDesc: {
    textAlign: "right",
    color: "#94A3B8",
    fontSize: 11,
  },
  productBadges: {
    alignItems: "flex-end",
    gap: spacing[1],
  },
  productPrice: {
    fontWeight: "700",
    color: "#FF500D",
    fontSize: 13,
    textAlign: "right",
  },
  categoryRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    padding: spacing[4],
    gap: spacing[3],
  },
  categoryIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "#FFF7F5",
    borderWidth: 1,
    borderColor: "#FDDCCA",
    alignItems: "center",
    justifyContent: "center",
  },
  categoryName: {
    fontWeight: "600",
    color: "#1E293B",
    textAlign: "right",
  },
  divider: {
    height: 1,
    backgroundColor: "#F1F5F9",
    marginHorizontal: spacing[4],
  },
  submitCard: {
    padding: spacing[4],
    backgroundColor: "#F0FDF4",
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: "#BBF7D0",
  },
});

export default PartnerCatalogManagementScreen;
