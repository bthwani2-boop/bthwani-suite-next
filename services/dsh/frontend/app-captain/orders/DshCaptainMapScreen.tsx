import React from 'react';
import { Badge, Box, Button, KeyValueList, SectionHeader, Surface, Text } from '@bthwani/ui-kit';
import { DshOperationScreen } from '../DshOperationScreen';

const SurfaceAny = Surface as any;
import { getDshCaptainFlowPolicy } from '../dsh-captain-binding.contracts';
import { getDshFlowPolicySummary } from '../../shared/runtime/dsh-flow-registry';
import type { DshCaptainLifecycleStatus } from '../../shared/delivery';
import { type DshOperationScreenState } from '../DshOperationScreen';

type CaptainFieldStage = 'to-store' | 'to-customer' | 'near-customer' | 'at-door' | 'bell-rang' | 'proof';
type CaptainHeartbeatState = { lastUpdateMinutesAgo: number; etaMinutes: number | null };

const HEARTBEAT_INTERVAL_MS = 3 * 60 * 1000;

const STAGE_COORDINATES: Record<CaptainFieldStage, { lat: number; lng: number }> = {
  'to-store': { lat: 15.3200, lng: 44.1200 },
  'to-customer': { lat: 15.3220, lng: 44.1220 },
  'near-customer': { lat: 15.3240, lng: 44.1240 },
  'at-door': { lat: 15.3250, lng: 44.1250 },
  'bell-rang': { lat: 15.3251, lng: 44.1251 },
  'proof': { lat: 15.3252, lng: 44.1252 },
};

function useCaptainHeartbeat(stage: CaptainFieldStage): CaptainHeartbeatState {
  const [state, setState] = React.useState<CaptainHeartbeatState>({
    lastUpdateMinutesAgo: 0,
    etaMinutes: stage === 'to-store' ? 8 : stage === 'to-customer' ? 12 : stage === 'near-customer' ? 4 : 1,
  });

  React.useEffect(() => {
    const timer = setInterval(() => {
      setState((prev) => ({
        lastUpdateMinutesAgo: prev.lastUpdateMinutesAgo + 3,
        etaMinutes: prev.etaMinutes !== null ? Math.max(0, prev.etaMinutes - 3) : null,
      }));
    }, HEARTBEAT_INTERVAL_MS);

    return () => clearInterval(timer);
  }, [stage]);

  return state;
}

const STAGE_CONFIG: Record<CaptainFieldStage, { title: string; description: string; nextStage: CaptainFieldStage | null; action: string; proximityLabel: string | null; lifecycleStatus: string }> = {
  'to-store': {
    title: 'التوجه للمتجر',
    description: 'في الطريق لاستلام الطلب من المتجر.',
    nextStage: 'to-customer',
    action: 'تأكيد الاستلام من المتجر',
    proximityLabel: null,
    lifecycleStatus: 'enroute_to_pickup',
  },
  'to-customer': {
    title: 'التوصيل للعميل',
    description: 'الطلب معك وأنت في الطريق للعميل.',
    nextStage: 'near-customer',
    action: 'تأكيد الاقتراب من العميل',
    proximityLabel: null,
    lifecycleStatus: 'enroute_to_dropoff',
  },
  'near-customer': {
    title: 'قريب من العميل',
    description: 'أنت على مقربة من موقع التسليم.',
    nextStage: 'at-door',
    action: 'تأكيد الوصول للموقع',
    proximityLabel: 'near_customer',
    lifecycleStatus: 'near_customer',
  },
  'at-door': {
    title: 'عند باب العميل',
    description: 'وصلت لموقع التسليم. أخطر العميل بوصولك.',
    nextStage: 'bell-rang',
    action: 'قرع الجرس',
    proximityLabel: 'at_door',
    lifecycleStatus: 'at_door',
  },
  'bell-rang': {
    title: 'تم قرع الجرس',
    description: 'أُرسل إشعار الوصول. انتظر العميل أو انتقل لإثبات التسليم.',
    nextStage: 'proof',
    action: 'انتقل لإثبات التسليم',
    proximityLabel: 'bell_rang',
    lifecycleStatus: 'bell_rang',
  },
  'proof': {
    title: 'إثبات التسليم',
    description: 'ثبّت استلام العميل للطلب وأغلق المهمة.',
    nextStage: null,
    action: 'رفع الإثبات الآن',
    proximityLabel: null,
    lifecycleStatus: 'arrived_at_dropoff',
  },
};

