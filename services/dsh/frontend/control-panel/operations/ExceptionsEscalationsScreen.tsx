'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import {
  WebControlPanelKpiStrip,
  WebControlPanelDecisionRow,
  WebControlPanelRecommendation,
  WebControlPanelQueue,
  WebControlPanelInspectorShell,
  WebControlPanelStatusTag,
} from '@bthwani/ui-kit/web';
import { fetchDshRuntimeOrders, type DshRuntimeOrderRow } from '../../shared/operations/dsh-operational-runtime-adapter';
import { EXCEPTION_TICKET_MAP } from '../../shared/orders';
import {
  ESCALATION_CATEGORY_LABELS,
  ESCALATION_SEVERITY_LABELS,
  fetchOperatorEscalations,
  updateEscalation,
  type DshReadinessEscalation,
} from '../../shared/field-readiness';
import { Box, KeyValueList } from '@bthwani/ui-kit';
import styles from '../shared/control-panel-surface.module.css';
import { buildOperationsHref } from './operations.registry';
import {
  getDshEscalationFlowsForSurface,
  getDshFinanceImpactFlows,
  getDshFlowPolicySummary,
  getDshRenderableFlowsForSurface,
  type DshFlowRegistryEntry,
} from '../../shared/operations/dsh-operational-registry';
import { findDshControlPanelGovernanceSectionByFlowId } from '../../shared/orders/orders.contract';
import { DSH_CONTROL_PANEL_TONE_MAP } from '../shared/ControlPanelDshDecisionBoard';

export type ExceptionsEscalationsScreenProps = { hubHref: string; subGroup?: string; };

type WorkspaceFilterId = 'all' | 'mobile-owned' | 'finance-preview' | 'hidden-compat' | 'control-policy';
type SelectedItem =
  | { type: 'exception'; id: string }
  | { type: 'flow'; id: string }
  | { type: 'rescue'; id: string }
  | { type: 'playbook'; id: string }
  | null;

type ExceptionsStateItem = {
  id: string;
  type: string;
  lifecycleState: string;
  affectedSurface: string;
  ownerQueue: string;
  severity: string;
  currentOwner: string;
  startTime: string;
  lastAction: string;
  suggestedAction: string;
  resolutionPath: string;
  routeHint: string;
  evidenceNeeded: boolean;
  onDemandDetailPolicy: string;
  note: string;
  statusTone: string;
  customOwner: string;
  customQueue: string;
  customSlaState: 'نشط' | 'مصعّد' | 'محلول';
  customNote: string;
  customStatusTone: 'warning' | 'danger' | 'best' | 'brand';
  realId?: string;
};

const WORKSPACE_FILTERS: ReadonlyArray<{ id: WorkspaceFilterId; label: string }> = [
  { id: 'all', label: 'الكل' },
  { id: 'mobile-owned', label: 'مُلاك الجوال' },
  { id: 'finance-preview', label: 'معاينة مالية' },
  { id: 'hidden-compat', label: 'توافقي مخفي' },
  { id: 'control-policy', label: 'سياسة التحكم' },
];

const SURFACE_LABELS: Record<string, string> = {
  'app-client': 'العميل',
  'app-partner': 'الشريك',
  'app-captain': 'الكابتن',
  'app-field': 'الميداني',
  'control-panel': 'لوحة التحكم',
  'wlt-finance': 'WLT المالية',
};

const DOMAIN_LABELS: Record<string, string> = {
  'order-lifecycle': 'دورة الطلب',
  'cart-checkout': 'السلة والدفع',
  tracking: 'التتبع',
  'delivery-mode': 'وضع التنفيذ',
  'partner-operations': 'تشغيل الشريك',
  'captain-operations': 'تشغيل الكابتن',
  'field-onboarding': 'ضم المتاجر',
  'catalog-inventory': 'الكتالوج والمخزون',
  'support-escalation': 'الدعم والتصعيد',
  'chat-conversation': 'المحادثات',
  'cancellation-rejection': 'الإلغاء والرفض',
  'finance-preview': 'مالي للقراءة فقط',
  'control-policy': 'سياسة التحكم',
};

const VISIBILITY_LABELS: Record<string, string> = {
  primary: 'أساسي',
  contextual: 'سياقي',
  'escalation-only': 'تصعيد فقط',
  'hidden-compat': 'توافقي مخفي',
  internal: 'داخلي',
  disabled: 'معطل',
};

const POLICY_LABELS: Record<string, string> = {
  'summary-only': 'ملخص أولًا',
  'detail-on-open': 'تفاصيل عند الفتح',
  'evidence-on-open': 'أدلة عند الفتح',
  'chat-on-open': 'دردشة عند الفتح',
  'finance-preview-only': 'مالي للقراءة فقط',
};

