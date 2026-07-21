import React from "react";
import { StyleSheet, View } from "react-native";
import { useIdentitySession } from "@bthwani/core-identity";
import {
  Button,
  Card,
  Header,
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
  useFieldEscalationController,
  ESCALATION_SEVERITY_LABELS,
  ESCALATION_CATEGORY_LABELS,
  type DshEscalationSeverity,
  type DshEscalationCategory,
} from "../../shared/field-readiness";

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
  const { actionState, raiseEscalation, resetAction } = useFieldEscalationController(identity.state.kind);
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
        <Card tone="success" padding="$3" style={{ marginBottom: spacing[3] }}>
          <View style={styles.notice}>
            <Text tone="success">تم تسجيل التصعيد في DSH بنجاح.</Text>
            <Button label="إغلاق" tone="ghost" size="sm" onPress={resetAction} />
          </View>
        </Card>
      ) : null}

      {actionState.kind === "queued" ? (
        <Card tone="warning" padding="$3" style={{ marginBottom: spacing[3] }}>
          <View style={styles.notice}>
            <View style={styles.noticeText}>
              <Text tone="warning">{actionState.message}</Text>
              <Text role="caption" tone="muted">المرجع المحلي: {actionState.operationId}</Text>
            </View>
            <Button label="إغلاق" tone="ghost" size="sm" onPress={resetAction} />
          </View>
        </Card>
      ) : null}

      {actionState.kind === "error" ? (
        <Card tone="danger" padding="$3" style={{ marginBottom: spacing[3] }}>
          <View style={styles.notice}>
            <Text tone="danger">{actionState.message}</Text>
            <Button label="إغلاق" tone="ghost" size="sm" onPress={resetAction} />
          </View>
        </Card>
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
  notice: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
    padding: spacing[1],
    gap: spacing[2],
  },
  noticeText: { flex: 1, gap: spacing[1] },
  section: { gap: spacing[2] },
  label: { textAlign: "right", marginBottom: 6 },
  chips: { flexDirection: "row-reverse", flexWrap: "wrap", gap: spacing[2] },
});
