import React from "react";
import { ScrollView, View } from "react-native";
import {
  Button,
  Header,
  StateView,
  Surface,
  Text,
  TextField,
  colorRoles,
  spacing,
} from "@bthwani/ui-kit";
import {
  fetchFieldAssortmentPauses,
  pauseFieldStoreAssortment,
  resumeFieldStoreAssortment,
  type AssortmentPauseState,
} from "../../shared/catalog";

export type DshFieldAssortmentPauseScreenProps = {
  readonly partnerId: string;
  readonly onBack: () => void;
};

export function DshFieldAssortmentPauseScreen({
  partnerId,
  onBack,
}: DshFieldAssortmentPauseScreenProps) {
  const [items, setItems] = React.useState<readonly AssortmentPauseState[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [savingId, setSavingId] = React.useState<string | null>(null);
  const [productId, setProductId] = React.useState("");
  const [reason, setReason] = React.useState("");
  const [pausedUntil, setPausedUntil] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setItems(await fetchFieldAssortmentPauses(partnerId));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "تعذر تحميل حالات التشكيلة.");
    } finally {
      setLoading(false);
    }
  }, [partnerId]);

  React.useEffect(() => { void load(); }, [load]);

  const replaceItem = React.useCallback((next: AssortmentPauseState) => {
    setItems((current) => [
      ...current.filter((item) => item.masterProductId !== next.masterProductId),
      next,
    ]);
  }, []);

  const pause = async () => {
    const current = items.find((item) => item.masterProductId === productId.trim());
    if (!current) {
      setError("أدخل معرف منتج موجود في تشكيلة الشريك.");
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
        pausedUntil: pausedUntil.trim() || null,
        expectedVersion: current.version,
      });
      replaceItem(result.pause);
      setNotice("تم إيقاف المنتج مؤقتاً وسُجل الفاعل والإصدار.");
      setProductId(""); setReason(""); setPausedUntil("");
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
      setNotice("تم استئناف المنتج وفق حقيقة التشكيلة.");
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
      <Header title="إيقاف تشكيلة الشريك" subtitle="إيقاف واستئناف محكوم بإصدار وسبب" />
      <ScrollView contentContainerStyle={{ padding: spacing[4], gap: spacing[3], paddingBottom: 100 }}>
        <Button label="رجوع" tone="ghost" onPress={onBack} />
        {error ? <StateView tone="danger" title="تعذر تنفيذ العملية" description={error} actionLabel="إعادة التحميل" onActionPress={load} /> : null}
        {notice ? <Surface tone="success" padding={3} radiusToken="md"><Text role="bodyStrong" tone="success">{notice}</Text></Surface> : null}

        <Surface tone="inset" padding={3} gap={3} radiusToken="md">
          <Text role="bodyStrong" align="start">إيقاف منتج مؤقتاً</Text>
          <TextField label="معرف المنتج المركزي" value={productId} onChangeText={setProductId} placeholder="master-product-id" />
          <TextField label="سبب الإيقاف" value={reason} onChangeText={setReason} placeholder="مثال: نفاد مؤقت لدى المورد" />
          <TextField label="وقت الاستئناف ISO (اختياري)" value={pausedUntil} onChangeText={setPausedUntil} placeholder="2026-07-22T12:00:00+03:00" />
          <Button label={savingId ? "جاري التنفيذ…" : "إيقاف مؤقت"} tone="danger" disabled={savingId !== null} onPress={() => void pause()} />
        </Surface>

        <Text role="titleSm" align="start">حقيقة تشكيلة الشريك</Text>
        {items.length === 0 ? <StateView title="لا توجد تشكيلة" description="لم تُربط منتجات بهذا المتجر بعد." /> : items.map((item) => (
          <Surface key={item.assortmentId} tone={item.paused ? "warning" : "inset"} padding={3} gap={2} radiusToken="md">
            <Text role="bodyStrong" align="start">{item.masterProductId}</Text>
            <Text role="bodySm" tone="muted" align="start">
              {item.paused ? `موقوف: ${item.reason}` : "يعمل"} — الإصدار {item.version}
            </Text>
            {item.pausedUntil ? <Text role="caption" tone="muted">حتى: {item.pausedUntil}</Text> : null}
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
