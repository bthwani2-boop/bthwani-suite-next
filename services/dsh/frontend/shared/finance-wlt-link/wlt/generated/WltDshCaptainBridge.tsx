import React from 'react';
import { View, Pressable } from 'react-native';
import {
  Badge,
  Box,
  Button,
  Divider,
  Icon,
  KeyValueList,
  MobileScrollView,
  StateView,
  Surface,
  Text,
  TopBar,
  useTheme,
  useDirection,
  spacing,
  TextField,
  radius,
} from '@bthwani/ui-kit';

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
  dshAuthBearerToken?: string | null;
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
  section = 'eligibility',
  onBack,
}: WltDshCaptainBridgeProps) {
  const theme = useTheme() as any;
  const { direction } = useDirection();
  const isRtl = direction === 'rtl';

  const [expandedSection, setExpandedSection] = React.useState<string | null>(section);

  // Eligibility local state
  const [eligibilityBalance, setEligibilityBalance] = React.useState(3500);
  const isEligible = eligibilityBalance >= 2000;
  const eligibilityShortfall = isEligible ? 0 : 2000 - eligibilityBalance;

  const [showFundingForm, setShowFundingForm] = React.useState(false);
  const [fundingAmountText, setFundingAmountText] = React.useState(eligibilityShortfall > 0 ? String(eligibilityShortfall) : '2000');
  const [selectedMethod, setSelectedMethod] = React.useState<'card' | 'karimi' | 'one_cash' | 'saba'>('card');
  const [fundingLoading, setFundingLoading] = React.useState(false);
  const [fundingSuccess, setFundingSuccess] = React.useState(false);

  // Settlement local state
  const [pendingPayout, setPendingPayout] = React.useState(18500);
  const [settledAmount, setSettledAmount] = React.useState(124000);
  const [settlementLoading, setSettlementLoading] = React.useState(false);
  const [settlementSuccess, setSettlementSuccess] = React.useState(false);

  // Static Mock Records
  const [records, setRecords] = React.useState<WltDshFinanceSummaryRecord[]>([
    { id: 'rec-1', title: 'شحن رصيد الضامن', subtitle: 'بطاقة ائتمانية - فيزا', timeLabel: 'اليوم، 10:14 ص', amountLabel: '+2,000 ر.ي', tone: 'positive', statusLabel: 'مكتمل', statusTone: 'success', kind: 'captain-eligibility-topup' },
    { id: 'rec-2', title: 'تحصيل طلب #28401', subtitle: 'نقد عند الاستلام COD', timeLabel: 'أمس، 08:30 م', amountLabel: '-4,500 ر.ي', tone: 'negative', statusLabel: 'قيد الإيداع', statusTone: 'warning', kind: 'captain-cod-liability' },
    { id: 'rec-3', title: 'عمولة توصيل طلب #28401', subtitle: 'توصيل بثواني - فئة Elite', timeLabel: 'أمس، 08:30 م', amountLabel: '+850 ر.ي', tone: 'positive', statusLabel: 'محتسب', statusTone: 'success', kind: 'captain-earning' },
    { id: 'rec-4', title: 'شحن رصيد الضامن', subtitle: 'بنك الكريمي', timeLabel: '24 يونيو، 02:15 م', amountLabel: '+1,500 ر.ي', tone: 'positive', statusLabel: 'مكتمل', statusTone: 'success', kind: 'captain-eligibility-topup' },
  ]);

  const handleConfirmFunding = async () => {
    const val = parseFloat(fundingAmountText);
    if (isNaN(val) || val <= 0) return;
    setFundingLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setEligibilityBalance((prev) => prev + val);
    setRecords((prev) => [
      {
        id: `rec-fund-${Date.now()}`,
        title: 'شحن رصيد الضامن',
        subtitle: selectedMethod === 'card' ? 'بطاقة ائتمانية' : selectedMethod === 'karimi' ? 'بنك الكريمي' : selectedMethod === 'one_cash' ? 'ONE كاش' : 'سباكاش',
        timeLabel: 'الآن',
        amountLabel: `+${val.toLocaleString()} ر.ي`,
        tone: 'positive',
        statusLabel: 'مكتمل',
        statusTone: 'success',
        kind: 'captain-eligibility-topup',
      },
      ...prev,
    ]);
    setFundingSuccess(true);
    setShowFundingForm(false);
    setFundingLoading(false);
  };

  const handleRequestSettlement = async () => {
    setOriginalSettlement(pendingPayout);
  };

  const [originalSettlement, setOriginalSettlement] = React.useState<number | null>(null);

  const performSettlement = async () => {
    if (originalSettlement === null) return;
    setSettlementLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setSettledAmount((prev) => prev + originalSettlement);
    setPendingPayout(0);
    setSettlementSuccess(true);
    setSettlementLoading(false);
    setOriginalSettlement(null);
  };

  React.useEffect(() => {
    if (originalSettlement !== null) {
      performSettlement();
    }
  }, [originalSettlement]);

  React.useEffect(() => {
    if (fundingSuccess) {
      const t = setTimeout(() => setFundingSuccess(false), 3000);
      return () => clearTimeout(t);
    }
  }, [fundingSuccess]);

  React.useEffect(() => {
    if (settlementSuccess) {
      const t = setTimeout(() => setSettlementSuccess(false), 4000);
      return () => clearTimeout(t);
    }
  }, [settlementSuccess]);

  const paymentMethods = [
    { id: 'card' as const, label: 'بطاقة ائتمانية' },
    { id: 'karimi' as const, label: 'بنك الكريمي' },
    { id: 'one_cash' as const, label: 'ONE كاش' },
    { id: 'saba' as const, label: 'سباكاش' },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: theme.surface }}>
      <TopBar variant="primary" title="مالية الكابتن" {...(onBack ? { onBack } : {})} />
      <MobileScrollView fill padding={0} gap={0} contentContainerStyle={{ paddingBottom: 120 }}>
        <Box padding={0} gap={0}>
          {/* 1. الأهلية والشحن */}
          <ActionStrip
            icon="shield-checkmark-outline"
            title="الأهلية والشحن"
            subtitle={isEligible ? `مؤهل لاستقبال الطلبات · الرصيد: ${eligibilityBalance.toLocaleString()} ر.ي` : `غير مؤهل — الرصيد: ${eligibilityBalance.toLocaleString()} ر.ي`}
            expanded={expandedSection === 'eligibility'}
            onPress={() => setExpandedSection(expandedSection === 'eligibility' ? null : 'eligibility')}
          >
            <Box gap={3} style={{ paddingY: 8 }}>
              <Text role="label" tone="muted" style={{ textAlign: isRtl ? 'right' : 'left' }}>
                أهلية استقبال الطلبات
              </Text>
              <KeyValueList
                dense
                items={[
                  { label: 'الرصيد الضامن الحالي', value: `${eligibilityBalance.toLocaleString()} ر.ي`, tone: isEligible ? 'success' : 'warning' },
                  { label: 'الحد الأدنى المطلوب', value: '2,000 ر.ي', tone: 'info' },
                  { label: 'الحالة', value: isEligible ? 'مؤهل لاستقبال الطلبات' : 'غير مؤهل — رصيد غير كافٍ', tone: isEligible ? 'success' : 'warning' },
                  ...(eligibilityShortfall > 0 ? [{ label: 'المبلغ المطلوب للتأهل', value: `${eligibilityShortfall.toLocaleString()} ر.ي`, tone: 'warning' as const }] : []),
                ]}
              />

              {eligibilityShortfall > 0 && !showFundingForm && !fundingSuccess ? (
                <Box
                  gap={1}
                  style={{
                    paddingVertical: spacing[2],
                    paddingHorizontal: spacing[3],
                    borderRightWidth: isRtl ? 4 : 0,
                    borderLeftWidth: isRtl ? 0 : 4,
                    borderRightColor: isRtl ? theme.warning : undefined,
                    borderLeftColor: isRtl ? undefined : theme.warning,
                  }}
                >
                  <Text role="bodyStrong" style={{ textAlign: isRtl ? 'right' : 'left' }}>غير مؤهل لاستقبال الطلبات</Text>
                  <Text role="bodySm" tone="muted" style={{ textAlign: isRtl ? 'right' : 'left' }}>
                    يرجى شحن رصيد الضامن لتفعيل حسابك وتلقي العروض مرة أخرى.
                  </Text>
                </Box>
              ) : null}

              {fundingSuccess && (
                <StateView
                  tone="success"
                  title="تم شحن الرصيد بنجاح!"
                  description="تم تحديث الرصيد الضامن الخاص بك وأصبحت جاهزاً للعمل."
                />
              )}

              {showFundingForm ? (
                <Surface tone="inset" padding={3} gap={3} style={{ borderRadius: radius.sm, borderWidth: 1, borderColor: theme.line }}>
                  <Text role="bodyStrong" style={{ textAlign: 'right' }}>إجراء شحن رصيد الضامن</Text>

                  {(() => {
                    const TextFieldAny = TextField as any;
                    return (
                      <TextFieldAny
                        label="مبلغ شحن رصيد الضامن"
                        value={fundingAmountText}
                        onChangeText={setFundingAmountText}
                        placeholder="أدخل مبلغ الشحن..."
                        keyboardType="numeric"
                        style={{ textAlign: 'right' }}
                      />
                    );
                  })()}

                  <Box gap={1}>
                    <Text role="caption" tone="muted" style={{ textAlign: 'right' }}>وسيلة الشحن</Text>
                    <Box layoutDirection="row" gap={2} style={{ flexWrap: 'wrap', flexDirection: 'row-reverse' }}>
                      {paymentMethods.map((m) => (
                        <Pressable
                          key={m.id}
                          onPress={() => setSelectedMethod(m.id)}
                          style={{
                            paddingHorizontal: spacing[3],
                            paddingVertical: 6,
                            borderRadius: radius.xs,
                            backgroundColor: selectedMethod === m.id ? theme.brand : theme.surfaceInset,
                            borderWidth: 1,
                            borderColor: selectedMethod === m.id ? theme.brand : theme.line,
                          }}
                        >
                          <Text role="bodySm" style={{ color: selectedMethod === m.id ? theme.brandContrast : theme.text }}>
                            {m.label}
                          </Text>
                        </Pressable>
                      ))}
                    </Box>
                  </Box>

                  <Box layoutDirection="row" gap={2} style={{ flexDirection: 'row-reverse', marginTop: spacing[2] }}>
                    <Button
                      label="تأكيد عملية الشحن"
                      tone="primary"
                      loading={fundingLoading}
                      disabled={fundingLoading || !fundingAmountText}
                      fullWidth={false}
                      style={{ flex: 1 }}
                      onPress={handleConfirmFunding}
                    />
                    <Button
                      label="إلغاء"
                      tone="secondary"
                      disabled={fundingLoading}
                      fullWidth={false}
                      style={{ flex: 1 }}
                      onPress={() => setShowFundingForm(false)}
                    />
                  </Box>
                </Surface>
              ) : (
                !fundingSuccess && (
                  <Box gap={2} style={{ paddingVertical: 4 }}>
                    <Button
                      label={eligibilityShortfall > 0 ? `اشحن ${eligibilityShortfall.toLocaleString()} ر.ي للتأهل` : 'شحن رصيد إضافي'}
                      tone={eligibilityShortfall > 0 ? 'primary' : 'ghost'}
                      fullWidth
                      onPress={() => {
                        setFundingAmountText(eligibilityShortfall > 0 ? String(eligibilityShortfall) : '2000');
                        setShowFundingForm(true);
                      }}
                    />
                  </Box>
                )
              )}

              {records.filter((r) => r.kind === 'captain-eligibility-topup').length > 0 && (
                <Box gap={2} style={{ marginTop: spacing[2] }}>
                  <Text role="caption" tone="muted" style={{ textAlign: 'right' }}>سجل عمليات الشحن الأخيرة</Text>
                  {records.filter((r) => r.kind === 'captain-eligibility-topup').map((r) => <RecordRow key={r.id} record={r} />)}
                </Box>
              )}
            </Box>
          </ActionStrip>

          {/* 2. ذمة COD */}
          <ActionStrip
            icon="wallet-outline"
            title="ذمة COD"
            subtitle={`الذمة القائمة: 4,500 ر.ي`}
            expanded={expandedSection === 'cod-liability'}
            onPress={() => setExpandedSection(expandedSection === 'cod-liability' ? null : 'cod-liability')}
          >
            <Box gap={3} style={{ paddingY: 8 }}>
              <Text role="label" tone="muted" style={{ textAlign: isRtl ? 'right' : 'left' }}>
                تحصيل الدفع عند الاستلام — ذمة مستحقة
              </Text>
              <KeyValueList
                dense
                items={[
                  { label: 'المبلغ المحصّل — ذمة قائمة', value: '4,500 ر.ي', tone: 'warning' },
                  { label: 'إيداع الدفع معلّق', value: '0 ر.ي', tone: 'warning' },
                  { label: 'دورة التسوية', value: 'أسبوعية - كل خميس', tone: 'default' },
                  { label: 'الإجراء التالي', value: 'إيداع المبلغ بالبنك قبل موعد التسوية', tone: 'info' },
                ]}
              />
              <Box gap={2}>
                {records.filter((r) => r.kind === 'captain-cod-liability').map((r) => <RecordRow key={r.id} record={r} />)}
              </Box>
              <Box
                gap={1}
                style={{
                  paddingVertical: spacing[2],
                  paddingHorizontal: spacing[3],
                  borderRightWidth: isRtl ? 4 : 0,
                  borderLeftWidth: isRtl ? 0 : 4,
                  borderRightColor: isRtl ? theme.warning : undefined,
                  borderLeftColor: isRtl ? undefined : theme.warning,
                }}
              >
                <Text role="bodyStrong" style={{ textAlign: isRtl ? 'right' : 'left' }}>إيداع COD مطلوب</Text>
                <Text role="bodySm" tone="muted" style={{ textAlign: isRtl ? 'right' : 'left' }}>
                  المبلغ المحصّل ذمة مستحقة على الكابتن حتى يتم الإيداع والمطابقة.
                </Text>
              </Box>
            </Box>
          </ActionStrip>

          {/* 3. الأرباح */}
          <ActionStrip
            icon="trending-up-outline"
            title="الأرباح"
            subtitle={`إجمالي الأرباح: ${pendingPayout.toLocaleString()} ر.ي`}
            expanded={expandedSection === 'earnings'}
            onPress={() => setExpandedSection(expandedSection === 'earnings' ? null : 'earnings')}
          >
            <Box gap={3} style={{ paddingY: 8 }}>
              <Text role="label" tone="muted" style={{ textAlign: isRtl ? 'right' : 'left' }}>
                الأرباح والمكاسب التشغيلية
              </Text>
              <KeyValueList
                dense
                items={[
                  { label: 'إجمالي الأرباح', value: `${pendingPayout.toLocaleString()} ر.ي`, tone: 'success' },
                  { label: 'المدفوعات المتوقعة', value: `${pendingPayout.toLocaleString()} ر.ي`, tone: 'warning' },
                  { label: 'دورة الأرباح', value: 'أسبوعية', tone: 'default' },
                  { label: 'موعد الدفع', value: 'الخميس القادم', tone: 'info' },
                ]}
              />
              <Box gap={2}>
                {records.filter((r) => r.kind === 'captain-earning').map((r) => <RecordRow key={r.id} record={r} />)}
              </Box>
            </Box>
          </ActionStrip>

          {/* 4. التسوية */}
          <ActionStrip
            icon="sync-outline"
            title="التسوية"
            subtitle={`أرباح معلقة للتسوية: ${pendingPayout.toLocaleString()} ر.ي · مبلغ التسوية المدفوع: ${settledAmount.toLocaleString()} ر.ي`}
            expanded={expandedSection === 'settlement'}
            onPress={() => setExpandedSection(expandedSection === 'settlement' ? null : 'settlement')}
          >
            <Box gap={3} style={{ paddingY: 8 }}>
              <Text role="label" tone="muted" style={{ textAlign: isRtl ? 'right' : 'left' }}>
                التسوية والدورة المالية
              </Text>
              <KeyValueList
                dense
                items={[
                  { label: 'أرباح معلقة للتسوية', value: `${pendingPayout.toLocaleString()} ر.ي`, tone: pendingPayout > 0 ? 'warning' : 'default' },
                  { label: 'مبلغ التسوية المدفوع', value: `${settledAmount.toLocaleString()} ر.ي`, tone: 'success' },
                  { label: 'الدورة', value: 'أسبوعية - كل خميس', tone: 'default' },
                ]}
              />

              {settlementSuccess && (
                <StateView
                  tone="success"
                  title="تم طلب التسوية بنجاح!"
                  description="تم إرسال طلب الصرف وجاري تحويل أرباحك إلى حسابك البنكي المعتمد."
                />
              )}

              {pendingPayout > 0 ? (
                !settlementSuccess && (
                  <Box gap={2} style={{ paddingVertical: 4 }}>
                    <Button
                      label={`طلب تسوية المستحقات (${pendingPayout.toLocaleString()} ر.ي)`}
                      tone="primary"
                      loading={settlementLoading}
                      disabled={settlementLoading}
                      fullWidth
                      onPress={handleRequestSettlement}
                    />
                    <Text role="caption" tone="muted" style={{ textAlign: isRtl ? 'right' : 'left' }}>
                      سيتم معالجة الطلب وصرف الأرباح لحسابك البنكي مباشرة.
                    </Text>
                  </Box>
                )
              ) : (
                !settlementSuccess && (
                  <Box
                    gap={1}
                    style={{
                      paddingVertical: spacing[2],
                      paddingHorizontal: spacing[3],
                      borderRightWidth: isRtl ? 4 : 0,
                      borderLeftWidth: isRtl ? 0 : 4,
                      borderRightColor: isRtl ? theme.success : undefined,
                      borderLeftColor: isRtl ? undefined : theme.success,
                    }}
                  >
                    <Text role="bodyStrong" style={{ textAlign: isRtl ? 'right' : 'left' }}>لا يوجد مستحقات معلقة</Text>
                    <Text role="bodySm" tone="muted" style={{ textAlign: isRtl ? 'right' : 'left' }}>
                      تم تسوية وصرف جميع الأرباح المحتسبة للأسبوع الحالي.
                    </Text>
                  </Box>
                )
              )}
            </Box>
          </ActionStrip>
        </Box>
      </MobileScrollView>
    </View>
  );
}

export default WltDshCaptainBridge;
