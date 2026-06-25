import React from "react";
import { StyleSheet, View } from "react-native";
import {
  Badge,
  Button,
  Card,
  Header,
  ListItem,
  LoadingState,
  ScrollScreen,
  StateView,
  Text,
  TextField,
  spacing,
} from "@bthwani/ui-kit";
import { AuthLoginCard } from "../../shared/auth/AuthLoginCard";
import { useIdentitySession } from "@bthwani/core-identity";
import { devBypassLogin } from "@bthwani/core-identity";
import {
  nextDeliveryStatus,
  toDispatchCardViewModel,
  useCaptainDeliveryController,
} from "../../shared/dispatch";
import type { DshDispatchAssignment } from "../../shared/dispatch";

function CaptainAssignmentCard({
  assignment,
  submitting,
  onAccept,
  onDecline,
  onAdvance,
  onSubmitProof,
}: {
  readonly assignment: DshDispatchAssignment;
  readonly submitting: boolean;
  readonly onAccept: (assignmentId: string) => void;
  readonly onDecline: (assignmentId: string, reason: string) => void;
  readonly onAdvance: (assignment: DshDispatchAssignment) => void;
  readonly onSubmitProof: (assignmentId: string, reference: string) => void;
}) {
  const vm = toDispatchCardViewModel(assignment);
  const [reason, setReason] = React.useState("");
  const [proof, setProof] = React.useState("");
  const next = nextDeliveryStatus(assignment.delivery.status);

  return (
    <Card>
      <View style={styles.card}>
        <View style={styles.row}>
          <View style={styles.titleBlock}>
            <Text role="titleMd">{vm.orderLabel}</Text>
            <Text tone="secondary">{vm.nextActionLabel}</Text>
          </View>
          <Badge label={vm.deliveryLabel} tone={assignment.delivery.status === "delivered" ? "success" : "info"} />
        </View>

        <ListItem title="حالة المهمة" subtitle={vm.assignmentLabel} />
        <ListItem title="الكابتن" subtitle={vm.captainLabel} />
        <ListItem title="إثبات التسليم" subtitle={vm.proofLabel} />

        <View style={styles.timeline}>
          {vm.timeline.map((step) => (
            <Badge key={step.id} label={step.label} tone={step.complete ? "success" : "neutral"} />
          ))}
        </View>

        {assignment.status === "offered" && (
          <View style={styles.stack}>
            <TextField
              label="سبب الرفض عند الحاجة"
              value={reason}
              onChangeText={setReason}
              placeholder="اختياري"
            />
            <View style={styles.actions}>
              <Button label="قبول المهمة" tone="success" disabled={submitting} onPress={() => onAccept(assignment.id)} />
              <Button label="رفض المهمة" tone="danger" disabled={submitting} onPress={() => onDecline(assignment.id, reason)} />
            </View>
          </View>
        )}

        {assignment.status === "accepted" && next && (
          <Button
            label={vm.nextActionLabel}
            tone="primary"
            disabled={submitting}
            onPress={() => onAdvance(assignment)}
          />
        )}

        {assignment.status === "accepted" && assignment.delivery.status === "arrived_customer" && (
          <View style={styles.stack}>
            <TextField
              label="رمز أو مرجع إثبات التسليم"
              value={proof}
              onChangeText={setProof}
              placeholder="مثال: OTP-1234"
            />
            <Button
              label="رفع إثبات التسليم"
              tone="success"
              disabled={submitting || proof.trim().length < 2}
              onPress={() => onSubmitProof(assignment.id, proof.trim())}
            />
          </View>
        )}
      </View>
    </Card>
  );
}

export function DshCaptainOrdersScreen() {
  const identity = useIdentitySession();
  const controller = useCaptainDeliveryController();

  if (identity.state.kind !== "authenticated") {
    return (
      <ScrollScreen>
        <Header title="مهام الكابتن" subtitle="تسجيل الدخول مطلوب لعرض مهام التوصيل" />
        <AuthLoginCard
          title="دخول الكابتن"
          subtitle="بعد الدخول ستظهر المهام المعيّنة لحسابك فقط."
          loading={identity.state.kind === "authenticating"}
          {...(identity.state.kind === "error" ? { error: identity.state.message } : {})}
          onSubmit={(username, password) => void identity.login(username, password)}
          onDevBypass={() => devBypassLogin("captain")}
        />
      </ScrollScreen>
    );
  }

  if (controller.state.kind === "loading") {
    return <LoadingState title="جاري تحميل مهام التوصيل..." />;
  }

  if (controller.state.kind === "error") {
    return (
      <StateView
        tone="danger"
        title="تعذر تحميل مهام الكابتن"
        description={controller.state.message}
        actionLabel="إعادة المحاولة"
        onActionPress={controller.reload}
      />
    );
  }

  if (controller.state.kind === "empty") {
    return (
      <StateView
        tone="neutral"
        title="لا توجد مهام نشطة"
        description="ستظهر هنا مهام التوصيل بعد تعيينها من غرفة الإرسال."
        actionLabel="تحديث"
        onActionPress={controller.reload}
      />
    );
  }

  if (controller.state.kind !== "success") return null;

  return (
    <ScrollScreen>
      <Header
        title="مهام التوصيل"
        subtitle="قبول المهمة، الاستلام، الوصول، وإثبات التسليم"
        actions={<Badge label={`${controller.state.assignments.length} مهمة`} tone="info" />}
      />
      {controller.actionState.kind === "error" && (
        <StateView tone="danger" title="تعذر تنفيذ الإجراء" description={controller.actionState.message} />
      )}
      {controller.actionState.kind === "success" && (
        <StateView tone="success" title="تم تحديث المهمة" description="تم حفظ انتقال دورة التوصيل." />
      )}
      {controller.state.assignments.map((assignment) => (
        <CaptainAssignmentCard
          key={assignment.id}
          assignment={assignment}
          submitting={controller.actionState.kind === "submitting"}
          onAccept={(assignmentId) => void controller.accept(assignmentId)}
          onDecline={(assignmentId, reason) => void controller.decline(assignmentId, reason)}
          onAdvance={(item) => void controller.advance(item.id, item.delivery.status)}
          onSubmitProof={(assignmentId, reference) => void controller.submitProof(assignmentId, {
            method: "code",
            reference,
          })}
        />
      ))}
    </ScrollScreen>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: spacing[4],
    gap: spacing[3],
  },
  row: {
    flexDirection: "row-reverse",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing[3],
  },
  titleBlock: {
    flex: 1,
    gap: spacing[1],
  },
  timeline: {
    flexDirection: "row-reverse",
    flexWrap: "wrap",
    gap: spacing[2],
  },
  stack: {
    gap: spacing[2],
  },
  actions: {
    flexDirection: "row-reverse",
    flexWrap: "wrap",
    gap: spacing[2],
  },
});

export default DshCaptainOrdersScreen;
