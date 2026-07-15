import React from 'react';
import { fetchPartnerTeam, invitePartnerTeamMember, executePartnerTeamMemberAction } from '../../shared/partner/partner.api';
import type { DshPartnerRoute } from '../../shared/partner/partner.types';
import type { PartnerTeamMember } from './PartnerTeamManagementScreen';

export function usePartnerTeamModel({
  route,
  selectedStoreScopeId,
}: {
  route: DshPartnerRoute;
  selectedStoreScopeId: string;
}) {
  const [members, setMembers] = React.useState<readonly PartnerTeamMember[]>([]);
  const [loading, setLoading] = React.useState(false);

  const activeStoreId = selectedStoreScopeId === 'all' ? '' : selectedStoreScopeId;

  const loadTeam = React.useCallback(() => {
    if (route !== 'team-management' || !activeStoreId) return;
    setLoading(true);
    fetchPartnerTeam(activeStoreId).then((res) => {
      setMembers(res.members as PartnerTeamMember[]);
    }).catch(() => {
      setMembers([]);
    }).finally(() => {
      setLoading(false);
    });
  }, [route, activeStoreId]);

  React.useEffect(() => {
    loadTeam();
  }, [loadTeam]);

  const onInviteMember = React.useCallback((identity: string) => {
    if (!activeStoreId) return;
    invitePartnerTeamMember(activeStoreId, identity).then(() => {
      loadTeam();
    });
  }, [activeStoreId, loadTeam]);

  const onMemberAction = React.useCallback((memberId: string, actionLabel: string) => {
    if (!activeStoreId) return;
    executePartnerTeamMemberAction(activeStoreId, memberId, actionLabel).then(() => {
      loadTeam();
    });
  }, [activeStoreId, loadTeam]);

  return {
    teamMembers: members,
    isTeamLoading: loading,
    onInviteMember,
    onMemberAction,
  };
}
