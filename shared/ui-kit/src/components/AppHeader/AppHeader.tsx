import React from "react";
import {
  Animated,
  Easing,
  Platform,
  Pressable,
  StyleSheet,
  Text as RNText,
  View,
} from "react-native";
import { alpha, brandRoots, colorRoles } from "../../tokens/colors";
import { radius } from "../../tokens/radius";
import { spacing } from "../../tokens/spacing";

const BRAND = brandRoots.brandAction;
const WHITE = brandRoots.surfaceBase;
const CORNER = 32;

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
  const translateX = React.useRef(new Animated.Value(0)).current;
  const [containerWidth, setContainerWidth] = React.useState(0);
  const [trackWidth, setTrackWidth] = React.useState(0);
  const loopGap = 72;
  const hasMeasurements = containerWidth > 0 && trackWidth > 0;
  const distance = hasMeasurements ? containerWidth + trackWidth : 0;

  React.useEffect(() => {
    translateX.stopAnimation();
    if (!hasMeasurements) {
      translateX.setValue(0);
      return undefined;
    }
    translateX.setValue(-distance);
    const anim = Animated.loop(
      Animated.timing(translateX, {
        toValue: distance,
        duration: 12000,
        easing: Easing.linear,
        useNativeDriver: false,
        isInteraction: false,
      }),
      { resetBeforeIteration: true },
    );
    anim.start();
    return () => {
      anim.stop();
      translateX.stopAnimation();
      translateX.setValue(-distance);
    };
  }, [distance, hasMeasurements, message, translateX]);

  const tickerCopy = (
    <>
      <RNText style={ts.text} numberOfLines={1}>{message}</RNText>
      <View style={{ width: loopGap }} />
      <RNText style={ts.text} numberOfLines={1}>{message}</RNText>
    </>
  );

  return (
    <Pressable onPress={onPress} style={ts.root}>
      <View style={ts.badge}>
        <RNText style={ts.badgeText}>{statusLabel}</RNText>
      </View>
      <View
        style={ts.viewport}
        onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
      >
        <View
          pointerEvents="none"
          onLayout={(e) => setTrackWidth(e.nativeEvent.layout.width)}
          style={ts.measure}
        >
          <View style={ts.track}>{tickerCopy}</View>
        </View>
        <Animated.View
          style={[
            ts.track,
            { opacity: hasMeasurements ? 1 : 0, transform: [{ translateX }] },
          ]}
        >
          {tickerCopy}
        </Animated.View>
      </View>
    </Pressable>
  );
}

function AppHeaderIconButton({ action }: { action: AppHeaderAction }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={action.accessibilityLabel}
      onPress={action.onPress}
      style={({ pressed }) => [hs.iconButton, pressed && { opacity: 0.78 }]}
    >
      {action.icon}
      {action.badgeCount !== undefined && action.badgeCount > 0 ? (
        <View style={hs.iconBadge} />
      ) : null}
    </Pressable>
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
    <View style={[hs.container, { paddingTop: topInset + spacing[2] }]}>
      <View style={[hs.topRow, { flexDirection: rowDir }]}>
        <View style={[hs.actionCluster, { flexDirection: rowDir }]}>
          {actions.map((action, i) => (
            <AppHeaderIconButton key={i} action={action} />
          ))}
        </View>

        <Pressable
          onPress={onLocationPress}
          style={hs.brandCenter}
          disabled={onLocationPress === undefined}
        >
          <RNText style={hs.brandTitle}>{title}</RNText>
          {locationLabel !== undefined ? (
            <RNText style={hs.locationText} numberOfLines={1}>
              {locationLabel}
            </RNText>
          ) : null}
        </Pressable>

        <View style={hs.leadingArea}>{leadingSlot}</View>
      </View>

      {tickerMessage !== undefined ? (
        <AppHeaderTicker
          message={tickerMessage}
          statusLabel={tickerStatusLabel}
          onPress={onTickerPress}
        />
      ) : null}
    </View>
  );
}

const hs = StyleSheet.create({
  container: {
    backgroundColor: BRAND,
    borderBottomLeftRadius: CORNER,
    borderBottomRightRadius: CORNER,
    paddingBottom: spacing[2],
    paddingHorizontal: spacing[4],
    gap: spacing[1],
    ...Platform.select({
      ios: {
        shadowColor: colorRoles.shadowBase,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.16,
        shadowRadius: 12,
      },
      android: { elevation: 8 },
    }),
    zIndex: 100,
  },
  topRow: {
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 44,
  },
  actionCluster: {
    alignItems: "center",
    gap: spacing[1],
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: radius.lg,
    backgroundColor: alpha(WHITE, 0.15),
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  iconBadge: {
    position: "absolute",
    top: -1,
    right: -1,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colorRoles.danger,
    borderWidth: 1.5,
    borderColor: BRAND,
  },
  brandCenter: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing[2],
  },
  brandTitle: {
    color: WHITE,
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: -0.8,
  },
  locationText: {
    color: alpha(WHITE, 0.88),
    fontSize: 11,
    fontWeight: "700",
    marginTop: 2,
  },
  leadingArea: {
    minWidth: 36,
    alignItems: "center",
    justifyContent: "center",
  },
});

const ts = StyleSheet.create({
  root: {
    backgroundColor: alpha(WHITE, 0.12),
    borderRadius: radius.md,
    height: 26,
    paddingHorizontal: spacing[2],
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[2],
    overflow: "hidden",
    marginTop: spacing[1],
  },
  badge: {
    backgroundColor: alpha(colorRoles.shadowBase, 0.22),
    paddingHorizontal: spacing[1],
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  badgeText: {
    color: WHITE,
    fontSize: 9,
    fontWeight: "900",
  },
  viewport: {
    flex: 1,
    overflow: "hidden",
  },
  measure: {
    position: "absolute",
    left: 0,
    top: 0,
    opacity: 0,
  },
  track: {
    flexDirection: "row",
    alignItems: "center",
  },
  text: {
    color: WHITE,
    fontSize: 11,
    fontWeight: "700",
  },
});
