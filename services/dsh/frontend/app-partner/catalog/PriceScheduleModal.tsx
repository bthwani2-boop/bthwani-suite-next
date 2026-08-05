import React from "react";
import { View, StyleSheet } from "react-native";
import { Button, Modal, Text, TextField, spacing } from "@bthwani/ui-kit";
import { schedulePartnerStoreAssortmentPrice } from "../../shared/catalog";
import type { StoreAssortmentPriceInput } from "../../shared/catalog";

type Props = {
  readonly visible: boolean;
  readonly storeId: string;
  readonly masterProductId: string;
  readonly onClose: () => void;
  readonly onSave: () => void;
};

export function PriceScheduleModal({
  visible,
  storeId,
  masterProductId,
  onClose,
  onSave,
}: Props) {
  const [amountMinor, setAmountMinor] = React.useState("");
  const [prepTimeMin, setPrepTimeMin] = React.useState("15");
  const [prepTimeMax, setPrepTimeMax] = React.useState("30");
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const input: StoreAssortmentPriceInput = {
        amountMinor: parseInt(amountMinor, 10),
        currency: "YER",
        prepTimeMin: parseInt(prepTimeMin, 10) || 0,
        prepTimeMax: parseInt(prepTimeMax, 10) || 0,
        effectiveFrom: new Date().toISOString(),
        effectiveUntil: null,
      };
      if (isNaN(input.amountMinor) || input.amountMinor < 0) {
        throw new Error("أدخل سعراً صحيحاً.");
      }
      await schedulePartnerStoreAssortmentPrice(storeId, masterProductId, input);
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
          تحديث السعر ووقت التحضير
        </Text>

        <TextField
          label="السعر (بالوحدة الصغرى، مثلاً 1500 لـ 15.00)"
          value={amountMinor}
          onChangeText={setAmountMinor}
          keyboardType="number-pad"
        />

        <View style={styles.row}>
          <TextField
            label="الحد الأدنى للتحضير (دقيقة)"
            value={prepTimeMin}
            onChangeText={setPrepTimeMin}
            keyboardType="number-pad"
          />
          <TextField
            label="الحد الأقصى للتحضير (دقيقة)"
            value={prepTimeMax}
            onChangeText={setPrepTimeMax}
            keyboardType="number-pad"
          />
        </View>

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
  row: {
    flexDirection: "row",
    gap: spacing.s,
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
