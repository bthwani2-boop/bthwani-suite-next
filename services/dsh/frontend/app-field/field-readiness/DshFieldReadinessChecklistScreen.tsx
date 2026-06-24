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
  useFieldChecklistController,
  buildChecklistViewModel,
  CHECK_TYPE_LABELS,
  type DshFieldVisit,
  type DshCheckType,
  type DshCheckStatus,
} from "../../shared/field-readiness";

type Props = { readonly visit: DshFieldVisit };

export function DshFieldReadinessChecklistScreen({ visit }: Props) {
  const identity = useIdentitySession();
  const { checklistState, checkActionState, reload, submitCheck, resetCheckAction } =
    useFieldChecklistController(visit.id, identity.state.kind);
  const [activeCheck, setActiveCheck] = React.useState<DshCheckType | null>(null);
  const [evidenceUrl, setEvidenceUrl] = React.useState("");
  const [notes, setNotes] = React.useState("");

  if (identity.state.kind !== "authenticated") return null;
  if (checklistState.kind === "loading") return <StateView title="جاري تحميل قائمة التحقق…" />;
  if (checklistState.kind === "error") {
    return (
      <StateView
        title="تعذر تحميل قائمة التحقق"
        description={checklistState.message}
        actionLabel="إعادة المحاولة"
        onActionPress={() => void reload()}
      />
    );
  }

  const checks = checklistState.kind === "success" ? checklistState.checks : [];
  const vm = buildChecklistViewModel(visit, checks);

  function handleSubmitCheck(checkType: DshCheckType, status: DshCheckStatus) {
    void submitCheck({ checkType, status, evidenceUrl: evidenceUrl.trim(), notes: notes.trim() }).then(() => {
      setActiveCheck(null);
      setEvidenceUrl("");
      setNotes("");
    });
  }

  return (
    <ScrollScreen>
      <Header
        title="قائمة التحقق الميداني"
        subtitle={`${vm.passedCount} / ${vm.totalCount} اكتمل`}
        actions={<Badge label={vm.allPassed ? "مكتمل" : `${vm.totalCount - vm.passedCount} متبقٍ`} tone={vm.allPassed ? "success" : "warning"} />}
      />

      {checkActionState.kind === "error" && (
        <Card>
          <View style={styles.notice}>
            <Text tone="danger">{checkActionState.message}</Text>
            <Button label="إغلاق" tone="ghost" onPress={resetCheckAction} />
          </View>
        </Card>
      )}

      {vm.checks.map((item) => (
        <Card key={item.checkType}>
          <View style={styles.checkRow}>
            <View style={styles.checkInfo}>
              <Text role="titleSm">{item.label}</Text>
              {item.notes.length > 0 && <Text role="caption" tone="muted">{item.notes}</Text>}
            </View>
            <View style={styles.checkActions}>
              <Badge
                label={item.status === "passed" ? "اجتاز" : item.status === "failed" ? "فشل" : "معلق"}
                tone={item.status === "passed" ? "success" : item.status === "failed" ? "danger" : "neutral"}
              />
              {visit.status === "in_progress" && (
                <Button label="تسجيل" tone="ghost" onPress={() => setActiveCheck(item.checkType)} />
              )}
            </View>
          </View>

          {activeCheck === item.checkType && (
            <View style={styles.checkForm}>
              <TextField label="رابط الدليل (اختياري)" value={evidenceUrl} onChangeText={setEvidenceUrl} placeholder="https://..." />
              <TextField label="ملاحظات" value={notes} onChangeText={setNotes} placeholder="وصف الفحص" multiline />
              <View style={styles.formActions}>
                <Button label="اجتاز" tone="success" disabled={checkActionState.kind === "submitting"} onPress={() => handleSubmitCheck(item.checkType, "passed")} />
                <Button label="فشل" tone="danger" disabled={checkActionState.kind === "submitting"} onPress={() => handleSubmitCheck(item.checkType, "failed")} />
                <Button label="إلغاء" tone="ghost" onPress={() => setActiveCheck(null)} />
              </View>
            </View>
          )}
        </Card>
      ))}

      {vm.blockers.length > 0 && (
        <Card>
          <View style={styles.notice}>
            <Text role="titleSm" tone="warning">بنود غير مكتملة</Text>
            {vm.blockers.map((b) => <Text key={b} role="caption" tone="muted">• {CHECK_TYPE_LABELS[b]}</Text>)}
          </View>
        </Card>
      )}
    </ScrollScreen>
  );
}

const styles = StyleSheet.create({
  notice: { padding: spacing[3], gap: spacing[1] },
  checkRow: { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", padding: spacing[3] },
  checkInfo: { flex: 1, gap: spacing[1] },
  checkActions: { flexDirection: "row-reverse", alignItems: "center", gap: spacing[2] },
  checkForm: { padding: spacing[3], gap: spacing[2], borderTopWidth: StyleSheet.hairlineWidth },
  formActions: { flexDirection: "row-reverse", gap: spacing[2] },
});
