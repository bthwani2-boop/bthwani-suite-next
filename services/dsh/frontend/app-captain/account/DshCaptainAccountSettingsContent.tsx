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

let RNSwitch: React.ComponentType<{
  value: boolean;
  onValueChange: (value: boolean) => void;
  thumbColor?: string;
  trackColor?: { false?: string; true?: string };
  ios_backgroundColor?: string;
}> | null = null;
try {
  // eslint-disable-next-line no-eval
  RNSwitch = eval("require")("react-native").Switch;
} catch { /* noop */ }

type AppearanceOption = {
  mode: BThwaniAppearanceMode;
  title: string;
};

const appearanceOptions: AppearanceOption[] = [
  { mode: "lightPremium", title: "فاتح" },
  { mode: "darkPremium", title: "داكن" },
];

type Props = {
  appearanceHydrated: boolean;
  appearanceMode: BThwaniAppearanceMode;
  isStoreCourierMode: boolean;
  onSetAppearanceMode: (mode: BThwaniAppearanceMode) => void;
  onToggleStoreCourierMode: (next: boolean) => void;
};

export function DshCaptainAccountSettingsContent({
  appearanceHydrated,
  appearanceMode,
  isStoreCourierMode,
  onSetAppearanceMode,
  onToggleStoreCourierMode,
}: Props) {
  const theme = lightThemeColors;
  const rowDirection = "row-reverse" as const;
  const [connectionCode, setConnectionCode] = React.useState("");
  const [memberships, setMemberships] = React.useState<readonly DshCaptainFleetMembership[]>([]);
  const [fleetFeedback, setFleetFeedback] = React.useState<string | null>(null);
  const [fleetLoading, setFleetLoading] = React.useState(false);

  const loadMemberships = React.useCallback(async () => {
    try {
      const response = await listCaptainPartnerFleetMemberships();
      setMemberships(response.memberships);
      if (response.memberships.some((membership) => membership.status === "active") && !isStoreCourierMode) {
        onToggleStoreCourierMode(true);
      }
    } catch (error) {
      setFleetFeedback(`تعذر تحميل عضويات متاجر الشركاء: ${error instanceof Error ? error.message : "خطأ غير متوقع"}`);
    }
  }, [isStoreCourierMode, onToggleStoreCourierMode]);

  React.useEffect(() => { void loadMemberships(); }, [loadMemberships]);

  const handleConnect = React.useCallback(async () => {
    const code = connectionCode.trim();
    if (code.length < 8) {
      setFleetFeedback("أدخل كود الربط الكامل الصادر من الشريك.");
      return;
    }
    setFleetLoading(true);
    try {
      const response = await connectCaptainToPartnerFleet(code);
      setConnectionCode("");
      setFleetFeedback(`تم ربطك بمتجر ${response.membership.storeName} كموصل متجر.`);
      onToggleStoreCourierMode(true);
      await loadMemberships();
    } catch (error) {
      setFleetFeedback(`فشل ربط موصل المتجر: ${error instanceof Error ? error.message : "خطأ غير متوقع"}`);
    } finally {
      setFleetLoading(false);
    }
  }, [connectionCode, loadMemberships, onToggleStoreCourierMode]);

  const iconBox = (name: React.ComponentProps<typeof Icon>["name"]) => (
    <View style={{ width: 36, height: 36, borderRadius: radius.sm, alignItems: "center", justifyContent: "center", backgroundColor: theme.surfaceInset, borderWidth: borders.hairline, borderColor: theme.borderColor, flexShrink: 0 }}>
      <Icon name={name} size={17} tone="muted" />
    </View>
  );

  return (
    <Box gap={4}>
      <Box padding={0} gap={0}>
        <View style={{ flexDirection: rowDirection, alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing[4], paddingVertical: 14, backgroundColor: theme.surface }}>
          <View style={{ flexDirection: rowDirection, alignItems: "center", gap: spacing[3], flexShrink: 1, minWidth: 0 }}>
            {iconBox("color-palette-outline")}
            <View style={{ flexShrink: 1, minWidth: 0, gap: 2, alignItems: "flex-end" }}>
              <Text role="bodyStrong" style={{ textAlign: "right" }} numberOfLines={1}>المظهر</Text>
              <Text role="bodySm" tone="muted" style={{ textAlign: "right" }} numberOfLines={1}>
                {appearanceHydrated ? "فاتح أبيض أو داكن زجاجي" : "جارٍ الاستعادة..."}
              </Text>
            </View>
          </View>
          <View style={{ flexDirection: rowDirection, backgroundColor: theme.surfaceInset, borderRadius: radius.sm, padding: 3, borderWidth: borders.hairline, borderColor: theme.borderColor, gap: spacing[1] }}>
            {appearanceOptions.map((option) => (
              <Pressable key={option.mode} onPress={() => onSetAppearanceMode(option.mode)} style={{ paddingHorizontal: spacing[3], paddingVertical: 6, borderRadius: 9, backgroundColor: appearanceMode === option.mode ? theme.action : "transparent" }}>
                <Text role="bodyStrong" style={{ color: appearanceMode === option.mode ? theme.colorInverse : theme.color }}>{option.title}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={{ flexDirection: rowDirection, alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing[4], paddingVertical: 14, backgroundColor: theme.surface, borderTopWidth: 1, borderTopColor: theme.borderColor }}>
          <View style={{ flexDirection: rowDirection, alignItems: "center", gap: spacing[3], flexShrink: 1, minWidth: 0 }}>
            {iconBox("storefront-outline")}
            <View style={{ flexShrink: 1, minWidth: 0, gap: 2, alignItems: "flex-end" }}>
              <Text role="bodyStrong" style={{ textAlign: "right" }} numberOfLines={1}>وضع موصل المتجر</Text>
              <Text role="bodySm" tone="muted" style={{ textAlign: "right" }} numberOfLines={2}>
                {isStoreCourierMode ? "مفعّل — طلبات المتجر المرتبط فقط" : "غير مفعّل — الوضع الافتراضي"}
              </Text>
            </View>
          </View>
          {RNSwitch ? (
            <RNSwitch
              value={isStoreCourierMode}
              onValueChange={onToggleStoreCourierMode}
              thumbColor={isStoreCourierMode ? theme.colorInverse : theme.surfaceRaised}
              trackColor={{ false: theme.borderColorStrong, true: theme.action }}
              ios_backgroundColor={theme.borderColorStrong}
            />
          ) : null}
        </View>
      </Box>

      <Card padding={3} gap={3} tone="info">
        <Text role="bodyStrong" align="start">الربط بموصل متجر شريك</Text>
        <Text role="bodySm" tone="muted" align="start">
          أدخل الكود الأحادي الاستخدام الذي أصدره الشريك من سجل الموصل. لا يمكن استخدام الكود بعد ربطه أو انتهاء صلاحيته.
        </Text>
        <TextField
          label="كود ربط موصل المتجر"
          placeholder="مثال: ABCDE-23456"
          value={connectionCode}
          onChangeText={setConnectionCode}
          autoCapitalize="characters"
        />
        <Button
          label={fleetLoading ? "جاري التحقق والربط…" : "ربط الحساب بالمتجر"}
          tone="brand"
          fullWidth={false}
          disabled={fleetLoading || connectionCode.trim().length < 8}
          onPress={() => void handleConnect()}
        />
        {fleetFeedback ? (
          <Text role="caption" tone={fleetFeedback.startsWith("فشل") || fleetFeedback.startsWith("تعذر") ? "danger" : "success"} align="start">
            {fleetFeedback}
          </Text>
        ) : null}
      </Card>

      <Box gap={2}>
        <Text role="bodyStrong" align="start">عضويات متاجر الشركاء</Text>
        {memberships.length === 0 ? (
          <Text role="bodySm" tone="muted" align="start">لا توجد عضوية موصل متجر مرتبطة بحساب الكابتن.</Text>
        ) : memberships.map((membership) => (
          <Card key={`${membership.storeId}-${membership.teamMemberId}`} padding={3} gap={1}>
            <Text role="bodyStrong" align="start">{membership.storeName}</Text>
            <Text role="bodySm" tone="muted" align="start">{membership.courierName} · {membership.status}</Text>
            {membership.branchAssignment ? <Text role="caption" tone="muted" align="start">الفروع: {membership.branchAssignment}</Text> : null}
          </Card>
        ))}
      </Box>
    </Box>
  );
}
