import React from 'react';
import { ScrollView, View } from 'react-native';
import {
  Badge,
  Box,
  Button,
  Divider,
  Icon,
  MobileScrollView,
  SearchField,
  SectionHeader,
  StateView,
  Tabs,
  Text,
  TopBar,
  useDirection,
  spacing,
} from '@bthwani/ui-kit';
import type {
  DshPartnerOperationalFlowId,
  DshPartnerSupportCommandFilterId,
  DshPartnerSupportIssueCategoryId,
  DshPartnerSupportRouteId,
} from '../dsh-partner.types';
import { getPartnerOrderIssueCategorySpec } from '../orders/PartnerOrderIssuePanel';
import { isDshHiddenCompatFlow } from '../../shared/runtime/dsh-flow-registry';
import { resolveDshControlPanelSectionLabel } from '../../shared/runtime/dsh-control-panel-governance.map';
import { DSH_ORDER_LIFECYCLE_HANDOFFS, getHandoffsForSurface, getSurfaceObservation } from '../../shared/orders';
import { getSurfaceModeCapability } from '../../shared/orders';

export type PartnerSupportRouteId = DshPartnerSupportRouteId;

// Read-only metadata label — delegates to central Badge component; no hardcoded colors.
function ReadOnlyMetaLabel({
  label,
  tone = 'info',
}: {
  label: string;
  tone?: 'brand' | 'warning' | 'danger' | 'info' | 'success';
}) {
  return <Badge label={label} tone={tone} />;
}

type CaseLifecycle =
  | 'new'
  | 'handling'
  | 'proofRequested'
  | 'quickMessageSent'
  | 'escalated'
  | 'resolved'
  | 'rejected';

function resolveCaseLifecycleLabel(lifecycle: CaseLifecycle): string {
  const labels: Record<CaseLifecycle, string> = {
    new: 'الحالة: جديدة',
    handling: 'الحالة: قيد المعالجة',
    proofRequested: 'الحالة: بانتظار إثبات',
    quickMessageSent: 'الحالة: تم الرد السريع',
    escalated: 'الحالة: مصعّدة',
    resolved: 'الحالة: منجزة',
    rejected: 'الحالة: مرفوضة',
  };
  return labels[lifecycle];
}

type OperationsSupportCase = {
  id: string;
  orderRef: string;
  issueCategoryId: DshPartnerSupportIssueCategoryId;
  headline: string;
  summary: string;
  compactStatusLabel: string;
  compactStatusTone: 'brand' | 'warning' | 'danger' | 'info' | 'success';
  slaLabel: string;
  nextActionLabel: string;
  linkedFlowId?: DshPartnerOperationalFlowId;
  linkedSupportRoute?: DshPartnerSupportRouteId;
  filterIds: readonly Exclude<DshPartnerSupportCommandFilterId, 'all'>[];
  linkedParties: readonly string[];
  timeline: readonly string[];
  nextDecision: string;
  operationalNote: string;
  previewTags?: readonly string[];
  requiresProof?: boolean;
  requiresConversation?: boolean;
  allowRejectCancel?: boolean;
  hasSlaRisk?: boolean;
  requiresDecision?: boolean;
  activeOrder?: boolean;
};

const commandCenterFilterItems = [
  { value: 'all', label: 'الكل' },
  { value: 'urgent', label: 'عاجل' },
  { value: 'conversations', label: 'محادثات' },
  { value: 'inventory-branch', label: 'مخزون' },
  { value: 'escalation', label: 'تصعيد' },
] as const;

const runtimePartnerSupportCases: readonly OperationsSupportCase[] = [];

function resolvePartnerCaseOwnerLabel(item: OperationsSupportCase): string {
  if (item.issueCategoryId === 'payment-refund-review') {
    return 'قسم المالية';
  }

  if (item.issueCategoryId === 'item-unavailable' || item.issueCategoryId === 'wrong-item') {
    return 'قسم الكتالوج';
  }

  return 'قسم الدعم';
}

function resolvePartnerCaseOwnerNote(item: OperationsSupportCase): string {
  if (item.issueCategoryId === 'payment-refund-review') {
    return 'الأثر المالي يراجع من المالية فقط. هذه المساحة تعرض معاينة الوسم بلا أي استرداد أو تسوية مالية.';
  }

  if (item.issueCategoryId === 'item-unavailable' || item.issueCategoryId === 'wrong-item') {
    return 'تعديل السعر والمخزون يبقى محليًا للشريك، لكن الباركود والهوية والنشر وتعارضات الميديا يملكها قسم الكتالوج.';
  }

  return 'متابعة التذكرة والتصعيد يملكها الدعم داخل لوحة التحكم، بينما العميل يرى دعمه داخل الطلب فقط والكابتن يرى التسليم أو التوصيل فقط.';
}

