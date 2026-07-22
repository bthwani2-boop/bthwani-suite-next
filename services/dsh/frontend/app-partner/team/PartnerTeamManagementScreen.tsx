import React from "react";
import { StyleSheet, View } from "react-native";
import {
  Badge,
  Button,
  Card,
  ScrollScreen,
  StateView,
  Text,
  TextField,
  colorRoles,
  radius,
  spacing,
} from "@bthwani/ui-kit";
import { usePartnerFleetController } from "../../shared/partner";
import type { DshCourierConnectionStatus } from "../../shared/partner/partner-fleet.api";
import type { PartnerTeamMember } from "./partner-team.types";
import type { PartnerTeamMutationResult } from "./usePartnerTeamModel";

export type { PartnerTeamMember } from "./partner-team.types";
export type PartnerTeamSection = "members" | "invites" | "couriers";

export type PartnerTeamInlineAction =
  | "pause"
  | "activate"
  | "block"
  | "resend-invite"
  | "cancel-invite"
  | "audit-log"
  | string;

export function isPartnerTeamSectionSelected(current: PartnerTeamSection, target: PartnerTeamSection): boolean {
  return current === target;
}

export function selectPartnerTeamSection(id: PartnerTeamSection): PartnerTeamSection {
  return id;
}

type PartnerTeamManagementScreenProps = {
  readonly storeId: string;
  readonly storeName?: string;
  readonly branchLabel?: string;
  readonly members: readonly PartnerTeamMember[];
  readonly pendingInvites?: number;
  readonly isLoading?: boolean;
  readonly error?: string | null;
  readonly onRetry?: () => void;
  readonly onInviteMember: (identity: string) => Promise<PartnerTeamMutationResult>;
  readonly onMemberAction: (
    memberId: string,
    action: PartnerTeamInlineAction,
  ) => Promise<PartnerTeamMutationResult>;
  readonly onIssueCourierConnectionCode?: (member: PartnerTeamMember) => Promise<string | null>;
  readonly onRevokeCourierConnection?: (member: PartnerTeamMember) => Promise<boolean>;
};

type MutationState =
  | { readonly kind: "idle" }
  | { readonly kind: "submitting"; readonly target: string }
  | { readonly kind: "success"; readonly message: string }
  | { readonly kind: "error"; readonly message: string };

const sections: readonly { id: PartnerTeamSection; label: string }[] = [
  { id: "members", label: "الأعضاء" },
  { id: "invites", label: "الدعوات" },
  { id: "couriers", label: "الموصلون" },
];

function actionLabel(action: PartnerTeamInlineAction): string {
  switch (action) {
    case "pause": return "إيقاف مؤقت";
    case "activate": return "تفعيل";
    case "block": return "حظر";
    case "resend-invite": return "إعادة إرسال الدعوة";
    case "cancel-invite": return "إلغاء الدعوة";
    case "audit-log": return "سجل التدقيق";
    default: return action;
  }
}

function memberStatusTone(status: PartnerTeamMember["status"]): "success" | "warning" | "danger" | "neutral" {
  if (status === "active") return "success";
  if (status === "invited" || status === "review-needed") return "warning";
  if (status === "blocked") return "danger";
  return "neutral";
}

function connectionStatusLabel(status: DshCourierConnectionStatus): string {
  switch (status) {
    case "pending": return "رمز معلق";
    case "redeemed": return "تم الربط";
    case "revoked": return "مسحوب";
    case "expired": return "منتهي";
  }
}

function connectionStatusTone(status: DshCourierConnectionStatus): "success" | "warning" | "danger" | "neutral" {
  if (status === "redeemed") return "success";
  if (status === "pending") return "warning";
  if (status === "expired") return "danger";
  return "neutral";
}

function formatExpiry(value: string): string {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString("ar-SA");
}

