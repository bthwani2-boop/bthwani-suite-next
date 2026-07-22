import React from 'react';
import {
  cancelDispatchAssignment,
  classifyDispatchError,
  expireDispatchAssignments,
  fetchCaptainDispatchCandidates,
  fetchDispatchDecisions,
  fetchOperatorDispatchAssignments,
  reassignDispatchAssignment,
} from '../dispatch/dispatch.api';
import type {
  DshCaptainDispatchCandidate,
  DshDispatchAssignment,
  DshDispatchDecision,
} from '../dispatch/dispatch.types';
import { buildDispatchAssignmentIdempotencyKey } from './dispatch-assignment.api';

export type DispatchOperationsState = {
  readonly kind: 'loading' | 'ready' | 'error';
  readonly assignments: readonly DshDispatchAssignment[];
  readonly selectedAssignment: DshDispatchAssignment | null;
  readonly decisions: readonly DshDispatchDecision[];
  readonly candidates: readonly DshCaptainDispatchCandidate[];
  readonly mutationKind: 'idle' | 'expiring' | 'cancelling' | 'reassigning';
  readonly message: string;
};

const initialState: DispatchOperationsState = {
  kind: 'loading',
  assignments: [],
  selectedAssignment: null,
  decisions: [],
  candidates: [],
  mutationKind: 'idle',
  message: '',
};

function dispatchOperationsErrorMessage(error: unknown): string {
  const classified = classifyDispatchError(error);
  if (classified.kind === 'offline') return 'تعذر الاتصال بخدمة DSH.';
  if (classified.kind === 'permission_denied') return 'لا تملك صلاحية إدارة الإسنادات.';
  if (classified.code === 'CAPTAIN_NOT_ELIGIBLE') return 'الكابتن البديل غير مؤهل في منطقة المهمة.';
  if (classified.code === 'CAPTAIN_AT_CAPACITY') return 'الكابتن البديل وصل إلى حد السعة.';
  if (classified.kind === 'conflict') return classified.message ?? 'تغيرت حالة الإسناد. حدّث القراءة ثم أعد المحاولة.';
  if (classified.kind === 'not_found') return 'الإسناد لم يعد موجودًا.';
  return classified.message ?? 'تعذر تنفيذ عملية الإسناد.';
}

function activeAssignments(items: readonly DshDispatchAssignment[]): readonly DshDispatchAssignment[] {
  return items.filter((item) => item.status === 'offered' || item.status === 'accepted');
}