const operationsSupportCases: readonly OperationsSupportCase[] = [
  {
    id: 'ops-case-4401',
    orderRef: 'ORD-4401',
    issueCategoryId: 'delayed-preparation',
    headline: 'طلب متأخر داخل الفرع',
    summary: 'التحضير تجاوز الحد المتوقع ويهدد وقت التسليم إذا لم يُتخذ قرار الآن.',
    compactStatusLabel: 'خطر المهلة',
    compactStatusTone: 'danger',
    slaLabel: 'متبقٍ 6 دقائق',
    nextActionLabel: 'ثبّت التحضير أو أعلن التأخير بوضوح',
    linkedFlowId: 'order-sla-risk',
    linkedSupportRoute: 'order-prepare',
    filterIds: ['active-orders', 'order-issues', 'escalation'],
    linkedParties: ['الفرع', 'الدعم', 'العميل'],
    timeline: ['10:42 ص وصل الطلب', '10:48 ص بدأ التحضير', '10:56 ص ظهرت إشارة تأخير'],
    nextDecision: 'إكمال التحضير الآن أو فتح تعويض زمني تشغيلي فقط.',
    operationalNote: 'لا تفتح استردادًا محليًا. المطلوب الآن قرار تشغيل ثم تحديث واضح داخل نفس الصفحة.',
    previewTags: ['تنبيه طلب'],
    hasSlaRisk: true,
    requiresDecision: true,
    activeOrder: true,
  },
  {
    id: 'ops-case-4391',
    orderRef: 'ORD-4391',
    issueCategoryId: 'item-unavailable',
    headline: 'نقص صنف مؤثر على الطلب',
    summary: 'عنصر أساسي غير متاح ويحتاج تعديل مخزون أو بديل قبل تثبيت الطلب.',
    compactStatusLabel: 'مخزون',
    compactStatusTone: 'warning',
    slaLabel: 'خلال 4 دقائق',
    nextActionLabel: 'عدّل المخزون أو افتح بديلًا واضحًا',
    linkedFlowId: 'order-issue-required',
    linkedSupportRoute: 'inventory-adjust',
    filterIds: ['active-orders', 'order-issues', 'inventory-branch'],
    linkedParties: ['الفرع', 'العميل', 'الدعم'],
    timeline: ['10:21 ص تم قبول الطلب', '10:24 ص اكتُشف نقص الصنف', '10:26 ص فُفتح تنبيه المخزون'],
    nextDecision: 'هل يوجد بديل مقبول؟ وإن لم يوجد فهل نرفع الحالة لمسار الرفض؟',
    operationalNote: 'تعديل المخزون يجب أن يبقى مختصرًا ومربوطًا بالطلب المرجعي فقط.',
    previewTags: ['مخزون'],
    requiresDecision: true,
    activeOrder: true,
  },
  {
    id: 'ops-case-4385',
    orderRef: 'ORD-4385',
    issueCategoryId: 'partner-reject-request',
    headline: 'طلب رفض مرفوع من الشريك',
    summary: 'الفرع يطلب رفض الطلب بسبب تعذّر التنفيذ ويحتاج سببًا تشغيليًا صريحًا.',
    compactStatusLabel: 'قرار',
    compactStatusTone: 'danger',
    slaLabel: 'يتطلب قرارًا الآن',
    nextActionLabel: 'راجع السبب ثم افتح مسار الرفض عند الضرورة فقط',
    linkedFlowId: 'order-reject',
    linkedSupportRoute: 'order-reject',
    filterIds: ['active-orders', 'order-issues', 'escalation'],
    linkedParties: ['الفرع', 'الدعم', 'العميل'],
    timeline: ['10:10 ص وصل الطلب', '10:15 ص تعذّر التنفيذ', '10:17 ص رُفع طلب الرفض'],
    nextDecision: 'إما تثبيت سبب رفض واضح أو إعادة الطلب إلى التحضير إذا زال العائق.',
    operationalNote: 'الرفض لا يصبح خطوة صامتة. يجب أن يبقى داخل مسار واضح مع سبب معلن.',
    previewTags: ['مسار رفض مخفي'],
    allowRejectCancel: true,
    requiresDecision: true,
    activeOrder: true,
  },
  {
    id: 'ops-case-4372',
    orderRef: 'ORD-4372',
    issueCategoryId: 'courier-not-arrived',
    headline: 'بانتظار الكابتن / الموصل',
    summary: 'الطلب جاهز لكن التسليم لم يكتمل لأن جهة الالتقاط لم تصل بعد.',
    compactStatusLabel: 'التسليم',
    compactStatusTone: 'brand',
    slaLabel: 'انتظار 12 دقيقة',
    nextActionLabel: 'راجع التسليم واطلب إثبات الوصول',
    linkedFlowId: 'order-alerts',
    linkedSupportRoute: 'order-handoff',
    filterIds: ['active-orders', 'escalation'],
    linkedParties: ['الفرع', 'الكابتن', 'الدعم'],
    timeline: ['09:54 ص اكتمل التحضير', '10:02 ص أُعلن الجاهزية', '10:06 ص لم يصل الكابتن بعد'],
    nextDecision: 'هل نثبت وصولًا قريبًا أم نرفع الحالة لتدخل تشغيلي أوسع؟',
    operationalNote: 'هذه الحالة تخص التسليم فقط؛ لا تجعلها شاشة عامة خارج سياق الطلب.',
    previewTags: ['التسليم'],
    requiresProof: true,
    hasSlaRisk: true,
    activeOrder: true,
  },
  {
    id: 'ops-case-4366',
    orderRef: 'ORD-4366',
    issueCategoryId: 'customer-not-responding',
    headline: 'العميل غير متجاوب',
    summary: 'التواصل مطلوب لتأكيد العنوان أو وقت التسليم، لكن آخر المحاولات بلا رد.',
    compactStatusLabel: 'محادثة',
    compactStatusTone: 'info',
    slaLabel: 'محاولة أخيرة خلال 3 دقائق',
    nextActionLabel: 'افتح المحادثة واطلب إثبات محاولة التواصل',
    linkedFlowId: 'order-chat-send',
    linkedSupportRoute: 'chat-send',
    filterIds: ['active-orders', 'conversations', 'escalation'],
    linkedParties: ['العميل', 'الفرع', 'الدعم'],
    timeline: ['10:05 ص خرج الطلب للتوصيل', '10:18 ص أول محاولة اتصال', '10:21 ص ما زال بلا رد'],
    nextDecision: 'إما تأكيد وقت بديل أو تصعيد عدم التجاوب إلى الدعم.',
    operationalNote: 'العميل يرى دعمه من داخل طلبه فقط؛ هنا نحن ندير أثر عدم التجاوب على تنفيذ الشريك.',
    previewTags: ['محادثة'],
    requiresConversation: true,
    hasSlaRisk: true,
    activeOrder: true,
  },
  {
    id: 'ops-case-4358',
    orderRef: 'ORD-4358',
    issueCategoryId: 'handoff-mismatch',
    headline: 'طلب معلّق أو غير مطابق للتسليم',
    summary: 'هناك تضارب بين جهة الالتقاط وحالة الخروج، ويجب تثبيت التسليم الصحيح قبل المتابعة.',
    compactStatusLabel: 'عدم تطابق',
    compactStatusTone: 'danger',
    slaLabel: 'تثبيت فوري',
    nextActionLabel: 'افتح التسليم واطلب إثباتًا قصيرًا',
    linkedFlowId: 'order-handoff',
    linkedSupportRoute: 'order-handoff',
    filterIds: ['active-orders', 'order-issues', 'escalation'],
    linkedParties: ['الفرع', 'الكابتن', 'موصل المتجر'],
    timeline: ['09:58 ص تغيّر وضع التنفيذ', '10:03 ص لم يُثبت التسليم', '10:09 ص ظهر التضارب'],
    nextDecision: 'اختر جهة الالتقاط الصحيحة ثم أعد المسار إلى الوضع السليم.',
    operationalNote: 'الكابتن يرى التسليم من رحلته فقط؛ هذا المركز يجمع أثر التسليم على تنفيذ الشريك.',
    previewTags: ['طلب إجراء مطلوب'],
    requiresProof: true,
    requiresDecision: true,
    activeOrder: true,
  },
  {
    id: 'ops-case-4351',
    orderRef: 'ORD-4351',
    issueCategoryId: 'wrong-item',
    headline: 'عنصر خاطئ يهدد الإرسال',
    summary: 'التحقق الأخير كشف عنصرًا غير مطابق ويجب إيقاف التسليم إلى حين المراجعة.',
    compactStatusLabel: 'مطابقة',
    compactStatusTone: 'warning',
    slaLabel: 'قبل التسليم',
    nextActionLabel: 'راجع العنصر واطلب إثباتًا بصريًا',
    linkedFlowId: 'order-issue-queue',
    linkedSupportRoute: 'order-issue-queue',
    filterIds: ['order-issues', 'inventory-branch'],
    linkedParties: ['الفرع', 'الدعم'],
    timeline: ['09:43 ص انتهى التجهيز', '09:47 ص ظهرت المراجعة', '09:50 ص أُوقفت الجاهزية مؤقتًا'],
    nextDecision: 'هل نصحح العنصر الآن أم نعيد الطلب إلى التحضير؟',
    operationalNote: 'المشكلة تخص المطابقة داخل الفرع. لا تكرّر بيانات الطلب في حالة منفصلة.',
    previewTags: ['إثبات'],
    requiresProof: true,
    requiresDecision: true,
  },
  {
    id: 'ops-case-4348',
    orderRef: 'ORD-4348',
    issueCategoryId: 'customer-not-responding',
    headline: 'محادثة تحتاج ردًا سريعًا',
    summary: 'آخر تحديث من العميل أو الدعم يحتاج ردًا من الفرع لتثبيت القرار التالي.',
    compactStatusLabel: 'رد سريع',
    compactStatusTone: 'info',
    slaLabel: 'رد خلال دقيقتين',
    nextActionLabel: 'افتح المحادثة أو استخدم ردًا سريعًا',
    linkedFlowId: 'order-quick-reply-config',
    linkedSupportRoute: 'quick-reply-config',
    filterIds: ['conversations'],
    linkedParties: ['الفرع', 'الدعم', 'العميل'],
    timeline: ['09:32 ص وصل تعليق العميل', '09:34 ص طُلب رد من الفرع'],
    nextDecision: 'هل يكفي رد سريع أم يجب فتح محادثة كاملة الآن؟',
    operationalNote: 'المحادثة تبقى مؤجلة؛ لا نحمّل تاريخًا طويلًا هنا.',
    previewTags: ['رد سريع'],
    requiresConversation: true,
  },
  {
    id: 'ops-case-4339',
    orderRef: 'ORD-4339',
    issueCategoryId: 'payment-refund-review',
    headline: 'مراجعة دفع / استرداد معاينة',
    summary: 'هناك أثر مالي محتمل على الطلب، لكن هذه الشاشة تعرض وسمًا تشغيليًا فقط دون أي تعديل مالي.',
    compactStatusLabel: 'معاينة مالية',
    compactStatusTone: 'info',
    slaLabel: 'معاينة ربط فقط',
    nextActionLabel: 'حوّل الحالة للقراءة فقط داخل الربط المالي',
    linkedFlowId: 'partner-finance-bridge',
    filterIds: ['order-issues', 'escalation'],
    linkedParties: ['الدعم', 'المالية', 'الفرع'],
    timeline: ['09:21 ص أُبلغ عن أثر مالي', '09:24 ص وُسمت الحالة كـ مراجعة معاينة'],
    nextDecision: 'هل تحتاج الحالة تصعيدًا للدعم فقط أم مجرد وسم حتى يراجعها قسم المالية؟',
    operationalNote: 'القسم المالي هو المالك الوحيد للاسترداد والتسوية والعمولة. هنا نظهر الإشارة فقط.',
    previewTags: ['مراجعة استرداد', 'ربط المحفظة المالي'],
    requiresDecision: true,
  },
] as const;



