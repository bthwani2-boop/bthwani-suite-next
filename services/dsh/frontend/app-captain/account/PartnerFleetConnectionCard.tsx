import React from "react";
import { StyleSheet, View } from "react-native";
import { useIdentitySession } from "@bthwani/core-identity";
import { Box, Button, Card, Text, TextField, spacing } from "@bthwani/ui-kit";
import {
  clearCaptainPartnerFleetCommandAttempt,
  connectCaptainToPartnerFleet,
  disconnectCaptainPartnerFleetMembership,
  getOrCreateCaptainPartnerFleetCommandAttempt,
  listCaptainPartnerFleetMemberships,
  type DshCaptainFleetMembership,
} from "../../shared/partner";

type Props = {
  readonly onMembershipStateChange: (hasActiveMembership: boolean) => void;
};

function resolveErrorMessage(error: unknown): string {
  return error instanceof Error && error.message.trim()
    ? error.message
    : "خطأ غير متوقع";
}

function isUncertainCommandError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const candidate = error as { readonly kind?: unknown; readonly status?: unknown };
  return candidate.kind === "network"
    || (typeof candidate.status === "number"
      && (candidate.status === 408 || candidate.status === 429 || candidate.status >= 500));
}

export function PartnerFleetConnectionCard({ onMembershipStateChange }: Props) {
  const identity = useIdentitySession();
  const captainActorId = identity.state.kind === "authenticated"
    && identity.state.identity.roles.includes("captain")
    ? identity.state.identity.subject.trim()
    : "";
  const [connectionCode, setConnectionCode] = React.useState("");
  const [memberships, setMemberships] = React.useState<readonly DshCaptainFleetMembership[]>([]);
  const [feedback, setFeedback] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [disconnectingMembershipId, setDisconnectingMembershipId] = React.useState<string | null>(null);

  const loadMemberships = React.useCallback(async () => {
    setLoading(true);
    try {
      const response = await listCaptainPartnerFleetMemberships();
      setMemberships(response.memberships);
      onMembershipStateChange(response.memberships.some((membership) => membership.status === "active"));
      return true;
    } catch (error) {
      setMemberships([]);
      onMembershipStateChange(false);
      setFeedback(`تعذر تحميل عضويات متاجر الشركاء: ${resolveErrorMessage(error)}`);
      return false;
    } finally {
      setLoading(false);
    }
  }, [onMembershipStateChange]);

  React.useEffect(() => {
    void loadMemberships();
  }, [loadMemberships]);

  const handleConnect = React.useCallback(async () => {
    const normalizedCode = connectionCode.replace(/-/g, "").trim().toUpperCase();
    if (normalizedCode.length < 8) {
      setFeedback("أدخل كود الربط الكامل الصادر من الشريك.");
      return;
    }

    setLoading(true);
    setFeedback(null);
    try {
      if (!captainActorId) {
        setFeedback("جلسة الكابتن غير جاهزة لربط موصل المتجر.");
        return;
      }
      const intent = { actorId: captainActorId, command: "connect" as const, code: normalizedCode };
      const attempt = await getOrCreateCaptainPartnerFleetCommandAttempt(intent);
      let response;
      try {
        response = await connectCaptainToPartnerFleet(normalizedCode, attempt.context);
      } catch (error) {
        if (!isUncertainCommandError(error)) throw error;
        response = await connectCaptainToPartnerFleet(normalizedCode, attempt.context);
      }
      setConnectionCode("");
      const refreshed = await loadMemberships();
      if (!refreshed) return;
      await clearCaptainPartnerFleetCommandAttempt(intent, attempt.fingerprint);
      setFeedback(`تم ربط الحساب بمتجر ${response.membership.storeName} كموصل متجر.`);
    } catch (error) {
      setFeedback(`فشل ربط موصل المتجر: ${resolveErrorMessage(error)}`);
    } finally {
      setLoading(false);
    }
  }, [captainActorId, connectionCode, loadMemberships]);

  const handleDisconnect = React.useCallback(async (membership: DshCaptainFleetMembership) => {
    setDisconnectingMembershipId(membership.teamMemberId);
    setFeedback(null);
    try {
      if (!captainActorId) {
        setFeedback("جلسة الكابتن غير جاهزة لفك عضوية موصل المتجر.");
        return;
      }
      const intent = {
        actorId: captainActorId,
        command: "disconnect" as const,
        teamMemberId: membership.teamMemberId,
        storeId: membership.storeId,
        expectedVersion: membership.version,
      };
      const attempt = await getOrCreateCaptainPartnerFleetCommandAttempt(intent);
      try {
        await disconnectCaptainPartnerFleetMembership(membership, attempt.context);
      } catch (error) {
        if (!isUncertainCommandError(error)) throw error;
        await disconnectCaptainPartnerFleetMembership(membership, attempt.context);
      }
      const refreshed = await loadMemberships();
      if (!refreshed) return;
      await clearCaptainPartnerFleetCommandAttempt(intent, attempt.fingerprint);
      setFeedback(`تم فك عضوية موصل متجر ${membership.storeName}.`);
    } catch (error) {
      setFeedback(`فشل فك عضوية موصل المتجر: ${resolveErrorMessage(error)}`);
    } finally {
      setDisconnectingMembershipId(null);
    }
  }, [captainActorId, loadMemberships]);

  return (
    <Box gap={3}>
      <Card padding={3} gap={3} tone="info">
        <Text role="bodyStrong" align="start">ربط موصل متجر شريك</Text>
        <Text role="bodySm" tone="muted" align="start">
          أدخل الكود الأحادي الاستخدام الصادر من تطبيق الشريك. العضوية الفعلية من DSH هي المصدر الوحيد لتفعيل وضع موصل المتجر.
        </Text>
        <TextField
          label="كود ربط موصل المتجر"
          placeholder="مثال: ABCDE-23456"
          value={connectionCode}
          onChangeText={setConnectionCode}
        />
        <View style={styles.actions}>
          <Button
            label={loading ? "جاري التحقق…" : "ربط الحساب بالمتجر"}
            tone="brand"
            fullWidth={false}
            disabled={loading || connectionCode.replace(/-/g, "").trim().length < 8}
            onPress={() => void handleConnect()}
          />
          <Button
            label="تحديث العضويات"
            tone="secondary"
            fullWidth={false}
            disabled={loading}
            onPress={() => void loadMemberships()}
          />
        </View>
        {feedback ? (
          <Text
            role="caption"
            tone={feedback.startsWith("فشل") || feedback.startsWith("تعذر") ? "danger" : "success"}
            align="start"
          >
            {feedback}
          </Text>
        ) : null}
      </Card>

      <View style={styles.memberships}>
        <Text role="bodyStrong" align="start">عضويات متاجر الشركاء</Text>
        {memberships.length === 0 ? (
          <Text role="bodySm" tone="muted" align="start">
            لا توجد عضوية موصل متجر مرتبطة بحساب الكابتن.
          </Text>
        ) : memberships.map((membership) => (
            <Card key={`${membership.storeId}-${membership.teamMemberId}`} padding={3} gap={1} tone={membership.status === "active" ? "success" : "default"}>
            <Text role="bodyStrong" align="start">{membership.storeName}</Text>
            <Text role="bodySm" tone="muted" align="start">
              {membership.courierName} · {membership.status}
            </Text>
            {membership.branchAssignment ? (
              <Text role="caption" tone="muted" align="start">
                الفروع: {membership.branchAssignment}
              </Text>
            ) : null}
            {membership.deliveryAssignment ? (
              <Text role="caption" tone="muted" align="start">
                نطاق التكليف: {membership.deliveryAssignment}
              </Text>
            ) : null}
            <View style={styles.membershipActions}>
              <Button
                label={disconnectingMembershipId === membership.teamMemberId ? "جاري فك العضوية…" : membership.status === "active" ? "فك العضوية" : "العضوية موقوفة"}
                tone="secondary"
                fullWidth={false}
                disabled={loading || disconnectingMembershipId !== null || membership.status !== "active"}
                onPress={() => void handleDisconnect(membership)}
              />
            </View>
          </Card>
        ))}
      </View>
    </Box>
  );
}

const styles = StyleSheet.create({
  actions: {
    flexDirection: "row-reverse",
    gap: spacing[2],
    flexWrap: "wrap",
  },
  memberships: {
    gap: spacing[2],
  },
  membershipActions: {
    alignItems: "flex-start",
    marginTop: spacing[1],
  },
});
