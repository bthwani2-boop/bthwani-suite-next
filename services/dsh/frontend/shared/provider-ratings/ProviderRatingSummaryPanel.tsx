import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Icon, Text, colorRoles, spacing } from "@bthwani/ui-kit";
import {
  fetchOwnProviderRatingSummary,
  type ProviderRatingSummary,
} from "./provider-ratings.api";

export function ProviderRatingSummaryPanel(props: {
  readonly kind: "field" | "captain";
  readonly title?: string;
}) {
  const [summary, setSummary] = React.useState<ProviderRatingSummary | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      setSummary(await fetchOwnProviderRatingSummary(props.kind));
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [props.kind]);

  React.useEffect(() => { void load(); }, [load]);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.titleBlock}>
          <Text role="titleSm" style={styles.rtl}>{props.title ?? "تقييمي"}</Text>
          <Text role="caption" tone="muted" style={styles.rtl}>
            {props.kind === "field" ? "من الشركاء بعد الانضمام والتفعيل" : "من العملاء بعد استلام الطلب"}
          </Text>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="تحديث التقييم" onPress={() => void load()} style={styles.refresh}>
          <Icon name="refresh-outline" size={20} tone="brand" />
        </Pressable>
      </View>

      {loading ? (
        <Text role="bodySm" tone="muted" style={styles.rtl}>جارٍ تحميل التقييم…</Text>
      ) : error ? (
        <Text role="bodySm" tone="danger" style={styles.rtl}>تعذر تحميل التقييم.</Text>
      ) : summary ? (
        <>
          <View style={styles.scoreRow}>
            <View style={styles.scoreValue}>
              <Icon name="star" size={26} tone="brand" />
              <Text role="titleLg">{summary.ratingCount > 0 ? summary.averageScore.toFixed(1) : "—"}</Text>
              <Text role="bodySm" tone="muted">/ 5</Text>
            </View>
            <Text role="bodySm" tone="muted">{summary.ratingCount} تقييم</Text>
          </View>
          <View style={styles.distribution}>
            {[5, 4, 3, 2, 1].map((score) => (
              <View key={score} style={styles.distributionItem}>
                <Text role="caption" tone="muted">{score}★</Text>
                <Text role="bodyStrong">{summary.distribution[String(score)] ?? 0}</Text>
              </View>
            ))}
          </View>
          {summary.lastRatedAt ? (
            <Text role="caption" tone="muted" style={styles.rtl}>آخر تقييم: {new Date(summary.lastRatedAt).toLocaleString("ar-YE")}</Text>
          ) : null}
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colorRoles.surfaceMuted,
    borderWidth: 1,
    borderColor: colorRoles.borderSubtle,
    borderRadius: 16,
    padding: spacing[4],
    gap: spacing[3],
  },
  header: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", gap: spacing[3] },
  titleBlock: { flex: 1, alignItems: "flex-end", gap: spacing[1] },
  rtl: { textAlign: "right" },
  refresh: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  scoreRow: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between" },
  scoreValue: { flexDirection: "row-reverse", alignItems: "center", gap: spacing[1] },
  distribution: { flexDirection: "row-reverse", flexWrap: "wrap", gap: spacing[2] },
  distributionItem: {
    minWidth: 52,
    flexGrow: 1,
    alignItems: "center",
    padding: spacing[2],
    borderRadius: 10,
    backgroundColor: colorRoles.surfaceBase,
  },
});

export default ProviderRatingSummaryPanel;
