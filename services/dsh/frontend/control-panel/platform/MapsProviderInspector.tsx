"use client";

import { Badge, Card, ListItem, StateView, Text, spacing } from "@bthwani/ui-kit";
import { WebView as View, WebStyleSheet as StyleSheet } from "@bthwani/ui-kit/web";
import type { ProviderVisibleFields } from "../../shared/platform";
import { MAPS_SURFACE_POLICY } from "../../shared/geo";

type Props = {
  readonly provider: ProviderVisibleFields;
};

export function MapsProviderInspector({ provider }: Props) {
  return (
    <Card>
      <View style={styles.container}>
        <Text role="titleMd">{provider.label}</Text>

        <ListItem title="المزود المختار" subtitle={provider.selectedProvider} />
        <ListItem title="البيئة" subtitle={provider.environment} />
        <ListItem
          title="الحالة"
          subtitle={<Badge label={provider.status} tone={provider.status === "active" ? "success" : "neutral"} />}
        />
        <ListItem title="المفتاح المُقنَّع" subtitle={provider.maskedCredential ?? "غير متاح"} />
        <ListItem title="رؤية الاعتماد" subtitle={provider.credentialVisibility} />
        <ListItem title="يتطلب مراجعة" subtitle={provider.auditRequired ? "نعم" : "لا"} />

        <Text role="captionSm" style={styles.sectionTitle}>الأسطح المتأثرة</Text>
        <View style={styles.badgeRow}>
          {(provider.affectedSurfaces as string[]).map((s) => (
            <Badge key={s} label={s} tone="neutral" />
          ))}
        </View>

        <Text role="captionSm" style={styles.sectionTitle}>سياسة الاستخدام لكل سطح</Text>
        {Object.entries(MAPS_SURFACE_POLICY).map(([surface, policy]) => (
          <ListItem
            key={surface}
            title={surface}
            subtitle={policy.captainMarkerAllowed ? "⚠ captain marker allowed" : "تتبع الكابتن ممنوع ✓"}
          />
        ))}

        <StateView
          tone="info"
          title="الأسرار الحقيقية في Backend فقط"
          description="مفاتيح الخادم (Geocoding / Routes / Places) محفوظة في Backend فقط ولا تظهر في الواجهة."
        />
        <StateView
          tone="warning"
          title="التطبيق يتطلب عقد Backend"
          description="لا يمكن تفعيل هذا المزود أو تعديله من الواجهة مباشرة. يتطلب عقد Backend موثق."
        />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing[4], gap: spacing[3] },
  sectionTitle: { marginTop: spacing[2] },
  badgeRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing[2] },
});