export interface DshCaptainMapScreenProps {
  readonly orderId: string;
  readonly captainId?: string;
  readonly onBack: () => void;
  readonly onPushLocation: (push: {
    readonly orderId: string;
    readonly captainId: string;
    readonly latitude: number;
    readonly longitude: number;
    readonly lifecycleStatus: string;
    readonly orderStatus?: DshCaptainLifecycleStatus;
  }) => Promise<unknown>;
}

export function DshCaptainMapScreen({
  orderId,
  captainId = 'captain-1',
  onBack,
  onPushLocation,
}: DshCaptainMapScreenProps) {
  const [taskStage, setTaskStage] = React.useState<CaptainFieldStage>('to-store');
  const [stagesVisible, setStagesVisible] = React.useState(false);
  const [screenState, setScreenState] = React.useState<DshOperationScreenState>('ready');
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);

  const heartbeat = useCaptainHeartbeat(taskStage);
  const config = STAGE_CONFIG[taskStage];
  const mapFlowPolicy = getDshCaptainFlowPolicy('captain-map-navigation');
  const mapFlowSummary = getDshFlowPolicySummary('captain-map-navigation');

  const advanceStage = async () => {
    const next = config.nextStage;
    if (!next) return;

    setScreenState('loading');
    setErrorMessage(null);
    setSuccessMessage(null);

    let nextOrderStatus: 'EN_ROUTE' | 'ARRIVED' | undefined;
    if (next === 'to-customer') {
      nextOrderStatus = 'EN_ROUTE';
    } else if (next === 'proof') {
      nextOrderStatus = 'ARRIVED';
    }

    try {
      await onPushLocation({
        orderId,
        captainId,
        latitude: STAGE_COORDINATES[next].lat,
        longitude: STAGE_COORDINATES[next].lng,
        lifecycleStatus: STAGE_CONFIG[next].lifecycleStatus,
        orderStatus: nextOrderStatus as any,
      });
      setTaskStage(next);
      setScreenState('ready');
      setSuccessMessage(`تم تحديث المرحلة إلى ${STAGE_CONFIG[next].title} بنجاح.`);
    } catch (err: any) {
      setScreenState('ready');
      setErrorMessage(err?.body || 'فشل تحديث موقع الكابتن.');
    }
  };

  const handleStageSelect = async (stage: CaptainFieldStage) => {
    setScreenState('loading');
    setErrorMessage(null);
    setSuccessMessage(null);

    let nextOrderStatus: 'EN_ROUTE' | 'ARRIVED' | undefined;
    if (stage === 'to-customer') {
      nextOrderStatus = 'EN_ROUTE';
    } else if (stage === 'proof') {
      nextOrderStatus = 'ARRIVED';
    }

    try {
      await onPushLocation({
        orderId,
        captainId,
        latitude: STAGE_COORDINATES[stage].lat,
        longitude: STAGE_COORDINATES[stage].lng,
        lifecycleStatus: STAGE_CONFIG[stage].lifecycleStatus,
        orderStatus: nextOrderStatus as any,
      });
      setTaskStage(stage);
      setScreenState('ready');
      setSuccessMessage(`تم الانتقال إلى ${STAGE_CONFIG[stage].title} بنجاح.`);
    } catch (err: any) {
      setScreenState('ready');
      setErrorMessage(err?.body || 'فشل الانتقال إلى المرحلة المحددة.');
    }
  };

  const proximityTone = config.proximityLabel === 'bell_rang'
    ? 'action' as const
    : config.proximityLabel === 'at_door'
      ? 'success' as const
      : config.proximityLabel === 'near_customer'
        ? 'warning' as const
        : 'info' as const;

  return (
    <DshOperationScreen
      state={screenState}
      title="التنفيذ الميداني"
      subtitle={`شاشة داخلية للكابتن للطلب ${orderId} — تحديث الموقع كل 3 دقائق.`}
      content={
        <Box gap={3}>
          {errorMessage && (
            <SurfaceAny tone="danger" padding={3} radiusToken="md">
              <Text role="bodySm" tone="danger" style={{ textAlign: 'right' }}>{errorMessage}</Text>
            </SurfaceAny>
          )}
          {successMessage && (
            <SurfaceAny tone="brand" padding={3} radiusToken="md">
              <Text role="bodySm" tone="success" style={{ textAlign: 'right' }}>{successMessage}</Text>
            </SurfaceAny>
          )}

          <SurfaceAny tone="brand" gap={3}>
            <Box layoutDirection="row" justify="space-between" align="center" gap={2}>
              <Text role="bodyStrong">{config.title}</Text>
              <Badge label="مهمة نشطة" tone="action" />
            </Box>
            <Text role="bodySm" tone="muted">{config.description}</Text>
            {config.proximityLabel && (
              <Badge label={config.proximityLabel === 'near_customer' ? 'قريب من العميل' : config.proximityLabel === 'at_door' ? 'عند الباب' : 'تم قرع الجرس'} tone={proximityTone} />
            )}
            <SurfaceAny tone="inset" gap={2} padding={3} radiusToken="lg">
              <Text role="bodyStrong" style={{ textAlign: 'right' }}>سياسة شاشة الملاحة</Text>
              <Text role="bodySm" tone="muted" style={{ textAlign: 'right' }}>
                {mapFlowSummary?.nextPolicyActionPreview ?? 'هذه شاشة تعرض ملخص التنفيذ أولًا، وتبقي المحطات التفصيلية خلف فتح صريح.'}
              </Text>
              <Text role="caption" tone="muted" style={{ textAlign: 'right' }}>
                {`النمط الحالي: ${mapFlowPolicy ?? 'summary-only'} · لا تظهر مشكلات الشريك الداخلية هنا.`}
              </Text>
            </SurfaceAny>
          </SurfaceAny>

          <SurfaceAny tone="raised" gap={3}>
            <SectionHeader title="حالة التحديث" subtitle="تحديث الموقع داخلي كل 3 دقائق — لا GPS live للعميل." />
            <KeyValueList
              items={[
                { label: 'آخر تحديث', value: heartbeat.lastUpdateMinutesAgo === 0 ? 'الآن' : `منذ ${heartbeat.lastUpdateMinutesAgo} دقيقة` },
                { label: 'الوقت التقريبي', value: heartbeat.etaMinutes !== null ? `${heartbeat.etaMinutes} دقيقة` : 'وصلت' },
                { label: 'إحداثيات الكابتن', value: `(${STAGE_COORDINATES[taskStage].lat.toFixed(4)}, ${STAGE_COORDINATES[taskStage].lng.toFixed(4)})` },
                { label: 'حالة المرحلة', value: config.lifecycleStatus, tone: 'action' as any },
              ]}
            />
          </SurfaceAny>

          <SurfaceAny tone="inset" gap={3}>
            <SectionHeader title="محطات التنفيذ" subtitle="المحطات التفصيلية تفتح عند الطلب فقط." />
            <Button
              label={stagesVisible ? 'إخفاء المحطات' : 'فتح المحطات'}
              tone={stagesVisible ? 'secondary' : 'ghost'}
              size="sm"
              fullWidth={false}
              onPress={() => setStagesVisible((current) => !current)}
            />
            {stagesVisible ? (
              <Box layoutDirection="row" gap={2} style={{ flexWrap: 'wrap' }}>
                {(Object.keys(STAGE_CONFIG) as CaptainFieldStage[]).map((stage) => (
                  <Button
                    key={stage}
                    label={STAGE_CONFIG[stage].title}
                    tone={taskStage === stage ? 'primary' : 'secondary'}
                    size="sm"
                    fullWidth={false}
                    onPress={() => handleStageSelect(stage)}
                  />
                ))}
              </Box>
            ) : (
              <Text role="caption" tone="muted" style={{ textAlign: 'right' }}>
                افتح المحطات فقط عندما تحتاج تعديل مرحلة التنفيذ أو مراجعة التقدم.
              </Text>
            )}
          </SurfaceAny>
        </Box>
      }
      primaryActionLabel={config.action}
      secondaryActionLabel={config.nextStage ? 'المرحلة التالية' : undefined}
      tertiaryActionLabel="العودة للتفاصيل"
      onPrimaryAction={advanceStage}
      onSecondaryAction={config.nextStage ? advanceStage : undefined}
      onTertiaryAction={onBack}
    />
  );
}

export default DshCaptainMapScreen;
