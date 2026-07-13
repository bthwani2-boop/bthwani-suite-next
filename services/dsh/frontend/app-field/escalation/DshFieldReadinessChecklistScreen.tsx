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
  type DshFieldVisit,
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
    useFieldChecklistController(visitId, identity.state.kind);
  const [activeCheck, setActiveCheck] = React.useState<DshCheckType | null>(null);
  const [evidenceUrl, setEvidenceUrl] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [uploadingEvidence, setUploadingEvidence] = React.useState(false);

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

  const visit: DshFieldVisit = {
    id: visitId,
    storeId,
    fieldAgentId: '',
    visitType: 'onboarding',
    status: 'in_progress',
    notes: '',
    startedAt: '',
    createdAt: '',
    updatedAt: '',
  };

  const checks = checklistState.kind === "success" ? checklistState.checks : [];
  const vm = buildChecklistViewModel(visit, checks);

  async function pickEvidence(source: "camera" | "library") {
    if (!activeCheck) return;
    setUploadingEvidence(true);
    try {
      const permission = source === "camera"
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) return;
      const result = source === "camera"
        ? await ImagePicker.launchCameraAsync({ quality: 0.8 })
        : await ImagePicker.launchImageLibraryAsync({ quality: 0.8 });
      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];
      const mediaRef = await uploadFieldStoreMedia(storeId, {
        uri: asset.uri,
        name: asset.fileName ?? `${activeCheck}-${Date.now()}.jpg`,
        mimeType: asset.mimeType ?? "image/jpeg",
      });
      setEvidenceUrl(mediaRef);
    } finally {
      setUploadingEvidence(false);
    }
  }

  function handleSubmitCheck(checkType: DshCheckType, status: DshCheckStatus) {
    void submitCheck({ checkType, status, evidenceUrl: evidenceUrl.trim(), notes: notes.trim() }).then((success) => {
      if (success) {
        setActiveCheck(null);
        setEvidenceUrl("");
        setNotes("");
      }
    });
  }

  function startEditingCheck(item: { checkType: DshCheckType; evidenceUrl: string; notes: string }) {
    setActiveCheck(item.checkType);
    setEvidenceUrl(item.evidenceUrl);
    setNotes(item.notes);
  }

  return (
    <ScrollScreen>
      <Card padding="$4" style={{ marginBottom: spacing[2] }}>
        <View style={{ flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center" }}>
          <View>
            <Text role="titleMd" style={{ textAlign: "right" }}>تقدم الجاهزية</Text>
            <Text role="bodySm" tone="secondary" style={{ textAlign: "right" }}>
              {`${vm.passedCount} من أصل ${vm.totalCount} متطلب تم التحقق منها`}
            </Text>
          </View>
          <Badge
            label={vm.allPassed ? "مكتمل" : `${vm.totalCount - vm.passedCount} متبقٍ`}
            tone={vm.allPassed ? "success" : "warning"}
          />
        </View>
      </Card>

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
                <Button label="تسجيل" tone="ghost" onPress={() => startEditingCheck(item)} />
              )}
            </View>
          </View>

          {activeCheck === item.checkType && (
            <View style={styles.checkForm}>
              <TextField label="مرجع الدليل" value={evidenceUrl} onChangeText={setEvidenceUrl} placeholder="media_..." />
              <View style={styles.formActions}>
                <Button label={uploadingEvidence ? "جارٍ الرفع…" : "التقاط دليل"} tone="secondary" disabled={uploadingEvidence} onPress={() => void pickEvidence("camera")} />
                <Button label="اختيار من المعرض" tone="ghost" disabled={uploadingEvidence} onPress={() => void pickEvidence("library")} />
              </View>
              <TextField label="ملاحظات" value={notes} onChangeText={setNotes} placeholder="وصف الفحص" multiline />
              <View style={styles.formActions}>
                <Button label="اجتاز" tone="success" disabled={checkActionState.kind === "submitting" || evidenceUrl.trim().length === 0} onPress={() => handleSubmitCheck(item.checkType, "passed")} />
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
