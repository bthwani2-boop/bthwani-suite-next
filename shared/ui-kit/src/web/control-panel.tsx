/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import { Box, Surface, Text, Divider } from '../primitives';
import { useDirection, useTheme } from '../providers';
import { Icon } from '../components/Icon/Icon';
type IconName = string;
import { Button } from '../components/Button';
import { colorPalette, withAlpha, neutralPalette, successPalette, dangerPalette } from '../foundation';

/**
 * WebControlPanelShell: The root container for a control panel interface.
 * Provides a wide, full-height canvas with a sidebar (rail) and main stage.
 */
export type WebControlPanelShellProps = {
  children: React.ReactNode;
  rail?: React.ReactNode;
  topBar?: React.ReactNode;
};

export function WebControlPanelShell({ children, rail, topBar }: WebControlPanelShellProps) {
  const { direction } = useDirection();

  return (
    <Box
      style={{
        width: '100%',
        height: '100vh',
        minHeight: '100dvh',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: neutralPalette[50]
      } as any}
    >
      {topBar}
      <Box
        layoutDirection="row"
        style={{ flex: 1, minWidth: 0, minHeight: 0, overflow: 'hidden' }}
      >
        {rail}
        <Box
          style={{
            flex: 1,
            minWidth: 0,
            minHeight: 0,
            overflow: 'hidden',
            position: 'relative',
            display: 'flex',
            flexDirection: 'column'
          }}
          padding={0}
        >
          {children}
        </Box>
      </Box>
    </Box>
  );
}
/**
 * WebControlPanelTopBar: A high-density command bar at the top.
 */
export type WebControlPanelTopBarProps = {
  title: string;
  subtitle?: string;
  leading?: React.ReactNode;
  trailing?: React.ReactNode;
  actions?: React.ReactNode;
};

export function WebControlPanelTopBar({ title, subtitle, leading, trailing, actions }: WebControlPanelTopBarProps) {
  const { direction } = useDirection();
  const isRtl = direction === 'rtl';

  return (
    <Surface
      tone="default"
      padding={3}
      radiusToken="none"
      border={false}
      style={{
        borderBottom: `1px solid ${withAlpha(colorPalette.brandStrong, 0.08)}`,
        zIndex: 10,
        height: 56,
        display: 'flex',
        flexDirection: isRtl ? 'row-reverse' : 'row',
        alignItems: 'center',
        justifyContent: 'space-between'
      } as any}
    >
      <Box layoutDirection="row" align="center" gap={3}>
        {leading}
        <Box gap={0}>
          <Text role="labelMd" weight="bold" tone="default">{title}</Text>
          {subtitle && <Text role="caption" tone="muted">{subtitle}</Text>}
        </Box>
      </Box>

      <Box layoutDirection="row" align="center" gap={4}>
        {actions}
        {trailing && (
          <>
            <Divider style={{ height: 24, width: 1, backgroundColor: withAlpha(colorPalette.brandStrong, 0.1) }} />
            {trailing}
          </>
        )}
      </Box>
    </Surface>
  );
}

/**
 * WebControlPanelRail: A collapsible side navigation rail.
 */
export type WebControlPanelRailProps = {
  children: React.ReactNode;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  footer?: React.ReactNode;
};

export function WebControlPanelRail({ children, collapsed, footer }: WebControlPanelRailProps) {
  const { theme } = useTheme();

  return (
    <Box
      style={{
        width: collapsed ? 64 : 260,
        backgroundColor: colorPalette.brandStrong,
        height: '100%',
        minHeight: 0,
        transition: 'width 0.2s ease',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        zIndex: 5
      } as any}
    >
      <Box style={{ flex: 1, minHeight: 0, minWidth: 0, overflow: 'hidden' }} padding={2}>
        {children}
      </Box>
      {footer && (
        <Box padding={2} style={{ borderTop: `1px solid ${withAlpha(colorPalette.white, 0.1)}` } as any}>
          {footer}
        </Box>
      )}
    </Box>
  );
}

/**
 * WebControlPanelStage: The main content area container.
 */
export type WebControlPanelStageProps = {
  children: React.ReactNode;
  maxWidth?: number | string;
};

