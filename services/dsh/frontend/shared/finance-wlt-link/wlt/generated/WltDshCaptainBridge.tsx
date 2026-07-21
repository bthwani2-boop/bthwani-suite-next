import React from 'react';
import { View, Pressable } from 'react-native';
import {
  Badge,
  Box,
  Divider,
  Icon,
  KeyValueList,
  MobileScrollView,
  StateView,
  Text,
  TopBar,
  useTheme,
  useDirection,
  spacing,
} from '@bthwani/ui-kit';
import { useWltDshCaptainCodReferenceController } from '@bthwani/wlt/frontend/shared/dsh/use-wlt-dsh-captain-cod-reference-controller';
import type { WltDshCodReference } from '@bthwani/wlt/frontend/shared/dsh/wlt-dsh-boundary.types';
import { fetchDshCaptainOwnCodRecords } from '../../wlt-cod/wlt-cod.api';

function ChevronDownIcon() {
  return <Icon name="chevron-down" tone="muted" size={18} />;
}

function ChevronUpIcon() {
  return <Icon name="chevron-up" tone="muted" size={18} />;
}

interface ActionStripProps {
  icon: string;
  title: string;
  subtitle: string;
  expanded: boolean;
  onPress: () => void;
  children?: React.ReactNode;
}

function ActionStrip({ icon, title, subtitle, expanded, onPress, children }: ActionStripProps) {
  const theme = useTheme() as any;
  return (
    <View style={{ width: '100%' }}>
      <Pressable
        onPress={onPress}
        style={({ pressed }: { pressed: boolean }) => ({
          flexDirection: 'row-reverse',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingVertical: 16,
          paddingHorizontal: 16,
          backgroundColor: pressed ? theme.surfaceInset : 'transparent',
        })}
      >
        <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 12, flex: 1 }}>
          <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: theme.brandSurface, justifyContent: 'center', alignItems: 'center' }}>
            <Icon name={icon as any} tone="brand" size={18} />
          </View>
          <View style={{ flex: 1, alignItems: 'flex-end', gap: 2 }}>
            <Text role="bodyStrong" style={{ color: theme.text }}>{title}</Text>
            <Text role="bodySm" numberOfLines={1} style={{ color: theme.textMuted }}>{subtitle}</Text>
          </View>
        </View>
        <View style={{ paddingRight: 8 }}>
          {expanded ? <ChevronUpIcon /> : <ChevronDownIcon />}
        </View>
      </Pressable>

      {expanded && children && (
        <View style={{ paddingHorizontal: 16, paddingBottom: 16 }}>
          {children}
        </View>
      )}
    </View>
  );
}

export type WltDshCaptainBridgeProps = {
  section?: string;
  onBack?: () => void;
  dshClientId?: string | null;
};

type WltDshFinanceSummaryRecord = {
  id: string;
  title: string;
  subtitle: string;
  timeLabel: string;
  amountLabel: string;
  tone: 'positive' | 'negative' | 'neutral';
  statusLabel: string;
  statusTone: 'success' | 'warning' | 'danger' | 'info' | 'default';
  kind: 'captain-eligibility-topup' | 'captain-cod-liability' | 'captain-earning';
  holdReason?: string;
};

function formatMinorUnitsToLabel(amountMinorUnits: number, currency: string, sign: '+' | '-' | '' = ''): string {
  const major = Math.abs(amountMinorUnits) / 100;
  return `${sign}${major.toLocaleString()} ${currency}`;
}

function codReferenceToRecord(ref: WltDshCodReference): WltDshFinanceSummaryRecord {
  const isRemitted = ref.status === 'remitted' || ref.remittedAt != null;
  const isCollected = ref.status === 'collected' || ref.collectedAt != null;
  return {
    id: ref.id,
    title: `تحصيل طلب #${ref.orderId}`,
    subtitle: 'نقد عند الاستلام COD',
    timeLabel: ref.collectedAt ?? ref.createdAt,
    amountLabel: formatMinorUnitsToLabel(ref.amountMinorUnits, ref.currency, isCollected && !isRemitted ? '-' : ''),
    tone: isCollected && !isRemitted ? 'negative' : 'neutral',
    statusLabel: isRemitted ? 'تم الإيداع' : isCollected ? 'عهدة بانتظار الإيداع' : 'بانتظار إثبات التحصيل',
    statusTone: isRemitted ? 'success' : isCollected ? 'warning' : 'info',
    kind: 'captain-cod-liability',
  };
}

