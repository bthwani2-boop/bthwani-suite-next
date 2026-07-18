'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import {
  Badge,
  Box,
  Button,
  Card,
  StateView,
  Text,
  TextField,
} from '@bthwani/ui-kit';
import {
  ESCALATION_CATEGORY_LABELS,
  ESCALATION_SEVERITY_LABELS,
  fetchOperatorEscalations,
  updateEscalation,
  type DshReadinessEscalation,
} from '../../shared/field-readiness';
import {
  fetchDshRuntimeOrders,
  type DshRuntimeOrderRow,
} from '../../shared/operations/dsh-operational-runtime-adapter';
import { buildOperationsHref } from './operations.registry';

export type ExceptionsEscalationsScreenProps = {
  readonly hubHref: string;
  readonly subGroup?: string;
};

type WorkspaceState =
  | { readonly kind: 'loading' }
  | { readonly kind: 'error'; readonly message: string }
  | {
      readonly kind: 'ready';
      readonly escalations: readonly DshReadinessEscalation[];
      readonly cancelledOrders: readonly DshRuntimeOrderRow[];
      readonly cancelledOrdersWarning: string | null;
    };

type ActionState =
  | { readonly kind: 'idle' }
  | { readonly kind: 'submitting'; readonly escalationId: string }
  | { readonly kind: 'error'; readonly escalationId: string; readonly message: string };

function statusLabel(status: DshReadinessEscalation['status']): string {
  switch (status) {
    case 'open': return 'مفتوح';
    case 'acknowledged': return 'قيد المراجعة';
    case 'resolved': return 'محلول';
    case 'escalated_further': return 'مصعّد';
  }
}

function statusTone(status: DshReadinessEscalation['status']): 'danger' | 'warning' | 'success' | 'info' {
  if (status === 'resolved') return 'success';
  if (status === 'open') return 'danger';
  if (status === 'escalated_further') return 'warning';
  return 'info';
}

function severityTone(severity: DshReadinessEscalation['severity']): 'danger' | 'warning' | 'neutral' {
  if (severity === 'critical' || severity === 'high') return 'danger';
  if (severity === 'medium') return 'warning';
  return 'neutral';
}

