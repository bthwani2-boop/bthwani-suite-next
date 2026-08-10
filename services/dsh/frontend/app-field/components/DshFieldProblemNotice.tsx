// app-field — DshFieldProblemNotice / DshFieldProblemState
//
// The single rendering path for a governed field failure on this surface.
// The backend distinguishes precise operational refusals (CHECKLIST_INCOMPLETE,
// GEOFENCE_VIOLATION, VISIT_ALREADY_COMPLETE, ...) and the shared controller
// preserves them; screens must render that distinction rather than collapsing
// it into "تعذر تنفيذ العملية". Every screen renders failures through here so
// the reason code, the allowed next action, the retry affordance, and the
// support reference stay identical across the surface.
import React from 'react';
import { View } from 'react-native';
import { Button, InlineNotice, StateView, spacing } from '@bthwani/ui-kit';
import {
  buildGovernedProblemView,
  type GovernedNextAction,
  type GovernedProblem,
} from '../../shared/field-readiness';
import { DshFieldReferenceTag } from './DshFieldReferenceTag';

/** Handlers keyed by the server-declared next action. */
export type DshFieldProblemHandlers = Partial<
  Record<GovernedNextAction, () => void>
>;

export type DshFieldProblemNoticeProps = {
  readonly problem: GovernedProblem;
  /** Handler per allowed next action; the button appears only when handled. */
  readonly handlers?: DshFieldProblemHandlers;
  /** Plain retry. Offered only when the problem is actually retryable. */
  readonly onRetry?: (() => void) | undefined;
  readonly onDismiss?: (() => void) | undefined;
};

/** Inline variant — for a failed action inside an otherwise usable screen. */
export function DshFieldProblemNotice({
  problem,
  handlers,
  onRetry,
  onDismiss,
}: DshFieldProblemNoticeProps) {
  const view = buildGovernedProblemView(problem);
  const primaryHandler = view.primaryAction
    ? handlers?.[view.primaryAction.actionId]
    : undefined;
  // A non-retryable refusal must never offer a bare retry: re-sending the same
  // request cannot succeed and hides the real next step from the employee.
  const showRetry = view.retryable && Boolean(onRetry);

  return (
    <InlineNotice
      tone="danger"
      title={view.title}
      description={view.description}
      code={view.code}
      action={
        <View style={{ gap: spacing[2], alignItems: 'flex-end' }}>
          <View style={{ flexDirection: 'row-reverse', gap: spacing[2] }}>
            {view.primaryAction && primaryHandler ? (
              <Button
                label={view.primaryAction.label}
                tone="primary"
                size="sm"
                onPress={primaryHandler}
              />
            ) : null}
            {showRetry ? (
              <Button label="إعادة المحاولة" tone="ghost" size="sm" onPress={onRetry} />
            ) : null}
            {onDismiss ? (
              <Button label="إغلاق" tone="ghost" size="sm" onPress={onDismiss} />
            ) : null}
          </View>
          {view.correlationId ? (
            <DshFieldReferenceTag label="رقم المرجع" value={view.correlationId} />
          ) : null}
        </View>
      }
    />
  );
}

export type DshFieldProblemStateProps = {
  readonly problem: GovernedProblem;
  readonly handlers?: DshFieldProblemHandlers;
  readonly onRetry?: (() => void) | undefined;
  readonly onContactSupport?: (() => void) | undefined;
};

/** Full-page variant — for a screen that could not load at all. */
export function DshFieldProblemState({
  problem,
  handlers,
  onRetry,
  onContactSupport,
}: DshFieldProblemStateProps) {
  const view = buildGovernedProblemView(problem);
  const primaryHandler = view.primaryAction
    ? handlers?.[view.primaryAction.actionId]
    : undefined;
  const primaryLabel = view.primaryAction && primaryHandler
    ? view.primaryAction.label
    : view.retryable && onRetry
      ? 'إعادة المحاولة'
      : undefined;
  const primaryPress = primaryHandler ?? (view.retryable ? onRetry : undefined);

  return (
    <StateView
      tone="danger"
      title={view.title}
      description={view.description}
      code={view.code}
      {...(primaryLabel && primaryPress
        ? { actionLabel: primaryLabel, onActionPress: primaryPress }
        : {})}
      {...(view.supportHint && onContactSupport
        ? {
            secondaryActionLabel: 'التواصل مع الدعم',
            onSecondaryActionPress: onContactSupport,
          }
        : {})}
    />
  );
}
