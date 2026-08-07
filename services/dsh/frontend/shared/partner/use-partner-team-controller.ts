import React from 'react';
import type { DshPartnerRoute } from './partner.types';
import type { PartnerTeamInviteRole, PartnerTeamMember } from './partner-team.types';

export type PartnerTeamMutationResult = { readonly ok: true } | { readonly ok: false; readonly error: string };
export type PartnerTeamModelStatus = 'idle' | 'loading' | 'error' | 'ready';

const TEAM_AUTHORITY_UNAVAILABLE =
  'إدارة فريق المتجر غير متاحة من DSH؛ يجب إكمال ربط الإسناد من خدمة Workforce المالكة.';

export function usePartnerTeamController({
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
    if (route !== 'team' || !activeStoreId) return;
    setMembers([]);
    setLoading(false);
    setError(TEAM_AUTHORITY_UNAVAILABLE);
    setStatus('error');
  }, [route, activeStoreId]);

  React.useEffect(() => {
    loadTeam();
  }, [loadTeam]);

  const onInviteMember = React.useCallback(async (
    identity: string,
    role: PartnerTeamInviteRole = 'staff',
  ): Promise<PartnerTeamMutationResult> => {
    if (!activeStoreId) {
      return { ok: false, error: 'لا يوجد فرع محدد لإرسال الدعوة.' };
    }
    void identity;
    void role;
    return { ok: false, error: TEAM_AUTHORITY_UNAVAILABLE };
  }, [activeStoreId, loadTeam]);

  const onMemberAction = React.useCallback(async (memberId: string, action: string): Promise<PartnerTeamMutationResult> => {
    if (!activeStoreId) {
      return { ok: false, error: 'لا يوجد فرع محدد لتنفيذ الإجراء.' };
    }
    void memberId;
    void action;
    return { ok: false, error: TEAM_AUTHORITY_UNAVAILABLE };
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