function resolveCaseMatchesFilter(
  item: OperationsSupportCase,
  filterId: DshPartnerSupportCommandFilterId
): boolean {
  if (filterId === 'all') {
    return true;
  }
  return item.filterIds.includes(filterId);
}

function resolveCaseSupportRoute(
  item: OperationsSupportCase
): DshPartnerSupportRouteId | undefined {
  return item.linkedSupportRoute;
}

function resolveCaseWorkspaceTarget(
  item: OperationsSupportCase
): DshPartnerSupportRouteId | null {
  const supportRoute = resolveCaseSupportRoute(item);
  if (supportRoute) {
    return supportRoute;
  }
  if (item.linkedFlowId && isDshHiddenCompatFlow(item.linkedFlowId)) {
    return null;
  }
  return null;
}

function getCasePriorityScore(item: OperationsSupportCase): number {
  let score = 0;
  if (item.hasSlaRisk && item.requiresDecision) {
    score += 100;
  } else if (item.requiresDecision) {
    score += 80;
  } else if (item.hasSlaRisk) {
    score += 60;
  } else if (item.requiresConversation) {
    score += 40;
  } else if (item.requiresProof) {
    score += 20;
  } else if (item.activeOrder) {
    score += 10;
  }
  return score;
}

function findBestCaseIdForSelection({
  filterId,
  caseId,
  supportRouteId,
  issueCategoryId,
}: {
  filterId: DshPartnerSupportCommandFilterId;
  caseId?: string | null;
  supportRouteId?: DshPartnerSupportRouteId | null;
  issueCategoryId?: DshPartnerSupportIssueCategoryId | null;
}): string | null {
  const visibleItems = operationsSupportCases.filter((item) => resolveCaseMatchesFilter(item, filterId));

  if (caseId && visibleItems.some((item) => item.id === caseId)) {
    return caseId;
  }

  if (supportRouteId) {
    const match = visibleItems.find((item) => item.linkedSupportRoute === supportRouteId);
    if (match) {
      return match.id;
    }
  }

  if (issueCategoryId) {
    const match = visibleItems.find((item) => item.issueCategoryId === issueCategoryId);
    if (match) {
      return match.id;
    }
  }

  return visibleItems[0]?.id ?? null;
}

