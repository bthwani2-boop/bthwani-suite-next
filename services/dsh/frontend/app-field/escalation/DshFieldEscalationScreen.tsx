import React from "react";
import { StyleSheet, View } from "react-native";
import { useIdentitySession } from "@bthwani/core-identity";
import {
  Badge,
  Button,
  Card,
  Header,
  ScrollScreen,
  StateView,
  Text,
  TextField,
  Chip,
  spacing,
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
};

export function DshFieldEscalationScreen({ storeId, visitId }: Props) {
  const identity = useIdentitySession();
  const { actionState, raiseEscalation, resetAction } = useFieldEscalationController();
  const [severity, setSeverity] = React.useState<DshEscalationSeverity>("medium");
  const [category, setCategory] = React.useState<DshEscalationCategory>("document_missing");
  const [description, setDescription] = React.useState("");

  if (identity.state.kind !== "authenticated") return null;

  const canSubmit = description.trim().length >= 10 && actionState.kind !== "submitting";

  function handleSubmit() {
    void raiseEscalation(storeId, {
      ...(visitId !== undefined ? { visitId } : {}),
      severity,
      category,
      description: description.trim(),
    }).then(() => {
      setDescription("");
    });
  }

  const SEVERITIES: DshEscalationSeverity[] = ["low", "medium", "high", "critical"];
  const CATEGORIES: DshEscalationCategory[] = [
    "document_missing",
    "safety_violation",
    "location_mismatch",
    "product_compliance",
    "equipment_failure",
    "other",
  ];

  return (
    <ScrollScreen>
      <Header
        title="رفع تصعيد"
        subtitle="يُرسل التصعيد إلى فريق العمليات للمراجعة والحل"
      />

      {actionState.kind === "success" && (
        <Card tone="success" padding="$3" style={{ marginBottom: spacing[3] }}>
          <View style={styles.notice}>
            <Text tone="success">تم رفع التصعيد بنجاح وسيُراجع قريباً</Text>
            <Button label="إغلاق" tone="ghost" size="sm" onPress={resetAction} />
          </View>
        </Card>
      )}

      {actionState.kind === "error" && (
        <Card tone="danger" padding="$3" style={{ marginBottom: spacing[3] }}>
          <View style={styles.notice}>
            <Text tone="danger">{actionState.message}</Text>
            <Button label="إغلاق" tone="ghost" size="sm" onPress={resetAction} />
          </View>
        </Card>
      )}

      <Card padding="$5" gap="$4">
        <View style={styles.section}>
          <Text role="bodyStrong" style={{ textAlign: "right", marginBottom: 6 }}>مستوى الخطورة</Text>
          <View style={styles.chips}>
            {SEVERITIES.map((s) => (
              <Chip
                key={s}
                label={ESCALATION_SEVERITY_LABELS[s]}
                selected={severity === s}
                onPress={() => setSeverity(s)}
              />
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text role="bodyStrong" style={{ textAlign: "right", marginBottom: 6 }}>نوع المشكلة</Text>
          <View style={styles.chips}>
            {CATEGORIES.map((c) => (
              <Chip
                key={c}
                label={ESCALATION_CATEGORY_LABELS[c]}
                selected={category === c}
                onPress={() => setCategory(c)}
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
          label={actionState.kind === "submitting" ? "جاري الإرسال…" : "رفع التصعيد"}
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
  },
  section: {
    gap: spacing[2],
  },
  chips: {
    flexDirection: "row-reverse",
    flexWrap: "wrap",
    gap: spacing[2],
  },
});
