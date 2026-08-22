import React from "react";
import { Pressable, View } from "react-native";
import { Badge, Icon, Text, spacing, radius, colorRoles } from "@bthwani/ui-kit";
import type { FieldOnboardingAssignment } from "../../shared/field-assignment";

type Props = {
  readonly assignment: FieldOnboardingAssignment;
  readonly onPress?: () => void;
  readonly loading?: boolean;
};

const STATUS_LABELS: Record<FieldOnboardingAssignment["status"], string> = {
  assigned: "جديدة",
  in_progress: "قيد التنفيذ",
  draft_linked: "مرتبطة بالمسودة",
  cancelled: "ملغاة",
};

const ACTION_LABELS: Record<FieldOnboardingAssignment["status"], string> = {
  assigned: "فتح المهمة وبدء الإدخال",
  in_progress: "متابعة إدخال بيانات المتجر",
  draft_linked: "متابعة المسودة المرتبطة",
  cancelled: "هذه المهمة ملغاة",
};

function AssignmentStatusBadge({ status }: { readonly status: FieldOnboardingAssignment["status"] }) {
  return (
    <Badge
      label={STATUS_LABELS[status]}
      tone={status === "draft_linked" ? "success" : status === "cancelled" ? "neutral" : status === "in_progress" ? "warning" : "info"}
    />
  );
}

export function FieldOnboardingAssignmentCard({ assignment, onPress, loading = false }: Props) {
  const hasLocation = assignment.locationLatitude !== undefined && assignment.locationLongitude !== undefined;
  const hasContact = Boolean(assignment.phoneHint || assignment.addressHint);
  const actionable = Boolean(onPress) && assignment.status !== "cancelled";

  return (
    <Pressable
      onPress={onPress}
      disabled={!actionable || loading}
      accessibilityRole="button"
      accessibilityLabel={`${assignment.storeNameHint}، ${ACTION_LABELS[assignment.status]}`}
      style={({ pressed }) => ({ opacity: loading ? 0.62 : pressed ? 0.92 : 1 })}
    >
      <View
        style={{
          backgroundColor: colorRoles.surfaceBase,
          borderRadius: radius.lg,
          borderWidth: 1,
          borderColor: colorRoles.borderSubtle,
          padding: spacing[3],
          gap: spacing[2],
          shadowColor: colorRoles.brandStructure,
          shadowOpacity: 0.06,
          shadowOffset: { width: 0, height: 3 },
          shadowRadius: 10,
          elevation: 2,
        }}
      >
        <View style={{ flexDirection: "row-reverse", alignItems: "flex-start", gap: spacing[3] }}>
          <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: colorRoles.brandAction, alignItems: "center", justifyContent: "center" }}>
            <Icon name="storefront-outline" size={19} color={colorRoles.surfaceBase} />
          </View>
          <View style={{ flex: 1, alignItems: "flex-end", gap: spacing[1] }}>
            <Text role="caption" tone="muted" style={{ textAlign: "right" }}>مهمة إدخال متجر</Text>
            <Text role="bodyStrong" style={{ textAlign: "right", fontWeight: "bold" }} numberOfLines={2}>{assignment.storeNameHint}</Text>
          </View>
          <AssignmentStatusBadge status={assignment.status} />
        </View>

        <View style={{ gap: spacing[1] }}>
          {assignment.phoneHint ? (
            <View style={{ flexDirection: "row-reverse", alignItems: "center", gap: spacing[2] }}>
              <Icon name="call-outline" size={17} tone="muted" />
              <Text role="bodySm" tone="secondary" style={{ flex: 1, textAlign: "right" }}>{assignment.phoneHint}</Text>
            </View>
          ) : null}
          {assignment.addressHint ? (
            <View style={{ flexDirection: "row-reverse", alignItems: "flex-start", gap: spacing[2] }}>
              <Icon name="location-outline" size={17} tone="muted" />
              <Text role="bodySm" tone="secondary" style={{ flex: 1, textAlign: "right" }} numberOfLines={2}>{assignment.addressHint}</Text>
            </View>
          ) : null}
          {!hasContact ? <Text role="bodySm" tone="muted" style={{ textAlign: "right" }}>بيانات أولية قابلة للتصحيح</Text> : null}
        </View>

        <View style={{ flexDirection: "row-reverse", flexWrap: "wrap", gap: spacing[2], alignItems: "center" }}>
          <Badge label={hasLocation ? "الموقع مثبت" : "الموقع غير محدد"} tone={hasLocation ? "success" : "neutral"} />
          <Badge label={`أولوية ${assignment.priority}`} tone={assignment.overdue ? "danger" : "info"} />
          <Text role="caption" tone={assignment.overdue ? "danger" : "muted"}>{`SLA ${assignment.slaMinutes} دقيقة${assignment.overdue ? " · متأخرة" : ""}`}</Text>
          {actionable ? <Text role="bodySm" style={{ flex: 1, minWidth: 150, color: colorRoles.brandAction, textAlign: "right", fontWeight: "bold" }}>{loading ? "جارٍ فتح المهمة…" : ACTION_LABELS[assignment.status]}</Text> : null}
        </View>
      </View>
    </Pressable>
  );
}
