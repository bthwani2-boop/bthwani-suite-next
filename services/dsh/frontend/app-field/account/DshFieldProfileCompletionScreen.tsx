import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Button, Header, SegmentedControl, StateView, Text, TextField, colorRoles, spacing } from "@bthwani/ui-kit";

import { useWorkforceProfile } from "../../shared/workforce";

type DshFieldProfileCompletionScreenProps = {
  readonly onBack?: () => void;
  readonly onLogout: () => void;
};

export function DshFieldProfileCompletionScreen({ onBack, onLogout }: DshFieldProfileCompletionScreenProps) {
  const workforce = useWorkforceProfile();
  const me = workforce.state.kind === "ready" ? workforce.state.me : null;
  const fieldProfile = me?.fieldProfile;

  const [emergencyContactName, setEmergencyContactName] = useState(fieldProfile?.emergencyContactName ?? "");
  const [emergencyContactPhone, setEmergencyContactPhone] = useState(fieldProfile?.emergencyContactPhone ?? "");
  const [preferredLanguage, setPreferredLanguage] = useState<"ar" | "en">(
    fieldProfile?.preferredLanguage === "en" ? "en" : "ar",
  );
  const [policyConsent, setPolicyConsent] = useState(Boolean(fieldProfile?.policyConsentAt));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  if (!me || me.workforceKind !== "field") {
    return (
      <View style={styles.root}>
        <Header title="استكمال الملف الشخصي" {...(onBack ? { onBack } : {})} />
        <StateView
          tone="danger"
          title="تعذر فتح استكمال الملف"
          description="هذا الحساب غير مهيأ كحساب ميداني."
          actionLabel="إعادة التحقق"
          onActionPress={() => void workforce.reload()}
        />
      </View>
    );
  }

  const photoMissing = !me.photoMediaRef;
  const canSubmit = emergencyContactPhone.trim().length >= 7 && policyConsent && !saving;

  async function submit() {
    if (!canSubmit) return;
    setSaving(true);
    setMessage(null);
    const result = await workforce.updateSelf({
      emergencyContactName: emergencyContactName.trim() || undefined,
      emergencyContactPhone: emergencyContactPhone.trim(),
      preferredLanguage,
      policyConsent: true,
    });
    setSaving(false);

    if (result.kind !== "ok") {
      setMessage(result.kind === "error" ? result.message : "تعذر حفظ بياناتك.");
      return;
    }
    if (!result.me.profileComplete) {
      setMessage(
        result.me.photoMediaRef
          ? "ما زالت بعض البيانات المطلوبة غير مكتملة. راجع الحقول ثم أعد الحفظ."
          : "تم حفظ بياناتك، لكن الصورة الشخصية ما تزال مفقودة ويجب إضافتها من لوحة التحكم.",
      );
    }
  }

  return (
    <View style={styles.root}>
      <Header title="استكمال الملف الشخصي" subtitle="مطلوبة قبل فتح مهام الميدان" {...(onBack ? { onBack } : {})} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {photoMissing ? (
          <StateView
            tone="warning"
            title="الصورة الشخصية مفقودة"
            description="أضف صورتك الشخصية من لوحة التحكم، ثم ارجع واضغط إعادة التحقق."
            actionLabel="إعادة التحقق"
            onActionPress={() => void workforce.reload()}
          />
        ) : null}

        <TextField
          label="اسم جهة اتصال الطوارئ"
          value={emergencyContactName}
          onChangeText={setEmergencyContactName}
          placeholder="الاسم الكامل"
        />

        <TextField
          label="رقم اتصال الطوارئ"
          value={emergencyContactPhone}
          onChangeText={setEmergencyContactPhone}
          placeholder="رقم هاتف صالح"
          keyboardType="phone-pad"
        />

        <View style={styles.field}>
          <Text role="bodyStrong" style={styles.rtl}>لغة التطبيق المفضلة</Text>
          <SegmentedControl
            items={[{ value: "ar", label: "العربية" }, { value: "en", label: "English" }]}
            value={preferredLanguage}
            onValueChange={(value) => setPreferredLanguage(value === "en" ? "en" : "ar")}
          />
        </View>

        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked: policyConsent }}
          onPress={() => setPolicyConsent((value) => !value)}
          style={styles.consentRow}
        >
          <View style={[styles.checkbox, policyConsent ? styles.checkboxSelected : null]} />
          <Text role="body" style={styles.consentText}>
            أوافق على سياسة تنفيذ المهام الميدانية وحماية بيانات العملاء.
          </Text>
        </Pressable>

        {message ? <Text role="bodySm" tone="danger" style={styles.rtl}>{message}</Text> : null}

        <Button
          label={saving ? "جارٍ الحفظ…" : "حفظ وإكمال الملف"}
          disabled={!canSubmit}
          onPress={() => void submit()}
        />
        <Button label="تسجيل الخروج" tone="secondary" onPress={onLogout} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colorRoles.surfaceBase,
  },
  content: {
    padding: spacing[4],
    gap: spacing[4],
    paddingBottom: 96,
  },
  field: {
    gap: spacing[2],
  },
  rtl: {
    textAlign: "right",
  },
  consentRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: spacing[3],
  },
  checkbox: {
    width: 22,
    height: 22,
    borderWidth: 2,
    borderColor: colorRoles.borderSubtle,
    borderRadius: 6,
  },
  checkboxSelected: {
    borderColor: colorRoles.brandAction,
    backgroundColor: colorRoles.brandAction,
  },
  consentText: {
    flex: 1,
    textAlign: "right",
  },
});
