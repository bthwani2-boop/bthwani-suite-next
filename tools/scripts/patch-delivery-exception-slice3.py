from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def read(path: str) -> str:
    return (ROOT / path).read_text(encoding="utf-8")


def write(path: str, content: str) -> None:
    target = ROOT / path
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(content, encoding="utf-8")


def patch_runtime() -> None:
    path = "services/dsh/frontend/shared/delivery/use-captain-order-runtime.ts"
    text = read(path)
    if "CaptainDeliveryExceptionDraft" not in text:
        text = text.replace(
            "import { updateForegroundDispatchLocation } from '../dispatch/dispatch-location.api';\n",
            "import { updateForegroundDispatchLocation } from '../dispatch/dispatch-location.api';\nimport type { DshDeliveryException, DshDeliveryExceptionReasonCode } from '../dispatch/dispatch.types';\n",
            1,
        )
        text = text.replace(
            "export type DshCaptainLocationPush = {",
            "export type CaptainDeliveryExceptionDraft = {\n  readonly reasonCode: DshDeliveryExceptionReasonCode;\n  readonly note: string;\n};\n\nexport type DshCaptainLocationPush = {",
            1,
        )
    old = '''  const failDelivery = React.useCallback(\n    (assignmentId: string, _captainId: string) => reportDeliveryException(assignmentId, {\n      reasonCode: 'proof_unavailable',\n      note: 'تعذر إكمال إثبات التسليم؛ تم تحويل المهمة إلى مراجعة العمليات.',\n      correlationId: `${assignmentId}-${Date.now()}-${Math.random().toString(36).slice(2)}` ,\n    }),\n    [],\n  );'''
    new = '''  const failDelivery = React.useCallback(\n    async (assignmentId: string, _captainId: string, draft: CaptainDeliveryExceptionDraft): Promise<DshDeliveryException> => {\n      let coordinates: DshCaptainCoordinates | undefined;\n      try {\n        coordinates = await readCaptainForegroundLocation();\n      } catch {\n        // Location is valuable evidence but must not block safety or incident reporting.\n      }\n      return reportDeliveryException(assignmentId, {\n        reasonCode: draft.reasonCode,\n        note: draft.note.trim(),\n        correlationId: `${assignmentId}-${Date.now()}-${Math.random().toString(36).slice(2)}`,\n        ...(coordinates ? { latitude: coordinates.latitude, longitude: coordinates.longitude } : {}),\n      });\n    },\n    [],\n  );'''
    if new not in text:
        if old not in text:
            raise RuntimeError("captain failDelivery runtime anchor not found")
        text = text.replace(old, new, 1)
    write(path, text)


def patch_delivery_actions() -> None:
    path = "services/dsh/frontend/shared/delivery/delivery.actions.ts"
    text = read(path)
    if "CaptainDeliveryExceptionDraft" not in text:
        text = text.replace(
            "import { useCaptainOrderRuntime } from './use-captain-order-runtime';",
            "import { useCaptainOrderRuntime, type CaptainDeliveryExceptionDraft } from './use-captain-order-runtime';",
            1,
        )
    old = '''  const reportPodFailure = React.useCallback(async () => {\n    if (!captainRuntimeId || !activeAssignmentId) return void setCaptainPodState('error');\n    if (!DSH_CAPTAIN_CONTRACT_CAPABILITIES.failDelivery) {\n      setCaptainPodState('error');\n      return;\n    }\n    try {\n      await captainOrderRuntime.failDelivery(activeAssignmentId, captainRuntimeId);\n      setCaptainPodState('retry-required');\n      if (captainAppMode === 'store_courier_mode') setStoreCourierStage('delivery_failed' as StoreCourierStage);\n    } catch (err) {\n      console.error('[captain:pod-fail]', err);\n      setCaptainPodState('error');\n    }\n  }, [activeAssignmentId, captainOrderRuntime, captainRuntimeId, captainAppMode, setCaptainPodState, setStoreCourierStage]);'''
    new = '''  const reportPodFailure = React.useCallback(async (draft: CaptainDeliveryExceptionDraft) => {\n    if (!captainRuntimeId || !activeAssignmentId) {\n      setCaptainPodState('error');\n      return undefined;\n    }\n    if (!DSH_CAPTAIN_CONTRACT_CAPABILITIES.failDelivery || captainAppMode === 'store_courier_mode') {\n      setCaptainPodState('error');\n      return undefined;\n    }\n    setCaptainPodState('loading');\n    try {\n      const exception = await captainOrderRuntime.failDelivery(activeAssignmentId, captainRuntimeId, draft);\n      setCaptainPodState('ready');\n      return exception;\n    } catch (err) {\n      console.error('[captain:delivery-exception]', err);\n      setCaptainPodState('error');\n      return undefined;\n    }\n  }, [activeAssignmentId, captainOrderRuntime, captainRuntimeId, captainAppMode, setCaptainPodState]);'''
    if new not in text:
        if old not in text:
            raise RuntimeError("captain reportPodFailure action anchor not found")
        text = text.replace(old, new, 1)
    write(path, text)