function InlineActionPanel({
  item,
  onClose,
  onFeedback,
  onLifecycleChange,
  feedback,
}: {
  item: OperationsSupportCase;
  activeActionType: 'handle' | 'proof' | 'quick-message' | 'escalate' | 'reject' | null;
  onClose: () => void;
  onFeedback: (msg: string) => void;
  onLifecycleChange: (lifecycle: CaseLifecycle) => void;
  feedback?: string | null;
}) {
  const { direction } = useDirection();
  const textAlign = direction === 'rtl' ? 'right' : 'left';
  const rowDirection = direction === 'rtl' ? 'row-reverse' : 'row';

  return (
    <Box padding={2} gap={2} background="surfaceInset" radiusToken="md" style={{ marginVertical: 4 }}>
      <Text role="caption" tone="brand" style={{ textAlign }}>خيارات المعالجة الفورية</Text>

      <View style={{ flexDirection: rowDirection, flexWrap: 'wrap', gap: 6 }}>
        <Button
          label="تأكيد المعالجة"
          size="sm"
          fullWidth={false}
          onPress={() => {
            onLifecycleChange('handling');
            onFeedback(`تم تأكيد المعالجة التشغيلية لـ ${item.orderRef.replace('ORD-', 'طلب ')} بنجاح.`);
          }}
        />
        <Button
          label="طلب إثبات"
          size="sm"
          fullWidth={false}
          tone="secondary"
          onPress={() => {
            onLifecycleChange('proofRequested');
            onFeedback(`تم إرسال طلب إثبات رسمي لـ ${item.orderRef.replace('ORD-', 'طلب ')}.`);
          }}
        />
        <Button
          label="رسالة سريعة"
          size="sm"
          fullWidth={false}
          tone="secondary"
          onPress={() => {
            onLifecycleChange('quickMessageSent');
            onFeedback(`تم إرسال رد سريع لتأكيد المتابعة مع العميل.`);
          }}
        />
        <Button
          label="تصعيد"
          size="sm"
          fullWidth={false}
          tone="ghost"
          onPress={() => {
            onLifecycleChange('escalated');
            onFeedback(`تم تمييز الحالة للتصعيد التشغيلي. المالك للمتابعة الآن هو ${resolvePartnerCaseOwnerLabel(item)}.`);
          }}
        />
        {item.allowRejectCancel ? (
          <Button
            label="رفض / إلغاء"
            size="sm"
            fullWidth={false}
            tone="danger"
            onPress={() => {
              onLifecycleChange('rejected');
              onFeedback(`تم تسجيل الرفض الفوري لطلب الشريك.`);
            }}
          />
        ) : null}
        <Button
          label="إلغاء"
          size="sm"
          fullWidth={false}
          tone="ghost"
          onPress={onClose}
        />
      </View>

      {feedback ? (
        <Text role="caption" tone="success" style={{ textAlign, marginTop: spacing[1] }}>
          {feedback}
        </Text>
      ) : null}
    </Box>
  );
}

