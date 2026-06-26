// app-field — main partner onboarding flow container.
// No fetch. No env. Consumes useFieldPartnerOnboardingController from shared.
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert } from "react-native";
import { useFieldPartnerOnboardingController } from "../../shared/field-onboarding";
import { FIELD_ONBOARDING_STEP_LABELS } from "../../shared/field-onboarding";

export function FieldPartnerOnboardingScreen() {
  const c = useFieldPartnerOnboardingController();
  const { state, validationErrors, updateForm, updateVisitNotes, updateLocation, nextStep, prevStep, submitDraft, reset } = c;

  if (state.isSubmitted) {
    return (
      <View style={styles.container}>
        <View style={styles.successCard}>
          <Text style={styles.successTitle}>تم الإرسال بنجاح</Text>
          <Text style={styles.successSubtitle}>
            ملف الشريك أُرسِل لمراجعة قسم الشركاء في لوحة التحكم.
          </Text>
          <Text style={styles.successNote}>رقم الشريك: {state.partnerId}</Text>
          <TouchableOpacity style={styles.primaryButton} onPress={reset}>
            <Text style={styles.primaryButtonText}>إضافة شريك جديد</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const stepLabel = FIELD_ONBOARDING_STEP_LABELS[state.step];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>تأهيل شريك جديد</Text>
        <Text style={styles.headerStep}>{stepLabel}</Text>
      </View>

      {state.submitError ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{state.submitError}</Text>
        </View>
      ) : null}

      <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
        {state.step === "identity" && (
          <IdentityStep
            form={state.form}
            errors={validationErrors}
            onChange={updateForm}
          />
        )}
        {state.step === "owner" && (
          <OwnerStep
            form={state.form}
            errors={validationErrors}
            onChange={updateForm}
          />
        )}
        {state.step === "store" && (
          <StoreStep
            form={state.form}
            errors={validationErrors}
            onChange={updateForm}
          />
        )}
        {state.step === "location" && (
          <LocationStep
            lat={state.locationLatitude}
            lon={state.locationLongitude}
            onSet={updateLocation}
          />
        )}
        {state.step === "documents" && (
          <DocumentsStep partnerId={state.partnerId} />
        )}
        {state.step === "visit-notes" && (
          <VisitNotesStep
            notes={state.visitNotes}
            onChange={updateVisitNotes}
          />
        )}
        {state.step === "review" && (
          <ReviewStep state={state} />
        )}
      </ScrollView>

      <View style={styles.footer}>
        {state.step !== "identity" && (
          <TouchableOpacity style={styles.secondaryButton} onPress={prevStep}>
            <Text style={styles.secondaryButtonText}>السابق</Text>
          </TouchableOpacity>
        )}
        {state.step === "review" ? (
          <TouchableOpacity
            style={[styles.primaryButton, state.isSubmitting && styles.disabled]}
            onPress={() => void submitDraft()}
            disabled={state.isSubmitting}
          >
            <Text style={styles.primaryButtonText}>
              {state.isSubmitting ? "جاري الإرسال…" : "إرسال للمراجعة"}
            </Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.primaryButton} onPress={() => void nextStep()}>
            <Text style={styles.primaryButtonText}>التالي</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

// ─── Step sub-components ─────────────────────────────────────────────────────

function IdentityStep({ form, errors, onChange }: {
  form: any;
  errors: any;
  onChange: (patch: any) => void;
}) {
  return (
    <View>
      <Text style={styles.sectionTitle}>بيانات الهوية التجارية</Text>
      <FieldInput
        label="الاسم التجاري بالعربية *"
        value={form.legalNameAr ?? ""}
        onChangeText={(v: string) => onChange({ legalNameAr: v })}
        error={errors.legalNameAr}
      />
      <FieldInput
        label="الاسم التجاري بالإنجليزية"
        value={form.legalNameEn ?? ""}
        onChangeText={(v: string) => onChange({ legalNameEn: v })}
      />
      <FieldInput
        label="اسم العرض للعملاء *"
        value={form.displayName ?? ""}
        onChangeText={(v: string) => onChange({ displayName: v })}
        error={errors.displayName}
      />
      <FieldInput
        label="رقم السجل التجاري / الهوية *"
        value={form.legalIdentityNumber ?? ""}
        onChangeText={(v: string) => onChange({ legalIdentityNumber: v })}
        error={errors.legalIdentityNumber}
      />
    </View>
  );
}

function OwnerStep({ form, errors, onChange }: { form: any; errors: any; onChange: (p: any) => void }) {
  return (
    <View>
      <Text style={styles.sectionTitle}>بيانات المالك</Text>
      <FieldInput
        label="اسم المالك"
        value={form.ownerName ?? ""}
        onChangeText={(v: string) => onChange({ ownerName: v })}
      />
      <FieldInput
        label="رقم الجوال الأساسي *"
        value={form.primaryPhone ?? ""}
        onChangeText={(v: string) => onChange({ primaryPhone: v })}
        error={errors.primaryPhone}
        keyboardType="phone-pad"
      />
      <FieldInput
        label="رقم الجوال الاحتياطي"
        value={form.secondaryPhone ?? ""}
        onChangeText={(v: string) => onChange({ secondaryPhone: v })}
        keyboardType="phone-pad"
      />
      <FieldInput
        label="البريد الإلكتروني"
        value={form.email ?? ""}
        onChangeText={(v: string) => onChange({ email: v })}
        keyboardType="email-address"
      />
    </View>
  );
}

function StoreStep({ form, errors, onChange }: { form: any; errors: any; onChange: (p: any) => void }) {
  return (
    <View>
      <Text style={styles.sectionTitle}>بيانات الفرع</Text>
      <Text style={styles.fieldLabel}>نوع المتجر</Text>
      {(["restaurant", "grocery", "pharmacy", "bakery", "default"] as const).map((cat) => (
        <TouchableOpacity
          key={cat}
          style={[styles.radioRow, form.category === cat && styles.radioSelected]}
          onPress={() => onChange({ category: cat })}
        >
          <Text style={styles.radioText}>{
            { restaurant: "مطعم", grocery: "بقالة", pharmacy: "صيدلية", bakery: "مخبز", default: "أخرى" }[cat]
          }</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

function LocationStep({ lat, lon, onSet }: { lat: number | null; lon: number | null; onSet: (la: number, lo: number) => void }) {
  const handleCapture = () => {
    // In a real implementation this uses the device GPS
    // For now we capture a placeholder
    onSet(24.7136, 46.6753);
    Alert.alert("تم تسجيل الموقع", "الموقع الجغرافي تم تسجيله بنجاح.");
  };
  return (
    <View>
      <Text style={styles.sectionTitle}>الموقع الجغرافي</Text>
      {lat !== null ? (
        <View style={styles.locationCard}>
          <Text style={styles.locationText}>خط العرض: {lat}</Text>
          <Text style={styles.locationText}>خط الطول: {lon}</Text>
        </View>
      ) : (
        <Text style={styles.mutedText}>لم يتم تسجيل الموقع بعد</Text>
      )}
      <TouchableOpacity style={styles.primaryButton} onPress={handleCapture}>
        <Text style={styles.primaryButtonText}>تسجيل الموقع الحالي</Text>
      </TouchableOpacity>
    </View>
  );
}

function DocumentsStep({ partnerId }: { partnerId: string | null }) {
  return (
    <View>
      <Text style={styles.sectionTitle}>الوثائق المطلوبة</Text>
      <Text style={styles.mutedText}>
        {partnerId
          ? "أضف الوثائق عبر رفع الملفات المطلوبة. الوثائق الأساسية: الهوية الوطنية، السجل التجاري."
          : "أكمل بيانات الهوية أولاً لتفعيل رفع الوثائق."}
      </Text>
      {["national_id", "commercial_register", "lease_agreement"].map((type) => (
        <View key={type} style={styles.documentRow}>
          <Text style={styles.documentLabel}>
            {{ national_id: "الهوية الوطنية", commercial_register: "السجل التجاري", lease_agreement: "عقد الإيجار" }[type]}
          </Text>
          <TouchableOpacity style={styles.uploadButton} disabled={!partnerId}>
            <Text style={styles.uploadButtonText}>رفع</Text>
          </TouchableOpacity>
        </View>
      ))}
    </View>
  );
}

function VisitNotesStep({ notes, onChange }: { notes: string; onChange: (v: string) => void }) {
  return (
    <View>
      <Text style={styles.sectionTitle}>ملاحظات الزيارة الميدانية</Text>
      <TextInput
        style={styles.textArea}
        value={notes}
        onChangeText={onChange}
        multiline
        numberOfLines={6}
        placeholder="أدخل ملاحظات الزيارة وأي تفاصيل إضافية..."
        textAlignVertical="top"
      />
    </View>
  );
}

function ReviewStep({ state }: { state: any }) {
  return (
    <View>
      <Text style={styles.sectionTitle}>مراجعة وإرسال الملف</Text>
      <View style={styles.reviewCard}>
        <ReviewRow label="الاسم التجاري" value={state.form.legalNameAr} />
        <ReviewRow label="اسم العرض" value={state.form.displayName} />
        <ReviewRow label="رقم الجوال" value={state.form.primaryPhone} />
        <ReviewRow label="رقم الهوية" value={state.form.legalIdentityNumber} />
        <ReviewRow label="الموقع" value={state.locationLatitude ? `${state.locationLatitude}, ${state.locationLongitude}` : "لم يُسجَّل"} />
      </View>
      <Text style={styles.reviewNote}>
        بعد الإرسال، سيراجع قسم الشركاء في لوحة التحكم الملف ويتخذ قرار الاعتماد أو الرفض.
        لا يمكن للميداني تفعيل الشريك مباشرة.
      </Text>
    </View>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.reviewRow}>
      <Text style={styles.reviewLabel}>{label}:</Text>
      <Text style={styles.reviewValue}>{value || "—"}</Text>
    </View>
  );
}

function FieldInput({ label, value, onChangeText, error, keyboardType }: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  error?: string;
  keyboardType?: any;
}) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={[styles.textInput, error ? styles.inputError : null]}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        textAlign="right"
      />
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8f9fa" },
  header: { padding: 16, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#e5e7eb" },
  headerTitle: { fontSize: 18, fontWeight: "700", textAlign: "right", color: "#111" },
  headerStep: { fontSize: 14, color: "#6b7280", textAlign: "right", marginTop: 4 },
  body: { flex: 1 },
  bodyContent: { padding: 16 },
  footer: { flexDirection: "row", gap: 12, padding: 16, backgroundColor: "#fff", borderTopWidth: 1, borderTopColor: "#e5e7eb" },
  sectionTitle: { fontSize: 16, fontWeight: "600", marginBottom: 16, textAlign: "right", color: "#111" },
  fieldGroup: { marginBottom: 16 },
  fieldLabel: { fontSize: 14, color: "#374151", marginBottom: 6, textAlign: "right" },
  textInput: { borderWidth: 1, borderColor: "#d1d5db", borderRadius: 8, padding: 12, fontSize: 14, backgroundColor: "#fff" },
  textArea: { borderWidth: 1, borderColor: "#d1d5db", borderRadius: 8, padding: 12, fontSize: 14, backgroundColor: "#fff", minHeight: 120 },
  inputError: { borderColor: "#ef4444" },
  errorText: { color: "#ef4444", fontSize: 12, marginTop: 4, textAlign: "right" },
  errorBanner: { backgroundColor: "#fef2f2", padding: 12, marginHorizontal: 16, marginTop: 8, borderRadius: 8, borderWidth: 1, borderColor: "#fecaca" },
  primaryButton: { flex: 1, backgroundColor: "#111827", padding: 14, borderRadius: 8, alignItems: "center" },
  primaryButtonText: { color: "#fff", fontWeight: "600", fontSize: 15 },
  secondaryButton: { flex: 1, backgroundColor: "#f3f4f6", padding: 14, borderRadius: 8, alignItems: "center" },
  secondaryButtonText: { color: "#374151", fontWeight: "600", fontSize: 15 },
  disabled: { opacity: 0.5 },
  radioRow: { padding: 12, borderWidth: 1, borderColor: "#d1d5db", borderRadius: 8, marginBottom: 8 },
  radioSelected: { borderColor: "#111827", backgroundColor: "#f9fafb" },
  radioText: { textAlign: "right", fontSize: 14 },
  locationCard: { padding: 12, backgroundColor: "#ecfdf5", borderRadius: 8, marginBottom: 12 },
  locationText: { fontSize: 14, color: "#065f46" },
  mutedText: { color: "#9ca3af", fontSize: 14, textAlign: "right", marginBottom: 16 },
  documentRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 12, borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 8, marginBottom: 8 },
  documentLabel: { fontSize: 14, color: "#374151" },
  uploadButton: { backgroundColor: "#1d4ed8", paddingHorizontal: 16, paddingVertical: 8, borderRadius: 6 },
  uploadButtonText: { color: "#fff", fontSize: 13, fontWeight: "600" },
  reviewCard: { backgroundColor: "#fff", borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 8, padding: 16, marginBottom: 16 },
  reviewRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#f3f4f6" },
  reviewLabel: { fontSize: 14, color: "#6b7280" },
  reviewValue: { fontSize: 14, fontWeight: "500", color: "#111" },
  reviewNote: { fontSize: 13, color: "#6b7280", textAlign: "right", lineHeight: 20 },
  successCard: { flex: 1, justifyContent: "center", alignItems: "center", padding: 32 },
  successTitle: { fontSize: 22, fontWeight: "700", color: "#065f46", marginBottom: 12 },
  successSubtitle: { fontSize: 15, color: "#374151", textAlign: "center", marginBottom: 8 },
  successNote: { fontSize: 13, color: "#6b7280", marginBottom: 24 },
});
