import React from 'react';
import { Badge, Box, Button, Divider, StateView, Text, TextField } from '@bthwani/ui-kit';
import {
  PREPARATION_ISSUE_KIND_LABELS,
  classifyOrderError,
  createOrderPreparationIssue,
  resolveOrderPreparationIssue,
  type DshPreparationIssue,
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
  const [affectedQuantity, setAffectedQuantity] = React.useState('1');
  const [note, setNote] = React.useState('');
  const [replacementName, setReplacementName] = React.useState('');
  const [selectedIssueId, setSelectedIssueId] = React.useState<string | null>(null);
  const [resolutionNote, setResolutionNote] = React.useState('');
  const [state, setState] = React.useState<'ready' | 'submitting' | 'success' | 'error'>('ready');
  const [message, setMessage] = React.useState('');

  const openIssues = order.preparationIssues.filter((issue) => issue.status === 'open');
  const selectedIssue = openIssues.find((issue) => issue.id === selectedIssueId) ?? null;
  const quantity = Number.parseInt(affectedQuantity.trim(), 10);
  const canReport = order.allowedActions.includes('report_issue')
    && Number.isInteger(quantity)
    && quantity > 0
    && note.trim().length >= 3
    && (kind !== 'substitution_required' || replacementName.trim().length >= 2);
  const canResolve = Boolean(
    selectedIssue
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
        ...(kind === 'substitution_required'
          ? { replacementProductName: replacementName.trim() }
          : {}),
      });
      await onUpdated();
      setNote('');
      setReplacementName('');
      setAffectedQuantity('1');
      setState('success');
      setMessage('تم تسجيل المشكلة ومنع إعلان الجاهزية حتى حلها.');
    } catch (error) {
      setState('error');
      setMessage(issueErrorMessage(error, 'تعذر تسجيل مشكلة التحضير.'));
    }
  }, [affectedQuantity, canReport, kind, note, onUpdated, order.id, quantity, replacementName]);

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
          {openIssues.map((issue, index) => (
            <React.Fragment key={issue.id}>
              {index > 0 ? <Divider /> : null}
              <Box gap={2} paddingY={2}>
                <Box layoutDirection="row" justify="space-between" align="center">
                  <Text role="bodySm">{PREPARATION_ISSUE_KIND_LABELS[issue.kind]}</Text>
                  <Badge label={`الكمية ${issue.affectedQuantity}`} tone="warning" />
                </Box>
                <Text role="caption" tone="muted">{issue.note}</Text>
                {issue.replacementProductName ? (
                  <Text role="caption" tone="warning">{`البديل المقترح: ${issue.replacementProductName}`}</Text>
                ) : null}
                <Button
                  label={selectedIssueId === issue.id ? 'إلغاء الحل' : 'حل المشكلة'}
                  tone="secondary"
                  size="sm"
                  fullWidth={false}
                  disabled={!order.allowedActions.includes('resolve_issue') || state === 'submitting'}
                  onPress={() => setSelectedIssueId(selectedIssueId === issue.id ? null : issue.id)}
                />
              </Box>
            </React.Fragment>
          ))}
        </Box>
      ) : null}

      {selectedIssue ? (
        <Box gap={2}>
          <TextField
            label="كيف تم حل المشكلة؟"
            value={resolutionNote}
            onChangeText={setResolutionNote}
            placeholder="مثال: تم توفير الصنف أو اعتماد البديل"
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
                onPress={() => setKind(issueKind)}
              />
            ))}
          </Box>
          <TextField
            label="الكمية المتأثرة"
            value={affectedQuantity}
            onChangeText={setAffectedQuantity}
            placeholder="1"
          />
          <TextField
            label="تفاصيل المشكلة"
            value={note}
            onChangeText={setNote}
            placeholder="اذكر الصنف والسبب بوضوح"
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
