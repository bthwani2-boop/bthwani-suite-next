import React from 'react';
import { Badge, Box, Button, Divider, StateView, Text, TextField } from '@bthwani/ui-kit';
import {
  PREPARATION_ISSUE_CUSTOMER_DECISION_LABELS,
  PREPARATION_ISSUE_KIND_LABELS,
  classifyOrderError,
  createOrderPreparationIssue,
  resolveOrderPreparationIssue,
  type DshPreparationIssueKind,
} from '../../shared/orders';
import type { GovernedPartnerOrderItem } from '../../shared/partner/partner.adapters';

const ISSUE_KINDS: readonly DshPreparationIssueKind[] = [
  'missing_item',
  'substitution_required',
  'quality_issue',
  'other',
];

function issueErrorMessage(error: unknown, fallback: string): string {
  const classified = classifyOrderError(error);
  if (classified.kind === 'conflict') return 'تغيرت حالة الطلب أو المشكلة. أعد تحميل الطلب قبل المحاولة.';
  if (classified.kind === 'offline') return 'تعذر الاتصال. لم يتم تسجيل أي تغيير.';
  if (classified.kind === 'permission_denied') return 'لا تسمح صلاحية الحساب بتنفيذ هذا الإجراء.';
  return classified.message ?? fallback;
}