def patch_pod_state() -> None:
    path = "services/dsh/frontend/shared/media/pod/pod-upload-flow.ts"
    text = read(path).replace(" | 'retry-required'", "")
    write(path, text)


def write_pod_screen() -> None:
    write(
        "services/dsh/frontend/app-captain/orders/DshCaptainPoDSubmissionScreen.tsx",
        '''import React from 'react';
import { Pressable, StyleSheet, View, Image } from 'react-native';
import {
  Badge,
  Box,
  Button,
  Divider,
  Icon,
  SectionHeader,
  StateView,
  Text,
  TextField,
  useTheme,
  colorPalette,
  alpha,
  spacing,
} from '@bthwani/ui-kit';
import { DshOperationScreen } from '../DshOperationScreen';
import { fetchCaptainDeliveryException } from '../../shared/dispatch/dispatch.api';
import type { DshDeliveryException, DshDeliveryExceptionReasonCode } from '../../shared/dispatch/dispatch.types';
import type { CaptainDeliveryExceptionDraft } from '../../shared/delivery/use-captain-order-runtime';

export type DshCaptainPoDSubmissionScreenProps = {
  readonly state?: 'ready' | 'loading' | 'success' | 'error' | 'rejected';
  readonly assignmentId: string;
  readonly orderId: string;
  readonly exceptionReportingEnabled: boolean;
  readonly onCapturePhoto: () => void;
  readonly onConfirm: () => void;
  readonly onReportFailure: (draft: CaptainDeliveryExceptionDraft) => Promise<DshDeliveryException | undefined>;
  readonly onBack?: () => void;
  readonly onRetry?: () => void;
  readonly photoUri?: string;
};

const DELIVERY_EXCEPTION_REASONS: ReadonlyArray<{
  readonly code: DshDeliveryExceptionReasonCode;
  readonly label: string;
  readonly description: string;
}> = [
  { code: 'customer_unreachable', label: 'تعذر الوصول إلى العميل', description: 'لا يرد العميل بعد محاولات اتصال موثقة.' },
  { code: 'recipient_refused', label: 'رفض المستلم', description: 'المستلم حاضر لكنه رفض استلام الطلب.' },
  { code: 'wrong_address', label: 'العنوان غير صحيح', description: 'بيانات الموقع لا تقود إلى عنوان صالح.' },
  { code: 'unsafe_location', label: 'الموقع غير آمن', description: 'يوجد خطر مباشر يمنع إكمال التسليم.' },
  { code: 'vehicle_breakdown', label: 'عطل المركبة', description: 'تعذر استمرار الرحلة بسبب عطل فعلي.' },
  { code: 'accident', label: 'حادث', description: 'حادث يتطلب تدخل العمليات فورًا.' },
  { code: 'damaged_order', label: 'تضرر الطلب', description: 'الطلب غير صالح للتسليم بحالته الحالية.' },
  { code: 'cash_collection_issue', label: 'مشكلة تحصيل نقدي', description: 'تعذر إغلاق مبلغ COD وفق الحقيقة الفعلية.' },
  { code: 'weather_or_road_block', label: 'طقس أو طريق مغلق', description: 'عائق طريق أو طقس يمنع الوصول.' },
  { code: 'proof_unavailable', label: 'تعذر إثبات التسليم', description: 'لا يمكن إنشاء إثبات صالح رغم وجود المستلم.' },
  { code: 'other', label: 'سبب آخر', description: 'سبب تشغيلي غير مصنف يتطلب شرحًا واضحًا.' },
];

const REASON_LABELS = Object.fromEntries(
  DELIVERY_EXCEPTION_REASONS.map((item) => [item.code, item.label]),
) as Record<DshDeliveryExceptionReasonCode, string>;

function isNotFound(error: unknown): boolean {
  const typed = error as { status?: number; body?: { code?: string } };
  return typed.status === 404 || typed.body?.code === 'NOT_FOUND';
}

export function DshCaptainPoDSubmissionScreen({
  state = 'ready',
  assignmentId,
  orderId,
  exceptionReportingEnabled,
  onCapturePhoto,
  onConfirm,
  onReportFailure,
  onBack,
  onRetry,
  photoUri,
}: DshCaptainPoDSubmissionScreenProps) {
  const theme = useTheme() as { surfaceInset?: string; brandStrong?: string; text?: string };
  const [proofGuideVisible, setProofGuideVisible] = React.useState(false);
  const [proofPreviewVisible, setProofPreviewVisible] = React.useState(false);
  const [exceptionFormVisible, setExceptionFormVisible] = React.useState(false);
  const [reasonCode, setReasonCode] = React.useState<DshDeliveryExceptionReasonCode>('customer_unreachable');
  const [reasonNote, setReasonNote] = React.useState('');
  const [activeException, setActiveException] = React.useState<DshDeliveryException | null>(null);
  const [exceptionLoadError, setExceptionLoadError] = React.useState<string | null>(null);
  const [reporting, setReporting] = React.useState(false);

  const loadException = React.useCallback(async () => {
    if (!assignmentId) return;
    try {
      const item = await fetchCaptainDeliveryException(assignmentId);
      setActiveException(item);
      setExceptionLoadError(null);
    } catch (error) {
      if (isNotFound(error)) {
        setActiveException(null);
        setExceptionLoadError(null);
        return;
      }
      setExceptionLoadError(error instanceof Error ? error.message : 'تعذر قراءة قرار العمليات الحالي.');
    }
  }, [assignmentId]);

  React.useEffect(() => {
    void loadException();
    const interval = setInterval(() => void loadException(), 10_000);
    return () => clearInterval(interval);
  }, [loadException]);

  const submitException = React.useCallback(async () => {
    if (reasonNote.trim().length < 5) return;
    setReporting(true);
    setExceptionLoadError(null);
    try {
      const item = await onReportFailure({ reasonCode, note: reasonNote.trim() });
      if (item) {
        setActiveException(item);
        setExceptionFormVisible(false);
        setReasonNote('');
      }
    } catch (error) {
      setExceptionLoadError(error instanceof Error ? error.message : 'تعذر إرسال الاستثناء إلى DSH.');
    } finally {
      setReporting(false);
    }
  }, [onReportFailure, reasonCode, reasonNote]);

  if (activeException) {
    return (
      <View style={styles.root}>
        <StateView
          tone={activeException.severity === 'critical' ? 'danger' : 'warning'}
          title={activeException.status === 'acknowledged' ? 'العمليات تراجع الاستثناء' : 'تم رفع الاستثناء إلى العمليات'}
          description={`${REASON_LABELS[activeException.reasonCode]}${activeException.note ? ` — ${activeException.note}` : ''}. توقفت انتقالات المهمة وإثبات التسليم مؤقتًا، بينما يبقى تحديث GPS فعالًا.`}
          actionLabel="تحديث قرار العمليات"
          onActionPress={() => void loadException()}
        />
        {onBack ? <Button label="العودة إلى المهمة" tone="secondary" onPress={onBack} /> : null}
      </View>
    );
  }

  if (state === 'success') {
    return (
      <View style={styles.root}>
        <StateView tone="success" title="تم رفع الإثبات بنجاح" description="ثبت DSH إثبات التسليم وأغلق المهمة وفق حالتها الحقيقية." actionLabel="العودة لصندوق الطلبات" onActionPress={onBack} />
      </View>
    );
  }

  if (state === 'rejected') {
    return (
      <View style={styles.root}>
        <StateView tone="danger" title="رُفض إثبات التسليم" description="الإثبات لا يطابق المتطلبات. التقط إثباتًا جديدًا أو ارفع استثناءً مصنفًا للعمليات." actionLabel="التقاط صورة جديدة" onActionPress={onCapturePhoto} />
      </View>
    );
  }

  if (state === 'error') {
    return (
      <View style={styles.root}>
        <StateView tone="warning" title="تعذر تنفيذ العملية" description={exceptionLoadError ?? 'تعذر إكمال العملية مع DSH. تحقق من الاتصال وأعد المحاولة.'} actionLabel="إعادة المحاولة" onActionPress={onRetry} />
      </View>
    );
  }

  return (
    <DshOperationScreen
      title="إثبات التسليم"
      subtitle={`الطلب ${orderId} · الإسناد ${assignmentId}`}
      content={
        <Box gap={4} style={{ paddingHorizontal: spacing[1] }}>
          <Box gap={3}>
            <Box layoutDirection="row" justify="space-between" align="center">
              <Badge label="إثبات مطلوب" tone="warning" />
              <Text role="caption" tone="muted">#{orderId}</Text>
            </Box>
            <Text role="bodySm" tone="muted">أرسل إثباتًا حقيقيًا، أو ارفع استثناءً مصنفًا يوقف التقدم حتى قرار العمليات.</Text>
          </Box>

          <Divider />

          <Pressable onPress={onCapturePhoto} style={[styles.photoContainer, { backgroundColor: theme.surfaceInset }]}> 
            {photoUri && proofPreviewVisible ? (
              <View style={styles.previewWrapper}>
                <Image source={{ uri: photoUri }} style={styles.previewImage} alt="" />
                <View style={styles.changeOverlay}>
                  <Icon name="camera-outline" size={24} color={colorPalette.white} />
                  <Text role="bodySm" style={{ color: colorPalette.white }}>تغيير الصورة</Text>
                </View>
              </View>
            ) : photoUri ? (
              <View style={styles.placeholderWrapper}>
                <Icon name="image-outline" size={40} tone="brand" />
                <Text role="titleMd" style={{ color: theme.brandStrong ?? theme.text }}>تم حفظ لقطة الإثبات</Text>
                <Text role="caption" tone="muted">افتح المعاينة عند الحاجة ثم ثبّت الإرسال.</Text>
              </View>
            ) : (
              <View style={styles.placeholderWrapper}>
                <Icon name="camera" size={48} tone="brand" />
                <Text role="titleMd" style={{ color: theme.brandStrong ?? theme.text }}>التقاط إثبات فعلي</Text>
                <Text role="caption" tone="muted">صورة واضحة في موقع التسليم</Text>
              </View>
            )}
          </Pressable>

          {photoUri ? <Button label={proofPreviewVisible ? 'إخفاء المعاينة' : 'عرض المعاينة'} tone="ghost" size="sm" fullWidth={false} onPress={() => setProofPreviewVisible((current) => !current)} /> : null}

          <Divider />

          <Box gap={2}>
            <SectionHeader title="شروط الإثبات الصحيح" subtitle="افتحها عند الحاجة قبل الإرسال." />
            <Button label={proofGuideVisible ? 'إخفاء الشروط' : 'فتح الشروط'} tone="ghost" size="sm" fullWidth={false} onPress={() => setProofGuideVisible((current) => !current)} />
            {proofGuideVisible ? (
              <Box gap={1}>
                <Text role="caption" tone="muted">• ظهور الطلب كاملًا وواضحًا.</Text>
                <Text role="caption" tone="muted">• وجود علامة مكان قابلة للتحقق إن أمكن.</Text>
                <Text role="caption" tone="muted">• عدم تصوير الوجوه أو بيانات حساسة دون ضرورة.</Text>
              </Box>
            ) : null}
          </Box>

          <Divider />

          {!exceptionReportingEnabled ? (
            <StateView tone="warning" title="استثناءات موصل المتجر منفصلة" description="هذه المهمة لا تستخدم إسناد كابتن المنصة؛ عالج الاستثناء من رحلة توصيل المتجر الحاكمة." />
          ) : (
            <Box gap={3}>
              <Button label={exceptionFormVisible ? 'إغلاق نموذج الاستثناء' : 'لا يمكنني إكمال التسليم'} tone="secondary" onPress={() => setExceptionFormVisible((current) => !current)} />
              {exceptionFormVisible ? (
                <Box gap={2}>
                  <Text role="bodyStrong">سبب الاستثناء</Text>
                  <Box layoutDirection="row" gap={2} style={{ flexWrap: 'wrap' }}>
                    {DELIVERY_EXCEPTION_REASONS.map((reason) => (
                      <Button key={reason.code} label={reason.label} tone={reasonCode === reason.code ? 'brand' : 'secondary'} size="sm" fullWidth={false} disabled={reporting} onPress={() => setReasonCode(reason.code)} />
                    ))}
                  </Box>
                  <Text role="caption" tone="muted">{DELIVERY_EXCEPTION_REASONS.find((reason) => reason.code === reasonCode)?.description}</Text>
                  <TextField label="التفاصيل التشغيلية" value={reasonNote} onChangeText={setReasonNote} placeholder="اكتب ما حدث فعليًا وما حاولت تنفيذه" multiline />
                  {exceptionLoadError ? <Text role="caption" tone="danger">{exceptionLoadError}</Text> : null}
                  <Button label={reporting ? 'جارٍ إرسال الاستثناء…' : 'إرسال الاستثناء إلى العمليات'} tone="danger" disabled={reporting || reasonNote.trim().length < 5} onPress={() => void submitException()} />
                </Box>
              ) : null}
            </Box>
          )}
        </Box>
      }
      primaryActionLabel="تأكيد وإرسال الإثبات"
      onPrimaryAction={onConfirm}
      primaryActionDisabled={!photoUri || state === 'loading' || reporting}
      primaryActionLoading={state === 'loading'}
      tertiaryActionLabel={onBack ? 'العودة إلى المهمة' : undefined}
      onTertiaryAction={onBack}
    />
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'center', gap: spacing[3] },
  photoContainer: { height: 240, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  placeholderWrapper: { alignItems: 'center', justifyContent: 'center', gap: spacing[2] },
  previewWrapper: { width: '100%', height: '100%' },
  previewImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  changeOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 48, backgroundColor: alpha(colorPalette.black, 0.5), flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: spacing[2] },
});
''',
    )


