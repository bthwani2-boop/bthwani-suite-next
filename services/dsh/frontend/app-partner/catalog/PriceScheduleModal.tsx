import React from "react";
import { View, StyleSheet } from "react-native";
import { Dialog, Text, TextField, spacing } from "@bthwani/ui-kit";
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
    <Dialog
      open={visible}
      onOpenChange={(open) => {
        if (!open && !saving) onClose();
      }}
      title="تحديث السعر ووقت التحضير"
      confirmLabel="حفظ"
      cancelLabel="إلغاء"
      onConfirm={() => void handleSave()}
    >
      <View style={styles.container}>
        <TextField
          label="السعر (بالوحدة الصغرى، مثلاً 1500 لـ 15.00)"
          value={amountMinor}
          onChangeText={setAmountMinor}
          keyboardType="numeric"
        />

        <View style={styles.row}>
          <TextField
            label="الحد الأدنى للتحضير (دقيقة)"
            value={prepTimeMin}
            onChangeText={setPrepTimeMin}
            keyboardType="numeric"
          />
          <TextField
            label="الحد الأقصى للتحضير (دقيقة)"
            value={prepTimeMax}
            onChangeText={setPrepTimeMax}
            keyboardType="numeric"
          />
        </View>

        {error ? <Text role="bodySm" tone="danger" align="center">{error}</Text> : null}
        {saving ? <Text role="bodySm" tone="muted" align="center">جاري حفظ السعر…</Text> : null}
      </View>
    </Dialog>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing[4],
    minWidth: 320,
  },
  row: {
    flexDirection: "row",
    gap: spacing[2],
    flexWrap: "wrap",
  },
});
