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
      visitId,
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
        <Card>
          <View style={styles.notice}>
            <Text tone="success">تم رفع التصعيد بنجاح وسيُراجع قريباً</Text>
            <Button label="إغلاق" tone="ghost" onPress={resetAction} />
          </View>
        </Card>
      )}

      {actionState.kind === "error" && (
        <Card>
          <View style={styles.notice}>
            <Text tone="danger">{actionState.message}</Text>
            <Button label="إغلاق" tone="ghost" onPress={resetAction} />
          </View>
        </Card>
      )}

      <Card>
        <View style={styles.section}>
          <Text role="titleSm">مستوى الخطورة</Text>
          <View style={styles.chips}>
            {SEVERITIES.map((s) => (
              <Button
                key={s}
                label={ESCALATION_SEVERITY_LABELS[s]}
                tone={severity === s ? "primary" : "ghost"}
                onPress={() => setSeverity(s)}
              />
            ))}
          </View>
        </View>
      </Card>

      <Card>
        <View style={styles.section}>
          <Text role="titleSm">نوع المشكلة</Text>
          <View style={styles.chips}>
            {CATEGORIES.map((c) => (
              <Button
                key={c}
                label={ESCALATION_CATEGORY_LABELS[c]}
                tone={category === c ? "primary" : "ghost"}
                onPress={() => setCategory(c)}
              />
            ))}
          </View>
        </View>
      </Card>

      <Card>
        <View style={styles.section}>
          <TextField
            label="وصف المشكلة"
            value={description}
            onChangeText={setDescription}
            placeholder="اشرح المشكلة بتفصيل كافٍ (10 أحرف كحد أدنى)"
            multiline
          />
          <Button
            label={actionState.kind === "submitting" ? "جاري الإرسال…" : "رفع التصعيد"}
            tone="danger"
            disabled={!canSubmit}
            onPress={handleSubmit}
          />
        </View>
      </Card>
    </ScrollScreen>
  );
}

const styles = StyleSheet.create({
  notice: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
    padding: spacing[3],
  },
  section: {
    padding: spacing[4],
    gap: spacing[3],
  },
  chips: {
    flexDirection: "row-reverse",
    flexWrap: "wrap",
    gap: spacing[2],
  },
});
