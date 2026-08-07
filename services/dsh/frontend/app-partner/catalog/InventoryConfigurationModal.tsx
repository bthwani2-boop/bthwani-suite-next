import React from "react";
import { View, StyleSheet } from "react-native";
import { Button, Dialog, Text, TextField, spacing } from "@bthwani/ui-kit";
import { upsertPartnerStoreAssortmentInventory } from "../../shared/catalog";
import type { StoreAssortmentInventoryInput } from "../../shared/catalog";

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
  const [policyType, setPolicyType] = React.useState<"signal" | "quantity" | "infinite">("signal");
  const [quantity, setQuantity] = React.useState("0");
  const [minOrder, setMinOrder] = React.useState("1");
  const [maxOrder, setMaxOrder] = React.useState("100");
  const [stepQuantity, setStepQuantity] = React.useState("1");
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const input: StoreAssortmentInventoryInput = {
        policyType,
        quantity: parseInt(quantity, 10) || 0,
        minOrderQuantity: parseInt(minOrder, 10) || 1,
        maxOrderQuantity: parseInt(maxOrder, 10) || 100,
        stepQuantity: parseInt(stepQuantity, 10) || 1,
      };
      await upsertPartnerStoreAssortmentInventory(storeId, masterProductId, input);
      onSave();
    } catch (err) {
      setError(err instanceof Error ? err.message : "حدث خطأ غير معروف");
    } finally {
      setSaving(false);
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
        <View style={styles.buttonGroup}>
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