function mapReadinessEscalationToException(item: DshReadinessEscalation): ExceptionsStateItem {
  const isResolved = item.status === 'resolved';
  const isEscalated = item.status === 'acknowledged' || item.status === 'escalated_further';
  const categoryLabel = ESCALATION_CATEGORY_LABELS[item.category] ?? item.category;
  const severityLabel = ESCALATION_SEVERITY_LABELS[item.severity] ?? item.severity;
  const note = item.resolutionNote ? `${item.description} | ${item.resolutionNote}` : item.description;

  return {
    id: item.id,
    type: categoryLabel,
    lifecycleState: item.status,
    affectedSurface: 'app-field',
    ownerQueue: 'partner-stores',
    severity: severityLabel,
    currentOwner: isResolved ? item.resolvedBy ?? 'إدارة الشركاء' : 'إدارة الشركاء',
    startTime: new Date(item.createdAt).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
    lastAction: isResolved ? 'محلول' : isEscalated ? 'قيد المراجعة' : 'مفتوح',
    suggestedAction: isResolved ? 'مراجعة الإغلاق' : 'مراجعة جاهزية المتجر ومعالجة التصعيد',
    resolutionPath: isResolved ? 'تفاصيل' : 'حل',
    routeHint: buildOperationsHref('partner-stores', { orderId: item.storeId }),
    evidenceNeeded: item.status !== 'resolved',
    onDemandDetailPolicy: 'detail-on-open',
    note,
    statusTone: isResolved ? 'best' : item.severity === 'critical' || item.severity === 'high' ? 'danger' : 'warning',
    customOwner: isResolved ? item.resolvedBy ?? 'إدارة الشركاء' : 'إدارة الشركاء',
    customQueue: 'partner-stores',
    customSlaState: isResolved ? 'محلول' : isEscalated ? 'مصعّد' : 'نشط',
    customNote: note,
    customStatusTone: isResolved ? 'best' : item.severity === 'critical' || item.severity === 'high' ? 'danger' : 'warning',
    realId: item.id,
  };
}

function byWorkspacePriority(a: DshFlowRegistryEntry, b: DshFlowRegistryEntry) {
  const aHidden = a.hiddenCompat === true || a.visibility === 'hidden-compat' ? 1 : 0;
  const bHidden = b.hiddenCompat === true || b.visibility === 'hidden-compat' ? 1 : 0;
  if (aHidden !== bHidden) {
    return aHidden - bHidden;
  }

  const aOwner = a.ownerSurface === 'control-panel' ? 0 : 1;
  const bOwner = b.ownerSurface === 'control-panel' ? 0 : 1;
  if (aOwner !== bOwner) {
    return aOwner - bOwner;
  }

  return a.label.localeCompare(b.label, 'ar');
}

