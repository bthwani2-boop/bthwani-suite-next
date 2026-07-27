import React from "react";
import { StyleSheet, View } from "react-native";
import { useIdentitySession } from "@bthwani/core-identity";
import {
  Button,
  Card,
  Header,
  InlineNotice,
  ScrollScreen,
  StateView,
  Text,
  TextField,
  Chip,
  spacing,
  IconButton,
  Icon,
} from "@bthwani/ui-kit";
import {
  useFieldEscalationSubmissionController,
  ESCALATION_SEVERITY_LABELS,
  ESCALATION_CATEGORY_LABELS,
  type DshEscalationSeverity,
  type DshEscalationCategory,
} from "../../shared/field-readiness";
import { DshFieldReferenceTag } from "../components/DshFieldReferenceTag";

type Props = {
  readonly storeId: string;
  readonly visitId?: string;
  readonly onBack?: () => void;
};

const SEVERITIES: readonly DshEscalationSeverity[] = ["low", "medium", "high", "critical"];
const CATEGORIES: readonly DshEscalationCategory[] = [
  "document_missing",
  "safety_violation",
  "location_mismatch",
  "product_compliance",
  "equipment_failure",
  "other",
];

export function DshFieldEscalationScreen({ storeId, visitId, onBack }: Props) {
  const identity = useIdentitySession();
  const { actionState, raiseEscalation, resetAction } = useFieldEscalationSubmissionController();
  const [severity, setSeverity] = React.useState<DshEscalationSeverity>("medium");
  const [category, setCategory] = React.useState<DshEscalationCategory>("document_missing");
  const [description, setDescription] = React.useState("");

  if (identity.state.kind !== "authenticated") {
    return (
      <StateView
        tone="danger"
        title="تسجيل الدخول مطلوب"
        description="لا يمكن إنشاء تصعيد ميداني دون جلسة موظف ميداني موثقة."
        {...(onBack ? { actionLabel: "رجوع", onActionPress: onBack } : {})}
      />
    );
  }

  const canSubmit =
    description.trim().length >= 10 &&
    actionState.kind !== "submitting" &&
    actionState.kind !== "queued";

  function handleSubmit() {
    if (!canSubmit) return;
    void raiseEscalation(storeId, {
      ...(visitId !== undefined ? { visitId } : {}),
      severity,
      category,
      description: description.trim(),
    }).then((accepted) => {
      if (accepted) setDescription("");
    });
  }

  return (
    <ScrollScreen>
      <Header
        title="رفع تصعيد"
        subtitle="يُرسل التصعيد إلى فريق العمليات للمراجعة والحل"
        actions={onBack ? (
          <IconButton
            icon={<Icon name="arrow-back" mirrored />}
            accessibilityLabel="رجوع"
            tone="ghost"
            onPress={onBack}
          />
        ) : undefined}
      />

      {actionState.kind === "success" ? (
        <View style={{ marginBottom: spacing[3] }}>
          <InlineNotice
            tone="success"
            title="تم تسجيل التصعيد بنجاح"
            action={<Button label="إغلاق" tone="ghost" size="sm" onPress={resetAction} />}
          />
        </View>
      ) : null}

      {actionState.kind === "queued" ? (
        <View style={{ marginBottom: spacing[3] }}>
          <InlineNotice
            tone="info"
            title="تم الحفظ وسيُرسَل تلقائيًا"
            description={actionState.message}
            action={
              <View style={{ gap: spacing[2], alignItems: "flex-end" }}>
                <DshFieldReferenceTag label="رقم العملية" value={actionState.operationId} />
                <Button label="إغلاق" tone="ghost" size="sm" onPress={resetAction} />
              </View>
            }
          />
        </View>
      ) : null}

      {actionState.kind === "error" ? (
        <View style={{ marginBottom: spacing[3] }}>
          <InlineNotice
            tone="danger"
            title="تعذر رفع التصعيد"
            description={actionState.message}
            action={<Button label="إغلاق" tone="ghost" size="sm" onPress={resetAction} />}
          />
        </View>
      ) : null}

      <Card padding="$5" gap="$4">
        <View style={styles.section}>
          <Text role="bodyStrong" style={styles.label}>مستوى الخطورة</Text>
          <View style={styles.chips}>
            {SEVERITIES.map((item) => (
              <Chip
                key={item}
                label={ESCALATION_SEVERITY_LABELS[item]}
                selected={severity === item}
                onPress={() => setSeverity(item)}
              />
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text role="bodyStrong" style={styles.label}>نوع المشكلة</Text>
          <View style={styles.chips}>
            {CATEGORIES.map((item) => (
              <Chip
                key={item}
                label={ESCALATION_CATEGORY_LABELS[item]}
                selected={category === item}
                onPress={() => setCategory(item)}
              />
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <TextField
            label="وصف المشكلة"
            value={description}
            onChangeText={setDescription}
            placeholder="اشرح المشكلة بتفصيل كافٍ (10 أحرف كحد أدنى)"
            multiline
          />
        </View>

        <Button
          label={
            actionState.kind === "submitting"
              ? "جاري الإرسال…"
              : actionState.kind === "queued"
                ? "محفوظ للمزامنة"
                : "رفع التصعيد"
          }
          tone="danger"
          disabled={!canSubmit}
          onPress={handleSubmit}
        />
      </Card>
    </ScrollScreen>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing[2] },
  label: { textAlign: "right", marginBottom: 6 },
  chips: { flexDirection: "row-reverse", flexWrap: "wrap", gap: spacing[2] },
});
