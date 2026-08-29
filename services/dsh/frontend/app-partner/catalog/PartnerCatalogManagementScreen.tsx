import React from "react";
import { Modal, Pressable, StyleSheet, View } from "react-native";
import { useIdentitySession } from "@bthwani/core-identity";
import {
  Badge,
  Box,
  Button,
  Divider,
  Icon,
  MobileScrollView,
  SearchField,
  StateView,
  Surface,
  Tabs,
  Text,
  TextField,
  colorRoles,
  spacing,
  radius,
} from "@bthwani/ui-kit";
import {
  ProductProposalAdapter,
  fetchPartnerMasterProducts,
  fetchPartnerProductProposals,
  fetchPartnerStoreAssortment,
  fetchPartnerTaxonomy,
  upsertPartnerStoreAssortmentOCC,
  withdrawPartnerProductProposal,
} from "../../shared/catalog";
import type {
  CentralCatalogDomain,
  CentralCatalogNode,
  MasterProduct,
  ProductProposal,
  StoreAssortment,
} from "../../shared/catalog";
import { InventoryConfigurationModal } from "./InventoryConfigurationModal";
import { PriceScheduleModal } from "./PriceScheduleModal";
import { PartnerReelsManagementSection } from "./PartnerReelsManagementSection";

type Props = {
  readonly storeId: string;
};

type CatalogTabId = "assortment" | "master" | "proposals" | "reels";

type CatalogReadback = {
  readonly domains: readonly CentralCatalogDomain[];
  readonly nodes: readonly CentralCatalogNode[];
  readonly masterProducts: readonly MasterProduct[];
  readonly assortment: readonly StoreAssortment[];
  readonly proposals: readonly ProductProposal[];
};