function InlineDetailsPanel({ item }: { item: OperationsSupportCase }) {
  const { direction } = useDirection();
  const textAlign = direction === 'rtl' ? 'right' : 'left';
  const rowDirection = direction === 'rtl' ? 'row-reverse' : 'row';

  return (
    <Box padding={2} gap={2} background="surfaceInset" radiusToken="md" style={{ marginVertical: 4 }}>
      <Text role="bodySm" style={{ textAlign }}>
        {item.summary}
      </Text>

      <View style={{ gap: 2, alignItems: direction === 'rtl' ? 'flex-end' : 'flex-start' }}>
        <Text role="caption" tone="brand" style={{ textAlign }}>
          {`القرار التالي: ${item.nextDecision}`}
        </Text>
        <Text role="caption" tone="soft" style={{ textAlign }}>
          {`ملاحظة: ${item.operationalNote}`}
        </Text>
      </View>

      {/* SSoT handoff lookup */}
      {item.linkedFlowId ? (() => {
        const handoff = DSH_ORDER_LIFECYCLE_HANDOFFS.find((h) => h.signalKind === item.linkedFlowId || h.handoffId === item.linkedFlowId || item.linkedFlowId?.includes(h.handoffId));
        if (!handoff) return null;
        return (
          <Box padding={2} background="surface" border borderTone="info" radiusToken="sm" style={{ marginVertical: 4 }}>
            <Text role="caption" tone="info" style={{ textAlign: direction === 'rtl' ? 'right' : 'left' }}>
              {`مسار نقل الصلاحية (SSoT): ${handoff.description}`}
            </Text>
          </Box>
        );
      })() : null}

      <View style={{ flexDirection: rowDirection, flexWrap: 'wrap', gap: spacing[1], alignItems: 'center' }}>
        <Text role="caption" tone="muted" style={{ textAlign }}>الأطراف:</Text>
        {item.linkedParties.map((party) => (
          <ReadOnlyMetaLabel key={party} label={party} tone="brand" />
        ))}
      </View>

      <View style={{ gap: 2 }}>
        <Text role="caption" tone="muted" style={{ textAlign }}>آخر حدثين في السجل:</Text>
        {item.timeline.slice(-2).map((event) => (
          <Text key={event} role="caption" tone="muted" style={{ textAlign }}>
            {`• ${event}`}
          </Text>
        ))}
      </View>
    </Box>
  );
}

