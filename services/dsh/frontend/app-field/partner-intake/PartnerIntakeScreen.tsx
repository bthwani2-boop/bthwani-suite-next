import React, { useState } from "react";
import { StyleSheet, View, ScrollView } from "react-native";
import { useIdentitySession } from "@bthwani/core-identity";
import { Button, Card, StateView, Text, TextField, spacing, Badge } from "@bthwani/ui-kit";
import { submitFieldPartnerIntake, type DshCreatePartnerInput } from "../../shared/partner";

type Step = "identity" | "contact" | "review" | "submitted" | "error";

type DraftState = {
  legalNameAr: string;
  displayName: string;
  legalIdentityType: string;
  legalIdentityNumber: string;
  ownerName: string;
  primaryPhone: string;
  category: string;
};

const IDENTITY_TYPES = ["national_id", "commercial_registration", "other"];
const CATEGORIES = ["restaurant", "grocery", "pharmacy", "bakery", "other"];

export function PartnerIntakeScreen() {
  const identity = useIdentitySession();
  const [step, setStep] = useState<Step>("identity");
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [draft, setDraft] = useState<DraftState>({
    legalNameAr: "",
    displayName: "",
    legalIdentityType: "commercial_registration",
    legalIdentityNumber: "",
    ownerName: "",
    primaryPhone: "",
    category: "restaurant",
  });

  if (identity.state.kind !== "authenticated") {
    return (
      <StateView
        title="تسجيل الدخول مطلوب"
        description="يجب تسجيل دخولك كمندوب ميداني لاستخدام هذه الشاشة."
      />
    );
  }

  const actorId = (identity.state as { subject?: string }).subject ?? "";

  const update = (key: keyof DraftState, value: string) =>
    setDraft(d => ({ ...d, [key]: value }));

  const isIdentityValid =
    draft.legalNameAr.trim().length >= 2 &&
    draft.displayName.trim().length >= 2 &&
    draft.legalIdentityNumber.trim().length >= 5 &&
    IDENTITY_TYPES.includes(draft.legalIdentityType);

  const isContactValid =
    draft.ownerName.trim().length >= 2 &&
    draft.primaryPhone.trim().length >= 8 &&
    CATEGORIES.includes(draft.category);

  const handleSubmit = async () => {
    setSubmitting(true);
    setErrorMessage("");
    try {
      const input: DshCreatePartnerInput = {
        legalNameAr: draft.legalNameAr.trim(),
        displayName: draft.displayName.trim(),
        legalIdentityType: draft.legalIdentityType,
        legalIdentityNumber: draft.legalIdentityNumber.trim(),
        ownerName: draft.ownerName.trim(),
        primaryPhone: draft.primaryPhone.trim(),
        category: draft.category,
        createdBy: actorId,
        assignedFieldAgent: actorId,
      };
      await submitFieldPartnerIntake(input);
      setStep("submitted");
    } catch (err) {
      const e = err as { status?: number };
      if (e?.status === 409) {
        setErrorMessage("شريك بهذه الهوية القانونية موجود بالفعل في النظام.");
      } else if (e?.status === 401) {
        setErrorMessage("جلسة منتهية — يرجى تسجيل الدخول مجدداً.");
      } else {
        setErrorMessage("حدث خطأ أثناء الإرسال. يرجى المحاولة مجدداً.");
      }
      setStep("error");
    } finally {
      setSubmitting(false);
    }
  };

  const renderStepIndicator = () => {
    return (
      <View style={styles.stepIndicator}>
        <Badge
          label="1. الهوية"
          tone={step === "identity" ? "action" : "neutral"}
        />
        <Text tone="muted">←</Text>
        <Badge
          label="2. التواصل"
          tone={step === "contact" ? "action" : "neutral"}
        />
        <Text tone="muted">←</Text>
        <Badge
          label="3. المراجعة"
          tone={step === "review" ? "action" : "neutral"}
        />
      </View>
    );
  };

  if (step === "submitted") {
    return (
      <StateView
        title="تم إرسال ملف الشريك بنجاح"
        description="سيراجع فريق الشركاء الملف ويتواصل مع الشريك خلال فترة قصيرة."
        actionLabel="استقبال شريك جديد"
        onActionPress={() => {
          setStep("identity");
          setDraft({ legalNameAr: "", displayName: "", legalIdentityType: "commercial_registration", legalIdentityNumber: "", ownerName: "", primaryPhone: "", category: "restaurant" });
        }}
      />
    );
  }

  if (step === "error") {
    return (
      <StateView
        title="فشل الإرسال"
        description={errorMessage}
        actionLabel="المحاولة مجدداً"
        onActionPress={() => setStep("review")}
      />
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {renderStepIndicator()}

      {step === "identity" && (
        <Card padding="$5" gap="$4">
          <Text role="titleMd" style={{ textAlign: "right" }}>بيانات الهوية القانونية</Text>

          <View style={styles.field}>
            <Text role="bodySm" tone="secondary" style={{ textAlign: "right", marginBottom: 4 }}>الاسم القانوني بالعربية *</Text>
            <TextField
              label="الاسم القانوني"
              value={draft.legalNameAr}
              onChangeText={v => update("legalNameAr", v)}
              placeholder="الاسم الرسمي كما في السجل التجاري"
            />
          </View>

          <View style={styles.field}>
            <Text role="bodySm" tone="secondary" style={{ textAlign: "right", marginBottom: 4 }}>الاسم المعروض للعملاء *</Text>
            <TextField
              label="الاسم المعروض"
              value={draft.displayName}
              onChangeText={v => update("displayName", v)}
              placeholder="الاسم الذي يظهر للعملاء"
            />
          </View>

          <View style={styles.field}>
            <Text role="bodySm" tone="secondary" style={{ textAlign: "right", marginBottom: 4 }}>نوع الهوية *</Text>
            <View style={styles.options}>
              {IDENTITY_TYPES.map(t => (
                <Button
                  key={t}
                  label={t === "national_id" ? "هوية وطنية" : t === "commercial_registration" ? "سجل تجاري" : "أخرى"}
                  tone={draft.legalIdentityType === t ? "primary" : "secondary"}
                  onPress={() => update("legalIdentityType", t)}
                  size="sm"
                />
              ))}
            </View>
          </View>

          <View style={styles.field}>
            <Text role="bodySm" tone="secondary" style={{ textAlign: "right", marginBottom: 4 }}>رقم الهوية / السجل *</Text>
            <TextField
              label="رقم الهوية"
              value={draft.legalIdentityNumber}
              onChangeText={v => update("legalIdentityNumber", v)}
              placeholder="رقم الهوية أو السجل التجاري"
            />
          </View>

          <Button
            label="التالي: بيانات التواصل ←"
            tone="primary"
            onPress={() => setStep("contact")}
            disabled={!isIdentityValid}
          />
        </Card>
      )}

      {step === "contact" && (
        <Card padding="$5" gap="$4">
          <Text role="titleMd" style={{ textAlign: "right" }}>بيانات التواصل والفئة</Text>

          <View style={styles.field}>
            <Text role="bodySm" tone="secondary" style={{ textAlign: "right", marginBottom: 4 }}>اسم المالك *</Text>
            <TextField
              label="اسم المالك"
              value={draft.ownerName}
              onChangeText={v => update("ownerName", v)}
              placeholder="الاسم الكامل للمالك"
            />
          </View>

          <View style={styles.field}>
            <Text role="bodySm" tone="secondary" style={{ textAlign: "right", marginBottom: 4 }}>رقم الهاتف الأساسي *</Text>
            <TextField
              label="رقم الهاتف"
              value={draft.primaryPhone}
              onChangeText={v => update("primaryPhone", v)}
              placeholder="05XXXXXXXX"
            />
          </View>

          <View style={styles.field}>
            <Text role="bodySm" tone="secondary" style={{ textAlign: "right", marginBottom: 4 }}>فئة المتجر *</Text>
            <View style={styles.options}>
              {CATEGORIES.map(cat => (
                <Button
                  key={cat}
                  label={cat === "restaurant" ? "مطعم" : cat === "grocery" ? "بقالة" : cat === "pharmacy" ? "صيدلية" : cat === "bakery" ? "مخبز" : "أخرى"}
                  tone={draft.category === cat ? "primary" : "secondary"}
                  onPress={() => update("category", cat)}
                  size="sm"
                />
              ))}
            </View>
          </View>

          <View style={styles.actions}>
            <Button label="← رجوع" tone="ghost" onPress={() => setStep("identity")} />
            <Button label="مراجعة وإرسال →" tone="primary" onPress={() => setStep("review")} disabled={!isContactValid} />
          </View>
        </Card>
      )}

      {step === "review" && (
        <Card padding="$5" gap="$4">
          <Text role="titleMd" style={{ textAlign: "right" }}>مراجعة البيانات قبل الإرسال</Text>

          <View style={{ gap: spacing[1] }}>
            {[
              ["الاسم القانوني", draft.legalNameAr],
              ["الاسم المعروض", draft.displayName],
              ["نوع الهوية", draft.legalIdentityType === "national_id" ? "هوية وطنية" : draft.legalIdentityType === "commercial_registration" ? "سجل تجاري" : "أخرى"],
              ["رقم الهوية", draft.legalIdentityNumber],
              ["اسم المالك", draft.ownerName],
              ["رقم الهاتف", draft.primaryPhone],
              ["الفئة", draft.category === "restaurant" ? "مطعم" : draft.category === "grocery" ? "بقالة" : draft.category === "pharmacy" ? "صيدلية" : draft.category === "bakery" ? "مخبز" : "أخرى"],
            ].map(([lbl, val]) => (
              <Card key={lbl} padding="$3" tone="default" style={{ flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center" }}>
                <Text tone="secondary">{lbl}</Text>
                <Text role="bodyStrong">{val}</Text>
              </Card>
            ))}
          </View>

          <View style={styles.actions}>
            <Button label="← تعديل" tone="ghost" onPress={() => setStep("contact")} />
            <Button
              label={submitting ? "جاري الإرسال…" : "إرسال للمراجعة ✓"}
              tone="primary"
              onPress={() => void handleSubmit()}
              disabled={submitting}
            />
          </View>
        </Card>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing[4], gap: spacing[4] },
  field: { gap: spacing[1] },
  options: { flexDirection: "row-reverse", flexWrap: "wrap", gap: spacing[2] },
  actions: { flexDirection: "row-reverse", gap: spacing[3], marginTop: spacing[2] },
  stepIndicator: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing[2],
    marginVertical: spacing[2],
  },
});
