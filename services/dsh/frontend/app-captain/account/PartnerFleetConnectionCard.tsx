import React from "react";
import { View } from "react-native";
import { Box, Button, Card, Text, TextField, spacing } from "@bthwani/ui-kit";
import {
  connectCaptainToPartnerFleet,
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

export function PartnerFleetConnectionCard({ onMembershipStateChange }: Props) {
  const [connectionCode, setConnectionCode] = React.useState("");
  const [memberships, setMemberships] = React.useState<readonly DshCaptainFleetMembership[]>([]);
  const [feedback, setFeedback] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  const loadMemberships = React.useCallback(async () => {
    setLoading(true);
    try {
      const response = await listCaptainPartnerFleetMemberships();
      setMemberships(response.memberships);
      onMembershipStateChange(response.memberships.some((membership) => membership.status === "active"));
      setFeedback(null);
    } catch (error) {
      setMemberships([]);
      onMembershipStateChange(false);
      setFeedback(`تعذر تحميل عضويات متاجر الشركاء: ${resolveErrorMessage(error)}`);
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
    try {
      const response = await connectCaptainToPartnerFleet(normalizedCode);
      setConnectionCode("");
      setFeedback(`تم ربط الحساب بمتجر ${response.membership.storeName} كموصل متجر.`);
      await loadMemberships();
    } catch (error) {
      setFeedback(`فشل ربط موصل المتجر: ${resolveErrorMessage(error)}`);
    } finally {
      setLoading(false);
    }
  }, [connectionCode, loadMemberships]);

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
        <View style={{ flexDirection: "row-reverse", gap: spacing[2], flexWrap: "wrap" }}>
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

      <View style={{ gap: spacing[2] }}>
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
          </Card>
        ))}
      </View>
    </Box>
  );
}
