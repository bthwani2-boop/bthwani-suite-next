import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from "react-native";
import { usePartnerSelfController } from "../../shared/partner";
import { getPartnerActivationStatusLabel, getPartnerStateMetadata } from "../../shared/partner";

export function PartnerActivationStatusScreen() {
  const { selfState, readinessState, loadReadiness, retry } = usePartnerSelfController();

  if (selfState.kind === "idle" || selfState.kind === "loading") {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>جاري التحميل…</Text>
      </View>
    );
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

  const { vm } = selfState;
  const meta = getPartnerStateMetadata(vm.activationStatus);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>{vm.displayName}</Text>
        <View style={[styles.badge, { backgroundColor: statusBg(vm.activationStatus) }]}>
          <Text style={[styles.badgeText, { color: statusFg(vm.activationStatus) }]}>
            {getPartnerActivationStatusLabel(vm.activationStatus)}
          </Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>الإجراء التالي</Text>
        <Text style={styles.cardBody}>{vm.nextAction}</Text>
      </View>

      {vm.blockedReason ? (
        <View style={[styles.card, styles.warnCard]}>
          <Text style={styles.warnText}>{vm.blockedReason}</Text>
        </View>
      ) : null}

      <View style={styles.card}>
        <Text style={styles.cardTitle}>ما يمكنك رؤيته</Text>
        {[
          { label: "مرئي للعملاء", value: vm.isClientVisible },
          { label: "يمكن التفعيل الذاتي", value: false },
        ].map(({ label, value }) => (
          <View key={label} style={styles.checkRow}>
            <Text style={[styles.checkMark, { color: value ? "#15803d" : "#dc2626" }]}>{value ? "✓" : "✗"}</Text>
            <Text style={styles.checkLabel}>{label}</Text>
          </View>
        ))}
      </View>

      {meta.visibleToPartner && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>تحقق الجاهزية</Text>
          {readinessState.kind === "idle" && (
            <TouchableOpacity style={styles.loadBtn} onPress={loadReadiness}>
              <Text style={styles.loadBtnText}>تحميل تفاصيل الجاهزية</Text>
            </TouchableOpacity>
          )}
          {readinessState.kind === "loading" && <Text style={styles.muted}>جاري التحميل…</Text>}
          {readinessState.kind === "error" && <Text style={styles.error}>{readinessState.message}</Text>}
          {readinessState.kind === "success" && (
            <View>
              <View style={[styles.readinessBanner, { backgroundColor: readinessState.vm.canActivate ? "#f0fdf4" : "#fef2f2" }]}>
                <Text style={{ color: readinessState.vm.canActivate ? "#15803d" : "#dc2626", fontWeight: "600" }}>
                  {readinessState.vm.canActivate ? "✓ جاهز للتفعيل" : "غير جاهز بعد"}
                </Text>
                {readinessState.vm.blockedReason ? (
                  <Text style={styles.muted}>{readinessState.vm.blockedReason}</Text>
                ) : null}
              </View>
              {readinessState.vm.checklist.map((item) => (
                <View key={item.label} style={styles.checkRow}>
                  <Text style={[styles.checkMark, { color: item.satisfied ? "#15803d" : "#dc2626" }]}>
                    {item.satisfied ? "✓" : "✗"}
                  </Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.checkLabel}>{item.label}</Text>
                    {!item.satisfied && item.blockedReason ? (
                      <Text style={styles.muted}>{item.blockedReason}</Text>
                    ) : null}
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      )}

      <View style={styles.notice}>
        <Text style={styles.noticeText}>
          التفعيل يتم فقط من خلال قسم الشركاء في لوحة التحكم بعد مراجعة ملفك واستيفاء جميع المتطلبات.
        </Text>
      </View>
    </ScrollView>
  );
}

function statusBg(s: string): string {
  if (s === "partner_active" || s === "client_visible") return "#f0fdf4";
  if (s === "partner_deactivated" || s === "ops_rejected") return "#fef2f2";
  if (s === "draft") return "#f3f4f6";
  return "#eff6ff";
}

function statusFg(s: string): string {
  if (s === "partner_active" || s === "client_visible") return "#15803d";
  if (s === "partner_deactivated" || s === "ops_rejected") return "#dc2626";
  if (s === "draft") return "#6b7280";
  return "#1d4ed8";
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8f9fa" },
  content: { padding: 16, gap: 12 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 },
  header: { padding: 16, backgroundColor: "#fff", borderRadius: 12, gap: 8, borderWidth: 1, borderColor: "#e5e7eb" },
  title: { fontSize: 18, fontWeight: "700", textAlign: "right", color: "#111" },
  badge: { alignSelf: "flex-end", paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20 },
  badgeText: { fontSize: 13, fontWeight: "600" },
  card: { backgroundColor: "#fff", borderRadius: 12, padding: 16, borderWidth: 1, borderColor: "#e5e7eb" },
  cardTitle: { fontSize: 14, fontWeight: "600", color: "#6b7280", marginBottom: 8, textAlign: "right" },
  cardBody: { fontSize: 15, color: "#111", textAlign: "right" },
  warnCard: { backgroundColor: "#fff7ed", borderColor: "#fed7aa" },
  warnText: { color: "#c2410c", fontSize: 14, textAlign: "right" },
  checkRow: { flexDirection: "row-reverse", alignItems: "flex-start", gap: 8, paddingVertical: 6 },
  checkMark: { fontSize: 16, fontWeight: "700", width: 20, textAlign: "center" },
  checkLabel: { fontSize: 14, color: "#374151", textAlign: "right", flex: 1 },
  loadBtn: { backgroundColor: "#eff6ff", padding: 12, borderRadius: 8, alignItems: "center" },
  loadBtnText: { color: "#1d4ed8", fontWeight: "600" },
  readinessBanner: { padding: 12, borderRadius: 8, marginBottom: 8, gap: 4 },
  notice: { padding: 14, backgroundColor: "#f9fafb", borderRadius: 8, borderWidth: 1, borderColor: "#e5e7eb" },
  noticeText: { fontSize: 13, color: "#6b7280", textAlign: "right", lineHeight: 20 },
  muted: { fontSize: 13, color: "#9ca3af", textAlign: "right" },
  error: { color: "#dc2626", fontSize: 14, textAlign: "right" },
  retryBtn: { marginTop: 12, padding: 10, borderRadius: 8, borderWidth: 1, borderColor: "#d1d5db" },
  retryText: { color: "#374151", fontSize: 14 },
});
