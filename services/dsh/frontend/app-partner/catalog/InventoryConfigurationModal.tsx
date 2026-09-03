import React from "react";
import { View, StyleSheet } from "react-native";
import { Button, Dialog, Text, TextField, spacing, resolveRowDirection, useDirection } from "@bthwani/ui-kit";
import { fetchPartnerStoreAssortmentInventory, upsertPartnerStoreAssortmentInventory } from "../../catalog";
import type { StoreAssortmentInventory, StoreAssortmentInventoryInput } from "../../catalog";

type Props = {
  readonly visible: boolean;
  readonly storeId: string;
  readonly masterProductId: string;
  readonly onClose: () => void;
  readonly onSave: () => void;
};

export function InventoryConfigurationModal({
  visible,
  storeId,
  masterProductId,
  onClose,
  onSave,
}: Props) {
  const { direction } = useDirection();
  const [policyType, setPolicyType] = React.useState<"signal" | "quantity" | "infinite">("signal");
  const [quantity, setQuantity] = React.useState("0");
  const [minOrder, setMinOrder] = React.useState("1");
  const [maxOrder, setMaxOrder] = React.useState("100");
  const [stepQuantity, setStepQuantity] = React.useState("1");
  const [inventory, setInventory] = React.useState<StoreAssortmentInventory | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const mountedRef = React.useRef(true);
  const scopeKey = `${storeId}:${masterProductId}`;
  const scopeKeyRef = React.useRef(scopeKey);
  scopeKeyRef.current = scopeKey;

  React.useEffect(() => () => {
    mountedRef.current = false;
  }, []);

  React.useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    setInventory(null);
    void fetchPartnerStoreAssortmentInventory(storeId, masterProductId)
      .then((loaded) => {
        if (cancelled) return;
        setInventory(loaded);
        setPolicyType(loaded.policyType);
        setQuantity(String(loaded.quantity));
        setMinOrder(String(loaded.minOrderQuantity));
        setMaxOrder(String(loaded.maxOrderQuantity));
        setStepQuantity(String(loaded.stepQuantity));
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "تعذر تحميل مصدر حقيقة المخزون.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [visible, storeId, masterProductId]);

  const handleSave = async () => {
    if (!inventory) {
      setError("لا يمكن الحفظ قبل تحميل نسخة المخزون canonical.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const operationScopeKey = scopeKey;
      const parsedQuantity = parseInteger(quantity, "الكمية");
      const minOrderQuantity = parseInteger(minOrder, "الحد الأدنى");
      const maxOrderQuantity = parseInteger(maxOrder, "الحد الأقصى");
      const stepQuantityValue = parseInteger(stepQuantity, "التدرج");
      const input: StoreAssortmentInventoryInput = {
        policyType,
        quantity: parsedQuantity,
        minOrderQuantity,
        maxOrderQuantity,
        stepQuantity: stepQuantityValue,
        expectedVersion: inventory.version,
      };
      if (parsedQuantity < 0 || minOrderQuantity < 1 || maxOrderQuantity < minOrderQuantity || stepQuantityValue < 1) {
        throw new Error("تحقق من حدود وكميات المخزون.");
      }
      await upsertPartnerStoreAssortmentInventory(storeId, masterProductId, input);
      const readback = await fetchPartnerStoreAssortmentInventory(storeId, masterProductId);
      if (!mountedRef.current || operationScopeKey !== scopeKeyRef.current) return;
      if (!isExactInventoryReadback(readback, input, inventory.version)) {
        throw new Error("لم تتطابق قراءة المخزون اللاحقة مع الطلب؛ لم يُعتمد الحفظ.");
      }
      setInventory(readback);
      onSave();
    } catch (err) {
      setError(err instanceof Error ? err.message : "حدث خطأ غير معروف");
    } finally {
      if (mountedRef.current && scopeKey === scopeKeyRef.current) setSaving(false);
    }
  };

  return (
    <Dialog
      open={visible}
      onOpenChange={(open) => {
        if (!open && !saving) onClose();
      }}
      title="إعدادات المخزون"
      confirmLabel="حفظ"
      cancelLabel="إلغاء"
      onConfirm={() => void handleSave()}
    >
      <View style={styles.container}>
        {loading ? <Text role="bodySm" tone="muted" align="center">جاري تحميل مصدر حقيقة المخزون…</Text> : null}
        {inventory ? <Text role="bodySm" tone="muted" align="center">الإصدار canonical الحالي: {inventory.version}</Text> : null}
        <View style={[styles.buttonGroup, { flexDirection: resolveRowDirection(direction) }]}>
          <Button
            label="إشارة فقط"
            tone={policyType === "signal" ? "brand" : "secondary"}
            onPress={() => setPolicyType("signal")}
            fullWidth={false}
          />
          <Button
            label="كمية دقيقة"
            tone={policyType === "quantity" ? "brand" : "secondary"}
            onPress={() => setPolicyType("quantity")}
            fullWidth={false}
          />
          <Button
            label="لا نهائي"
            tone={policyType === "infinite" ? "brand" : "secondary"}
            onPress={() => setPolicyType("infinite")}
            fullWidth={false}
          />
        </View>

        {(policyType === "signal" || policyType === "quantity") && (
          <TextField
            label="الكمية المتوفرة"
            value={quantity}
            onChangeText={setQuantity}
            keyboardType="numeric"
          />
        )}

        <TextField
          label="الحد الأدنى للطلب"
          value={minOrder}
          onChangeText={setMinOrder}
          keyboardType="numeric"
        />

        <TextField
          label="الحد الأقصى للطلب"
          value={maxOrder}
          onChangeText={setMaxOrder}
          keyboardType="numeric"
        />

        <TextField
          label="مقدار التدرج (Step)"
          value={stepQuantity}
          onChangeText={setStepQuantity}
          keyboardType="numeric"
        />

        {error ? <Text role="bodySm" tone="danger" align="center">{error}</Text> : null}
        {saving ? <Text role="bodySm" tone="muted" align="center">جاري حفظ إعدادات المخزون…</Text> : null}
      </View>
    </Dialog>
  );
}

function parseInteger(value: string, label: string): number {
  if (!/^\d+$/.test(value.trim())) throw new Error(`أدخل ${label} كرقم صحيح.`);
  return Number(value);
}

function isExactInventoryReadback(
  readback: StoreAssortmentInventory,
  input: StoreAssortmentInventoryInput,
  previousVersion: number,
): boolean {
  return readback.version > previousVersion
    && readback.policyType === input.policyType
    && readback.quantity === input.quantity
    && readback.minOrderQuantity === input.minOrderQuantity
    && readback.maxOrderQuantity === input.maxOrderQuantity
    && readback.stepQuantity === input.stepQuantity;
}

const styles = StyleSheet.create({
  container: {
    gap: spacing[4],
    minWidth: 320,
  },
  buttonGroup: {
    flexDirection: "row",
    gap: spacing[2],
    justifyContent: "center",
    flexWrap: "wrap",
  },
});
