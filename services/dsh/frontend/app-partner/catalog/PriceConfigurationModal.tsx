import React from "react";
import { View, StyleSheet } from "react-native";
import { corrId } from "../../shared/_kernel/dsh-http-request";
import { Dialog, Text, TextField, spacing, resolveRowDirection, useDirection } from "@bthwani/ui-kit";
import {
  createPartnerStoreAssortmentPrice,
  fetchPartnerStoreAssortmentPrices,
} from "../../catalog";
import type { StoreAssortmentPrice, StoreAssortmentPriceInput } from "../../catalog";

type Props = {
  readonly visible: boolean;
  readonly storeId: string;
  readonly masterProductId: string;
  readonly onClose: () => void;
  readonly onSave: () => void;
};

export function PriceConfigurationModal({
  visible,
  storeId,
  masterProductId,
  onClose,
  onSave,
}: Props) {
  const { direction } = useDirection();
  const [amountMinor, setAmountMinor] = React.useState("");
  const [prepTimeMin, setPrepTimeMin] = React.useState("15");
  const [prepTimeMax, setPrepTimeMax] = React.useState("30");
  const [prices, setPrices] = React.useState<readonly StoreAssortmentPrice[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const mountedRef = React.useRef(true);
  const scopeKey = `${storeId}:${masterProductId}`;
  const scopeKeyRef = React.useRef(scopeKey);
  scopeKeyRef.current = scopeKey;
  const mutationRef = React.useRef<{ readonly key: string; readonly fingerprint: string } | null>(null);

  React.useEffect(() => () => {
    mountedRef.current = false;
  }, []);

  React.useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    void fetchPartnerStoreAssortmentPrices(storeId, masterProductId)
      .then((loaded) => {
        if (cancelled) return;
        setPrices(loaded);
        const current = loaded[0];
        if (current) {
          setAmountMinor(String(current.amountMinor));
          setPrepTimeMin(String(current.prepTimeMin));
          setPrepTimeMax(String(current.prepTimeMax));
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "تعذر تحميل مصدر حقيقة الأسعار.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [visible, storeId, masterProductId]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const input: StoreAssortmentPriceInput = {
        amountMinor: parseInteger(amountMinor, "السعر"),
        currency: "YER",
        prepTimeMin: parseInteger(prepTimeMin, "الحد الأدنى للتحضير"),
        prepTimeMax: parseInteger(prepTimeMax, "الحد الأقصى للتحضير"),
        effectiveFrom: new Date().toISOString(),
        effectiveUntil: null,
      };
      if (input.amountMinor < 0 || input.prepTimeMax < input.prepTimeMin) {
        throw new Error("تحقق من السعر ووقت التحضير.");
      }
      const operationScopeKey = scopeKey;
      const fingerprint = JSON.stringify({ scope: operationScopeKey, input });
      const previous = mutationRef.current;
      const idempotencyKey = previous?.fingerprint === fingerprint
        ? previous.key
        : corrId("catalog-price-create");
      mutationRef.current = { key: idempotencyKey, fingerprint };
      const created = await createPartnerStoreAssortmentPrice(storeId, masterProductId, input, idempotencyKey);
      const readback = await fetchPartnerStoreAssortmentPrices(storeId, masterProductId);
      if (!mountedRef.current || operationScopeKey !== scopeKeyRef.current) return;
      const saved = readback.find((price) => price.id === created.id);
      if (!saved || !isExactPriceReadback(saved, input)) {
        throw new Error("لم تتطابق قراءة السعر اللاحقة مع الطلب؛ لم يُعتمد الحفظ.");
      }
      setPrices(readback);
      mutationRef.current = null;
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
      title="إدارة السعر ووقت التحضير"
      confirmLabel="حفظ"
      cancelLabel="إلغاء"
      onConfirm={() => void handleSave()}
    >
      <View style={styles.container}>
        {loading ? <Text role="bodySm" tone="muted" align="center">جاري تحميل مصدر حقيقة الأسعار…</Text> : null}
        {prices[0] ? <Text role="bodySm" tone="muted" align="center">آخر سعر canonical: {prices[0].amountMinor} {prices[0].currency}، الإصدار {prices[0].version}</Text> : null}
        <TextField
          label="السعر (بالوحدة الصغرى، مثلاً 1500 لـ 15.00)"
          value={amountMinor}
          onChangeText={setAmountMinor}
          keyboardType="numeric"
        />

        <View style={[styles.row, { flexDirection: resolveRowDirection(direction) }]}>
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

function parseInteger(value: string, label: string): number {
  if (!/^\d+$/.test(value.trim())) throw new Error(`أدخل ${label} كرقم صحيح.`);
  return Number(value);
}

function isExactPriceReadback(readback: StoreAssortmentPrice, input: StoreAssortmentPriceInput): boolean {
  return readback.version >= 1
    && readback.amountMinor === input.amountMinor
    && readback.currency === input.currency
    && readback.prepTimeMin === input.prepTimeMin
    && readback.prepTimeMax === input.prepTimeMax
    && Date.parse(readback.effectiveFrom) === Date.parse(input.effectiveFrom)
    && readback.effectiveUntil === null;
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
