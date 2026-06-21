import React from "react";
import { YStack, XStack, Text as TamaguiText } from "tamagui";
import { createUiStyled } from "../../internal/tamagui-compat";
import { alpha, brandRoots, colorRoles } from "../../tokens/colors";
import { radius } from "../../tokens/radius";
import { spacing } from "../../tokens/spacing";

const BRAND = brandRoots.brandAction;
const WHITE = brandRoots.surfaceBase;
const CORNER = 32;

const Box = createUiStyled(YStack, {});
const Row = createUiStyled(XStack, {});
const Label = createUiStyled(TamaguiText, {});

export type AppHeaderAction = {
  icon: React.ReactNode;
  onPress?: () => void;
  badgeCount?: number;
  accessibilityLabel: string;
};

export type AppHeaderProps = {
  title?: string;
  locationLabel?: string;
  onLocationPress?: () => void;
  leadingSlot?: React.ReactNode;
  actions?: AppHeaderAction[];
  tickerMessage?: string;
  tickerStatusLabel?: string;
  onTickerPress?: () => void;
  direction?: "ltr" | "rtl";
  topInset?: number;
};

function AppHeaderTicker({
  message,
  statusLabel,
  onPress,
}: {
  message: string;
  statusLabel: string;
  onPress?: () => void;
}) {
  return (
    <Row
      onPress={onPress}
      backgroundColor={alpha(WHITE, 0.12)}
      borderRadius={radius.md}
      height={26}
      paddingHorizontal={spacing[2]}
      alignItems="center"
      gap={spacing[2]}
      overflow="hidden"
      marginTop={spacing[1]}
      pressStyle={onPress !== undefined ? { opacity: 0.88 } : undefined}
    >
      <Box
        backgroundColor={alpha(colorRoles.shadowBase, 0.22)}
        paddingHorizontal={spacing[1]}
        paddingVertical={2}
        borderRadius={radius.sm}
      >
        <Label color={WHITE} fontSize={9} fontWeight="900">{statusLabel}</Label>
      </Box>
      <Box flex={1} overflow="hidden">
        <Label color={WHITE} fontSize={11} fontWeight="700" numberOfLines={1}>{message}</Label>
      </Box>
    </Row>
  );
}

function AppHeaderIconButton({ action }: { action: AppHeaderAction }) {
  return (
    <Box
      accessibilityRole="button"
      accessibilityLabel={action.accessibilityLabel}
      onPress={action.onPress}
      width={36}
      height={36}
      borderRadius={radius.lg}
      backgroundColor={alpha(WHITE, 0.15)}
      alignItems="center"
      justifyContent="center"
      position="relative"
      pressStyle={{ opacity: 0.78 }}
    >
      {action.icon}
      {action.badgeCount !== undefined && action.badgeCount > 0 ? (
        <Box
          position="absolute"
          top={-1}
          right={-1}
          width={8}
          height={8}
          borderRadius={4}
          backgroundColor={colorRoles.danger}
          borderWidth={1.5}
          borderColor={BRAND}
        />
      ) : null}
    </Box>
  );
}

export function AppHeader({
  title = "بثواني",
  locationLabel,
  onLocationPress,
  leadingSlot,
  actions = [],
  tickerMessage,
  tickerStatusLabel = "مباشر",
  onTickerPress,
  direction = "rtl",
  topInset = 0,
}: AppHeaderProps) {
  const rowDir = direction === "rtl" ? "row-reverse" : "row";

  return (
    <Box
      backgroundColor={BRAND}
      borderBottomLeftRadius={CORNER}
      borderBottomRightRadius={CORNER}
      paddingBottom={spacing[2]}
      paddingHorizontal={spacing[4]}
      gap={spacing[1]}
      paddingTop={topInset + spacing[2]}
      zIndex={100}
      shadowColor={colorRoles.shadowBase}
      shadowOpacity={0.16}
      shadowRadius={12}
      style={{ shadowOffset: { width: 0, height: 6 }, elevation: 8 }}
    >
      <Row
        alignItems="center"
        justifyContent="space-between"
        minHeight={44}
        flexDirection={rowDir}
      >
        <Row alignItems="center" gap={spacing[1]} flexDirection={rowDir}>
          {actions.map((action, i) => (
            <AppHeaderIconButton key={i} action={action} />
          ))}
        </Row>

        <Box
          onPress={onLocationPress}
          flex={1}
          alignItems="center"
          justifyContent="center"
          paddingHorizontal={spacing[2]}
          pressStyle={onLocationPress !== undefined ? { opacity: 0.9 } : undefined}
          disabled={onLocationPress === undefined}
        >
          <Label color={WHITE} fontSize={18} fontWeight="900" letterSpacing={-0.8}>
            {title}
          </Label>
          {locationLabel !== undefined ? (
            <Label
              color={alpha(WHITE, 0.88)}
              fontSize={11}
              fontWeight="700"
              marginTop={2}
              numberOfLines={1}
            >
              {locationLabel}
            </Label>
          ) : null}
        </Box>

        <Box minWidth={36} alignItems="center" justifyContent="center">
          {leadingSlot}
        </Box>
      </Row>

      {tickerMessage !== undefined ? (
        <AppHeaderTicker
          message={tickerMessage}
          statusLabel={tickerStatusLabel}
          {...(onTickerPress !== undefined ? { onPress: onTickerPress } : {})}
        />
      ) : null}
    </Box>
  );
}