export function PreparationIssuesPanel({
  order,
  onClose,
  onUpdated,
}: {
  readonly order: GovernedPartnerOrderItem;
  readonly onClose: () => void;
  readonly onUpdated: () => void | Promise<void>;
}) {
  const [kind, setKind] = React.useState<DshPreparationIssueKind>('missing_item');
  const [selectedOrderItemId, setSelectedOrderItemId] = React.useState<string | null>(null);
  const [affectedQuantity, setAffectedQuantity] = React.useState('1');
  const [note, setNote] = React.useState('');
  const [replacementName, setReplacementName] = React.useState('');
  const [selectedIssueId, setSelectedIssueId] = React.useState<string | null>(null);
  const [resolutionNote, setResolutionNote] = React.useState('');
  const [state, setState] = React.useState<'ready' | 'submitting' | 'success' | 'error'>('ready');
  const [message, setMessage] = React.useState('');

  const openIssues = order.preparationIssues.filter((issue) => issue.status === 'open');
  const pendingCustomerDecisions = openIssues.filter((issue) => issue.customerDecision === 'pending');
  const selectedIssue = openIssues.find((issue) => issue.id === selectedIssueId) ?? null;
  const selectedOrderItem = order.orderItems.find((item) => item.id === selectedOrderItemId) ?? null;
  const itemRequired = kind !== 'other';
  const quantity = Number.parseInt(affectedQuantity.trim(), 10);
  const quantityValid = Number.isInteger(quantity)
    && quantity > 0
    && (!itemRequired || Boolean(selectedOrderItem && quantity <= selectedOrderItem.quantity));
  const canReport = order.allowedActions.includes('report_issue')
    && quantityValid
    && (!itemRequired || selectedOrderItem !== null)
    && note.trim().length >= 3
    && (kind !== 'substitution_required' || replacementName.trim().length >= 2);
  const canResolve = Boolean(
    selectedIssue
      && selectedIssue.customerDecision !== 'pending'
      && order.allowedActions.includes('resolve_issue')
      && resolutionNote.trim().length >= 3,
  );

  const reportIssue = React.useCallback(async () => {
    if (!canReport) return;
    setState('submitting');
    setMessage('');
    try {
      await createOrderPreparationIssue(order.id, {
        kind,
        affectedQuantity: quantity,
        note: note.trim(),
        ...(itemRequired && selectedOrderItem
          ? { orderItemId: selectedOrderItem.id }
          : {}),
        ...(kind === 'substitution_required'
          ? { replacementProductName: replacementName.trim() }
          : {}),
      });
      await onUpdated();
      setSelectedOrderItemId(null);
      setNote('');
      setReplacementName('');
      setAffectedQuantity('1');
      setState('success');
      setMessage(
        kind === 'substitution_required'
          ? 'تم إرسال الاستبدال للعميل. لا يمكن حله أو إعلان الجاهزية قبل قراره.'
          : 'تم تسجيل المشكلة وربطها بالصنف ومنع إعلان الجاهزية حتى حلها.',
      );
    } catch (error) {
      setState('error');
      setMessage(issueErrorMessage(error, 'تعذر تسجيل مشكلة التحضير.'));
    }
  }, [canReport, itemRequired, kind, note, onUpdated, order.id, quantity, replacementName, selectedOrderItem]);

  const resolveIssue = React.useCallback(async () => {
    if (!selectedIssue || !canResolve) return;
    setState('submitting');
    setMessage('');
    try {
      await resolveOrderPreparationIssue(order.id, selectedIssue.id, {
        expectedVersion: selectedIssue.version,
        resolutionNote: resolutionNote.trim(),
      });
      await onUpdated();
      setSelectedIssueId(null);
      setResolutionNote('');
      setState('success');
      setMessage('تم حل المشكلة وتحديث إجراءات الطلب من DSH.');
    } catch (error) {
      setState('error');
      setMessage(issueErrorMessage(error, 'تعذر حل مشكلة التحضير.'));
    }
  }, [canResolve, onUpdated, order.id, resolutionNote, selectedIssue]);

  return (
    <Box gap={3} padding={4} background="surfaceInset">
      <Box layoutDirection="row" justify="space-between" align="center">
        <Box gap={1}>
          <Text role="bodyStrong">مشكلات تحضير {order.orderCode}</Text>
          <Text role="caption" tone="muted">
            {openIssues.length > 0
              ? `${openIssues.length} مشكلة مفتوحة تمنع إعلان الجاهزية.`
              : 'لا توجد مشكلة مفتوحة. يمكن تسجيل نقص أو استبدال أثناء التحضير.'}
          </Text>
          {pendingCustomerDecisions.length > 0 ? (
            <Text role="caption" tone="warning">
              {`${pendingCustomerDecisions.length} استبدال بانتظار قرار العميل. لا تُنهِ المشكلة قبل الرد.`}
            </Text>
          ) : null}
        </Box>
        <Button label="إغلاق" tone="ghost" size="sm" fullWidth={false} onPress={onClose} />
      </Box>

      {message ? (
        <StateView
          tone={state === 'error' ? 'danger' : 'success'}
          title={state === 'error' ? 'تعذر تنفيذ الإجراء' : 'تم تحديث الطلب'}
          description={message}
        />
      ) : null}

      {openIssues.length > 0 ? (
        <Box gap={2}>
          <Text role="bodyStrong">المشكلات المفتوحة</Text>
          {openIssues.map((issue, index) => {
            const affectedItem = order.orderItems.find((item) => item.id === issue.orderItemId);
            const waitingForCustomer = issue.customerDecision === 'pending';
            return (
              <React.Fragment key={issue.id}>
                {index > 0 ? <Divider /> : null}
                <Box gap={2} paddingY={2}>
                  <Box layoutDirection="row" justify="space-between" align="center">
                    <Text role="bodySm">{PREPARATION_ISSUE_KIND_LABELS[issue.kind]}</Text>
                    <Badge label={`الكمية ${issue.affectedQuantity}`} tone="warning" />
                  </Box>
                  {affectedItem ? (
                    <Text role="caption" tone="warning">{`الصنف: ${affectedItem.productName}`}</Text>
                  ) : null}
                  <Text role="caption" tone="muted">{issue.note}</Text>
                  {issue.replacementProductName ? (
                    <Text role="caption" tone="warning">{`البديل المقترح: ${issue.replacementProductName}`}</Text>
                  ) : null}
                  {issue.kind === 'substitution_required' ? (
                    <Badge
                      label={PREPARATION_ISSUE_CUSTOMER_DECISION_LABELS[issue.customerDecision]}
                      tone={waitingForCustomer ? 'warning' : issue.customerDecision === 'approved' ? 'success' : 'danger'}
                    />
                  ) : null}
                  {issue.customerDecisionNote ? (
                    <Text role="caption" tone="muted">{`ملاحظة العميل: ${issue.customerDecisionNote}`}</Text>
                  ) : null}
                  {waitingForCustomer ? (
                    <StateView
                      tone="warning"
                      title="بانتظار قرار العميل"
                      description="يمنع الخادم حل هذا الاستبدال حتى يسجل العميل الموافقة أو الرفض."
                    />
                  ) : (
                    <Button
                      label={selectedIssueId === issue.id ? 'إلغاء الحل' : 'حل المشكلة'}
                      tone="secondary"
                      size="sm"
                      fullWidth={false}
                      disabled={!order.allowedActions.includes('resolve_issue') || state === 'submitting'}
                      onPress={() => setSelectedIssueId(selectedIssueId === issue.id ? null : issue.id)}
                    />
                  )}
                </Box>
              </React.Fragment>
            );
          })}
        </Box>
      ) : null}

      {selectedIssue ? (
        <Box gap={2}>
          <TextField
            label="كيف تم حل المشكلة؟"
            value={resolutionNote}
            onChangeText={setResolutionNote}
            placeholder="مثال: تم توفير الصنف أو تطبيق قرار العميل على البديل"
          />
          <Button
            label={state === 'submitting' ? 'جارٍ تثبيت الحل…' : 'تثبيت حل المشكلة'}
            disabled={!canResolve || state === 'submitting'}
            onPress={() => void resolveIssue()}
          />
        </Box>
      ) : null}

      {order.allowedActions.includes('report_issue') ? (
        <Box gap={2}>
          <Divider />
          <Text role="bodyStrong">تسجيل مشكلة جديدة</Text>
          <Box layoutDirection="row" gap={2}>
            {ISSUE_KINDS.map((issueKind) => (
              <Button
                key={issueKind}
                label={PREPARATION_ISSUE_KIND_LABELS[issueKind]}
                tone={kind === issueKind ? 'secondary' : 'ghost'}
                size="sm"
                fullWidth={false}
                onPress={() => {
                  setKind(issueKind);
                  if (issueKind === 'other') setSelectedOrderItemId(null);
                }}
              />
            ))}
          </Box>
          {itemRequired ? (
            <Box gap={2}>
              <Text role="bodySm">اختر الصنف المتأثر من عناصر الطلب</Text>
              {order.orderItems.map((item) => (
                <Button
                  key={item.id}
                  label={`${item.productName} · الكمية ${item.quantity}`}
                  tone={selectedOrderItemId === item.id ? 'secondary' : 'ghost'}
                  size="sm"
                  fullWidth={false}
                  onPress={() => {
                    setSelectedOrderItemId(item.id);
                    if (quantity > item.quantity) setAffectedQuantity(String(item.quantity));
                  }}
                />
              ))}
              {order.orderItems.length === 0 ? (
                <StateView
                  tone="danger"
                  title="تعذر ربط المشكلة بصنف"
                  description="أعد تحميل الطلب قبل تسجيل مشكلة تخص صنفًا."
                />
              ) : null}
            </Box>
          ) : null}
          <TextField
            label="الكمية المتأثرة"
            value={affectedQuantity}
            onChangeText={setAffectedQuantity}
            placeholder="1"
          />
          {selectedOrderItem && quantity > selectedOrderItem.quantity ? (
            <Text role="caption" tone="danger">لا يمكن أن تتجاوز الكمية المتأثرة كمية الصنف في الطلب.</Text>
          ) : null}
          <TextField
            label="تفاصيل المشكلة"
            value={note}
            onChangeText={setNote}
            placeholder="اذكر السبب بوضوح"
          />
          {kind === 'substitution_required' ? (
            <TextField
              label="اسم البديل المقترح"
              value={replacementName}
              onChangeText={setReplacementName}
              placeholder="اسم المنتج البديل"
            />
          ) : null}
          <Button
            label={state === 'submitting' ? 'جارٍ التسجيل…' : 'تسجيل المشكلة'}
            disabled={!canReport || state === 'submitting'}
            onPress={() => void reportIssue()}
          />
        </Box>
      ) : null}
    </Box>
  );
}
