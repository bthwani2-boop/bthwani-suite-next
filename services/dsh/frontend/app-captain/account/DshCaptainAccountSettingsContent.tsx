import React from "react";
import { Pressable, View } from "react-native";
import {
  Box,
  borders,
  Button,
  Card,
  Icon,
  lightThemeColors,
  radius,
  spacing,
  Text,
  TextField,
} from "@bthwani/ui-kit";
import {
  connectCaptainToPartnerFleet,
  listCaptainPartnerFleetMemberships,
} from "../../shared/partner";
import type { DshCaptainFleetMembership } from "../../shared/partner";

type BThwaniAppearanceMode = "lightPremium" | "darkPremium";

type AppearanceOption = {
  readonly mode: BThwaniAppearanceMode;
  readonly title: string;
};

const appearanceOptions: readonly AppearanceOption[] = [
  { mode: "lightPremium", title: "فاتح" },
  { mode: "darkPremium", title: "داكن" },
];

type Props = {
  readonly appearanceHydrated: boolean;
  readonly appearanceMode: BThwaniAppearanceMode;
  readonly isStoreCourierMode: boolean;
  readonly onSetAppearanceMode: (mode: BThwaniAppearanceMode) => void;
  readonly onToggleStoreCourierMode: (next: boolean) => void;
};

function resolveErrorMessage(error: unknown): string {
  return error instanceof Error && error.message.trim()
    ? error.message
    : "خطأ غير متوقع";
}

export function DshCaptainAccountSettingsContent({
  appearanceHydrated,
  appearanceMode,
  isStoreCourierMode,
  onSetAppearanceMode,
  onToggleStoreCourierMode,
}: Props) {
  const theme = lightThemeColors;
  const [connectionCode, setConnectionCode] = React.useState("");
  const [memberships, setMemberships] = React.useState<readonly DshCaptainFleetMembership[]>([]);
  const [fleetFeedback, setFleetFeedback] = React.useState<string | null>(null);
  const [fleetLoading, setFleetLoading] = React.useState(false);

  const loadMemberships = React.useCallback(async () => {
    try {
      const response = await listCaptainPartnerFleetMemberships();
      setMemberships(response.memberships);
      if (response.memberships.some((membership) => membership.status === "active")) {
        onToggleStoreCourierMode(true);
      }
    } catch (error) {
      setFleetFeedback(`تعذر تحميل عضويات متاجر الشركاء: ${resolveErrorMessage(error)}`);
    }
  }, [onToggleStoreCourierMode]);

  React.useEffect(() => {
    void loadMemberships();
  }, [loadMemberships]);

  const handleConnect = React.useCallback(async () => {
    const code = connectionCode.trim();
    if (code.replaceAll("-", "").length < 8) {
      setFleetFeedback("أدخل كود الربط الكامل الصادر من الشريك.");
      return;
    }

    setFleetLoading(true);
    try {
      const response = await connectCaptainToPartnerFleet(code);
      setConnectionCode("");
      setFleetFeedback(`تم ربط الحساب بمتجر ${response.membership.storeName} كموصل متجر.`);
      onToggleStoreCourierMode(true);
      await loadMemberships();
    } catch (error) {
      setFleetFeedback(`فشل ربط موصل المتجر: ${resolveErrorMessage(error)}`);
    } finally {
      setFleetLoading(false);
    }
  }, [connectionCode, loadMemberships, onToggleStoreCourierMode]);

  return (
    <Box gap={4}>
      <Box padding={0} gap={0}>
        <View
          style={{
            flexDirection: "row-reverse",
            alignItems: "center",
            justifyContent: "space-between",
            paddingHorizontal: spacing[4],
            paddingVertical: 14,
            backgroundColor: theme.surface,
          }}
        >
          <View style={{ flexDirection: "row-reverse", alignItems: "center", gap: spacing[3], flexShrink: 1 }}>
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: radius.sm,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: theme.surfaceInset,
                borderWidth: borders.hairline,
                borderColor: theme.borderColor,
              }}
            >
              <Icon name="color-palette-outline" size={17} tone="muted" />
            </View>
            <View style={{ flexShrink: 1, gap: 2, alignItems: "flex-end" }}>
              <Text role="bodyStrong" style={{ textAlign: "right" }}>المظهر</Text>
              <Text role="bodySm" tone="muted" style={{ textAlign: "right" }}>
                {appearanceHydrated ? "فاتح أبيض أو داكن" : "جارٍ استعادة الإعداد…"}
              </Text>
            </View>
          </View>

          <View
            style={{
              flexDirection: "row-reverse",
              backgroundColor: theme.surfaceInset,
              borderRadius: radius.sm,
              padding: 3,
              borderWidth: borders.hairline,
              borderColor: theme.borderColor,
              gap: spacing[1],
            }}
          >
            {appearanceOptions.map((option) => (
              <Pressable
                key={option.mode}
                accessibilityRole="button"
                accessibilityState={{ selected: appearanceMode === option.mode }}
                onPress={() => onSetAppearanceMode(option.mode)}
                style={{
                  paddingHorizontal: spacing[3],
                  paddingVertical: 6,
                  borderRadius: 9,
                  backgroundColor: appearanceMode === option.mode ? theme.action : "transparent",
                }}
              >
                <Text
                  role="bodyStrong"
                  style={{ color: appearanceMode === option.mode ? theme.colorInverse : theme.color }}
                >
                  {option.title}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      </Box>

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
          label={fleetLoading ? "جاري التحقق والربط…" : "ربط الحساب بالمتجر"}
          tone="brand"
          fullWidth={false}
          disabled={fleetLoading || connectionCode.replaceAll("-", "").trim().length < 8}
          onPress={() => void handleConnect()}
        />
        {fleetFeedback ? (
          <Text
            role="caption"
            tone={fleetFeedback.startsWith("فشل") || fleetFeedback.startsWith("تعذر") ? "danger" : "success"}
            align="start"
          >
            {fleetFeedback}
          </Text>
        ) : null}
      </Card>

      <Box gap={2}>
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
      </Box>

      <Card padding={3} tone={isStoreCourierMode ? "success" : "default"}>
        <Text role="bodySm" align="start">
          {isStoreCourierMode
            ? "وضع موصل المتجر مفعّل من عضوية مرتبطة فعليًا."
            : "وضع موصل المتجر غير مفعّل حتى اكتمال الربط."}
        </Text>
      </Card>
    </Box>
  );
}
