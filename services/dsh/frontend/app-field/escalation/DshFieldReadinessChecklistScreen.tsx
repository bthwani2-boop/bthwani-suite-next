import React from "react";
import { StyleSheet, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useIdentitySession } from "@bthwani/core-identity";
import {
  Badge,
  Button,
  Card,
  Header,
  InlineNotice,
  ScrollScreen,
  StateView,
  Text,
  TextField,
  spacing,
} from "@bthwani/ui-kit";
import {
  useFieldChecklistController,
  buildChecklistViewModel,
  VISIT_STATUS_LABELS,
  classifyGovernedError,
  type DshCheckType,
  type DshCheckStatus,
  type GovernedProblem,
} from "../../shared/field-readiness";
import { uploadFieldStoreMedia } from "../../shared/media";
import { DshFieldReferenceTag } from "../components/DshFieldReferenceTag";
import {
  DshFieldProblemNotice,
  DshFieldProblemState,
} from "../components/DshFieldProblemNotice";

type Props = {
  readonly storeId: string;
  readonly visitId: string;
  readonly onBack: () => void;
};

export function DshFieldReadinessChecklistScreen({ storeId, visitId, onBack }: Props) {
  const identity = useIdentitySession();
  const { checklistState, checkActionState, reload, submitCheck, resetCheckAction } =
    useFieldChecklistController(storeId, visitId, identity.state.kind);
  const [activeCheck, setActiveCheck] = React.useState<DshCheckType | null>(null);
  const [evidenceUrl, setEvidenceUrl] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [uploadingEvidence, setUploadingEvidence] = React.useState(false);
  const [uploadProblem, setUploadProblem] = React.useState<GovernedProblem | null>(null);

  if (identity.state.kind !== "authenticated") {
    return (
      <StateView
        tone="danger"
        title="تسجيل الدخول مطلوب"
        description="يجب تسجيل دخول الموظف الميداني قبل قراءة أو تعديل قائمة التحقق."
        actionLabel="رجوع"
        onActionPress={onBack}
      />
    );
  }
  if (checklistState.kind === "idle" || checklistState.kind === "loading") {
    return <StateView loading title="جاري تحميل قائمة التحقق…" />;
  }
  if (checklistState.kind === "error") {
    return (
      <DshFieldProblemState
        problem={checklistState.problem}
        handlers={{ refresh_record: () => void reload(), refresh_scope: () => void reload() }}
        onRetry={() => void reload()}
      />
    );
  }

  const { visit, checks } = checklistState;
  const vm = buildChecklistViewModel(visit, checks);
  const editable = visit.status === "in_progress";

  async function pickEvidence(source: "camera" | "library") {
    if (!activeCheck || !editable) return;
    setUploadingEvidence(true);
    setUploadProblem(null);
    try {
      const permission = source === "camera"
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setUploadProblem(classifyGovernedError({ code: "MEDIA_PERMISSION_DENIED" }));
        return;
      }
      const result = source === "camera"
        ? await ImagePicker.launchCameraAsync({ quality: 0.8 })
        : await ImagePicker.launchImageLibraryAsync({ quality: 0.8 });
      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];
      const mediaRef = await uploadFieldStoreMedia(storeId, {
        uri: asset.uri,
        name: asset.fileName ?? `${activeCheck}-evidence.jpg`,
        mimeType: asset.mimeType ?? "image/jpeg",
      });
      if (!mediaRef.trim()) {
        setUploadProblem(classifyGovernedError({ code: "MEDIA_UPLOAD_FAILED" }));
        return;
      }
      setEvidenceUrl(mediaRef.trim());
    } catch (error) {
      setUploadProblem(classifyGovernedError(error));
    } finally {
      setUploadingEvidence(false);
    }
  }

  function handleSubmitCheck(checkType: DshCheckType, status: DshCheckStatus) {
    void submitCheck({
      checkType,
      status,
      evidenceUrl: evidenceUrl.trim(),
      notes: notes.trim(),
    }).then((accepted) => {
      if (!accepted) return;
      setActiveCheck(null);
      setEvidenceUrl("");
      setNotes("");
      setUploadProblem(null);
    });
  }

  function startEditingCheck(item: { checkType: DshCheckType; evidenceUrl: string; notes: string }) {
    if (!editable) return;
    setActiveCheck(item.checkType);
    setEvidenceUrl(item.evidenceUrl);
    setNotes(item.notes);
    setUploadProblem(null);
  }

  return (
    <View style={{ flex: 1 }}>
      <Header title="قائمة الجاهزية" subtitle={VISIT_STATUS_LABELS[visit.status]} onBack={onBack} />
      <ScrollScreen>
      <Card padding="$4" style={styles.summaryCard}>
        <View style={styles.summaryRow}>
          <View>
            <Text role="titleMd" style={styles.rtl}>تقدم الجاهزية</Text>
            <Text role="bodySm" tone="secondary" style={styles.rtl}>
              {`${vm.passedCount} من أصل ${vm.totalCount} متطلب تم التحقق منها`}
            </Text>
          </View>
          <Badge
            label={vm.allPassed ? "مكتمل" : `${vm.totalCount - vm.passedCount} متبقٍ`}
            tone={vm.allPassed ? "success" : "warning"}
          />
        </View>
        {!editable ? (
          <Text role="caption" tone="muted" style={styles.rtl}>
            الزيارة {VISIT_STATUS_LABELS[visit.status]}؛ القائمة للقراءة فقط ولا تقبل تعديلات جديدة.
          </Text>
        ) : null}
      </Card>

      {checkActionState.kind === "error" ? (
        <DshFieldProblemNotice
          problem={checkActionState.problem}
          handlers={{
            refresh_record: () => void reload(),
            refresh_scope: () => void reload(),
          }}
          onRetry={() => void reload()}
          onDismiss={resetCheckAction}
        />
      ) : null}

      {checkActionState.kind === "queued" ? (
        <InlineNotice
          tone="info"
          title="تم حفظ الفحص وسيُزامَن تلقائيًا"
          description={checkActionState.message}
          action={
            <View style={{ gap: spacing[2], alignItems: "flex-end" }}>
              <DshFieldReferenceTag label="رقم العملية" value={checkActionState.operationId} />
              <Button label="إغلاق" tone="ghost" onPress={resetCheckAction} />
            </View>
          }
        />
      ) : null}

      {vm.checks.map((item) => (
        <Card key={item.checkType}>
          <View style={styles.checkRow}>
            <View style={styles.checkInfo}>
              <Text role="titleSm">{item.label}</Text>
              {item.notes.length > 0 ? <Text role="caption" tone="muted">{item.notes}</Text> : null}
            </View>
            <View style={styles.checkActions}>
              <Badge
                label={item.status === "passed" ? "اجتاز" : item.status === "failed" ? "فشل" : "معلق"}
                tone={item.status === "passed" ? "success" : item.status === "failed" ? "danger" : "neutral"}
              />
              {editable ? <Button label="تسجيل" tone="ghost" onPress={() => startEditingCheck(item)} /> : null}
            </View>
          </View>

          {activeCheck === item.checkType && editable ? (
            <View style={styles.checkForm}>
              <Text role="caption" tone={evidenceUrl ? "success" : "muted"} style={styles.rtl}>
                {evidenceUrl ? "تم إرفاق الدليل ✓" : "لم يُرفع دليل بعد."}
              </Text>
              <View style={styles.formActions}>
                <Button
                  label={uploadingEvidence ? "جارٍ الرفع…" : "التقاط دليل"}
                  tone="secondary"
                  disabled={uploadingEvidence}
                  onPress={() => void pickEvidence("camera")}
                />
                <Button
                  label="اختيار من المعرض"
                  tone="ghost"
                  disabled={uploadingEvidence}
                  onPress={() => void pickEvidence("library")}
                />
              </View>
              {uploadProblem ? (
                <DshFieldProblemNotice
                  problem={uploadProblem}
                  onRetry={() => void pickEvidence("camera")}
                  onDismiss={() => setUploadProblem(null)}
                />
              ) : null}
              <TextField label="ملاحظات" value={notes} onChangeText={setNotes} placeholder="وصف الفحص" multiline />
              <View style={styles.formActions}>
                <Button
                  label="اجتاز"
                  tone="success"
                  disabled={checkActionState.kind === "submitting" || evidenceUrl.trim().length === 0}
                  onPress={() => handleSubmitCheck(item.checkType, "passed")}
                />
                <Button
                  label="فشل"
                  tone="danger"
                  disabled={checkActionState.kind === "submitting" || notes.trim().length === 0}
                  onPress={() => handleSubmitCheck(item.checkType, "failed")}
                />
                <Button label="إلغاء" tone="ghost" onPress={() => setActiveCheck(null)} />
              </View>
            </View>
          ) : null}
        </Card>
      ))}

      {vm.blockers.length > 0 ? (
        <Card>
          <View style={styles.notice}>
            <Text role="titleSm" tone="warning">بنود غير مكتملة</Text>
            {vm.blockers.map((blocker) => (
              <Text key={blocker.checkType} role="caption" tone="muted">• {blocker.label}</Text>
            ))}
          </View>
        </Card>
      ) : null}
      </ScrollScreen>
    </View>
  );
}

const styles = StyleSheet.create({
  summaryCard: { marginBottom: spacing[2] },
  summaryRow: { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center" },
  rtl: { textAlign: "right" },
  notice: { padding: spacing[3], gap: spacing[1] },
  checkRow: { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", padding: spacing[3] },
  checkInfo: { flex: 1, gap: spacing[1] },
  checkActions: { flexDirection: "row-reverse", alignItems: "center", gap: spacing[2] },
  checkForm: { padding: spacing[3], gap: spacing[2], borderTopWidth: StyleSheet.hairlineWidth },
  formActions: { flexDirection: "row-reverse", gap: spacing[2] },
});
