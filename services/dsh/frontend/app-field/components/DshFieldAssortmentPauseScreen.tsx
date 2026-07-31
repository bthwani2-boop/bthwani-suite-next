import React from "react";
import { Pressable, ScrollView, View } from "react-native";
import {
  Button,
  DateTimeField,
  Header,
  StateView,
  Surface,
  Text,
  TextField,
  colorRoles,
  formatDateTime,
  spacing,
} from "@bthwani/ui-kit";
import {
  fetchFieldAssortmentPauses,
  pauseFieldStoreAssortment,
  resumeFieldStoreAssortment,
  type AssortmentPauseState,
} from "../../shared/catalog";
import { fetchMasterProductById } from "../../shared/catalog/central-catalog.api";

export type DshFieldAssortmentPauseScreenProps = {
  readonly partnerId: string;
  readonly onBack: () => void;
};

export function DshFieldAssortmentPauseScreen({
  partnerId,
  onBack,
}: DshFieldAssortmentPauseScreenProps) {
  const [items, setItems] = React.useState<readonly AssortmentPauseState[]>([]);
  const [productNames, setProductNames] = React.useState<Record<string, string>>({});
  const [loading, setLoading] = React.useState(true);
  const [savingId, setSavingId] = React.useState<string | null>(null);
  const [selectedProductId, setSelectedProductId] = React.useState<string | null>(null);
  const [reason, setReason] = React.useState("");
  const [pausedUntil, setPausedUntil] = React.useState<Date | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const pauses = await fetchFieldAssortmentPauses(partnerId);
      setItems(pauses);
      const missingIds = pauses
        .map((item) => item.masterProductId)
        .filter((id) => !(id in productNames));
      if (missingIds.length > 0) {
        const resolved = await Promise.all(
          missingIds.map(async (id) => {
            try {
              const product = await fetchMasterProductById(id);
              return [id, product.canonicalNameAr] as const;
            } catch {
              return [id, "منتج غير معروف"] as const;
            }
          }),
        );
        setProductNames((current) => ({ ...current, ...Object.fromEntries(resolved) }));
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "تعذر تحميل حالات التشكيلة.");
    } finally {
      setLoading(false);
    }
    // productNames intentionally excluded — this effect only fills in gaps and shouldn't re-run when it changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partnerId]);

  React.useEffect(() => { void load(); }, [load]);

  const replaceItem = React.useCallback((next: AssortmentPauseState) => {
    setItems((current) => [
      ...current.filter((item) => item.masterProductId !== next.masterProductId),
      next,
    ]);
  }, []);

  const availableProducts = items.filter((item) => !item.paused);

  const pause = async () => {
    const current = items.find((item) => item.masterProductId === selectedProductId);
    if (!current) {
      setError("اختر منتجًا من قائمة منتجات المتجر أولاً.");
      return;
    }
    if (reason.trim().length < 3) {
      setError("سبب الإيقاف المؤقت مطلوب.");
      return;
    }
    setSavingId(current.masterProductId);
    setError(null);
    setNotice(null);
    try {
      const result = await pauseFieldStoreAssortment(partnerId, current.masterProductId, {
        reason: reason.trim(),
        pausedUntil: pausedUntil ? pausedUntil.toISOString() : null,
        expectedVersion: current.version,
      });
      replaceItem(result.pause);
      setNotice(`تم إيقاف "${productNames[current.masterProductId] ?? "المنتج"}" مؤقتًا.`);
      setSelectedProductId(null); setReason(""); setPausedUntil(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "تعذر إيقاف المنتج.");
      await load();
    } finally {
      setSavingId(null);
    }
  };

  const resume = async (item: AssortmentPauseState) => {
    setSavingId(item.masterProductId);
    setError(null);
    setNotice(null);
    try {
      const result = await resumeFieldStoreAssortment(partnerId, item.masterProductId, item.version);
      replaceItem(result.pause);
      setNotice(`تم استئناف "${productNames[item.masterProductId] ?? "المنتج"}".`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "تعذر استئناف المنتج.");
      await load();
    } finally {
      setSavingId(null);
    }
  };

  if (loading && items.length === 0) {
    return <StateView loading title="جاري تحميل الإيقافات المؤقتة…" />;
  }

  return (
    <View style={{ flex: 1, backgroundColor: colorRoles.surfaceBase }}>
      <Header title="إيقاف منتجات المتجر" subtitle="أوقف منتجًا مؤقتًا أو استأنفه" onBack={onBack} />
      <ScrollView contentContainerStyle={{ padding: spacing[4], gap: spacing[3], paddingBottom: 100 }}>
        {error ? <StateView tone="danger" title="تعذر تنفيذ العملية" description={error} actionLabel="إعادة التحميل" onActionPress={load} /> : null}
        {notice ? <Surface tone="success" padding={3} radiusToken="md"><Text role="bodyStrong" tone="success">{notice}</Text></Surface> : null}

        <Surface tone="inset" padding={3} gap={3} radiusToken="md">
          <Text role="bodyStrong" align="start">إيقاف منتج مؤقتًا</Text>
          {availableProducts.length === 0 ? (
            <Text role="bodySm" tone="muted" align="start">لا توجد منتجات فعّالة يمكن إيقافها حاليًا.</Text>
          ) : (
            <View style={{ gap: spacing[1] }}>
              {availableProducts.map((item) => (
                <Pressable
                  key={item.masterProductId}
                  onPress={() => setSelectedProductId(item.masterProductId)}
                  style={{
                    flexDirection: "row-reverse",
                    alignItems: "center",
                    justifyContent: "space-between",
                    paddingVertical: spacing[2],
                    paddingHorizontal: spacing[2],
                    borderRadius: 8,
                    backgroundColor: selectedProductId === item.masterProductId ? colorRoles.brandActionSoft : "transparent",
                  }}
                >
                  <Text role="body" align="start">{productNames[item.masterProductId] ?? "…"}</Text>
                </Pressable>
              ))}
            </View>
          )}
          <TextField label="سبب الإيقاف" value={reason} onChangeText={setReason} placeholder="مثال: نفاد مؤقت لدى المورد" />
          <DateTimeField label="الاستئناف التلقائي (اختياري)" value={pausedUntil} onChange={setPausedUntil} placeholder="اختر موعد الاستئناف" />
          <Button label={savingId ? "جاري التنفيذ…" : "إيقاف مؤقت"} tone="danger" disabled={savingId !== null} onPress={() => void pause()} />
        </Surface>

        <Text role="titleSm" align="start">منتجات متجر الشريك</Text>
        {items.length === 0 ? <StateView title="لا توجد تشكيلة" description="لم تُربط منتجات بهذا المتجر بعد." /> : items.map((item) => (
          <Surface key={item.assortmentId} tone={item.paused ? "warning" : "inset"} padding={3} gap={2} radiusToken="md">
            <Text role="bodyStrong" align="start">{productNames[item.masterProductId] ?? "…"}</Text>
            <Text role="bodySm" tone="muted" align="start">
              {item.paused ? `موقوف: ${item.reason}` : "يعمل"}
            </Text>
            {item.pausedUntil ? <Text role="caption" tone="muted">يستأنف: {formatDateTime(item.pausedUntil)}</Text> : null}
            {item.paused ? (
              <Button
                label={savingId === item.masterProductId ? "جاري الاستئناف…" : "استئناف"}
                tone="success"
                disabled={savingId !== null}
                onPress={() => void resume(item)}
              />
            ) : null}
          </Surface>
        ))}
      </ScrollView>
    </View>
  );
}