def patch_route_renderer() -> None:
    path = "services/dsh/frontend/app-captain/DshCaptainRouteRenderer.tsx"
    text = read(path)
    if "CaptainDeliveryExceptionDraft" not in text:
        text = text.replace(
            "  DshCaptainLocationPush,\n} from \"../shared/delivery\";",
            "  DshCaptainLocationPush,\n  CaptainDeliveryExceptionDraft,\n} from \"../shared/delivery\";",
            1,
        )
        text = text.replace(
            "import type { DshCaptainOrderBellItem, DshCaptainOrdersScreenState } from \"../shared/orders\";",
            "import type { DshCaptainOrderBellItem, DshCaptainOrdersScreenState } from \"../shared/orders\";\nimport type { DshDeliveryException } from \"../shared/dispatch/dispatch.types\";",
            1,
        )
    text = text.replace(
        "  readonly onReportPodFailure: () => void;",
        "  readonly onReportPodFailure: (draft: CaptainDeliveryExceptionDraft) => Promise<DshDeliveryException | undefined>;",
        1,
    )
    old = '''        <DshCaptainPoDSubmissionScreen\n          state={captainPodState}\n          orderId={activeOrderId}\n          onCapturePhoto={onCapturePhoto}\n          onConfirm={onConfirmPodSubmission}\n          onReportFailure={onReportPodFailure}\n          onRetry={onRetryPod}\n          onBack={captainPodState === "success" ? onGoToInbox : onBack}\n          {...(captainPodPhotoUri ? { photoUri: captainPodPhotoUri } : {})}\n        />'''
    new = '''        <DshCaptainPoDSubmissionScreen\n          state={captainPodState}\n          assignmentId={activeAssignmentId}\n          orderId={activeOrderId}\n          exceptionReportingEnabled={!isStoreCourierMode}\n          onCapturePhoto={onCapturePhoto}\n          onConfirm={onConfirmPodSubmission}\n          onReportFailure={onReportPodFailure}\n          onRetry={onRetryPod}\n          onBack={captainPodState === "success" ? onGoToInbox : onBack}\n          {...(captainPodPhotoUri ? { photoUri: captainPodPhotoUri } : {})}\n        />'''
    if new not in text:
        if old not in text:
            raise RuntimeError("PoD route renderer anchor not found")
        text = text.replace(old, new, 1)
    write(path, text)


def patch_surface() -> None:
    path = "services/dsh/frontend/app-captain/DshCaptainSurface.tsx"
    text = read(path)
    text = text.replace(
        "           onReportPodFailure={() => void actions.reportPodFailure()}",
        "           onReportPodFailure={(draft) => actions.reportPodFailure(draft)}",
        1,
    )
    write(path, text)


def main() -> None:
    patch_runtime()
    patch_delivery_actions()
    patch_pod_state()
    write_pod_screen()
    patch_route_renderer()
    patch_surface()
    print("Captain delivery-exception reporting surface applied.")


if __name__ == "__main__":
    main()
