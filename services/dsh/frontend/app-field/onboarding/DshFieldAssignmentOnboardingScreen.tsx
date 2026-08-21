// app-field — canonical assignment resolver for onboarding routes.
// Navigation carries only assignment identity; the current assignment payload
// is always re-read from the authenticated DSH field scope before use.
import React from 'react';
import { View } from 'react-native';
import { Header, StateView, colorRoles } from '@bthwani/ui-kit';
import {
  listFieldOnboardingAssignments,
  openFieldOnboardingAssignment,
  type FieldOnboardingAssignment,
} from '../../shared/field-assignment';
import type { FieldOnboardingController } from '../../shared/field-onboarding';
import { DshFieldOnboardingScreen } from './DshFieldOnboardingScreen';

type AssignmentResolutionState =
  | { readonly kind: 'loading'; readonly assignmentId: string }
  | { readonly kind: 'ready'; readonly assignmentId: string; readonly assignment: FieldOnboardingAssignment }
  | { readonly kind: 'error'; readonly assignmentId: string; readonly message: string; readonly retryable: boolean };

type Props = {
  readonly assignmentId: string;
  readonly controller: FieldOnboardingController;
  readonly onBack?: () => void;
  readonly onOpenProducts?: (partnerId: string) => void;
};

async function resolveCurrentAssignment(assignmentId: string): Promise<FieldOnboardingAssignment> {
  const assignments = await listFieldOnboardingAssignments();
  const assignment = assignments.find((candidate) => candidate.id === assignmentId);
  if (!assignment || assignment.status === 'cancelled') {
    throw new Error('ASSIGNMENT_NOT_AVAILABLE');
  }

  const current = assignment.status === 'assigned'
    ? await openFieldOnboardingAssignment(assignment.id, { expectedVersion: assignment.version })
    : assignment;

  if (current.status === 'cancelled') {
    throw new Error('ASSIGNMENT_NOT_AVAILABLE');
  }
  if (current.status === 'draft_linked' && !current.draftPartnerId?.trim()) {
    throw new Error('ASSIGNMENT_DRAFT_LINK_INCONSISTENT');
  }
  return current;
}

function assignmentErrorState(assignmentId: string, cause: unknown): AssignmentResolutionState {
  const code = cause instanceof Error ? cause.message : '';
  if (code === 'ASSIGNMENT_NOT_AVAILABLE') {
    return {
      kind: 'error',
      assignmentId,
      message: 'هذه المهمة لم تعد مسندة إليك أو تم إلغاؤها. ارجع إلى قائمة المهام لتحميل الحقيقة الحالية.',
      retryable: false,
    };
  }
  if (code === 'ASSIGNMENT_DRAFT_LINK_INCONSISTENT') {
    return {
      kind: 'error',
      assignmentId,
      message: 'حالة المهمة غير متسقة مع المسودة المرتبطة في DSH. لا يمكن متابعة المهمة قبل تصحيح الحالة من المصدر.',
      retryable: false,
    };
  }
  return {
    kind: 'error',
    assignmentId,
    message: 'تعذر تحميل أحدث حالة للمهمة من DSH. تحقق من الاتصال ثم أعد المحاولة.',
    retryable: true,
  };
}

export function DshFieldAssignmentOnboardingScreen({
  assignmentId,
  controller,
  onBack,
  onOpenProducts,
}: Props): React.ReactElement {
  const [refreshToken, setRefreshToken] = React.useState(0);
  const [resolution, setResolution] = React.useState<AssignmentResolutionState>({ kind: 'loading', assignmentId });

  React.useEffect(() => {
    let active = true;
    controller.reset();
    setResolution({ kind: 'loading', assignmentId });
    void resolveCurrentAssignment(assignmentId)
      .then((assignment) => {
        if (!active) return;
        setResolution({ kind: 'ready', assignmentId, assignment });
      })
      .catch((cause: unknown) => {
        if (!active) return;
        setResolution(assignmentErrorState(assignmentId, cause));
      });
    return () => {
      active = false;
    };
  }, [assignmentId, controller, refreshToken]);

  if (resolution.assignmentId !== assignmentId || resolution.kind === 'loading') {
    return (
      <View style={{ flex: 1, backgroundColor: colorRoles.surfaceBase }}>
        <Header title="جارٍ تحميل المهمة" />
        <StateView loading tone="info" title="جارٍ تحميل أحدث حالة للمهمة" description="يتم جلب الحقيقة الحالية من DSH قبل فتح ملف الانضمام." />
      </View>
    );
  }

  if (resolution.kind === 'error') {
    const retryAction = resolution.retryable
      ? { actionLabel: 'إعادة المحاولة', onActionPress: () => setRefreshToken((token) => token + 1) }
      : onBack
        ? { actionLabel: 'رجوع إلى المهام', onActionPress: onBack }
        : {};
    return (
      <View style={{ flex: 1, backgroundColor: colorRoles.surfaceBase }}>
        <Header title="تعذر فتح المهمة" />
        <StateView
          tone="danger"
          title="المهمة غير قابلة للمتابعة"
          description={resolution.message}
          {...retryAction}
        />
      </View>
    );
  }

  const assignment = resolution.assignment;
  const activePartnerId = (controller.state.partnerId ?? assignment.draftPartnerId?.trim()) || undefined;

  return (
    <DshFieldOnboardingScreen
      controller={controller}
      {...(activePartnerId ? { partnerId: activePartnerId } : {})}
      assignmentPrefill={assignment}
      {...(onBack ? { onBack } : {})}
      {...(onOpenProducts ? { onOpenProducts } : {})}
    />
  );
}