function CommandCenterCaseRow({
  item,
  isExpanded,
  isActiveAction,
  activeActionType,
  lifecycle,
  onToggleDetails,
  onToggleAction,
  onCloseAction,
  onFeedback,
  onLifecycleChange,
  feedback,
}: {
  item: OperationsSupportCase;
  isExpanded: boolean;
  isActiveAction: boolean;
  activeActionType: 'handle' | 'proof' | 'quick-message' | 'escalate' | 'reject' | null;
  lifecycle?: CaseLifecycle;
  onToggleDetails: () => void;
  onToggleAction: () => void;
  onCloseAction: () => void;
  onFeedback: (msg: string) => void;
  onLifecycleChange: (lifecycle: CaseLifecycle) => void;
  feedback?: string | null;
}) {
  const { direction } = useDirection();
  const textAlign = direction === 'rtl' ? 'right' : 'left';
  const rowDirection = direction === 'rtl' ? 'row-reverse' : 'row';
  const category = getPartnerOrderIssueCategorySpec(item.issueCategoryId);

  return (
    <Box gap={1} style={{ width: '100%' }}>
      <Box paddingY={2}>
        <View style={{ flexDirection: rowDirection, alignItems: 'flex-start', gap: spacing[3] }}>
          <Icon
            name={
              item.requiresProof
                ? 'document-text-outline'
                : item.requiresConversation
                  ? 'chatbubble-ellipses-outline'
                  : item.issueCategoryId === 'item-unavailable' || item.issueCategoryId === 'wrong-item'
                    ? 'cube-outline'
                    : item.issueCategoryId === 'payment-refund-review'
                      ? 'wallet-outline'
                      : 'warning-outline'
            }
            size={18}
            tone="muted"
            style={{ marginTop: 2, flexShrink: 0 }}
          />

          <View style={{ flex: 1, minWidth: 0, gap: 2, alignItems: direction === 'rtl' ? 'flex-end' : 'flex-start' }}>
            <View style={{ width: '100%', flexDirection: rowDirection, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }}>
              <Text role="bodyStrong" style={{ textAlign,}}>
                {item.headline}
              </Text>
              <ReadOnlyMetaLabel
                label={item.hasSlaRisk ? item.slaLabel : `حالة: ${item.compactStatusLabel}`}
                tone={item.hasSlaRisk ? 'danger' : item.compactStatusTone}
              />
            </View>

            <Text role="caption" tone="muted" style={{ textAlign }}>
              {`${item.orderRef.replace('ORD-', 'طلب ')} · ${category.title} · الإجراء: ${item.nextActionLabel}`}
            </Text>

            {lifecycle ? (
              <Text role="caption" tone="muted" style={{ textAlign }}>
                {resolveCaseLifecycleLabel(lifecycle)}
              </Text>
            ) : null}

            <View style={{ flexDirection: rowDirection, alignItems: 'center', gap: spacing[2], marginTop: spacing[1] }}>
              <Button label="معالجة" size="sm" fullWidth={false} onPress={onToggleAction} />
              <Button label={isExpanded ? "إغلاق التفاصيل" : "تفاصيل"} size="sm" fullWidth={false} tone="secondary" onPress={onToggleDetails} />
            </View>
          </View>
        </View>
      </Box>

      {isActiveAction ? (
        <InlineActionPanel
          item={item}
          activeActionType={activeActionType}
          onClose={onCloseAction}
          onFeedback={onFeedback}
          onLifecycleChange={onLifecycleChange}
          feedback={feedback}
        />
      ) : null}

      {isExpanded ? (
        <InlineDetailsPanel item={item} />
      ) : null}

      <Divider />
    </Box>
  );
}

export type PartnerSupportScreenProps = {
  onBack?: () => void;
  onOpenScreen?: (screenId: DshPartnerSupportRouteId) => void;
  initialFilterId?: DshPartnerSupportCommandFilterId;
  initialCaseId?: string | null;
  initialIssueCategoryId?: DshPartnerSupportIssueCategoryId | null;
  initialSupportRouteId?: DshPartnerSupportRouteId | null;
};

