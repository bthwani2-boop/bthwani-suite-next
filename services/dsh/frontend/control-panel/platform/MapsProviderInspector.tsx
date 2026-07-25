"use client";

import { useState } from "react";
import { Badge, Button, Card, ListItem, StateView, Text, spacing } from "@bthwani/ui-kit";
import { WebView as View, WebStyleSheet as StyleSheet } from "@bthwani/ui-kit/web";
import { CpTextInput } from "@bthwani/control-panel/components";
import type { ProviderVisibleFields } from "../../shared/platform";
import { MAPS_SURFACE_POLICY } from "../../shared/geo";

type Props = {
  readonly provider: ProviderVisibleFields;
  readonly providerId: string;
  readonly canUpdate: boolean;
  readonly mutationLoading: boolean;
  readonly onSaveAndroidKey: (providerId: string, apiKey: string) => Promise<void>;
};

function runtimeString(
  value: string | number | boolean | undefined,
  fallback: string,
): string {
  if (value == null) return fallback;
  return String(value);
}

export function MapsProviderInspector({
  provider,
  providerId,
  canUpdate,
  mutationLoading,
  onSaveAndroidKey,
}: Props) {
  const [androidKey, setAndroidKey] = useState("");
  const [validationMessage, setValidationMessage] = useState<string | null>(null);
  const nativeBuildTarget = runtimeString(provider.publicRuntimeConfig.nativeMobileBuildTarget, "app-field");
  const nativeAndroidPackage = runtimeString(provider.publicRuntimeConfig.nativeMobileAndroidPackage, "com.bthwani.field.next");
  const nativeEasVariable = runtimeString(provider.publicRuntimeConfig.nativeMobileEasVariable, "GOOGLE_MAPS_ANDROID_API_KEY");
  const nativeBuildRequired = provider.publicRuntimeConfig.nativeMobileBuildRequired === true;

  const submitAndroidKey = async () => {
    const value = androidKey.trim();
    if (!/^AIza[0-9A-Za-z_-]{20,}$/.test(value)) {
      setValidationMessage("صيغة مفتاح Google Maps Android غير صحيحة. يجب أن يبدأ بـ AIza.");
      return;
    }
    setValidationMessage(null);
    await onSaveAndroidKey(providerId, value);
    setAndroidKey("");
  };

  return (
    <Card>
      <View style={styles.container}>
        <Text role="titleMd">{provider.label}</Text>

        <ListItem title="المزود المختار" subtitle={provider.selectedProvider} />
        <ListItem title="البيئة" subtitle={provider.environment === "unknown" ? "غير معروفة من المصدر" : provider.environment} />
        <ListItem title="الحالة" subtitle={provider.status} />
        <ListItem title="المفتاح المُقنَّع" subtitle={provider.maskedCredential ?? "غير متاح"} />
        <ListItem title="رؤية الاعتماد" subtitle={provider.credentialVisibility} />
        <ListItem title="يتطلب مراجعة" subtitle={provider.auditRequired ? "نعم" : "لا"} />

        <Text role="caption" style={styles.sectionTitle}>الأسطح المتأثرة</Text>
        <View style={styles.badgeRow}>
          {(provider.affectedSurfaces as string[]).map((s) => (
            <Badge key={s} label={s} tone="neutral" />
          ))}
        </View>

        <Text role="caption" style={styles.sectionTitle}>سياسة الاستخدام لكل سطح</Text>
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
          description="مفاتيح الخادم (Geocoding / Routes / Places) محفوظة في Backend فقط ولا تظهر في الواجهة. المفتاح المدخل هنا يرسل كـ credential كتابة فقط ولا يُعاد إلى المتصفح."
        />

        <View style={styles.nativeBox}>
          <Text role="titleSm">مفتاح خرائط Android لتطبيق الميداني</Text>
          <Text role="caption" tone="muted">
            الإدخال من قسم المنصة يحفظ المفتاح في Providers ويضع علامة واضحة أن خرائط Native Mobile تحتاج مزامنة EAS وبناء APK جديد. لا يمكن حقن Google Maps Android key في APK مثبت سابقًا.
          </Text>
          <ListItem title="هدف البناء" subtitle={nativeBuildTarget} />
          <ListItem title="حزمة Android" subtitle={nativeAndroidPackage} />
          <ListItem title="متغير EAS المطلوب" subtitle={nativeEasVariable} />
          <ListItem title="يتطلب build جديد" subtitle={nativeBuildRequired ? "نعم" : "ينتظر حفظ المفتاح من المنصة"} />

          {canUpdate ? (
            <View style={styles.keyForm}>
              <CpTextInput
                placeholder="AIza..."
                value={androidKey}
                onChange={setAndroidKey}
                aria-label="مفتاح Google Maps Android لتطبيق الميداني"
              />
              <Button
                label="حفظ المفتاح في المنصة"
                loading={mutationLoading}
                disabled={mutationLoading || androidKey.trim().length === 0}
                onPress={() => void submitAndroidKey()}
              />
              {validationMessage ? (
                <Text role="caption" tone="danger">{validationMessage}</Text>
              ) : null}
            </View>
          ) : (
            <StateView
              tone="warning"
              title="صلاحية تحديث المزود مطلوبة"
              description="إدخال المفتاح يظهر فقط لمن يملك provider:update."
            />
          )}
        </View>

        <StateView
          tone="warning"
          title="التفعيل يمر عبر Change Workflow ثم Build جديد"
          description="بعد حفظ المفتاح من المنصة يجب مزامنته إلى EAS development وتشغيل build جديد لتطبيق الميداني حتى يدخل في AndroidManifest."
        />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing[4], gap: spacing[3] },
  sectionTitle: { marginTop: spacing[2] },
  badgeRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing[2] },
  nativeBox: { gap: spacing[2], paddingTop: spacing[2] },
  keyForm: { gap: spacing[2] },
});
