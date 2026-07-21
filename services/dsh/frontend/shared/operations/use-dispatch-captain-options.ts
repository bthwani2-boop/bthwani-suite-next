import { useCallback, useEffect, useState } from 'react';
import { fetchCaptainDispatchCandidates } from '../dispatch/dispatch.api';
import type { DshCaptainDispatchCandidate } from '../dispatch/dispatch.types';
import { fetchStoreDetail } from '../store/store-discovery.api';
import { listCaptains, workforceErrorMessage } from '../workforce/workforce.api';
import type { Captain } from '../workforce/workforce.types';

export type DispatchCaptainOption = {
  readonly candidate: DshCaptainDispatchCandidate;
  readonly captain: Captain | null;
};

export type DispatchCaptainOptionsState =
  | {
      readonly kind: 'idle';
      readonly options: readonly DispatchCaptainOption[];
      readonly serviceAreaCode: string;
    }
  | {
      readonly kind: 'loading';
      readonly options: readonly DispatchCaptainOption[];
      readonly serviceAreaCode: string;
    }
  | {
      readonly kind: 'ready';
      readonly options: readonly DispatchCaptainOption[];
      readonly serviceAreaCode: string;
    }
  | {
      readonly kind: 'empty';
      readonly options: readonly DispatchCaptainOption[];
      readonly serviceAreaCode: string;
    }
  | {
      readonly kind: 'error';
      readonly options: readonly DispatchCaptainOption[];
      readonly serviceAreaCode: string;
      readonly message: string;
    };

function dispatchCandidateErrorMessage(error: unknown): string {
  const typed = error as {
    kind?: string;
    status?: number;
    message?: string;
    body?: { code?: string; message?: string };
  };
  if (typed.kind === 'network') return 'تعذر الاتصال بخدمة DSH لقراءة مرشحي الإسناد.';
  if (typed.status === 401) return 'انتهت جلسة لوحة التحكم.';
  if (typed.status === 403) return 'لا تملك صلاحية قراءة مرشحي الإسناد.';
  return typed.body?.message ?? typed.message ?? 'تعذر تحميل مرشحي الإسناد المحكومين.';
}

/**
 * Resolves the order store's live service area first, then reads DSH-owned
 * eligibility/capacity ordering. Workforce is joined only for display data.
 */
export function useDispatchCaptainOptions(storeId?: string): {
  readonly state: DispatchCaptainOptionsState;
  readonly reload: () => Promise<void>;
} {
  const normalizedStoreId = storeId?.trim() ?? '';
  const [state, setState] = useState<DispatchCaptainOptionsState>({
    kind: normalizedStoreId ? 'loading' : 'idle',
    options: [],
    serviceAreaCode: '',
  });

  const reload = useCallback(async () => {
    if (!normalizedStoreId) {
      setState({ kind: 'idle', options: [], serviceAreaCode: '' });
      return;
    }

    setState((current) => ({
      kind: 'loading',
      options: current.options,
      serviceAreaCode: current.serviceAreaCode,
    }));

    const storeState = await fetchStoreDetail(normalizedStoreId);
    if (storeState.kind !== 'success') {
      setState({
        kind: 'error',
        options: [],
        serviceAreaCode: '',
        message:
          storeState.kind === 'service_unavailable'
            ? 'تعذر الوصول إلى DSH لتحديد منطقة خدمة المتجر.'
            : storeState.kind === 'error'
              ? storeState.message
              : 'تعذر تحديد منطقة خدمة المتجر.',
      });
      return;
    }

    const serviceAreaCode = storeState.store.serviceAreaCode.trim();
    if (!serviceAreaCode) {
      setState({
        kind: 'error',
        options: [],
        serviceAreaCode: '',
        message: 'المتجر لا يملك منطقة خدمة تشغيلية صالحة للإسناد.',
      });
      return;
    }

    try {
      const [candidates, captains] = await Promise.all([
        fetchCaptainDispatchCandidates(serviceAreaCode),
        listCaptains({ status: 'active', limit: 200 }),
      ]);
      const captainByActorId = new Map(captains.map((captain) => [captain.actorId, captain]));
      const options = candidates
        .filter((candidate) => candidate.eligible)
        .map((candidate) => ({
          candidate,
          captain: captainByActorId.get(candidate.captainId) ?? null,
        }));
      setState({
        kind: options.length === 0 ? 'empty' : 'ready',
        options,
        serviceAreaCode,
      });
    } catch (error) {
      const workforceMessage = workforceErrorMessage(error);
      setState((current) => ({
        kind: 'error',
        options: current.options,
        serviceAreaCode,
        message:
          workforceMessage && workforceMessage !== 'تعذر تحميل بيانات القوى العاملة.'
            ? workforceMessage
            : dispatchCandidateErrorMessage(error),
      }));
    }
  }, [normalizedStoreId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { state, reload };
}
