import React from "react";
import { YStack, XStack, Text as TamaguiText } from "tamagui";
import { createUiStyled } from "../../internal/tamagui-compat";
import { alpha, brandRoots, colorRoles } from "../../tokens/colors";
import { spacing } from "../../tokens/spacing";

const BRAND = brandRoots.brandAction;
const WHITE = brandRoots.surfaceBase;
const NAV_CORNER = 32;
const NAV_BASE_HEIGHT = 64;
const LAUNCHER_SIZE = 56;
const LAUNCHER_FLOAT = 12;

const Box = createUiStyled(YStack, {});
const Row = createUiStyled(XStack, {});
const Label = createUiStyled(TamaguiText, {});

export type BottomNavItem = {
  id: string;
  label: string;
  icon: React.ReactNode;
  activeIcon: React.ReactNode;
};

export type BottomNavBarProps = {
  items: readonly BottomNavItem[];
  activeId: string;
  onSelect: (id: string) => void;
  launcherIcon: React.ReactNode;
  launcherLabel?: string;
  onLauncherPress?: () => void;
  direction?: "ltr" | "rtl";
  bottomInset?: number;
};

function NavButton({
  item,
  isActive,
  onPress,
}: {
  item: BottomNavItem;
  isActive: boolean;
  onPress: () => void;
}) {
  const iconColor = isActive ? colorRoles.brandAction : colorRoles.textMuted;
  return (
    <Box
      onPress={onPress}
      accessibilityRole="tab"
      accessibilityState={{ selected: isActive }}
      alignItems="center"
      justifyContent="center"
      flex={1}
      height={NAV_BASE_HEIGHT - spacing[2]}
      gap={2}
      pressStyle={{ opacity: 0.88 }}
    >
      {isActive ? item.activeIcon : item.icon}
      <Label
        fontSize={10}
        fontWeight="800"
        textAlign="center"
        color={iconColor}
        numberOfLines={1}
      >
        {item.label}
      </Label>
    </Box>
  );
}

export function BottomNavBar({
  items,
  activeId,
  onSelect,
  launcherIcon,
  launcherLabel = "الخدمات",
  onLauncherPress,
  direction = "rtl",
  bottomInset = 0,
}: BottomNavBarProps) {
  const rowDir = direction === "rtl" ? "row-reverse" : "row";
  const totalHeight = NAV_BASE_HEIGHT + bottomInset;

  const leftItems = items.slice(0, 2);
  const rightItems = items.slice(2, 4);

  return (
    <Box
      position="relative"
      width="100%"
      alignItems="center"
      height={totalHeight}
    >
      <Box
        position="absolute"
        bottom={0}
        left={0}
        right={0}
        backgroundColor={WHITE}
        borderTopLeftRadius={NAV_CORNER}
        borderTopRightRadius={NAV_CORNER}
        height={totalHeight}
        paddingBottom={bottomInset}
        shadowColor={colorRoles.shadowBase}
        shadowOpacity={0.1}
        shadowRadius={12}
        style={{ shadowOffset: { width: 0, height: -4 }, elevation: 16 }}
      >
        <Row
          flex={1}
          paddingHorizontal={spacing[2]}
          alignItems="center"
          justifyContent="space-around"
          flexDirection={rowDir}
        >
          {leftItems.map((item) => (
            <NavButton
              key={item.id}
              item={item}
              isActive={activeId === item.id}
              onPress={() => onSelect(item.id)}
            />
          ))}

          <Box
            width={LAUNCHER_SIZE + spacing[2]}
            alignItems="center"
            justifyContent="flex-end"
            height={NAV_BASE_HEIGHT - spacing[2]}
            paddingBottom={spacing[1]}
          >
            <Box
              onPress={onLauncherPress}
              alignItems="center"
              justifyContent="center"
              marginTop={spacing[8]}
              pressStyle={{ opacity: 0.88 }}
            >
              <Label
                fontSize={10}
                fontWeight="900"
                color={colorRoles.textMuted}
                textAlign="center"
              >
                {launcherLabel}
              </Label>
            </Box>
          </Box>

          {rightItems.map((item) => (
            <NavButton
              key={item.id}
              item={item}
              isActive={activeId === item.id}
              onPress={() => onSelect(item.id)}
            />
          ))}
        </Row>
      </Box>

      <Box
        onPress={onLauncherPress}
        accessibilityRole="button"
        accessibilityLabel={launcherLabel}
        position="absolute"
        top={-LAUNCHER_FLOAT}
        alignSelf="center"
        width={LAUNCHER_SIZE}
        height={LAUNCHER_SIZE}
        borderRadius={LAUNCHER_SIZE / 2}
        backgroundColor={BRAND}
        alignItems="center"
        justifyContent="center"
        borderWidth={2.5}
        borderColor={alpha(WHITE, 0.28)}
        shadowColor={BRAND}
        shadowOpacity={0.35}
        shadowRadius={10}
        style={{ shadowOffset: { width: 0, height: 6 }, elevation: 20 }}
        zIndex={10}
        pressStyle={{ opacity: 0.88 }}
      >
        {launcherIcon}
      </Box>
    </Box>
  );
}
