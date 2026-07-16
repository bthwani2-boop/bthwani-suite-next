import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Box, Divider, Icon, Text, spacing, useDirection, useTheme } from '@bthwani/ui-kit';

/** Analytics view-model — preview/seed data only.
 * No customer PII. Summary metrics only per on-demand retrieval contract.
 * Designed for later real-data binding without layout changes. */

export function AnalyticsInsightMetric({ label, value, tone = 'default', icon }: { label: string; value: string; tone?: 'default' | 'action' | 'success' | 'info' | 'muted' | 'danger'; icon: React.ComponentProps<typeof Icon>['name'] }) {

  const { direction } = useDirection();
  const theme = useTheme() as any;
  const accentColor = tone === 'action' ? theme.brand : tone === 'success' ? theme.success : tone === 'info' ? theme.info : tone === 'danger' ? theme.danger : theme.lineStrong;
  const iconTone =
    tone === 'default' ? undefined
      : tone === 'action' ? ('brand' as const)
        : tone === 'info' ? ('action' as const)
          : tone === 'muted' ? ('muted' as const)
            : tone === 'danger' ? ('danger' as const)
              : tone;

  return (
    <Box
      padding={3}
      gap={1}
      style={{ flex: 1, minWidth: 140, borderBottomWidth: 2, borderBottomColor: accentColor }}
    >
      <View style={{ flexDirection: direction === 'rtl' ? 'row-reverse' : 'row', alignItems: 'center', gap: 6 }}>
        <Icon name={icon} size={14} {...(iconTone !== undefined ? { tone: iconTone } : {})} />
        <Text role="caption" tone="muted" numberOfLines={1} style={{ flex: 1, textAlign: direction === 'rtl' ? 'right' : 'left' }}>
          {label}
        </Text>
      </View>
      <Text role="titleSm" tone={tone} numberOfLines={1} align="start">
        {value}
      </Text>
    </Box>
  );
}

export function AnalyticsInsightsPanel({ storeName, canonicalStoreId }: { storeName: string; canonicalStoreId?: string }) {
  const theme = useTheme() as any;

  const [performance, setPerformance] = React.useState<import('../../shared/partner/partner.types').DshPartnerPerformanceResponse | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!canonicalStoreId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    import('../../shared/partner/partner.api').then(({ fetchPartnerPerformance }) => {
      fetchPartnerPerformance('today').then(res => {
        setPerformance(res);
        setLoading(false);
      }).catch(() => setLoading(false));
    }).catch(() => setLoading(false));
  }, [canonicalStoreId]);

  if (loading) {
    return (
      <Box padding={4} align="center">
        <ActivityIndicator color={theme.brand} />
      </Box>
    );
  }

  return (
    <Box gap={4}>
      {/* Summary headline */}
      <Box gap={2} paddingY={2}>
        <Text role="label" tone="muted" align="start">
          ملخص الأداء — {storeName}
        </Text>
        <Text role="bodySm" tone="muted" align="start">
          مؤشرات موجزة للطلبات. لا تتضمن بيانات عملاء تفصيلية.
        </Text>
      </Box>

      <Divider />

      {/* Engagement metrics grid */}
      <Box gap={3} paddingY={2}>
        <Text role="bodyStrong" align="start">الطلبات اليوم ({performance?.period || 'اليوم'})</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2] }}>
          <AnalyticsInsightMetric label="إجمالي الطلبات" value={(performance?.totalOrders || 0).toLocaleString('ar')} tone="action" icon="receipt-outline" />
          <AnalyticsInsightMetric label="الطلبات المقبولة" value={(performance?.acceptedOrders || 0).toLocaleString('ar')} tone="success" icon="checkmark-circle-outline" />
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2] }}>
          <AnalyticsInsightMetric label="الطلبات المرفوضة" value={(performance?.rejectedOrders || 0).toLocaleString('ar')} tone="danger" icon="close-circle-outline" />
        </View>
      </Box>
    </Box>
  );
}
