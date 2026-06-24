import React from "react";
import { StyleSheet, View } from "react-native";
import { useIdentitySession } from "@bthwani/app-shell";
import {
  Badge,
  Button,
  Card,
  Header,
  ScrollScreen,
  StateView,
  Text,
  TextField,
  spacing,
} from "@bthwani/ui-kit";
import {
  useFieldEscalationController,
  ESCALATION_SEVERITY_LABELS,
  ESCALATION_CATEGORY_LABELS,
  type DshEscalationStatus,
} from "../../../shared/field-readiness";

export function FieldReadinessQueueScreen() {
  const identity = useIdentitySession();
  const { listState, actionState, loadOperatorEscalations, resolveEscalation, resetAction } =
    useFieldEscalationController(identity.state.kind);
  const [activeFilter, setActiveFilter] = React.useState<DshEscalationStatus | "">("");
  const [resolveId, setResolveId] = React.useState<string | null>(null);
  const [resolutionNote, setResolutionNote] = React.useState("");

  if (identity.state.kind !== "authenticated") {
    return <StateView title="تسجيل الدخول مطلوب" description="هذه الشاشة للمشغّلين فقط." />;
  }

  const FILTERS: Array<{ label: string; value: DshEscalationStatus | "" }> = [
    { label: "الكل", value: "" },
    { label: "مفتوح", value: "open" },
    { label: "قيد المراجعة", value: "acknowledged" },
    { label: "محلول", value: "resolved" },
  ];

  function handleResolve(id: string) {
    void resolveEscalation(id, { status: "resolved", resolutionNote: resolutionNote.trim() }).then(() => {
      setResolveId(null);
      setResolutionNote("");
      void loadOperatorEscalations(activeFilter || undefined);
    });
  }

  function handleAcknowledge(id: string) {
    void resolveEscalation(id, { status: "acknowledged" }).then(() => {
      void loadOperatorEscalations(activeFilter || undefined);
    });
  }

  return (
    <ScrollScreen>
      <Header title="قائمة تصعيدات التحقق الميداني" subtitle="راجع التصعيدات الواردة من الموظفين الميدانيين وتخذ إجراءاً" />

      {actionState.kind === "error" && (
        <Card><View style={styles.notice}><Text tone="danger">{actionState.message}</Text><Button label="إغلاق" tone="ghost" onPress={resetAction} /></View></Card>
      )}

      <Card>
        <View style={styles.filters}>
          {FILTERS.map((f) => (
            <Button key={f.value} label={f.label} tone={activeFilter === f.value ? "primary" : "ghost"} onPress={() => {
              setActiveFilter(f.value);
              void loadOperatorEscalations(f.value || undefined);
            }} />
          ))}
        </View>
      </Card>

      {listState.kind === "loading" && <StateView title="جاري تحميل التصعيدات…" />}
      {listState.kind === "error" && <StateView title="تعذر التحميل" description={listState.message} actionLabel="إعادة المحاولة" onActionPress={() => void loadOperatorEscalations(activeFilter || undefined)} />}
      {listState.kind === "empty" && <StateView title="لا توجد تصعيدات" description="لا توجد تصعيدات بالفلتر الحالي." />}

      {listState.kind === "success" &&
        listState.escalations.map((esc) => (
          <Card key={esc.id}>
            <View style={styles.escalationHeader}>
              <View style={styles.escalationMeta}>
                <Text role="titleSm">{ESCALATION_CATEGORY_LABELS[esc.category]}</Text>
                <Text role="caption" tone="muted">متجر: {esc.storeId}</Text>
                <Text role="caption" tone="muted">{esc.createdAt}</Text>
              </View>
              <View style={styles.badges}>
                <Badge label={ESCALATION_SEVERITY_LABELS[esc.severity]} tone={esc.severity === "critical" ? "danger" : esc.severity === "high" ? "warning" : "neutral"} />
                <Badge label={esc.status === "resolved" ? "محلول" : esc.status === "acknowledged" ? "قيد المراجعة" : "مفتوح"} tone={esc.status === "resolved" ? "success" : esc.status === "acknowledged" ? "info" : "warning"} />
              </View>
            </View>
            <View style={styles.description}><Text tone="secondary">{esc.description}</Text></View>
            {esc.status !== "resolved" && (
              <View style={styles.actions}>
                {esc.status === "open" && <Button label="تأكيد الاستلام" tone="secondary" disabled={actionState.kind === "submitting"} onPress={() => handleAcknowledge(esc.id)} />}
                <Button label="حل التصعيد" tone="success" onPress={() => setResolveId(resolveId === esc.id ? null : esc.id)} />
              </View>
            )}
            {resolveId === esc.id && (
              <View style={styles.resolveForm}>
                <TextField label="ملاحظة الحل" value={resolutionNote} onChangeText={setResolutionNote} placeholder="صف الإجراء المتخذ" multiline />
                <View style={styles.formActions}>
                  <Button label={actionState.kind === "submitting" ? "جاري الحفظ…" : "تأكيد الحل"} tone="success" disabled={resolutionNote.trim().length < 5 || actionState.kind === "submitting"} onPress={() => handleResolve(esc.id)} />
                  <Button label="إلغاء" tone="ghost" onPress={() => setResolveId(null)} />
                </View>
              </View>
            )}
          </Card>
        ))}
    </ScrollScreen>
  );
}

const styles = StyleSheet.create({
  notice: { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", padding: spacing[3] },
  filters: { flexDirection: "row-reverse", flexWrap: "wrap", gap: spacing[2], padding: spacing[3] },
  escalationHeader: { flexDirection: "row-reverse", justifyContent: "space-between", padding: spacing[3] },
  escalationMeta: { flex: 1, gap: spacing[1] },
  badges: { flexDirection: "row-reverse", gap: spacing[2], flexWrap: "wrap" },
  description: { paddingHorizontal: spacing[3], paddingBottom: spacing[3] },
  actions: { flexDirection: "row-reverse", gap: spacing[2], paddingHorizontal: spacing[3], paddingBottom: spacing[3] },
  resolveForm: { padding: spacing[3], gap: spacing[2], borderTopWidth: StyleSheet.hairlineWidth },
  formActions: { flexDirection: "row-reverse", gap: spacing[2] },
});
