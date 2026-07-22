import React from 'react';
import { Badge, Box, Button, Divider, StateView, Surface, Text } from '@bthwani/ui-kit';
import {
  PREPARATION_ISSUE_CUSTOMER_DECISION_LABELS,
  PREPARATION_ISSUE_KIND_LABELS,
  PREPARATION_SLA_LABELS,
} from './orders.types';
import type { DshOrderPreparationReadbackState } from './use-order-preparation-readback';

export function OrderPreparationReadbackCard({
  state,
  title = 'تجهيز الطلب',
  onRetry,
}: {
  readonly state: DshOrderPreparationReadbackState;
  readonly title?: string;
  readonly onRetry?: () => void | Promise<void>;
}) {
  if (state.kind === 'idle') return null;
  if (state.kind === 'loading') {
    return <StateView title={`جارٍ تحميل ${title}`} loading />;
  }
  if (state.kind !== 'ready') {
    const tone = state.kind === 'offline' ? 'warning' : state.kind === 'forbidden' ? 'warning' : 'danger';
    return (
      <StateView
        tone={tone}
        title={state.kind === 'offline' ? 'الاتصال غير متاح' : state.kind === 'forbidden' ? 'القراءة غير مصرح بها' : 'تعذر تحميل التجهيز'}
        description={state.message}
        {...(onRetry ? { actionLabel: 'إعادة المحاولة', onActionPress: () => void onRetry() } : {})}
      />
    );
  }

  const estimatedReady = state.preparation.estimatedReadyAt
    ? new Date(state.preparation.estimatedReadyAt).toLocaleString('ar-YE')
    : 'لم يحدد بعد';
  const openIssues = state.issues.filter((issue) => issue.status === 'open');

  return (
    <Surface tone="raised" gap={3}>
      <Box layoutDirection="row" justify="space-between" align="center">
        <Text role="titleSm">{title}</Text>
        <Badge
          label={PREPARATION_SLA_LABELS[state.preparation.preparationSlaState]}
          tone={state.preparation.preparationSlaState === 'overdue' ? 'danger' : state.preparation.preparationSlaState === 'due_soon' ? 'warning' : 'info'}
        />
      </Box>
      <Box layoutDirection="row" justify="space-between" align="center">
        <Text role="bodySm" tone="muted">موعد الجاهزية المتوقع</Text>
        <Text role="bodyStrong">{estimatedReady}</Text>
      </Box>
      <Box layoutDirection="row" justify="space-between" align="center">
        <Text role="bodySm" tone="muted">المشكلات المفتوحة</Text>
        <Text role="bodyStrong">{state.openCount}</Text>
      </Box>
      {state.pendingCustomerDecisionCount > 0 ? (
        <Text role="bodySm" tone="warning">
          {`${state.pendingCustomerDecisionCount} استبدال بانتظار قرار العميل.`}
        </Text>
      ) : null}
      {state.preparation.preparationDelayReason ? (
        <Text role="caption" tone="warning">{`سبب تعديل الموعد: ${state.preparation.preparationDelayReason}`}</Text>
      ) : null}
      {openIssues.length === 0 ? (
        <Text role="bodySm" tone="muted">لا توجد مشكلة تجهيز مفتوحة.</Text>
      ) : (
        <Box gap={2}>
          {openIssues.map((issue, index) => (
            <React.Fragment key={issue.id}>
              {index > 0 ? <Divider /> : null}
              <Box gap={1}>
                <Text role="bodyStrong">{PREPARATION_ISSUE_KIND_LABELS[issue.kind]}</Text>
                <Text role="bodySm" tone="muted">{issue.note}</Text>
                {issue.replacementProductName ? (
                  <Text role="bodySm" tone="warning">{`البديل: ${issue.replacementProductName}`}</Text>
                ) : null}
                {issue.kind === 'substitution_required' ? (
                  <Badge
                    label={PREPARATION_ISSUE_CUSTOMER_DECISION_LABELS[issue.customerDecision]}
                    tone={issue.customerDecision === 'pending' ? 'warning' : issue.customerDecision === 'approved' ? 'success' : 'danger'}
                  />
                ) : null}
              </Box>
            </React.Fragment>
          ))}
        </Box>
      )}
      {onRetry ? (
        <Button label="تحديث التجهيز" tone="secondary" onPress={() => void onRetry()} />
      ) : null}
    </Surface>
  );
}
