import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Badge, Box, Button, KeyValueList, SectionHeader, Surface, Text, Icon, colorRoles, colorPalette, alpha } from '@bthwani/ui-kit';
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

// Map store and customer coordinate positions on our visual schematic map
const STORE_POS = { x: 128, y: 154, name: 'المتجر' };
const CUSTOMER_POS = { x: 234, y: 44, name: 'العميل' };

const CAPTAIN_POSITIONS: Record<CaptainFieldStage, { x: number; y: number }> = {
  'to-store': { x: 106, y: 176 },
  'to-customer': { x: 149, y: 132 },
  'near-customer': { x: 192, y: 88 },
  'at-door': { x: 213, y: 66 },
  'bell-rang': { x: 215, y: 64 },
  'proof': { x: 217, y: 62 },
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
    lifecycleStatus: 'PICKING_UP',
  },
  'to-customer': {
    title: 'التوجه للعميل',
    description: 'تم استلام الشحنة وجاري التوجه لموقع العميل.',
    nextStage: 'near-customer',
    action: 'تأكيد الاقتراب من العميل',
    proximityLabel: 'near_customer',
    lifecycleStatus: 'EN_ROUTE',
  },
  'near-customer': {
    title: 'الاقتراب من العميل',
    description: 'على بعد أقل من 500 متر من موقع العميل.',
    nextStage: 'at-door',
    action: 'تأكيد الوصول عند الباب',
    proximityLabel: 'at_door',
    lifecycleStatus: 'EN_ROUTE',
  },
  'at-door': {
    title: 'الوصول عند الباب',
    description: 'متواجد حالياً عند باب منزل العميل لتسليم الطلب.',
    nextStage: 'bell-rang',
    action: 'قرع الجرس',
    proximityLabel: 'bell_rang',
    lifecycleStatus: 'ARRIVED',
  },
  'bell-rang': {
    title: 'تم قرع الجرس',
    description: 'ينتظر استلام العميل للطلب وإثبات التسليم.',
    nextStage: 'proof',
    action: 'تسجيل إثبات التسليم',
    proximityLabel: 'bell_rang',
    lifecycleStatus: 'ARRIVED',
  },
  'proof': {
    title: 'إثبات التسليم المكتمل',
    description: 'تم التقاط صورة إثبات التسليم وإغلاق الطلب ماليًا.',
    nextStage: null,
    action: 'العودة للرئيسية',
    proximityLabel: null,
    lifecycleStatus: 'DELIVERED',
  },
};

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

  const captainPos = CAPTAIN_POSITIONS[taskStage];

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
            <SectionHeader title="خريطة التتبع الميداني" subtitle="عرض مباشر لمسار الكابتن بين المتجر والعميل" />
            
            {/* خريطة التنفيذ التفاعلية */}
            <View style={styles.mapContainer}>
              {/* Concentric grid lines */}
              <View style={[styles.mapCircle, { width: 120, height: 120, borderRadius: 60, top: 50, left: 100 }]} />
              <View style={[styles.mapCircle, { width: 220, height: 220, borderRadius: 110, top: 0, left: 50 }]} />
              <View style={[styles.mapRoad, { height: 1.5, width: "100%", top: 110, left: 0 }]} />
              <View style={[styles.mapRoad, { width: 1.5, height: "100%", left: 160, top: 0 }]} />

              {/* Store Pin */}
              <View style={[styles.storePin, { top: STORE_POS.y - 12, left: STORE_POS.x - 12 }]}>
                <Icon name="storefront" size={14} color={colorRoles.brandStructure} />
                <Text style={styles.pinLabel}>{STORE_POS.name}</Text>
              </View>

              {/* Customer Pin */}
              <View style={[styles.customerPin, { top: CUSTOMER_POS.y - 12, left: CUSTOMER_POS.x - 12 }]}>
                <Icon name="location" size={14} color={colorRoles.brandStructure} />
                <Text style={styles.pinLabel}>{CUSTOMER_POS.name}</Text>
              </View>

              {/* Captain Current Pin */}
              <View style={[styles.captainPin, { top: captainPos.y - 14, left: captainPos.x - 10 }]}>
                <View style={styles.userPinPulse} />
                <Icon name="bicycle" size={18} color={colorRoles.brandAction} />
              </View>
            </View>

            <KeyValueList
              items={[
                { label: 'آخر تحديث', value: heartbeat.lastUpdateMinutesAgo === 0 ? 'الآن' : `منذ ${heartbeat.lastUpdateMinutesAgo} دقيقة` },
                { label: 'الوقت التقريبي', value: heartbeat.etaMinutes !== null ? `${heartbeat.etaMinutes} دقيقة` : 'وصلت' },
                { label: 'إحداثيات الكابتن الحالي', value: `(${STAGE_COORDINATES[taskStage].lat.toFixed(4)}, ${STAGE_COORDINATES[taskStage].lng.toFixed(4)})` },
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

const styles = StyleSheet.create({
  mapContainer: {
    width: 320,
    height: 220,
    backgroundColor: colorRoles.surfaceBase,
    borderWidth: 1,
    borderColor: colorRoles.surfaceBase,
    borderRadius: 8,
    overflow: "hidden",
    alignSelf: "center",
    position: "relative",
    marginVertical: 4,
  },
  mapCircle: {
    position: "absolute",
    borderWidth: 1,
    borderColor: colorRoles.surfaceBase,
    borderStyle: "dashed",
  },
  mapRoad: {
    position: "absolute",
    backgroundColor: colorRoles.surfaceBase,
  },
  storePin: {
    position: "absolute",
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 4,
    zIndex: 2,
  },
  customerPin: {
    position: "absolute",
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 4,
    zIndex: 2,
  },
  captainPin: {
    position: "absolute",
    zIndex: 10,
  },
  pinLabel: {
    fontSize: 9,
    fontWeight: "bold",
    color: colorRoles.brandStructure,
    backgroundColor: alpha(colorPalette.white, 0.8),
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  userPinPulse: {
    position: "absolute",
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: alpha(colorRoles.brandAction, 0.3),
    top: -6,
    left: -6,
  },
});

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

// export default DshCaptainMapScreen; // Unused default export