export function useDispatchOperations() {
  const [state, setState] = React.useState<DispatchOperationsState>(initialState);
  const requestTokenRef = React.useRef(0);

  const load = React.useCallback(async (options: { readonly preserveSelection?: boolean } = {}) => {
    const token = ++requestTokenRef.current;
    setState((current) => ({
      ...current,
      kind: 'loading',
      message: '',
      mutationKind: 'idle',
      ...(options.preserveSelection ? {} : {
        selectedAssignment: null,
        decisions: [],
        candidates: [],
      }),
    }));
    try {
      const assignments = activeAssignments(await fetchOperatorDispatchAssignments());
      if (requestTokenRef.current !== token) return;
      setState((current) => {
        const selectedAssignment = options.preserveSelection && current.selectedAssignment
          ? assignments.find((item) => item.id === current.selectedAssignment?.id) ?? null
          : null;
        return {
          ...current,
          kind: 'ready',
          assignments,
          selectedAssignment,
          ...(selectedAssignment ? {} : { decisions: [], candidates: [] }),
        };
      });
    } catch (error) {
      if (requestTokenRef.current !== token) return;
      setState((current) => ({
        ...current,
        kind: 'error',
        message: dispatchOperationsErrorMessage(error),
      }));
    }
  }, []);

  const selectAssignment = React.useCallback(async (assignment: DshDispatchAssignment) => {
    setState((current) => ({
      ...current,
      selectedAssignment: assignment,
      decisions: [],
      candidates: [],
      message: '',
    }));
    try {
      const [decisions, candidates] = await Promise.all([
        fetchDispatchDecisions({
          tenantId: assignment.tenantId ?? 'default',
          assignmentId: assignment.id,
          limit: 100,
        }),
        assignment.serviceAreaCode
          ? fetchCaptainDispatchCandidates(assignment.serviceAreaCode, assignment.tenantId ?? 'default')
          : Promise.resolve([]),
      ]);
      setState((current) => current.selectedAssignment?.id !== assignment.id
        ? current
        : {
            ...current,
            decisions,
            candidates: candidates.filter((candidate) => candidate.eligible && candidate.captainId !== assignment.captainId),
          });
    } catch (error) {
      setState((current) => ({
        ...current,
        message: dispatchOperationsErrorMessage(error),
      }));
    }
  }, []);

  const expire = React.useCallback(async () => {
    setState((current) => ({ ...current, mutationKind: 'expiring', message: '' }));
    try {
      const expiredCount = await expireDispatchAssignments('default', 200);
      await load({ preserveSelection: true });
      setState((current) => ({
        ...current,
        message: expiredCount > 0 ? `تم إنهاء ${expiredCount} عرض متأخر.` : 'لا توجد عروض متأخرة.',
      }));
    } catch (error) {
      setState((current) => ({
        ...current,
        mutationKind: 'idle',
        message: dispatchOperationsErrorMessage(error),
      }));
    }
  }, [load]);

  const cancel = React.useCallback(async (assignmentId: string, reason: string) => {
    const normalizedReason = reason.trim();
    if (normalizedReason.length < 3) {
      setState((current) => ({ ...current, message: 'سبب الإلغاء مطلوب.' }));
      return;
    }
    setState((current) => ({ ...current, mutationKind: 'cancelling', message: '' }));
    try {
      await cancelDispatchAssignment(assignmentId, 'OPERATOR_CANCELLED', normalizedReason);
      await load();
      setState((current) => ({ ...current, message: 'تم إلغاء الإسناد وإعادة الطلب إلى طابور الجاهزية.' }));
    } catch (error) {
      setState((current) => ({
        ...current,
        mutationKind: 'idle',
        message: dispatchOperationsErrorMessage(error),
      }));
    }
  }, [load]);

  const reassign = React.useCallback(async (
    assignment: DshDispatchAssignment,
    captainId: string,
    reason: string,
  ) => {
    const normalizedCaptainId = captainId.trim();
    const normalizedReason = reason.trim();
    const serviceAreaCode = assignment.serviceAreaCode?.trim() ?? '';
    if (!normalizedCaptainId || !serviceAreaCode || normalizedReason.length < 3) {
      setState((current) => ({
        ...current,
        message: 'اختر كابتنًا بديلًا واكتب سببًا واضحًا لإعادة الإسناد.',
      }));
      return;
    }
    setState((current) => ({ ...current, mutationKind: 'reassigning', message: '' }));
    try {
      await reassignDispatchAssignment(assignment.id, {
        tenantId: assignment.tenantId ?? 'default',
        captainId: normalizedCaptainId,
        serviceAreaCode,
        idempotencyKey: buildDispatchAssignmentIdempotencyKey(assignment.orderId, normalizedCaptainId),
        priority: assignment.priority ?? 0,
        ...(assignment.distanceMeters === null || assignment.distanceMeters === undefined
          ? {}
          : { distanceMeters: assignment.distanceMeters }),
        reason: normalizedReason,
        responseTimeoutSeconds: 90,
      });
      await load();
      setState((current) => ({ ...current, message: 'تم إلغاء الإسناد السابق وإنشاء عرض بديل ذريًا.' }));
    } catch (error) {
      setState((current) => ({
        ...current,
        mutationKind: 'idle',
        message: dispatchOperationsErrorMessage(error),
      }));
    }
  }, [load]);

  React.useEffect(() => {
    void load();
  }, [load]);

  return {
    state,
    reload: load,
    selectAssignment,
    expire,
    cancel,
    reassign,
  };
}
