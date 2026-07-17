import React from "react";
import { View } from "react-native";
import { Box, Button, Card, Text, TextField, spacing } from "@bthwani/ui-kit";
import {
  connectCaptainToPartnerFleet,
  listCaptainPartnerFleetMemberships,
} from "../../shared/partner";
import type { DshCaptainFleetMembership } from "../../shared/partner";

type Props = {
  readonly onConnected: () => void;
};

function resolveErrorMessage(error: unknown): string {
  return error instanceof Error && error.message.trim()
    ? error.message
    : "خطأ غير متوقع";
}

export function PartnerFleetConnectionCard({ onConnected }: Props) {
  const [connectionCode, setConnectionCode] = React.useState("");
  const [memberships, setMemberships] = React.useState<readonly DshCaptainFleetMembership[]>([]);
  const [feedback, setFeedback] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  const loadMemberships = React.useCallback(async () => {
    try {
      const response = await listCaptainPartnerFleetMemberships();
      setMemberships(response.memberships);
      if (response.memberships.some((membership) => membership.status === "active")) {
        onConnected();
      }
    } catch (error) {
      setFeedback(`تعذر تحميل عضويات متاجر الشركاء: ${resolveErrorMessage(error)}`);
    }
  }, [onConnected]);

  React.useEffect(() => {
    void loadMemberships();
  }, [loadMemberships]);

  const handleConnect = React.useCallback(async () => {
    const normalizedCode = connectionCode.replace(/-/g, "").trim();
    if (normalizedCode.length < 8) {
      setFeedback("أدخل كود الربط الكامل الصادر من الشريك.");
      return;
    }

    setLoading(true);
    try {
      const response = await connectCaptainToPartnerFleet(connectionCode);
      setConnectionCode("");
      setFeedback(`تم ربط الحساب بمتجر ${response.membership.storeName} كموصل متجر.`);
      onConnected();
      await loadMemberships();
    } catch (error) {
      setFeedback(`فشل ربط موصل المتجر: ${resolveErrorMessage(error)}`);
    } finally {
      setLoading(false);
    }
  }, [connectionCode, loadMemberships, onConnected]);

  return (
    <Box gap={3}>
      <Card padding={3} gap={3} tone="info">
        <Text role="bodyStrong" align="start">ربط موصل متجر شريك</Text>
        <Text role="bodySm" tone="muted" align="start">
          أدخل الكود الأحادي الاستخدام الصادر من تطبيق الشريك. بعد نجاح الربط تُستخدم عضوية المتجر نفسها في إسناد طلبات توصيل المتجر.
        </Text>
        <TextField
          label="كود ربط موصل المتجر"
          placeholder="مثال: ABCDE-23456"
          value={connectionCode}
          onChangeText={setConnectionCode}
        />
        <Button
          label={loading ? "جاري التحقق والربط…" : "ربط الحساب بالمتجر"}
          tone="brand"
          fullWidth={false}
          disabled={loading || connectionCode.replace(/-/g, "").trim().length < 8}
          onPress={() => void handleConnect()}
        />
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
          <Card key={`${membership.storeId}-${membership.teamMemberId}`} padding={3} gap={1}>
            <Text role="bodyStrong" align="start">{membership.storeName}</Text>
            <Text role="bodySm" tone="muted" align="start">
              {membership.courierName} · {membership.status}
            </Text>
            {membership.branchAssignment ? (
              <Text role="caption" tone="muted" align="start">
                الفروع: {membership.branchAssignment}
              </Text>
            ) : null}
          </Card>
        ))}
      </View>
    </Box>
  );
}