export function ExceptionsEscalationsScreen({ hubHref }: ExceptionsEscalationsScreenProps) {
  const router = useRouter();
  const [state, setState] = React.useState<WorkspaceState>({ kind: 'loading' });
  const [selectedEscalationId, setSelectedEscalationId] = React.useState<string | null>(null);
  const [resolutionNote, setResolutionNote] = React.useState('');
  const [actionState, setActionState] = React.useState<ActionState>({ kind: 'idle' });

  const load = React.useCallback(async () => {
    setState({ kind: 'loading' });
    try {
      const [escalations, ordersResult] = await Promise.all([
        fetchOperatorEscalations(),
        fetchDshRuntimeOrders({ status: 'cancelled', limit: 50, scope: 'operator' }),
      ]);
      if (ordersResult.kind === 'ok') {
        setState({
          kind: 'ready',
          escalations,
          cancelledOrders: ordersResult.orders,
          cancelledOrdersWarning: null,
        });
      } else {
        setState({
          kind: 'ready',
          escalations,
          cancelledOrders: [],
          cancelledOrdersWarning:
            ordersResult.kind === 'offline'
              ? 'DSH Runtime غير متاح لقراءة الطلبات الملغاة.'
              : ordersResult.message,
        });
      }
    } catch (error) {
      setState({
        kind: 'error',
        message: error instanceof Error ? error.message : 'تعذر تحميل تصعيدات DSH.',
      });
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  React.useEffect(() => {
    setResolutionNote('');
    setActionState({ kind: 'idle' });
  }, [selectedEscalationId]);

  const mutateEscalation = React.useCallback(async (
    escalation: DshReadinessEscalation,
    status: 'acknowledged' | 'resolved',
  ) => {
    if (status === 'resolved' && resolutionNote.trim().length < 5) {
      setActionState({
        kind: 'error',
        escalationId: escalation.id,
        message: 'اكتب نتيجة حل واضحة من خمسة أحرف على الأقل.',
      });
      return;
    }
    setActionState({ kind: 'submitting', escalationId: escalation.id });
    try {
      await updateEscalation(escalation.id, {
        status,
        resolutionNote:
          status === 'resolved'
            ? resolutionNote.trim()
            : resolutionNote.trim() || 'تم استلام التصعيد وبدء المراجعة التشغيلية.',
      });
      setSelectedEscalationId(null);
      await load();
    } catch (error) {
      setActionState({
        kind: 'error',
        escalationId: escalation.id,
        message: error instanceof Error ? error.message : 'تعذر حفظ الإجراء في DSH Runtime.',
      });
    }
  }, [load, resolutionNote]);

  if (state.kind === 'loading') {
    return <StateView loading title="جارٍ تحميل الاستثناءات والتصعيدات من DSH" />;
  }

  if (state.kind === 'error') {
    return (
      <StateView
        tone="danger"
        title="تعذر تحميل مساحة الاستثناءات"
        description={state.message}
        actionLabel="إعادة المحاولة"
        onActionPress={load}
      />
    );
  }

  const selected = state.escalations.find((item) => item.id === selectedEscalationId) ?? null;
  const openCount = state.escalations.filter((item) => item.status !== 'resolved').length;
  const resolvedCount = state.escalations.length - openCount;

  return (
    <Box gap={4}>
      <Box flexDirection="row" gap={2} flexWrap="wrap" justifyContent="space-between">
        <Box gap={1}>
          <Text role="titleMd" align="start">الاستثناءات والتصعيدات</Text>
          <Text role="caption" tone="muted" align="start">
            التعديلات متاحة فقط لتصعيدات الجاهزية ذات معرف DSH حقيقي. الطلبات الملغاة للقراءة والتنقل فقط.
          </Text>
        </Box>
        <Box flexDirection="row" gap={2} flexWrap="wrap">
          <Button label="تحديث" tone="secondary" onPress={() => void load()} />
          <Button label="العودة لمركز العمليات" tone="ghost" onPress={() => router.push(hubHref)} />
        </Box>
      </Box>

      <Box flexDirection="row" gap={2} flexWrap="wrap">
        <Badge label={`مفتوحة: ${openCount}`} tone={openCount > 0 ? 'warning' : 'success'} />
        <Badge label={`محلولة: ${resolvedCount}`} tone="success" />
        <Badge label={`طلبات ملغاة: ${state.cancelledOrders.length}`} tone="neutral" />
      </Box>

      {state.cancelledOrdersWarning ? (
        <StateView tone="warning" title="قراءة الطلبات الملغاة غير مكتملة" description={state.cancelledOrdersWarning} />
      ) : null}

      <Box flexDirection="row" gap={4} alignItems="flex-start" flexWrap="wrap">
        <Box flex={1} minWidth={320} gap={3}>
          <Text role="titleSm" align="start">تصعيدات الجاهزية</Text>
          {state.escalations.length === 0 ? (
            <StateView tone="neutral" title="لا توجد تصعيدات مسجلة" />
          ) : (
            state.escalations.map((item) => (
              <Card key={item.id} padding={4} gap={2}>
                <Box flexDirection="row" justifyContent="space-between" alignItems="center" gap={2}>
                  <Box gap={1} flex={1}>
                    <Text role="bodyStrong" align="start">
                      {ESCALATION_CATEGORY_LABELS[item.category] ?? item.category}
                    </Text>
                    <Text role="caption" tone="muted" align="start">{item.description}</Text>
                    <Text role="caption" tone="muted" align="start">
                      المتجر: {item.storeId} · الزيارة: {item.visitId || 'غير مرتبطة'}
                    </Text>
                  </Box>
                  <Box gap={1} alignItems="flex-end">
                    <Badge label={ESCALATION_SEVERITY_LABELS[item.severity] ?? item.severity} tone={severityTone(item.severity)} />
                    <Badge label={statusLabel(item.status)} tone={statusTone(item.status)} />
                  </Box>
                </Box>
                <Box flexDirection="row" gap={2} flexWrap="wrap">
                  <Button
                    label="فتح التفاصيل"
                    tone="secondary"
                    size="sm"
                    onPress={() => setSelectedEscalationId(item.id)}
                  />
                  <Button
                    label="فتح المتجر"
                    tone="ghost"
                    size="sm"
                    onPress={() => router.push(buildOperationsHref('partner-stores', { orderId: item.storeId }))}
                  />
                </Box>
              </Card>
            ))
          )}
        </Box>

        <Box flex={1} minWidth={320} gap={3}>
          <Text role="titleSm" align="start">طلبات ملغاة من Runtime</Text>
          {state.cancelledOrders.length === 0 ? (
            <StateView tone="neutral" title="لا توجد طلبات ملغاة في النطاق المقروء" />
          ) : (
            state.cancelledOrders.map((order) => (
              <Card key={order.id} padding={4} gap={2}>
                <Text role="bodyStrong" align="start">الطلب {order.id}</Text>
                <Text role="caption" tone="muted" align="start">
                  المتجر: {order.storeId} · العميل: {order.clientId}
                </Text>
                <Text role="caption" tone="muted" align="start">
                  سبب فشل التسليم: {order.deliveryFailureReason || 'غير مسجل'}
                </Text>
                <Button
                  label="فتح الطلب في الصف الحي"
                  tone="secondary"
                  size="sm"
                  onPress={() => router.push(buildOperationsHref('live-orders', { subGroup: 'queue', orderId: order.id }))}
                />
              </Card>
            ))
          )}
        </Box>
      </Box>

      {selected ? (
        <Card padding={4} gap={3}>
          <Box flexDirection="row" justifyContent="space-between" alignItems="center" gap={2}>
            <Text role="titleSm" align="start">إجراء على التصعيد {selected.id}</Text>
            <Button label="إغلاق التفاصيل" tone="ghost" size="sm" onPress={() => setSelectedEscalationId(null)} />
          </Box>
          <Text role="bodySm" align="start">{selected.description}</Text>
          <TextField
            label="ملاحظات المراجعة أو الحل"
            value={resolutionNote}
            onChangeText={setResolutionNote}
            placeholder="اكتب نتيجة تشغيلية قابلة للتدقيق"
            multiline
          />
          {actionState.kind === 'error' && actionState.escalationId === selected.id ? (
            <Text role="caption" tone="danger" align="start">{actionState.message}</Text>
          ) : null}
          <Box flexDirection="row" gap={2} flexWrap="wrap">
            {selected.status === 'open' ? (
              <Button
                label="تأكيد الاستلام والمراجعة"
                tone="secondary"
                disabled={actionState.kind === 'submitting'}
                onPress={() => void mutateEscalation(selected, 'acknowledged')}
              />
            ) : null}
            {selected.status !== 'resolved' ? (
              <Button
                label="حل وإغلاق في DSH"
                tone="primary"
                disabled={actionState.kind === 'submitting'}
                onPress={() => void mutateEscalation(selected, 'resolved')}
              />
            ) : (
              <StateView tone="success" title="هذا التصعيد مغلق في DSH" description={selected.resolutionNote || undefined} />
            )}
          </Box>
        </Card>
      ) : null}
    </Box>
  );
}

export default ExceptionsEscalationsScreen;
