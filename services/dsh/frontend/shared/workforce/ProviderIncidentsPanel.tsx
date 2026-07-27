import React from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";
import { Badge, Icon, StateView, Text, colorRoles, spacing } from "@bthwani/ui-kit";
import {
  listOwnProviderIncidents,
  submitOwnProviderIncidentAppeal,
} from "./workforce-me-operational.api";
import type { ProviderIncident } from "./workforce.types";

function amountLabel(minorUnits: number, currency: string): string {
  return `${(minorUnits / 100).toLocaleString("ar-YE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
}

function statusLabel(status: string): string {
  const labels: Record<string, string> = {
    reported: "مسجلة",
    under_review: "تحت المراجعة",
    provider_notified: "تم إشعار مقدم الخدمة",
    appeal_window: "متاحة للاعتراض",
    approved: "معتمدة",
    rejected: "مرفوضة",
    financial_action_posted: "رُحّل الإجراء المالي",
    closed: "مغلقة",
    reversed: "معكوسة",
  };
  return labels[status] ?? status;
}

function statusTone(status: string): "neutral" | "success" | "warning" | "danger" {
  if (status === "rejected" || status === "reversed") return "success";
  if (status === "approved" || status === "financial_action_posted" || status === "closed") return "danger";
  if (status === "under_review" || status === "appeal_window" || status === "provider_notified") return "warning";
  return "neutral";
}

function isAppealable(status: string): boolean {
  return status === "provider_notified" || status === "appeal_window" || status === "approved";
}

export function ProviderIncidentsPanel() {
  const [incidents, setIncidents] = React.useState<readonly ProviderIncident[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [appealId, setAppealId] = React.useState<string | null>(null);
  const [appealNote, setAppealNote] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setIncidents(await listOwnProviderIncidents());
    } catch {
      setError("تعذر تحميل المخالفات والخصومات.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => { void load(); }, [load]);

  const submitAppeal = async (incidentId: string) => {
    if (appealNote.trim().length < 3) {
      setError("اكتب سبب اعتراض واضحًا.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const updated = await submitOwnProviderIncidentAppeal(incidentId, appealNote.trim());
      setIncidents((current) => current.map((incident) => incident.id === updated.id ? updated : incident));
      setAppealId(null);
      setAppealNote("");
    } catch {
      setError("تعذر إرسال الاعتراض أو انتهت فترة الاعتراض.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text role="titleSm" style={styles.rtl}>المخالفات والخصومات</Text>
          <Text role="bodySm" tone="muted" style={styles.rtl}>
            لا يظهر أي خصم دون قضية ومرجع ودليل. القيد المالي النهائي يظهر في دفتر WLT بعد اعتماده.
          </Text>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="تحديث المخالفات" onPress={() => void load()} style={styles.iconButton}>
          <Icon name="refresh-outline" size={21} tone="brand" />
        </Pressable>
      </View>

      {error ? <StateView tone="danger" title="تعذر تنفيذ الإجراء" description={error} /> : null}
      {loading ? (
        <Text role="bodySm" tone="muted" style={styles.rtl}>جارٍ التحميل…</Text>
      ) : incidents.length === 0 ? (
        <StateView tone="neutral" title="لا توجد مخالفات" description="لا توجد قضايا أو خصومات مسجلة على حسابك." />
      ) : (
        <View style={styles.list}>
          {incidents.map((incident) => (
            <View key={incident.id} style={styles.card}>
              <View style={styles.rowBetween}>
                <Badge label={statusLabel(incident.status)} tone={statusTone(incident.status)} />
                <Text role="bodyStrong" style={styles.rtl}>{incident.incidentCode}</Text>
              </View>
              <Text role="bodySm" style={styles.rtl}>{incident.description}</Text>
              <View style={styles.rowBetween}>
                <Text role="caption" tone="muted">{new Date(incident.createdAt).toLocaleString("ar-YE")}</Text>
                <Text role="bodyStrong" tone={incident.proposedPenaltyMinorUnits > 0 ? "danger" : "muted"}>
                  {incident.proposedPenaltyMinorUnits > 0
                    ? amountLabel(incident.proposedPenaltyMinorUnits, incident.currency)
                    : "دون خصم مالي"}
                </Text>
              </View>
              {incident.sourceId ? <Text role="caption" tone="muted" style={styles.rtl}>المرجع: {incident.sourceType}/{incident.sourceId}</Text> : null}
              {incident.policyId ? <Text role="caption" tone="muted" style={styles.rtl}>السياسة: {incident.policyId}</Text> : null}
              {incident.wltLedgerReference ? <Text role="caption" tone="muted" style={styles.rtl}>قيد WLT: {incident.wltLedgerReference}</Text> : null}
              {incident.resolutionNote ? <Text role="bodySm" tone="muted" style={styles.rtl}>القرار: {incident.resolutionNote}</Text> : null}
              {incident.appealNote ? <Text role="bodySm" tone="warning" style={styles.rtl}>اعتراضك: {incident.appealNote}</Text> : null}

              {isAppealable(incident.status) && !incident.appealNote ? (
                appealId === incident.id ? (
                  <View style={styles.appealBox}>
                    <TextInput
                      value={appealNote}
                      onChangeText={setAppealNote}
                      placeholder="اكتب سبب الاعتراض والأدلة المتاحة"
                      placeholderTextColor={colorRoles.textMuted}
                      multiline
                      maxLength={1000}
                      style={styles.input}
                      textAlign="right"
                    />
                    <View style={styles.actions}>
                      <Pressable disabled={busy} onPress={() => void submitAppeal(incident.id)} style={[styles.primaryButton, busy && styles.disabled]}>
                        <Text role="bodyStrong" style={styles.primaryLabel}>{busy ? "جارٍ الإرسال…" : "إرسال الاعتراض"}</Text>
                      </Pressable>
                      <Pressable disabled={busy} onPress={() => { setAppealId(null); setAppealNote(""); }} style={styles.secondaryButton}>
                        <Text role="bodySm">إلغاء</Text>
                      </Pressable>
                    </View>
                  </View>
                ) : (
                  <Pressable onPress={() => setAppealId(incident.id)} style={styles.secondaryButton}>
                    <Text role="bodyStrong">اعتراض على القرار</Text>
                  </Pressable>
                )
              ) : null}
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: spacing[3] },
  header: { flexDirection: "row-reverse", alignItems: "center", gap: spacing[3] },
  headerText: { flex: 1, alignItems: "flex-end", gap: spacing[1] },
  rtl: { textAlign: "right" },
  iconButton: { width: 42, height: 42, alignItems: "center", justifyContent: "center" },
  list: { gap: spacing[3] },
  card: { borderWidth: 1, borderColor: colorRoles.borderSubtle, borderRadius: 14, backgroundColor: colorRoles.surfaceMuted, padding: spacing[3], gap: spacing[2] },
  rowBetween: { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", gap: spacing[2] },
  appealBox: { gap: spacing[2] },
  input: { minHeight: 84, borderWidth: 1, borderColor: colorRoles.borderSubtle, borderRadius: 12, padding: spacing[3], backgroundColor: colorRoles.surfaceBase, color: colorRoles.textPrimary, textAlignVertical: "top" },
  actions: { flexDirection: "row-reverse", gap: spacing[2] },
  primaryButton: { flex: 1, minHeight: 44, borderRadius: 10, backgroundColor: colorRoles.brandAction, alignItems: "center", justifyContent: "center" },
  primaryLabel: { color: colorRoles.surfaceBase },
  secondaryButton: { minHeight: 44, borderWidth: 1, borderColor: colorRoles.borderSubtle, borderRadius: 10, paddingHorizontal: spacing[3], alignItems: "center", justifyContent: "center" },
  disabled: { opacity: 0.5 },
});

export default ProviderIncidentsPanel;
