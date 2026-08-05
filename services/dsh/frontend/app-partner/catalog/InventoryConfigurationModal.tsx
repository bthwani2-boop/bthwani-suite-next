import React from "react";
import { View, StyleSheet } from "react-native";
import { Button, Modal, Text, TextField, spacing } from "@bthwani/ui-kit";
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
    <Modal visible={visible} onRequestClose={onClose}>
      <View style={styles.container}>
        <Text role="heading2" style={styles.title}>
          إعدادات المخزون
        </Text>

        <View style={styles.buttonGroup}>
          <Button
            title="إشارة فقط"
            variant={policyType === "signal" ? "primary" : "outline"}
            onPress={() => setPolicyType("signal")}
          />
          <Button
            title="كمية دقيقة"
            variant={policyType === "quantity" ? "primary" : "outline"}
            onPress={() => setPolicyType("quantity")}
          />
          <Button
            title="لا نهائي"
            variant={policyType === "infinite" ? "primary" : "outline"}
            onPress={() => setPolicyType("infinite")}
          />
        </View>

        {(policyType === "signal" || policyType === "quantity") && (
          <TextField
            label="الكمية المتوفرة"
            value={quantity}
            onChangeText={setQuantity}
            keyboardType="number-pad"
          />
        )}

        <TextField
          label="الحد الأدنى للطلب"
          value={minOrder}
          onChangeText={setMinOrder}
          keyboardType="number-pad"
        />

        <TextField
          label="الحد الأقصى للطلب"
          value={maxOrder}
          onChangeText={setMaxOrder}
          keyboardType="number-pad"
        />

        <TextField
          label="مقدار التدرج (Step)"
          value={stepQuantity}
          onChangeText={setStepQuantity}
          keyboardType="number-pad"
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={styles.actions}>
          <Button title="إلغاء" variant="outline" onPress={onClose} disabled={saving} />
          <Button title="حفظ" onPress={handleSave} loading={saving} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.m,
    gap: spacing.m,
    minWidth: 320,
  },
  title: {
    textAlign: "center",
  },
  buttonGroup: {
    flexDirection: "row",
    gap: spacing.s,
    justifyContent: "center",
  },
  actions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: spacing.m,
    marginTop: spacing.m,
  },
  error: {
    color: "red",
    textAlign: "center",
  },
});
