import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { Box, Text, useTheme, colorRoles } from '@bthwani/ui-kit';

export type ModernPremiumHeaderProps = {
  title?: string;
  locationLabel?: string;
  actions?: readonly {
    id: string;
    icon: React.ReactNode;
    accessibilityLabel?: string;
    badgeCount?: number;
    onPress: () => void;
  }[];
  tickerStatus?: string;
  tickerMessage?: string;
  onTickerPress?: (() => void) | undefined;
  direction?: 'ltr' | 'rtl';
};

export function ModernPremiumHeader({
  title = '',
  locationLabel = '',
  actions = [],
  tickerStatus,
  tickerMessage,
  onTickerPress,
  direction = 'rtl',
}: ModernPremiumHeaderProps) {
  const theme = useTheme() as any;
  const isRTL = direction === 'rtl';

  return (
    <View style={[styles.container, { backgroundColor: colorRoles.brandAction }]}>
      {/* Top row: Title/Location and actions */}
      <View style={[styles.mainRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <View style={[styles.infoSection, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
          {title ? (
            <Text role="titleMd" tone="inverse">
              {title}
            </Text>
          ) : null}
          {locationLabel ? (
            <Text role="bodySm" tone="inverse" style={{ opacity: 0.9 }}>
              {locationLabel}
            </Text>
          ) : null}
        </View>

        <View style={[styles.actionsRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          {actions.map((action) => (
            <Pressable
              key={action.id}
              onPress={action.onPress}
              accessibilityLabel={action.accessibilityLabel}
              style={styles.actionButton}
            >
              {action.icon}
              {action.badgeCount && action.badgeCount > 0 ? (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{action.badgeCount}</Text>
                </View>
              ) : null}
            </Pressable>
          ))}
        </View>
      </View>

      {/* Bottom row: Ticker (optional status message banner) */}
      {tickerMessage ? (
        <Pressable
          onPress={onTickerPress}
          disabled={!onTickerPress}
          style={[styles.tickerBanner, { backgroundColor: 'rgba(0, 0, 0, 0.25)' }]}
        >
          <View style={[styles.tickerContent, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            {tickerStatus ? (
              <View style={styles.tickerStatusBadge}>
                <Text style={styles.tickerStatusText}>{tickerStatus}</Text>
              </View>
            ) : null}
            <Text role="caption" tone="inverse" style={styles.tickerMessageText} numberOfLines={1}>
              {tickerMessage}
            </Text>
          </View>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 12,
    paddingBottom: 8,
    shadowColor: colorRoles.brandStructure,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 6,
  },
  mainRow: {
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 48,
  },
  infoSection: {
    flex: 1,
    justifyContent: 'center',
  },
  actionsRow: {
    alignItems: 'center',
    gap: 12,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: colorRoles.surfaceBase,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    color: colorRoles.brandAction,
    fontSize: 9,
    fontWeight: 'bold',
  },
  tickerBanner: {
    marginTop: 10,
    marginHorizontal: 12,
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  tickerContent: {
    alignItems: 'center',
    gap: 8,
  },
  tickerStatusBadge: {
    backgroundColor: colorRoles.surfaceBase,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  tickerStatusText: {
    color: colorRoles.brandAction,
    fontSize: 10,
    fontWeight: 'bold',
  },
  tickerMessageText: {
    flex: 1,
    fontSize: 11,
  },
});
