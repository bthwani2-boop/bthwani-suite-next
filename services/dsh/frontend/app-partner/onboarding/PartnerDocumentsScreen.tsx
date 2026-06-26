import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from "react-native";
import { usePartnerSelfController } from "../../shared/partner";
import { DOCUMENT_TYPE_LABELS } from "../../shared/partner";

export function PartnerDocumentsScreen() {
  const { selfState, docsState, retry } = usePartnerSelfController({ autoLoadDocuments: true });

  if (selfState.kind === "idle" || selfState.kind === "loading") {
    return <View style={styles.center}><Text style={styles.muted}>جاري التحميل…</Text></View>;
  }
  if (selfState.kind === "error") {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{selfState.message}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={retry}>
          <Text style={styles.retryText}>إعادة المحاولة</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.pageTitle}>وثائقي</Text>

      {docsState.kind === "loading" && <Text style={styles.muted}>جاري تحميل الوثائق…</Text>}
      {docsState.kind === "error" && <Text style={styles.error}>{docsState.message}</Text>}

      {docsState.kind === "success" && docsState.docs.length === 0 && (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>لا توجد وثائق مرفوعة بعد</Text>
          <Text style={styles.muted}>يقوم الموظف الميداني برفع الوثائق عند زيارة موقعك</Text>
        </View>
      )}

      {docsState.kind === "success" && docsState.docs.map((doc) => (
        <View key={doc.id} style={styles.docCard}>
          <View style={styles.docHeader}>
            <Text style={styles.docType}>{doc.typeLabel}</Text>
            <View style={[styles.statusBadge, { backgroundColor: toneBg(doc.statusTone) }]}>
              <Text style={[styles.statusText, { color: toneFg(doc.statusTone) }]}>{doc.statusLabel}</Text>
            </View>
          </View>
          {doc.rejectionReason ? (
            <Text style={styles.rejection}>سبب الرفض: {doc.rejectionReason}</Text>
          ) : null}
          {doc.statusTone === "warning" && (
            <Text style={styles.resubmitHint}>يرجى التواصل مع الموظف الميداني لإعادة رفع هذه الوثيقة</Text>
          )}
        </View>
      ))}

      <View style={styles.infoBox}>
        <Text style={styles.infoTitle}>ملاحظة</Text>
        <Text style={styles.infoText}>
          رفع الوثائق يتم عبر الموظف الميداني فقط. إذا كانت هناك وثيقة تحتاج إعادة رفع، تواصل مع فريق الشركاء.
        </Text>
      </View>
    </ScrollView>
  );
}

function toneBg(tone: "success" | "danger" | "warning" | "neutral"): string {
  if (tone === "success") return "#f0fdf4";
  if (tone === "danger") return "#fef2f2";
  if (tone === "warning") return "#fff7ed";
  return "#f3f4f6";
}

function toneFg(tone: "success" | "danger" | "warning" | "neutral"): string {
  if (tone === "success") return "#15803d";
  if (tone === "danger") return "#dc2626";
  if (tone === "warning") return "#c2410c";
  return "#6b7280";
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8f9fa" },
  content: { padding: 16, gap: 12 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 },
  pageTitle: { fontSize: 20, fontWeight: "700", textAlign: "right", color: "#111", marginBottom: 4 },
  docCard: { backgroundColor: "#fff", borderRadius: 12, padding: 14, borderWidth: 1, borderColor: "#e5e7eb", gap: 6 },
  docHeader: { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center" },
  docType: { fontSize: 15, fontWeight: "600", color: "#111" },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  statusText: { fontSize: 12, fontWeight: "600" },
  rejection: { fontSize: 13, color: "#dc2626", textAlign: "right" },
  resubmitHint: { fontSize: 12, color: "#c2410c", textAlign: "right" },
  emptyCard: { backgroundColor: "#fff", borderRadius: 12, padding: 24, alignItems: "center", gap: 8, borderWidth: 1, borderColor: "#e5e7eb" },
  emptyText: { fontSize: 15, color: "#374151", fontWeight: "600" },
  infoBox: { backgroundColor: "#eff6ff", borderRadius: 10, padding: 14, gap: 6 },
  infoTitle: { fontSize: 13, fontWeight: "700", color: "#1d4ed8", textAlign: "right" },
  infoText: { fontSize: 13, color: "#1e40af", textAlign: "right", lineHeight: 20 },
  muted: { color: "#9ca3af", fontSize: 13, textAlign: "right" },
  error: { color: "#dc2626", fontSize: 14, textAlign: "right" },
  retryBtn: { marginTop: 12, padding: 10, borderRadius: 8, borderWidth: 1, borderColor: "#d1d5db" },
  retryText: { color: "#374151", fontSize: 14 },
});