export function PartnerCatalogManagementScreen({ storeId }: Props) {
  const identity = useIdentitySession();
  const actorId = identity.state.kind === "authenticated" ? identity.state.identity.subject : "";
  const normalizedStoreId = storeId.trim();
  const scopeKey = `${actorId}:${normalizedStoreId}`;
  const scopeKeyRef = React.useRef(scopeKey);
  scopeKeyRef.current = scopeKey;
  const mountedRef = React.useRef(true);
  const requestSeqRef = React.useRef(0);
  const mutationBusyRef = React.useRef(false);

  const [activeTab, setActiveTab] = React.useState<CatalogTabId>("assortment");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [domains, setDomains] = React.useState<readonly CentralCatalogDomain[]>([]);
  const [nodes, setNodes] = React.useState<readonly CentralCatalogNode[]>([]);
  const [masterProducts, setMasterProducts] = React.useState<readonly MasterProduct[]>([]);
  const [assortment, setAssortment] = React.useState<readonly StoreAssortment[]>([]);
  const [proposals, setProposals] = React.useState<readonly ProductProposal[]>([]);

  const [editingProductId, setEditingProductId] = React.useState<string | null>(null);
  const [editPrice, setEditPrice] = React.useState("");
  const [editNote, setEditNote] = React.useState("");
  const [inventoryModalProductId, setInventoryModalProductId] = React.useState<string | null>(null);
  const [priceModalProductId, setPriceModalProductId] = React.useState<string | null>(null);

  React.useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      requestSeqRef.current += 1;
      mutationBusyRef.current = false;
    };
  }, []);

  const clearReadback = React.useCallback(() => {
    setDomains([]);
    setNodes([]);
    setMasterProducts([]);
    setAssortment([]);
    setProposals([]);
  }, []);

  const loadData = React.useCallback(async (): Promise<CatalogReadback | null> => {
    const requestSeq = ++requestSeqRef.current;
    const requestScopeKey = scopeKey;
    if (identity.state.kind !== "authenticated" || !normalizedStoreId) {
      if (mountedRef.current && requestScopeKey === scopeKeyRef.current) {
        clearReadback();
        setLoading(false);
        setError(null);
      }
      return null;
    }
    setLoading(true);
    setError(null);
    try {
      const [taxonomy, products, currentAssortment, proposalPage] = await Promise.all([
        fetchPartnerTaxonomy(),
        fetchPartnerMasterProducts({ limit: 100 }),
        fetchPartnerStoreAssortment(normalizedStoreId),
        fetchPartnerProductProposals(normalizedStoreId, { limit: 100, offset: 0 }),
      ]);
      if (
        !mountedRef.current
        || requestSeq !== requestSeqRef.current
        || requestScopeKey !== scopeKeyRef.current
      ) return null;
      const readback: CatalogReadback = {
        domains: taxonomy.domains,
        nodes: taxonomy.nodes,
        masterProducts: products,
        assortment: currentAssortment,
        proposals: proposalPage.items,
      };
      setDomains(readback.domains);
      setNodes(readback.nodes);
      setMasterProducts(readback.masterProducts);
      setAssortment(readback.assortment);
      setProposals(readback.proposals);
      return readback;
    } catch (caught) {
      if (
        !mountedRef.current
        || requestSeq !== requestSeqRef.current
        || requestScopeKey !== scopeKeyRef.current
      ) return null;
      clearReadback();
      setError(
        caught instanceof Error
          ? caught.message
          : "فشل تحميل بيانات الكتالوج والمخزون.",
      );
      return null;
    } finally {
      if (
        mountedRef.current
        && requestSeq === requestSeqRef.current
        && requestScopeKey === scopeKeyRef.current
      ) {
        setLoading(false);
      }
    }
  }, [clearReadback, identity.state.kind, normalizedStoreId, scopeKey]);

  React.useEffect(() => {
    void loadData();
  }, [loadData]);

  const runScopedMutation = React.useCallback(async <T,>(
    operation: () => Promise<T>,
    verifyReadback: (readback: CatalogReadback, mutationResult: T) => boolean,
    failureMessage: string,
    onVerified?: () => void,
  ): Promise<boolean> => {
    if (mutationBusyRef.current) {
      setError("يوجد تعديل كتالوج قيد التنفيذ. انتظر اكتماله وإعادة القراءة.");
      return false;
    }
    const mutationScopeKey = scopeKey;
    mutationBusyRef.current = true;
    setSaving(true);
    setError(null);
    try {
      const mutationResult = await operation();
      if (!mountedRef.current || mutationScopeKey !== scopeKeyRef.current) return false;
      const readback = await loadData();
      if (!readback || !verifyReadback(readback, mutationResult)) {
        if (mountedRef.current && mutationScopeKey === scopeKeyRef.current) {
          setError("تم إرسال التغيير، لكن لم تثبت القراءة canonical نفس الإصدار والحالة. أعد التحميل قبل أي تعديل جديد.");
        }
        return false;
      }
      if (mountedRef.current && mutationScopeKey === scopeKeyRef.current) {
        onVerified?.();
      }
      return true;
    } catch (caught) {
      if (mountedRef.current && mutationScopeKey === scopeKeyRef.current) {
        const readback = await loadData();
        if (mountedRef.current && mutationScopeKey === scopeKeyRef.current) {
          setError(
            `${caught instanceof Error ? caught.message : failureMessage}${
              readback ? " — تمت إعادة قراءة الحقيقة الحالية من DSH." : ""
            }`,
          );
        }
      }
      return false;
    } finally {
      mutationBusyRef.current = false;
      if (mountedRef.current && mutationScopeKey === scopeKeyRef.current) setSaving(false);
    }
  }, [loadData, scopeKey]);

  const namesByProduct = React.useMemo(() => {
    return new Map(masterProducts.map((p) => [p.id, p.canonicalNameAr]));
  }, [masterProducts]);

  const startEditing = (productId: string) => {
    const current = assortment.find((item) => item.masterProductId === productId);
    setEditingProductId(productId);
    setEditPrice(current ? String(current.unitPrice) : "");
    setEditNote(current?.localNote ?? "");
  };

  const saveAssortment = async () => {
    if (!editingProductId) return;
    const unitPrice = Number(editPrice.trim());
    if (!Number.isFinite(unitPrice) || unitPrice < 0) {
      setError("يرجى إدخال سعر صحيح للمنتج.");
      return;
    }

    const productId = editingProductId;
    const note = editNote.trim();
    const current = assortment.find((item) => item.masterProductId === productId);
    await runScopedMutation(
      () => upsertPartnerStoreAssortmentOCC(
        normalizedStoreId,
        productId,
        {
          unitPrice,
          currency: current?.currency ?? "YER",
          available: current?.available ?? true,
          stockStatus: current?.stockStatus ?? "in_stock",
          localNote: note,
          customImageObjectKey: current?.customImageObjectKey ?? null,
          publicationStatus: current?.publicationStatus ?? "published",
          expectedVersion: current?.version,
        },
      ),
      (readback, saved) => readback.assortment.some((item) =>
        item.masterProductId === saved.masterProductId
        && item.version === saved.version
        && item.unitPrice === saved.unitPrice
        && item.available === saved.available
        && item.localNote === saved.localNote,
      ),
      "تعذر حفظ المنتج.",
      () => {
        setEditingProductId(null);
        setEditPrice("");
        setEditNote("");
      },
    );
  };

  const toggleAvailability = async (item: StoreAssortment) => {
    const nextAvailable = !item.available;
    await runScopedMutation(
      () => upsertPartnerStoreAssortmentOCC(
        normalizedStoreId,
        item.masterProductId,
        {
          unitPrice: item.unitPrice,
          currency: item.currency,
          available: nextAvailable,
          stockStatus: nextAvailable ? "in_stock" : "out_of_stock",
          localNote: item.localNote,
          customImageObjectKey: item.customImageObjectKey,
          publicationStatus: item.publicationStatus,
          expectedVersion: item.version,
        },
      ),
      (readback, saved) => readback.assortment.some((current) =>
        current.masterProductId === saved.masterProductId
        && current.version === saved.version
        && current.available === saved.available
        && current.stockStatus === saved.stockStatus,
      ),
      "تعذر تحديث حالة التوفر.",
    );
  };

  const withdrawProposal = async (proposalId: string, expectedVersion: number) => {
    await runScopedMutation(
      () => withdrawPartnerProductProposal(proposalId, expectedVersion),
      (readback, withdrawn) => readback.proposals.some((proposal) =>
        proposal.id === withdrawn.id
        && proposal.version === withdrawn.version
        && proposal.status === withdrawn.status,
      ),
      "تعذر سحب الاقتراح.",
    );
  };

  if (identity.state.kind !== "authenticated") {
    return (
      <StateView
        title="تسجيل الدخول مطلوب"
        description="يرجى تسجيل الدخول بحساب الشريك للوصول إلى إدارة المخزون."
        tone="warning"
      />
    );
  }

  if (!normalizedStoreId) {
    return (
      <StateView
        title="متجر غير محدد"
        description="اختر متجرًا محددًا من القائمة العلوية لإدارة تشكيلته ومخزونه."
        tone="warning"
      />
    );
  }

  if (loading) {
    return <StateView title="جارٍ تحميل الكتالوج والمخزون…" loading />;
  }

  const queryNormalized = searchQuery.trim().toLowerCase();
  const filteredAssortment = assortment.filter((item) => {
    if (!queryNormalized) return true;
    const name = namesByProduct.get(item.masterProductId) ?? item.masterProductId;
    return name.toLowerCase().includes(queryNormalized) || (item.localNote ?? "").toLowerCase().includes(queryNormalized);
  });

  const filteredMasterProducts = masterProducts.filter((product) => {
    if (!queryNormalized) return true;
    return product.canonicalNameAr.toLowerCase().includes(queryNormalized);
  });

  const tabItems = [
    { id: "assortment", label: `تشكيلة المتجر (${assortment.length})` },
    { id: "master", label: `الكتالوج العام (${masterProducts.length})` },
    { id: "proposals", label: `الاقتراحات (${proposals.length})` },
    { id: "reels", label: "الريلز" },
  ];

  const availableCount = assortment.filter((i) => i.available).length;
  const outOfStockCount = assortment.length - availableCount;

  return (
    <MobileScrollView fill padding={4} gap={4}>
      <Surface tone="raised" padding={4} gap={3} radiusToken="xl">
        <Box layoutDirection="row" justify="space-between" align="center">
          <Box gap={1}>
            <Text role="titleLg">إدارة المخزون والكتالوج</Text>
            <Text role="caption" tone="muted">تحكم فوري بالأسعار، التوفر، والأصناف المركزية</Text>
          </Box>
          <Badge label="مباشر DSH" tone="brand" />
        </Box>

        <Box layoutDirection="row" gap={2} style={{ flexWrap: "wrap" }}>
          <Badge label={`${assortment.length} صنف مسجل`} tone="neutral" />
          <Badge label={`${availableCount} متوفر للطلب`} tone="success" />
          {outOfStockCount > 0 ? (
            <Badge label={`${outOfStockCount} موقوف / نافد`} tone="warning" />
          ) : null}
        </Box>
      </Surface>

      <Tabs
        items={tabItems}
        value={activeTab}
        onValueChange={(val) => setActiveTab(val as CatalogTabId)}
      />

      {activeTab !== "reels" && activeTab !== "proposals" ? (
        <SearchField
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder={activeTab === "assortment" ? "بحث في منتجات متجرك…" : "بحث في الكتالوج العام…"}
        />
      ) : null}

      {error ? (
        <StateView
          title="تنبيه بالعملية"
          description={error}
          tone="danger"
          actionLabel="تحديث البيانات"
          onActionPress={() => { void loadData(); }}
        />
      ) : null}

      {activeTab === "assortment" && (
        <Box gap={3}>
          {filteredAssortment.length === 0 ? (
            <StateView
              title={searchQuery ? "لا توجد نتائج مطابقة" : "تشكيلة المتجر فارغة"}
              description={searchQuery ? "جرّب البحث باسم آخر." : "انتقل لتبويب الكتالوج العام لإضافة منتجات إلى متجرك بنقرة واحدة."}
              {...(!searchQuery ? { actionLabel: "تصفح الكتالوج العام", onActionPress: () => setActiveTab("master") } : {})}
            />
          ) : (
            filteredAssortment.map((item) => {
              const name = namesByProduct.get(item.masterProductId) ?? "منتج بدون اسم مركزي";
              return (
                <Surface key={item.id} tone="raised" padding={4} gap={3} radiusToken="lg">
                  <Box layoutDirection="row" justify="space-between" align="flex-start">
                    <Box gap={1} style={{ flex: 1 }}>
                      <Text role="titleSm">{name}</Text>
                      {item.localNote ? (
                        <Text role="caption" tone="muted">{item.localNote}</Text>
                      ) : null}
                    </Box>
                    <Box align="flex-end" gap={1}>
                      <Badge
                        label={`${item.unitPrice} ${item.currency || 'YER'}`}
                        tone="brand"
                      />
                      <Badge
                        label={item.available ? "متوفر للطلب" : "غير متوفر"}
                        tone={item.available ? "success" : "warning"}
                      />
                    </Box>
                  </Box>

                  <Divider />

                  <Box layoutDirection="row" gap={2} align="center" style={{ flexWrap: "wrap" }}>
                    <Button
                      label="تعديل السعر"
                      tone="secondary"
                      size="sm"
                      fullWidth={false}
                      onPress={() => startEditing(item.masterProductId)}
                    />
                    <Button
                      label={item.available ? "إيقاف مؤقت" : "تفعيل التوفر"}
                      tone={item.available ? "secondary" : "primary"}
                      size="sm"
                      fullWidth={false}
                      disabled={saving}
                      onPress={() => void toggleAvailability(item)}
                    />
                    <Button
                      label="إعدادات المخزون"
                      tone="ghost"
                      size="sm"
                      fullWidth={false}
                      onPress={() => setInventoryModalProductId(item.masterProductId)}
                    />
                    <Button
                      label="جدول الأسعار"
                      tone="ghost"
                      size="sm"
                      fullWidth={false}
                      onPress={() => setPriceModalProductId(item.masterProductId)}
                    />
                  </Box>
                </Surface>
              );
            })
          )}
        </Box>
      )}

      {activeTab === "master" && (
        <Box gap={3}>
          {filteredMasterProducts.length === 0 ? (
            <StateView
              title="لا توجد منتجات مركزية"
              description={searchQuery ? "لا توجد نتائج بحث مطابقة." : "لم يتم تسجيل منتجات مركزية متاحة حالياً."}
            />
          ) : (
            filteredMasterProducts.map((product) => {
              const linked = assortment.find((i) => i.masterProductId === product.id);
              return (
                <Surface key={product.id} tone="raised" padding={4} gap={3} radiusToken="lg">
                  <Box layoutDirection="row" justify="space-between" align="center">
                    <Box gap={1} style={{ flex: 1 }}>
                      <Text role="titleSm">{product.canonicalNameAr}</Text>
                      <Text role="caption" tone="muted">
                        {linked ? `مضاف لمتجرك بسعر ${linked.unitPrice} ${linked.currency}` : "غير مضاف بعد"}
                      </Text>
                    </Box>
                    <Badge
                      label={linked ? "في متجرك" : "كتالوج عام"}
                      tone={linked ? "success" : "neutral"}
                    />
                  </Box>

                  <Box layoutDirection="row" gap={2} align="center">
                    <Button
                      label={linked ? "تعديل السعر والملاحظة" : "إضافة إلى متجري"}
                      tone={linked ? "secondary" : "primary"}
                      size="sm"
                      fullWidth={false}
                      onPress={() => startEditing(product.id)}
                    />
                  </Box>
                </Surface>
              );
            })
          )}
        </Box>
      )}

      {activeTab === "proposals" && (
        <Box gap={3}>
          {proposals.length === 0 ? (
            <StateView
              title="لا توجد اقتراحات مرسلة"
              description="يمكنك اقتراح منتجات جديدة غير متوفرة في الكتالوج المركزي لتتم مراجعتها من إدارة المنصة."
            />
          ) : (
            proposals.map((proposal) => {
              const presentation = new ProductProposalAdapter(proposal);
              const canWithdraw = ["catalog-draft", "partner-proposed", "needs-fix", "conflict"].includes(proposal.status);
              return (
                <Surface key={proposal.id} tone="raised" padding={4} gap={2} radiusToken="lg">
                  <Box layoutDirection="row" justify="space-between" align="center">
                    <Text role="titleSm">{proposal.proposedNameAr}</Text>
                    <Badge label={presentation.getArabicLabel()} tone={presentation.getTone()} />
                  </Box>
                  <Text role="caption" tone="muted">{proposal.reviewNote || "بانتظار مراجعة مشرف الكتالوج"}</Text>
                  {canWithdraw ? (
                    <Box layoutDirection="row" justify="flex-end">
                      <Button
                        label="سحب الاقتراح"
                        tone="danger"
                        size="sm"
                        fullWidth={false}
                        disabled={saving}
                        onPress={() => void withdrawProposal(proposal.id, proposal.version)}
                      />
                    </Box>
                  ) : null}
                </Surface>
              );
            })
          )}
        </Box>
      )}

      {activeTab === "reels" && (
        <PartnerReelsManagementSection storeId={normalizedStoreId} />
      )}

      {editingProductId && (
        <Modal
          visible={true}
          transparent
          animationType="fade"
          onRequestClose={() => setEditingProductId(null)}
        >
          <View style={styles.modalOverlay}>
            <Pressable style={styles.modalBackdrop} onPress={() => setEditingProductId(null)} />
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <Text role="titleMd">تحديد سعر المنتج في المتجر</Text>
                <Pressable onPress={() => setEditingProductId(null)}>
                  <Icon name="close-outline" size={24} tone="muted" />
                </Pressable>
              </View>

              <Text role="bodyStrong" style={styles.productTitle}>
                {namesByProduct.get(editingProductId) ?? editingProductId}
              </Text>

              <TextField
                label="سعر البيع (ريال)"
                value={editPrice}
                onChangeText={setEditPrice}
                placeholder="أدخل سعر الوحدة…"
                keyboardType="numeric"
              />

              <TextField
                label="ملاحظة داخلية أو وصف مختصر (اختياري)"
                value={editNote}
                onChangeText={setEditNote}
                placeholder="مثال: متوفر حجم عائلي…"
              />

              <Box layoutDirection="row" gap={2} justify="flex-end" style={{ marginTop: spacing[2] }}>
                <Button
                  label="إلغاء"
                  tone="ghost"
                  onPress={() => setEditingProductId(null)}
                  disabled={saving}
                />
                <Button
                  label={saving ? "جارٍ الحفظ…" : "حفظ في المتجر"}
                  tone="primary"
                  onPress={() => void saveAssortment()}
                  disabled={saving}
                />
              </Box>
            </View>
          </View>
        </Modal>
      )}

      {inventoryModalProductId && (
        <InventoryConfigurationModal
          visible={true}
          storeId={normalizedStoreId}
          masterProductId={inventoryModalProductId}
          onClose={() => setInventoryModalProductId(null)}
          onSave={() => {
            setInventoryModalProductId(null);
            void loadData();
          }}
        />
      )}

      {priceModalProductId && (
        <PriceScheduleModal
          visible={true}
          storeId={normalizedStoreId}
          masterProductId={priceModalProductId}
          onClose={() => setPriceModalProductId(null)}
          onSave={() => {
            setPriceModalProductId(null);
            void loadData();
          }}
        />
      )}
    </MobileScrollView>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: colorRoles.mediaScrimStrong,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing[4],
  },
  modalBackdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalCard: {
    width: "100%",
    maxWidth: 480,
    backgroundColor: colorRoles.surfaceBase,
    borderRadius: 20,
    padding: spacing[5],
    gap: spacing[3],
    shadowColor: colorRoles.shadowBase,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: spacing[2],
    borderBottomWidth: 1,
    borderBottomColor: colorRoles.borderSubtle,
  },
  productTitle: {
    color: colorRoles.brandAction,
    fontSize: 16,
  },
});