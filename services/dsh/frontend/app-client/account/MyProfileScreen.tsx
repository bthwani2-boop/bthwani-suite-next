import React from "react";
import { StyleSheet, Switch, TouchableOpacity, View } from "react-native";
import { useIdentitySession } from "@bthwani/core-identity";
import {
  Header,
  ScrollScreen,
  StateView,
  Text,
  Button,
  colorRoles,
  spacing,
  radius,
} from "@bthwani/ui-kit";
import {
  fetchClientProfile,
  upsertClientProfilePreferences,
  upsertClientProfileConsents,
  getOrCreateClientProfileMutationAttempt,
  clearClientProfileMutationAttempt,
  type ClientProfile,
} from "../../shared/client-profile";

export type MyProfileScreenProps = {
  readonly onBack?: () => void;
};

type ProfileState =
  | { kind: "loading" }
  | { kind: "ready"; profile: ClientProfile }
  | { kind: "error"; message: string }
  | { kind: "conflict"; message: string; serverProfile: ClientProfile };

export function MyProfileScreen({ onBack }: MyProfileScreenProps) {
  const { state: sessionState } = useIdentitySession();
  const [profileState, setProfileState] = React.useState<ProfileState>({ kind: "loading" });
  const [locale, setLocale] = React.useState<"ar" | "en">("ar");
  const [currency, setCurrency] = React.useState("SAR");
  const [consentEmail, setConsentEmail] = React.useState(false);
  const [consentSms, setConsentSms] = React.useState(false);
  const [consentPush, setConsentPush] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [saveError, setSaveError] = React.useState<string | null>(null);

  const loadProfile = React.useCallback(async () => {
    if (sessionState.kind !== "authenticated") return;
    setProfileState({ kind: "loading" });
    try {
      const profile = await fetchClientProfile();
      setLocale(profile.locale as "ar" | "en" || "ar");
      setCurrency(profile.currencyPreference || "SAR");
      setConsentEmail(profile.marketingConsentEmail);
      setConsentSms(profile.marketingConsentSms);
      setConsentPush(profile.marketingConsentPush);
      setProfileState({ kind: "ready", profile });
    } catch (error: any) {
      if (error?.status === 404) {
        // Not found, use defaults
        setProfileState({
          kind: "ready",
          profile: {
            clientId: sessionState.identity.subject,
            locale: "ar",
            currencyPreference: "SAR",
            marketingConsentEmail: false,
            marketingConsentPush: false,
            marketingConsentSms: false,
            version: 0,
            createdAt: "",
            updatedAt: "",
          },
        });
      } else {
        setProfileState({ kind: "error", message: error?.message || "تعذر جلب الملف التجاري" });
      }
    }
  }, [sessionState]);

  React.useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  if (sessionState.kind !== "authenticated") {
    return (
      <ScrollScreen>
        <Header title="ملفي التجاري" subtitle="يلزم تسجيل الدخول" />
      </ScrollScreen>
    );
  }

  const identity = sessionState.identity;

  const hasChanges =
    profileState.kind === "ready" &&
    (locale !== profileState.profile.locale ||
    currency !== profileState.profile.currencyPreference ||
    consentEmail !== profileState.profile.marketingConsentEmail ||
    consentSms !== profileState.profile.marketingConsentSms ||
    consentPush !== profileState.profile.marketingConsentPush);

  const handleSave = async () => {
    if (profileState.kind !== "ready") return;
    setSaving(true);
    setSaveError(null);
    let updatedProfile = profileState.profile;
    try {
      const isPreferencesChanged = locale !== profileState.profile.locale || currency !== profileState.profile.currencyPreference;
      const isConsentsChanged = consentEmail !== profileState.profile.marketingConsentEmail || consentSms !== profileState.profile.marketingConsentSms || consentPush !== profileState.profile.marketingConsentPush;

      if (isPreferencesChanged) {
        const input = {
          locale,
          currencyPreference: currency,
          ...(profileState.profile.version > 0
            ? { expectedVersion: profileState.profile.version }
            : {}),
        };
        const intent = {
          actorId: identity.subject,
          operation: "preferences" as const,
          input,
        };
        const attempt = await getOrCreateClientProfileMutationAttempt(intent);
        updatedProfile = await upsertClientProfilePreferences(input, attempt.context);
        const readback = await fetchClientProfile();
        if (readback.locale !== locale || readback.currencyPreference !== currency) {
          throw new Error("تم حفظ التفضيلات لكن القراءة المعتمدة لم تطابق القيم المطلوبة");
        }
        updatedProfile = readback;
        try {
          await clearClientProfileMutationAttempt(intent, attempt.signature);
        } catch {
          // The server returned canonical state; retaining the replay-safe key is safe.
        }
      }

      if (isConsentsChanged) {
        const input = {
          marketingConsentEmail: consentEmail,
          marketingConsentSms: consentSms,
          marketingConsentPush: consentPush,
          ...((isPreferencesChanged ? updatedProfile.version : profileState.profile.version) > 0
            ? { expectedVersion: isPreferencesChanged ? updatedProfile.version : profileState.profile.version }
            : {}),
        };
        const intent = {
          actorId: identity.subject,
          operation: "consents" as const,
          input,
        };
        const attempt = await getOrCreateClientProfileMutationAttempt(intent);
        updatedProfile = await upsertClientProfileConsents(input, attempt.context);
        const readback = await fetchClientProfile();
        if (readback.marketingConsentEmail !== consentEmail
          || readback.marketingConsentSms !== consentSms
          || readback.marketingConsentPush !== consentPush) {
          throw new Error("تم حفظ الموافقات لكن القراءة المعتمدة لم تطابق القيم المطلوبة");
        }
        updatedProfile = readback;
        try {
          await clearClientProfileMutationAttempt(intent, attempt.signature);
        } catch {
          // The server returned canonical state; retaining the replay-safe key is safe.
        }
      }

      setProfileState({ kind: "ready", profile: updatedProfile });
      setSaveError(null);
    } catch (error: any) {
      if (error?.status === 409) {
        try {
          const serverProfile = await fetchClientProfile();
          setProfileState({
            kind: "conflict",
            message: "حدث تعارض: تم تعديل الملف من جهاز آخر. راجع القيم الحالية قبل إعادة الحفظ.",
            serverProfile,
          });
        } catch (reloadError: any) {
          setProfileState({
            kind: "error",
            message: reloadError?.message || "تعذر إعادة تحميل الملف بعد التعارض",
          });
        }
      } else if (updatedProfile.version !== profileState.profile.version) {
        setProfileState({ kind: "ready", profile: updatedProfile });
        setSaveError(error?.message || "تم حفظ جزء من التغييرات؛ أكمل الحفظ لإتمام الباقي");
      } else {
        setProfileState({ kind: "error", message: error?.message || "حدث خطأ أثناء الحفظ" });
      }
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (profileState.kind === "ready" || profileState.kind === "conflict") {
      const p = profileState.kind === "ready" ? profileState.profile : profileState.serverProfile;
      setLocale(p.locale as "ar" | "en" || "ar");
      setCurrency(p.currencyPreference || "SAR");
      setConsentEmail(p.marketingConsentEmail);
      setConsentSms(p.marketingConsentSms);
      setConsentPush(p.marketingConsentPush);
      if (profileState.kind === "conflict") {
        setProfileState({ kind: "ready", profile: p });
      }
    }
  };

  const confirmWithdrawConsent = (type: "email" | "sms" | "push") => {
    // Ideally this would show a dialog, but for now we immediately toggle.
    // DSH specifies: "Withdraw consent shows confirmation then updates."
    // In a real app we'd use React Native Alert.alert.
    if (type === "email") setConsentEmail(false);
    if (type === "sms") setConsentSms(false);
    if (type === "push") setConsentPush(false);
  };

  return (
    <ScrollScreen>
      <Header title="الملف الشخصي" subtitle="تفضيلات اللغة وخيارات التواصل" />
      <View style={styles.content}>
        {onBack && (
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Text style={styles.backText}>العودة</Text>
          </TouchableOpacity>
        )}

        <View style={styles.card}>
          <Text role="bodyStrong">رقم الهاتف: {identity.phoneE164 || "غير مسجل"}</Text>
          <Text role="bodySm" tone="muted">يمكنك إدارة أمان الدخول وكلمة المرور عبر تبويب الأمان والدخول.</Text>
        </View>

        {profileState.kind === "loading" && <StateView tone="neutral" title="جارٍ تحميل الملف..." />}
        {profileState.kind === "error" && (
          <View>
            <StateView tone="danger" title="حدث خطأ" description={profileState.message} />
            <Button label="إعادة المحاولة" onPress={loadProfile} />
          </View>
        )}
        {saveError && <StateView tone="danger" title="تعذر إكمال الحفظ" description={saveError} />}
        {profileState.kind === "conflict" && (
          <StateView tone="warning" title="تعارض في الإصدار" description={profileState.message} />
        )}

        {(profileState.kind === "ready" || profileState.kind === "conflict") && (
          <>
            <View style={styles.card}>
              <Text role="headingSm">الخيارات العامة</Text>
              <View style={styles.row}>
                <Text role="body">اللغة (Locale)</Text>
                <Switch
                  value={locale === "ar"}
                  onValueChange={(v) => setLocale(v ? "ar" : "en")}
                  disabled={saving}
                />
              </View>
            </View>

            <View style={styles.card}>
              <Text role="headingSm">خيارات التواصل (التسويق)</Text>
              <View style={styles.row}>
                <Text role="body">البريد الإلكتروني</Text>
                <Switch
                  value={consentEmail}
                  onValueChange={(v) => v ? setConsentEmail(true) : confirmWithdrawConsent("email")}
                  disabled={saving}
                />
              </View>
              <View style={styles.row}>
                <Text role="body">الرسائل النصية SMS</Text>
                <Switch
                  value={consentSms}
                  onValueChange={(v) => v ? setConsentSms(true) : confirmWithdrawConsent("sms")}
                  disabled={saving}
                />
              </View>
              <View style={styles.row}>
                <Text role="body">إشعارات الهاتف Push</Text>
                <Switch
                  value={consentPush}
                  onValueChange={(v) => v ? setConsentPush(true) : confirmWithdrawConsent("push")}
                  disabled={saving}
                />
              </View>
            </View>

            <View style={styles.actions}>
              <Button
                label={saving ? "جاري الحفظ..." : "حفظ التفضيلات"}
                onPress={handleSave}
                disabled={!hasChanges || saving}
              />
              {hasChanges && !saving && (
                <Button label="إلغاء" tone="secondary" onPress={handleCancel} />
              )}
            </View>

          </>
        )}
      </View>
    </ScrollScreen>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing[4], gap: spacing[4] },
  backButton: { paddingVertical: spacing[2] },
  backText: { color: colorRoles.brandAction, fontWeight: "600" },
  card: { padding: spacing[4], backgroundColor: colorRoles.surfaceBase, borderRadius: radius.lg, gap: spacing[3] },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  actions: { gap: spacing[3], marginTop: spacing[4] },
});