function RecordRow({ record }: { record: WltDshFinanceSummaryRecord }) {
  const { direction } = useDirection();
  const theme = useTheme() as any;

  const amountTone = record.tone === 'positive' ? 'success'
    : record.tone === 'negative' ? 'danger'
    : 'info';

  const rowDirection = direction === 'rtl' ? 'row-reverse' : 'row';
  const textAlign = direction === 'rtl' ? 'right' : 'left';
  const alignSide = direction === 'rtl' ? 'flex-end' : 'flex-start';
  const oppositeAlignSide = direction === 'rtl' ? 'flex-start' : 'flex-end';
  const oppositeTextAlign = direction === 'rtl' ? 'left' : 'right';

  const badgeTone = record.statusTone === 'default'
    ? 'neutral' as const
    : record.statusTone === 'danger'
      ? 'danger' as const
      : record.statusTone as any;

  return (
    <Box gap={2} style={{ paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: theme.line }}>
      <View style={{ flexDirection: rowDirection, alignItems: 'center', gap: spacing[3] }}>
        <View style={{ flex: 1, gap: 3, alignItems: alignSide }}>
          <Text role="bodyStrong" style={{ textAlign }} numberOfLines={1}>
            {record.title}
          </Text>
          <Text role="bodySm" tone="muted" style={{ textAlign }} numberOfLines={1}>
            {record.subtitle}
          </Text>
          <Text role="caption" tone="muted" style={{ textAlign }}>
            {record.timeLabel}
          </Text>
          {record.holdReason ? (
            <Text role="caption" tone="warning" style={{ textAlign }}>
              {record.holdReason}
            </Text>
          ) : null}
        </View>
        <View style={{ alignItems: oppositeAlignSide, gap: 5, flexShrink: 0 }}>
          <Text role="bodyStrong" tone={amountTone} style={{ textAlign: oppositeTextAlign }}>
            {record.amountLabel}
          </Text>
          <Badge label={record.statusLabel} tone={badgeTone} />
        </View>
      </View>
    </Box>
  );
}

