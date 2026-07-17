import React from "react";
import { Pressable, View } from "react-native";
import {
  Box,
  borders,
  Icon,
  lightThemeColors,
  radius,
  spacing,
  Text,
} from "@bthwani/ui-kit";

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

export function DshCaptainAccountSettingsContent({
  appearanceHydrated,
  appearanceMode,
  onSetAppearanceMode,
}: Props) {
  const theme = lightThemeColors;

  return (
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
  );
}
