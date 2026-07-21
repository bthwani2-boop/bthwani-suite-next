import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { Button, Header, StateView, Text, colorRoles, spacing } from "@bthwani/ui-kit";

import { useWorkforceProfile } from "../../shared/workforce";

export function DshFieldProfileCompletionScreen({ onLogout }: { readonly onLogout: () => void }) {
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
      <StateView
        tone="danger"
        title="تعذر فتح إكمال الملف"
        description="ملف Workforce الميداني غير متاح لهذه الجلسة."
        actionLabel="إعادة التحقق"
        onActionPress={() => void workforce.reload()}
      />
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
      setMessage(result.kind === "error" ? result.message : "تعذر حفظ بيانات الملف التشغيلي.");
      return;
    }
    if (!result.me.profileComplete) {
      setMessage(
        result.me.photoMediaRef
          ? "ما زالت بعض البيانات المطلوبة غير مكتملة. راجع الحقول ثم أعد الحفظ."
          : "تم حفظ البيانات الذاتية، لكن الصورة الشخصية ما تزال مفقودة ويجب إضافتها من لوحة التحكم.",
      );
    }
  }

  return (
    <View style={styles.root}>
      <Header title="إكمال الملف التشغيلي" subtitle="هذه البيانات مطلوبة قبل فتح مهام الميدان" />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {photoMissing ? (
          <StateView
            tone="warning"
            title="الصورة الشخصية مفقودة"
            description="أضف الصورة من ملف مقدم الخدمة في لوحة التحكم، ثم ارجع واضغط إعادة التحقق."
            actionLabel="إعادة التحقق"
            onActionPress={() => void workforce.reload()}
          />
        ) : null}

        <View style={styles.field}>
          <Text role="bodyStrong" style={styles.rtl}>اسم جهة اتصال الطوارئ</Text>
          <TextInput
            value={emergencyContactName}
            onChangeText={setEmergencyContactName}
            placeholder="الاسم الكامل"
            placeholderTextColor={colorRoles.textMuted}
            style={styles.input}
            textAlign="right"
          />
        </View>

        <View style={styles.field}>
          <Text role="bodyStrong" style={styles.rtl}>رقم اتصال الطوارئ</Text>
          <TextInput
            value={emergencyContactPhone}
            onChangeText={setEmergencyContactPhone}
            placeholder="رقم هاتف صالح"
            placeholderTextColor={colorRoles.textMuted}
            keyboardType="phone-pad"
            style={styles.input}
            textAlign="right"
          />
        </View>

        <View style={styles.field}>
          <Text role="bodyStrong" style={styles.rtl}>لغة التطبيق المفضلة</Text>
          <View style={styles.choiceRow}>
            <Choice
              label="العربية"
              selected={preferredLanguage === "ar"}
              onPress={() => setPreferredLanguage("ar")}
            />
            <Choice
              label="English"
              selected={preferredLanguage === "en"}
              onPress={() => setPreferredLanguage("en")}
            />
          </View>
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

function Choice({ label, selected, onPress }: { readonly label: string; readonly selected: boolean; readonly onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.choice, selected ? styles.choiceSelected : null]}
    >
      <Text role="bodyStrong" tone={selected ? "action" : "muted"}>{label}</Text>
    </Pressable>
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
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: colorRoles.borderSubtle,
    borderRadius: 12,
    backgroundColor: colorRoles.surfaceMuted,
    color: colorRoles.textPrimary,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
  },
  choiceRow: {
    flexDirection: "row-reverse",
    gap: spacing[2],
  },
  choice: {
    flex: 1,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colorRoles.borderSubtle,
    borderRadius: 12,
  },
  choiceSelected: {
    borderColor: colorRoles.brandAction,
    backgroundColor: colorRoles.surfaceMuted,
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