export function WltDshCaptainBridge({
  section = 'cod-liability',
  onBack,
  dshClientId,
}: WltDshCaptainBridgeProps) {
  const theme = useTheme() as any;
  const { direction } = useDirection();
  const isRtl = direction === 'rtl';

  const [expandedSection, setExpandedSection] = React.useState<string | null>(section);

  // COD liability is WLT-owned financial truth: fetched via the WLT captain-scoped
  // reference controller. Transport goes through the governed DSH finance proxy
  // (/dsh/captain/finance/cod-records) because WLT's internal read is
  // service-authenticated — never fetched directly from the browser.
  const captainId = dshClientId ?? null;
  const codController = useWltDshCaptainCodReferenceController(captainId, fetchDshCaptainOwnCodRecords);

  const codRecords: WltDshFinanceSummaryRecord[] =
    codController.state.kind === 'loaded'
      ? codController.state.records.map(codReferenceToRecord)
      : [];

  const codOutstandingMinorUnits = codController.state.kind === 'loaded'
    ? codController.state.records
        .filter((r) => r.status === 'collected' && r.remittedAt == null)
        .reduce((sum, r) => sum + r.amountMinorUnits, 0)
    : 0;
  const codCurrency = codController.state.kind === 'loaded' && codController.state.records[0]
    ? codController.state.records[0].currency
    : 'ر.ي';

  const codPendingCollectionCount = codController.state.kind === 'loaded'
    ? codController.state.records.filter((record) => record.status === 'pending_collection').length
    : 0;
  const codCollectedOutstandingCount = codController.state.kind === 'loaded'
    ? codController.state.records.filter((record) => record.status === 'collected' && record.remittedAt == null).length
    : 0;

  return (
    <View style={{ flex: 1, backgroundColor: theme.surface }}>
      <TopBar variant="primary" title="مالية الكابتن" {...(onBack ? { onBack } : {})} />
      <MobileScrollView fill padding={0} gap={0} contentContainerStyle={{ paddingBottom: 120 }}>
        <Box padding={0} gap={0}>
          {/* 1. عهدة COD الحية من WLT */}
          <ActionStrip
            icon="wallet-outline"
            title="عهدة النقد عند الاستلام"
            subtitle={`العهدة المحصّلة غير المودعة: ${formatMinorUnitsToLabel(codOutstandingMinorUnits, codCurrency)}`}
            expanded={expandedSection === 'cod-liability'}
            onPress={() => setExpandedSection(expandedSection === 'cod-liability' ? null : 'cod-liability')}
          >
            <Box gap={3} style={{ paddingY: 8 }}>
              <Text role="label" tone="muted" style={{ textAlign: isRtl ? 'right' : 'left' }}>
                تحصيل الدفع عند الاستلام — ذمة مستحقة
              </Text>

              {codController.state.kind === 'loading' && (
                <StateView tone="info" title="جاري تحميل بيانات COD..." loading />
              )}

              {codController.state.kind === 'error' && (
                <StateView
                  tone="danger"
                  title="تعذّر تحميل بيانات COD"
                  description={codController.state.message}
                  actionLabel="إعادة المحاولة"
                  onActionPress={codController.retry}
                />
              )}

              {codController.state.kind === 'not_available' && (
                <StateView
                  tone="info"
                  title="بيانات COD غير متاحة"
                  description="تعذّر تحديد هوية الكابتن أو نقطة اتصال WLT الخاصة بذمة COD."
                />
              )}

              {codController.state.kind === 'loaded' && codRecords.length === 0 && (
                <StateView
                  tone="success"
                  title="لا توجد ذمة COD قائمة"
                  description="لا يوجد مبالغ تحصيل عند الاستلام بانتظار الإيداع حاليًا."
                />
              )}

              {codController.state.kind === 'loaded' && codRecords.length > 0 && (
                <KeyValueList
                  dense
                  items={[
                    { label: 'بانتظار إثبات التحصيل', value: codPendingCollectionCount.toLocaleString(), tone: codPendingCollectionCount > 0 ? 'info' : 'default' },
                    { label: 'عهد محصّلة غير مودعة', value: codCollectedOutstandingCount.toLocaleString(), tone: codCollectedOutstandingCount > 0 ? 'warning' : 'default' },
                    { label: 'إجمالي العهدة القائمة', value: formatMinorUnitsToLabel(codOutstandingMinorUnits, codCurrency), tone: codOutstandingMinorUnits > 0 ? 'warning' : 'success' },
                  ]}
                />
              )}

              <Box gap={2}>
                {codRecords.map((r) => <RecordRow key={r.id} record={r} />)}
              </Box>
            </Box>
          </ActionStrip>

          {/* 3. الأرباح */}
          <ActionStrip
            icon="trending-up-outline"
            title="الأرباح"
            subtitle="غير متاح — بانتظار مرجع أرباح كابتن معتمد من WLT"
            expanded={expandedSection === 'earnings'}
            onPress={() => setExpandedSection(expandedSection === 'earnings' ? null : 'earnings')}
          >
            <Box gap={3} style={{ paddingY: 8 }}>
              <StateView
                tone="info"
                title="مرجع الأرباح التجميعي للكابتن غير متاح بعد"
                description="WLT يوفر حاليًا العمولة لكل طلب على حدة فقط (commissions?orderId=). عرض إجمالي أرباح الكابتن يتطلب نقطة مرجع WLT مجمّعة بحسب captainId لم تُنشر بعد."
              />
            </Box>
          </ActionStrip>

          {/* 4. التسوية */}
          <ActionStrip
            icon="sync-outline"
            title="التسوية"
            subtitle="غير متاح — التسوية عملية مالية معتمدة على مستوى partnerId فقط حاليًا"
            expanded={expandedSection === 'settlement'}
            onPress={() => setExpandedSection(expandedSection === 'settlement' ? null : 'settlement')}
          >
            <Box gap={3} style={{ paddingY: 8 }}>
              <StateView
                tone="info"
                title="تسوية الكابتن غير متاحة بعد"
                description={"عمليات مالية غير معتمدة للتشغيل الحي بعد؛ كما أن WLT يعرض حاليًا مرجع تسوية بحسب partnerId فقط وليس بحسب captainId."}
              />
            </Box>
          </ActionStrip>
        </Box>
      </MobileScrollView>
    </View>
  );
}

export default WltDshCaptainBridge;
