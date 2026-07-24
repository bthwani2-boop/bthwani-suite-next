'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { resolveDshApiBaseUrl } from '../_kernel/dsh-api-base-url';
import { createDshHttpClient } from '../_kernel/dsh-http-request';
import { createPartner } from './partner.api';
import type { DshCreatePartnerInput, DshPartnerListResponse } from './partner.types';
import type { DshPartnerListState, DshPartnerMutationState } from './partner.states';
import { buildPartnerListRowViewModel } from './partner.view-model';

const workspaceClient = createDshHttpClient(resolveDshApiBaseUrl(), 'partner-workspace');
const PAGE_SIZE = 50;

export type PartnerWorkspaceFilters = Readonly<{
  status: string;
  category: string;
}>;

type ControllerError = Readonly<{
  status?: number;
  kind?: string;
  message?: string;
}>;

function errorMessage(error: unknown): string {
  const typed = error as ControllerError;
  if (typed.kind === 'network' || typed.status === 0) return 'تعذر الوصول إلى DSH. تحقق من الاتصال ثم أعد المحاولة.';
  if (typed.status === 401) return 'انتهت جلسة لوحة التحكم. سجّل الدخول مجددًا.';
  if (typed.status === 403) return 'لا تملك صلاحية قراءة أو إدارة الشركاء.';
  return typed.message?.trim() || 'تعذر تحميل مساحة عمل الشركاء.';
}

export async function fetchPartnersGoverned(
  filters: PartnerWorkspaceFilters,
  page: number,
): Promise<DshPartnerListResponse> {
  const query = new URLSearchParams();
  if (filters.status) query.set('status', filters.status);
  if (filters.category) query.set('category', filters.category);
  query.set('limit', String(PAGE_SIZE));
  query.set('offset', String(Math.max(0, page) * PAGE_SIZE));
  return workspaceClient.request<DshPartnerListResponse>(`/dsh/operator/partners?${query.toString()}`);
}

export function usePartnerWorkspaceListController(
  authKind: string,
  initialFilters: PartnerWorkspaceFilters = { status: '', category: '' },
) {
  const [filters, setFiltersState] = useState<PartnerWorkspaceFilters>(initialFilters);
  const [page, setPage] = useState(0);
  const [listState, setListState] = useState<DshPartnerListState>({ kind: 'idle' });
  const [mutationState, setMutationState] = useState<DshPartnerMutationState>({ kind: 'idle' });
  const authenticated = authKind === 'authenticated';

  const load = useCallback(async () => {
    if (!authenticated) {
      setListState({ kind: 'idle' });
      return false;
    }
    setListState({ kind: 'loading' });
    try {
      const result = await fetchPartnersGoverned(filters, page);
      setListState(result.partners.length === 0
        ? { kind: 'empty' }
        : {
            kind: 'success',
            partners: result.partners,
            total: result.pagination.total,
            page,
          });
      return true;
    } catch (error) {
      const typed = error as ControllerError;
      setListState(typed.kind === 'network' || typed.status === 0
        ? { kind: 'offline' }
        : { kind: 'error', message: errorMessage(error) });
      return false;
    }
  }, [authenticated, filters, page]);

  useEffect(() => {
    void load();
  }, [load]);

  const create = useCallback(async (input: DshCreatePartnerInput) => {
    if (!authenticated) return null;
    setMutationState({ kind: 'loading' });
    try {
      const partner = await createPartner(input);
      setMutationState({ kind: 'success', partner });
      await load();
      return partner;
    } catch (error) {
      setMutationState({ kind: 'error', message: errorMessage(error) });
      return null;
    }
  }, [authenticated, load]);

  const partners = listState.kind === 'success' ? listState.partners : [];
  const rows = useMemo(() => partners.map(buildPartnerListRowViewModel), [partners]);
  const total = listState.kind === 'success' ? listState.total : 0;
  const hasPrevPage = page > 0;
  const hasNextPage = (page + 1) * PAGE_SIZE < total;

  return {
    listState,
    mutationState,
    filters,
    page,
    pageSize: PAGE_SIZE,
    partners,
    rows,
    total,
    hasPrevPage,
    hasNextPage,
    setFilters: (next: PartnerWorkspaceFilters) => {
      setFiltersState(next);
      setPage(0);
    },
    nextPage: () => setPage((current) => hasNextPage ? current + 1 : current),
    prevPage: () => setPage((current) => hasPrevPage ? current - 1 : current),
    retry: () => void load(),
    create,
    resetMutation: () => setMutationState({ kind: 'idle' }),
  };
}
