import React, { useState } from "react";
import { StyleSheet, View, TextInput, ScrollView } from "react-native";
import { useIdentitySession } from "@bthwani/core-identity";
import { Button, Card, Header, StateView, Text, spacing, neutralScale } from "@bthwani/ui-kit";
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
      <Header
        title="استقبال شريك جديد"
        subtitle={step === "identity" ? "الخطوة 1 من 3: بيانات الهوية" : step === "contact" ? "الخطوة 2 من 3: بيانات التواصل" : "الخطوة 3 من 3: مراجعة وإرسال"}
      />

      {step === "identity" && (
        <Card>
          <View style={styles.form}>
            <Text role="titleMd">بيانات الهوية القانونية</Text>

            <View style={styles.field}>
              <Text role="labelMd">الاسم القانوني بالعربية *</Text>
              <TextInput
                style={styles.input}
                value={draft.legalNameAr}
                onChangeText={v => update("legalNameAr", v)}
                placeholder="الاسم الرسمي كما في السجل التجاري"
                textAlign="right"
              />
            </View>

            <View style={styles.field}>
              <Text role="labelMd">الاسم المعروض للعملاء *</Text>
              <TextInput
                style={styles.input}
                value={draft.displayName}
                onChangeText={v => update("displayName", v)}
                placeholder="الاسم الذي يظهر للعملاء"
                textAlign="right"
              />
            </View>

            <View style={styles.field}>
              <Text role="labelMd">نوع الهوية *</Text>
              <View style={styles.options}>
                {IDENTITY_TYPES.map(t => (
                  <Button
                    key={t}
                    variant={draft.legalIdentityType === t ? "primary" : "secondary"}
                    onPress={() => update("legalIdentityType", t)}
                    size="sm"
                  >
                    {t === "national_id" ? "هوية وطنية" : t === "commercial_registration" ? "سجل تجاري" : "أخرى"}
                  </Button>
                ))}
              </View>
            </View>

            <View style={styles.field}>
              <Text role="labelMd">رقم الهوية / السجل *</Text>
              <TextInput
                style={styles.input}
                value={draft.legalIdentityNumber}
                onChangeText={v => update("legalIdentityNumber", v)}
                placeholder="رقم الهوية أو السجل التجاري"
                keyboardType="number-pad"
                textAlign="right"
              />
            </View>

            <Button
              variant="primary"
              onPress={() => setStep("contact")}
              disabled={!isIdentityValid}
            >
              التالي: بيانات التواصل →
            </Button>
          </View>
        </Card>
      )}

      {step === "contact" && (
        <Card>
          <View style={styles.form}>
            <Text role="titleMd">بيانات التواصل والفئة</Text>

            <View style={styles.field}>
              <Text role="labelMd">اسم المالك *</Text>
              <TextInput
                style={styles.input}
                value={draft.ownerName}
                onChangeText={v => update("ownerName", v)}
                placeholder="الاسم الكامل للمالك"
                textAlign="right"
              />
            </View>

            <View style={styles.field}>
              <Text role="labelMd">رقم الهاتف الأساسي *</Text>
              <TextInput
                style={styles.input}
                value={draft.primaryPhone}
                onChangeText={v => update("primaryPhone", v)}
                placeholder="05XXXXXXXX"
                keyboardType="phone-pad"
                textAlign="right"
              />
            </View>

            <View style={styles.field}>
              <Text role="labelMd">فئة المتجر *</Text>
              <View style={styles.options}>
                {CATEGORIES.map(cat => (
                  <Button
                    key={cat}
                    variant={draft.category === cat ? "primary" : "secondary"}
                    onPress={() => update("category", cat)}
                    size="sm"
                  >
                    {cat === "restaurant" ? "مطعم" : cat === "grocery" ? "بقالة" : cat === "pharmacy" ? "صيدلية" : cat === "bakery" ? "مخبز" : "أخرى"}
                  </Button>
                ))}
              </View>
            </View>

            <View style={styles.actions}>
              <Button variant="secondary" onPress={() => setStep("identity")}>← رجوع</Button>
              <Button variant="primary" onPress={() => setStep("review")} disabled={!isContactValid}>
                مراجعة وإرسال →
              </Button>
            </View>
          </View>
        </Card>
      )}

      {step === "review" && (
        <Card>
          <View style={styles.form}>
            <Text role="titleMd">مراجعة البيانات قبل الإرسال</Text>

            {[
              ["الاسم القانوني", draft.legalNameAr],
              ["الاسم المعروض", draft.displayName],
              ["نوع الهوية", draft.legalIdentityType],
              ["رقم الهوية", draft.legalIdentityNumber],
              ["اسم المالك", draft.ownerName],
              ["رقم الهاتف", draft.primaryPhone],
              ["الفئة", draft.category],
            ].map(([label, value]) => (
              <View key={label} style={styles.reviewRow}>
                <Text role="labelMd" tone="muted">{label}</Text>
                <Text role="bodyMd">{value}</Text>
              </View>
            ))}

            <View style={styles.actions}>
              <Button variant="secondary" onPress={() => setStep("contact")}>← تعديل</Button>
              <Button
                variant="primary"
                onPress={() => void handleSubmit()}
                disabled={submitting}
              >
                {submitting ? "جاري الإرسال…" : "إرسال للمراجعة ✓"}
              </Button>
            </View>
          </View>
        </Card>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing[4], gap: spacing[4] },
  form: { padding: spacing[4], gap: spacing[4] },
  field: { gap: spacing[1] },
  input: {
    borderWidth: 1,
    borderColor: neutralScale[200],
    borderRadius: spacing[2],
    padding: spacing[3],
    fontSize: 15,
    backgroundColor: neutralScale[50],
  },
  options: { flexDirection: "row-reverse", flexWrap: "wrap", gap: spacing[2] },
  actions: { flexDirection: "row-reverse", gap: spacing[3] },
  reviewRow: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    paddingVertical: spacing[1],
    borderBottomWidth: 1,
    borderBottomColor: neutralScale[100],
  },
});
