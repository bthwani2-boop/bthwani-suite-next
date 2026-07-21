import React from "react";
import { StyleSheet, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useIdentitySession } from "@bthwani/core-identity";
import {
  Badge,
  Button,
  Card,
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
  type DshCheckType,
  type DshCheckStatus,
} from "../../shared/field-readiness";
import { uploadFieldStoreMedia } from "../../shared/media";

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
  const [uploadError, setUploadError] = React.useState<string | null>(null);

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
      <StateView
        tone="danger"
        title="تعذر تحميل قائمة التحقق"
        description={checklistState.message}
        actionLabel="إعادة المحاولة"
        onActionPress={() => void reload()}
      />
    );
  }

  const { visit, checks } = checklistState;
  const vm = buildChecklistViewModel(visit, checks);
  const editable = visit.status === "in_progress";

  async function pickEvidence(source: "camera" | "library") {
    if (!activeCheck || !editable) return;
    setUploadingEvidence(true);
    setUploadError(null);
    try {
      const permission = source === "camera"
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setUploadError("لم تُمنح صلاحية الوصول المطلوبة لرفع الدليل.");
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
      if (!mediaRef.trim()) throw new Error("لم يُرجع مزود الوسائط مرجع دليل صالحًا.");
      setEvidenceUrl(mediaRef.trim());
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : String(error));
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
      setUploadError(null);
    });
  }

  function startEditingCheck(item: { checkType: DshCheckType; evidenceUrl: string; notes: string }) {
    if (!editable) return;
    setActiveCheck(item.checkType);
    setEvidenceUrl(item.evidenceUrl);
    setNotes(item.notes);
    setUploadError(null);
  }

  return (
    <ScrollScreen>
      <View style={styles.topActions}>
        <Button label="رجوع" tone="ghost" size="sm" fullWidth={false} onPress={onBack} />
      </View>

      <Card padding="$4" style={{ marginBottom: spacing[2] }}>
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
            الزيارة حالتها {visit.status}؛ القائمة للقراءة فقط ولا تقبل تعديلات جديدة.
          </Text>
        ) : null}
      </Card>

      {checkActionState.kind === "error" ? (
        <Card>
          <View style={styles.notice}>
            <Text tone="danger">{checkActionState.message}</Text>
            <Button label="إغلاق" tone="ghost" onPress={resetCheckAction} />
          </View>
        </Card>
      ) : null}

      {checkActionState.kind === "queued" ? (
        <Card>
          <View style={styles.notice}>
            <Text tone="warning">{checkActionState.message}</Text>
            <Text role="caption" tone="muted">المرجع المحلي: {checkActionState.operationId}</Text>
            <Button label="إغلاق" tone="ghost" onPress={resetCheckAction} />
          </View>
        </Card>
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
                {evidenceUrl ? `تم رفع الدليل: ${evidenceUrl}` : "لم يُرفع دليل بعد."}
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
              {uploadError ? <Text role="caption" tone="danger" style={styles.rtl}>{uploadError}</Text> : null}
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
              <Text key={blocker} role="caption" tone="muted">• {CHECK_TYPE_LABELS[blocker]}</Text>
            ))}
          </View>
        </Card>
      ) : null}
    </ScrollScreen>
  );
}

const styles = StyleSheet.create({
  topActions: { alignItems: "flex-start", marginBottom: spacing[2] },
  summaryRow: { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center" },
  rtl: { textAlign: "right" },
  notice: { padding: spacing[3], gap: spacing[1] },
  checkRow: { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", padding: spacing[3] },
  checkInfo: { flex: 1, gap: spacing[1] },
  checkActions: { flexDirection: "row-reverse", alignItems: "center", gap: spacing[2] },
  checkForm: { padding: spacing[3], gap: spacing[2], borderTopWidth: StyleSheet.hairlineWidth },
  formActions: { flexDirection: "row-reverse", gap: spacing[2] },
});