export function PartnerSupportScreen({
  onBack,
  onOpenScreen: _onOpenScreen, // prop received from surface; navigation is surface-level only
  initialFilterId = 'all',
  initialCaseId = null,
  initialIssueCategoryId = null,
  initialSupportRouteId = null,
}: PartnerSupportScreenProps) {
  const { direction } = useDirection();
  const textAlign = direction === 'rtl' ? 'right' : 'left';
  const rowDirection = direction === 'rtl' ? 'row-reverse' : 'row';

  const [selectedFilterId, setSelectedFilterId] = React.useState<DshPartnerSupportCommandFilterId>(initialFilterId);
  const [supportQuery, setSupportQuery] = React.useState('');
  const [showSearch, setShowSearch] = React.useState(false);
  const [expandedCaseId, setExpandedCaseId] = React.useState<string | null>(() => {
    if (initialCaseId) return initialCaseId;
    if (initialSupportRouteId || initialIssueCategoryId) {
      return findBestCaseIdForSelection({
        filterId: initialFilterId,
        caseId: initialCaseId,
        supportRouteId: initialSupportRouteId,
        issueCategoryId: initialIssueCategoryId,
      });
    }
    return null;
  });

  const [activeActionCaseId, setActiveActionCaseId] = React.useState<string | null>(null);
  const [activeActionType, setActiveActionType] = React.useState<'handle' | 'proof' | 'quick-message' | 'escalate' | 'reject' | null>(null);
  const [actionFeedbackByCaseId, setActionFeedbackByCaseId] = React.useState<Record<string, string>>({});
  const [caseLifecycleById, setCaseLifecycleById] = React.useState<Record<string, CaseLifecycle>>({});

  React.useEffect(() => {
    setSelectedFilterId(initialFilterId);
    if (initialCaseId) {
      setExpandedCaseId(initialCaseId);
    } else if (initialSupportRouteId || initialIssueCategoryId) {
      setExpandedCaseId(
        findBestCaseIdForSelection({
          filterId: initialFilterId,
          caseId: initialCaseId,
          supportRouteId: initialSupportRouteId,
          issueCategoryId: initialIssueCategoryId,
        })
      );
    } else {
      setExpandedCaseId(null);
    }
  }, [initialCaseId, initialFilterId, initialSupportRouteId, initialIssueCategoryId]);

  const visibleItems = React.useMemo(() => {
    let items = [...runtimePartnerSupportCases];

    if (selectedFilterId === 'urgent') {
      items = items.filter((item) => item.hasSlaRisk || item.requiresDecision);
    } else if (selectedFilterId === 'conversations') {
      items = items.filter((item) => item.filterIds.includes('conversations'));
    } else if (selectedFilterId === 'inventory-branch') {
      items = items.filter((item) => item.filterIds.includes('inventory-branch'));
    } else if (selectedFilterId === 'escalation') {
      items = items.filter((item) => item.filterIds.includes('escalation'));
    }

    const query = supportQuery.trim().toLowerCase();
    if (query) {
      const normalizedQuery = query.replace('طلب ', 'ord-').replace('طلب', 'ord-');
      items = items.filter((item) => {
        const parties = item.linkedParties.join(' ').toLowerCase();
        const tags = (item.previewTags ?? []).join(' ').toLowerCase();
        return (
          item.orderRef.toLowerCase().includes(normalizedQuery) ||
          item.headline.toLowerCase().includes(query) ||
          item.summary.toLowerCase().includes(query) ||
          item.compactStatusLabel.toLowerCase().includes(query) ||
          item.slaLabel.toLowerCase().includes(query) ||
          item.nextActionLabel.toLowerCase().includes(query) ||
          parties.includes(query) ||
          tags.includes(query)
        );
      });
    }

    return items.sort((a, b) => getCasePriorityScore(b) - getCasePriorityScore(a));
  }, [selectedFilterId, supportQuery]);

  React.useEffect(() => {
    if (!expandedCaseId) {
      return;
    }

    if (!visibleItems.some((item) => item.id === expandedCaseId)) {
      setExpandedCaseId(null);
    }
  }, [expandedCaseId, visibleItems]);

  const urgentCount = React.useMemo(
    () => runtimePartnerSupportCases.filter((item) => item.hasSlaRisk || item.requiresDecision).length,
    []
  );

  function setCaseFeedback(caseId: string, message: string) {
    setActionFeedbackByCaseId((current) => ({
      ...current,
      [caseId]: message,
    }));
  }

  function setCaseLifecycle(caseId: string, lifecycle: CaseLifecycle) {
    setCaseLifecycleById((current) => ({ ...current, [caseId]: lifecycle }));
  }

  const focusCase = visibleItems[0];
  const listCases = visibleItems.slice(1);

  return (
    <MobileScrollView fill padding={4} gap={4} contentContainerStyle={{ paddingBottom: spacing[12] }}>
      <TopBar
        variant="secondary"
        title="العمليات والدعم"
        subtitle="لوحة الأولوية"
        style={{ marginHorizontal: -16, marginTop: -16 }}
      />

      <Box gap={1} paddingY={1}>
        <Text role="bodySm" tone="danger" weight="bold" style={{ textAlign }}>
          {`الأولوية الآن: ${urgentCount} حالات تحتاج إجراءً عاجلاً`}
        </Text>
      </Box>

      <Divider />

      <Box gap={2} paddingY={1}>
        <View style={{ flexDirection: rowDirection, alignItems: 'center', justifyContent: 'space-between', gap: spacing[2] }}>
          <Tabs
            items={commandCenterFilterItems}
            value={selectedFilterId}
            onValueChange={(id) => {
              setSelectedFilterId(id as DshPartnerSupportCommandFilterId);
            }}
            variant="pill"
            style={{ flex: 1 }}
          />
          <Button
            label={showSearch ? "إلغاء" : "بحث"}
            size="sm"
            fullWidth={false}
            tone="secondary"
            onPress={() => {
              if (showSearch) {
                setSupportQuery('');
              }
              setShowSearch(!showSearch);
            }}
          />
        </View>

        {showSearch ? (
          <SearchField
            value={supportQuery}
            onChangeText={setSupportQuery}
            placeholder="البحث عن رقم الطلب، حالة، أو أطراف..."
          />
        ) : null}
      </Box>

      <Divider />

      {/* Focus Case Zone ("الأولوية الآن") */}
      {focusCase ? (
        <Box gap={3} padding={3} border borderTone="line" radiusToken="lg" style={{ marginVertical: 4, width: '100%' }}>
          <View style={{ flexDirection: rowDirection, alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
            <View style={{ flexDirection: rowDirection, alignItems: 'center', gap: 6 }}>
              <Icon name="star-outline" size={18} tone="brand" />
              <Text role="bodyStrong" style={{ textAlign }}>الأولوية الآن</Text>
            </View>
            <ReadOnlyMetaLabel
              label={focusCase.hasSlaRisk ? focusCase.slaLabel : `حالة: ${focusCase.compactStatusLabel}`}
              tone={focusCase.hasSlaRisk ? 'danger' : focusCase.compactStatusTone}
            />
          </View>

          <View style={{ gap: 2, alignItems: direction === 'rtl' ? 'flex-end' : 'flex-start', width: '100%' }}>
            <Text role="bodyStrong" style={{ textAlign, fontSize: 16 }}>
              {focusCase.headline}
            </Text>
            <Text role="caption" tone="muted" style={{ textAlign }}>
              {focusCase.orderRef.replace('ORD-', 'طلب ')}
            </Text>
            <Text role="bodySm" tone="soft" style={{ textAlign }}>
              {`الإجراء التالي: ${focusCase.nextActionLabel}`}
            </Text>
            {caseLifecycleById[focusCase.id] ? (
              <Text role="caption" tone="muted" style={{ textAlign }}>
                {resolveCaseLifecycleLabel(caseLifecycleById[focusCase.id])}
              </Text>
            ) : null}
          </View>

          <View style={{ flexDirection: rowDirection, gap: spacing[2], marginTop: spacing[1], width: '100%' }}>
            <Button
              label="معالجة الآن"
              size="sm"
              fullWidth={false}
              onPress={() => {
                setActiveActionCaseId(focusCase.id);
                setActiveActionType('handle');
              }}
            />
            <Button
              label={expandedCaseId === focusCase.id ? "إغلاق التفاصيل" : "تفاصيل"}
              size="sm"
              fullWidth={false}
              tone="secondary"
              onPress={() => {
                setExpandedCaseId(expandedCaseId === focusCase.id ? null : focusCase.id);
              }}
            />
          </View>

          {activeActionCaseId === focusCase.id ? (
            <InlineActionPanel
              item={focusCase}
              activeActionType={activeActionType}
              onClose={() => {
                setActiveActionCaseId(null);
                setActiveActionType(null);
              }}
              onFeedback={(msg) => setCaseFeedback(focusCase.id, msg)}
              onLifecycleChange={(lifecycle) => setCaseLifecycle(focusCase.id, lifecycle)}
              feedback={actionFeedbackByCaseId[focusCase.id]}
            />
          ) : null}

          {expandedCaseId === focusCase.id ? (
            <InlineDetailsPanel item={focusCase} />
          ) : null}
        </Box>
      ) : null}

      <Divider />

      <Box gap={3} paddingY={2}>
        <SectionHeader
          title="صف الأولوية"
          subtitle="تظهر الحالات هنا بعد تحميلها من DSH API وربط التصعيدات التشغيلية الحية."
        />

        {listCases.length === 0 && !focusCase ? (
          <StateView
            stateId="empty"
            title="لا توجد حالات دعم حية"
            description="سيظهر صف الدعم بعد وصول الحالات الفعلية من DSH API. تم عزل الحالات التجريبية المحلية."
          />
        ) : (
          <Box gap={2}>
            {listCases.map((item) => (
              <CommandCenterCaseRow
                key={item.id}
                item={item}
                isExpanded={expandedCaseId === item.id}
                isActiveAction={activeActionCaseId === item.id}
                activeActionType={activeActionCaseId === item.id ? activeActionType : null}
                lifecycle={caseLifecycleById[item.id]}
                onToggleDetails={() => {
                  setExpandedCaseId(expandedCaseId === item.id ? null : item.id);
                }}
                onToggleAction={() => {
                  setActiveActionCaseId(activeActionCaseId === item.id ? null : item.id);
                  setActiveActionType(activeActionCaseId === item.id ? null : 'handle');
                }}
                onCloseAction={() => {
                  setActiveActionCaseId(null);
                  setActiveActionType(null);
                }}
                onFeedback={(msg) => setCaseFeedback(item.id, msg)}
                onLifecycleChange={(lifecycle) => setCaseLifecycle(item.id, lifecycle)}
                feedback={actionFeedbackByCaseId[item.id] ?? null}
              />
            ))}
          </Box>
        )}
      </Box>
    </MobileScrollView>
  );
}

export default PartnerSupportScreen;
