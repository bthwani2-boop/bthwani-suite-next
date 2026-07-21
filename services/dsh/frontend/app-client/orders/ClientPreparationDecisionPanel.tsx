import React from 'react';
import { Badge, Box, Button, Divider, StateView, Surface, Text, TextField } from '@bthwani/ui-kit';
import {
  PREPARATION_ISSUE_CUSTOMER_DECISION_LABELS,
  PREPARATION_ISSUE_KIND_LABELS,
  classifyOrderError,
  decideOrderPreparationIssue,
  type DshPreparationIssue,
} from '../../shared/orders';

function decisionErrorMessage(error: unknown): string {
  const classified = classifyOrderError(error);
  if (classified.kind === 'conflict') return 'تم تسجيل قرار آخر أو تغيرت المشكلة. حدّث الطلب قبل المحاولة.';
  if (classified.kind === 'offline') return 'تعذر الاتصال. لم يتم حفظ أي قرار.';
  if (classified.kind === 'permission_denied') return 'لا تملك صلاحية اتخاذ قرار لهذا الطلب.';
  return classified.message ?? 'تعذر تسجيل قرار الاستبدال.';
}

export function ClientPreparationDecisionPanel({
  orderId,
  orderItems,
  issues,
  pendingCustomerDecisionCount,
  onUpdated,
}: {
  readonly orderId: string;
  readonly orderItems: readonly { readonly id: string; readonly productName: string }[];
  readonly issues: readonly DshPreparationIssue[];
  readonly pendingCustomerDecisionCount: number;
  readonly onUpdated: () => void | Promise<void>;
}) {
  const [activeIssueId, setActiveIssueId] = React.useState<string | null>(null);
  const [note, setNote] = React.useState('');
  const [state, setState] = React.useState<'ready' | 'submitting' | 'success' | 'error'>('ready');
  const [message, setMessage] = React.useState('');

  const openIssues = issues.filter((issue) => issue.status === 'open');
  const decide = React.useCallback(async (
    issue: DshPreparationIssue,
    decision: 'approved' | 'rejected',
  ) => {
    if (state === 'submitting' || issue.customerDecision !== 'pending') return;
    setActiveIssueId(issue.id);
    setState('submitting');
    setMessage('');
    try {
      await decideOrderPreparationIssue(orderId, issue.id, {
        expectedVersion: issue.version,
        decision,
        ...(note.trim() ? { note: note.trim() } : {}),
      });
      await onUpdated();
      setNote('');
      setState('success');
      setMessage(decision === 'approved'
        ? 'تمت الموافقة على البديل وإبلاغ المتجر.'
        : 'تم رفض البديل وإبلاغ المتجر. سيبقى الطلب غير جاهز حتى معالجة المشكلة.');
    } catch (error) {
      setState('error');
      setMessage(decisionErrorMessage(error));
    } finally {
      setActiveIssueId(null);
    }
  }, [note, onUpdated, orderId, state]);

  if (openIssues.length === 0) {
    return (
      <Surface tone="raised" gap={2}>
        <Text role="titleSm">حالة تجهيز الأصناف</Text>
        <Text role="bodySm" tone="muted">لا توجد مشكلة تجهيز مفتوحة.</Text>
      </Surface>
    );
  }

  return (
    <Surface tone="raised" gap={3}>
      <Box gap={1}>
        <Text role="titleSm">مشكلات تجهيز الطلب</Text>
        <Text role="bodySm" tone="muted">
          {`${openIssues.length} مشكلة مفتوحة تمنع إعلان الجاهزية.`}
        </Text>
        {pendingCustomerDecisionCount > 0 ? (
          <Text role="bodySm" tone="warning">
            {`${pendingCustomerDecisionCount} استبدال يحتاج قرارك.`}
          </Text>
        ) : null}
      </Box>

      {message ? (
        <StateView
          tone={state === 'error' ? 'danger' : 'success'}
          title={state === 'error' ? 'تعذر حفظ القرار' : 'تم حفظ القرار'}
          description={message}
        />
      ) : null}

      {openIssues.map((issue, index) => {
        const item = orderItems.find((candidate) => candidate.id === issue.orderItemId);
        const waiting = issue.customerDecision === 'pending';
        const submitting = state === 'submitting' && activeIssueId === issue.id;
        return (
          <React.Fragment key={issue.id}>
            {index > 0 ? <Divider /> : null}
            <Box gap={2}>
              <Box layoutDirection="row" justify="space-between" align="center">
                <Text role="bodyStrong">{PREPARATION_ISSUE_KIND_LABELS[issue.kind]}</Text>
                <Badge label={`الكمية ${issue.affectedQuantity}`} tone="warning" />
              </Box>
              {item ? <Text role="bodySm">{`الصنف: ${item.productName}`}</Text> : null}
              <Text role="bodySm" tone="muted">{issue.note}</Text>
              {issue.replacementProductName ? (
                <Text role="bodyStrong" tone="warning">{`البديل المقترح: ${issue.replacementProductName}`}</Text>
              ) : null}
              {issue.kind === 'substitution_required' ? (
                <Badge
                  label={PREPARATION_ISSUE_CUSTOMER_DECISION_LABELS[issue.customerDecision]}
                  tone={waiting ? 'warning' : issue.customerDecision === 'approved' ? 'success' : 'danger'}
                />
              ) : null}
              {waiting ? (
                <Box gap={2}>
                  <TextField
                    label="ملاحظة للمتجر (اختيارية)"
                    value={note}
                    onChangeText={setNote}
                    placeholder="مثال: أوافق بشرط نفس الحجم"
                  />
                  <Box layoutDirection="row" gap={2}>
                    <Button
                      label={submitting ? 'جارٍ الحفظ…' : 'الموافقة على البديل'}
                      tone="brand"
                      disabled={state === 'submitting'}
                      onPress={() => void decide(issue, 'approved')}
                    />
                    <Button
                      label={submitting ? 'جارٍ الحفظ…' : 'رفض البديل'}
                      tone="danger"
                      disabled={state === 'submitting'}
                      onPress={() => void decide(issue, 'rejected')}
                    />
                  </Box>
                </Box>
              ) : null}
            </Box>
          </React.Fragment>
        );
      })}
    </Surface>
  );
}