export function ExceptionsEscalationsScreen({
  hubHref: _hubHref,
  subGroup: _subGroup,
}: ExceptionsEscalationsScreenProps) {
  const router = useRouter();
  const [filterId, setFilterId] = React.useState<WorkspaceFilterId>('all');
  const [selectedItemId, setSelectedItemId] = React.useState<SelectedItem>(null);

  // Friendly queue names and simulated default owners
  const QUEUE_LABELS: Record<string, { label: string; owner: string }> = {
    'customer-support': { label: 'دعم العملاء (Customer Support)', owner: 'فريق دعم العملاء' },
    'captain-operations': { label: 'تشغيل الكباتن (Captain Operations)', owner: 'إدارة الكباتن' },
    'partner-stores': { label: 'جاهزية وإدارة الشركاء (Partner Stores)', owner: 'إدارة الشركاء' },
    'dispatch-assignment': { label: 'الإسناد والجدولة (Dispatch)', owner: 'فريق الإسناد' },
    'audit-support-sla': { label: 'تدقيق الدعم والالتزام (SLA Audit)', owner: 'الدعم الفني' },
  };

  const [exceptions, setExceptions] = React.useState<ExceptionsStateItem[]>(() => []);
  // Fetch real readiness escalations from the shared DSH client.
  React.useEffect(() => {
    let cancelled = false;
    fetchOperatorEscalations('open')
      .then((items) => {
        if (cancelled) return;
        const realItems = items.map(mapReadinessEscalationToException);
        setExceptions((prev) => [...realItems, ...prev.filter((e) => !e.realId)]);
        setKpis((prev) => ({ ...prev, open: realItems.length }));
      })
      .catch(() => {
        if (cancelled) return;
        setActionFeedback('تعذر تحميل تصعيدات الجاهزية من DSH Runtime.');
      });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Stateful KPIs statistics
  const [kpis, setKpis] = React.useState<{ open: number; escalate: number; resolve: number; close: number }>(() => ({
    open: 0,
    escalate: 0,
    resolve: 0,
    close: 0,
  }));

  const [activeForm, setActiveForm] = React.useState<null | 'escalate' | 'resolve'>(null);
  const [actionStatus, setActionStatus] = React.useState<'idle' | 'pending' | 'success' | 'error'>('idle');
  const [actionFeedback, setActionFeedback] = React.useState<string | null>(null);
  const [retryCount, setRetryCount] = React.useState(0);
  const retry = React.useCallback(() => setRetryCount((n) => n + 1), []);
  const [runtimeExcState, setRuntimeExcState] = React.useState<{
    orders: readonly DshRuntimeOrderRow[];
    loaded: boolean;
    error: string | null;
    offline: boolean;
  }>({ orders: [], loaded: false, error: null, offline: false });

  React.useEffect(() => {
    let cancelled = false;
    fetchDshRuntimeOrders({ status: 'cancelled', limit: 50, scope: 'operator' }).then((result) => {
      if (cancelled) return;
      if (result.kind === 'ok') {
        setRuntimeExcState({ orders: result.orders, loaded: true, error: null, offline: false });
      } else if (result.kind === 'offline') {
        setRuntimeExcState({ orders: [], loaded: false, error: null, offline: true });
      } else {
        setRuntimeExcState({ orders: [], loaded: false, error: result.message, offline: false });
      }
    });
    return () => { cancelled = true; };
  }, [retryCount]);

  const isEmpty = runtimeExcState.loaded && runtimeExcState.orders.length === 0;

  // Form input states
  const [selectedEscalationQueue, setSelectedEscalationQueue] = React.useState('customer-support');
  const [handoffNote, setHandoffNote] = React.useState('');
  const [resolutionNote, setResolutionNote] = React.useState('');

  // Reset form status when selection changes
  React.useEffect(() => {
    setActiveForm(null);
    setSelectedEscalationQueue('customer-support');
    setHandoffNote('');
    setResolutionNote('');
    setActionStatus('idle');
    setActionFeedback(null);
  }, [selectedItemId]);

  const handleEscalate = React.useCallback((id: string, targetQueue: string, noteText: string) => {
    setActionStatus('pending');
    setActionFeedback(null);

    const applyEscalateLocally = () => {
      const queueDetails = QUEUE_LABELS[targetQueue] || { label: targetQueue, owner: 'مدير العمليات' };
      const formattedNote = noteText.trim()
        ? `[تم التصعيد إلى ${queueDetails.label}] الملاحظة: ${noteText}`
        : `[تم التصعيد إلى ${queueDetails.label}]`;
      setExceptions((prev) =>
        prev.map((e) =>
          e.id === id
            ? { ...e, customOwner: queueDetails.owner, customQueue: targetQueue, customSlaState: 'مصعّد', customStatusTone: 'danger', customNote: e.customNote ? `${e.customNote} | ${formattedNote}` : formattedNote }
            : e
        )
      );
      setKpis((prev) => ({ ...prev, escalate: prev.escalate + 1 }));
      setActionStatus('success');
      setActionFeedback(`تم تصعيد الاستثناء ونقل ملكيته إلى (${queueDetails.label}) بنجاح.`);
      setTimeout(() => { setActionStatus('idle'); setActionFeedback(null); setActiveForm(null); setSelectedEscalationQueue('customer-support'); setHandoffNote(''); }, 1500);
    };

    const exc = exceptions.find((e) => e.id === id);
    if (exc?.realId) {
      updateEscalation(exc.realId, {
        status: 'acknowledged',
        resolutionNote: noteText.trim() || 'تمت مراجعة التصعيد وتحويله للمالك التشغيلي.',
      })
        .then(() => applyEscalateLocally())
        .catch(() => {
          setActionStatus('error');
          setActionFeedback('تعذر حفظ التصعيد في DSH Runtime. لم يتم تطبيق نجاح محلي بديل.');
        });
    } else {
      applyEscalateLocally();
    }
  }, [exceptions]);

  const handleResolve = React.useCallback((id: string, noteText: string) => {
    setActionStatus('pending');
    setActionFeedback(null);

    const applyResolveLocally = () => {
      const formattedNote = noteText.trim()
        ? `[تم الحل والإغلاق] الملاحظة: ${noteText}`
        : `[تم الحل والإغلاق]`;
      setExceptions((prev) =>
        prev.map((e) =>
          e.id === id
            ? { ...e, customSlaState: 'محلول', customStatusTone: 'best', customNote: e.customNote ? `${e.customNote} | ${formattedNote}` : formattedNote }
            : e
        )
      );
      setKpis((prev) => ({ ...prev, open: Math.max(0, prev.open - 1), resolve: prev.resolve + 1, close: prev.close + 1 }));
      setActionStatus('success');
      setActionFeedback('تم حل الاستثناء وإغلاق تذكرته بنجاح وتحويل حالة الـ SLA إلى مستقر.');
      setTimeout(() => { setActionStatus('idle'); setActionFeedback(null); setActiveForm(null); setResolutionNote(''); }, 1500);
    };

    const exc = exceptions.find((e) => e.id === id);
    if (exc?.realId) {
      updateEscalation(exc.realId, {
        status: 'resolved',
        resolutionNote: noteText.trim() || 'تم حل التصعيد من لوحة التحكم.',
      })
        .then(() => applyResolveLocally())
        .catch(() => {
          setActionStatus('error');
          setActionFeedback('تعذر حفظ الحل في DSH Runtime. لم يتم تطبيق نجاح محلي بديل.');
        });
    } else {
      applyResolveLocally();
    }
  }, [exceptions]);

  const escalationWorkspaceFlows = React.useMemo(
    () => [...getDshEscalationFlowsForSurface('control-panel')].sort(byWorkspacePriority),
    [],
  );
  const renderableControlFlows = React.useMemo(
    () => getDshRenderableFlowsForSurface('control-panel'),
    [],
  );
  const financePreviewFlowIds = React.useMemo(
    () => new Set(getDshFinanceImpactFlows().map((flow) => flow.id)),
    [],
  );
  const filteredFlows = React.useMemo(() => {
    if (filterId === 'mobile-owned') {
      return escalationWorkspaceFlows.filter((flow) => (
        flow.ownerSurface === 'app-client' || flow.ownerSurface === 'app-captain' || flow.ownerSurface === 'app-field'
      ));
    }

    if (filterId === 'finance-preview') {
      return escalationWorkspaceFlows.filter((flow) => financePreviewFlowIds.has(flow.id));
    }

    if (filterId === 'hidden-compat') {
      return escalationWorkspaceFlows.filter((flow) => flow.hiddenCompat === true || flow.visibility === 'hidden-compat');
    }

    if (filterId === 'control-policy') {
      return escalationWorkspaceFlows.filter((flow) => flow.ownerSurface === 'control-panel' || flow.domain === 'control-policy');
    }

    // Hide hidden-compat and finance-preview flows by default in the 'all' (default) view
    return escalationWorkspaceFlows.filter((flow) => (
      flow.hiddenCompat !== true &&
      flow.visibility !== 'hidden-compat' &&
      flow.onDemandPolicy !== 'finance-snapshot-only'
    ));
  }, [escalationWorkspaceFlows, filterId, financePreviewFlowIds]);


  const summaryKpi = [
    { id: 'runtime-exc', label: 'استثناءات Runtime', value: runtimeExcState.loaded ? String(runtimeExcState.orders.length) : '—', tone: 'danger' as const },
    { id: 'open', label: 'تصعيدات الجاهزية', value: String(kpis.open), tone: 'warning' as const },
    { id: 'resolve', label: 'حل', value: String(kpis.resolve), tone: 'neutral' as const },
    { id: 'source', label: 'مصدر البيانات', value: runtimeExcState.loaded ? 'DSH Runtime' : 'Preview', tone: runtimeExcState.loaded ? 'success' as const : 'warning' as const },
  ];

  // Selected details lookup
  let inspectorContent: React.ReactNode = null;
  if (selectedItemId) {
    if (selectedItemId.type === 'exception') {
      const exc = exceptions.find((e) => e.id === selectedItemId.id);
      if (exc) {
        const linkage = EXCEPTION_TICKET_MAP[exc.id];
        const supportTicketId = linkage?.supportTicketId ?? `preview-temp-${exc.id}`;
        const auditEntryId = linkage?.auditEntryId;
        const statusTone = DSH_CONTROL_PANEL_TONE_MAP[exc.customStatusTone] ?? 'neutral';
        const slaStateLabel = exc.customSlaState === 'نشط' ? 'نشط (مفتوح)' : exc.customSlaState === 'مصعّد' ? 'مصعّد (تحت المراجعة)' : 'مستقر (محلول)';

        inspectorContent = (
          <WebControlPanelInspectorShell
            title={`تفاصيل الاستثناء — ${exc.id}`}
            onClose={() => setSelectedItemId(null)}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '16px', overflowY: 'auto', flex: 1, direction: 'rtl', textAlign: 'right' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', fontWeight: 800 }}>الخطورة:</span>
                <WebControlPanelStatusTag label={exc.severity} tone={statusTone} />
              </div>

              <KeyValueList
                items={[
                  { label: 'النوع', value: exc.type },
                  { label: 'السطح المتأثر', value: SURFACE_LABELS[exc.affectedSurface] ?? exc.affectedSurface },
                  { label: 'طابور المالك', value: QUEUE_LABELS[exc.customQueue]?.label ?? exc.customQueue },
                  { label: 'المالك الحالي', value: exc.customOwner },
                  { label: 'حالة الـ SLA', value: slaStateLabel },
                  { label: 'وقت البدء', value: exc.startTime },
                  { label: 'الإجراء الأخير', value: exc.lastAction },
                  { label: 'الإجراء المقترح', value: exc.suggestedAction },
                  { label: 'تذكرة الدعم المرتبطة', value: supportTicketId },
                  { label: 'سجل التدقيق المرتبط', value: auditEntryId ?? 'غير مربوط' },
                ]}
              />

              <div style={{ background: 'var(--bthwani-control-panel-surface-inset)', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--bthwani-control-panel-border)' }}>
                <div style={{ fontSize: '11px', color: 'var(--bthwani-control-panel-text-muted)', fontWeight: 700 }}>سجل الملاحظات والإجراءات:</div>
                <div style={{ fontSize: '12px', color: 'var(--bthwani-control-panel-text)', marginTop: '4px', lineHeight: 1.5 }}>{exc.customNote}</div>
              </div>

              {actionFeedback && (
                <div style={{ background: 'var(--bthwani-control-panel-brand-surface)', border: '1px solid var(--bthwani-control-panel-brand)', color: 'var(--bthwani-control-panel-brand)', borderRadius: '8px', padding: '10px', fontSize: '12px', fontWeight: 700, textAlign: 'center' }}>
                  {actionFeedback}
                </div>
              )}

              {actionStatus === 'pending' ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px', gap: '8px' }}>
                  <div style={{
                    width: '24px',
                    height: '24px',
                    border: '3px solid var(--bthwani-control-panel-border)',
                    borderTop: '3px solid var(--bthwani-control-panel-brand)',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite',
                  }} />
                  <span style={{ fontSize: '12px', color: 'var(--bthwani-control-panel-text-muted)' }}>جاري معالجة الإجراء وحفظ التغييرات...</span>
                  <style>{`
                    @keyframes spin {
                      0% { transform: rotate(0deg); }
                      100% { transform: rotate(360deg); }
                    }
                  `}</style>
                </div>
              ) : activeForm === 'escalate' ? (
                <div style={{ background: 'var(--bthwani-control-panel-surface-inset)', border: '1px solid var(--bthwani-control-panel-border)', borderRadius: '8px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 800, color: 'var(--bthwani-control-panel-brand)' }}>تصعيد وتعيين المالك الجديد</div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label htmlFor="escalation-queue-select" style={{ fontSize: '11px', color: 'var(--bthwani-control-panel-text-muted)' }}>طابور التصعيد المستهدف:</label>
                    <select
                      id="escalation-queue-select"
                      value={selectedEscalationQueue}
                      onChange={(e) => setSelectedEscalationQueue(e.target.value)}
                      style={{
                        padding: '8px',
                        fontSize: '12px',
                        background: 'var(--bthwani-control-panel-surface)',
                        color: 'var(--bthwani-control-panel-text)',
                        border: '1px solid var(--bthwani-control-panel-border)',
                        borderRadius: '6px',
                        outline: 'none',
                      }}
                    >
                      {Object.entries(QUEUE_LABELS).map(([key, value]) => (
                        <option key={key} value={key}>{value.label}</option>
                      ))}
                    </select>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label htmlFor="handoff-note-textarea" style={{ fontSize: '11px', color: 'var(--bthwani-control-panel-text-muted)' }}>ملاحظات تسليم الدعم:</label>
                    <textarea
                      id="handoff-note-textarea"
                      rows={3}
                      value={handoffNote}
                      onChange={(e) => setHandoffNote(e.target.value)}
                      placeholder="اكتب مبررات التصعيد وتعليمات المتابعة للفريق المستلم..."
                      style={{
                        padding: '8px',
                        fontSize: '12px',
                        background: 'var(--bthwani-control-panel-surface)',
                        color: 'var(--bthwani-control-panel-text)',
                        border: '1px solid var(--bthwani-control-panel-border)',
                        borderRadius: '6px',
                        outline: 'none',
                        resize: 'vertical',
                      }}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                    <button
                      type="button"
                      onClick={() => handleEscalate(exc.id, selectedEscalationQueue, handoffNote)}
                      style={{
                        flex: 1,
                        padding: '8px',
                        fontSize: '11px',
                        fontWeight: 700,
                        background: 'var(--bthwani-control-panel-brand)',
                        color: 'var(--bthwani-brand-contrast)',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                      }}
                    >
                      تأكيد التصعيد
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveForm(null)}
                      style={{
                        padding: '8px 16px',
                        fontSize: '11px',
                        fontWeight: 700,
                        background: 'transparent',
                        border: '1px solid var(--bthwani-control-panel-border-strong)',
                        color: 'var(--bthwani-control-panel-text)',
                        borderRadius: '6px',
                        cursor: 'pointer',
                      }}
                    >
                      إلغاء
                    </button>
                  </div>
                </div>
              ) : activeForm === 'resolve' ? (
                <div style={{ background: 'var(--bthwani-control-panel-surface-inset)', border: '1px solid var(--bthwani-control-panel-border)', borderRadius: '8px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 800, color: 'var(--bthwani-control-panel-success)' }}>حل وإغلاق الاستثناء</div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label htmlFor="resolution-note-textarea" style={{ fontSize: '11px', color: 'var(--bthwani-control-panel-text-muted)' }}>ملاحظات الحل والإغلاق (Resolution Details):</label>
                    <textarea
                      id="resolution-note-textarea"
                      rows={3}
                      value={resolutionNote}
                      onChange={(e) => setResolutionNote(e.target.value)}
                      placeholder="اكتب كيفية معالجة الاستثناء والحل النهائي المطبق..."
                      style={{
                        padding: '8px',
                        fontSize: '12px',
                        background: 'var(--bthwani-control-panel-surface)',
                        color: 'var(--bthwani-control-panel-text)',
                        border: '1px solid var(--bthwani-control-panel-border)',
                        borderRadius: '6px',
                        outline: 'none',
                        resize: 'vertical',
                      }}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                    <button
                      type="button"
                      onClick={() => handleResolve(exc.id, resolutionNote)}
                      style={{
                        flex: 1,
                        padding: '8px',
                        fontSize: '11px',
                        fontWeight: 700,
                        background: 'var(--bthwani-control-panel-success)',
                        color: 'var(--bthwani-brand-contrast)',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                      }}
                    >
                      تأكيد الحل والإغلاق
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveForm(null)}
                      style={{
                        padding: '8px 16px',
                        fontSize: '11px',
                        fontWeight: 700,
                        background: 'transparent',
                        border: '1px solid var(--bthwani-control-panel-border-strong)',
                        color: 'var(--bthwani-control-panel-text)',
                        borderRadius: '6px',
                        cursor: 'pointer',
                      }}
                    >
                      إلغاء
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: 'auto' }}>
                  {exc.customSlaState !== 'محلول' ? (
                    <>
                      <button
                        type="button"
                        onClick={() => setActiveForm('resolve')}
                        style={{
                          width: '100%',
                          padding: '10px',
                          background: 'var(--bthwani-control-panel-success)',
                          color: 'var(--bthwani-brand-contrast)',
                          border: 'none',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          fontWeight: 700,
                          fontSize: '12px',
                        }}
                      >
                        حل وإغلاق الاستثناء (Resolve SLA)
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveForm('escalate')}
                        style={{
                          width: '100%',
                          padding: '10px',
                          background: 'var(--bthwani-control-panel-brand)',
                          color: 'var(--bthwani-brand-contrast)',
                          border: 'none',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          fontWeight: 700,
                          fontSize: '12px',
                        }}
                      >
                        تصعيد ونقل المالك (Escalate & Transfer)
                      </button>
                    </>
                  ) : (
                    <div style={{ background: 'var(--bthwani-success-surface)', border: '1px solid var(--bthwani-control-panel-success)', color: 'var(--bthwani-control-panel-success)', borderRadius: '8px', padding: '12px', fontSize: '12px', fontWeight: 700, textAlign: 'center' }}>
                      ✓ تم حل هذا الاستثناء وإغلاق الـ SLA المرتبط بنجاح.
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
                    <button
                      type="button"
                      style={{
                        flex: 1,
                        padding: '8px 12px',
                        background: 'transparent',
                        border: '1px solid var(--bthwani-control-panel-border-strong)',
                        color: 'var(--bthwani-control-panel-text)',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontWeight: 700,
                        fontSize: '11px',
                      }}
                      onClick={() => router.push(exc.routeHint)}
                    >
                      🔗 الانتقال لمسار الحل المساعد
                    </button>
                    <button
                      type="button"
                      style={{
                        flex: 1,
                        padding: '8px 12px',
                        background: 'transparent',
                        border: '1px solid var(--bthwani-control-panel-border-strong)',
                        color: 'var(--bthwani-control-panel-text)',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontWeight: 700,
                        fontSize: '11px',
                      }}
                      onClick={() =>
                        router.push(
                          auditEntryId
                            ? buildOperationsHref('audit-support-sla', { orderId: auditEntryId })
                            : buildOperationsHref('audit-support-sla', { orderId: supportTicketId })
                        )
                      }
                    >
                      {auditEntryId ? 'فتح التدقيق' : 'فتح تذكرة الدعم'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </WebControlPanelInspectorShell>
        );
      }
    } else if (selectedItemId.type === 'flow') {
      const flow = escalationWorkspaceFlows.find((f) => f.id === selectedItemId.id);
      if (flow) {
        const summary = getDshFlowPolicySummary(flow.id);
        const governance = findDshControlPanelGovernanceSectionByFlowId(flow.id);

        inspectorContent = (
          <WebControlPanelInspectorShell
            title={`سياسة التدفق — ${flow.label}`}
            onClose={() => setSelectedItemId(null)}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '8px', overflowY: 'auto', flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', fontWeight: 800 }}>الظهور:</span>
                <WebControlPanelStatusTag label={VISIBILITY_LABELS[flow.visibility] ?? flow.visibility} tone="neutral" />
              </div>

              <KeyValueList
                items={[
                  { label: 'التدفق', value: flow.label },
                  { label: 'السطح المالك', value: SURFACE_LABELS[flow.ownerSurface] ?? flow.ownerSurface },
                  { label: 'القسم المالك (حوكمة)', value: governance?.sectionLabel ?? 'عمليات / دعم حسب السياق' },
                  { label: 'المجال', value: DOMAIN_LABELS[flow.domain] ?? flow.domain },
                  { label: 'سياسة المعاينة', value: POLICY_LABELS[flow.onDemandPolicy] ?? flow.onDemandPolicy },
                  { label: 'الأثر المالي', value: flow.financialImpact ? 'نعم (عرض فقط)' : 'لا يوجد' },
                ]}
              />

              {summary && (
                <>
                  <div style={{ background: 'var(--bthwani-control-panel-surface-inset)', padding: '8px', borderRadius: '6px' }}>
                    <div style={{ fontSize: '10px', color: 'var(--bthwani-control-panel-text-muted)' }}>الإجراءات المسموحة:</div>
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '4px' }}>
                      {summary.allowedActions.map((act) => (
                        <span key={act} style={{ fontSize: '10px', background: 'var(--bthwani-success-surface)', color: 'var(--bthwani-success-text)', padding: '2px 6px', borderRadius: '4px' }}>{act}</span>
                      ))}
                    </div>
                  </div>

                  <div style={{ background: 'var(--bthwani-control-panel-surface-inset)', padding: '8px', borderRadius: '6px' }}>
                    <div style={{ fontSize: '10px', color: 'var(--bthwani-control-panel-text-muted)' }}>الإجراءات الممنوعة:</div>
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '4px' }}>
                      {summary.forbiddenActions.map((act) => (
                        <span key={act} style={{ fontSize: '10px', background: 'var(--bthwani-danger-surface)', color: 'var(--bthwani-danger-text)', padding: '2px 6px', borderRadius: '4px' }}>{act}</span>
                      ))}
                    </div>
                  </div>

                  <div style={{ background: 'var(--bthwani-control-panel-surface-inset)', padding: '8px', borderRadius: '6px' }}>
                    <div style={{ fontSize: '10px', color: 'var(--bthwani-control-panel-text-muted)' }}>معاينة السياسة:</div>
                    <div style={{ fontSize: '11px', color: 'var(--bthwani-control-panel-text)', marginTop: '2px', fontWeight: 600 }}>{summary.nextPolicyActionPreview}</div>
                  </div>
                </>
              )}

              {governance && (
                <div style={{ background: 'var(--bthwani-control-panel-surface-inset)', padding: '8px', borderRadius: '6px' }}>
                  <div style={{ fontSize: '10px', color: 'var(--bthwani-control-panel-text-muted)' }}>تعليمات الحوكمة:</div>
                  <div style={{ fontSize: '11px', color: 'var(--bthwani-control-panel-text)', marginTop: '2px' }}>{governance.notes}</div>
                </div>
              )}
            </div>
          </WebControlPanelInspectorShell>
        );
      }
    } else if (selectedItemId.type === 'rescue') {
      // no live rescue data — inspector not shown
    } else if (selectedItemId.type === 'playbook') {
      // no live playbook data — inspector not shown
    }
  }

  return (
    <Box gap={3}>
      <WebControlPanelKpiStrip items={summaryKpi} />

      <div className={styles.surfaceSplitGrid}>
        <Box gap={3}>
          {/* 0. Runtime Exceptions (FAILED_DELIVERY orders from DSH backend) */}
          {runtimeExcState.loaded && runtimeExcState.orders.length > 0 && (
            <WebControlPanelQueue
              title="استثناءات Runtime — فشل التسليم"
              meta={`${runtimeExcState.orders.length} طلب من DSH`}
            >
              {runtimeExcState.orders.map((order) => (
                <WebControlPanelDecisionRow
                  key={order.id}
                  entityId={order.id}
                  entityLabel={`متجر: ${order.storeId} | كابتن: ${order.captainId ?? '—'}`}
                  status="FAILED_DELIVERY"
                  statusTone="danger"
                  sla={`تحديث: ${new Date(order.updatedAt).toLocaleString('ar-SA', { hour: '2-digit', minute: '2-digit' })}`}
                  onInspect={() => router.push(buildOperationsHref('exceptions', { orderId: order.id }))}
                  primaryAction={{
                    id: `${order.id}-exc`,
                    label: 'فتح تفاصيل الطلب',
                    onAction: () => router.push(buildOperationsHref('exceptions', { orderId: order.id })),
                  }}
                />
              ))}
            </WebControlPanelQueue>
          )}

          {/* 1. Active Exceptions & Escalations Queue */}
          <WebControlPanelQueue
            title={runtimeExcState.loaded ? 'الاستثناءات النشطة من DSH' : 'الاستثناءات النشطة'}
            meta={`${exceptions.filter((e) => e.customSlaState !== 'محلول').length} استثناءات مفتوحة`}
          >
            {exceptions.map((exc) => {
              const statusTone = DSH_CONTROL_PANEL_TONE_MAP[exc.customStatusTone] ?? 'neutral';
              const displayStatus = exc.customSlaState === 'محلول'
                ? 'محلول'
                : exc.customSlaState === 'مصعّد'
                ? `${exc.severity} - مصعّد`
                : exc.severity;
              return (
                <WebControlPanelDecisionRow
                  key={exc.id}
                  entityId={exc.id}
                  entityLabel={`${exc.type} | السطح المتأثر: ${SURFACE_LABELS[exc.affectedSurface] ?? exc.affectedSurface}`}
                  status={displayStatus}
                  statusTone={statusTone}
                  risk={exc.customStatusTone === 'danger' ? 'danger' : exc.customStatusTone === 'warning' ? 'warning' : 'neutral'}
                  recommendation={exc.suggestedAction}
                  sla={`البداية: ${exc.startTime} | المالك الحالي: ${exc.customOwner}`}
                  onInspect={() => setSelectedItemId({ type: 'exception', id: exc.id })}
                  primaryAction={{
                    id: `${exc.id}-action`,
                    label: exc.customSlaState === 'محلول' ? 'معاينة التفاصيل' : exc.resolutionPath === 'حل' ? 'حل الاستثناء' : 'تصعيد',
                    onAction: () => setSelectedItemId({ type: 'exception', id: exc.id }),
                  }}
                />
              );
            })}
          </WebControlPanelQueue>

          {/* 2. Playbooks & Rescue Queue */}
          <WebControlPanelQueue title="دليل العمل وإنقاذ الطلب" meta="توجيه الإجراء السريع">
            {/* rescue and playbook rows: no live data — populated via API */}
          </WebControlPanelQueue>

          {/* 3. Central Registry display */}
          <WebControlPanelQueue title="أثر السجل المركزي للتصعيد والسياسات" meta={`${filteredFlows.length} تدفقًا`}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div className={`${styles.filterDock} ${styles.filterDockTint}`} style={{ padding: '6px 10px', borderRadius: '6px' }}>
                {WORKSPACE_FILTERS.map((filter) => (
                  <button
                    key={filter.id}
                    type="button"
                    className={`${styles.surfaceTab} ${filterId === filter.id ? styles.surfaceTabActive : ''}`}
                    style={{ padding: '4px 10px', fontSize: '11px' }}
                    onClick={() => setFilterId(filter.id)}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>

              <div className={styles.escalationCatalogRow} style={{ fontWeight: 800, background: 'var(--bthwani-control-panel-surface-inset)', border: 0 }}>
                <span className={styles.escalationCatalogId}>معرف تقني</span>
                <span className={styles.escalationCatalogMeta}>السطح المالك</span>
                <span className={styles.escalationCatalogDomain}>المجال</span>
                <span className={styles.escalationCatalogVisibility}>الظهور</span>
                <span className={styles.escalationCatalogPolicy}>سياسة الطلب</span>
                <span style={{ minWidth: '40px' }} />
              </div>
              {filteredFlows.map((flow) => (
                <div
                  key={flow.id}
                  className={styles.escalationCatalogRow}
                  style={{ cursor: 'pointer' }}
                  onClick={() => setSelectedItemId({ type: 'flow', id: flow.id })}
                >
                  <span className={styles.escalationCatalogId}>{flow.id}</span>
                  <span className={styles.escalationCatalogMeta}>{SURFACE_LABELS[flow.ownerSurface] ?? flow.ownerSurface}</span>
                  <span className={styles.escalationCatalogDomain}>{DOMAIN_LABELS[flow.domain] ?? flow.domain}</span>
                  <span className={styles.escalationCatalogVisibility}>{VISIBILITY_LABELS[flow.visibility] ?? flow.visibility}</span>
                  <span className={styles.escalationCatalogPolicy}>{POLICY_LABELS[flow.onDemandPolicy] ?? flow.onDemandPolicy}</span>
                  {flow.financialImpact === true && (
                    <span className={styles.escalationCatalogBadgeFinance} style={{ marginInlineEnd: '4px' }}>مالي</span>
                  )}
                  <button
                    type="button"
                    className={styles.rescueSecondaryBtn}
                    style={{ padding: '3px 8px', fontSize: '10px', marginInlineStart: 'auto', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedItemId({ type: 'flow', id: flow.id });
                    }}
                    aria-label="فتح التفاصيل"
                  >
                    ←
                  </button>
                </div>
              ))}
            </div>
          </WebControlPanelQueue>
        </Box>

        <Box gap={4}>
          {inspectorContent ?? (
            <WebControlPanelRecommendation
              title="سياسة وتوجيه الاستثناء"
              reason="اختر استثناءً نشطاً أو دليل تدخل أو سياسة تصعيد لمعاينة تفاصيل التوجيه والسياسة المعتمدة."
              confidence="high"
              auditTag="NEEDS_RUNTIME_EVIDENCE"
            />
          )}
        </Box>
      </div>
    </Box>
  );
}

export default ExceptionsEscalationsScreen;
