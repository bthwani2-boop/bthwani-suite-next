import React from "react";
import { StyleSheet, View } from "react-native";
import { useIdentitySession } from "@bthwani/core-identity";
import {
  Badge,
  Button,
  Card,
  ListItem,
  ScrollScreen,
  StateView,
  Text,
  TextField,
  spacing,
} from "@bthwani/ui-kit";
import { AuthLoginCard } from "../../shared/auth/AuthLoginCard";
import {
  toStoreRoleStatePresentation,
  useStoreRoleContextController,
} from "../../shared/store";
import { useFieldVerificationController } from "../../shared/field-readiness";

type Props = {
  readonly storeId: string;
  readonly visitId: string;
};

export function DshFieldStoreVerificationScreen({ storeId, visitId }: Props) {
  const identity = useIdentitySession();
  const controller = useStoreRoleContextController("field", identity.state.kind, storeId);
  const verification = useFieldVerificationController(storeId, visitId, identity.state.kind);
  const [notes, setNotes] = React.useState("");
  const state = controller.state;

  if (identity.state.kind !== "authenticated") {
    return (
      <ScrollScreen>
        <AuthLoginCard
          title="تسجيل دخول الموظف الميداني"
          subtitle="ستظهر فقط مهمة المتجر المرتبطة بهويتك."
          loading={identity.state.kind === "authenticating"}
          {...(identity.state.kind === "error" ? { error: identity.state.message } : {})}
          onSubmit={(username, password) => void identity.login(username, password)}
        />
      </ScrollScreen>
    );
  }

  if (state.kind !== "success") {
    const { retryable, ...presentation } = toStoreRoleStatePresentation(state, {
      loading: "جاري تحميل سياق المتجر",
      empty: "لا يوجد متجر للتحقق",
      error: "تعذر تحميل التحقق الميداني",
    });
    return (
      <StateView
        {...presentation}
        {...(retryable
          ? { actionLabel: "إعادة المحاولة", onActionPress: controller.retry }
          : {})}
      />
    );
  }

  if (verification.state.kind === "loading" || verification.state.kind === "idle") {
    return <StateView title="جاري تحميل زيارة التحقق…" />;
  }

  if (verification.state.kind === "error") {
    return (
      <StateView
        title="تعذر تحميل زيارة التحقق"
        description={verification.state.message}
        actionLabel="إعادة المحاولة"
        onActionPress={() => void verification.reload()}
      />
    );
  }

  const field = controller.experience?.field;
  if (!field) return null;
  const visit = verification.state.visit;
  return (
    <ScrollScreen>
      <Card>
        <View style={styles.hero}>
          <View style={{ flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center" }}>
            <Text role="titleLg">{field.store.displayName}</Text>
            <Badge
              label={`${field.readinessPercent}% مكتمل`}
              tone={field.attentionChecks.length === 0 ? "success" : "warning"}
            />
          </View>
          <Text tone="secondary" style={{ textAlign: "right" }}>
            {field.store.cityCode} / {field.store.serviceAreaCode}
          </Text>
          <View style={styles.badges}>
            <Badge label={field.verificationSummary} tone={field.attentionChecks.length === 0 ? "success" : "warning"} />
            <Badge label={field.store.isVisible ? "ظاهر للعملاء" : "غير ظاهر"} tone={field.store.isVisible ? "info" : "neutral"} />
          </View>
        </View>
      </Card>

      <Text role="titleMd">رفع نتيجة التحقق</Text>
      <Card>
        <View style={styles.cardContent}>
          <TextField
            label="ملاحظات التحقق"
            value={notes}
            onChangeText={setNotes}
            placeholder="صف الأدلة والنتيجة الميدانية"
            multiline
          />
          {visit.status !== "complete" && (
            <Text tone="secondary">أكمل الزيارة وقائمة الفحص قبل اعتماد التحقق النهائي.</Text>
          )}
          <View style={styles.actions}>
            <Button
              label="اعتماد التحقق"
              tone="success"
              disabled={
                notes.trim().length < 3 ||
                controller.actionState.kind === "submitting" ||
                !verification.state.canVerify
              }
              onPress={() => void controller.submit({
                kind: "field",
                storeId: field.store.id,
                input: {
                  expectedVersion: field.store.version,
                  visitId: visit.id,
                  outcome: "verified",
                  evidenceStatus: "complete",
                  notes: notes.trim(),
                },
              })}
            />
            <Button
              label="يحتاج متابعة"
              tone="secondary"
              disabled={notes.trim().length < 3 || controller.actionState.kind === "submitting"}
              onPress={() => void controller.submit({
                kind: "field",
                storeId: field.store.id,
                input: {
                  expectedVersion: field.store.version,
                  visitId: visit.id,
                  outcome: "needs_follow_up",
                  evidenceStatus: "partial",
                  notes: notes.trim(),
                },
              })}
            />
          </View>
          {controller.actionState.kind === "submitting" && (
            <Text tone="secondary">جاري رفع نتيجة التحقق وربطها بالمهمة…</Text>
          )}
          {controller.actionState.kind === "success" && (
            <Text tone="success">
              {controller.actionState.replayed
                ? "تم تأكيد نتيجة التحقق السابقة دون إنشاء سجل مكرر."
                : "تم تسجيل نتيجة التحقق وربطها بهويتك."}
            </Text>
          )}
          {(controller.actionState.kind === "error" || controller.actionState.kind === "conflict") && (
            <Text tone="danger">{controller.actionState.message}</Text>
          )}
        </View>
      </Card>

      <View style={styles.metrics}>
        <Card>
          <View style={styles.metric}>
            <Text role="titleLg">{field.checks.length - field.attentionChecks.length}</Text>
            <Text role="caption" tone="muted">أدلة مثبتة</Text>
          </View>
        </Card>
        <Card>
          <View style={styles.metric}>
            <Text role="titleLg">{field.attentionChecks.length}</Text>
            <Text role="caption" tone="muted">ملاحظات مفتوحة</Text>
          </View>
        </Card>
      </View>

      <Text role="titleMd">قائمة التحقق</Text>
      <Card>
        {field.checks.map((check) => (
          <ListItem
            key={check.id}
            title={check.label}
            subtitle={check.detail}
            trailing={<Badge label={check.ready ? "مثبت" : "ناقص"} tone={check.ready ? "success" : "warning"} />}
          />
        ))}
      </Card>

      <Card>
        <View style={styles.cardContent}>
          <Text role="titleSm">توصية التحقق</Text>
          <Text tone="secondary">{field.recommendation}</Text>
          <Text role="caption" tone="muted">
            رفع الوثائق والاعتماد الميداني الفعلي يظل ضمن Field Verification بعد اعتماده.
          </Text>
        </View>
      </Card>
    </ScrollScreen>
  );
}

// export default FieldStoreVerificationScreen; // Unused default export
const styles = StyleSheet.create({
  cardContent: {
    padding: spacing[4],
    gap: spacing[2],
  },
  hero: {
    padding: spacing[4],
    gap: spacing[2],
  },
  badges: {
    flexDirection: "row-reverse",
    flexWrap: "wrap",
    gap: spacing[2],
  },
  metrics: {
    flexDirection: "row-reverse",
    gap: spacing[3],
  },
  metric: {
    minWidth: 128,
    padding: spacing[4],
    alignItems: "center",
    gap: spacing[1],
  },
  actions: {
    flexDirection: "row-reverse",
    flexWrap: "wrap",
    gap: spacing[2],
  },
});
