import React from 'react';
import { View } from 'react-native';
import {
  Box,
  Button,
  Divider,
  Icon,
  StateView,
  Text,
  spacing,
  useDirection,
  useTheme,
} from '@bthwani/ui-kit';

import {
  fetchPartnerPerformance,
  type DshAnalyticsPeriod,
  type DshPartnerPerformance,
} from '../../shared/analytics';

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
    <Box padding={3} gap={1} style={{ flex: 1, minWidth: 140, borderBottomWidth: 2, borderBottomColor: accentColor }}>
      <View style={{ flexDirection: direction === 'rtl' ? 'row-reverse' : 'row', alignItems: 'center', gap: 6 }}>
        <Icon name={icon} size={14} {...(iconTone !== undefined ? { tone: iconTone } : {})} />
        <Text role="caption" tone="muted" numberOfLines={1} style={{ flex: 1, textAlign: direction === 'rtl' ? 'right' : 'left' }}>
          {label}
        </Text>
      </View>
      <Text role="titleSm" tone={tone} numberOfLines={1} align="start">{value}</Text>
    </Box>
  );
}

type PerformanceState =
  | { kind: 'loading' }
  | { kind: 'success'; value: DshPartnerPerformance }
  | { kind: 'error'; message: string };

const periods: readonly { id: DshAnalyticsPeriod; label: string }[] = [
  { id: 'today', label: 'اليوم' },
  { id: 'week', label: '7 أيام' },
  { id: 'month', label: 'شهر' },
];

export function AnalyticsInsightsPanel({ storeName, canonicalStoreId }: { storeName: string; canonicalStoreId?: string }) {
  const theme = useTheme() as any;
  const [period, setPeriod] = React.useState<DshAnalyticsPeriod>('today');
  const [state, setState] = React.useState<PerformanceState>({ kind: 'loading' });
  const [reloadToken, setReloadToken] = React.useState(0);

  React.useEffect(() => {
    let cancelled = false;
    setState({ kind: 'loading' });
    void fetchPartnerPerformance(period)
      .then((value) => {
        if (!cancelled) setState({ kind: 'success', value });
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setState({
            kind: 'error',
            message: error instanceof Error ? error.message : 'تعذر تحميل أداء المتجر من DSH.',
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [canonicalStoreId, period, reloadToken]);

  if (state.kind === 'loading') {
    return <StateView loading title="جاري تحميل أداء المتجر…" description="تُقرأ المؤشرات من DSH ضمن نطاق المتجر الموثق في الجلسة." />;
  }

  if (state.kind === 'error') {
    return (
      <StateView
        tone="danger"
        title="تعذر تحميل التحليلات"
        description={state.message}
        actionLabel="إعادة المحاولة"
        onActionPress={() => setReloadToken((value) => value + 1)}
      />
    );
  }

  const performance = state.value;
  if (performance.totalOrders === 0) {
    return (
      <Box gap={3}>
        <PeriodSelector period={period} onChange={setPeriod} />
        <StateView
          tone="neutral"
          title="لا توجد طلبات في الفترة"
          description="لم يعد DSH سجلات طلبات لهذا المتجر ضمن الفترة المحددة؛ لم تُنشأ أرقام بديلة."
        />
      </Box>
    );
  }

  return (
    <Box gap={4}>
      <Box gap={2} paddingY={2}>
        <Text role="label" tone="muted" align="start">ملخص الأداء — {storeName}</Text>
        <Text role="bodySm" tone="muted" align="start">
          مصدر البيانات DSH • آخر تحديث {new Date(performance.generatedAt).toLocaleString('ar')}
        </Text>
      </Box>
      <PeriodSelector period={period} onChange={setPeriod} />
      <Divider />
      <Box gap={3} paddingY={2}>
        <Text role="bodyStrong" align="start">الطلبات — {periods.find((item) => item.id === period)?.label}</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2] }}>
          <AnalyticsInsightMetric label="إجمالي الطلبات" value={performance.totalOrders.toLocaleString('ar')} tone="action" icon="receipt-outline" />
          <AnalyticsInsightMetric label="الطلبات المقبولة" value={performance.acceptedOrders.toLocaleString('ar')} tone="success" icon="checkmark-circle-outline" />
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2] }}>
          <AnalyticsInsightMetric label="الطلبات المرفوضة" value={performance.rejectedOrders.toLocaleString('ar')} tone="danger" icon="close-circle-outline" />
        </View>
      </Box>
      <Text role="caption" tone="muted" align="start">النطاق التشغيلي: {canonicalStoreId ?? 'متجر الجلسة الموثق'}</Text>
    </Box>
  );
}

function PeriodSelector({ period, onChange }: { period: DshAnalyticsPeriod; onChange: (period: DshAnalyticsPeriod) => void }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2] }}>
      {periods.map((item) => (
        <Button key={item.id} size="sm" variant={period === item.id ? 'primary' : 'secondary'} onPress={() => onChange(item.id)}>
          {item.label}
        </Button>
      ))}
    </View>
  );
}
