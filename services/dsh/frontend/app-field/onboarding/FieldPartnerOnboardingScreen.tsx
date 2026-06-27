// app-field — main partner onboarding flow container.
// Fully unified, pixel-perfect single screen matching the design.
import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator } from "react-native";
import { useFieldPartnerOnboardingController } from "../../shared/field-onboarding";

export function FieldPartnerOnboardingScreen() {
  const c = useFieldPartnerOnboardingController();
  const { state, validationErrors, updateForm, submitDraft } = c;
  const [loading, setLoading] = useState(false);

  const handleSaveDraft = async () => {
    // Validate identity step locally or save draft
    if (!state.form.legalNameAr?.trim()) {
      Alert.alert("تنبيه", "الاسم التجاري بالعربية مطلوب.");
      return;
    }
    setLoading(true);
    try {
      // Just step next to trigger draft creation
      await c.nextStep();
      Alert.alert("نجاح", "تم حفظ المسودة بنجاح.");
    } catch (e) {
      Alert.alert("خطأ", "فشل حفظ المسودة.");
    } finally {
      setLoading(false);
    }
  };

  const handleSendForReview = async () => {
    if (!state.form.legalNameAr?.trim()) {
      Alert.alert("تنبيه", "الاسم التجاري بالعربية مطلوب.");
      return;
    }
    if (!state.form.primaryPhone?.trim()) {
      Alert.alert("تنبيه", "رقم الجوال الأساسي مطلوب.");
      return;
    }
    setLoading(true);
    try {
      // Ensure draft is created, then submit
      await submitDraft();
      Alert.alert("نجاح", "تم إرسال طلب الشريك للمراجعة بنجاح.");
    } catch (e) {
      Alert.alert("خطأ", "فشل إرسال الطلب للمراجعة.");
    } finally {
      setLoading(false);
    }
  };

  if (state.isSubmitted) {
    return (
      <View style={styles.container}>
        <View style={styles.successCard}>
          <Text style={styles.successIcon}>✓</Text>
          <Text style={styles.successTitle}>تم الإرسال بنجاح</Text>
          <Text style={styles.successSubtitle}>
            ملف الشريك أُرسِل لمراجعة قسم الشركاء في لوحة التحكم.
          </Text>
          <Text style={styles.successNote}>رقم الشريك: {state.partnerId}</Text>
          <TouchableOpacity style={styles.resetButton} onPress={c.reset}>
            <Text style={styles.resetButtonText}>تسجيل شريك جديد</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>تسجيل شريك جديد</Text>
        <View style={styles.statusBadge}>
          <Text style={styles.statusText}>الحالة: مسودة</Text>
        </View>
      </View>

      <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
        {/* Form Fields */}
        <View style={styles.formCard}>
          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>الاسم التجاري بالعربية *</Text>
            <TextInput
              style={[styles.input, validationErrors.legalNameAr ? styles.inputError : null]}
              placeholder="مثال: مخبز عون"
              placeholderTextColor="#9ca3af"
              value={state.form.legalNameAr ?? ""}
              onChangeText={(v) => updateForm({ legalNameAr: v, displayName: v })}
            />
            {validationErrors.legalNameAr ? <Text style={styles.errorText}>{validationErrors.legalNameAr}</Text> : null}
          </View>

          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>الاسم القانوني بالإنجليزية</Text>
            <TextInput
              style={styles.input}
              placeholder="مثال: Awn Bakery"
              placeholderTextColor="#9ca3af"
              value={state.form.legalNameEn ?? ""}
              onChangeText={(v) => updateForm({ legalNameEn: v })}
            />
          </View>

          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>اسم المالك بالعربية</Text>
            <TextInput
              style={styles.input}
              placeholder="مثال: عون محمد"
              placeholderTextColor="#9ca3af"
              value={state.form.ownerName ?? ""}
              onChangeText={(v) => updateForm({ ownerName: v })}
            />
          </View>

          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>نوع الهوية</Text>
            <TextInput
              style={styles.input}
              placeholder="بطاقة شخصية / سجل تجاري"
              placeholderTextColor="#9ca3af"
              value={
                state.form.legalIdentityType === "commercial_register" ? "سجل تجاري" :
                state.form.legalIdentityType === "national_id" ? "بطاقة شخصية" : "شهادة عمل حر"
              }
              onChangeText={(v) => {
                const type = v.includes("شخصية") ? "national_id" : "commercial_register";
                updateForm({ legalIdentityType: type });
              }}
            />
          </View>

          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>رقم هوية المالك / السجل *</Text>
            <TextInput
              style={[styles.input, validationErrors.legalIdentityNumber ? styles.inputError : null]}
              placeholder="مثال: 1029384756"
              placeholderTextColor="#9ca3af"
              keyboardType="numeric"
              value={state.form.legalIdentityNumber ?? ""}
              onChangeText={(v) => updateForm({ legalIdentityNumber: v })}
            />
            {validationErrors.legalIdentityNumber ? <Text style={styles.errorText}>{validationErrors.legalIdentityNumber}</Text> : null}
          </View>

          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>الجوال الأساسي *</Text>
            <TextInput
              style={[styles.input, validationErrors.primaryPhone ? styles.inputError : null]}
              placeholder="مثال: 777777777"
              placeholderTextColor="#9ca3af"
              keyboardType="phone-pad"
              value={state.form.primaryPhone ?? ""}
              onChangeText={(v) => updateForm({ primaryPhone: v })}
            />
            {validationErrors.primaryPhone ? <Text style={styles.errorText}>{validationErrors.primaryPhone}</Text> : null}
          </View>

          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>الجوال الاحتياطي</Text>
            <TextInput
              style={styles.input}
              placeholder="غير محدد"
              placeholderTextColor="#9ca3af"
              keyboardType="phone-pad"
              value={state.form.secondaryPhone ?? ""}
              onChangeText={(v) => updateForm({ secondaryPhone: v })}
            />
          </View>

          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>البريد الإلكتروني</Text>
            <TextInput
              style={styles.input}
              placeholder="مثال: awn@example.com"
              placeholderTextColor="#9ca3af"
              keyboardType="email-address"
              autoCapitalize="none"
              value={state.form.email ?? ""}
              onChangeText={(v) => updateForm({ email: v })}
            />
          </View>

          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>الفئة</Text>
            <TextInput
              style={styles.input}
              placeholder="مثال: مخبز"
              placeholderTextColor="#9ca3af"
              value={
                state.form.category === "bakery" ? "مخبز" :
                state.form.category === "grocery" ? "بقالة" :
                state.form.category === "restaurant" ? "مطعم" : "أخرى"
              }
              onChangeText={(v) => {
                const cat = v.includes("مخبز") ? "bakery" :
                            v.includes("بقالة") ? "grocery" :
                            v.includes("مطعم") ? "restaurant" : "default";
                updateForm({ category: cat });
              }}
            />
          </View>
        </View>
      </ScrollView>

      {/* Footer Buttons */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.draftButton} onPress={handleSaveDraft} disabled={loading}>
          <Text style={styles.draftButtonText}>حفظ كمسودة</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.submitButton} onPress={handleSendForReview} disabled={loading}>
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>إرسال للمراجعة</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
    direction: "rtl",
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 15,
    backgroundColor: "#FFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1E293B",
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  statusText: {
    fontSize: 12,
    color: "#2563EB",
    fontWeight: "600",
  },
  body: {
    flex: 1,
  },
  bodyContent: {
    padding: 16,
  },
  formCard: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  fieldRow: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#475569",
    marginBottom: 8,
    textAlign: "right",
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 15,
    color: "#1e293b",
    textAlign: "right",
    backgroundColor: "#F8FAFC",
  },
  inputError: {
    borderColor: "#EF4444",
    backgroundColor: "#FEF2F2",
  },
  errorText: {
    fontSize: 12,
    color: "#EF4444",
    marginTop: 4,
    textAlign: "right",
  },
  footer: {
    padding: 16,
    backgroundColor: "#FFF",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    flexDirection: "row-reverse",
    gap: 12,
  },
  draftButton: {
    flex: 1,
    height: 48,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: "#FF500D",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFF",
  },
  draftButtonText: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#FF500D",
  },
  submitButton: {
    flex: 1,
    height: 48,
    borderRadius: 8,
    backgroundColor: "#FF500D",
    justifyContent: "center",
    alignItems: "center",
  },
  submitButtonText: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#FFF",
  },
  successCard: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    backgroundColor: "#FFF",
  },
  successIcon: {
    fontSize: 48,
    color: "#10B981",
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#1E293B",
    marginBottom: 8,
  },
  successSubtitle: {
    fontSize: 15,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 8,
  },
  successNote: {
    fontSize: 13,
    color: "#94A3B8",
    fontFamily: "monospace",
    marginBottom: 24,
  },
  resetButton: {
    paddingHorizontal: 24,
    height: 48,
    borderRadius: 8,
    backgroundColor: "#FF500D",
    justifyContent: "center",
    alignItems: "center",
  },
  resetButtonText: {
    color: "#FFF",
    fontSize: 15,
    fontWeight: "bold",
  },
});
