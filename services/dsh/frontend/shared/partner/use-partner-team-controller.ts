import React from 'react';
import type { DshPartnerRoute } from './partner.types';
import { toPartnerTeamMember, type PartnerTeamInviteRole, type PartnerTeamMember } from './partner-team.types';
import { createPartnerMutationContext } from './partner-onboarding.runtime';
import { executePartnerStoreTeamMemberAction, fetchPartnerStoreTeam, invitePartnerStoreTeamMember } from './partner.api';

export type PartnerTeamMutationResult = { readonly ok: true } | { readonly ok: false; readonly error: string };
export type PartnerTeamModelStatus = 'idle' | 'loading' | 'error' | 'ready';

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

  const loadTeam = React.useCallback(async () => {
    if (route !== 'team' || !activeStoreId) {
      setMembers([]);
      setLoading(false);
      setStatus('idle');
      return;
    }
    setLoading(true);
    setError(null);
    setStatus('loading');
    try {
      const result = await fetchPartnerStoreTeam(activeStoreId);
      const nextMembers = result.members
        .map(toPartnerTeamMember)
        .filter((member): member is PartnerTeamMember => member !== null);
      setMembers(nextMembers);
      setStatus('ready');
    } catch (cause) {
      setMembers([]);
      setError(cause instanceof Error ? cause.message : 'تعذر قراءة فريق المتجر من DSH.');
      setStatus('error');
    } finally {
      setLoading(false);
    }
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
    try {
      await invitePartnerStoreTeamMember(activeStoreId, identity, role, createPartnerMutationContext('team-invite', activeStoreId));
      await loadTeam();
      return { ok: true };
    } catch (cause) {
      return { ok: false, error: cause instanceof Error ? cause.message : 'تعذر إرسال الدعوة من DSH.' };
    }
  }, [activeStoreId, loadTeam]);

  const onMemberAction = React.useCallback(async (memberId: string, action: string): Promise<PartnerTeamMutationResult> => {
    if (!activeStoreId) {
      return { ok: false, error: 'لا يوجد فرع محدد لتنفيذ الإجراء.' };
    }
    const member = members.find((candidate) => candidate.id === memberId);
    if (!member || member.version < 1) {
      return { ok: false, error: 'بيانات العضوية قديمة؛ أعد تحميل الفريق قبل التنفيذ.' };
    }
    try {
      await executePartnerStoreTeamMemberAction(
        activeStoreId,
        memberId,
        action,
        member.version,
        createPartnerMutationContext('team-action', memberId, member.version),
      );
      await loadTeam();
      return { ok: true };
    } catch (cause) {
      return { ok: false, error: cause instanceof Error ? cause.message : 'تعذر تنفيذ إجراء الفريق من DSH.' };
    }
  }, [activeStoreId, loadTeam, members]);

  return {
    teamMembers: members,
    isTeamLoading: loading,
    teamError: error,
    teamStatus: status,
    onInviteMember,
    onMemberAction,
  };
}
