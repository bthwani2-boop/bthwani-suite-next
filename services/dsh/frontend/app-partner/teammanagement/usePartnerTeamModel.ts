import React from 'react';
import { fetchPartnerTeam, invitePartnerTeamMember, executePartnerTeamMemberAction } from '../../shared/partner/partner.api';
import type { DshPartnerRoute } from '../../shared/partner/partner.types';
import { toPartnerTeamMember, type PartnerTeamMember } from './partner-team.types';

export type PartnerTeamMutationResult = { readonly ok: true } | { readonly ok: false; readonly error: string };
export type PartnerTeamModelStatus = 'idle' | 'loading' | 'error' | 'ready';

function resolveErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  return 'خطأ غير متوقع أثناء الاتصال بـ runtime.';
}

export function usePartnerTeamModel({
  route,
  selectedStoreScopeId,
}: {
  route: DshPartnerRoute;
  selectedStoreScopeId: string;
}) {
  const [members, setMembers] = React.useState<readonly PartnerTeamMember[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [status, setStatus] = React.useState<PartnerTeamModelStatus>('idle');

  const activeStoreId = selectedStoreScopeId === 'all' ? '' : selectedStoreScopeId;

  const loadTeam = React.useCallback(() => {
    if (route !== 'team-management' || !activeStoreId) return;
    setLoading(true);
    setStatus('loading');
    fetchPartnerTeam(activeStoreId).then((res) => {
      const normalized = (res.members ?? [])
        .map(toPartnerTeamMember)
        .filter((member): member is PartnerTeamMember => member !== null);
      setMembers(normalized);
      setError(null);
      setStatus('ready');
    }).catch((err: unknown) => {
      setMembers([]);
      setError(resolveErrorMessage(err));
      setStatus('error');
    }).finally(() => {
      setLoading(false);
    });
  }, [route, activeStoreId]);

  React.useEffect(() => {
    loadTeam();
  }, [loadTeam]);

  const onInviteMember = React.useCallback((identity: string): Promise<PartnerTeamMutationResult> => {
    if (!activeStoreId) {
      return Promise.resolve({ ok: false, error: 'لا يوجد فرع محدد لإرسال الدعوة.' });
    }
    return invitePartnerTeamMember(activeStoreId, identity).then((): PartnerTeamMutationResult => {
      loadTeam();
      return { ok: true };
    }).catch((err: unknown): PartnerTeamMutationResult => {
      return { ok: false, error: resolveErrorMessage(err) };
    });
  }, [activeStoreId, loadTeam]);

  const onMemberAction = React.useCallback((memberId: string, actionLabel: string): Promise<PartnerTeamMutationResult> => {
    if (!activeStoreId) {
      return Promise.resolve({ ok: false, error: 'لا يوجد فرع محدد لتنفيذ الإجراء.' });
    }
    return executePartnerTeamMemberAction(activeStoreId, memberId, actionLabel).then((): PartnerTeamMutationResult => {
      loadTeam();
      return { ok: true };
    }).catch((err: unknown): PartnerTeamMutationResult => {
      return { ok: false, error: resolveErrorMessage(err) };
    });
  }, [activeStoreId, loadTeam]);

  return {
    teamMembers: members,
    isTeamLoading: loading,
    teamError: error,
    teamStatus: status,
    onInviteMember,
    onMemberAction,
  };
}
