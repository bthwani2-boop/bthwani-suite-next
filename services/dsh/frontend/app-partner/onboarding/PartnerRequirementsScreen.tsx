import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from "react-native";
import { useIdentitySession } from "@bthwani/core-identity";
import { usePartnerSelfController } from "../../shared/partner";
import { REQUIRED_DOCUMENT_TYPES, DOCUMENT_TYPE_LABELS } from "../../shared/partner";

export function PartnerRequirementsScreen() {
  const identity = useIdentitySession();
  const c = usePartnerSelfController(identity.state.kind);
  const { statusState, readinessState, reload } = c;

  if (statusState.kind === "idle" || statusState.kind === "loading") {
    return <View style={styles.center}><Text style={styles.muted}>جاري التحميل…</Text></View>;
  }
  if (statusState.kind === "error") {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{statusState.message}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={reload}>
          <Text style={styles.retryText}>إعادة المحاولة</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.pageTitle}>متطلبات التفعيل</Text>
      <Text style={styles.subtitle}>
        فيما يلي المتطلبات الأساسية لاستكمال عملية تأهيل متجرك وتفعيله على المنصة.
      </Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>الوثائق المطلوبة</Text>
        {REQUIRED_DOCUMENT_TYPES.map((type) => (
          <View key={type} style={styles.requirementRow}>
            <View style={styles.bullet} />
            <Text style={styles.requirementText}>{DOCUMENT_TYPE_LABELS[type]}</Text>
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>مراحل التفعيل</Text>
        {[
          { label: "تأهيل ميداني", desc: "يقوم موظف ميداني بزيارة موقعك وجمع الوثائق وتسجيل الإحداثيات." },
          { label: "مراجعة الوثائق", desc: "يراجع فريق قسم الشركاء الوثائق المرفوعة ويتحقق من صحتها." },
          { label: "اعتماد العمليات", desc: "يصدر قسم العمليات قرار الاعتماد أو الرفض." },
          { label: "التفعيل", desc: "عند الاعتماد، يُفعَّل الشريك ويصبح مرئياً للعملاء حسب إعدادات المتجر." },
        ].map((step, i) => (
          <View key={step.label} style={styles.stepRow}>
            <View style={styles.stepNum}>
              <Text style={styles.stepNumText}>{i + 1}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.stepLabel}>{step.label}</Text>
              <Text style={styles.stepDesc}>{step.desc}</Text>
            </View>
          </View>
        ))}
      </View>

      {readinessState.kind === "idle" && (
        <TouchableOpacity style={styles.loadBtn} onPress={reload}>
          <Text style={styles.loadBtnText}>تحقق من جاهزيتي الآن</Text>
        </TouchableOpacity>
      )}
      {readinessState.kind === "loading" && <Text style={styles.muted}>جاري التحقق…</Text>}
      {readinessState.kind === "success" && c.readinessViewModel && (
        <View style={[styles.readinessBanner, { borderColor: c.readinessViewModel.allGatesPassed ? "#bbf7d0" : "#fecaca" }]}>
          <Text style={{ fontWeight: "700", color: c.readinessViewModel.allGatesPassed ? "#15803d" : "#dc2626" }}>
            {c.readinessViewModel.allGatesPassed ? "✓ ملفك مكتمل وجاهز" : "ملفك يحتاج استكمالاً"}
          </Text>
          {c.readinessViewModel.items.map((item) => (
            <View key={item.label} style={styles.checkRow}>
              <Text style={{ color: item.satisfied ? "#15803d" : "#dc2626", width: 18, textAlign: "center" }}>
                {item.satisfied ? "✓" : "✗"}
              </Text>
              <Text style={[styles.checkLabel, { color: item.satisfied ? "#374151" : "#dc2626" }]}>{item.label}</Text>
            </View>
          ))}
        </View>
      )}

      <View style={styles.infoBox}>
        <Text style={styles.infoText}>
          لا يمكن للشريك تفعيل نفسه — التفعيل حصري من قِبَل قسم الشركاء في لوحة التحكم.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8f9fa" },
  content: { padding: 16, gap: 16 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 },
  pageTitle: { fontSize: 20, fontWeight: "700", textAlign: "right", color: "#111" },
  subtitle: { fontSize: 14, color: "#6b7280", textAlign: "right", lineHeight: 22 },
  section: { backgroundColor: "#fff", borderRadius: 12, padding: 14, borderWidth: 1, borderColor: "#e5e7eb", gap: 8 },
  sectionTitle: { fontSize: 15, fontWeight: "700", color: "#111", textAlign: "right", marginBottom: 4 },
  requirementRow: { flexDirection: "row-reverse", alignItems: "center", gap: 10, paddingVertical: 4 },
  bullet: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#1d4ed8" },
  requirementText: { fontSize: 14, color: "#374151" },
  stepRow: { flexDirection: "row-reverse", gap: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#f3f4f6" },
  stepNum: { width: 28, height: 28, borderRadius: 14, backgroundColor: "#eff6ff", justifyContent: "center", alignItems: "center" },
  stepNumText: { fontSize: 13, fontWeight: "700", color: "#1d4ed8" },
  stepLabel: { fontSize: 14, fontWeight: "600", color: "#111", textAlign: "right" },
  stepDesc: { fontSize: 13, color: "#6b7280", textAlign: "right", lineHeight: 18, marginTop: 2 },
  loadBtn: { backgroundColor: "#1d4ed8", padding: 14, borderRadius: 10, alignItems: "center" },
  loadBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  readinessBanner: { backgroundColor: "#fff", borderRadius: 12, padding: 14, borderWidth: 1, gap: 8 },
  checkRow: { flexDirection: "row-reverse", alignItems: "center", gap: 8 },
  checkLabel: { fontSize: 14, flex: 1, textAlign: "right" },
  infoBox: { backgroundColor: "#fef3c7", borderRadius: 10, padding: 14 },
  infoText: { fontSize: 13, color: "#92400e", textAlign: "right", lineHeight: 20 },
  muted: { color: "#9ca3af", fontSize: 13, textAlign: "right" },
  error: { color: "#dc2626", fontSize: 14, textAlign: "right" },
  retryBtn: { marginTop: 12, padding: 10, borderRadius: 8, borderWidth: 1, borderColor: "#d1d5db" },
  retryText: { color: "#374151", fontSize: 14 },
});