export function WebControlPanelStage({ children, maxWidth = '100%' }: WebControlPanelStageProps) {
  return (
    <Box
      padding={6}
      gap={6}
      style={{
        width: '100%',
        maxWidth: maxWidth,
        margin: '0 auto',
        minHeight: '100%'
      } as any}
    >
      {children}
    </Box>
  );
}

/**
 * WebControlPanelSectionHeader: A clear header for content sections.
 */
export type WebControlPanelSectionHeaderProps = {
  title: string;
  description?: string;
  actions?: React.ReactNode;
};

export function WebControlPanelSectionHeader({ title, description, actions }: WebControlPanelSectionHeaderProps) {
  const { direction } = useDirection();
  const isRtl = direction === 'rtl';

  return (
    <Box
      layoutDirection="row"
      justify="space-between"
      align="flex-end"
      style={{ width: '100%', marginBottom: 12 }}
    >
      <Box gap={1} style={{ textAlign: isRtl ? 'right' : 'left' } as any}>
        <Text role="headingSm" weight="black" tone="default">{title}</Text>
        {description && <Text role="bodySm" tone="muted">{description}</Text>}
      </Box>
      {actions && <Box layoutDirection="row" gap={2}>{actions}</Box>}
    </Box>
  );
}

/**
 * WebControlPanelSignalStrip: A horizontal strip for quick metrics.
 */
export type WebControlPanelSignalStripProps = {
  children: React.ReactNode;
};

export function WebControlPanelSignalStrip({ children }: WebControlPanelSignalStripProps) {
  return (
    <Box
      layoutDirection="row"
      gap={3}
      style={{
        width: '100%',
        flexWrap: 'wrap',
        overflowX: 'hidden',
        paddingBottom: 8
      } as any}
    >
      {children}
    </Box>
  );
}

/**
 * WebControlPanelKpiTile: High-density metric display.
 */
export type WebControlPanelKpiTileProps = {
  label: string;
  value: string;
  trend?: { value: string; positive: boolean };
  icon?: IconName;
};

export function WebControlPanelKpiTile({ label, value, trend, icon }: WebControlPanelKpiTileProps) {
  const { theme } = useTheme();

  return (
    <Surface
      padding={3}
      radiusToken="lg"
      style={{
        minWidth: 180,
        flex: 1,
        border: `1px solid ${withAlpha(colorPalette.brandStrong, 0.05)}`,
        background: colorPalette.white
      } as any}
    >
      <Box layoutDirection="row" justify="space-between" align="flex-start">
        <Box gap={1}>
          <Text role="caption" weight="bold" tone="muted">{label}</Text>
          <Text role="headingSm" weight="black">{value}</Text>
        </Box>
        {icon && (
          <Box
            padding={2}
            radiusToken="md"
            style={{ backgroundColor: withAlpha(colorPalette.brandStrong, 0.04) }}
          >
            <Icon name={icon} size={18} tone="brand" />
          </Box>
        )}
      </Box>
      {trend && (
        <Box layoutDirection="row" align="center" gap={1} style={{ marginTop: 8 }}>
          <Text
            role="caption"
            weight="bold"
            style={{ color: trend.positive ? successPalette[600] : dangerPalette[600] }}
          >
            {trend.positive ? '↑' : '↓'} {trend.value}
          </Text>
          <Text role="caption" tone="muted">vs last period</Text>
        </Box>
      )}
    </Surface>
  );
}

/**
 * WebControlPanelCommandCard: Premium action card.
 */
export type WebControlPanelCommandCardProps = {
  title: string;
  description: string;
  icon: IconName;
  onPress?: () => void;
  badge?: string;
};

