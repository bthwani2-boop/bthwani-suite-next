import React from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";
import { Icon, StateView, Text, colorRoles, spacing } from "@bthwani/ui-kit";
import {
  createOwnAvailabilityNotice,
  listOwnAvailabilityNotices,
} from "./workforce-me-operational.api";
import type { ProviderAvailabilityNotice } from "./workforce.types";

const TYPE_OPTIONS: ReadonlyArray<{
  readonly value: ProviderAvailabilityNotice["noticeType"];
  readonly label: string;
}> = [
  { value: "planned_unavailability", label: "عدم توفر مخطط" },
  { value: "immediate_unavailability", label: "عدم توفر فوري" },
  { value: "short_break", label: "توقف قصير" },
  { value: "emergency", label: "طارئ" },
  { value: "temporary_restriction", label: "تقييد مؤقت" },
];

function localInputDate(offsetHours: number): string {
  const date = new Date(Date.now() + offsetHours * 60 * 60 * 1000);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function parseLocalDate(value: string): string | null {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function noticeTypeLabel(value: ProviderAvailabilityNotice["noticeType"]): string {
  return TYPE_OPTIONS.find((option) => option.value === value)?.label ?? value;
}

export function ProviderAvailabilityNoticesPanel(props: {
  readonly providerLabel: "الميداني" | "الكابتن";
  readonly hasActiveAssignment?: boolean;
}) {
  const [notices, setNotices] = React.useState<readonly ProviderAvailabilityNotice[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);
  const [noticeType, setNoticeType] = React.useState<ProviderAvailabilityNotice["noticeType"]>("planned_unavailability");
  const [startsAt, setStartsAt] = React.useState(localInputDate(1));
  const [endsAt, setEndsAt] = React.useState(localInputDate(5));
  const [reasonCode, setReasonCode] = React.useState("personal");
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
    const start = parseLocalDate(startsAt);
    const end = parseLocalDate(endsAt);
    if (!start || !end || new Date(end).getTime() <= new Date(start).getTime()) {
      setError("أدخل فترة صحيحة، ويجب أن يكون وقت النهاية بعد البداية.");
      return;
    }
    if (props.hasActiveAssignment && (noticeType === "immediate_unavailability" || new Date(start).getTime() <= Date.now())) {
      setError("لديك مهمة نشطة. أكملها أو افتح استثناء تشغيليًا قبل بدء عدم التوفر الفوري.");
      return;
    }
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      const created = await createOwnAvailabilityNotice({
        noticeType,
        startsAt: start,
        endsAt: end,
        reasonCode: reasonCode.trim() || "personal",
        note: note.trim(),
      });
      setNotices((current) => [created, ...current]);
      setSuccess("تم تسجيل فترة عدم التوفر. لن تُعامل كوردية أو حضور وظيفي.");
      setNote("");
    } catch {
      setError("تعذر تسجيل فترة عدم التوفر.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.root}>
      <View style={styles.headerRow}>
        <View style={styles.headerText}>
          <Text role="titleSm" style={styles.rtl}>الإبلاغ عن عدم التوفر</Text>
          <Text role="bodySm" tone="muted" style={styles.rtl}>
            {props.providerLabel} مقدم خدمة مستقل. هذا بلاغ لتخطيط التغطية وليس طلب إجازة وظيفية أو تسجيل دوام.
          </Text>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="تحديث بلاغات عدم التوفر" onPress={() => void load()} style={styles.iconButton}>
          <Icon name="refresh-outline" size={21} tone="brand" />
        </Pressable>
      </View>

      <View style={styles.options}>
        {TYPE_OPTIONS.map((option) => (
          <Pressable
            key={option.value}
            accessibilityRole="radio"
            accessibilityState={{ selected: noticeType === option.value }}
            onPress={() => setNoticeType(option.value)}
            style={[styles.option, noticeType === option.value && styles.optionSelected]}
          >
            <Text role="bodySm" style={noticeType === option.value ? styles.selectedText : undefined}>{option.label}</Text>
          </Pressable>
        ))}
      </View>

      <Text role="caption" tone="muted" style={styles.rtl}>البداية بصيغة YYYY-MM-DDTHH:mm</Text>
      <TextInput value={startsAt} onChangeText={setStartsAt} placeholder="2026-07-27T10:00" style={styles.input} textAlign="right" autoCapitalize="none" />
      <Text role="caption" tone="muted" style={styles.rtl}>النهاية بصيغة YYYY-MM-DDTHH:mm</Text>
      <TextInput value={endsAt} onChangeText={setEndsAt} placeholder="2026-07-27T14:00" style={styles.input} textAlign="right" autoCapitalize="none" />
      <TextInput value={reasonCode} onChangeText={setReasonCode} placeholder="رمز السبب" style={styles.input} textAlign="right" />
      <TextInput value={note} onChangeText={setNote} placeholder="ملاحظة اختيارية" multiline maxLength={1000} style={[styles.input, styles.noteInput]} textAlign="right" />

      {error ? <StateView tone="danger" title="تعذر تسجيل البلاغ" description={error} /> : null}
      {success ? <StateView tone="success" title={success} /> : null}

      <Pressable accessibilityRole="button" disabled={busy} onPress={() => void submit()} style={[styles.primaryButton, busy && styles.disabled]}>
        <Text role="bodyStrong" style={styles.primaryLabel}>{busy ? "جارٍ التسجيل…" : "تسجيل عدم التوفر"}</Text>
      </Pressable>

      <View style={styles.divider} />
      <Text role="titleSm" style={styles.rtl}>السجل</Text>
      {loading ? (
        <Text role="bodySm" tone="muted" style={styles.rtl}>جارٍ التحميل…</Text>
      ) : notices.length === 0 ? (
        <StateView tone="neutral" title="لا توجد بلاغات" description="ستظهر الفترات المسجلة هنا." />
      ) : (
        <View style={styles.list}>
          {notices.map((notice) => (
            <View key={notice.id} style={styles.noticeCard}>
              <View style={styles.noticeHeader}>
                <Text role="bodyStrong">{noticeTypeLabel(notice.noticeType)}</Text>
                <Text role="caption" tone={notice.status === "active" ? "warning" : "muted"}>{notice.status}</Text>
              </View>
              <Text role="bodySm" tone="muted" style={styles.rtl}>
                من {new Date(notice.startsAt).toLocaleString("ar-YE")} إلى {new Date(notice.endsAt).toLocaleString("ar-YE")}
              </Text>
              {notice.note ? <Text role="bodySm" style={styles.rtl}>{notice.note}</Text> : null}
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: spacing[3] },
  headerRow: { flexDirection: "row-reverse", alignItems: "center", gap: spacing[3] },
  headerText: { flex: 1, alignItems: "flex-end", gap: spacing[1] },
  rtl: { textAlign: "right" },
  iconButton: { width: 42, height: 42, alignItems: "center", justifyContent: "center" },
  options: { flexDirection: "row-reverse", flexWrap: "wrap", gap: spacing[2] },
  option: {
    borderWidth: 1,
    borderColor: colorRoles.borderSubtle,
    borderRadius: 999,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    backgroundColor: colorRoles.surfaceBase,
  },
  optionSelected: { backgroundColor: colorRoles.brandAction, borderColor: colorRoles.brandAction },
  selectedText: { color: colorRoles.surfaceBase },
  input: {
    minHeight: 46,
    borderWidth: 1,
    borderColor: colorRoles.borderSubtle,
    borderRadius: 12,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    backgroundColor: colorRoles.surfaceMuted,
    color: colorRoles.textPrimary,
  },
  noteInput: { minHeight: 78, textAlignVertical: "top" },
  primaryButton: { minHeight: 48, borderRadius: 12, backgroundColor: colorRoles.brandAction, alignItems: "center", justifyContent: "center" },
  primaryLabel: { color: colorRoles.surfaceBase },
  disabled: { opacity: 0.5 },
  divider: { height: 1, backgroundColor: colorRoles.borderSubtle },
  list: { gap: spacing[2] },
  noticeCard: { borderWidth: 1, borderColor: colorRoles.borderSubtle, borderRadius: 12, padding: spacing[3], gap: spacing[2], backgroundColor: colorRoles.surfaceMuted },
  noticeHeader: { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center" },
});

export default ProviderAvailabilityNoticesPanel;
