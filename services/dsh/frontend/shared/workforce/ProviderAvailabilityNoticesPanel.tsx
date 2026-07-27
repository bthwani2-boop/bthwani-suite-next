import React from "react";
import { Pressable, TextInput, View } from "react-native";
import { DateTimeField, Icon, StateView, Text, colorRoles, formatDateTime, spacing } from "@bthwani/ui-kit";
import {
  createOwnAvailabilityNotice,
  listOwnAvailabilityNotices,
} from "./workforce-me-operational.api";
import type { ProviderAvailabilityNotice } from "./workforce.types";

const STATUS_LABEL: Record<ProviderAvailabilityNotice["status"], string> = {
  scheduled: "مجدول",
  active: "سارٍ الآن",
  completed: "انتهى",
  cancelled: "أُلغي",
};

/**
 * Deliberately minimal by design (not a missing feature): press "غير متوفر",
 * pick the time you'll be back, optionally add a note. No report-type taxonomy,
 * no free-text reason code, no raw ISO input — those existed for backend
 * bookkeeping, not because a field agent needs them.
 */
export function ProviderAvailabilityNoticesPanel(props: {
  readonly providerLabel: "الميداني" | "الكابتن";
  readonly hasActiveAssignment?: boolean;
}) {
  const [notices, setNotices] = React.useState<readonly ProviderAvailabilityNotice[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);
  const [reporting, setReporting] = React.useState(false);
  const [until, setUntil] = React.useState<Date | null>(null);
  const [note, setNote] = React.useState("");

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setNotices(await listOwnAvailabilityNotices());
    } catch {
      setError("تعذر تحميل بلاغات عدم التوفر.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => { void load(); }, [load]);

  const submit = async () => {
    if (!until) {
      setError("اختر الوقت الذي ستعود فيه متاحًا.");
      return;
    }
    const start = new Date();
    if (until.getTime() <= start.getTime()) {
      setError("يجب أن يكون وقت العودة بعد الآن.");
      return;
    }
    if (props.hasActiveAssignment) {
      setError("لديك مهمة نشطة. أكملها أولًا قبل تسجيل عدم التوفر.");
      return;
    }
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      const created = await createOwnAvailabilityNotice({
        noticeType: "immediate_unavailability",
        startsAt: start.toISOString(),
        endsAt: until.toISOString(),
        reasonCode: "personal",
        note: note.trim(),
      });
      setNotices((current) => [created, ...current]);
      setSuccess("تم تسجيل عدم توفرك. لن تصلك مهام جديدة حتى الوقت المحدد.");
      setNote(""); setUntil(null); setReporting(false);
    } catch {
      setError("تعذر تسجيل عدم التوفر.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.root}>
      <View style={styles.headerRow}>
        <View style={styles.headerText}>
          <Text role="titleSm" style={styles.rtl}>التوفر</Text>
          <Text role="bodySm" tone="muted" style={styles.rtl}>
            سجّل عدم توفرك مؤقتًا حتى لا تصلك مهام جديدة.
          </Text>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="تحديث" onPress={() => void load()} style={styles.iconButton}>
          <Icon name="refresh-outline" size={21} tone="brand" />
        </Pressable>
      </View>

      {reporting ? (
        <View style={styles.form}>
          <DateTimeField label="حتى متى ستكون غير متاح؟" value={until} onChange={setUntil} placeholder="اختر وقت العودة" />
          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder="ملاحظة اختيارية"
            multiline
            maxLength={300}
            style={styles.noteInput}
            textAlign="right"
          />
          {error ? <StateView tone="danger" title="تعذر تسجيل البلاغ" description={error} /> : null}
          <View style={styles.formActions}>
            <Pressable
              accessibilityRole="button"
              disabled={busy}
              onPress={() => void submit()}
              style={[styles.primaryButton, busy && styles.disabled]}
            >
              <Text role="bodyStrong" style={styles.primaryLabel}>{busy ? "جارٍ التسجيل…" : "تأكيد عدم التوفر"}</Text>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={() => { setReporting(false); setError(null); }} style={styles.cancelButton}>
              <Text role="bodyStrong">إلغاء</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <Pressable accessibilityRole="button" onPress={() => setReporting(true)} style={styles.declareButton}>
          <Icon name="pause-circle-outline" size={20} color={colorRoles.textInverse} />
          <Text role="bodyStrong" style={styles.declareLabel}>غير متوفر</Text>
        </Pressable>
      )}

      {success ? <StateView tone="success" title={success} /> : null}

      {loading ? null : notices.length === 0 ? null : (
        <View style={styles.list}>
          {notices.filter((n) => n.status === "scheduled" || n.status === "active").map((notice) => (
            <View key={notice.id} style={styles.noticeCard}>
              <View style={styles.noticeHeader}>
                <Text role="bodyStrong">{STATUS_LABEL[notice.status]}</Text>
                <Text role="caption" tone="muted">حتى {formatDateTime(notice.endsAt)}</Text>
              </View>
              {notice.note ? <Text role="bodySm" style={styles.rtl}>{notice.note}</Text> : null}
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = {
  root: { gap: spacing[3] },
  headerRow: { flexDirection: "row-reverse" as const, alignItems: "center" as const, gap: spacing[3] },
  headerText: { flex: 1, alignItems: "flex-end" as const, gap: spacing[1] },
  rtl: { textAlign: "right" as const },
  iconButton: { width: 42, height: 42, alignItems: "center" as const, justifyContent: "center" as const },
  declareButton: {
    flexDirection: "row-reverse" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: spacing[2],
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: colorRoles.warning,
  },
  declareLabel: { color: colorRoles.textInverse },
  form: { gap: spacing[3] },
  noteInput: {
    minHeight: 60,
    borderWidth: 1,
    borderColor: colorRoles.borderSubtle,
    borderRadius: 12,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    backgroundColor: colorRoles.surfaceMuted,
    color: colorRoles.textPrimary,
    textAlignVertical: "top" as const,
  },
  formActions: { flexDirection: "row-reverse" as const, gap: spacing[2] },
  primaryButton: { flex: 1, minHeight: 48, borderRadius: 12, backgroundColor: colorRoles.brandAction, alignItems: "center" as const, justifyContent: "center" as const },
  primaryLabel: { color: colorRoles.surfaceBase },
  cancelButton: { minHeight: 48, paddingHorizontal: spacing[4], borderRadius: 12, alignItems: "center" as const, justifyContent: "center" as const, borderWidth: 1, borderColor: colorRoles.borderSubtle },
  disabled: { opacity: 0.5 },
  list: { gap: spacing[2] },
  noticeCard: { borderWidth: 1, borderColor: colorRoles.borderSubtle, borderRadius: 12, padding: spacing[3], gap: spacing[2], backgroundColor: colorRoles.surfaceMuted },
  noticeHeader: { flexDirection: "row-reverse" as const, justifyContent: "space-between" as const, alignItems: "center" as const },
};

export default ProviderAvailabilityNoticesPanel;