export function WebControlPanelCommandCard({ title, description, icon, onPress, badge }: WebControlPanelCommandCardProps) {
  return (
    <Surface
      padding={4}
      radiusToken="xl"
      style={{
        flex: 1,
        minWidth: 280,
        cursor: onPress ? 'pointer' : 'default',
        transition: 'transform 0.15s ease, box-shadow 0.15s ease',
        border: `1px solid ${withAlpha(colorPalette.brandStrong, 0.08)}`,
        background: `linear-gradient(180deg, ${colorPalette.white} 0%, ${neutralPalette[50]} 100%)`
      } as any}
      elevationToken="flat"
      // @ts-ignore
      hoverStyle={{ transform: 'translateY(-2px)', boxShadow: `0 12px 24px ${withAlpha(colorPalette.brandStrong, 0.08)}` }}
      onPress={onPress}
    >
      <Box layoutDirection="row" justify="space-between" align="flex-start">
        <Box
          padding={3}
          radiusToken="lg"
          style={{ backgroundColor: withAlpha(colorPalette.brand, 0.08) }}
        >
          <Icon name={icon} size={24} tone="brand" />
        </Box>
        {badge && (
          <Box
            paddingX={2}
            paddingY={1}
            radiusToken="pill"
            style={{ backgroundColor: colorPalette.brand }}
          >
            <Text role="caption" weight="black" style={{ color: colorPalette.white, fontSize: 10 }}>{badge}</Text>
          </Box>
        )}
      </Box>
      <Box style={{ marginTop: 16 }} gap={1}>
        <Text role="labelLg" weight="black" tone="default">{title}</Text>
        <Text role="bodySm" tone="muted" style={{ lineHeight: 1.5 }}>{description}</Text>
      </Box>
    </Surface>
  );
}

/**
 * WebControlPanelDecisionQueue: A specialized list for pending tasks.
 */
export type WebControlPanelDecisionQueueProps = {
  title: string;
  items: Array<{
    id: string;
    title: string;
    meta: string;
    status: string;
    onApprove?: () => void;
    onReject?: () => void;
  }>;
};

export function WebControlPanelDecisionQueue({ title, items }: WebControlPanelDecisionQueueProps) {
  const { direction } = useDirection();
  const isRtl = direction === 'rtl';

  return (
    <Surface
      padding={0}
      radiusToken="xl"
      style={{ width: '100%', overflow: 'hidden', border: `1px solid ${withAlpha(colorPalette.brandStrong, 0.08)}` } as any}
    >
      <Box padding={4} style={{ backgroundColor: neutralPalette[100], borderBottom: `1px solid ${withAlpha(colorPalette.brandStrong, 0.05)}` } as any}>
        <Text role="labelLg" weight="black">{title}</Text>
      </Box>
      <Box>
        {items.map((item, index) => (
          <React.Fragment key={item.id}>
            <Box
              padding={4}
              layoutDirection="row"
              justify="space-between"
              align="center"
              style={{
                backgroundColor: colorPalette.white,
                flexDirection: isRtl ? 'row-reverse' : 'row'
              }}
            >
              <Box gap={1} style={{ textAlign: isRtl ? 'right' : 'left' } as any}>
                <Text role="labelMd" weight="bold">{item.title}</Text>
                <Text role="caption" tone="muted">{item.meta} • {item.status}</Text>
              </Box>
              <Box layoutDirection="row" gap={2}>
                <Button label="Reject" tone="danger" size="sm" onPress={item.onReject} />
                <Button label="Approve" tone="brand" size="sm" onPress={item.onApprove} />
              </Box>
            </Box>
            {index < items.length - 1 && <Divider />}
          </React.Fragment>
        ))}
        {items.length === 0 && (
          <Box padding={8} align="center">
            <Text role="bodyMd" tone="muted">No pending decisions</Text>
          </Box>
        )}
      </Box>
    </Surface>
  );
}

/**
 * WebControlPanelEmptyState: Visual empty state for control panels.
 */
export type WebControlPanelEmptyStateProps = {
  title: string;
  description: string;
  icon: IconName;
  actionLabel?: string;
  onAction?: () => void;
};

export function WebControlPanelEmptyState({ title, description, icon, actionLabel, onAction }: WebControlPanelEmptyStateProps) {
  return (
    <Box padding={10} align="center" gap={4} style={{ width: '100%', minHeight: 400, justifyContent: 'center' }}>
      <Box
        padding={6}
        radiusToken="pill"
        style={{ backgroundColor: withAlpha(colorPalette.brandStrong, 0.03), marginBottom: 12 }}
      >
        <Icon name={icon} size={64} tone="muted" />
      </Box>
      <Box gap={2} align="center" style={{ maxWidth: 400, textAlign: 'center' } as any}>
        <Text role="headingSm" weight="black">{title}</Text>
        <Text role="bodyMd" tone="muted">{description}</Text>
      </Box>
      {actionLabel && (
        <Button
          label={actionLabel}
          tone="brand"
          onPress={onAction}
          style={{ marginTop: 12 }}
        />
      )}
    </Box>
  );
}