export function PartnerTeamManagementScreen({
  storeId,
  storeName,
  branchLabel,
  members,
  pendingInvites = 0,
  isLoading = false,
  error,
  onRetry,
  onInviteMember,
  onMemberAction,
  onIssueCourierConnectionCode,
  onRevokeCourierConnection,
}: PartnerTeamManagementScreenProps) {
  const fleet = usePartnerFleetController(storeId);
  const [section, setSection] = React.useState<PartnerTeamSection>("members");
  const [inviteIdentity, setInviteIdentity] = React.useState("");
  const [mutation, setMutation] = React.useState<MutationState>({ kind: "idle" });
  const busy = mutation.kind === "submitting";

  const visibleMembers = React.useMemo(() => {
    if (section === "invites") return members.filter((member) => member.status === "invited");
    if (section === "couriers") return members.filter((member) => member.role === "courier");
    return members;
  }, [members, section]);

  const submitInvite = async () => {
    const identity = inviteIdentity.trim();
    if (identity.length < 5 || busy) return;
    setMutation({ kind: "submitting", target: "invite" });
    const result = await onInviteMember(identity);
    if (!result.ok) {
      setMutation({ kind: "error", message: result.error });
      return;
    }
    setInviteIdentity("");
    setMutation({ kind: "success", message: "تم إرسال الدعوة من DSH." });
  };

  const submitAction = async (member: PartnerTeamMember, action: PartnerTeamInlineAction) => {
    if (busy || action === "audit-log") return;
    setMutation({ kind: "submitting", target: member.id });
    const result = await onMemberAction(member.id, action);
    if (!result.ok) {
      setMutation({ kind: "error", message: result.error });
      return;
    }
    setMutation({ kind: "success", message: "تم تنفيذ الإجراء في DSH." });
  };

  const issueCourierCode = async (member: PartnerTeamMember) => {
    if (busy) return;
    setMutation({ kind: "submitting", target: member.id });
    const code = onIssueCourierConnectionCode
      ? await onIssueCourierConnectionCode(member)
      : await fleet.issueCourierConnectionCode(member.id);
    if (onIssueCourierConnectionCode && code) await fleet.reload();
    setMutation(code
      ? { kind: "success", message: `رمز الربط الصادر من DSH: ${code}` }
      : { kind: "error", message: fleet.error ?? "تعذر إصدار رمز الربط من DSH." });
  };

  const revokeCourier = async (member: PartnerTeamMember) => {
    if (busy) return;
    setMutation({ kind: "submitting", target: member.id });
    const ok = onRevokeCourierConnection
      ? await onRevokeCourierConnection(member)
      : await fleet.revokePendingCourierConnection(member.id);
    if (onRevokeCourierConnection && ok) await fleet.reload();
    setMutation(ok
      ? { kind: "success", message: "تم إلغاء رمز الربط المعلق في DSH." }
      : { kind: "error", message: fleet.error ?? "تعذر إلغاء رمز الربط المعلق." });
  };

  if (error) {
    return (
      <StateView
        tone="danger"
        title="تعذر تحميل فريق المتجر"
        description={error}
        {...(onRetry ? { actionLabel: "إعادة المحاولة", onActionPress: onRetry } : {})}
      />
    );
  }

  if (isLoading) {
    return <StateView tone="neutral" title="جارٍ تحميل فريق المتجر" />;
  }

  return (
    <ScrollScreen contentContainerStyle={styles.content}>
      <Card style={styles.headerCard}>
        <Text role="titleMd" style={styles.rtl}>فريق المتجر</Text>
        <Text role="caption" tone="muted" style={styles.rtl}>
          {storeName ? `${storeName} · ` : ""}{branchLabel ? `${branchLabel} · ` : ""}المتجر: {storeId} · الدعوات المعلقة: {pendingInvites}
        </Text>
      </Card>

      <View style={styles.tabs}>
        {sections.map((item) => (
          <Button
            key={item.id}
            label={item.label}
            tone={isPartnerTeamSectionSelected(section, item.id) ? "primary" : "ghost"}
            size="sm"
            onPress={() => setSection(selectPartnerTeamSection(item.id))}
          />
        ))}
      </View>

      {mutation.kind === "success" ? (
        <StateView tone="success" title="تم التنفيذ" description={mutation.message} />
      ) : mutation.kind === "error" ? (
        <StateView tone="danger" title="تعذر التنفيذ" description={mutation.message} />
      ) : null}

      <Card style={styles.inviteCard}>
        <Text role="bodyStrong" style={styles.rtl}>دعوة عضو جديد</Text>
        <TextField
          label="رقم الهاتف أو هوية الدعوة"
          value={inviteIdentity}
          onChangeText={setInviteIdentity}
          placeholder="+967…"
          keyboardType="phone-pad"
        />
        <Button
          label={mutation.kind === "submitting" && mutation.target === "invite" ? "جارٍ الإرسال…" : "إرسال الدعوة"}
          tone="primary"
          disabled={busy || inviteIdentity.trim().length < 5}
          onPress={() => void submitInvite()}
        />
      </Card>

      {section === "couriers" ? (
        <Card style={styles.connectionCard}>
          <View style={styles.rowBetween}>
            <Button label="تحديث الاتصالات" tone="ghost" size="sm" disabled={fleet.loading || busy} onPress={() => void fleet.reload()} />
            <Text role="bodyStrong" style={styles.rtl}>اتصالات أسطول الشريك</Text>
          </View>
          {fleet.loading ? (
            <StateView tone="neutral" title="جارٍ تحميل اتصالات الموصلين" />
          ) : fleet.error ? (
            <StateView
              tone="danger"
              title="تعذر تحميل اتصالات الموصلين"
              description={fleet.error}
              actionLabel="إعادة المحاولة"
              onActionPress={() => void fleet.reload()}
            />
          ) : fleet.connections.length === 0 ? (
            <StateView tone="neutral" title="لا توجد رموز أو عضويات مسجلة" />
          ) : (
            fleet.connections.map((connection) => (
              <View key={connection.id} style={styles.connectionRow}>
                <View style={styles.badges}>
                  <Badge label={connectionStatusLabel(connection.status)} tone={connectionStatusTone(connection.status)} />
                  <Badge label={`••••${connection.codeLast4}`} tone="neutral" />
                </View>
                <Text role="caption" style={styles.rtl}>الموصل: {connection.teamMemberId}</Text>
                <Text role="caption" tone="muted" style={styles.rtl}>الانتهاء: {formatExpiry(connection.expiresAt)}</Text>
                {connection.redeemedAt ? (
                  <Text role="caption" tone="muted" style={styles.rtl}>تم الاستهلاك: {formatExpiry(connection.redeemedAt)}</Text>
                ) : null}
              </View>
            ))
          )}
        </Card>
      ) : null}

      {visibleMembers.length === 0 ? (
        <StateView tone="neutral" title="لا توجد سجلات في هذا القسم" />
      ) : (
        visibleMembers.map((member) => {
          const connection = member.role === "courier" ? fleet.latestConnectionFor(member.id) : undefined;
          const pendingConnection = connection?.status === "pending";
          const activeMembership = connection?.status === "redeemed";
          const ineligible = member.status === "blocked" || member.status === "review-needed";
          return (
            <Card key={member.id} style={styles.memberCard}>
              <View style={styles.rowBetween}>
                <View style={styles.badges}>
                  <Badge label={member.statusLabel} tone={memberStatusTone(member.status)} />
                  <Badge label={member.roleLabel} tone="info" />
                  {connection ? (
                    <Badge label={connectionStatusLabel(connection.status)} tone={connectionStatusTone(connection.status)} />
                  ) : null}
                </View>
                <View style={styles.memberInfo}>
                  <Text role="bodyStrong" style={styles.rtl}>{member.name}</Text>
                  <Text role="caption" tone="muted" style={styles.rtl}>{member.branchAssignment || "لا يوجد فرع محدد"}</Text>
                </View>
              </View>

              {member.permissionsSummary ? <Text role="caption" style={styles.rtl}>{member.permissionsSummary}</Text> : null}
              {member.inviteLifecycle ? <Text role="caption" tone="muted" style={styles.rtl}>{member.inviteLifecycle}</Text> : null}
              {member.operationalImpact ? <Text role="caption" tone="muted" style={styles.rtl}>{member.operationalImpact}</Text> : null}
              {connection ? (
                <Text role="caption" tone="muted" style={styles.rtl}>
                  آخر اتصال: {connectionStatusLabel(connection.status)} · آخر أربعة: {connection.codeLast4} · الإصدار: {connection.version}
                </Text>
              ) : null}

              <View style={styles.actions}>
                {member.inlineAction && member.inlineAction !== "audit-log" ? (
                  <Button
                    label={member.inlineActionLabel || actionLabel(member.inlineAction)}
                    tone={member.inlineAction === "block" || member.inlineAction === "cancel-invite" ? "danger" : "secondary"}
                    size="sm"
                    disabled={busy}
                    onPress={() => void submitAction(member, member.inlineAction)}
                  />
                ) : null}
                {member.role === "courier" ? (
                  <Button
                    label={connection?.status === "revoked" || connection?.status === "expired" ? "إصدار رمز جديد" : "إصدار رمز ربط"}
                    tone="secondary"
                    size="sm"
                    disabled={busy || fleet.loading || pendingConnection || activeMembership || ineligible}
                    onPress={() => void issueCourierCode(member)}
                  />
                ) : null}
                {member.role === "courier" && pendingConnection ? (
                  <Button label="إلغاء رمز الربط" tone="danger" size="sm" disabled={busy} onPress={() => void revokeCourier(member)} />
                ) : null}
              </View>
            </Card>
          );
        })
      )}
    </ScrollScreen>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing[4], gap: spacing[3], paddingBottom: 96 },
  rtl: { textAlign: "right" },
  headerCard: { padding: spacing[4], gap: spacing[1], backgroundColor: colorRoles.surfaceBase },
  tabs: { flexDirection: "row-reverse", flexWrap: "wrap", gap: spacing[2] },
  inviteCard: { padding: spacing[4], gap: spacing[3], backgroundColor: colorRoles.surfaceBase },
  connectionCard: { padding: spacing[4], gap: spacing[3], backgroundColor: colorRoles.surfaceBase },
  connectionRow: {
    paddingVertical: spacing[2],
    gap: spacing[1],
    borderBottomWidth: 1,
    borderBottomColor: colorRoles.borderSubtle,
  },
  memberCard: {
    padding: spacing[4],
    gap: spacing[2],
    backgroundColor: colorRoles.surfaceBase,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colorRoles.borderSubtle,
  },
  rowBetween: { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", gap: spacing[2] },
  memberInfo: { flex: 1, alignItems: "flex-end", gap: 2 },
  badges: { flexDirection: "row-reverse", gap: spacing[1], flexWrap: "wrap" },
  actions: { flexDirection: "row-reverse", flexWrap: "wrap", gap: spacing[2] },
});
